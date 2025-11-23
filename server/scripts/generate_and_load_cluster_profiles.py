"""클러스터 프로파일 생성 및 NeonDB 적재 스크립트"""
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


def analyze_cluster_profiles(df: pd.DataFrame, labels: np.ndarray) -> Dict[int, Dict[str, Any]]:
    """
    클러스터별 상세 프로파일 분석
    (flc_income_hdbscan_analysis.py의 analyze_cluster_profiles 함수 기반)
    """
    logger.info("=" * 80)
    logger.info("클러스터 프로파일 분석 시작")
    logger.info("=" * 80)
    
    df_temp = df.copy()
    
    # cluster 컬럼이 이미 있으면 사용, 없으면 labels 추가
    if 'cluster' not in df_temp.columns:
        if len(labels) == len(df_temp):
            df_temp['cluster'] = labels
        else:
            logger.error(f"labels 길이 불일치: df={len(df_temp)}, labels={len(labels)}")
            raise ValueError(f"labels 길이가 df와 일치하지 않습니다: {len(df_temp)} vs {len(labels)}")
    else:
        # 이미 cluster 컬럼이 있으면 labels는 무시하고 df의 cluster 사용
        logger.info("df에 이미 cluster 컬럼이 있어 사용합니다.")
    
    cluster_profiles = {}
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    
    for cluster_id in sorted(set(labels)):
        if cluster_id == -1:  # 노이즈는 별도 처리
            continue
        
        cluster_data = df_temp[df_temp['cluster'] == cluster_id]
        
        profile = {
            'cluster_id': cluster_id,
            'size': len(cluster_data),
            'size_pct': len(cluster_data) / len(df) * 100,
        }
        
        # 기본 인구통계
        if 'age' in cluster_data.columns:
            profile['avg_age'] = float(cluster_data['age'].mean())
            profile['std_age'] = float(cluster_data['age'].std())
        
        if 'Q6_income' in cluster_data.columns:
            profile['avg_income'] = float(cluster_data['Q6_income'].mean())
        elif 'Q6_scaled' in cluster_data.columns:
            profile['avg_income_scaled'] = float(cluster_data['Q6_scaled'].mean())
        
        if 'is_college_graduate' in cluster_data.columns:
            profile['college_graduate_rate'] = float(cluster_data['is_college_graduate'].mean())
        
        # 가족 구성
        if 'has_children' in cluster_data.columns:
            profile['has_children_rate'] = float(cluster_data['has_children'].mean())
            if profile['has_children_rate'] > 0:
                children_data = cluster_data[cluster_data['has_children'] == 1]
                if 'children_category_ordinal' in children_data.columns:
                    profile['avg_children_count'] = float(children_data['children_category_ordinal'].mean())
        
        # 소비 패턴
        if 'Q8_count' in cluster_data.columns:
            profile['avg_electronics_count'] = float(cluster_data['Q8_count'].mean())
        if 'Q8_premium_index' in cluster_data.columns:
            profile['avg_premium_index'] = float(cluster_data['Q8_premium_index'].mean())
        if 'is_premium_car' in cluster_data.columns:
            profile['premium_car_rate'] = float(cluster_data['is_premium_car'].mean())
        
        # 생애주기 분포
        if 'life_stage' in cluster_data.columns:
            life_stage_dist = cluster_data['life_stage'].value_counts(normalize=True).to_dict()
            profile['life_stage_dist'] = {int(k): float(v) for k, v in life_stage_dist.items()}
            top_stage = max(life_stage_dist.items(), key=lambda x: x[1])
            profile['top_life_stage'] = int(top_stage[0])
            profile['top_life_stage_pct'] = float(top_stage[1])
        
        # 소득 분포
        if 'income_tier' in cluster_data.columns:
            income_dist = cluster_data['income_tier'].value_counts(normalize=True).to_dict()
            profile['income_tier_dist'] = {str(k): float(v) for k, v in income_dist.items()}
            top_income = max(income_dist.items(), key=lambda x: x[1])
            profile['top_income_tier'] = str(top_income[0])
            profile['top_income_tier_pct'] = float(top_income[1])
        
        # 지역 분포
        if 'is_metro' in cluster_data.columns:
            profile['metro_rate'] = float(cluster_data['is_metro'].mean())
        
        cluster_profiles[cluster_id] = profile
        
        logger.info(f"Cluster {cluster_id}: {len(cluster_data):,}명 ({len(cluster_data)/len(df)*100:.1f}%)")
    
    logger.info(f"프로파일 생성 완료: {len(cluster_profiles)}개 클러스터")
    return cluster_profiles


