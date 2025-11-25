# 클러스터 비교 분석 차트 데이터 구조 및 변수 관리 계획서

## 1. 데이터 구조 분석

### 1.1 백엔드 → 프론트엔드 데이터 구조

```typescript
interface ClusterComparisonData {
  group_a: {
    id: number;
    count: number;
    label?: string;
  };
  group_b: {
    id: number;
    count: number;
    label?: string;
  };
  comparison: ComparisonItem[];  // 핵심 데이터 배열
  opportunities?: OpportunityItem[];
}

type ComparisonItem = 
  | ContinuousComparison 
  | BinaryComparison 
  | CategoricalComparison;
```

### 1.2 각 타입별 데이터 구조

#### ContinuousComparison (연속형)
```typescript
{
  feature: string;              // 변수명 (예: 'Q6_income', 'age')
  type: 'continuous';
  group_a_mean: number;         // 클러스터 A 평균값
  group_b_mean: number;         // 클러스터 B 평균값
  difference: number;           // 절대 차이
  lift_pct: number;            // 상대 차이 (%)
  p_value: number;             // 통계적 유의성
  significant: boolean;
  cohens_d?: number;           // 효과 크기
  index_a?: number;            // 전체 대비 인덱스 (100 = 평균)
  index_b?: number;
  feature_name_kr?: string;    // 한글 이름
}
```

#### BinaryComparison (이진형)
```typescript
{
  feature: string;              // 변수명 (예: 'has_drinking_experience')
  type: 'binary';
  group_a_ratio: number;        // 클러스터 A 비율 (0~1)
  group_b_ratio: number;        // 클러스터 B 비율 (0~1)
  difference: number;           // 비율 차이
  lift_pct: number;            // 상대 차이 (%)
  abs_diff_pct: number;        // 절대 퍼센트포인트 차이 (0~100)
  index_a?: number;            // 전체 대비 인덱스
  index_b?: number;
  p_value: number;
  significant: boolean;
  feature_name_kr?: string;
}
```

#### CategoricalComparison (범주형)
```typescript
{
  feature: string;              // 변수명 (예: 'family_type', 'Q6_category')
  type: 'categorical';
  group_a_distribution: {       // 클러스터 A 분포 (0~1 정규화)
    [categoryKey: string]: number;
  };
  group_b_distribution: {       // 클러스터 B 분포 (0~1 정규화)
    [categoryKey: string]: number;
  };
  feature_name_kr?: string;
}
```

### 1.3 백엔드 데이터 저장 형식

**NeonDB `merged.cluster_comparisons` 테이블:**
- `comparison_data` (JSONB): `{ features: { [feature_name]: feature_data } }`
- `feature_data.type`: `'continuous' | 'categorical'`
- **중요**: 이진형 변수는 `type: 'categorical'`로 저장되며, `categories`에 2개 카테고리만 있음

**변환 로직** (`precomputed.py`):
- `categorical` + 2개 카테고리 → `binary`로 변환
- `categorical` + 3개 이상 카테고리 → `categorical` 유지

---

## 2. 차트별 변수 전략

### 2.1 레이더 차트 (Radar Chart)

**목적**: 군집의 핵심 성향을 빠르게 파악 (8개 지표)

**데이터 타입**: `continuous` 또는 `binary`

**기본 변수 (우선순위 순)**:
```typescript
const RADAR_CHART_DEFAULT_FEATURES = [
  // 인구통계 (2개)
  'age_scaled',              // 연령 (정규화)
  'Q6_scaled',               // 소득 (정규화)
  
  // 소비 패턴 (2개)
  'Q8_premium_index',        // 프리미엄폰 지수
  'Q8_count_scaled',         // 전자제품 수 (정규화)
  
  // 라이프스타일 (2개)
  'has_drinking_experience', // 음주 경험
  'has_smoking_experience',  // 흡연 경험
  
  // 교육/디바이스 (2개)
  'is_college_graduate',     // 대졸 이상
  'has_car',                 // 차량 보유
] as const;
```

