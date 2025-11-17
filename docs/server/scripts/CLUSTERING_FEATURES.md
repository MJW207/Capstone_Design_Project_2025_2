# 클러스터링 사용 가능 변수 항목 정리

## 📊 전체 변수 개수
- **총 컬럼 수**: 123개
- **실제 사용 중**: 6개 (사전 클러스터링)
- **사용 가능 후보**: 약 30개 이상

---

## 🎯 현재 사용 중인 변수 (6개)

### 기본 인구통계 (3개)
| 변수명 | 타입 | 설명 | 원본 변수 |
|--------|------|------|-----------|
| `age_scaled` | 연속형 (표준화) | 연령 | `age` |
| `Q6_scaled` | 연속형 (표준화) | 소득 수준 | `Q6_income` |
| `education_level_scaled` | 연속형 (표준화) | 학력 수준 | `Q7` |

### 소비/제품 (3개)
| 변수명 | 타입 | 설명 | 계산 방법 |
|--------|------|------|-----------|
| `Q8_count_scaled` | 연속형 (표준화) | 전자제품 보유 수 | `Q8_count` |
| `Q8_premium_index` | 연속형 (0~1) | 프리미엄 제품 지수 | `Q8_premium_count / (Q8_count + 1)` |
| `is_premium_car` | 이진형 (0/1) | 프리미엄 차량 보유 여부 | `Q8` 배열에서 차량 ID 포함 여부 |

---

## 📋 사용 가능한 변수 카테고리별 정리

### 1. 인구통계 변수

#### 연령 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `age` | 연속형 | 실제 나이 | ✅ (표준화 필요) |
| `age_scaled` | 연속형 (표준화) | 표준화된 연령 | ✅ **현재 사용 중** |
| `age_group` | 범주형 | 연령대 그룹 (10대, 20대 등) | ✅ |
| `generation` | 범주형 | 세대 (MZ, X세대 등) | ✅ |

#### 소득 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `Q6` | 범주형 | 소득 구간 (1~11) | ✅ |
| `Q6_income` | 연속형 | 소득액 (만원) | ✅ (표준화 필요) |
| `Q6_scaled` | 연속형 (표준화) | 표준화된 소득 | ✅ **현재 사용 중** |
| `Q6_log` | 연속형 | 로그 변환 소득 | ✅ |
| `Q6_category` | 범주형 | 소득 카테고리 | ✅ |
| `Q6_label` | 범주형 | 소득 라벨 | ✅ |

#### 학력 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `Q7` | 범주형 | 학력 수준 | ✅ |
| `Q7_numeric` | 연속형 | 학력 (숫자) | ✅ |
| `education_level` | 범주형 | 학력 레벨 | ✅ |
| `education_level_scaled` | 연속형 (표준화) | 표준화된 학력 | ✅ **현재 사용 중** |
| `is_college_graduate` | 이진형 | 대졸 이상 여부 | ✅ |
| `Q7_Q6_diff` | 연속형 | 학력-소득 차이 | ✅ |

#### 지역 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `is_metro` | 이진형 | 수도권 거주 여부 | ✅ |
| `is_metro_city` | 이진형 | 광역시 거주 여부 | ✅ |
| `region_category` | 범주형 | 지역 카테고리 | ✅ |
| `full_address` | 텍스트 | 전체 주소 | ❌ (텍스트) |

---

### 2. 가족/생활 변수

| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `has_children` | 이진형 | 자녀 유무 | ✅ |
| `children_category` | 범주형 | 자녀 카테고리 | ✅ |
| `children_category_ordinal` | 순서형 | 자녀 수 (순서) | ✅ |
| `family_type` | 범주형 | 가족 유형 | ✅ |
| `family_type_기혼_자녀있음` | 이진형 | 기혼 자녀있음 | ✅ |
| `Q1` | 범주형 | 결혼 여부 | ✅ |
| `Q1_label` | 범주형 | 결혼 여부 라벨 | ✅ |

---

### 3. 직업/경제활동 변수

| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `Q5` | 범주형 | 직업 | ✅ |
| `Q5_label` | 범주형 | 직업 라벨 | ✅ |
| `is_employed` | 이진형 | 취업 여부 | ✅ |
| `is_unemployed` | 이진형 | 실업 여부 | ✅ |
| `is_student` | 이진형 | 학생 여부 | ✅ |

---

### 4. 소비/제품 변수

#### 전자제품 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `Q8_count` | 연속형 | 전자제품 보유 수 | ✅ (표준화 필요) |
| `Q8_count_scaled` | 연속형 (표준화) | 표준화된 전자제품 수 | ✅ **현재 사용 중** |
| `Q8_count_category` | 범주형 | 전자제품 수 카테고리 | ✅ |
| `Q8_premium_count` | 연속형 | 프리미엄 제품 수 | ✅ |
| `Q8_premium_index` | 연속형 (0~1) | 프리미엄 제품 지수 | ✅ **현재 사용 중** |
| `Q8_premium_category` | 범주형 | 프리미엄 제품 카테고리 | ✅ |
| `Q8_1`, `Q8_2`, `Q8_4`, `Q8_5`, `Q8_8`, `Q8_9`, `Q8_18`, `Q8_20`, `Q8_22`, `Q8_25` | 이진형 | 특정 제품 보유 여부 | ✅ |

#### 스마트폰 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `is_apple_user` | 이진형 | 애플 사용자 | ✅ |
| `is_samsung_user` | 이진형 | 삼성 사용자 | ✅ |
| `is_premium_phone` | 이진형 | 프리미엄 폰 보유 | ✅ |
| `phone_segment` | 범주형 | 폰 세그먼트 | ✅ |
| `Q9_1_mapped` | 범주형 | 폰 매핑 | ✅ |
| `Q9_1_label` | 범주형 | 폰 라벨 | ✅ |

#### 차량 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `has_car` | 이진형 | 차량 보유 여부 | ✅ |
| `is_premium_car` | 이진형 | 프리미엄 차량 보유 | ✅ **현재 사용 중** |
| `is_domestic_car` | 이진형 | 국산차 보유 | ✅ |
| `Q11_1_label` | 범주형 | 차량 라벨 | ✅ |
| `Q11_1_category` | 범주형 | 차량 카테고리 | ✅ |

---

### 5. 라이프스타일 변수

#### 흡연 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `has_smoking_experience` | 이진형 | 흡연 경험 여부 | ✅ |
| `smokes_regular` | 이진형 | 일반 담배 흡연 | ✅ |
| `smokes_heet` | 이진형 | 히트 흡연 | ✅ |
| `smokes_liquid` | 이진형 | 액상 흡연 | ✅ |
| `smokes_other` | 이진형 | 기타 흡연 | ✅ |
| `smoking_types_count` | 연속형 | 흡연 유형 수 | ✅ |
| `uses_heet_device` | 이진형 | 히트 기기 사용 | ✅ |
| `uses_iqos` | 이진형 | IQOS 사용 | ✅ |
| `uses_lil` | 이진형 | LIL 사용 | ✅ |
| `uses_glo` | 이진형 | GLO 사용 | ✅ |
| `Q12_label` | 범주형 | 흡연 라벨 | ✅ |
| `Q12_category` | 범주형 | 흡연 카테고리 | ✅ |

#### 음주 관련
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `has_drinking_experience` | 이진형 | 음주 경험 여부 | ✅ |
| `drinks_beer` | 이진형 | 맥주 음주 | ✅ |
| `drinks_soju` | 이진형 | 소주 음주 | ✅ |
| `drinks_wine` | 이진형 | 와인 음주 | ✅ |
| `drinks_western` | 이진형 | 양주 음주 | ✅ |
| `drinks_makgeolli` | 이진형 | 막걸리 음주 | ✅ |
| `drinks_low_alcohol` | 이진형 | 저도수 음주 | ✅ |
| `drinks_cocktail` | 이진형 | 칵테일 음주 | ✅ |
| `drinks_sake` | 이진형 | 사케 음주 | ✅ |
| `drinking_types_count` | 연속형 | 음주 유형 수 | ✅ |
| `Q13_label` | 범주형 | 음주 라벨 | ✅ |
| `Q13_category` | 범주형 | 음주 카테고리 | ✅ |

