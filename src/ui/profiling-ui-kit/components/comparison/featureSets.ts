/**
 * 클러스터 비교 분석을 위한 변수 세트 정의
 * 실전에 의미있는 핵심 변수만 선별
 */

// ============================================================
// 1. 레이더 차트 (Radar Chart) - 핵심 지표만
// ============================================================

export const RADAR_CHART_FEATURES = [
  'age_scaled',              // 연령
  'Q6_income',               // 소득액 (만원)
  'education_level_scaled',  // 학력 (0:고졸, 1:전문대, 2:대졸, 3:대학원)
  'Q8_count_scaled',         // 전자제품 수
] as const;

// ============================================================
// 2. 히트맵 (Binary Heatmap) - 핵심 이진형 변수만
// ============================================================

export const BINARY_HEATMAP_FEATURES = [
  // 인구통계
  'age',                     // 연령
  'has_children',            // 자녀수
  
  // 경제
  'Q6_income',              // 소득액 (만원)
  
  // 소비 패턴
  'Q8_count_scaled',        // 전자제품 수
  
  // 브랜드
  'is_apple_user',          // 애플 사용자
  'is_samsung_user',        // 삼성 사용자
  
  // 차량
  'is_premium_car',         // 프리미엄 차량 보유
  
  // 교육
  'education_level_scaled', // 학력 (0:고졸, 1:전문대, 2:대졸, 3:대학원)
] as const;

// 히트맵 그룹별 변수 정의
export const BINARY_HEATMAP_GROUPS = {
  'demographic': [
    'age_scaled',
    'Q6_income',
    'has_children',
  ],
  
  'digital': [
    'Q8_count_scaled',
    'is_apple_user',
    'is_samsung_user',
  ],
  
  'vehicle': [
    'is_premium_car',
  ],
  
  'education': [
    'education_level_scaled',
  ],
} as const;

// ============================================================
// 3. 스택바 (Stacked Bar Chart) - 핵심 카테고리만
// ============================================================

export const STACKED_BAR_FEATURES = [
  'life_stage_dist',         // 생애주기 분포
  'income_tier_dist',        // 소득 구간 분포
  'family_type',             // 가족 형태
  'Q6_category',             // 소득 구간
] as const;

// 스택바 카테고리 그룹 정의
export const STACKED_BAR_CATEGORIES = {
  'phone': {
    name: '스마트폰',
    features: [
      'is_samsung_user',
      'is_apple_user',
    ],
    order: ['is_samsung_user', 'is_apple_user'],
  },
} as const;

// ============================================================
// 4. 인덱스 도트 플롯 (Index Dot Plot) - 핵심 변수만
// ============================================================

export const INDEX_DOT_FEATURES = {
  'digital': [
    'is_apple_user',
    'is_samsung_user',
  ],
  
  'vehicle': [
    'is_premium_car',
  ],
  
  'lifestyle': [
    'Q8_count_scaled',
  ],
} as const;

// 전체 인덱스 도트 변수 (평탄화)
export const INDEX_DOT_ALL_FEATURES = [
  // 인구통계
  'age',
  'has_children',
  'family_type',
  'education_level_scaled',
  
  // 경제
  'Q6_income',
  'Q6_scaled',
  'Q6_category',
  
  // 소비 패턴
  'Q8_count_scaled',
  
  // 브랜드/디바이스
  'is_apple_user',
  'is_samsung_user',
  
  // 차량
  'is_premium_car',
] as const;

// ============================================================
// 타입 정의
// ============================================================
export type RadarChartFeature = typeof RADAR_CHART_FEATURES[number];
export type BinaryHeatmapFeature = typeof BINARY_HEATMAP_FEATURES[number];
export type StackedBarFeature = typeof STACKED_BAR_FEATURES[number];
export type IndexDotFeature = typeof INDEX_DOT_ALL_FEATURES[number];

// 하위 호환성: 기존 타입 유지
export type SideBySideFeature = RadarChartFeature;

// ============================================================
// 하위 호환성: 기존 변수명 매핑
// ============================================================

export const CONTINUOUS_BAR_FEATURES = [
  ...RADAR_CHART_FEATURES,
  'Q6_income',
  'age',
  'Q8_count_scaled',
] as const;

export const CATEGORICAL_STACK_FEATURES = [
  ...STACKED_BAR_FEATURES,
  'Q6_category',
] as const;

// 기존 FEATURE_NAME_KR은 utils.ts로 이동
// 하위 호환성을 위해 빈 객체 export
export const FEATURE_NAME_KR: Record<string, string> = {};