**사용자 선택 가능 변수**:
- 모든 `continuous` 또는 `binary` 타입 변수
- 필터링: `abs_diff_pct >= 5` 또는 `lift_pct >= 20` 또는 `cohens_d >= 0.3`
- 최대 12개까지 선택 가능

**데이터 준비 로직**:
1. 기본 변수 우선 표시 (순서 유지)
2. 기본 변수가 8개 미만이면 의미있는 차이 변수로 보완
3. 사용자가 선택한 변수가 있으면 선택한 변수만 표시

---

### 2.2 히트맵 (Binary Heatmap)

**목적**: 이진형 변수들의 비율을 한눈에 비교

**데이터 타입**: `binary`만

**기본 변수 (그룹별)**:
```typescript
const BINARY_HEATMAP_DEFAULT_GROUPS = {
  demographic: [
    'is_college_graduate',
    'is_employed',
    'is_unemployed',
    'has_children',
  ],
  drinking: [
    'has_drinking_experience',
    'drinks_beer',
    'drinks_soju',
    'drinks_wine',
  ],
  smoking: [
    'has_smoking_experience',
    'smokes_regular',
    'smokes_heet',
  ],
  digital: [
    'is_apple_user',
    'is_samsung_user',
    'is_premium_phone',
  ],
  vehicle: [
    'has_car',
    'is_premium_car',
    'is_domestic_car',
  ],
  region: [
    'is_metro',
    'is_metro_city',
  ],
} as const;
```

**사용자 선택 가능 변수**:
- 모든 `binary` 타입 변수
- 그룹별로 접기/펼치기 가능
- 최대 20개까지 선택 가능

**데이터 준비 로직**:
1. 그룹별로 정리하여 표시
2. 기본 변수 우선 표시
3. 사용자가 선택한 변수가 있으면 선택한 변수만 표시
4. `categorical` 타입이면서 2개 카테고리인 경우 `binary`로 자동 변환

---

### 2.3 스택바 (Stacked Bar Chart)

**목적**: 범주형 변수의 구성 비율 비교 (100% 스택)

**데이터 타입**: `categorical`만 (3개 이상 카테고리)

**기본 변수 (우선순위 순)**:
```typescript
const STACKED_BAR_DEFAULT_FEATURES = [
  'life_stage_dist',          // 생애주기 분포
  'income_tier_dist',         // 소득 구간 분포
  'family_type',              // 가족 형태
  'generation',               // 세대
] as const;
```

**사용자 선택 가능 변수**:
- 모든 `categorical` 타입 변수 (3개 이상 카테고리)
- 최대 6개까지 선택 가능

**데이터 준비 로직**:
1. 기본 변수 우선 표시 (최대 4개)
2. 사용자가 선택한 변수가 있으면 선택한 변수만 표시
3. 분포 합계를 100%로 정규화

---

### 2.4 인덱스 도트 (Index Dot Plot)

**목적**: 전체 대비 특화도 비교 (Index 100 = 전체 평균)

**데이터 타입**: `binary` 또는 `continuous`

**기본 변수**: 없음 (의미있는 차이만 자동 필터링)

**필터링 기준**:
- `binary`: `abs_diff_pct >= 5` 또는 `lift_pct >= 30`
- `continuous`: `cohens_d >= 0.3`

**사용자 선택 가능 변수**:
- `INDEX_DOT_ALL_FEATURES`에 포함된 모든 변수
- 필터링 기준을 만족하는 변수만 표시
- 최대 15개까지 선택 가능

**데이터 준비 로직**:
1. `INDEX_DOT_ALL_FEATURES`에 포함된 변수만 필터링
2. 의미있는 차이만 자동 필터링
3. `abs_diff_pct` 또는 `cohens_d` 내림차순 정렬
4. 사용자가 선택한 변수가 있으면 필터링 건너뛰고 선택한 변수만 표시

---

## 3. 데이터 변환 및 필터링 전략

