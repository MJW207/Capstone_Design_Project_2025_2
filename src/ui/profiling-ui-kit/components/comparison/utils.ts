/**
 * 변수명 → 한글명 매핑 및 유틸리티 함수
 * 모든 차트에서 공통으로 사용
 */

import { FEATURE_NAME_KR as FEATURE_NAME_KR_BASE } from './featureSets';

/**
 * 클러스터 색상 팔레트 (군집 선택 시 사용하는 색상과 일치)
 */
export const CLUSTER_COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6'];

/**
 * 클러스터 ID로 색상 가져오기
 */
export function getClusterColor(clusterId: number): string {
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

/**
 * 변수명 → 한글명 매핑
 * 모든 차트에서 공통으로 사용
 */
export const FEATURE_NAME_KR: Record<string, string> = {
  // ============================================================
  // 연속형 변수 (Continuous)
  // ============================================================
  
  // HDBSCAN 메타데이터 변수
  'avg_income': '평균 소득',
  'avg_age': '평균 연령',
  'avg_electronics_count': '평균 전자제품 수',
  'avg_premium_index': '평균 프리미엄 지수',
  'avg_children_count': '평균 자녀 수',
  'std_age': '연령 표준편차',
  
  // 기존 변수 (하위 호환)
  'Q6_income': '소득',
  'Q6_scaled': '소득 (정규화)',
  'age': '연령',
  'age_scaled': '연령 (정규화)',
  'Q8_count': '전자제품 수',
  'Q8_count_scaled': '전자제품 수 (정규화)',
  'Q8_premium_index': '프리미엄 지수',
  'education_level_scaled': '학력 (정규화)',
  'drinking_types_count': '음주 유형 수',
  'smoking_types_count': '흡연 유형 수',
  
  // ============================================================
  // 이진 변수 (Binary) - 비율
  // ============================================================
  
  // HDBSCAN 메타데이터 변수 (비율)
  'college_graduate_rate': '대졸 이상 비율',
  'has_children_rate': '자녀 있음 비율',
  'metro_rate': '수도권 거주 비율',
  'premium_car_rate': '프리미엄 차량 보유 비율',
  
  // ============================================================
  // 이진 변수 (Binary) - 기존
  // ============================================================
  
  // 차량
  'has_car': '차량 보유',
  'is_premium_car': '프리미엄 차량',
  'is_domestic_car': '국산차',
  
  // 브랜드
  'is_apple_user': '애플 사용자',
  'is_samsung_user': '삼성 사용자',
  'is_premium_phone': '프리미엄 폰',
  
  // 직업/교육
  'is_employed': '취업 중',
  'is_unemployed': '실업',
  'is_student': '학생',
  'is_college_graduate': '대졸 이상',
  
  // 지역
  'is_metro': '수도권',
  'is_metro_city': '광역시',
  
  // 음주
  'has_drinking_experience': '음주 경험',
  'drinks_beer': '맥주',
  'drinks_soju': '소주',
  'drinks_wine': '와인',
  'drinks_western': '양주',
  'drinks_makgeolli': '막걸리',
  'drinks_low_alcohol': '저도수주',
  'drinks_cocktail': '칵테일',
  
  // 흡연
  'has_smoking_experience': '흡연 경험',
  'smokes_regular': '일반 담배',
  'smokes_heet': '히트 (궐련형 전자담배)',
  'smokes_liquid': '액상',
  'smokes_other': '기타 흡연',
  
  // ============================================================
  // 범주형 변수 (Categorical)
  // ============================================================
  
  // HDBSCAN 메타데이터 변수 (분포)
  'income_tier_dist': '소득 구간 분포',
  'life_stage_dist': '생애주기 분포',
  
  // 기존 변수
  'age_group': '연령대',
  'generation': '세대',
  'family_type': '가족 형태',
  'children_category': '자녀 수',
  'Q6_category': '소득 구간',
  'region_category': '지역',
  'phone_segment': '폰 세그먼트',
  
  // 기존 매핑 유지 (하위 호환)
  ...FEATURE_NAME_KR_BASE,
};

/**
 * 범주형 값 → 한글명 매핑
 */
export const CATEGORY_VALUE_KR: Record<string, Record<string, string>> = {
  // 생애주기 (life_stage)
  life_stage: {
    '1': '젊은 싱글',
    '2': 'DINK',
    '3': '젊은 부모',
    '4': '중년 부모',
    '5': '중년',
    '6': '시니어'
  },
  
  // 소득 구간 (income_tier)
  income_tier: {
    'high': '고소득',
    'mid': '중소득',
    'low': '저소득'
  },
  
  // 가족 형태 (family_type)
  family_type: {
    '미혼': '미혼',
    '기혼_자녀없음': '기혼 무자녀',
    '기혼_자녀있음': '기혼 자녀 있음',
    '한부모': '한부모',
    '기타': '기타'
  },
  
  // 세대 (generation)
  generation: {
    'Gen Z': 'Z세대',
    'Millennial': '밀레니얼',
    'Gen X': 'X세대',
    'Baby Boomer': '베이비부머',
    'Silent': '전후세대',
    'Z세대': 'Z세대',
    '밀레니얼': '밀레니얼',
    'X세대': 'X세대',
    '베이비부머': '베이비부머',
    '시니어': '시니어',
  },
  
  // 연령대 (age_group)
  age_group: {
    '10s': '10대',
    '20s': '20대',
    '30s': '30대',
    '40s': '40대',
    '50s': '50대',
    '60s+': '60대 이상',
    '20대': '20대',
    '30대': '30대',
    '40대': '40대',
    '50대': '50대',
    '60대': '60대',
    '70대': '70대',
    '80세 이상': '80세 이상',
  },
  
  // 자녀 수 (children_category)
  children_category: {
    '0': '없음',
    '1': '1명',
    '2': '2명',
    '3+': '3명 이상'
  },
  
  // 지역 (region_category)
  region_category: {
    '수도권': '수도권',
    '영남권': '영남권',
    '호남권': '호남권',
    '충청권': '충청권',
    '강원권': '강원권',
    '제주권': '제주권'
  },
  
  // 폰 세그먼트 (phone_segment)
  phone_segment: {
    'premium': '프리미엄',
    'mid': '중가',
    'budget': '보급형'
  }
};

/**
 * 변수 설명 (툴팁용)
 */
export const FEATURE_DESCRIPTION: Record<string, string> = {
  'avg_income': '클러스터 내 패널들의 평균 월소득 (만원)',
  'avg_age': '클러스터 내 패널들의 평균 연령 (세)',
  'avg_premium_index': '전체 전자제품 중 프리미엄 제품 비율 (0~1)',
  'has_children_rate': '자녀가 있는 패널의 비율 (%)',
  'avg_electronics_count': '패널당 평균 전자제품 보유 개수',
  'premium_car_rate': '프리미엄 차량을 보유한 패널의 비율 (%)',
  'college_graduate_rate': '4년제 대학 졸업 이상 학력 보유 비율 (%)',
  
  'is_apple_user': '아이폰, 맥북 등 애플 제품 사용 여부',
  'is_samsung_user': '갤럭시, 삼성 가전 등 삼성 제품 사용 여부',
  'is_premium_phone': '고가 스마트폰 보유 여부',
  
  'drinks_wine': '와인 음주 경험 여부',
  'drinks_western': '위스키, 브랜디 등 양주 음주 경험 여부',
  'drinks_beer': '맥주 음주 경험 여부',
  'drinks_soju': '소주 음주 경험 여부',
  
  'is_metro': '서울, 경기, 인천 수도권 거주 여부',
  'is_employed': '현재 직장에 고용되어 있는 상태',
  'has_car': '승용차, SUV 등 차량 보유 여부',
  'is_premium_car': '수입차 또는 프리미엄 브랜드 차량 보유 여부',
  
  'life_stage_dist': '생애주기 단계별 패널 분포 (젊은 싱글, DINK, 부모 등)',
  'income_tier_dist': '소득 구간별 패널 분포 (고/중/저소득)',
  'family_type': '가족 구성 형태별 분포 (미혼, 기혼 등)',
  'generation': '세대별 분포 (Z세대, 밀레니얼, X세대 등)'
};

/**
 * 단위 매핑
 */
export const FEATURE_UNIT: Record<string, string> = {
  'avg_income': '만원',
  'Q6_income': '만원',
  'avg_age': '세',
  'age': '세',
  'avg_electronics_count': '개',
  'Q8_count': '개',
  'avg_children_count': '명',
  'drinking_types_count': '개',
  'smoking_types_count': '개',
  
  // 비율 변수
  'avg_premium_index': '',
  'Q8_premium_index': '',
  'college_graduate_rate': '%',
  'has_children_rate': '%',
  'metro_rate': '%',
  'premium_car_rate': '%',
  
  // 이진 변수는 단위 없음 (차트에서 %로 표시)
  'is_apple_user': '',
  'is_samsung_user': '',
  'is_premium_phone': '',
  'has_car': '',
  'is_premium_car': '',
  'is_domestic_car': '',
  'is_employed': '',
  'is_unemployed': '',
  'is_student': '',
  'is_college_graduate': '',
  'is_metro': '',
  'is_metro_city': '',
  'has_drinking_experience': '',
  'drinks_beer': '',
  'drinks_soju': '',
  'drinks_wine': '',
  'drinks_western': '',
  'drinks_makgeolli': '',
  'drinks_low_alcohol': '',
  'drinks_cocktail': '',
  'has_smoking_experience': '',
  'smokes_regular': '',
  'smokes_heet': '',
  'smokes_liquid': '',
  'smokes_other': '',
};

/**
 * 변수 포맷팅 함수
 */
export function formatFeatureValue(
  featureName: string, 
  value: number
): string {
  const unit = FEATURE_UNIT[featureName] || '';
  
  // 비율 변수 (0~1 범위)
  if (featureName.includes('rate') || featureName.includes('index')) {
    return `${(value * 100).toFixed(1)}%`;
  }
  
  // 소득
  if (featureName.includes('income')) {
    return `${value.toFixed(0)}${unit}`;
  }
  
  // 나이
  if (featureName.includes('age')) {
    return `${value.toFixed(1)}${unit}`;
  }
  
  // 개수
  if (featureName.includes('count')) {
    return `${value.toFixed(1)}${unit}`;
  }
  
  // 기본
  return `${value.toFixed(2)}${unit}`;
}

/**
 * 한글명 가져오기 (fallback 포함)
 */
export function getFeatureNameKR(featureName: string): string {
  return FEATURE_NAME_KR[featureName] || featureName;
}

/**
 * 범주 값 한글명 가져오기
 */
export function getCategoryValueKR(
  categoryName: string, 
  value: string
): string {
  return CATEGORY_VALUE_KR[categoryName]?.[value] || value;
}

export const featureNameMap: Record<string, string> = {
  // === HDBSCAN 메타데이터 변수 (우선 적용) ===
  ...FEATURE_NAME_KR,
  // === 핵심 피쳐 ===
  'age_scaled': '연령',
  'Q6_scaled': '소득',
  'education_level_scaled': '학력',
  'Q8_count_scaled': '전자제품 수',
  'Q8_premium_index': '프리미엄 지수',
  'is_premium_car': '프리미엄차 보유',
  'age_z': '연령 (Z-score)',
  
  // === Q6 (소득 관련) ===
  'Q6': '소득 구간',
  'Q6_numeric': '소득 구간 (숫자)',
  'Q6_log': '소득 (로그)',
  'Q6_income': '소득액 (만원)',
  'Q6_label': '소득 라벨',
  'Q6_category': '소득 카테고리',
  
  // === Q7 (학력 관련) ===
  'Q7': '학력',
  'Q7_numeric': '학력 (숫자)',
  'Q7_label': '학력 라벨',
  'Q4': '학력 (Q4)',
  'Q4_label': '학력 라벨 (Q4)',
  'Q4_norm': '학력 정규화',
  
  // === Q7_Q6_diff (학력-소득 차이) ===
  'Q7_Q6_diff': '학력-소득 차이',
  
  // === 차량 관련 ===
  'has_car': '차량 보유',
  'is_domestic_car': '국산차 보유',
  
  // === 프리미엄 관련 ===
  'Q8_premium_count': '프리미엄 제품 수',
  'Q8_premium_category': '프리미엄 카테고리',
  
  // === 전자제품 관련 (Q8) ===
  'Q8_count_category': '전자제품 수 카테고리',
  'Q8_1': 'Q8-1',
  'Q8-1': 'Q8-1',  // 하이픈 형식 지원
  'Q8_2': 'Q8-2',
  'Q8-2': 'Q8-2',  // 하이픈 형식 지원
  'Q8_4': 'Q8-4',
  'Q8-4': 'Q8-4',  // 하이픈 형식 지원
  'Q8_5': 'Q8-5',
  'Q8-5': 'Q8-5',  // 하이픈 형식 지원
  'Q8_8': 'Q8-8',
  'Q8_9': 'Q8-9',
  'Q8_18': 'Q8-18',
  'Q8_20': 'Q8-20',
  'Q8_22': 'Q8-22',
  'Q8_25': 'Q8-25',
  
  // === 폰 관련 ===
  'is_apple_user': '애플 사용자',
  'is_samsung_user': '삼성 사용자',
  'phone_segment': '폰 세그먼트',
  
  // === 음주/흡연 관련 ===
  'drinking_types_count': '음주 유형 수',
  'has_drinking_experience': '음주 경험',
  'has_smoking_experience': '흡연 경험',
  'smoking_types_count': '흡연 유형 수',
  'smoking_drinking_combo': '흡연/음주 조합',
  'smoking_drinking_label': '흡연/음주 라벨',
  'drinks_beer': '맥주',
  'drinks_soju': '소주',
  'drinks_wine': '와인',
  'drinks_western': '양주',
  'drinks_makgeolli': '막걸리',
  'drinks_low_alcohol': '저도수',
  'drinks_cocktail': '칵테일',
  'drinks_sake': '사케',
  'smokes_regular': '일반 담배',
  'smokes_heet': '히트 (궐련형 전자담배)',
  'smokes_liquid': '액상',
  'smokes_other': '기타 흡연',
  'uses_heet_device': '히트 기기 사용',
  'uses_iqos': 'IQOS 사용',
  'uses_lil': '릴 사용',
  'uses_glo': '글로 사용',
  
  // === 기본 이진 변수 ===
  'has_children': '자녀 있음',
  'is_college_graduate': '대졸',
  'is_employed': '취업',
  'is_unemployed': '실업',
  'is_student': '학생',
  'is_metro': '수도권',
  'is_metro_city': '광역시',
  
  // === 가족 관련 ===
  'children_category': '자녀 카테고리',
  'children_category_ordinal': '자녀 카테고리 (순서)',
  'family_type': '가족 유형',
  
  // === Q1 (결혼 상태) ===
  'Q1': '결혼 상태',
  'Q1_label': '결혼 상태 라벨',
  'Q1_미혼': '미혼',
  'Q1_기혼': '기혼',
  'Q1_기타': '기타',
  
  // === 가족 유형 ===
  'family_type_미혼': '미혼',
  'family_type_기혼_자녀있음': '기혼 (자녀 있음)',
  'family_type_기혼_자녀없음': '기혼 (자녀 없음)',
  
  // === Q2 (자녀수 관련) ===
  'Q2': '자녀수',
  'Q2_missing_flag': '자녀수 결측 여부',
  
  // === Q5 관련 ===
  'Q5': 'Q5',
  'Q5_original': 'Q5 원본',
  'Q5_1': 'Q5-1',
  'Q5_1_original': 'Q5-1 원본',
  'Q5_4': 'Q5-4',
  'Q5_7': 'Q5-7',
  'Q5_8': 'Q5-8',
  'Q5_12': 'Q5-12',
  'Q5_13': 'Q5-13',
  'Q5_14': 'Q5-14',
  'Q5_15': 'Q5-15',
  'Q5_16': 'Q5-16',
  
  // === Q10 (차량 관련) ===
  'Q10': '차량',
  'Q10_2nd': '차량 (2차)',
  'Q10_label': '차량 라벨',
  
  // === Q11, Q12 등 기타 변수 ===
  'Q11': '출생연도',
  'Q12': 'Q12',
  'Q12_1': 'Q12-1',
  'Q12-1': 'Q12-1',  // 하이픈 형식 지원
  'Q12_1_count': '흡연 유형 수',
  'Q12-1 개수': '흡연 유형 수',  // 하이픈 + 한글 형식 지원
  'Q12_2': 'Q12-2',
  'Q12_2_count': 'Q12-2 개수',
  'Q13': 'Q13',
  'Q14': 'Q14',
  'Q15': 'Q15',
  'Q16': 'Q16',
  'Q17': 'Q17',
  'Q18': 'Q18',
  'Q19': 'Q19',
  'Q20': 'Q20',
};

/**
 * 피처 이름을 한글로 변환
 * 백엔드에서 feature_name_kr을 내려줄 수도 있으므로,
 * 우선순위: feature_name_kr > FEATURE_DISPLAY_NAME_MAP > 원본 feature 이름
 * 
 * @param featureName 원본 피처 이름
 * @param featureNameKr 백엔드에서 내려준 한글 이름 (선택)
 * @returns 한글 이름 (없으면 원본 반환)
 */
export function getFeatureDisplayName(
  featureName: string,
  featureNameKr?: string
): string {
  // 1순위: 백엔드에서 내려준 한글 이름
  if (featureNameKr && featureNameKr.trim().length > 0) {
    return featureNameKr;
  }
  // 2순위: 로컬 매핑 테이블
  return featureNameMap[featureName] || featureName;
}

/**
 * 피처 도메인 매핑
 * 경제/인구통계/디바이스/라이프스타일 분류
 */
export const featureDomainMap: Record<string, 'economic' | 'demographic' | 'device' | 'lifestyle'> = {
  // 경제/소득 관련
  'Q6_income': 'economic',
  'Q6_scaled': 'economic',
  'Q6': 'economic',
  'Q6_numeric': 'economic',
  'Q6_log': 'economic',
  'Q6_category': 'economic',
  'is_employed': 'economic',
  'is_unemployed': 'economic',
  
  // 인구통계
  'age': 'demographic',
  'age_scaled': 'demographic',
  'age_z': 'demographic',
  'Q7': 'demographic',
  'Q7_numeric': 'demographic',
  'education_level_scaled': 'demographic',
  'Q4': 'demographic',
  'is_student': 'demographic',
  'has_children': 'demographic',
  'children_category': 'demographic',
  'family_type': 'demographic',
  'region_category': 'demographic',
  'is_metro': 'demographic',
  'is_metro_city': 'demographic',
  'Q1': 'demographic',
  'Q2': 'demographic',
  
  // 디바이스/프리미엄
  'Q8_count': 'device',
  'Q8_count_scaled': 'device',
  'Q8_premium_index': 'device',
  'Q8_premium_count': 'device',
  'is_premium_phone': 'device',
  'is_apple_user': 'device',
  'is_samsung_user': 'device',
  'has_car': 'device',
  'is_premium_car': 'device',
  'is_domestic_car': 'device',
  'Q10': 'device',
  
  // 라이프스타일
  'drinking_types_count': 'lifestyle',
  'has_drinking_experience': 'lifestyle',
  'drinks_beer': 'lifestyle',
  'drinks_soju': 'lifestyle',
  'drinks_wine': 'lifestyle',
  'drinks_western': 'lifestyle',
  'drinks_makgeolli': 'lifestyle',
  'has_smoking_experience': 'lifestyle',
  'smoking_types_count': 'lifestyle',
  'smokes_regular': 'lifestyle',
  'smokes_heet': 'lifestyle',
  'smokes_liquid': 'lifestyle',
  'Q12_1_count': 'lifestyle',
  'Q12_2_count': 'lifestyle',
};

/**
 * 피처의 도메인 가져오기
 * @param featureName 피처 이름
 * @returns 도메인 (없으면 null)
 */
export function getFeatureDomain(featureName: string): 'economic' | 'demographic' | 'device' | 'lifestyle' | null {
  return featureDomainMap[featureName] || null;
}


