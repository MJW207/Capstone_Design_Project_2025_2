"""
클러스터 비교 데이터 생성 및 NeonDB 적재 스크립트

모든 클러스터 쌍에 대해 비교 분석을 수행하고 DB에 저장합니다.
"""
import asyncio
import sys
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from scipy import stats
import math
import math

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


# 이진형 변수 목록 (0/1 값이지만 이진형으로 처리해야 함)
BINARY_FEATURES = [
    'has_drinking_experience',
    'has_smoking_experience',
    'is_college_graduate',
    'is_metro',
    'is_metro_city',  # 광역시
    'is_premium_car',
    'is_premium_phone',
    'is_apple_user',
    'is_samsung_user',
    'has_car',
    'has_children',
    'is_employed',
    'is_unemployed',
    'is_student',
    'drinks_beer',
    'drinks_soju',
    'drinks_wine',
    'drinks_western',
    'drinks_makgeolli',
    'drinks_low_alcohol',
    'drinks_cocktail',
    'smokes_regular',
    'smokes_heet',
    'smokes_liquid',
    'smokes_other',
    'is_domestic_car',  # 국산차 보유
]

def calculate_feature_difference(
    cluster_a_data: pd.DataFrame,
    cluster_b_data: pd.DataFrame,
    feature_name: str
) -> Dict[str, Any]:
    """
    두 클러스터 간 피처 차이 계산
    
    Returns:
        비교 결과 딕셔너리
    """
    if feature_name not in cluster_a_data.columns or feature_name not in cluster_b_data.columns:
        return None
    
    a_values = cluster_a_data[feature_name].dropna()
    b_values = cluster_b_data[feature_name].dropna()
    
    if len(a_values) == 0 or len(b_values) == 0:
        return None
    
    # 이진형 변수인지 먼저 확인 (명시적 목록 확인)
    is_binary = feature_name in BINARY_FEATURES
    
    # 이진형 변수 체크: 0/1 값만 있는지 확인
    if not is_binary and pd.api.types.is_numeric_dtype(a_values):
        unique_a = set(a_values.unique())
        unique_b = set(b_values.unique())
        all_unique = unique_a | unique_b
        # 0과 1만 있으면 이진형으로 간주
        if all_unique.issubset({0, 1, 0.0, 1.0}):
            is_binary = True
    
    # 연속형 변수인지 확인 (이진형이 아닌 경우만)
    is_continuous = not is_binary and pd.api.types.is_numeric_dtype(a_values) and pd.api.types.is_numeric_dtype(b_values)
    
    # 이진형 변수 처리
    if is_binary:
        # 0/1 값을 비율로 변환
        a_ratio = float(a_values.mean())
        b_ratio = float(b_values.mean())
        diff_pct_points = (b_ratio - a_ratio) * 100.0
        
        # 카테고리별 비교 데이터 생성 (이진형은 2개 카테고리)
        categories = {
            '1': {  # True/1 값
                'cluster_a': {
                    'count': int((a_values == 1).sum()),
                    'percentage': float(a_ratio * 100)
                },
                'cluster_b': {
                    'count': int((b_values == 1).sum()),
                    'percentage': float(b_ratio * 100)
                }
            },
            '0': {  # False/0 값
                'cluster_a': {
                    'count': int((a_values == 0).sum()),
                    'percentage': float((1 - a_ratio) * 100)
                },
                'cluster_b': {
                    'count': int((b_values == 0).sum()),
                    'percentage': float((1 - b_ratio) * 100)
                }
            }
        }
        
        return {
            "type": "categorical",  # 이진형도 categorical로 저장 (2개 카테고리)
            "cluster_a": {
                "total_count": int(len(a_values))
            },
            "cluster_b": {
                "total_count": int(len(b_values))
            },
            "categories": categories
        }
    
    if is_continuous:
        # 연속형 변수: 평균, 표준편차, 통계적 유의성 검정
        a_mean = float(a_values.mean())
        b_mean = float(b_values.mean())
        a_std = float(a_values.std()) if len(a_values) > 1 else 0.0
        b_std = float(b_values.std()) if len(b_values) > 1 else 0.0
        
        # 차이 계산
        diff = b_mean - a_mean
        diff_pct = (diff / a_mean * 100) if a_mean != 0 else 0.0
        
        # t-검정 (정규성 가정)
        try:
            if len(a_values) > 1 and len(b_values) > 1:
                t_stat, p_value = stats.ttest_ind(a_values, b_values)
                is_significant = p_value < 0.05 if not (np.isnan(p_value) or np.isinf(p_value)) else False
            else:
                t_stat, p_value = None, None
                is_significant = False
        except:
            t_stat, p_value = None, None
            is_significant = False
        
        # Infinity, NaN 처리
        def safe_float(value):
            """Infinity, NaN을 None으로 변환"""
            if value is None:
                return None
            try:
                if np.isnan(value) or np.isinf(value):
                    return None
                return float(value)
            except (TypeError, ValueError):
                return None
        
        return {
            "type": "continuous",
            "cluster_a": {
                "mean": a_mean,
                "std": a_std,
                "count": int(len(a_values))
            },
            "cluster_b": {
                "mean": b_mean,
                "std": b_std,
                "count": int(len(b_values))
            },
            "difference": {
                "absolute": diff,
                "percentage": diff_pct,
                "t_statistic": safe_float(t_stat),
                "p_value": safe_float(p_value),
                "is_significant": bool(is_significant)
            }
        }
    else:
        # 범주형 변수: 비율 차이
        a_counts = a_values.value_counts()
        b_counts = b_values.value_counts()
        
        # 모든 카테고리 수집
        all_categories = set(a_counts.index) | set(b_counts.index)
        
        category_comparisons = {}
        for cat in all_categories:
            a_count = int(a_counts.get(cat, 0))
            b_count = int(b_counts.get(cat, 0))
            a_pct = (a_count / len(a_values) * 100) if len(a_values) > 0 else 0.0
            b_pct = (b_count / len(b_values) * 100) if len(b_values) > 0 else 0.0
            diff_pct = b_pct - a_pct
            
            category_comparisons[str(cat)] = {
                "cluster_a": {
                    "count": int(a_count),
                    "percentage": float(a_pct)
                },
                "cluster_b": {
                    "count": int(b_count),
                    "percentage": float(b_pct)
                },
                "difference": {
                    "percentage_points": float(diff_pct)
                }
            }
        
        return {
            "type": "categorical",
            "cluster_a": {
                "total_count": int(len(a_values))
            },
            "cluster_b": {
                "total_count": int(len(b_values))
            },
            "categories": category_comparisons
        }