### 3.1 타입 변환 로직

**문제**: 백엔드에서 이진형 변수를 `categorical`로 저장

**해결책**: 프론트엔드에서 자동 변환

```typescript
// dataPrep.ts에 구현된 변환 로직
function convertCategoricalToBinary(
  item: CategoricalComparison
): BinaryComparison | null {
  const categories = item.group_a_distribution || item.group_b_distribution || {};
  const categoryKeys = Object.keys(categories);
  
  // 2개 카테고리만 있는 경우 binary로 변환
  if (categoryKeys.length !== 2) {
    return null;
  }
  
  // '1' 또는 첫 번째 카테고리를 True로 간주
  const trueKey = categoryKeys.find(k => 
    k === '1' || k === '1.0' || k === 1
  ) || categoryKeys[0];
  
  const group_a_ratio = item.group_a_distribution?.[trueKey] || 0;
  const group_b_ratio = item.group_b_distribution?.[trueKey] || 0;
  const diff_pct_points = (group_b_ratio - group_a_ratio) * 100;
  const lift_pct = group_a_ratio > 0 
    ? ((group_b_ratio / group_a_ratio - 1) * 100) 
    : 0;
  
  return {
    ...item,
    type: 'binary',
    group_a_ratio,
    group_b_ratio,
    abs_diff_pct: Math.abs(diff_pct_points),
    lift_pct,
    difference: diff_pct_points / 100,
  };
}
```

### 3.2 필터링 전략

**의미있는 차이 필터링**:
- 레이더 차트: `showOnlyMeaningful` 옵션
- 인덱스 도트: 항상 적용 (사용자 선택 시 제외)

**필터링 기준**:
```typescript
const FILTER_CRITERIA = {
  binary: {
    abs_diff_pct: 5,      // 5%p 이상 차이
    lift_pct: 20,         // 20% 이상 상대 차이
  },
  continuous: {
    cohens_d: 0.3,        // 중간 효과 크기 이상
    difference: 0,        // 0이 아닌 차이
  },
};
```

---

## 4. 구현 계획

### 4.1 Phase 1: 데이터 구조 정리

**목표**: 백엔드 데이터 형식과 프론트엔드 기대 형식 일치

**작업**:
1. ✅ `categorical` → `binary` 자동 변환 로직 구현
2. ✅ `index_a`, `index_b` 계산 로직 확인
3. ✅ 스택바 분포 정규화 로직 추가

**파일**:
- `src/ui/profiling-ui-kit/components/comparison/dataPrep.ts`
- `server/app/api/precomputed.py`

---

### 4.2 Phase 2: 기본 변수 정의

**목표**: 각 차트별 기본 변수 명확히 정의

**작업**:
1. ✅ 레이더 차트 기본 변수 정의 (8개)
2. ✅ 히트맵 기본 변수 그룹 정의
3. ✅ 스택바 기본 변수 정의 (4개)
4. ✅ 인덱스 도트 필터링 기준 명확화

**파일**:
- `src/ui/profiling-ui-kit/components/comparison/featureSets.ts`

---

### 4.3 Phase 3: 사용자 선택 기능 개선

**목표**: 사용자가 원하는 변수를 쉽게 선택할 수 있도록

**작업**:
1. ✅ `PIFeatureSelector` 컴포넌트 확인
2. ✅ 차트별 선택 가능한 변수 목록 표시
3. ✅ 기본 변수와 선택 변수 구분 표시
4. ✅ 변수 검색 기능 추가 (선택사항)

**파일**:
- `src/ui/profiling-ui-kit/components/comparison/PIFeatureSelector.tsx`
- `src/ui/profiling-ui-kit/components/comparison/PIComparisonView.tsx`

---

### 4.4 Phase 4: 데이터 준비 함수 개선

**목표**: 각 차트별 데이터 준비 로직 최적화

