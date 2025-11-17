/**
 * 클러스터 비교 분석을 위한 변수 세트 정의
 * 각 차트 유형에 최적화된 변수들을 선별
 */

// ============================================================
// 1. 라다 차트 (Radar Chart) - 8개 (핵심 지표)
// ============================================================
// 목적: 군집 성향을 가장 빠르게 파악하는 대표 지표
// 기준: 핵심 lifestyle 변수, 연속형 스케일 or 이진 비율

export const RADAR_CHART_FEATURES = [
  // === 인구통계 (2개) ===
  'age_scaled',             // 연령 - 라이프 스테이지 파악
  'Q6_scaled',              // 소득 - 소비 여력/경제력
  
  // === 소비 패턴 (2개) ===
  'Q8_premium_index',       // 프리미엄 지수 - 프리미엄 소비 경향
  'Q8_count_scaled',        // 전자제품 수 - 디지털 친화도
  
  // === 라이프스타일 (2개) ===
  'drinking_types_count',    // 음주 유형 수 - 사교/라이프스타일
  'has_smoking_experience', // 흡연 경험 - 위험 행동 신호
  
  // === 교육/디바이스 (2개) ===
  'is_college_graduate',    // 대졸 이상 - 교육/직군 수준
  'is_premium_phone',        // 프리미엄 폰 - 고가 디바이스 성향
] as const;

// ============================================================
// 2. 히트맵 (Binary Heatmap) - 그룹별 확장 변수
// ============================================================
// 목적: 패널/군집의 특성 강약을 전체적으로 보는 진짜 분석 영역
// 기준: 이진 변수, 그룹별 드릴다운 가능

export const BINARY_HEATMAP_FEATURES = [
  // === 브랜드 선호 (3개) ===
  'is_apple_user',           // 애플 사용자
  'is_samsung_user',         // 삼성 사용자
  'is_premium_phone',        // 프리미엄 폰 보유
  
  // === 음주 패턴 (4개) ===
  'drinks_wine',             // 와인 음주
  'drinks_western',          // 양주 음주
  'drinks_beer',             // 맥주 음주
  'drinks_soju',             // 소주 음주
  
  // === 지역/교육 (2개) ===
  'is_metro',                // 수도권 거주
  'is_college_graduate',     // 대학 졸업
  
  // === 차량/직업 (3개) ===
  'has_car',                 // 차량 보유
  'is_premium_car',          // 프리미엄 차량 보유
  'is_employed'              // 취업 상태
] as const;

// 히트맵 그룹별 변수 정의 (접기/펼치기용)
export const BINARY_HEATMAP_GROUPS = {
  // 인구·사회
  'demographic': [
    'age_scaled',
    'Q6_scaled',
    'is_college_graduate',
    'is_employed',
    'is_unemployed',
    'is_student',
  ],
  
  // 음주
  'drinking': [
    'has_drinking_experience',
    'drinking_types_count',
    'drinks_beer',
    'drinks_soju',
    'drinks_wine',
    'drinks_western',
    'drinks_makgeolli',
    'drinks_low_alcohol',
    'drinks_cocktail',
  ],
  
  // 흡연
  'smoking': [
    'has_smoking_experience',
    'smoking_types_count',
    'smokes_regular',
    'smokes_heet',
    'smokes_liquid',
    'smokes_other',
  ],
  
  // 디지털/브랜드
  'digital': [
    'Q8_count_scaled',
    'is_apple_user',
    'is_samsung_user',
    'is_premium_phone',
  ],
  
  // 차량
  'vehicle': [
    'has_car',
    'is_premium_car',
    'is_domestic_car',
  ],
  
  // 지역
  'region': [
    'is_metro',
    'is_metro_city',
  ],
} as const;

// ============================================================
// 3. 스택바 (Stacked Bar Chart) - 카테고리 그룹
// ============================================================
// 목적: 전체 구성 비율 비교. 카테고리 구성 상태를 한눈에 보기
// 기준: 다중 카테고리 구성 변수, 합계 100%

export const STACKED_BAR_FEATURES = [
  'life_stage_dist',         // 생애주기 분포 (최우선)
  'income_tier_dist',        // 소득 구간 분포
  'family_type',             // 가족 형태
  'generation'               // 세대
] as const;

