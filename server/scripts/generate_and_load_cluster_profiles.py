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


async def load_panel_data_from_db(mb_sn_list: List[str]) -> pd.DataFrame:
    """
    merged.panel_data에서 패널 데이터 로드 및 JSONB 파싱
    
    Args:
        mb_sn_list: 패널 ID 리스트
        
    Returns:
        DataFrame with columns: mb_sn, age, gender, location, ... (base_profile fields)
    """
    from app.utils.merged_data_loader import get_panels_from_merged_db_batch
    
    logger.info(f"[Panel Data Loader] 패널 데이터 로드 시작: {len(mb_sn_list)}개")
    
    # 배치로 데이터 로드
    panel_data_dict = await get_panels_from_merged_db_batch(mb_sn_list)
    
    if not panel_data_dict:
        logger.warning(f"[Panel Data Loader] 패널 데이터를 찾을 수 없음: {len(mb_sn_list)}개")
        return pd.DataFrame()
    
    # DataFrame으로 변환 (base_profile이 이미 평탄화되어 있음)
    df = pd.DataFrame(list(panel_data_dict.values()))
    
    logger.info(f"[Panel Data Loader] 패널 데이터 로드 완료: {len(df)}행, {len(df.columns)}열")
    logger.info(f"[Panel Data Loader] 컬럼 샘플: {list(df.columns)[:10]}")
    
    return df


def parse_income_range(income_str: Any) -> Optional[float]:
    """소득 범위 문자열을 숫자로 변환 (중간값)"""
    if not income_str or pd.isna(income_str):
        return None
    
    import re
    income_str = str(income_str)
    
    # "월 200~299만원" → 250
    match = re.search(r'(\d+)~(\d+)', income_str)
    if match:
        return (int(match.group(1)) + int(match.group(2))) / 2
    
    # "월 200만원 이상" → 200
    match = re.search(r'(\d+)만원\s*이상', income_str)
    if match:
        return float(match.group(1))
    
    # 숫자만 있는 경우
    match = re.search(r'(\d+)', income_str)
    if match:
        return float(match.group(1))
    
    return None