def generate_cluster_comparison(
    df: pd.DataFrame,
    cluster_a_id: int,
    cluster_b_id: int,
    feature_names: List[str]
) -> Dict[str, Any]:
    """
    두 클러스터 간 비교 분석 생성
    
    Args:
        df: 전체 데이터프레임 (cluster 컬럼 포함)
        cluster_a_id: 클러스터 A ID
        cluster_b_id: 클러스터 B ID
        feature_names: 비교할 피처 이름 리스트
    
    Returns:
        비교 결과 딕셔너리
    """
    cluster_a_data = df[df['cluster'] == cluster_a_id]
    cluster_b_data = df[df['cluster'] == cluster_b_id]
    
    if len(cluster_a_data) == 0 or len(cluster_b_data) == 0:
        return None
    
    comparison = {
        "cluster_a": {
            "id": int(cluster_a_id),
            "size": int(len(cluster_a_data))
        },
        "cluster_b": {
            "id": int(cluster_b_id),
            "size": int(len(cluster_b_data))
        },
        "features": {}
    }
    
    # 각 피처에 대해 비교 수행
    for feature_name in feature_names:
        feature_diff = calculate_feature_difference(
            cluster_a_data, cluster_b_data, feature_name
        )
        if feature_diff:
            comparison["features"][feature_name] = feature_diff
    
    return comparison


