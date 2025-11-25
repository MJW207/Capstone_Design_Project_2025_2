"""군집 비교 지표 계산"""
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from scipy import stats
import logging

# ============================================
# 차트별 사용할 Feature 리스트 정의
# ============================================

# 연속형 막대 비교용 변수
CONTINUOUS_FEATURES = [
    "Q6_income",
    "age",
    "Q8_count",
    "Q8_premium_index",
    "drinking_types_count",
    "smoking_types_count",
]

# 히트맵용 이진 변수
BINARY_FEATURES = [
    # 디바이스/프리미엄
    "has_car",
    "is_premium_car",
    "is_domestic_car",
    "is_apple_user",
    "is_samsung_user",
    "is_premium_phone",
    # 상태/지역
    "is_employed",
    "is_unemployed",
    "is_student",
    "is_metro",
    "is_metro_city",
    "is_college_graduate",
    # 음주
    "has_drinking_experience",
    "drinks_beer",
    "drinks_soju",
    "drinks_wine",
    "drinks_western",
    "drinks_makgeolli",
    "drinks_low_alcohol",
    "drinks_cocktail",
    # 흡연
    "has_smoking_experience",
    "smokes_regular",
    "smokes_heet",
    "smokes_liquid",
    "smokes_other",
]

# 스택바(100% 구성비)용 범주형 변수
CATEGORICAL_FEATURES = [
    "age_group",
    "generation",
    "family_type",
    "children_category",
    "Q6_category",
    "region_category",
    "phone_segment",
]