def convert_profile_to_db_format(
    profile: Dict[str, Any],
    session_id: str,
    df_full: pd.DataFrame,
    cluster_id: int,
    overall_stats: Dict[str, dict],
    profile_features: Dict[str, List[str]]
) -> Dict[str, Any]:
    """
    프로파일을 DB 스키마 형식으로 변환 (기존 clustering_viz.py 로직 사용)
    """
    from app.api.clustering_viz import (
        collect_distinctive_features,
        build_cluster_name,
        build_insights,
        flavor_tag,
        summarize_feature
    )
    
    # 1. 클러스터별 통계 계산
    cluster_df = df_full[df_full['cluster'] == cluster_id]
    cluster_stats: Dict[str, dict] = {}
    
    for group_cols in profile_features.values():
        for col in group_cols:
            if col not in df_full.columns:
                continue
            if col not in cluster_stats:
                cluster_stats[col] = summarize_feature(cluster_df, col)
    
    # 2. 특징적인 피처 수집
    distinctive, _ = collect_distinctive_features(
        df=df_full,
        cluster_id=cluster_id,
        profile_features=profile_features,
        overall_stats=overall_stats
    )
    
    # 3. 클러스터 이름 생성
    name = build_cluster_name(
        cluster_id=cluster_id,
        distinctive=distinctive,
        cluster_stats=cluster_stats,
        overall_stats=overall_stats
    )
    
    # 4. 인사이트 생성 (카테고리별)
    insights_dict = build_insights(
        cluster_id=cluster_id,
        df=df_full,
        distinctive=distinctive,
        cluster_stats=cluster_stats,
        overall_stats=overall_stats
    )
    
    # 5. 태그 생성
    flavor = flavor_tag(distinctive)
    tags: List[str] = []
    if flavor:
        tags.append(flavor)
    
    size_pct = profile.get('size_pct', 0)
    if size_pct >= 30:
        tags.append("대형 군집")
    elif size_pct >= 15:
        tags.append("중형 군집")
    else:
        tags.append("소형 군집")
    
    # 6. features JSONB 생성 (클러스터링에 사용한 피처 평균값)
    features = {}
    used_features = [
        'age', 'Q6_income', 'Q6_scaled', 'education_level_scaled',
        'Q8_count', 'Q8_premium_index', 'is_premium_car'
    ]
    for feat in used_features:
        if feat in df_full.columns:
            features[feat] = float(cluster_df[feat].mean())
    
    # 7. distinctive_features를 v1 호환 형식으로 변환
    distinctive_features_v1_compat = []
    for d in distinctive:
        eff = d.get("effect", {})
        if eff.get("type") == "numeric":
            distinctive_features_v1_compat.append({
                "feature": d["feature"],
                "value": eff.get("cluster_mean", 0.0),
                "overall": eff.get("overall_mean", 0.0),
                "diff": eff.get("diff", 0.0),
                "diff_percent": eff.get("effect_size", 0.0) * 100,
            })
        elif eff.get("type") == "binary":
            distinctive_features_v1_compat.append({
                "feature": d["feature"],
                "value": eff.get("cluster_p", 0.0),
                "overall": eff.get("overall_p", 0.0),
                "diff": eff.get("lift", 0.0),
                "diff_percent": eff.get("lift", 0.0) * 100,
            })
    
    # 8. insights를 리스트 형식으로 변환
    insights_list = []
    for category, items in insights_dict.items():
        insights_list.extend(items)
    
    # 9. segments 생성
    from app.api.clustering_viz import life_stage, value_level
    segments = {
        "life_stage": life_stage(cluster_stats, overall_stats),
        "value_level": value_level(distinctive),
    }
    
    return {
        'session_id': session_id,
        'cluster_id': cluster_id,
        'size': profile['size'],
        'percentage': profile['size_pct'],
        'name': name,
        'tags': tags,
        'distinctive_features': distinctive_features_v1_compat,
        'insights': insights_list,
        'insights_by_category': insights_dict,
        'segments': segments,
        'features': features
    }