#### 흡연+음주 조합
| 변수명 | 타입 | 설명 | 사용 가능성 |
|--------|------|------|------------|
| `smoking_drinking_combo` | 범주형 | 흡연+음주 조합 | ✅ |
| `smoking_drinking_label` | 범주형 | 흡연+음주 라벨 | ✅ |

---

## 🔧 변수 타입별 사용 가이드

### 연속형 변수 (Continuous)
- **표준화 필요**: `StandardScaler` 사용
- 예: `age`, `Q6_income`, `Q8_count`
- 표준화 후: `age_scaled`, `Q6_scaled`, `Q8_count_scaled`

### 이진형 변수 (Binary)
- **그대로 사용 가능**: 0/1 또는 True/False
- 예: `is_premium_car`, `has_children`, `is_metro`

### 범주형 변수 (Categorical)
- **원-핫 인코딩 필요**: `pd.get_dummies()` 또는 `OneHotEncoder`
- 예: `age_group`, `family_type`, `region_category`

### 순서형 변수 (Ordinal)
- **그대로 사용 가능** 또는 **표준화**
- 예: `children_category_ordinal`, `Q7_numeric`

---

## 📊 현재 사용 중인 피처 조합

### 사전 클러스터링 (6개)
```python
features = [
    'age_scaled',              # 연령
    'Q6_scaled',               # 소득
    'education_level_scaled',  # 학력
    'Q8_count_scaled',         # 전자제품 수
    'Q8_premium_index',        # 프리미엄 지수
    'is_premium_car',          # 프리미엄 차량
]
```

### 확장 가능한 피처 조합 (15개)
```python
features = [
    # 인구통계
    'age_scaled',
    'Q6_scaled',
    'education_level_scaled',
    'is_metro',
    
    # 가족
    'has_children',
    'children_category_ordinal',
    
    # 소비
    'is_premium_car',
    'is_premium_phone',
    'is_apple_user',
    'has_car',
    'Q8_premium_count',
    
    # 라이프스타일
    'has_drinking_experience',
    'drinking_types_count',
    'has_smoking_experience',
    'is_college_graduate',
]
```

---

## 🎯 피처 선택 기준

### 필터링 조건
1. **결측치 비율**: 30% 이하
2. **분산**: 0.01 이상 (변동성 있음)
3. **데이터 타입**: 숫자형 또는 이진형

### 권장 피처 수
- **최소**: 3개 이상
- **권장**: 6~15개
- **최대**: 20개 이하 (차원의 저주 방지)

---

## 📝 변수 추가 시 주의사항

1. **표준화 필요 여부 확인**
   - 연속형 변수는 반드시 표준화
   - 이진형 변수는 표준화 불필요

2. **상관관계 확인**
   - 높은 상관관계 변수는 하나만 선택
   - 예: `Q6_income`과 `Q6_scaled`는 동시 사용 지양

3. **의미 있는 변수 선택**
   - 클러스터링 목적에 맞는 변수 선택
   - 노이즈가 적은 변수 우선

---

## 🔍 변수별 상세 설명

### Q6 (소득)
- `Q6`: 소득 구간 (1~11)
- `Q6_income`: 실제 소득액 (만원)
- `Q6_scaled`: 표준화된 소득

### Q7 (학력)
- `Q7`: 학력 수준 (범주)
- `education_level`: 학력 레벨
- `education_level_scaled`: 표준화된 학력

### Q8 (전자제품)
- `Q8`: 전자제품 리스트 (JSON 배열)
- `Q8_count`: 보유 제품 수
- `Q8_premium_count`: 프리미엄 제품 수
- `Q8_premium_index`: 프리미엄 비율

---

**작성일**: 2025-01-15  
**데이터 소스**: `clustering_data/data/welcome_1st_2nd_joined.csv`  
**총 변수 수**: 123개