# 피처 이름 한글 매핑
FEATURE_NAME_MAP = {
    # ============================================================
    # 연속형 변수 (Continuous) - 인구통계
    # ============================================================
    'age': '연령',
    'age_scaled': '연령 (정규화)',
    'avg_age': '평균 연령',
    'Q6_income': '소득액 (만원)',
    'Q6_scaled': '소득 (정규화)',
    'avg_income': '평균 소득',
    'education_level': '학력',
    'education_level_scaled': '학력 (정규화)',
    
    # ============================================================
    # 연속형 변수 (Continuous) - 소비 패턴
    # ============================================================
    'Q8_count': '전자제품 수',
    'Q8_count_scaled': '전자제품 수 (정규화)',
    'avg_electronics_count': '평균 전자제품 수',
    'Q8_premium_index': '프리미엄폰 지수',
    'avg_premium_index': '평균 프리미엄폰 지수',
    
    # ============================================================
    # 연속형 변수 (Continuous) - 라이프스타일
    # ============================================================
    'drinking_types_count': '음주 유형 수',
    'smoking_types_count': '흡연 유형 수',
    'avg_children_count': '평균 자녀 수',
    'std_age': '연령 표준편차',
    
    # ============================================================
    # 이진 변수 (Binary) - 인구통계
    # ============================================================
    'is_college_graduate': '대졸 이상',
    'has_children': '자녀 있음',
    'is_employed': '취업 중',
    'is_unemployed': '실업',
    'is_student': '학생',
    
    # ============================================================
    # 이진 변수 (Binary) - 지역
    # ============================================================
    'is_metro': '수도권',
    'is_metro_city': '광역시',
    
    # ============================================================
    # 이진 변수 (Binary) - 차량
    # ============================================================
    'has_car': '차량 보유',
    'is_premium_car': '프리미엄 차량',
    'is_domestic_car': '국산차',
    
    # ============================================================
    # 이진 변수 (Binary) - 브랜드/디바이스
    # ============================================================
    'is_apple_user': '애플 사용자',
    'is_samsung_user': '삼성 사용자',
    'is_premium_phone': '프리미엄폰',
    
    # ============================================================
    # 이진 변수 (Binary) - 음주
    # ============================================================
    'has_drinking_experience': '음주 경험',
    'drinks_beer': '맥주',
    'drinks_soju': '소주',
    'drinks_wine': '와인',
    'drinks_western': '양주',
    'drinks_makgeolli': '막걸리',
    'drinks_low_alcohol': '저도수주',
    'drinks_cocktail': '칵테일',
    
    # ============================================================
    # 이진 변수 (Binary) - 흡연
    # ============================================================
    'has_smoking_experience': '흡연 경험',
    'smokes_regular': '일반 담배',
    'smokes_heet': '히트',
    'smokes_liquid': '액상',
    'smokes_other': '기타 흡연',
    
    # ============================================================
    # 이진 변수 (Binary) - 비율 (HDBSCAN 메타데이터)
    # ============================================================
    'college_graduate_rate': '대졸 이상 비율',
    'has_children_rate': '자녀수 비율',
    'metro_rate': '수도권 거주 비율',
    'premium_car_rate': '프리미엄 차량 보유 비율',
    
    # ============================================================
    # 범주형 변수 (Categorical) - 인구통계
    # ============================================================
    'age_group': '연령대',
    'generation': '세대',
    'family_type': '가족 형태',
    'children_category': '자녀 수',
    'children_category_ordinal': '자녀 수 (순서)',
    
    # ============================================================
    # 범주형 변수 (Categorical) - 소득
    # ============================================================
    'Q6_category': '소득 구간',
    'income_tier_dist': '소득 구간 분포',
    
    # ============================================================
    # 범주형 변수 (Categorical) - 생애주기
    # ============================================================
    'life_stage_dist': '생애주기 분포',
    
    # ============================================================
    # 범주형 변수 (Categorical) - 지역
    # ============================================================
    'region_category': '지역',
    'region_lvl1': '지역 (1단계)',
    
    # ============================================================
    # 범주형 변수 (Categorical) - 기타
    # ============================================================
    'phone_segment': '폰 세그먼트',
    
    # ============================================================
    # 하위 호환성 (기존 변수명)
    # ============================================================
    'Q6': '소득 구간',
    'Q6_numeric': '소득 구간 (숫자)',
    'Q6_log': '소득 (로그)',
    'Q6_label': '소득 라벨',
    'Q7': '학력',
    'Q7_numeric': '학력 (숫자)',
    'Q7_label': '학력 라벨',
    'Q4': '학력 (Q4)',
    'Q4_label': '학력 라벨 (Q4)',
    'Q4_norm': '학력 정규화',
    'Q7_Q6_diff': '학력-소득 차이',
    'Q8_premium_count': '프리미엄 제품 수',
    'Q8_premium_category': '프리미엄 카테고리',
    'Q8_count_category': '전자제품 수 카테고리',
    'age_z': '연령 (Z-score)',
    'Q1': '결혼 상태',
    'Q1_label': '결혼 상태 라벨',
    'Q2': '자녀수',
    'Q10': '차량',
    'Q10_2nd': '차량 (2차)',
    'Q10_label': '차량 라벨',
    'Q11': '출생연도',
}

def get_feature_display_name(feature_name: str) -> str:
    """피처 이름을 한글로 변환"""
    return FEATURE_NAME_MAP.get(feature_name, feature_name)