**작업**:
1. ✅ `prepareRadarData`: 기본 변수 우선, 사용자 선택 반영
2. ✅ `prepareBinaryHeatmapData`: 그룹별 정리, 자동 변환
3. ✅ `prepareStackedBarData`: 기본 변수 우선, 정규화
4. ✅ `prepareIndexDotData`: 필터링 기준 명확화

**파일**:
- `src/ui/profiling-ui-kit/components/comparison/dataPrep.ts`

---

## 5. 변수 목록 정리

### 5.1 연속형 변수 (Continuous)

**인구통계**:
- `age`, `age_scaled`
- `Q6_income`, `Q6_scaled`
- `education_level_scaled`

**소비 패턴**:
- `Q8_count`, `Q8_count_scaled`
- `Q8_premium_index`
- `drinking_types_count`
- `smoking_types_count`

---

### 5.2 이진형 변수 (Binary)

**인구통계**:
- `is_college_graduate`
- `has_children`
- `is_employed`, `is_unemployed`, `is_student`

**지역**:
- `is_metro`, `is_metro_city`

**차량**:
- `has_car`, `is_premium_car`, `is_domestic_car`

**브랜드/디바이스**:
- `is_apple_user`, `is_samsung_user`, `is_premium_phone`

**음주**:
- `has_drinking_experience`
- `drinks_beer`, `drinks_soju`, `drinks_wine`, `drinks_western`, `drinks_makgeolli`, `drinks_low_alcohol`, `drinks_cocktail`

**흡연**:
- `has_smoking_experience`
- `smokes_regular`, `smokes_heet`, `smokes_liquid`, `smokes_other`

---

### 5.3 범주형 변수 (Categorical)

**인구통계**:
- `age_group`
- `generation`
- `family_type`
- `children_category`, `children_category_ordinal`

**소득**:
- `Q6_category`
- `income_tier_dist`

**생애주기**:
- `life_stage_dist`

**지역**:
- `region_category`, `region_lvl1`

---

## 6. 체크리스트

### 6.1 데이터 변환
- [x] `categorical` → `binary` 자동 변환
- [x] `index_a`, `index_b` 계산
- [x] 스택바 분포 정규화

### 6.2 기본 변수 정의
- [x] 레이더 차트 기본 변수 (8개)
- [x] 히트맵 기본 변수 그룹
- [x] 스택바 기본 변수 (4개)
- [x] 인덱스 도트 필터링 기준

### 6.3 사용자 선택 기능
- [x] 차트별 변수 선택 기능
- [ ] 변수 검색 기능 (선택사항)
- [ ] 기본 변수 하이라이트 표시

### 6.4 데이터 준비 함수
- [x] `prepareRadarData` 개선
- [x] `prepareBinaryHeatmapData` 개선
- [x] `prepareStackedBarData` 개선
- [x] `prepareIndexDotData` 개선

---

## 7. 다음 단계

1. **백엔드 데이터 재생성**: `generate_cluster_comparisons.py` 실행하여 최신 데이터 반영
2. **프론트엔드 테스트**: 각 차트에서 기본 변수와 사용자 선택 변수가 올바르게 표시되는지 확인
3. **성능 최적화**: 대량 변수 선택 시 렌더링 성능 확인
4. **UX 개선**: 변수 선택 UI 개선 (검색, 그룹별 표시 등)

---

## 8. 참고 파일

- **타입 정의**: `src/ui/profiling-ui-kit/components/comparison/types.ts`
- **변수 세트**: `src/ui/profiling-ui-kit/components/comparison/featureSets.ts`
- **데이터 준비**: `src/ui/profiling-ui-kit/components/comparison/dataPrep.ts`
- **메인 뷰**: `src/ui/profiling-ui-kit/components/comparison/PIComparisonView.tsx`
- **변수 선택기**: `src/ui/profiling-ui-kit/components/comparison/PIFeatureSelector.tsx`
- **백엔드 API**: `server/app/api/precomputed.py`
- **데이터 생성**: `server/scripts/generate_cluster_comparisons.py`