def extract_and_transform_features(df_panel: pd.DataFrame) -> pd.DataFrame:
    """
    base_profile, quick_answers에서 PROFILE_FEATURES에 필요한 컬럼 추출 및 변환
    
    Args:
        df_panel: merged.panel_data에서 로드한 DataFrame
        
    Returns:
        DataFrame with PROFILE_FEATURES columns
    """
    if df_panel.empty:
        logger.warning("[Feature Extractor] 입력 DataFrame이 비어있습니다.")
        return pd.DataFrame()
    
    df = df_panel.copy()
    logger.info(f"[Feature Extractor] 피처 추출 시작: {len(df)}행")
    
    # 1. age_group 생성
    if 'age' in df.columns:
        df['age_group'] = df['age'].apply(lambda x: 
            '20대' if pd.notna(x) and x < 30 else 
            '30대' if pd.notna(x) and x < 40 else 
            '40대' if pd.notna(x) and x < 50 else 
            '50대' if pd.notna(x) and x < 60 else 
            '60대+' if pd.notna(x) else None)
    
    # 2. generation 생성
    if 'age' in df.columns:
        df['generation'] = df['age'].apply(lambda x: 
            'MZ' if pd.notna(x) and x < 30 else 
            'X' if pd.notna(x) and x < 50 else 
            '베이비붐' if pd.notna(x) else None)
    
    # 3. has_children 생성
    children_col = '자녀수'
    if children_col in df.columns:
        df['has_children'] = pd.to_numeric(df[children_col], errors='coerce') > 0
    else:
        df['has_children'] = False
    
    # 4. children_category 생성
    if children_col in df.columns:
        df['children_category'] = pd.to_numeric(df[children_col], errors='coerce').apply(
            lambda x: '없음' if pd.isna(x) or x == 0 else 
            '1명' if x == 1 else 
            '2명' if x == 2 else 
            '3명+' if pd.notna(x) else None)
    else:
        df['children_category'] = '없음'
    
    # 5. family_type 생성
    family_col = '가족수'
    if family_col in df.columns:
        df['family_type'] = df[family_col].apply(lambda x: 
            f"{x}인가구" if pd.notna(x) and str(x).replace('명', '').replace('인', '').strip().isdigit() else None)
    
    # 6. is_metro 생성
    metro_cities = ['서울', '부산', '대구', '인천', '광주', '대전', '울산']
    location_col = 'location'
    if location_col in df.columns:
        df['is_metro'] = df[location_col].apply(lambda x: x in metro_cities if pd.notna(x) else False)
        df['is_metro_city'] = df['is_metro']
    else:
        df['is_metro'] = False
        df['is_metro_city'] = False
    
    # 7. region_category 생성
    if location_col in df.columns:
        df['region_category'] = df[location_col].apply(lambda x: 
            '수도권' if pd.notna(x) and x in ['서울', '인천', '경기'] else
            '지방' if pd.notna(x) else None)
    
    # 8. Q6_income 추출 (월평균 개인소득)
    income_col = '월평균 개인소득'
    if income_col in df.columns:
        df['Q6_income'] = df[income_col].apply(parse_income_range)
    elif 'income' in df.columns:
        df['Q6_income'] = df['income'].apply(parse_income_range)
    else:
        df['Q6_income'] = None
    
    # Q6_scaled는 나중에 전체 데이터 기준으로 계산
    
    # 9. Q6_category 생성
    if 'Q6_income' in df.columns:
        df['Q6_category'] = df['Q6_income'].apply(lambda x: 
            '저소득' if pd.notna(x) and x < 200 else
            '중소득' if pd.notna(x) and x < 400 else
            '중상소득' if pd.notna(x) and x < 600 else
            '고소득' if pd.notna(x) else None)
    
    # 10. is_employed 생성
    job_col = '직업'
    if job_col in df.columns:
        df['is_employed'] = df[job_col].apply(lambda x: pd.notna(x) and str(x).strip() != '')
        df['is_unemployed'] = ~df['is_employed']
    else:
        df['is_employed'] = False
        df['is_unemployed'] = True
    
    # 11. is_student 생성
    if job_col in df.columns:
        df['is_student'] = df[job_col].apply(lambda x: '학생' in str(x) if pd.notna(x) else False)
    else:
        df['is_student'] = False
    
    # 12. Q8_count 생성 (보유전제품 배열 길이)
    products_col = '보유전제품'
    if products_col in df.columns:
        df['Q8_count'] = df[products_col].apply(lambda x: len(x) if isinstance(x, list) else 0)
    else:
        df['Q8_count'] = 0
    
    # Q8_count_scaled는 나중에 계산
    
    # 13. is_apple_user 생성
    phone_brand_col = '보유 휴대폰 단말기 브랜드'
    if phone_brand_col in df.columns:
        df['is_apple_user'] = df[phone_brand_col].apply(lambda x: '애플' in str(x) if pd.notna(x) else False)
        df['is_samsung_user'] = df[phone_brand_col].apply(lambda x: '삼성' in str(x) if pd.notna(x) else False)
        df['is_premium_phone'] = df[phone_brand_col].apply(lambda x: 
            any(brand in str(x) for brand in ['애플', '갤럭시 S', '갤럭시 노트']) if pd.notna(x) else False)
    else:
        df['is_apple_user'] = False
        df['is_samsung_user'] = False
        df['is_premium_phone'] = False
    
    # 14. Q8_premium_index 생성 (간단 버전: 애플 사용자면 높게)
    if 'is_apple_user' in df.columns and 'Q8_count' in df.columns:
        df['Q8_premium_index'] = (df['is_apple_user'].astype(int) * 2 + df['Q8_count']).astype(float)
    elif 'Q8_count' in df.columns:
        df['Q8_premium_index'] = df['Q8_count'].astype(float)
    else:
        df['Q8_premium_index'] = 0.0
    
    # 15. has_car 생성
    car_col = '보유차량여부'
    if car_col in df.columns:
        df['has_car'] = df[car_col].apply(lambda x: x == '있다' if pd.notna(x) else False)
    else:
        df['has_car'] = False
    
    # 16. is_premium_car 생성
    car_brand_col = '자동차 제조사'
    if car_brand_col in df.columns:
        premium_brands = ['테슬라', '벤츠', 'BMW', '아우디', '렉서스']
        df['is_premium_car'] = df[car_brand_col].apply(lambda x: 
            any(brand in str(x) for brand in premium_brands) if pd.notna(x) else False)
        df['is_domestic_car'] = df[car_brand_col].apply(lambda x: 
            any(brand in str(x) for brand in ['현대', '기아', '쌍용', 'GM대우']) if pd.notna(x) else False)
    else:
        df['is_premium_car'] = False
        df['is_domestic_car'] = False
    
    # 17. has_drinking_experience 생성
    drinking_col = '음용경험 술'
    if drinking_col in df.columns:
        df['has_drinking_experience'] = df[drinking_col].apply(lambda x: 
            isinstance(x, list) and len(x) > 0 and any('음주' in str(item) for item in x) if isinstance(x, list) else False)
        df['drinking_types_count'] = df[drinking_col].apply(lambda x: len(x) if isinstance(x, list) else 0)
    else:
        df['has_drinking_experience'] = False
        df['drinking_types_count'] = 0
    
    # 18. drinks_wine, drinks_soju 등은 quick_answers에서 추출 (나중에)
    
    # 19. has_smoking_experience 생성
    smoking_col = '흡연경험'
    if smoking_col in df.columns:
        df['has_smoking_experience'] = df[smoking_col].apply(lambda x: 
            isinstance(x, list) and len(x) > 0 and any('흡연' in str(item) for item in x) if isinstance(x, list) else False)
        df['smoking_types_count'] = df[smoking_col].apply(lambda x: len(x) if isinstance(x, list) else 0)
        df['smokes_regular'] = df[smoking_col].apply(lambda x: 
            isinstance(x, list) and any('현재 흡연' in str(item) for item in x) if isinstance(x, list) else False)
    else:
        df['has_smoking_experience'] = False
        df['smoking_types_count'] = 0
        df['smokes_regular'] = False
    
    # 20. is_college_graduate 생성
    education_col = '최종학력'
    if education_col in df.columns:
        df['is_college_graduate'] = df[education_col].apply(lambda x: 
            any(edu in str(x) for edu in ['대학교 졸업', '대학원 졸업']) if pd.notna(x) else False)
        # education_level_scaled: 고졸→1, 전문대→2, 대졸→3, 대원→4
        df['education_level_scaled'] = df[education_col].apply(lambda x: 
            1 if pd.notna(x) and '고등학교' in str(x) else
            2 if pd.notna(x) and '전문대' in str(x) else
            3 if pd.notna(x) and '대학교 졸업' in str(x) else
            4 if pd.notna(x) and '대학원' in str(x) else
            0)
    else:
        df['is_college_graduate'] = False
        df['education_level_scaled'] = 0
    
    logger.info(f"[Feature Extractor] 피처 추출 완료: {len(df)}행, {len(df.columns)}열")
    logger.info(f"[Feature Extractor] 생성된 피처: age_group, generation, has_children, Q6_income, Q8_count, ...")
    
    return df


