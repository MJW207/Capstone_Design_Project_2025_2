"""
클러스터링 데이터 NeonDB 마이그레이션 스크립트

기존 파일 시스템에 저장된 클러스터링 데이터를 NeonDB로 마이그레이션합니다.
- runs/{session_id}/ 디렉터리의 세션 데이터
- clustering_data/data/precomputed/ 디렉터리의 Precomputed 데이터
"""
import asyncio
import os
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
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


async def migrate_session_to_db(
    session: AsyncSession,
    session_id: str,
    session_dir: Path
) -> bool:
    """
    단일 세션 데이터를 NeonDB로 마이그레이션
    
    Args:
        session: SQLAlchemy async session
        session_id: 세션 ID (디렉터리 이름)
        session_dir: 세션 디렉터리 경로
        
    Returns:
        성공 여부
    """
    try:
        logger.info(f"[마이그레이션 시작] session_id: {session_id}")
        
        # 1. meta.json 로드
        meta_path = session_dir / "meta.json"
        if not meta_path.exists():
            logger.warning(f"[건너뛰기] meta.json이 없음: {session_id}")
            return False
        
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)
        
        result_meta = meta.get('result_meta', {})
        algorithm_info = result_meta.get('algorithm_info') or {}  # None 체크
        request_params = meta.get('request', {})
        feature_types = meta.get('feature_types', {})
        
        # 2. data.csv 로드
        data_path = session_dir / "data.csv"
        if not data_path.exists():
            logger.warning(f"[건너뛰기] data.csv가 없음: {session_id}")
            return False
        
        df = pd.read_csv(data_path, encoding='utf-8-sig')
        logger.info(f"[데이터 로드] {len(df)}행, {len(df.columns)}열")
        
        # 3. labels 로드
        labels_path = session_dir / "labels.npy"
        if labels_path.exists():
            labels = np.load(labels_path)
        else:
            labels_csv_path = session_dir / "labels.csv"
            if labels_csv_path.exists():
                labels_df = pd.read_csv(labels_csv_path)
                labels = labels_df['cluster'].values
            else:
                # data.csv에서 cluster 컬럼 확인
                if 'cluster' in df.columns:
                    labels = df['cluster'].values
                else:
                    logger.warning(f"[경고] labels를 찾을 수 없음: {session_id}")
                    labels = None
        
        # 4. clustering_sessions 테이블에 삽입
        session_uuid = uuid.UUID(session_id) if len(session_id) == 36 else uuid.uuid4()
        
        # 메트릭 추출
        silhouette_score = algorithm_info.get('silhouette_score')
        davies_bouldin_score = algorithm_info.get('davies_bouldin_score')
        calinski_harabasz_score = algorithm_info.get('calinski_harabasz_score')
        
        # n_clusters 계산
        if labels is not None:
            unique_labels = set(labels)
            unique_labels.discard(-1)  # 노이즈 제외
            n_clusters = len(unique_labels)
        else:
            n_clusters = result_meta.get('n_clusters', 0)
        
        # n_clusters가 None이면 기본값 0으로 설정 (NOT NULL 제약조건 대응)
        if n_clusters is None:
            n_clusters = 0
        
        # algorithm 추출
        algorithm = request_params.get('algo', 'auto')
        if algorithm == 'auto':
            algorithm = algorithm_info.get('type', 'auto')
        
        await session.execute(
            text("""
                INSERT INTO clustering_sessions (
                    session_id, created_at, updated_at,
                    n_samples, n_clusters, algorithm, optimal_k, strategy,
                    silhouette_score, davies_bouldin_score, calinski_harabasz_score,
                    request_params, feature_types, algorithm_info,
                    filter_info, processor_info, is_precomputed
                ) VALUES (
                    :session_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    :n_samples, :n_clusters, :algorithm, :optimal_k, :strategy,
                    :silhouette_score, :davies_bouldin_score, :calinski_harabasz_score,
                    CAST(:request_params AS jsonb), CAST(:feature_types AS jsonb), CAST(:algorithm_info AS jsonb),
                    CAST(:filter_info AS jsonb), CAST(:processor_info AS jsonb), :is_precomputed
                )
                ON CONFLICT (session_id) DO UPDATE SET
                    updated_at = CURRENT_TIMESTAMP,
                    n_samples = EXCLUDED.n_samples,
                    n_clusters = EXCLUDED.n_clusters,
                    algorithm = EXCLUDED.algorithm,
                    optimal_k = EXCLUDED.optimal_k,
                    strategy = EXCLUDED.strategy,
                    silhouette_score = EXCLUDED.silhouette_score,
                    davies_bouldin_score = EXCLUDED.davies_bouldin_score,
                    calinski_harabasz_score = EXCLUDED.calinski_harabasz_score,
                    request_params = EXCLUDED.request_params,
                    feature_types = EXCLUDED.feature_types,
                    algorithm_info = EXCLUDED.algorithm_info,
                    filter_info = EXCLUDED.filter_info,
                    processor_info = EXCLUDED.processor_info
            """),
            {
                "session_id": str(session_uuid),
                "n_samples": len(df),
                "n_clusters": n_clusters,
                "algorithm": algorithm,
                "optimal_k": result_meta.get('optimal_k'),
                "strategy": result_meta.get('strategy'),
                "silhouette_score": silhouette_score,
                "davies_bouldin_score": davies_bouldin_score,
                "calinski_harabasz_score": calinski_harabasz_score,
                "request_params": json.dumps(request_params, ensure_ascii=False),
                "feature_types": json.dumps(feature_types, ensure_ascii=False),
                "algorithm_info": json.dumps(algorithm_info, ensure_ascii=False),
                "filter_info": json.dumps(result_meta.get('filter_info', {}), ensure_ascii=False),
                "processor_info": json.dumps(result_meta.get('processor_info', {}), ensure_ascii=False),
                "is_precomputed": False
            }
        )
        
        # 5. panel_cluster_mappings 삽입
        if labels is not None and 'mb_sn' in df.columns:
            # 기존 매핑 삭제
            await session.execute(
                text("DELETE FROM panel_cluster_mappings WHERE session_id = :session_id"),
                {"session_id": str(session_uuid)}
            )
            
            # 배치 삽입
            mappings = []
            for idx, mb_sn in enumerate(df['mb_sn']):
                cluster_id = int(labels[idx]) if idx < len(labels) else -1
                mappings.append({
                    "session_id": str(session_uuid),
                    "mb_sn": str(mb_sn),
                    "cluster_id": cluster_id
                })
            
            # 1000개씩 배치로 삽입 (executemany 방식)
            batch_size = 1000
            for i in range(0, len(mappings), batch_size):
                batch = mappings[i:i+batch_size]
                # 파라미터 리스트 생성
                params_list = [
                    {
                        "session_id": m['session_id'],
                        "mb_sn": m['mb_sn'],
                        "cluster_id": m['cluster_id']
                    }
                    for m in batch
                ]
                # executemany 방식으로 실행
                await session.execute(
                    text("""
                        INSERT INTO panel_cluster_mappings (session_id, mb_sn, cluster_id)
                        VALUES (:session_id, :mb_sn, :cluster_id)
                        ON CONFLICT (session_id, mb_sn) DO UPDATE SET
                            cluster_id = EXCLUDED.cluster_id
                    """),
                    params_list
                )
            logger.info(f"[매핑 삽입] {len(mappings)}개 패널-클러스터 매핑")
        
        # 6. umap_coordinates 삽입
        if 'umap_x' in df.columns and 'umap_y' in df.columns and 'mb_sn' in df.columns:
            # 기존 좌표 삭제
            await session.execute(
                text("DELETE FROM umap_coordinates WHERE session_id = :session_id"),
                {"session_id": str(session_uuid)}
            )
            
            # 배치 삽입
            coordinates = []
            for _, row in df.iterrows():
                coordinates.append({
                    "session_id": str(session_uuid),
                    "mb_sn": str(row['mb_sn']),
                    "umap_x": float(row['umap_x']),
                    "umap_y": float(row['umap_y'])
                })
            
            # 1000개씩 배치로 삽입 (executemany 방식)
            batch_size = 1000
            for i in range(0, len(coordinates), batch_size):
                batch = coordinates[i:i+batch_size]
                # 파라미터 리스트 생성
                params_list = [
                    {
                        "session_id": c['session_id'],
                        "mb_sn": c['mb_sn'],
                        "umap_x": c['umap_x'],
                        "umap_y": c['umap_y']
                    }
                    for c in batch
                ]
                # executemany 방식으로 실행
                await session.execute(
                    text("""
                        INSERT INTO umap_coordinates (session_id, mb_sn, umap_x, umap_y)
                        VALUES (:session_id, :mb_sn, :umap_x, :umap_y)
                        ON CONFLICT (session_id, mb_sn) DO UPDATE SET
                            umap_x = EXCLUDED.umap_x,
                            umap_y = EXCLUDED.umap_y
                    """),
                    params_list
                )
            logger.info(f"[좌표 삽입] {len(coordinates)}개 UMAP 좌표")
        
        # 7. cluster_profiles는 API에서 동적으로 생성되므로 여기서는 건너뜀
        # (필요시 별도 스크립트로 생성 가능)
        
        # commit은 호출하지 않음 (async with session.begin()이 자동 처리)
        logger.info(f"[마이그레이션 완료] session_id: {session_id}")
        return True
        
    except Exception as e:
        logger.error(f"[마이그레이션 실패] session_id: {session_id}, 오류: {str(e)}", exc_info=True)
        # rollback은 호출하지 않음 (async with session.begin()이 자동 처리)
        raise  # 예외를 다시 발생시켜 트랜잭션이 롤백되도록 함


