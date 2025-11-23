"""
비교 분석 데이터 NeonDB 마이그레이션 스크립트

기존 JSON 파일에 저장된 비교 분석 데이터를 NeonDB로 마이그레이션합니다.
- clustering_data/data/precomputed/comparison_results.json
"""
import asyncio
import os
import sys
import json
from pathlib import Path
from typing import Dict, Any
import logging
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import uuid

# 프로젝트 루트를 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 환경 변수 로드
load_dotenv(dotenv_path=project_root / '.env', override=True)
load_dotenv(dotenv_path=project_root / 'server' / '.env', override=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def migrate_comparisons_to_db(
    session: AsyncSession,
    session_id: str,
    comparison_results: Dict[str, Any]
) -> bool:
    """
    비교 분석 결과를 NeonDB에 저장
    
    Args:
        session: SQLAlchemy async session
        session_id: 세션 ID (UUID 문자열)
        comparison_results: 비교 분석 결과 딕셔너리 (pair_key -> comparison_data)
        
    Returns:
        성공 여부
    """
    try:
        logger.info(f"[비교 분석 마이그레이션 시작] session_id: {session_id}")
        logger.info(f"  총 비교 쌍 수: {len(comparison_results)}개")
        
        # 기존 비교 분석 데이터 삭제 (같은 세션의, merged 스키마 사용)
        await session.execute(
            text("DELETE FROM merged.cluster_comparisons WHERE session_id = :session_id"),
            {"session_id": session_id}
        )
        logger.info(f"  기존 데이터 삭제 완료")
        
        saved_count = 0
        error_count = 0
        
        for pair_key, comp_data in comparison_results.items():
            if 'error' in comp_data:
                error_count += 1
                logger.warning(f"  [건너뛰기] {pair_key}: 오류 포함")
                continue
            
            cluster_a = comp_data.get('cluster_a')
            cluster_b = comp_data.get('cluster_b')
            
            if cluster_a is None or cluster_b is None:
                error_count += 1
                logger.warning(f"  [건너뛰기] {pair_key}: cluster_a 또는 cluster_b가 없음")
                continue
            
            # comparison_data 구성 (compare_groups 함수의 반환 형식과 동일)
            comparison_data = {
                'comparison': comp_data.get('comparison', []),
                'group_a': comp_data.get('group_a', {}),
                'group_b': comp_data.get('group_b', {}),
                'highlights': {
                    'num_top': [],
                    'bin_cat_top': []
                }
            }
            
            # 하이라이트 계산 (compare_groups에서 계산한 것과 동일한 로직)
            all_comparisons = comparison_data['comparison']
            
            # 연속형 변수 하이라이트 (cohens_d >= 0.3)
            continuous_comparisons = [
                c for c in all_comparisons 
                if c.get('type') == 'continuous' and abs(c.get('cohens_d', 0) or 0) >= 0.3
            ]
            continuous_sorted = sorted(
                continuous_comparisons,
                key=lambda x: abs(x.get('cohens_d', 0) or 0),
                reverse=True
            )[:5]
            
            # 이진형 변수 하이라이트 (abs_diff_pct >= 3.0 또는 lift_pct >= 20.0)
            binary_comparisons = [
                c for c in all_comparisons 
                if c.get('type') == 'binary' and (
                    abs(c.get('abs_diff_pct', 0) or 0) >= 3.0 or
                    abs(c.get('lift_pct', 0) or 0) >= 20.0
                )
            ]
            binary_sorted = sorted(
                binary_comparisons,
                key=lambda x: abs(x.get('abs_diff_pct', 0) or 0),
                reverse=True
            )[:5]
            
            comparison_data['highlights'] = {
                'num_top': continuous_sorted,
                'bin_cat_top': binary_sorted
            }
            
            # DB에 삽입 (merged 스키마 사용)
            await session.execute(
                text("""
                    INSERT INTO merged.cluster_comparisons (
                        session_id, cluster_a, cluster_b, comparison_data
                    ) VALUES (
                        :session_id, :cluster_a, :cluster_b, CAST(:comparison_data AS jsonb)
                    )
                    ON CONFLICT (session_id, cluster_a, cluster_b) DO UPDATE SET
                        comparison_data = EXCLUDED.comparison_data,
                        updated_at = CURRENT_TIMESTAMP
                """),
                {
                    "session_id": session_id,
                    "cluster_a": cluster_a,
                    "cluster_b": cluster_b,
                    "comparison_data": json.dumps(comparison_data, ensure_ascii=False, default=str)
                }
            )
            saved_count += 1
            
            if saved_count % 20 == 0:
                logger.info(f"  진행률: {saved_count}/{len(comparison_results)}개 저장 완료")
        
        logger.info(f"[비교 분석 마이그레이션 완료] {saved_count}개 성공, {error_count}개 실패")
        return True
        
    except Exception as e:
        logger.error(f"[비교 분석 마이그레이션 실패] 오류: {str(e)}", exc_info=True)
        raise


async def main():
    """메인 마이그레이션 함수"""
    # 데이터베이스 URI 가져오기
    uri = os.getenv("ASYNC_DATABASE_URI")
    if not uri:
        logger.error("❌ ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
        return
    
    if uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    
    # 비교 분석 JSON 파일 경로
    comparison_json_path = project_root / 'clustering_data' / 'data' / 'precomputed' / 'comparison_results.json'
    
    if not comparison_json_path.exists():
        logger.error(f"❌ 비교 분석 JSON 파일이 없습니다: {comparison_json_path}")
        return
    
    # JSON 파일 로드
    logger.info(f"[JSON 파일 로드] {comparison_json_path}")
    with open(comparison_json_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    
    comparison_results = json_data.get('comparisons', {})
    logger.info(f"[JSON 로드 완료] {len(comparison_results)}개 비교 쌍")
    
    # Precomputed 세션 ID 생성 (hdbscan_default)
    precomputed_name = "hdbscan_default"
    session_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"precomputed_{precomputed_name}")
    session_id = str(session_uuid)
    
    logger.info(f"[세션 ID] {session_id} (precomputed_name: {precomputed_name})")
    
    # 데이터베이스 연결
    engine = create_async_engine(uri, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            async with session.begin():
                # 세션 존재 확인 (merged 스키마 사용)
                result = await session.execute(
                    text("SELECT session_id FROM merged.clustering_sessions WHERE session_id = :session_id"),
                    {"session_id": session_id}
                )
                if result.scalar_one_or_none() is None:
                    logger.warning(f"⚠️ 세션이 DB에 없습니다: {session_id}")
                    logger.info(f"💡 먼저 Precomputed 클러스터링 데이터를 마이그레이션하세요:")
                    logger.info(f"   python server/scripts/migrate_clustering_to_db.py --precomputed")
                    return
                
                # 비교 분석 데이터 마이그레이션
                await migrate_comparisons_to_db(session, session_id, comparison_results)
        
        logger.info("✅ 비교 분석 데이터 마이그레이션 완료!")
        
    except Exception as e:
        logger.error(f"❌ 마이그레이션 실패: {str(e)}", exc_info=True)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