// 스택바 카테고리 그룹 정의 (이진형 변수들을 그룹화)
export const STACKED_BAR_CATEGORIES = {
  // 주류
  'drinks': {
    name: '주류',
    features: [
      'drinks_soju',      // 소주
      'drinks_beer',      // 맥주
      'drinks_wine',      // 와인
      'drinks_western',   // 양주
      'drinks_makgeolli', // 막걸리
      'drinks_low_alcohol', // 저도수주
    ],
    order: ['drinks_soju', 'drinks_beer', 'drinks_wine', 'drinks_western', 'drinks_makgeolli', 'drinks_low_alcohol'],
  },
  
  // 흡연
  'smoking': {
    name: '흡연',
    features: [
      'smokes_regular',   // 일반담배
      'smokes_liquid',    // 액상
      'smokes_other',     // 기타흡연
    ],
    order: ['smokes_regular', 'smokes_liquid', 'smokes_other'],
  },
  
  // 스마트폰
  'phone': {
    name: '스마트폰',
    features: [
      'is_samsung_user',   // 삼성 사용자
      'is_apple_user',     // 애플 사용자
      // 기타는 나머지로 처리
    ],
    order: ['is_samsung_user', 'is_apple_user'],
  },
  
  // 차량
  'car': {
    name: '차량',
    features: [
      'is_domestic_car',   // 국산차
      'is_premium_car',    // 프리미엄/수입차
    ],
    order: ['is_domestic_car', 'is_premium_car'],
  },
} as const;

// ============================================================
// 4. 인덱스 도트 플롯 (Index Dot Plot) - 카테고리별
// ============================================================
// 목적: 전체 대비 특화도를 보여주는 세밀한 분석
// 기준: 필터링 자동화 (abs_diff_pct >= 5 또는 lift_pct >= 30)

export const INDEX_DOT_FEATURES = {
  // === 음주 (타겟성 판단) ===
  drinks: [
    'drinks_soju',            // 소주
    'drinks_beer',            // 맥주
    'drinks_wine',            // 와인
    'drinks_western',         // 양주
    'drinks_makgeolli',       // 막걸리
  ],
  
  // === 흡연 (타겟성 판단) ===
  smoking: [
    'smokes_regular',        // 일반담배
    'smokes_liquid',          // 액상
    'smokes_other',           // 기타흡연
  ],
  
  // === 디지털/브랜드 (타겟성 판단) ===
  digital: [
    'is_apple_user',          // 애플 사용자
    'is_samsung_user',        // 삼성 사용자
    'is_premium_phone',       // 프리미엄 폰
  ],
  
  // === 차량 (타겟성 판단) ===
  vehicle: [
    'has_car',                // 차량 보유
    'is_premium_car',         // 프리미엄 차량
  ],
  
  // === 여가/라이프 (타겟성 판단) ===
  lifestyle: [
    'Q8_count_scaled',        // 전자제품 수
    'Q8_premium_index',        // 프리미엄 지수
  ],
} as const;

// 전체 인덱스 도트 변수 (평탄화)
export const INDEX_DOT_ALL_FEATURES = [
  ...INDEX_DOT_FEATURES.drinks,
  ...INDEX_DOT_FEATURES.smoking,
  ...INDEX_DOT_FEATURES.digital,
  ...INDEX_DOT_FEATURES.vehicle,
  ...INDEX_DOT_FEATURES.lifestyle,
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
// 기존 코드와의 호환성을 위해 유지

export const CONTINUOUS_BAR_FEATURES = [
  ...RADAR_CHART_FEATURES,
  // 기존 변수명 (하위 호환)
  'Q6_income',
  'age',
  'Q8_count',
  'Q8_premium_index',
  'drinking_types_count',
  'smoking_types_count',
] as const;

export const CATEGORICAL_STACK_FEATURES = [
  ...STACKED_BAR_FEATURES,
  // 기존 변수명 (하위 호환)
  'age_group',
  'children_category',
  'Q6_category',
  'region_category',
  'phone_segment',
] as const;

// 기존 FEATURE_NAME_KR은 utils.ts로 이동
// 하위 호환성을 위해 빈 객체 export
export const FEATURE_NAME_KR: Record<string, string> = {};