async def load_clustering_data_from_db(session_id: str) -> Optional[Dict[str, Any]]:
    """NeonDB에서 클러스터링 데이터 로드"""
    from app.utils.clustering_loader import load_full_clustering_data_from_db
    
    logger.info(f"NeonDB에서 클러스터링 데이터 로드: session_id={session_id}")
    artifacts = await load_full_clustering_data_from_db(session_id)
    
    if not artifacts:
        logger.error(f"클러스터링 데이터를 찾을 수 없음: session_id={session_id}")
        return None
    
    return artifacts


async def insert_profiles_to_db(
    session: AsyncSession,
    session_id: str,
    profiles: List[Dict[str, Any]]
) -> bool:
    """프로파일을 DB에 삽입"""
    try:
        # 기존 프로파일 삭제
        await session.execute(
            text("DELETE FROM merged.cluster_profiles WHERE session_id = :session_id"),
            {"session_id": session_id}
        )
        logger.info(f"기존 프로파일 삭제 완료: session_id={session_id}")
        
        # 프로파일 삽입
        for profile in profiles:
            await session.execute(
                text("""
                    INSERT INTO merged.cluster_profiles (
                        session_id, cluster_id, size, percentage, name, tags,
                        distinctive_features, insights, insights_by_category,
                        segments, features
                    ) VALUES (
                        :session_id, :cluster_id, :size, :percentage, :name, :tags,
                        CAST(:distinctive_features AS jsonb),
                        :insights,
                        CAST(:insights_by_category AS jsonb),
                        CAST(:segments AS jsonb),
                        CAST(:features AS jsonb)
                    )
                    ON CONFLICT (session_id, cluster_id) DO UPDATE SET
                        size = EXCLUDED.size,
                        percentage = EXCLUDED.percentage,
                        name = EXCLUDED.name,
                        tags = EXCLUDED.tags,
                        distinctive_features = EXCLUDED.distinctive_features,
                        insights = EXCLUDED.insights,
                        insights_by_category = EXCLUDED.insights_by_category,
                        segments = EXCLUDED.segments,
                        features = EXCLUDED.features,
                        updated_at = CURRENT_TIMESTAMP
                """),
                {
                    "session_id": session_id,
                    "cluster_id": profile['cluster_id'],
                    "size": profile['size'],
                    "percentage": profile['percentage'],
                    "name": profile['name'],
                    "tags": profile['tags'],
                    "distinctive_features": json.dumps(profile['distinctive_features'], ensure_ascii=False),
                    "insights": profile['insights'],
                    "insights_by_category": json.dumps(profile['insights_by_category'], ensure_ascii=False),
                    "segments": json.dumps(profile['segments'], ensure_ascii=False),
                    "features": json.dumps(profile['features'], ensure_ascii=False)
                }
            )
        
        logger.info(f"프로파일 삽입 완료: {len(profiles)}개")
        return True
        
    except Exception as e:
        logger.error(f"프로파일 삽입 실패: {str(e)}", exc_info=True)
        raise


