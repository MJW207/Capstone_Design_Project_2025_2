"""
새로운 클러스터링 결과를 NeonDB에 적재하는 통합 스크립트

작업 내용:
1. 클러스터링 세션 정보 DB 적재
2. UMAP 좌표 DB 적재
3. 패널-클러스터 매핑 DB 적재
4. Precomputed 세션 이름 업데이트
"""
import asyncio
import sys
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import uuid

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).resolve().parents[2]
server_dir = project_root / "server"
sys.path.insert(0, str(server_dir))
sys.path.insert(0, str(project_root))

# Windows 이벤트 루프 정책 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv(override=True)

# Precomputed 세션 이름
PRECOMPUTED_NAME = "hdbscan_default"

# 입력 파일 경로
CSV_PATH = project_root / "clustering_data" / "data" / "precomputed" / "flc_income_clustering_hdbscan.csv"
METADATA_PATH = project_root / "clustering_data" / "data" / "precomputed" / "flc_income_clustering_hdbscan_metadata.json"


async def get_or_create_precomputed_session(session: AsyncSession) -> str:
    """
    Precomputed 세션 ID 조회 또는 생성
    
    Returns:
        session_id (str): UUID 형식의 세션 ID
    """
    logger.info("=" * 80)
    logger.info("Precomputed 세션 조회/생성")
    logger.info("=" * 80)
    
    # 기존 세션 조회
    result = await session.execute(
        text("""
            SELECT session_id 
            FROM merged.clustering_sessions 
            WHERE is_precomputed = true 
            AND precomputed_name = :precomputed_name
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"precomputed_name": PRECOMPUTED_NAME}
    )
    row = result.fetchone()
    
    if row:
        session_id = str(row.session_id)
        logger.info(f"기존 Precomputed 세션 발견: {session_id}")
        return session_id
    else:
        # 새 세션 생성
        session_id = str(uuid.uuid4())
        logger.info(f"새 Precomputed 세션 생성: {session_id}")
        return session_id


async def load_metadata() -> Dict[str, Any]:
    """메타데이터 JSON 파일 로드"""
    if not METADATA_PATH.exists():
        logger.error(f"메타데이터 파일을 찾을 수 없습니다: {METADATA_PATH}")
        return {}
    
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    
    logger.info(f"메타데이터 로드 완료: {METADATA_PATH}")
    return metadata


async def insert_clustering_session(
    session: AsyncSession,
    session_id: str,
    df: pd.DataFrame,
    metadata: Dict[str, Any]
) -> bool:
    """
    클러스터링 세션 정보 DB 적재
    """
    logger.info("=" * 80)
    logger.info("클러스터링 세션 정보 DB 적재")
    logger.info("=" * 80)
    
    # 클러스터 레이블 추출
    cluster_col = 'cluster_hdbscan'
    if cluster_col not in df.columns:
        logger.error(f"클러스터 컬럼을 찾을 수 없습니다: {cluster_col}")
        return False
    
    labels = df[cluster_col].values
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int(list(labels).count(-1))
    
    # 메타데이터에서 성능 지표 추출
    silhouette_score = metadata.get('silhouette_score', 0.0)
    davies_bouldin_index = metadata.get('davies_bouldin_index', 0.0)
    calinski_harabasz_index = metadata.get('calinski_harabasz_index', 0.0)
    
    # 세션 정보 준비
    session_data = {
        "session_id": session_id,
        "n_samples": len(df),
        "n_clusters": n_clusters,
        "algorithm": "HDBSCAN",
        "silhouette_score": float(silhouette_score),
        "davies_bouldin_score": float(davies_bouldin_index),
        "calinski_harabasz_score": float(calinski_harabasz_index),
        "is_precomputed": True,
        "precomputed_name": PRECOMPUTED_NAME,
        "request_params": json.dumps({
            "min_cluster_size": 50,
            "min_samples": 50,
            "metric": "euclidean",
            "cluster_selection_method": "eom"
        }, ensure_ascii=False),
        "algorithm_info": json.dumps({
            "n_noise": n_noise,
            "noise_ratio": float(n_noise / len(df)),
            "premium_products": [10, 11, 12, 13, 16, 17, 19, 21]
        }, ensure_ascii=False)
    }
    
    try:
        # 기존 세션 업데이트 또는 새로 삽입
        await session.execute(
            text("""
                INSERT INTO merged.clustering_sessions (
                    session_id, n_samples, n_clusters, algorithm,
                    silhouette_score, davies_bouldin_score, calinski_harabasz_score,
                    is_precomputed, precomputed_name, request_params, algorithm_info
                ) VALUES (
                    :session_id, :n_samples, :n_clusters, :algorithm,
                    :silhouette_score, :davies_bouldin_score, :calinski_harabasz_score,
                    :is_precomputed, :precomputed_name,
                    CAST(:request_params AS jsonb),
                    CAST(:algorithm_info AS jsonb)
                )
                ON CONFLICT (session_id) DO UPDATE SET
                    n_samples = EXCLUDED.n_samples,
                    n_clusters = EXCLUDED.n_clusters,
                    algorithm = EXCLUDED.algorithm,
                    silhouette_score = EXCLUDED.silhouette_score,
                    davies_bouldin_score = EXCLUDED.davies_bouldin_score,
                    calinski_harabasz_score = EXCLUDED.calinski_harabasz_score,
                    is_precomputed = EXCLUDED.is_precomputed,
                    precomputed_name = EXCLUDED.precomputed_name,
                    request_params = EXCLUDED.request_params,
                    algorithm_info = EXCLUDED.algorithm_info,
                    updated_at = CURRENT_TIMESTAMP
            """),
            session_data
        )
        
        logger.info(f"세션 정보 적재 완료: session_id={session_id}")
        logger.info(f"  - 샘플 수: {session_data['n_samples']}")
        logger.info(f"  - 클러스터 수: {session_data['n_clusters']}")
        logger.info(f"  - Silhouette Score: {session_data['silhouette_score']:.4f}")
        return True
        
    except Exception as e:
        logger.error(f"세션 정보 적재 실패: {str(e)}", exc_info=True)
        raise


async def insert_umap_coordinates(
    session: AsyncSession,
    session_id: str,
    df: pd.DataFrame
) -> bool:
    """
    UMAP 좌표 DB 적재
    """
    logger.info("=" * 80)
    logger.info("UMAP 좌표 DB 적재")
    logger.info("=" * 80)
    
    required_cols = ['mb_sn', 'umap_x', 'umap_y']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        logger.error(f"필수 컬럼이 없습니다: {missing_cols}")
        return False
    
    # 기존 좌표 삭제
    await session.execute(
        text("DELETE FROM merged.umap_coordinates WHERE session_id = :session_id"),
        {"session_id": session_id}
    )
    logger.info(f"기존 UMAP 좌표 삭제 완료: session_id={session_id}")
    
    # 배치로 삽입 (1000개씩)
    batch_size = 1000
    total_rows = len(df)
    
    for i in range(0, total_rows, batch_size):
        batch_df = df.iloc[i:i+batch_size]
        
        values = []
        for _, row in batch_df.iterrows():
            values.append({
                "session_id": session_id,
                "mb_sn": str(row['mb_sn']),
                "umap_x": float(row['umap_x']),
                "umap_y": float(row['umap_y'])
            })
        
        # 배치 삽입
        await session.execute(
            text("""
                INSERT INTO merged.umap_coordinates (session_id, mb_sn, umap_x, umap_y)
                VALUES (:session_id, :mb_sn, :umap_x, :umap_y)
                ON CONFLICT (session_id, mb_sn) DO UPDATE SET
                    umap_x = EXCLUDED.umap_x,
                    umap_y = EXCLUDED.umap_y
            """),
            values
        )
        
        logger.info(f"UMAP 좌표 적재 진행: {min(i+batch_size, total_rows)}/{total_rows}")
    
    logger.info(f"UMAP 좌표 적재 완료: {total_rows}개")
    return True


async def insert_panel_cluster_mappings(
    session: AsyncSession,
    session_id: str,
    df: pd.DataFrame
) -> bool:
    """
    패널-클러스터 매핑 DB 적재
    """
    logger.info("=" * 80)
    logger.info("패널-클러스터 매핑 DB 적재")
    logger.info("=" * 80)
    
    required_cols = ['mb_sn', 'cluster_hdbscan']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        logger.error(f"필수 컬럼이 없습니다: {missing_cols}")
        return False
    
    # 기존 매핑 삭제
    await session.execute(
        text("DELETE FROM merged.panel_cluster_mappings WHERE session_id = :session_id"),
        {"session_id": session_id}
    )
    logger.info(f"기존 매핑 삭제 완료: session_id={session_id}")
    
    # 배치로 삽입 (1000개씩)
    batch_size = 1000
    total_rows = len(df)
    
    for i in range(0, total_rows, batch_size):
        batch_df = df.iloc[i:i+batch_size]
        
        values = []
        for _, row in batch_df.iterrows():
            values.append({
                "session_id": session_id,
                "mb_sn": str(row['mb_sn']),
                "cluster_id": int(row['cluster_hdbscan'])
            })
        
        # 배치 삽입
        await session.execute(
            text("""
                INSERT INTO merged.panel_cluster_mappings (session_id, mb_sn, cluster_id)
                VALUES (:session_id, :mb_sn, :cluster_id)
                ON CONFLICT (session_id, mb_sn) DO UPDATE SET
                    cluster_id = EXCLUDED.cluster_id
            """),
            values
        )
        
        logger.info(f"매핑 적재 진행: {min(i+batch_size, total_rows)}/{total_rows}")
    
    logger.info(f"패널-클러스터 매핑 적재 완료: {total_rows}개")
    
    # 클러스터별 통계 출력
    cluster_counts = df['cluster_hdbscan'].value_counts().sort_index()
    logger.info("\n클러스터별 패널 수:")
    for cluster_id, count in cluster_counts.items():
        if cluster_id == -1:
            logger.info(f"  Noise: {count}개 ({count/len(df)*100:.2f}%)")
        else:
            logger.info(f"  Cluster {cluster_id}: {count}개 ({count/len(df)*100:.2f}%)")
    
    return True


async def main():
    """메인 함수"""
    logger.info("=" * 80)
    logger.info("새로운 클러스터링 결과 DB 적재 시작")
    logger.info("=" * 80)
    
    # 1. 파일 확인
    if not CSV_PATH.exists():
        logger.error(f"CSV 파일을 찾을 수 없습니다: {CSV_PATH}")
        return
    
    logger.info(f"CSV 파일: {CSV_PATH}")
    logger.info(f"메타데이터 파일: {METADATA_PATH}")
    
    # 2. 데이터 로드
    logger.info("\n[1단계] 데이터 로드")
    df = pd.read_csv(CSV_PATH, encoding='utf-8')
    logger.info(f"CSV 로드 완료: {len(df)}행, {len(df.columns)}열")
    
    metadata = await load_metadata()
    if metadata:
        logger.info(f"메타데이터 로드 완료: Silhouette Score={metadata.get('silhouette_score', 0):.4f}")
    
    # 3. DB 연결
    logger.info("\n[2단계] DB 연결")
    uri = os.getenv("ASYNC_DATABASE_URI")
    if not uri:
        logger.error("ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
        return
    
    if uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    elif "postgresql+asyncpg" in uri:
        uri = uri.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
    
    engine = create_async_engine(uri, echo=False, pool_pre_ping=True)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with SessionLocal() as session:
            async with session.begin():
                # 4. Precomputed 세션 조회/생성
                logger.info("\n[3단계] Precomputed 세션 조회/생성")
                session_id = await get_or_create_precomputed_session(session)
                
                # 5. 클러스터링 세션 정보 적재
                logger.info("\n[4단계] 클러스터링 세션 정보 적재")
                await insert_clustering_session(session, session_id, df, metadata)
                
                # 6. UMAP 좌표 적재
                logger.info("\n[5단계] UMAP 좌표 적재")
                await insert_umap_coordinates(session, session_id, df)
                
                # 7. 패널-클러스터 매핑 적재
                logger.info("\n[6단계] 패널-클러스터 매핑 적재")
                await insert_panel_cluster_mappings(session, session_id, df)
                
                logger.info("\n" + "=" * 80)
                logger.info("✅ 모든 데이터 적재 완료!")
                logger.info("=" * 80)
                logger.info(f"Session ID: {session_id}")
                logger.info(f"Precomputed Name: {PRECOMPUTED_NAME}")
                logger.info(f"다음 단계: 클러스터 프로필 생성 및 비교 데이터 생성")
                
    except Exception as e:
        logger.error(f"DB 적재 실패: {str(e)}", exc_info=True)
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