def clean_for_json(obj):
    """JSON 직렬화 전에 Infinity, NaN, numpy 타입 정리"""
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, bool):
        return bool(obj)
    else:
        return obj


async def insert_comparison_to_db(
    session: AsyncSession,
    session_id: str,
    cluster_a: int,
    cluster_b: int,
    comparison_data: Dict[str, Any]
) -> bool:
    """비교 데이터 DB 적재"""
    try:
        # JSON 직렬화 전에 데이터 정리 (Infinity, NaN, numpy 타입 처리)
        cleaned_data = clean_for_json(comparison_data)
        
        await session.execute(
            text("""
                INSERT INTO merged.cluster_comparisons (
                    session_id, cluster_a, cluster_b, comparison_data
                ) VALUES (
                    :session_id, :cluster_a, :cluster_b,
                    CAST(:comparison_data AS jsonb)
                )
                ON CONFLICT (session_id, cluster_a, cluster_b) DO UPDATE SET
                    comparison_data = EXCLUDED.comparison_data,
                    updated_at = CURRENT_TIMESTAMP
            """),
            {
                "session_id": session_id,
                "cluster_a": int(cluster_a),
                "cluster_b": int(cluster_b),
                "comparison_data": json.dumps(cleaned_data, ensure_ascii=False)
            }
        )
        return True
    except Exception as e:
        logger.error(f"비교 데이터 삽입 실패: cluster_a={cluster_a}, cluster_b={cluster_b}, 오류: {str(e)}")
        return False


