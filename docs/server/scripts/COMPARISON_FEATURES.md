# 비교 분석에 활용된 변수 정리

## 📊 개요

클러스터 간 비교 분석에서 사용되는 변수들은 `server/app/clustering/compare.py`에 정의되어 있으며, 세 가지 타입으로 분류됩니다.

---

## 🔢 연속형 변수 (CONTINUOUS_FEATURES) - 6개

막대 차트로 평균값 비교에 사용됩니다.

| 변수명 | 설명 | 원본 변수 | 사용 목적 |
|--------|------|-----------|-----------|
| `Q6_income` | 소득액 (만원) | `Q6_income` | 두 그룹 간 평균 소득 비교 |
| `age` | 실제 나이 | `age` | 두 그룹 간 평균 연령 비교 |
| `Q8_count` | 전자제품 보유 수 | `Q8_count` | 두 그룹 간 평균 제품 수 비교 |
| `Q8_premium_index` | 프리미엄 제품 지수 (0~1) | `Q8_premium_index` | 두 그룹 간 프리미엄 지수 비교 |
| `drinking_types_count` | 음주 유형 수 | `drinking_types_count` | 두 그룹 간 음주 다양성 비교 |
| `smoking_types_count` | 흡연 유형 수 | `smoking_types_count` | 두 그룹 간 흡연 다양성 비교 |

**비교 방법:**
- 평균값 차이 (mean difference)
- 통계적 유의성 검정 (t-test)
- 효과 크기 (effect size)

---

## ✅ 이진형 변수 (BINARY_FEATURES) - 30개

히트맵으로 비율 차이를 시각화합니다.

### 디바이스/프리미엄 관련 (6개)
| 변수명 | 설명 | 비교 방법 |
|--------|------|-----------|
| `has_car` | 차량 보유 여부 | 비율 차이 (%) |
| `is_premium_car` | 프리미엄 차량 보유 | 비율 차이 (%) |
| `is_domestic_car` | 국산차 보유 | 비율 차이 (%) |
| `is_apple_user` | 애플 사용자 | 비율 차이 (%) |
| `is_samsung_user` | 삼성 사용자 | 비율 차이 (%) |
| `is_premium_phone` | 프리미엄 폰 보유 | 비율 차이 (%) |

### 상태/지역 관련 (6개)
| 변수명 | 설명 | 비교 방법 |
|--------|------|-----------|
| `is_employed` | 취업 여부 | 비율 차이 (%) |
| `is_unemployed` | 실업 여부 | 비율 차이 (%) |
| `is_student` | 학생 여부 | 비율 차이 (%) |
| `is_metro` | 수도권 거주 여부 | 비율 차이 (%) |
| `is_metro_city` | 광역시 거주 여부 | 비율 차이 (%) |
| `is_college_graduate` | 대졸 이상 여부 | 비율 차이 (%) |

### 음주 관련 (8개)
| 변수명 | 설명 | 비교 방법 |
|--------|------|-----------|
| `has_drinking_experience` | 음주 경험 여부 | 비율 차이 (%) |
| `drinks_beer` | 맥주 음주 | 비율 차이 (%) |
| `drinks_soju` | 소주 음주 | 비율 차이 (%) |
| `drinks_wine` | 와인 음주 | 비율 차이 (%) |
| `drinks_western` | 양주 음주 | 비율 차이 (%) |
| `drinks_makgeolli` | 막걸리 음주 | 비율 차이 (%) |
| `drinks_low_alcohol` | 저도수 음주 | 비율 차이 (%) |
| `drinks_cocktail` | 칵테일 음주 | 비율 차이 (%) |

### 흡연 관련 (5개)
| 변수명 | 설명 | 비교 방법 |
|--------|------|-----------|
| `has_smoking_experience` | 흡연 경험 여부 | 비율 차이 (%) |
| `smokes_regular` | 일반 담배 흡연 | 비율 차이 (%) |
| `smokes_heet` | 히트 흡연 | 비율 차이 (%) |
| `smokes_liquid` | 액상 흡연 | 비율 차이 (%) |
| `smokes_other` | 기타 흡연 | 비율 차이 (%) |

**비교 방법:**
- 비율 차이 (percentage difference)
- Lift (상대적 차이)
- 통계적 유의성 검정 (chi-square test)

---

## 📊 범주형 변수 (CATEGORICAL_FEATURES) - 7개

스택 바 차트(100% 구성비)로 분포 비교에 사용됩니다.