def compare_groups(
    df: pd.DataFrame,
    labels: np.ndarray,
    a: int,
    b: int,
    bin_cols: Optional[List[str]] = None,
    cat_cols: Optional[List[str]] = None,
    num_cols: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    두 그룹 간 비교 분석
    
    Parameters:
    -----------
    df : pd.DataFrame
        데이터프레임
    labels : np.ndarray
        클러스터 레이블
    a : int
        첫 번째 그룹 ID
    b : int
        두 번째 그룹 ID
    bin_cols : List[str], optional
        이진 변수 컬럼 목록
    cat_cols : List[str], optional
        범주형 변수 컬럼 목록
    num_cols : List[str], optional
        연속형 변수 컬럼 목록
    
    Returns:
    --------
    dict
        비교 분석 결과
    """
    logger = logging.getLogger(__name__)
    
    logger.info(f"[compare_groups 시작] a: {a}, b: {b}, df shape: {df.shape}, labels shape: {labels.shape}")
    logger.info(f"[compare_groups] 피처 타입] bin_cols: {len(bin_cols or [])}, cat_cols: {len(cat_cols or [])}, num_cols: {len(num_cols or [])}")
    
    bin_cols = bin_cols or []
    cat_cols = cat_cols or []
    num_cols = num_cols or []
    
    # 그룹 데이터 추출
    group_a_mask = labels == a
    group_b_mask = labels == b
    
    logger.info(f"[compare_groups] 그룹 마스크 결과] group_a: {group_a_mask.sum()}, group_b: {group_b_mask.sum()}")
    
    group_a_data = df[group_a_mask]
    group_b_data = df[group_b_mask]
    
    n_a = len(group_a_data)
    n_b = len(group_b_data)
    
    logger.info(f"[compare_groups] 그룹 데이터 크기] n_a: {n_a}, n_b: {n_b}")
    
    if n_a == 0 or n_b == 0:
        logger.warning(f"[compare_groups 경고] 그룹 데이터 없음] n_a: {n_a}, n_b: {n_b}")
        return {
            "group_a": {"id": a, "count": n_a},
            "group_b": {"id": b, "count": n_b},
            "comparison": [],
            "error": "그룹 데이터가 없습니다."
        }
    
    comparison = []
    
    # 연속형 변수 비교
    if not num_cols:
        # 자동으로 숫자형 컬럼 찾기
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        num_cols = [col for col in numeric_cols if col not in ['cluster']]
        logger.info(f"[compare_groups] 자동 감지된 연속형 변수: {len(num_cols)}개")
    
    # 정규화된 변수(_scaled) 제외, 원본 변수만 사용
    num_cols_filtered = []
    for col in num_cols:
        # 정규화된 변수는 제외
        if col.endswith('_scaled') or col.endswith('_z'):
            continue
        # CONTINUOUS_FEATURES에 포함된 원본 변수만 사용
        if col in CONTINUOUS_FEATURES:
            num_cols_filtered.append(col)
        # Q8_premium_index는 항상 허용 (정규화되지 않은 값)
        elif col == 'Q8_premium_index':
            num_cols_filtered.append(col)
        # 추가 원본 변수들 (자녀수, 전자제품 수 등)
        elif col in ['Q8_count', 'Q6_income', 'Q6', 'age', 'children_count']:
            num_cols_filtered.append(col)
    
    if num_cols_filtered:
        logger.info(f"[compare_groups] 필터링된 연속형 변수 (원본만): {len(num_cols_filtered)}개 (전체: {len(num_cols)}개)")
        num_cols = num_cols_filtered
    else:
        logger.warning(f"[compare_groups] 원본 연속형 변수를 찾을 수 없습니다. 전체 연속형 변수를 사용합니다.")
    
    for col in num_cols:
        if col not in df.columns:
            continue
        
        a_values = group_a_data[col].dropna()
        b_values = group_b_data[col].dropna()
        
        if len(a_values) == 0 or len(b_values) == 0:
            continue
        
        a_mean = float(a_values.mean())
        b_mean = float(b_values.mean())
        diff = a_mean - b_mean
        
        # 원본 값은 이미 col에 있음 (정규화된 변수는 제외했으므로)
        # 모든 변수가 원본 변수이므로 그대로 사용
        original_col = col
        original_a_mean = a_mean
        original_b_mean = b_mean
        original_diff = diff
        
        # 정규화된 값의 차이를 더 명확하게 보정
        # 표준편차를 사용하여 효과 크기(Cohen's d) 계산
        try:
            std_a = float(a_values.std(ddof=1) or 0.0)
            std_b = float(b_values.std(ddof=1) or 0.0)
            pooled_std = np.sqrt(((len(a_values) - 1) * std_a**2 + (len(b_values) - 1) * std_b**2) / (len(a_values) + len(b_values) - 2)) if (len(a_values) + len(b_values) - 2) > 0 else 0.0
            if pooled_std > 0:
                cohens_d = diff / pooled_std  # 효과 크기
            else:
                cohens_d = 0.0
        except:
            cohens_d = 0.0
        
        # warning_flags 계산
        warning_flags = []
        if n_a < 100 or n_b < 100:
            warning_flags.append("low_sample")
        
        # lift 계산 (원본 값이 있으면 원본 기준으로, 없으면 정규화된 값 기준)
        if original_a_mean is not None and original_b_mean is not None and abs(original_b_mean) > 0.01:
            # 원본 값 기준 lift 계산
            lift = ((original_a_mean - original_b_mean) / abs(original_b_mean)) * 100
        elif abs(b_mean) < 0.01:
            lift = diff * 1000  # 작은 값일 때 1000배 스케일
        else:
            lift = (diff / abs(b_mean)) * 100  # 상대적 차이를 퍼센트로
        
        # nan 값 처리
        if pd.isna(a_mean):
            a_mean = 0.0
        if pd.isna(b_mean):
            b_mean = 0.0
        if pd.isna(diff):
            diff = 0.0
        if pd.isna(lift):
            lift = 0.0
        if pd.isna(cohens_d):
            cohens_d = 0.0
        
        # t-검정
        try:
            t_stat, p_value = stats.ttest_ind(a_values, b_values)
            if pd.isna(t_stat):
                t_stat = 0.0
            if pd.isna(p_value):
                p_value = 1.0
        except:
            t_stat, p_value = 0.0, 1.0
        
        # feature 이름은 원본 변수명 그대로 사용 (이미 정규화된 변수는 제외했으므로)
        comparison.append({
            "feature": col,  # 원본 변수명 그대로 사용
            "feature_name_kr": get_feature_display_name(col),  # 한글 이름 추가
            "type": "continuous",
            "group_a_mean": float(a_mean),
            "group_b_mean": float(b_mean),
            "difference": float(diff),
            "lift_pct": float(lift),
            "cohens_d": float(cohens_d),  # 효과 크기 추가
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "significant": bool(p_value < 0.05),
            # 원본 값 추가 (있는 경우)
            "original_group_a_mean": original_a_mean,
            "original_group_b_mean": original_b_mean,
            "original_difference": original_diff,
            "original_col": original_col if original_col else None,
            "warning_flags": warning_flags  # 경고 플래그
        })
    
    # 전체 데이터에서 baseline 계산 (이진 변수용)
    global_baseline = {}
    for col in bin_cols:
        if col in df.columns:
            try:
                global_baseline[col] = float(df[col].mean())
            except:
                global_baseline[col] = 0.0
    
    # BINARY_FEATURES에 포함된 변수만 사용
    bin_cols_filtered = [col for col in bin_cols if col in BINARY_FEATURES]
    if bin_cols_filtered:
        logger.info(f"[compare_groups] 필터링된 이진 변수: {len(bin_cols_filtered)}개 (전체: {len(bin_cols)}개)")
        bin_cols = bin_cols_filtered
    else:
        logger.warning(f"[compare_groups] BINARY_FEATURES에 매칭되는 변수가 없습니다. 전체 이진 변수를 사용합니다.")
    
    # 이진 변수 비교
    for col in bin_cols:
        if col not in df.columns:
            continue
        
        try:
            # 데이터 타입 확인 및 변환
            col_data_a = group_a_data[col]
            col_data_b = group_b_data[col]
            
            # 문자열인 경우 숫자로 변환 시도
            if col_data_a.dtype == 'object' or col_data_b.dtype == 'object':
                logger.warning(f"[compare_groups] 이진 변수 '{col}'이 문자열 타입입니다. 0/1로 변환 시도")
                # NaN이 아닌 값만 변환
                col_data_a = pd.to_numeric(col_data_a, errors='coerce')
                col_data_b = pd.to_numeric(col_data_b, errors='coerce')
            
            a_ratio = float(col_data_a.mean())
            b_ratio = float(col_data_b.mean())
            diff = a_ratio - b_ratio
            
            # 절대 퍼센트포인트 차이 (0~100 기준)
            abs_diff_pct = abs(diff) * 100.0
            
            # lift 계산
            lift = (diff / b_ratio * 100) if b_ratio != 0 else 0.0
            
            # baseline 기반 index 계산
            baseline = global_baseline.get(col, b_ratio if b_ratio > 0 else 0.01)
            if baseline > 0:
                index_a = (a_ratio / baseline) * 100.0
                index_b = (b_ratio / baseline) * 100.0
            else:
                index_a = 0.0
                index_b = 0.0
            
            # nan 값 처리
            if pd.isna(a_ratio):
                a_ratio = 0.0
            if pd.isna(b_ratio):
                b_ratio = 0.0
            if pd.isna(diff):
                diff = 0.0
            if pd.isna(lift):
                lift = 0.0
            if pd.isna(abs_diff_pct):
                abs_diff_pct = 0.0
            if pd.isna(index_a):
                index_a = 0.0
            if pd.isna(index_b):
                index_b = 0.0
            
            # warning_flags 계산
            warning_flags = []
            if n_a < 100 or n_b < 100:
                warning_flags.append("low_sample")
            if min(a_ratio, b_ratio) < 0.01:
                warning_flags.append("rare_event")
            
            # 카이제곱 검정
            try:
                contingency = pd.crosstab(
                    pd.concat([col_data_a, col_data_b]),
                    pd.concat([
                        pd.Series([0] * n_a),
                        pd.Series([1] * n_b)
                    ])
                )
                chi2, p_value = stats.chi2_contingency(contingency)[:2]
                if pd.isna(chi2):
                    chi2 = 0.0
                if pd.isna(p_value):
                    p_value = 1.0
            except:
                chi2, p_value = 0.0, 1.0
            
            comparison.append({
                "feature": col,
                "feature_name_kr": get_feature_display_name(col),  # 한글 이름 추가
                "type": "binary",
                "group_a_ratio": float(a_ratio),
                "group_b_ratio": float(b_ratio),
                "difference": float(diff),
                "lift_pct": float(lift),
                "abs_diff_pct": float(abs_diff_pct),  # 절대 퍼센트포인트 차이
                "index_a": float(index_a),  # 클러스터 A의 index
                "index_b": float(index_b),  # 클러스터 B의 index
                "chi2_statistic": float(chi2),
                "p_value": float(p_value),
                "significant": bool(p_value < 0.05),
                "warning_flags": warning_flags  # 경고 플래그
            })
        except Exception as e:
            logger.warning(f"[compare_groups] 이진 변수 '{col}' 비교 실패: {str(e)}")
            continue
    
    # CATEGORICAL_FEATURES에 포함된 변수만 사용
    cat_cols_filtered = [col for col in cat_cols if col in CATEGORICAL_FEATURES]
    if cat_cols_filtered:
        logger.info(f"[compare_groups] 필터링된 범주형 변수: {len(cat_cols_filtered)}개 (전체: {len(cat_cols)}개)")
        cat_cols = cat_cols_filtered
    else:
        logger.warning(f"[compare_groups] CATEGORICAL_FEATURES에 매칭되는 변수가 없습니다. 전체 범주형 변수를 사용합니다.")
    
    # 범주형 변수 비교
    for col in cat_cols:
        if col not in df.columns:
            continue
        
        a_dist = group_a_data[col].value_counts(normalize=True).to_dict()
        b_dist = group_b_data[col].value_counts(normalize=True).to_dict()
        
        # feature 이름은 그대로 사용 (범주형은 원본 변수명)
        comparison.append({
            "feature": col,
            "feature_name_kr": get_feature_display_name(col),  # 한글 이름 추가
            "type": "categorical",
            "group_a_distribution": a_dist,
            "group_b_distribution": b_dist
        })
    
    logger.info(f"[compare_groups 완료] 비교 항목 수: {len(comparison)}")
    
    # 중복 변수 필터링 (주요 피쳐 우선)
    # Q6_scaled가 있으면 Q6, Q6_numeric, Q6_log 제외
    # education_level_scaled가 있으면 Q7, Q7_numeric 제외
    # age_scaled가 있으면 age_z 제외
    filtered_comparison = []
    seen_base_features = set()
    
    # 우선순위: 원본 값이 있는 변수 > 정규화된 변수 > 기타 변수
    priority_features = {
        'Q6_income': 1,  # 최우선
        'Q6_scaled': 2,
        'Q6': 3,
        'Q6_numeric': 4,
        'Q6_log': 5,
        'education_level_scaled': 1,
        'Q7': 2,
        'Q7_numeric': 3,
        'Q4': 2,
        'age_scaled': 1,
        'age': 2,
        'age_z': 3,
        'Q8_count_scaled': 1,
        'Q8_count': 2,
        'drinking_types_count': 1,
    }
    
    for comp in comparison:
        feature = comp.get('feature', '')
        
        # 기본 피쳐 이름 추출 (Q6_scaled -> Q6, Q6_income -> Q6)
        base_feature = feature
        if feature.endswith('_scaled'):
            base_feature = feature.replace('_scaled', '')
        elif feature.endswith('_numeric'):
            base_feature = feature.replace('_numeric', '')
        elif feature.endswith('_log'):
            base_feature = feature.replace('_log', '')
        elif feature.endswith('_z'):
            base_feature = feature.replace('_z', '')
        elif feature.endswith('_income'):
            base_feature = feature.replace('_income', '')
        
        # Q6 관련: Q6_income이 있으면 다른 Q6 변수들 제외 (소득액 우선)
        if base_feature == 'Q6':
            # 이미 Q6_income이 추가되었으면 다른 Q6 변수 모두 제외
            if 'Q6_income' in seen_base_features:
                continue
            # Q6_income이 필터링된 목록에 있으면 제외
            if any(c.get('feature') == 'Q6_income' for c in filtered_comparison):
                continue
            # Q6_income이면 추가
            if feature == 'Q6_income':
                seen_base_features.add('Q6_income')
                filtered_comparison.append(comp)
                continue
            # Q6_scaled는 Q6_income이 없을 때만 추가
            if feature == 'Q6_scaled':
                if not any(c.get('feature') == 'Q6_income' for c in filtered_comparison):
                    seen_base_features.add('Q6_scaled')
                    filtered_comparison.append(comp)
                continue
            # 나머지 Q6 변수는 모두 제외
            continue
        
        # Q7/Q4 관련: education_level_scaled가 있으면 Q7, Q7_numeric 제외
        if base_feature in ['Q7', 'Q4']:
            if 'education_level_scaled' in seen_base_features:
                continue
            if feature == 'education_level_scaled':
                seen_base_features.add('education_level_scaled')
            elif feature.startswith('Q7') or feature.startswith('Q4'):
                if 'education_level_scaled' in [c.get('feature') for c in filtered_comparison]:
                    continue
        
        # age 관련: age_scaled가 있으면 age_z 제외
        if base_feature == 'age':
            if feature == 'age_scaled':
                seen_base_features.add('age_scaled')
            elif feature == 'age_z' and 'age_scaled' in [c.get('feature') for c in filtered_comparison]:
                continue
        
        # Q8_count 관련: Q8_count_scaled가 있으면 Q8_count 제외 (하지만 둘 다 표시 가능)
        
        filtered_comparison.append(comp)
        seen_base_features.add(feature)
    
    logger.info(f"[compare_groups 필터링] 원본: {len(comparison)}개 -> 필터링 후: {len(filtered_comparison)}개")
    
    # nan 값이 포함된 경우 0으로 대체하는 헬퍼 함수
    def safe_float(value):
        if pd.isna(value) or value is None:
            return 0.0
        try:
            result = float(value)
            if pd.isna(result):
                return 0.0
            return result
        except (ValueError, TypeError):
            return 0.0
    
    # 하이라이트 임계값 정의
    NUM_EFFECT_THRESHOLD = 0.3  # Cohen's d >= 0.3
    BIN_ABS_DIFF_PCT_THRESHOLD = 3.0  # 절대 퍼센트포인트 >= 3.0
    BIN_LIFT_PCT_THRESHOLD = 20.0  # lift_pct >= 20.0
    
    # 하이라이트 (상위 차이) - 필터링된 비교 결과 사용
    num_comparisons = [c for c in filtered_comparison if c['type'] == 'continuous']
    
    # 연속형: cohens_d >= 0.3 이상인 항목만 후보에 포함
    num_candidates = [
        item for item in num_comparisons
        if abs(item.get('cohens_d', 0.0) or 0.0) >= NUM_EFFECT_THRESHOLD
    ]
    num_comparisons_sorted = sorted(
        num_candidates,
        key=lambda x: abs(x.get('cohens_d', 0) or 0),
        reverse=True
    )
    
    bin_comparisons = [c for c in filtered_comparison if c['type'] == 'binary']
    
    # 이진형: abs_diff_pct >= 3.0 또는 abs(lift_pct) >= 20.0 이상인 것만 후보에 포함
    bin_candidates = [
        item for item in bin_comparisons
        if (abs(item.get('abs_diff_pct', 0.0) or 0.0) >= BIN_ABS_DIFF_PCT_THRESHOLD
            or abs(item.get('lift_pct', 0.0) or 0.0) >= BIN_LIFT_PCT_THRESHOLD)
    ]
    bin_comparisons_sorted = sorted(
        bin_candidates,
        key=lambda x: abs(x.get('abs_diff_pct', 0) or 0),
        reverse=True
    )
    
    # percentage 계산 시 nan 처리
    total_count = len(df)
    group_a_pct = safe_float(n_a / total_count * 100) if total_count > 0 else 0.0
    group_b_pct = safe_float(n_b / total_count * 100) if total_count > 0 else 0.0
    
    return {
        "group_a": {
            "id": int(a),
            "count": int(n_a),
            "percentage": group_a_pct
        },
        "group_b": {
            "id": int(b),
            "count": int(n_b),
            "percentage": group_b_pct
        },
        "comparison": filtered_comparison,  # 필터링된 비교 결과 사용
        "highlights": {
            "bin_cat_top": [
                {
                    "feature": c["feature"],
                    "feature_name_kr": c.get("feature_name_kr"),
                    "difference": safe_float(c.get("difference", 0)),
                    "lift_pct": safe_float(c.get("lift_pct", 0)),
                    "abs_diff_pct": safe_float(c.get("abs_diff_pct", 0)),
                    "index_a": safe_float(c.get("index_a", 0)),
                    "index_b": safe_float(c.get("index_b", 0)),
                    "significant": bool(c.get("significant", False))
                }
                for c in bin_comparisons_sorted[:5]
            ],
            "num_top": [
                {
                    "feature": c["feature"],
                    "feature_name_kr": c.get("feature_name_kr"),
                    "difference": safe_float(c.get("difference", 0)),
                    "lift_pct": safe_float(c.get("lift_pct", 0)),
                    "cohens_d": safe_float(c.get("cohens_d", 0)),
                    "p_value": safe_float(c.get("p_value", 1.0)),
                    "significant": bool(c.get("significant", False)),
                    "original_group_a_mean": c.get("original_group_a_mean"),
                    "original_group_b_mean": c.get("original_group_b_mean"),
                    "original_difference": c.get("original_difference")
                }
                for c in num_comparisons_sorted[:5]
            ]
        },
        "rankings": {
            "continuous": [
                {
                    "feature": c["feature"],
                    "difference": safe_float(c.get("difference", 0)),
                    "p_value": safe_float(c.get("p_value", 1))
                }
                for c in num_comparisons_sorted
            ],
            "categorical": [
                {
                    "feature": c["feature"],
                    "group_a_dist": {str(k): safe_float(v) for k, v in c.get("group_a_distribution", {}).items()},
                    "group_b_dist": {str(k): safe_float(v) for k, v in c.get("group_b_distribution", {}).items()}
                }
                for c in comparison if c['type'] == 'categorical'
            ]
        }
    }