async def main():
    """메인 함수"""
    logger.info("=" * 80)
    logger.info("클러스터 프로파일 생성 및 NeonDB 적재 시작")
    logger.info("=" * 80)
    
    # 1. Precomputed 세션 ID 조회
    from app.utils.clustering_loader import get_precomputed_session_id
    
    precomputed_name = "hdbscan_default"
    session_id = await get_precomputed_session_id(precomputed_name)
    
    if not session_id:
        logger.error(f"Precomputed 세션을 찾을 수 없음: name={precomputed_name}")
        return
    
    logger.info(f"Precomputed 세션 ID: {session_id}")
    
    # 2. 클러스터링 데이터 로드
    artifacts = await load_clustering_data_from_db(session_id)
    if not artifacts:
        logger.error("클러스터링 데이터 로드를 실패했습니다.")
        return
    
    df = artifacts.get('data')
    labels = artifacts.get('labels')
    
    if df is None:
        logger.error("클러스터링 데이터가 없습니다.")
        return
    
    logger.info(f"클러스터링 데이터 로드 완료: {len(df)}행")
    
    # df에 cluster 컬럼이 있는지 확인
    if 'cluster' not in df.columns:
        if labels is None:
            logger.error("cluster 컬럼도 없고 labels도 없습니다.")
            return
        # labels가 배열이면 df에 추가
        if len(labels) == len(df):
            df['cluster'] = labels
            logger.info(f"labels를 df에 추가: {len(labels)}개 레이블")
        else:
            logger.error(f"labels 길이 불일치: df={len(df)}, labels={len(labels)}")
            return
    else:
        logger.info(f"df에 cluster 컬럼 존재: {df['cluster'].nunique()}개 고유 클러스터")
    
    # 3. 원본 CSV 데이터 로드 (프로파일 생성에 필요한 추가 컬럼 포함)
    csv_path = project_root / 'clustering_data' / 'data' / 'welcome_1st_2nd_joined.csv'
    if not csv_path.exists():
        logger.error(f"원본 CSV 파일을 찾을 수 없음: {csv_path}")
        return
    
    logger.info(f"원본 CSV 로드 시작: {csv_path}")
    df_original = pd.read_csv(csv_path)
    logger.info(f"원본 CSV 로드 완료: {len(df_original)}행, {len(df_original.columns)}열")
    
    # 4. mb_sn으로 병합하여 전체 데이터 구성
    # 클러스터링 결과에 있는 패널만 사용 (inner join)
    if 'mb_sn' in df.columns and 'mb_sn' in df_original.columns:
        # df의 mb_sn과 cluster만 사용하여 원본 데이터와 병합
        df_cluster = df[['mb_sn', 'cluster']].copy()
        df_full = pd.merge(df_cluster, df_original, on='mb_sn', how='inner')
        logger.info(f"데이터 병합 완료: {len(df_full)}행 (클러스터링 결과 기준)")
        
        # cluster 컬럼 확인
        if 'cluster' not in df_full.columns:
            logger.error("병합 후 cluster 컬럼이 없습니다.")
            return
        
        # labels는 df_full의 cluster 컬럼에서 가져오기
        labels = df_full['cluster'].values
        logger.info(f"레이블 추출 완료: {len(labels)}개, 고유 클러스터: {len(set(labels))}개")
    else:
        logger.error("mb_sn 컬럼이 없습니다.")
        return
    
    # 5. 프로파일 생성
    logger.info("프로파일 생성 시작...")
    cluster_profiles_raw = analyze_cluster_profiles(df_full, labels)
    
    if not cluster_profiles_raw:
        logger.error("프로파일 생성 실패")
        return
    
    # 6. 전체 통계 계산 (clustering_viz.py 방식)
    logger.info("전체 통계 계산 시작...")
    from app.api.clustering_viz import PROFILE_FEATURES, summarize_feature
    
    overall_stats: Dict[str, dict] = {}
    for group, cols in PROFILE_FEATURES.items():
        for col in cols:
            if col not in df_full.columns:
                continue
            if col not in overall_stats:
                overall_stats[col] = summarize_feature(df_full, col)
    
    logger.info(f"전체 통계 계산 완료: {len(overall_stats)}개 피처")
    
    # 7. DB 형식으로 변환
    logger.info("DB 형식으로 변환 시작...")
    profiles_db = []
    for cluster_id, profile in cluster_profiles_raw.items():
        profile_db = convert_profile_to_db_format(
            profile, 
            session_id, 
            df_full, 
            cluster_id, 
            overall_stats, 
            PROFILE_FEATURES
        )
        profiles_db.append(profile_db)
    
    logger.info(f"DB 형식 변환 완료: {len(profiles_db)}개 프로파일")
    
    # 8. DB에 삽입
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
                await insert_profiles_to_db(session, session_id, profiles_db)
                logger.info("프로파일 DB 적재 완료!")
    except Exception as e:
        logger.error(f"DB 적재 실패: {str(e)}", exc_info=True)
        raise
    finally:
        await engine.dispose()
    
    logger.info("=" * 80)
    logger.info("✅ 클러스터 프로파일 생성 및 적재 완료!")
    logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())