async def migrate_precomputed_to_db(
    session: AsyncSession,
    precomputed_name: str = "hdbscan_default"
) -> bool:
    """
    Precomputed 데이터를 NeonDB로 마이그레이션
    
    Args:
        session: SQLAlchemy async session
        precomputed_name: Precomputed 데이터 이름
        
    Returns:
        성공 여부
    """
    try:
        logger.info(f"[Precomputed 마이그레이션 시작] name: {precomputed_name}")
        
        project_root = Path(__file__).parent.parent.parent
        precomputed_dir = project_root / 'clustering_data' / 'data' / 'precomputed'
        
        # HDBSCAN CSV 파일 확인
        hdbscan_csv = precomputed_dir / 'flc_income_clustering_hdbscan.csv'
        hdbscan_metadata = precomputed_dir / 'flc_income_clustering_hdbscan_metadata.json'
        
        csv_path = hdbscan_csv if hdbscan_csv.exists() else precomputed_dir / 'clustering_results.csv'
        metadata_path = hdbscan_metadata if hdbscan_metadata.exists() else precomputed_dir / 'clustering_metadata.json'
        
        if not csv_path.exists():
            logger.error(f"[오류] Precomputed CSV 파일이 없음: {csv_path}")
            return False
        
        # CSV 로드
        df = pd.read_csv(csv_path, encoding='utf-8-sig')
        logger.info(f"[Precomputed 데이터 로드] {len(df)}행, {len(df.columns)}열")
        
        # 메타데이터 로드
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
        
        # 세션 ID 생성 (Precomputed용)
        session_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"precomputed_{precomputed_name}")
        
        # 클러스터 컬럼 확인
        cluster_col = 'cluster_hdbscan' if 'cluster_hdbscan' in df.columns else 'cluster'
        if cluster_col not in df.columns:
            logger.error(f"[오류] 클러스터 컬럼이 없음: {cluster_col}")
            return False
        
        # n_clusters 계산
        unique_clusters = set(df[cluster_col].unique())
        unique_clusters.discard(-1)  # 노이즈 제외
        n_clusters = len(unique_clusters)
        
        # clustering_sessions 삽입
        await session.execute(
            text("""
                INSERT INTO clustering_sessions (
                    session_id, created_at, updated_at,
                    n_samples, n_clusters, algorithm, optimal_k, strategy,
                    silhouette_score, davies_bouldin_score, calinski_harabasz_score,
                    request_params, feature_types, algorithm_info,
                    filter_info, processor_info, is_precomputed, precomputed_name
                ) VALUES (
                    :session_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    :n_samples, :n_clusters, :algorithm, :optimal_k, :strategy,
                    :silhouette_score, :davies_bouldin_score, :calinski_harabasz_score,
                    CAST(:request_params AS jsonb), CAST(:feature_types AS jsonb), CAST(:algorithm_info AS jsonb),
                    CAST(:filter_info AS jsonb), CAST(:processor_info AS jsonb), :is_precomputed, :precomputed_name
                )
                ON CONFLICT (session_id) DO UPDATE SET
                    updated_at = CURRENT_TIMESTAMP,
                    n_samples = EXCLUDED.n_samples,
                    n_clusters = EXCLUDED.n_clusters
            """),
            {
                "session_id": str(session_uuid),
                "n_samples": len(df),
                "n_clusters": n_clusters,
                "algorithm": metadata.get('method', 'hdbscan'),
                "optimal_k": None,
                "strategy": None,
                "silhouette_score": metadata.get('silhouette_score'),
                "davies_bouldin_score": metadata.get('davies_bouldin_index'),
                "calinski_harabasz_score": metadata.get('calinski_harabasz_index'),
                "request_params": json.dumps({}, ensure_ascii=False),
                "feature_types": json.dumps({}, ensure_ascii=False),
                "algorithm_info": json.dumps(metadata, ensure_ascii=False),
                "filter_info": json.dumps({}, ensure_ascii=False),
                "processor_info": json.dumps({}, ensure_ascii=False),
                "is_precomputed": True,
                "precomputed_name": precomputed_name
            }
        )
        
        # panel_cluster_mappings 삽입
        if 'mb_sn' in df.columns:
            await session.execute(
                text("DELETE FROM panel_cluster_mappings WHERE session_id = :session_id"),
                {"session_id": str(session_uuid)}
            )
            
            mappings = []
            for _, row in df.iterrows():
                cluster_id = int(row[cluster_col])
                mappings.append({
                    "session_id": str(session_uuid),
                    "mb_sn": str(row['mb_sn']),
                    "cluster_id": cluster_id
                })
            
            batch_size = 1000
            for i in range(0, len(mappings), batch_size):
                batch = mappings[i:i+batch_size]
                # 파라미터 리스트 생성
                params_list = [
                    {
                        "session_id": m['session_id'],
                        "mb_sn": m['mb_sn'],
                        "cluster_id": m['cluster_id']
                    }
                    for m in batch
                ]
                # executemany 방식으로 실행
                await session.execute(
                    text("""
                        INSERT INTO panel_cluster_mappings (session_id, mb_sn, cluster_id)
                        VALUES (:session_id, :mb_sn, :cluster_id)
                        ON CONFLICT (session_id, mb_sn) DO UPDATE SET
                            cluster_id = EXCLUDED.cluster_id
                    """),
                    params_list
                )
            logger.info(f"[Precomputed 매핑 삽입] {len(mappings)}개 패널-클러스터 매핑")
        
        # umap_coordinates 삽입
        if 'umap_x' in df.columns and 'umap_y' in df.columns and 'mb_sn' in df.columns:
            await session.execute(
                text("DELETE FROM umap_coordinates WHERE session_id = :session_id"),
                {"session_id": str(session_uuid)}
            )
            
            coordinates = []
            for _, row in df.iterrows():
                coordinates.append({
                    "session_id": str(session_uuid),
                    "mb_sn": str(row['mb_sn']),
                    "umap_x": float(row['umap_x']),
                    "umap_y": float(row['umap_y'])
                })
            
            batch_size = 1000
            for i in range(0, len(coordinates), batch_size):
                batch = coordinates[i:i+batch_size]
                # 파라미터 리스트 생성
                params_list = [
                    {
                        "session_id": c['session_id'],
                        "mb_sn": c['mb_sn'],
                        "umap_x": c['umap_x'],
                        "umap_y": c['umap_y']
                    }
                    for c in batch
                ]
                # executemany 방식으로 실행
                await session.execute(
                    text("""
                        INSERT INTO umap_coordinates (session_id, mb_sn, umap_x, umap_y)
                        VALUES (:session_id, :mb_sn, :umap_x, :umap_y)
                        ON CONFLICT (session_id, mb_sn) DO UPDATE SET
                            umap_x = EXCLUDED.umap_x,
                            umap_y = EXCLUDED.umap_y
                    """),
                    params_list
                )
            logger.info(f"[Precomputed 좌표 삽입] {len(coordinates)}개 UMAP 좌표")
        
        # commit은 호출하지 않음 (async with session.begin()이 자동 처리)
        logger.info(f"[Precomputed 마이그레이션 완료] name: {precomputed_name}, session_id: {session_uuid}")
        return True
        
    except Exception as e:
        logger.error(f"[Precomputed 마이그레이션 실패] name: {precomputed_name}, 오류: {str(e)}", exc_info=True)
        # rollback은 호출하지 않음 (async with session.begin()이 자동 처리)
        raise  # 예외를 다시 발생시켜 트랜잭션이 롤백되도록 함