| 변수명 | 설명 | 비교 방법 |
|--------|------|-----------|
| `age_group` | 연령대 그룹 (10대, 20대 등) | 구성비 비교 (%) |
| `generation` | 세대 (MZ, X세대 등) | 구성비 비교 (%) |
| `family_type` | 가족 유형 (미혼, 기혼 등) | 구성비 비교 (%) |
| `children_category` | 자녀 카테고리 | 구성비 비교 (%) |
| `Q6_category` | 소득 카테고리 | 구성비 비교 (%) |
| `region_category` | 지역 카테고리 | 구성비 비교 (%) |
| `phone_segment` | 폰 세그먼트 | 구성비 비교 (%) |

**비교 방법:**
- 구성비 차이 (composition difference)
- 카테고리별 비율 비교
- 시각화: 스택 바 차트 (100% 구성)

---

## 📈 비교 분석 지표

### 연속형 변수 비교 지표
- **평균값 (Mean)**: 각 그룹의 평균
- **차이 (Difference)**: 그룹 A 평균 - 그룹 B 평균
- **Lift**: (그룹 A 평균 / 그룹 B 평균 - 1) × 100
- **t-test p-value**: 통계적 유의성
- **Effect Size**: Cohen's d

### 이진형 변수 비교 지표
- **비율 (Rate)**: 각 그룹의 True 비율
- **차이 (Difference)**: 그룹 A 비율 - 그룹 B 비율
- **Lift**: (그룹 A 비율 / 그룹 B 비율 - 1) × 100
- **chi-square p-value**: 통계적 유의성

### 범주형 변수 비교 지표
- **구성비 (Composition)**: 각 카테고리별 비율
- **차이 (Difference)**: 그룹 A 구성비 - 그룹 B 구성비
- **카테고리별 비교**: 각 카테고리에서의 비율 차이

---

## 🎯 실제 사용 예시

### 사전 클러스터링 비교 분석
`generate_precomputed_data.py`에서 모든 클러스터 쌍에 대해 비교 분석을 수행합니다:

```python
# 연속형 변수: 6개
CONTINUOUS_FEATURES = [
    "Q6_income", "age", "Q8_count", 
    "Q8_premium_index", "drinking_types_count", "smoking_types_count"
]

# 이진형 변수: 30개
BINARY_FEATURES = [
    "has_car", "is_premium_car", "is_domestic_car",
    "is_apple_user", "is_samsung_user", "is_premium_phone",
    "is_employed", "is_unemployed", "is_student",
    "is_metro", "is_metro_city", "is_college_graduate",
    "has_drinking_experience", "drinks_beer", "drinks_soju",
    "drinks_wine", "drinks_western", "drinks_makgeolli",
    "drinks_low_alcohol", "drinks_cocktail",
    "has_smoking_experience", "smokes_regular", "smokes_heet",
    "smokes_liquid", "smokes_other"
]

# 범주형 변수: 7개
CATEGORICAL_FEATURES = [
    "age_group", "generation", "family_type",
    "children_category", "Q6_category", "region_category", "phone_segment"
]
```

---

## 📊 총 변수 개수

- **연속형**: 6개
- **이진형**: 30개
- **범주형**: 7개
- **총계**: **43개 변수**

---

## 🔍 변수 선택 기준

### 연속형 변수 선택 기준
1. **의미 있는 수치**: 평균값 비교가 의미 있는 변수
2. **분포 정규성**: 정규 분포에 가까운 변수 우선
3. **해석 가능성**: 비즈니스 관점에서 해석 가능한 변수

### 이진형 변수 선택 기준
1. **명확한 이진 구분**: True/False가 명확한 변수
2. **비즈니스 중요도**: 의사결정에 중요한 변수
3. **다양성**: 다양한 카테고리에서 선택

### 범주형 변수 선택 기준
1. **의미 있는 카테고리**: 해석 가능한 카테고리 구조
2. **적절한 카테고리 수**: 너무 많지 않은 카테고리 (3~10개 권장)
3. **비즈니스 관련성**: 마케팅/분석에 유용한 변수

---

## 💡 활용 예시

### 예시 1: 클러스터 0 vs 클러스터 1 비교

**연속형 변수 결과:**
- `Q6_income`: 클러스터 0 평균 350만원 vs 클러스터 1 평균 280만원 (차이: +70만원)
- `age`: 클러스터 0 평균 32세 vs 클러스터 1 평균 28세 (차이: +4세)

**이진형 변수 결과:**
- `is_premium_car`: 클러스터 0 45% vs 클러스터 1 25% (차이: +20%, Lift: +80%)
- `has_drinking_experience`: 클러스터 0 80% vs 클러스터 1 65% (차이: +15%)

**범주형 변수 결과:**
- `age_group`: 클러스터 0은 30대 60%, 클러스터 1은 20대 70%
- `family_type`: 클러스터 0은 기혼 70%, 클러스터 1은 미혼 60%

---

**작성일**: 2025-01-15  
**파일 위치**: `server/app/clustering/compare.py`  
**사용 위치**: `server/app/clustering/generate_precomputed_data.py`