async def main():
    """메인 함수"""
    logger.info("=" * 80)
    logger.info("클러스터 비교 데이터 생성 및 NeonDB 적재 시작")
    logger.info("=" * 80)
    
    # 1. Precomputed 세션 ID 조회
    from app.utils.clustering_loader import get_precomputed_session_id, load_full_clustering_data_from_db
    
    session_id = await get_precomputed_session_id(PRECOMPUTED_NAME)
    if not session_id:
        logger.error(f"Precomputed 세션을 찾을 수 없음: name={PRECOMPUTED_NAME}")
        return
    
    logger.info(f"Precomputed 세션 ID: {session_id}")
    
    # 2. 클러스터링 데이터 로드
    logger.info("=" * 80)
    logger.info("클러스터링 데이터 로드")
    logger.info("=" * 80)
    
    artifacts = await load_full_clustering_data_from_db(session_id)
    if not artifacts:
        logger.error("클러스터링 데이터 로드 실패")
        return
    
    df = artifacts.get('data')
    if df is None:
        logger.error("데이터가 없습니다")
        return
    
    # cluster 컬럼 확인
    if 'cluster' not in df.columns:
        logger.error("cluster 컬럼이 없습니다")
        return
    
    logger.info(f"데이터 로드 완료: {len(df)}행, {len(df.columns)}열")
    
    # 3. 원본 패널 데이터 로드
    logger.info("=" * 80)
    logger.info("원본 패널 데이터 로드")
    logger.info("=" * 80)
    
    from server.scripts.generate_and_load_cluster_profiles import load_panel_data_from_db, extract_and_transform_features
    
    mb_sn_list = df['mb_sn'].tolist() if 'mb_sn' in df.columns else []
    if not mb_sn_list:
        logger.error("mb_sn 컬럼이 없습니다")
        return
    
    df_panel = await load_panel_data_from_db(mb_sn_list)
    if df_panel.empty:
        logger.error("원본 패널 데이터를 로드할 수 없습니다")
        return
    
    df_features = extract_and_transform_features(df_panel)
    if df_features.empty:
        logger.error("피처 추출 실패")
        return
    
    # 4. 데이터 병합
    df_cluster = df[['mb_sn', 'cluster']].copy()
    df_full = df_cluster.merge(df_features, on='mb_sn', how='left')
    
    logger.info(f"데이터 병합 완료: {len(df_full)}행")
    
    # 5. 비교할 피처 선택 (모든 사용 가능한 변수 포함)
    feature_names = [
        # 인구통계
        'age', 'age_group', 'generation',
        # 경제
        'Q6_income', 'Q6_scaled', 'Q6_category',
        # 교육
        'education_level', 'education_level_scaled', 'is_college_graduate',
        # 가족 구성
        'has_children', 'children_category', 'children_category_ordinal', 'family_type',
        # 소비 패턴
        'Q8_count', 'Q8_count_scaled', 'Q8_premium_index',
        # 브랜드/디바이스
        'is_apple_user', 'is_samsung_user', 'is_premium_phone',
        # 차량
        'has_car', 'is_premium_car', 'is_domestic_car',
        # 라이프스타일 - 음주
        'has_drinking_experience', 'drinking_types_count',
        'drinks_beer', 'drinks_soju', 'drinks_wine', 'drinks_western',
        'drinks_makgeolli', 'drinks_low_alcohol', 'drinks_cocktail',
        # 라이프스타일 - 흡연
        'has_smoking_experience', 'smoking_types_count',
        'smokes_regular', 'smokes_heet', 'smokes_liquid', 'smokes_other',
        # 직업
        'is_employed', 'is_unemployed', 'is_student',
        # 지역
        'is_metro', 'is_metro_city', 'region_category', 'region_lvl1'
    ]
    
    # 존재하는 피처만 선택
    available_features = [f for f in feature_names if f in df_full.columns]
    logger.info(f"비교할 피처: {len(available_features)}개")
    logger.info(f"  {available_features[:10]}...")
    
    # 6. 클러스터 목록 추출
    unique_clusters = sorted([c for c in df_full['cluster'].unique() if c != -1])
    logger.info(f"비교할 클러스터: {len(unique_clusters)}개")
    
    # 7. 모든 클러스터 쌍에 대해 비교 생성
    logger.info("=" * 80)
    logger.info("클러스터 비교 데이터 생성")
    logger.info("=" * 80)
    
    total_pairs = len(unique_clusters) * (len(unique_clusters) - 1) // 2
    logger.info(f"총 비교 쌍: {total_pairs}개")
    
    # DB 연결
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
                # 기존 비교 데이터 삭제
                await session.execute(
                    text("DELETE FROM merged.cluster_comparisons WHERE session_id = :session_id"),
                    {"session_id": session_id}
                )
                logger.info(f"기존 비교 데이터 삭제 완료: session_id={session_id}")
            
            # 각 쌍에 대해 비교 생성 및 저장
            pair_count = 0
            for i, cluster_a in enumerate(unique_clusters):
                for cluster_b in unique_clusters[i+1:]:
                    pair_count += 1
                    
                    comparison = generate_cluster_comparison(
                        df_full, cluster_a, cluster_b, available_features
                    )
                    
                    if comparison:
                        async with SessionLocal() as session:
                            async with session.begin():
                                success = await insert_comparison_to_db(
                                    session, session_id, cluster_a, cluster_b, comparison
                                )
                                if success:
                                    logger.info(f"비교 데이터 생성 및 저장: Cluster {cluster_a} vs {cluster_b} ({pair_count}/{total_pairs})")
                                else:
                                    logger.warning(f"비교 데이터 저장 실패: Cluster {cluster_a} vs {cluster_b}")
                    else:
                        logger.warning(f"비교 데이터 생성 실패: Cluster {cluster_a} vs {cluster_b}")
        
        logger.info("=" * 80)
        logger.info("✅ 클러스터 비교 데이터 생성 및 DB 적재 완료!")
        logger.info("=" * 80)
        logger.info(f"총 비교 쌍: {pair_count}개")
        
    except Exception as e:
        logger.error(f"비교 데이터 생성 실패: {str(e)}", exc_info=True)
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