async def main():
    """메인 마이그레이션 함수"""
    # 데이터베이스 URI 가져오기
    uri = os.getenv("ASYNC_DATABASE_URI")
    if not uri:
        logger.error("❌ ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
        return
    
    if uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    elif "postgresql+asyncpg" in uri:
        uri = uri.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
    
    engine = create_async_engine(uri, echo=False, pool_pre_ping=True)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        # 1. runs 디렉터리의 세션 데이터 마이그레이션
        project_root = Path(__file__).parent.parent.parent
        runs_dir = project_root / 'server' / 'runs'
        
        if runs_dir.exists():
            logger.info(f"[세션 마이그레이션 시작] runs 디렉터리: {runs_dir}")
            session_dirs = [d for d in runs_dir.iterdir() if d.is_dir()]
            logger.info(f"[발견된 세션] {len(session_dirs)}개")
            
            success_count = 0
            for session_dir in session_dirs:
                session_id = session_dir.name
                # 각 세션마다 개별 트랜잭션 사용
                async with SessionLocal() as session:
                    try:
                        async with session.begin():
                            if await migrate_session_to_db(session, session_id, session_dir):
                                success_count += 1
                    except Exception as e:
                        logger.error(f"[세션 마이그레이션 실패] {session_id}: {str(e)}", exc_info=True)
                        # 트랜잭션이 자동으로 롤백됨
            
            logger.info(f"[세션 마이그레이션 완료] 성공: {success_count}/{len(session_dirs)}")
        else:
            logger.warning(f"[건너뛰기] runs 디렉터리가 없음: {runs_dir}")
        
        # 2. Precomputed 데이터 마이그레이션
        logger.info("[Precomputed 마이그레이션 시작]")
        async with SessionLocal() as session:
            try:
                async with session.begin():
                    if await migrate_precomputed_to_db(session, "hdbscan_default"):
                        logger.info("[Precomputed 마이그레이션 완료]")
                    else:
                        logger.warning("[Precomputed 마이그레이션 실패 또는 건너뛰기]")
            except Exception as e:
                logger.error(f"[Precomputed 마이그레이션 오류] {str(e)}", exc_info=True)
            
    except Exception as e:
        logger.error(f"[마이그레이션 오류] {str(e)}", exc_info=True)
    finally:
        await engine.dispose()
        logger.info("✅ 마이그레이션 스크립트 완료")


if __name__ == "__main__":
    # Windows에서 이벤트 루프 정책 설정 (asyncio.run() 전에 반드시 설정)
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        # 기존 이벤트 루프가 있으면 닫고 새로 생성
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.close()
        except RuntimeError:
            pass
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    asyncio.run(main())