def convert_profile_to_db_format(
    profile: Dict[str, Any],
    session_id: str,
    df_full: pd.DataFrame,
    cluster_id: int,
    overall_stats: Dict[str, dict],
    profile_features: Dict[str, List[str]],
    all_cluster_stats: Optional[Dict[int, Dict[str, dict]]] = None
) -> Dict[str, Any]:
    """
    프로파일을 DB 스키마 형식으로 변환 (개선된 함수들 사용)
    """
    from app.api.clustering_viz import (
        collect_balanced_distinctive_features,
        build_two_tier_cluster_name,
        build_storytelling_insights,
        generate_hierarchical_tags,
        build_marketing_segments,
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
    
    # 2. 균형 잡힌 특징 피처 수집 (최대 10개)
    distinctive, _ = collect_balanced_distinctive_features(
        df=df_full,
        cluster_id=cluster_id,
        profile_features=profile_features,
        overall_stats=overall_stats,
        max_features=10
    )
    
    # 3. 2단계 군집명 생성
    name_dict = build_two_tier_cluster_name(
        cluster_id=cluster_id,
        distinctive=distinctive,
        cluster_stats=cluster_stats,
        overall_stats=overall_stats
    )
    
    # 호환성을 위해 기존 형식도 유지
    name_full = name_dict["main"]
    if name_dict["sub"]:
        name_full = f"{name_dict['main']} ({name_dict['sub']})"
    
    # 4. 스토리텔링 형식 인사이트 생성
    storytelling_insights = build_storytelling_insights(
        cluster_id=cluster_id,
        df=df_full,
        distinctive=distinctive,
        cluster_stats=cluster_stats,
        overall_stats=overall_stats,
        all_cluster_stats=all_cluster_stats
    )
    
    # 기존 형식 인사이트도 생성 (호환성)
    from app.api.clustering_viz import build_insights
    insights_dict = build_insights(
        cluster_id=cluster_id,
        df=df_full,
        distinctive=distinctive,
        cluster_stats=cluster_stats,
        overall_stats=overall_stats
    )
    
    # 5. 계층적 태그 생성
    size_pct = profile.get('size_pct', 0)
    hierarchical_tags = generate_hierarchical_tags(
        distinctive=distinctive,
        cluster_stats=cluster_stats,
        overall_stats=overall_stats,
        percentage=size_pct
    )
    
    # 기존 형식 태그도 유지 (호환성)
    tags_flat: List[str] = []
    for tag in hierarchical_tags.get("primary", []):
        tags_flat.append(tag.get("label", ""))
    for tag in hierarchical_tags.get("secondary", []):
        tags_flat.append(tag.get("label", ""))
    
    # 6. features JSONB 생성 (클러스터링에 사용한 피처 평균값)
    features = {}
    used_features = [
        'age', 'Q6_income', 'Q6_scaled', 'education_level_scaled',
        'Q8_count', 'Q8_premium_index', 'is_premium_car'
    ]
    for feat in used_features:
        if feat in df_full.columns:
            features[feat] = float(cluster_df[feat].mean())
    
    # has_children_rate 추가 (Treemap에서 필요)
    if 'has_children' in df_full.columns:
        features['has_children_rate'] = float(cluster_df['has_children'].mean())
    elif '자녀수' in df_full.columns:
        # 자녀수가 있으면 has_children_rate 계산
        has_children = pd.to_numeric(cluster_df['자녀수'], errors='coerce') > 0
        features['has_children_rate'] = float(has_children.mean()) if len(has_children) > 0 else 0.0
    else:
        features['has_children_rate'] = 0.0
    
    # 7. distinctive_features를 개선된 형식으로 변환 (시각적 표현 포함)
    distinctive_features_enhanced = []
    for d in distinctive:
        eff = d.get("effect", {})
        feature_data = {
            "feature": d["feature"],
            "group": d.get("group", ""),
            "type": eff.get("type", ""),
            "score": d.get("score", 0.0),
        }
        
        if eff.get("type") == "numeric":
            feature_data.update({
                "value": eff.get("cluster_mean", 0.0),
                "overall": eff.get("overall_mean", 0.0),
                "diff": eff.get("diff", 0.0),
                "effect_size": eff.get("effect_size", 0.0),
                "visual_strength": eff.get("visual_strength", ""),
                "visual_bar": eff.get("visual_bar", ""),
                "interpretation": eff.get("interpretation", ""),
                "user_friendly": eff.get("user_friendly", ""),
            })
        elif eff.get("type") == "binary":
            feature_data.update({
                "value": eff.get("cluster_p", 0.0),
                "overall": eff.get("overall_p", 0.0),
                "lift": eff.get("lift", 0.0),
                "index": eff.get("index", 0.0),
                "visual_strength": eff.get("visual_strength", ""),
                "visual_bar": eff.get("visual_bar", ""),
                "interpretation": eff.get("interpretation", ""),
                "user_friendly": eff.get("user_friendly", ""),
            })
        
        distinctive_features_enhanced.append(feature_data)
    
    # 8. insights를 리스트 형식으로 변환 (기존 호환성)
    insights_list = []
    for category, items in insights_dict.items():
        insights_list.extend(items)
    
    # 9. segments 생성 (마케팅 활용 가이드 포함)
    marketing_segments = build_marketing_segments(
        cluster_id=cluster_id,
        distinctive=distinctive,
        cluster_stats=cluster_stats,
        overall_stats=overall_stats,
        percentage=size_pct
    )
    
    from app.api.clustering_viz import life_stage, value_level
    segments = {
        "life_stage": life_stage(cluster_stats, overall_stats),
        "value_level": value_level(distinctive),
        "marketing": marketing_segments
    }
    
    return {
        'session_id': session_id,
        'cluster_id': cluster_id,
        'size': profile['size'],
        'percentage': profile['size_pct'],
        'name': name_full,  # 기존 형식
        'name_main': name_dict['main'],  # 새로운 메인 이름
        'name_sub': name_dict['sub'],  # 새로운 서브 설명
        'tags': tags_flat,  # 기존 형식 (플랫 리스트)
        'tags_hierarchical': hierarchical_tags,  # 새로운 계층적 태그
        'distinctive_features': distinctive_features_enhanced,  # 개선된 형식
        'insights': insights_list,  # 기존 형식
        'insights_by_category': insights_dict,  # 기존 형식
        'insights_storytelling': storytelling_insights,  # 새로운 스토리텔링 형식
        'segments': segments,  # 마케팅 활용 가이드 포함
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
            # 새로운 필드들(name_main, name_sub, tags_hierarchical, insights_storytelling)을 
            # segments JSONB에 포함시켜 저장
            segments_enhanced = profile.get('segments', {}).copy()
            segments_enhanced['name_main'] = profile.get('name_main', profile.get('name', ''))
            segments_enhanced['name_sub'] = profile.get('name_sub', '')
            segments_enhanced['tags_hierarchical'] = profile.get('tags_hierarchical', {})
            segments_enhanced['insights_storytelling'] = profile.get('insights_storytelling', {})
            
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
                    "segments": json.dumps(segments_enhanced, ensure_ascii=False),
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
    
    # 3. 원본 패널 데이터 로드 (merged.panel_data에서)
    logger.info("=" * 80)
    logger.info("원본 패널 데이터 로드 시작")
    logger.info("=" * 80)
    
    mb_sn_list = df['mb_sn'].tolist() if 'mb_sn' in df.columns else []
    if not mb_sn_list:
        logger.error("mb_sn 컬럼이 없습니다.")
        return
    
    logger.info(f"패널 데이터 로드 대상: {len(mb_sn_list)}개")
    
    # merged.panel_data에서 원본 데이터 로드
    df_panel = await load_panel_data_from_db(mb_sn_list)
    
    if df_panel.empty:
        logger.error("원본 패널 데이터를 로드할 수 없습니다.")
        return
    
    # 4. 피처 추출 및 변환
    logger.info("=" * 80)
    logger.info("피처 추출 및 변환 시작")
    logger.info("=" * 80)
    
    df_features = extract_and_transform_features(df_panel)
    
    if df_features.empty:
        logger.error("피처 추출 실패")
        return
    
    # 5. 데이터 병합 (클러스터링 데이터 + 원본 패널 데이터)
    logger.info("=" * 80)
    logger.info("데이터 병합 시작")
    logger.info("=" * 80)
    
    # df_cluster: mb_sn, cluster, umap_x, umap_y
    df_cluster = df[['mb_sn', 'cluster']].copy()
    if 'umap_x' in df.columns:
        df_cluster['umap_x'] = df['umap_x']
    if 'umap_y' in df.columns:
        df_cluster['umap_y'] = df['umap_y']
    
    # LEFT JOIN으로 병합
    df_full = df_cluster.merge(df_features, on='mb_sn', how='left')
    
    logger.info(f"데이터 병합 완료: {len(df_full)}행, {len(df_full.columns)}열")
    logger.info(f"병합 후 컬럼 샘플: {list(df_full.columns)[:15]}")
    
    # cluster 컬럼 확인
    if 'cluster' not in df_full.columns:
        logger.error("병합 후 cluster 컬럼이 없습니다.")
        return
    
    labels = df_full['cluster'].values
    logger.info(f"레이블 추출 완료: {len(labels)}개, 고유 클러스터: {len(set(labels))}개")
    
    # 6. 스케일링된 피처 생성 (전체 데이터 기준)
    logger.info("스케일링된 피처 생성 시작...")
    from sklearn.preprocessing import StandardScaler
    
    # Q6_scaled 생성
    if 'Q6_income' in df_full.columns:
        scaler_q6 = StandardScaler()
        q6_values = df_full['Q6_income'].fillna(df_full['Q6_income'].median()).values.reshape(-1, 1)
        df_full['Q6_scaled'] = scaler_q6.fit_transform(q6_values).flatten()
        logger.info("Q6_scaled 생성 완료")
    
    # Q8_count_scaled 생성
    if 'Q8_count' in df_full.columns:
        scaler_q8 = StandardScaler()
        q8_values = df_full['Q8_count'].fillna(0).values.reshape(-1, 1)
        df_full['Q8_count_scaled'] = scaler_q8.fit_transform(q8_values).flatten()
        logger.info("Q8_count_scaled 생성 완료")
    
    logger.info("=" * 80)
    
    # 5. 프로파일 생성
    logger.info("프로파일 생성 시작...")
    cluster_profiles_raw = analyze_cluster_profiles(df_full, labels)
    
    if not cluster_profiles_raw:
        logger.error("프로파일 생성 실패")
        return
    
    # 6. 전체 통계 계산 (clustering_viz.py 방식)
    logger.info("전체 통계 계산 시작...")
    from app.api.clustering_viz import PROFILE_FEATURES, summarize_feature
    
    # 실제 데이터에 있는 컬럼 확인
    logger.info(f"df_full 컬럼 수: {len(df_full.columns)}개")
    logger.info(f"df_full 컬럼 샘플: {list(df_full.columns)[:20]}")
    
    # PROFILE_FEATURES에 정의된 컬럼 중 실제로 존재하는 것만 사용
    available_features = {}
    for group, cols in PROFILE_FEATURES.items():
        available_cols = [col for col in cols if col in df_full.columns]
        if available_cols:
            available_features[group] = available_cols
            logger.info(f"  {group}: {len(available_cols)}개 컬럼 사용 가능 ({available_cols[:3]}...)")
    
    # 사용 가능한 컬럼이 없으면 실제 데이터의 컬럼을 기반으로 동적 생성
    if not available_features:
        logger.warning("PROFILE_FEATURES에 정의된 컬럼이 없습니다. 실제 데이터 컬럼을 기반으로 생성합니다.")
        # 실제 데이터에서 패턴 매칭으로 피처 찾기
        all_cols = [c for c in df_full.columns if c not in ['mb_sn', 'cluster', 'umap_x', 'umap_y']]
        
        # demographic
        demo_cols = [c for c in all_cols if any(x in c.lower() for x in ['age', 'generation', 'family', 'children', 'region', 'metro'])]
        if demo_cols:
            available_features['demographic'] = demo_cols[:10]
        
        # economic
        econ_cols = [c for c in all_cols if any(x in c.lower() for x in ['income', 'q6', 'employed', 'student'])]
        if econ_cols:
            available_features['economic'] = econ_cols[:10]
        
        # device_premium
        device_cols = [c for c in all_cols if any(x in c.lower() for x in ['q8', 'premium', 'apple', 'samsung', 'phone', 'car'])]
        if device_cols:
            available_features['device_premium'] = device_cols[:10]
        
        # lifestyle
        lifestyle_cols = [c for c in all_cols if any(x in c.lower() for x in ['drink', 'smoke', 'alcohol', 'wine', 'beer'])]
        if lifestyle_cols:
            available_features['lifestyle'] = lifestyle_cols[:10]
        
        logger.info(f"동적으로 생성된 피처 그룹: {list(available_features.keys())}")
    
    overall_stats: Dict[str, dict] = {}
    for group, cols in available_features.items():
        for col in cols:
            if col not in df_full.columns:
                continue
            if col not in overall_stats:
                stat = summarize_feature(df_full, col)
                if stat:  # None이 아닌 경우만 추가
                    overall_stats[col] = stat
    
    logger.info(f"전체 통계 계산 완료: {len(overall_stats)}개 피처")
    if len(overall_stats) == 0:
        logger.error("⚠️ 계산된 통계가 없습니다! df_full에 필요한 컬럼이 없을 수 있습니다.")
        logger.error(f"df_full 컬럼 목록: {list(df_full.columns)}")
    
    # 7. 모든 클러스터의 통계 계산 (상대적 포지셔닝을 위해)
    logger.info("모든 클러스터 통계 계산 시작...")
    all_cluster_stats: Dict[int, Dict[str, dict]] = {}
    
    # 실제 사용 가능한 피처 목록 (overall_stats에 있는 것만)
    available_feature_cols = list(overall_stats.keys())
    logger.info(f"클러스터 통계 계산에 사용할 피처: {len(available_feature_cols)}개")
    
    for cluster_id in df_full['cluster'].unique():
        if cluster_id == -1:  # 노이즈 클러스터 제외
            continue
        cluster_df = df_full[df_full['cluster'] == cluster_id]
        cluster_stats: Dict[str, dict] = {}
        
        # 실제 사용 가능한 컬럼만 계산
        for col in available_feature_cols:
            if col in df_full.columns:
                stat = summarize_feature(cluster_df, col)
                if stat:  # None이 아닌 경우만 추가
                    cluster_stats[col] = stat
        
        all_cluster_stats[cluster_id] = cluster_stats
    
    logger.info(f"모든 클러스터 통계 계산 완료: {len(all_cluster_stats)}개 클러스터")
    
    # 8. DB 형식으로 변환
    logger.info("DB 형식으로 변환 시작...")
    # available_features를 PROFILE_FEATURES 형식으로 변환 (없으면 빈 dict)
    profile_features_to_use = available_features if available_features else PROFILE_FEATURES
    
    profiles_db = []
    for cluster_id, profile in cluster_profiles_raw.items():
        profile_db = convert_profile_to_db_format(
            profile, 
            session_id, 
            df_full, 
            cluster_id, 
            overall_stats, 
            profile_features_to_use,  # 실제 사용 가능한 피처 사용
            all_cluster_stats=all_cluster_stats
        )
        profiles_db.append(profile_db)
    
    logger.info(f"DB 형식 변환 완료: {len(profiles_db)}개 프로파일")
    
    # 생성된 프로파일 출력 (첫 3개만)
    logger.info("=" * 80)
    logger.info("생성된 군집 프로파일 샘플 (첫 3개)")
    logger.info("=" * 80)
    for i, profile in enumerate(profiles_db[:3]):
        logger.info(f"\n[군집 {profile['cluster_id']}]")
        logger.info(f"  이름: {profile.get('name_main', profile.get('name', 'N/A'))}")
        logger.info(f"  서브 설명: {profile.get('name_sub', 'N/A')}")
        logger.info(f"  크기: {profile['size']}명 ({profile['percentage']:.1f}%)")
        logger.info(f"  1차 태그: {[t.get('label', '') for t in profile.get('tags_hierarchical', {}).get('primary', [])]}")
        logger.info(f"  특징 피처 수: {len(profile.get('distinctive_features', []))}개")
        logger.info(f"  스토리텔링 인사이트:")
        storytelling = profile.get('insights_storytelling', {})
        for category, items in storytelling.items():
            if items:
                logger.info(f"    - {category}: {len(items)}개")
                for item in items[:2]:  # 각 카테고리에서 최대 2개만
                    logger.info(f"      • {item.get('message', '')[:80]}...")
        # 마케팅 가치 점수는 제거됨
    
    logger.info("=" * 80)
    
    # 프로파일을 JSON 파일로 저장 (검토용)
    output_file = project_root / 'server' / 'output' / 'cluster_profiles.json'
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(profiles_db, f, ensure_ascii=False, indent=2, default=str)
    logger.info(f"프로파일 JSON 파일 저장 완료: {output_file}")
    
    # 8. DB에 삽입
    logger.info("=" * 80)
    logger.info("DB 적재 시작")
    logger.info("=" * 80)
    
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
    logger.info("✅ 클러스터 프로파일 생성 및 DB 적재 완료!")
    logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())

