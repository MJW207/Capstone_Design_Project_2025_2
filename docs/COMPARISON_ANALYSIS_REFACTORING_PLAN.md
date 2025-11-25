# 비교 분석 기능 리팩토링 계획서

## 📋 목차
1. [현재 문제점 분석](#현재-문제점-분석)
2. [NeonDB 비교 변수 목록](#neondb-비교-변수-목록)
3. [차트별 기본 변수 선정](#차트별-기본-변수-선정)
4. [변수 선택 기능 구현 현황](#변수-선택-기능-구현-현황)
5. [수정 사항 및 구현 계획](#수정-사항-및-구현-계획)
6. [우선순위 작업 목록](#우선순위-작업-목록)

---

## 🔍 현재 문제점 분석

### 1. 즉시 수정 필요 (Critical)

#### 문제 1: PIStackedBarChart.tsx 오류
**오류 메시지:**
```
PIStackedBarChart.tsx:79 Uncaught TypeError: Cannot convert undefined or null to object
    at Object.keys (<anonymous>)
    at renderStackedBar (PIStackedBarChart.tsx:79:17)
```

**원인:**
- 백엔드 API가 범주형 변수 데이터를 `categories` 구조로 반환
- 프론트엔드는 `group_a_distribution`, `group_b_distribution` 형식을 기대
- 데이터 변환 누락으로 인한 null/undefined 접근

**영향:**
- 스택바 차트 렌더링 실패
- 비교 분석 페이지 전체 사용 불가

#### 문제 2: 백엔드 데이터 구조 불일치
**위치:** `server/app/api/precomputed.py:463-468`

**현재 구조:**
```python
# 범주형 변수 (3개 이상)
feature_item.update({
    'type': 'categorical',
    'categories': categories,  # ❌ 잘못된 구조
})
```

**필요한 구조:**
```python
# 범주형 변수 (3개 이상)
group_a_distribution = {}
group_b_distribution = {}
for cat_key, cat_data in categories.items():
    group_a_distribution[cat_key] = cat_data.get('cluster_a', {}).get('percentage', 0.0) / 100.0
    group_b_distribution[cat_key] = cat_data.get('cluster_b', {}).get('percentage', 0.0) / 100.0

feature_item.update({
    'type': 'categorical',
    'group_a_distribution': group_a_distribution,  # ✅ 올바른 구조
    'group_b_distribution': group_b_distribution,
})
```

---

## 📊 NeonDB 비교 변수 목록

### 데이터 소스
- **테이블:** `merged.cluster_comparisons`
- **컬럼:** `comparison_data` (JSONB)
- **생성 스크립트:** `server/scripts/generate_cluster_comparisons.py`

### 비교 변수 카테고리

#### 1. 인구통계 변수 (Demographic)
```python
[
    'age',                    # 연령 (연속형)
    'age_group',              # 연령대 (범주형)
    'generation',             # 세대 (범주형)
    'Q6_income',              # 소득액 (만원, 연속형)
    'Q6_scaled',              # 소득 (정규화, 연속형)
    'Q6_category',            # 소득 카테고리 (범주형)
    'education_level',         # 학력 수준 (연속형/범주형)
    'is_college_graduate',    # 대졸 여부 (이진형)
]
```

#### 2. 가족 구성 변수 (Family)
```python
[
    'has_children',                    # 자녀 보유 (이진형)
    'children_category',               # 자녀 카테고리 (범주형)
    'children_category_ordinal',       # 자녀 카테고리 (순서형)
    'family_type',                     # 가족 유형 (범주형)
]
```

#### 3. 소비 패턴 변수 (Consumption)
```python
[
    'Q8_count',                # 전자제품 수 (연속형)
    'Q8_count_scaled',         # 전자제품 수 (정규화, 연속형)
    'Q8_premium_index',        # 프리미엄 지수 (연속형)
    'is_premium_car',           # 프리미엄차 보유 (이진형)
    'has_car',                  # 차량 보유 (이진형)
    'is_domestic_car',          # 국산차 보유 (이진형)
]
```

#### 4. 라이프스타일 변수 (Lifestyle)
```python
[
    # 음주
    'has_drinking_experience',  # 음주 경험 (이진형)
    'drinking_types_count',     # 음주 유형 수 (연속형)
    'drinks_beer',              # 맥주 (이진형)
    'drinks_soju',              # 소주 (이진형)
    'drinks_wine',              # 와인 (이진형)
    'drinks_western',           # 양주 (이진형)
    'drinks_makgeolli',         # 막걸리 (이진형)
    'drinks_low_alcohol',       # 저도수 (이진형)
    'drinks_cocktail',          # 칵테일 (이진형)
    
    # 흡연
    'has_smoking_experience',  # 흡연 경험 (이진형)
    'smoking_types_count',      # 흡연 유형 수 (연속형)
    'smokes_regular',           # 일반 담배 (이진형)
    'smokes_heet',               # 히트 (이진형)
    'smokes_liquid',             # 액상 (이진형)
    'smokes_other',              # 기타 흡연 (이진형)
]
```

#### 5. 디바이스/브랜드 변수 (Device/Brand)
```python
[
    'is_apple_user',            # 애플 사용자 (이진형)
    'is_samsung_user',          # 삼성 사용자 (이진형)
    'is_premium_phone',         # 프리미엄 폰 보유 (이진형)
    'phone_segment',            # 폰 세그먼트 (범주형)
]
```

#### 6. 지역/직업 변수 (Region/Employment)
```python
[
    'is_metro',                 # 수도권 거주 (이진형)
    'is_metro_city',            # 광역시 거주 (이진형)
    'region_lvl1',              # 지역 대분류 (범주형)
    'is_employed',              # 취업 상태 (이진형)
    'is_unemployed',            # 실업 상태 (이진형)
    'is_student',               # 학생 여부 (이진형)
]
```

### 변수 타입 분류

#### 연속형 (Continuous)
- `age`, `Q6_income`, `Q6_scaled`, `Q8_count`, `Q8_count_scaled`
- `Q8_premium_index`, `drinking_types_count`, `smoking_types_count`
- `education_level`, `children_category_ordinal`

#### 이진형 (Binary)
- `is_*` 접두사 변수들 (예: `is_college_graduate`, `has_children`)
- `drinks_*`, `smokes_*` 변수들
- `has_*` 접두사 변수들

#### 범주형 (Categorical)
- `age_group`, `generation`, `Q6_category`, `children_category`
- `family_type`, `phone_segment`, `region_lvl1`

---

## 📈 차트별 기본 변수 선정

### 1. 라다 차트 (Radar Chart)
**목적:** 군집 성향을 빠르게 파악하는 대표 지표 (8개)

**현재 정의:** `src/ui/profiling-ui-kit/components/comparison/featureSets.ts:12-28`

```typescript
export const RADAR_CHART_FEATURES = [
  // 인구통계 (2개)
  'age_scaled',              // 연령
  'Q6_scaled',               // 소득
  
  // 소비 패턴 (2개)
  'Q8_premium_index',        // 프리미엄 지수
  'Q8_count_scaled',         // 전자제품 수
  
  // 라이프스타일 (2개)
  'drinking_types_count',     // 음주 유형 수
  'has_smoking_experience',   // 흡연 경험
  
  // 교육/디바이스 (2개)
  'is_college_graduate',     // 대졸 이상
  'is_premium_phone',        // 프리미엄 폰
] as const;
```

**검증 필요:**
- ✅ 대부분 변수 존재 확인
- ⚠️ `age_scaled` → `age` 또는 `Q6_scaled` → `Q6_income` 대체 가능 여부 확인

**권장 기본 변수 (우선순위):**
1. `Q6_income` 또는 `Q6_scaled` (소득)
2. `age` (연령)
3. `Q8_premium_index` (프리미엄 지수)
4. `Q8_count` 또는 `Q8_count_scaled` (전자제품 수)
5. `is_college_graduate` (대졸)
6. `is_premium_phone` (프리미엄 폰)
7. `has_drinking_experience` (음주 경험)
8. `has_smoking_experience` (흡연 경험)

---

### 2. 히트맵 (Binary Heatmap)
**목적:** 이진 변수의 그룹별 강약 비교 (12개)

**현재 정의:** `src/ui/profiling-ui-kit/components/comparison/featureSets.ts:36-56`

```typescript
export const BINARY_HEATMAP_FEATURES = [
  // 브랜드 선호 (3개)
  'is_apple_user',
  'is_samsung_user',
  'is_premium_phone',
  
  // 음주 패턴 (4개)
  'drinks_wine',
  'drinks_western',
  'drinks_beer',
  'drinks_soju',
  
  // 지역/교육 (2개)
  'is_metro',
  'is_college_graduate',
  
  // 차량/직업 (3개)
  'has_car',
  'is_premium_car',
  'is_employed'
] as const;
```

**검증 필요:**
- ✅ 모든 변수 존재 확인
- ✅ 이진형 변수만 포함

**권장 기본 변수 (우선순위):**
1. `is_college_graduate` (대졸)
2. `is_metro` (수도권)
3. `is_employed` (취업)
4. `has_car` (차량 보유)
5. `is_premium_car` (프리미엄차)
6. `is_apple_user` (애플 사용자)
7. `is_samsung_user` (삼성 사용자)
8. `is_premium_phone` (프리미엄 폰)
9. `has_drinking_experience` (음주 경험)
10. `drinks_wine` (와인)
11. `drinks_beer` (맥주)
12. `has_smoking_experience` (흡연 경험)

---

### 3. 스택바 (Stacked Bar Chart)
**목적:** 범주형 변수의 구성 비율 비교 (4개)

**현재 정의:** `src/ui/profiling-ui-kit/components/comparison/featureSets.ts:121-126`

```typescript
export const STACKED_BAR_FEATURES = [
  'life_stage_dist',         // ❌ 존재하지 않음
  'income_tier_dist',        // ❌ 존재하지 않음
  'family_type',             // ✅ 존재
  'generation'               // ✅ 존재
] as const;
```

**문제점:**
- `life_stage_dist`, `income_tier_dist` 변수가 실제 데이터에 없음
- 백엔드에서 범주형 변수 변환 누락

**권장 기본 변수 (우선순위):**
1. `age_group` (연령대) - 대체: `life_stage_dist`
2. `Q6_category` (소득 카테고리) - 대체: `income_tier_dist`
3. `family_type` (가족 유형)
4. `generation` (세대)

**대안 변수:**
- `children_category` (자녀 카테고리)
- `phone_segment` (폰 세그먼트)
- `region_lvl1` (지역)

---

### 4. 인덱스 도트 플롯 (Index Dot Plot)
**목적:** 전체 대비 특화도 비교 (10개)

**현재 정의:** `src/ui/profiling-ui-kit/components/comparison/featureSets.ts:183-227`

```typescript
export const INDEX_DOT_ALL_FEATURES = [
  // 음주 (5개)
  'drinks_soju',
  'drinks_beer',
  'drinks_wine',
  'drinks_western',
  'drinks_makgeolli',
  
  // 흡연 (3개)
  'smokes_regular',
  'smokes_liquid',
  'smokes_other',
  
  // 디지털/브랜드 (3개)
  'is_apple_user',
  'is_samsung_user',
  'is_premium_phone',
  
  // 차량 (2개)
  'has_car',
  'is_premium_car',
  
  // 여가/라이프 (2개)
  'Q8_count_scaled',
  'Q8_premium_index',
] as const;
```

**검증 필요:**
- ✅ 대부분 변수 존재 확인
- ⚠️ `Q8_premium_index` → `Q8_premium_index` 확인

**권장 기본 변수 (우선순위):**
1. `Q8_premium_index` (프리미엄 지수)
2. `is_premium_car` (프리미엄차)
3. `is_premium_phone` (프리미엄 폰)
4. `drinks_wine` (와인)
5. `drinks_western` (양주)
6. `is_apple_user` (애플 사용자)
7. `has_car` (차량 보유)
8. `drinks_beer` (맥주)
9. `smokes_regular` (일반 담배)
10. `Q8_count` 또는 `Q8_count_scaled` (전자제품 수)

---

## 🔧 변수 선택 기능 구현 현황

### 현재 구현 위치
- **컴포넌트:** `src/ui/profiling-ui-kit/components/comparison/PIFeatureSelector.tsx`
- **사용 위치:** `src/ui/profiling-ui-kit/components/comparison/PIComparisonView.tsx:117-132`

### 구현 상태

#### ✅ 완료된 기능
1. **변수 선택 패널 UI**
   - 슬라이드 패널 (오른쪽에서 등장)
   - 리사이즈 가능 (300px ~ 800px)
   - localStorage에 너비 저장

2. **차트별 필터링**
   - 라다 차트: 연속형 + 이진형
   - 히트맵: 이진형만
   - 스택바: 범주형만
   - 인덱스 도트: 이진형만

3. **변수 정렬**
   - 중요도 기준 정렬 (cohens_d, abs_diff_pct)
   - 선택된 변수 순서 유지
   - 순서 변경 기능 (위/아래 이동)

4. **상태 관리**
   - 차트별 독립적인 선택 상태
   - `selectedRadarFeatures`, `selectedHeatmapFeatures`, `selectedStackedFeatures`, `selectedIndexFeatures`

#### ⚠️ 개선 필요 사항

1. **기본 변수 자동 선택**
   - 현재: 사용자가 수동으로 선택해야 함
   - 개선: 차트별 기본 변수 자동 선택

2. **변수 존재 여부 검증**
   - 현재: 모든 변수가 존재한다고 가정
   - 개선: 실제 데이터에 존재하는 변수만 표시

3. **범주형 변수 처리**
   - 현재: 범주형 변수가 제대로 표시되지 않음
   - 개선: 백엔드 데이터 변환 후 정상 표시

---

## 🛠️ 수정 사항 및 구현 계획

### Phase 1: 즉시 수정 (Critical)

#### 작업 1-1: 백엔드 범주형 변수 변환 수정
**파일:** `server/app/api/precomputed.py`

**수정 내용:**
```python
# 기존 (463-468줄)
else:
    # 범주형 변수 (3개 이상)
    feature_item.update({
        'type': 'categorical',
        'categories': categories,
    })

# 수정 후
else:
    # 범주형 변수 (3개 이상)
    # categories 구조를 group_a_distribution, group_b_distribution로 변환
    group_a_distribution = {}
    group_b_distribution = {}
    
    for cat_key, cat_data in categories.items():
        cat_a_data = cat_data.get('cluster_a', {})
        cat_b_data = cat_data.get('cluster_b', {})
        
        # percentage를 0~1 범위로 변환
        group_a_distribution[str(cat_key)] = cat_a_data.get('percentage', 0.0) / 100.0
        group_b_distribution[str(cat_key)] = cat_b_data.get('percentage', 0.0) / 100.0
    
    feature_item.update({
        'type': 'categorical',
        'group_a_distribution': group_a_distribution,
        'group_b_distribution': group_b_distribution,
        'feature_name_kr': feature_name_kr,
    })
```

**예상 소요 시간:** 30분

---

#### 작업 1-2: 프론트엔드 null 체크 추가
**파일:** `src/ui/profiling-ui-kit/components/comparison/PIStackedBarChart.tsx`

**수정 내용:**
```typescript
// 기존 (76-81줄)
const renderStackedBar = (feature: CategoricalComparison, featureIdx: number) => {
  const allCategoryKeys = Array.from(new Set([
    ...Object.keys(feature.group_a_distribution),
    ...Object.keys(feature.group_b_distribution)
  ]));

// 수정 후
const renderStackedBar = (feature: CategoricalComparison, featureIdx: number) => {
  // null/undefined 체크 추가
  if (!feature.group_a_distribution || !feature.group_b_distribution) {
    console.warn(`[PIStackedBarChart] 범주형 변수 데이터 누락: ${feature.feature}`);
    return null;
  }
  
  const allCategoryKeys = Array.from(new Set([
    ...Object.keys(feature.group_a_distribution || {}),
    ...Object.keys(feature.group_b_distribution || {})
  ]));
```

**예상 소요 시간:** 15분

---

### Phase 2: 기본 변수 자동 선택

#### 작업 2-1: 차트별 기본 변수 정의 업데이트
**파일:** `src/ui/profiling-ui-kit/components/comparison/featureSets.ts`

**수정 내용:**
- `STACKED_BAR_FEATURES`에서 존재하지 않는 변수 제거
- 실제 데이터에 존재하는 변수로 대체

```typescript
export const STACKED_BAR_FEATURES = [
  'age_group',        // ✅ 실제 존재
  'Q6_category',      // ✅ 실제 존재
  'family_type',      // ✅ 실제 존재
  'generation'        // ✅ 실제 존재
] as const;
```

**예상 소요 시간:** 10분

---

#### 작업 2-2: 기본 변수 자동 선택 로직 추가
**파일:** `src/ui/profiling-ui-kit/components/comparison/PIComparisonView.tsx`

**수정 내용:**
```typescript
// 차트별 기본 변수 자동 선택
useEffect(() => {
  if (!allComparisonData.length) return;
  
  // 라다 차트 기본 변수
  if (activeChart === 'radar' && selectedRadarFeatures.length === 0) {
    const defaultFeatures = RADAR_CHART_FEATURES.filter(f => 
      allComparisonData.some(d => d.feature === f && (d.type === 'continuous' || d.type === 'binary'))
    );
    if (defaultFeatures.length > 0) {
      setSelectedRadarFeatures(defaultFeatures);
    }
  }
  
  // 히트맵 기본 변수
  if (activeChart === 'heatmap' && selectedHeatmapFeatures.length === 0) {
    const defaultFeatures = BINARY_HEATMAP_FEATURES.filter(f => 
      allComparisonData.some(d => d.feature === f && d.type === 'binary')
    );
    if (defaultFeatures.length > 0) {
      setSelectedHeatmapFeatures(defaultFeatures);
    }
  }
  
  // 스택바 기본 변수
  if (activeChart === 'stacked' && selectedStackedFeatures.length === 0) {
    const defaultFeatures = STACKED_BAR_FEATURES.filter(f => 
      allComparisonData.some(d => d.feature === f && d.type === 'categorical')
    );
    if (defaultFeatures.length > 0) {
      setSelectedStackedFeatures(defaultFeatures);
    }
  }
  
  // 인덱스 도트 기본 변수
  if (activeChart === 'index' && selectedIndexFeatures.length === 0) {
    const defaultFeatures = INDEX_DOT_ALL_FEATURES.filter(f => 
      allComparisonData.some(d => d.feature === f && (d.type === 'binary' || d.type === 'continuous'))
    );
    if (defaultFeatures.length > 0) {
      setSelectedIndexFeatures(defaultFeatures);
    }
  }
}, [activeChart, allComparisonData, selectedRadarFeatures, selectedHeatmapFeatures, selectedStackedFeatures, selectedIndexFeatures]);
```

**예상 소요 시간:** 30분

---

### Phase 3: 변수 존재 여부 검증

#### 작업 3-1: PIFeatureSelector 개선
**파일:** `src/ui/profiling-ui-kit/components/comparison/PIFeatureSelector.tsx`

**수정 내용:**
- 실제 데이터에 존재하는 변수만 표시
- 존재하지 않는 변수는 회색 처리 및 비활성화

```typescript
// availableFeatures 계산 시 존재 여부 검증
const availableFeatures = useMemo(() => {
  let filtered = allData;
  
  // ... 기존 필터링 로직 ...
  
  return filtered
    .map(d => ({
      feature: d.feature,
      name: getFeatureDisplayName(d.feature, (d as any).feature_name_kr),
      type: d.type,
      exists: true,  // 실제 데이터에 존재
      ...(d.type === 'continuous' ? { cohens_d: (d as any).cohens_d } : {}),
      ...(d.type === 'binary' ? { abs_diff_pct: (d as any).abs_diff_pct } : {}),
    }))
    .filter(f => f.exists)  // 존재하는 변수만
    .sort((a, b) => {
      // 중요도 순 정렬
      // ...
    });
}, [allData, chartType]);
```

**예상 소요 시간:** 20분

---

### Phase 4: 데이터 검증 및 테스트

#### 작업 4-1: 백엔드 데이터 구조 검증
**스크립트 작성:** `server/scripts/verify_comparison_data_structure.py`

**기능:**
- NeonDB에서 비교 데이터 조회
- 범주형 변수 구조 검증
- `group_a_distribution`, `group_b_distribution` 존재 여부 확인

**예상 소요 시간:** 1시간

---

#### 작업 4-2: 프론트엔드 통합 테스트
**테스트 시나리오:**
1. 비교 분석 페이지 로드
2. 클러스터 선택
3. 각 차트 탭 전환
4. 변수 선택 패널 열기/닫기
5. 변수 선택/해제
6. 스택바 차트 렌더링 확인

**예상 소요 시간:** 1시간

---

## 📝 우선순위 작업 목록

### 🔴 Critical (즉시 수정)
1. ✅ **작업 1-1:** 백엔드 범주형 변수 변환 수정
2. ✅ **작업 1-2:** 프론트엔드 null 체크 추가

### 🟡 High (1주일 내)
3. **작업 2-1:** 차트별 기본 변수 정의 업데이트
4. **작업 2-2:** 기본 변수 자동 선택 로직 추가
5. **작업 3-1:** PIFeatureSelector 개선

### 🟢 Medium (2주일 내)
6. **작업 4-1:** 백엔드 데이터 구조 검증 스크립트
7. **작업 4-2:** 프론트엔드 통합 테스트

---

## 📚 참고 자료

### 관련 파일 목록
- `server/app/api/precomputed.py` - 비교 분석 API
- `server/app/clustering/compare.py` - 비교 분석 로직
- `server/scripts/generate_cluster_comparisons.py` - 비교 데이터 생성
- `src/ui/profiling-ui-kit/components/comparison/PIStackedBarChart.tsx` - 스택바 차트
- `src/ui/profiling-ui-kit/components/comparison/PIComparisonView.tsx` - 비교 뷰
- `src/ui/profiling-ui-kit/components/comparison/PIFeatureSelector.tsx` - 변수 선택기
- `src/ui/profiling-ui-kit/components/comparison/featureSets.ts` - 변수 세트 정의
- `src/ui/profiling-ui-kit/components/comparison/types.ts` - 타입 정의

### 데이터베이스 스키마
- `merged.cluster_comparisons` 테이블
- `comparison_data` JSONB 컬럼 구조

---

## ✅ 체크리스트

### Phase 1 (Critical)
- [ ] 백엔드 범주형 변수 변환 수정
- [ ] 프론트엔드 null 체크 추가
- [ ] 스택바 차트 오류 해결 확인

### Phase 2 (High)
- [ ] 차트별 기본 변수 정의 업데이트
- [ ] 기본 변수 자동 선택 로직 추가
- [ ] 변수 선택 기능 테스트

### Phase 3 (Medium)
- [ ] PIFeatureSelector 개선
- [ ] 데이터 검증 스크립트 작성
- [ ] 통합 테스트 완료

---

**작성일:** 2025-01-27  
**작성자:** AI Assistant  
**버전:** 1.0

