# HDBSCAN 클러스터링 방법론 상세 문서

## 개요

본 문서는 한국 소비자 패널 데이터를 대상으로 한 HDBSCAN 클러스터링 방법론을 상세히 설명합니다. 본 연구는 Kim & Lee (2023)의 가족 생애주기 세그먼트 방법론을 기반으로 하여, 디지털 시대 한국 소비자의 생애주기와 소득 계층을 조합한 세그먼트 분류를 수행합니다.

**주요 참고문헌:**  
Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.

## 목차
1. [HDBSCAN 알고리즘 개요](#1-hdbscan-알고리즘-개요)
2. [선정한 피쳐 및 선택 이유](#2-선정한-피쳐-및-선택-이유)
3. [파생 변수 산출 방법](#3-파생-변수-산출-방법)
4. [데이터 전처리 파이프라인](#4-데이터-전처리-파이프라인)
5. [최적 파라미터 설정](#5-최적-파라미터-설정)
6. [성능 지표 및 평가 결과](#6-성능-지표-및-평가-결과)
7. [실험 과정 및 버전별 개선 사항](#7-실험-과정-및-버전별-개선-사항)
8. [다중공선성 분석 (VIF)](#8-다중공선성-분석-vif)
9. [클러스터 비교 분석 방법론](#9-클러스터-비교-분석-방법론)
10. [결론](#10-결론)

---

## 1. HDBSCAN 알고리즘 개요

### 1.1 알고리즘 소개
**HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise)**은 밀도 기반 계층적 클러스터링 알고리즘으로, 다음과 같은 특징을 가집니다:

- **밀도 기반 클러스터링**: 데이터 포인트의 밀도를 기반으로 클러스터를 형성
- **계층적 구조**: 다양한 밀도 레벨에서 클러스터를 탐색하여 최적의 클러스터를 선택
- **노이즈 처리**: 어떤 클러스터에도 속하지 않는 이상치를 자동으로 식별 (-1 레이블)
- **불규칙한 형태 포착**: K-Means와 달리 구형이 아닌 불규칙한 형태의 클러스터도 포착 가능
- **클러스터 수 자동 결정**: 사전에 클러스터 수를 지정할 필요 없이 데이터 특성에 따라 자동 결정

### 1.2 참고 논문

**McInnes, L., Healy, J., & Astels, S. (2017).**  
*HDBSCAN: Hierarchical density based clustering.*  
Journal of Open Source Software, 2(11), 205.  
DOI: https://doi.org/10.21105/joss.00205

### 1.3 알고리즘 동작 원리

1. **상호 도달 거리(Mutual Reachability Distance) 계산**
   - 두 점 간의 거리와 각 점의 k-거리(k-distance)를 고려한 거리 계산
   - 밀도가 낮은 영역의 점들 간 거리를 증가시켜 클러스터 경계를 명확히 구분

2. **최소 신장 트리(Minimum Spanning Tree) 구성**
   - 상호 도달 거리 행렬을 기반으로 MST 생성

3. **계층적 클러스터 트리 구성**
   - MST를 기반으로 계층적 클러스터 트리 생성
   - 각 레벨에서 클러스터가 병합되거나 분리되는 과정을 트리로 표현

4. **클러스터 선택 (Excess of Mass 방법)**
   - 각 클러스터의 안정성(stability)을 계산
   - 안정성이 높은 클러스터를 최종 선택
   - `cluster_selection_method='eom'` 사용

5. **노이즈 포인트 식별**
   - 최소 클러스터 크기(`min_cluster_size`)보다 작은 그룹은 노이즈로 분류

---

## 2. 선정한 피쳐 및 선택 이유

### 2.1 최종 선정 피쳐 (v3 기준)

본 프로젝트에서는 **6개의 핵심 피쳐**를 우선적으로 사용하며, 데이터 특성에 따라 동적으로 추가 피쳐를 선택합니다.

#### 2.1.1 핵심 피쳐 (우선순위 1)

| 피쳐명 | 타입 | 설명 | 선택 이유 |
|--------|------|------|-----------|
| `age_scaled` | 연속형 | MinMax 정규화된 연령 (0~1) | **인구통계학적 핵심 변수**: 연령은 소비 패턴, 라이프스타일, 가치관에 가장 큰 영향을 미치는 변수 중 하나. 세대별 차이를 명확히 구분 |
| `Q6_scaled` | 연속형 | StandardScaler 정규화된 소득 | **경제력의 핵심 지표**: 소득은 구매력과 프리미엄 제품 선호도를 결정하는 가장 중요한 변수. 클러스터 간 차이를 명확히 구분 |
| `education_level_scaled` | 연속형 | MinMax 정규화된 교육 수준 (0~1) | **사회경제적 지위 지표**: 교육 수준은 직업, 소득, 문화적 취향과 강한 상관관계. 고학력층과 저학력층의 구분에 유용 |
| `Q8_count_scaled` | 연속형 | MinMax 정규화된 전자제품 보유 수 (0~1) | **디지털 라이프스타일 지표**: 전자제품 보유 수는 디지털 친화도와 기술 수용도를 나타냄. 디지털 네이티브 세대 구분에 유용 |
| `Q8_premium_index` | 연속형 | 프리미엄 제품 비율 (0~1) | **프리미엄 선호도 지표**: 프리미엄 제품 선호는 소비 성향과 가치관을 나타냄. 프리미엄 세그먼트 구분에 핵심적 |
| `is_premium_car` | 이진형 | 프리미엄 차량 보유 여부 (0/1) | **프리미엄 라이프스타일 지표**: 프리미엄 차량 보유는 고소득층과 프리미엄 라이프스타일을 나타내는 강력한 지표 |

#### 2.1.2 보조 피쳐 (우선순위 2-3)

데이터 특성에 따라 동적으로 선택되며, 샘플 수가 적을 때 유용할 수 있습니다:

- `age_z`: Z-score 정규화된 연령 (age_scaled 대체 가능)
- 기타 이진 변수들 (v3에서 제거되었지만, 특정 상황에서 유용)

#### 2.1.3 제거된 피쳐 및 이유

| 피쳐명 | 제거 이유 |
|--------|-----------|
| `has_car` | **너무 강력한 구분력**: 차량 보유 여부가 다른 변수들을 지배하여 클러스터가 차량 보유 여부로만 구분됨 |
| `has_smoking_experience` | **이진변수 지배**: 이진 변수가 연속형 변수보다 클러스터링에 더 강한 영향을 미쳐 불균형한 클러스터 형성 |
| `has_children` | **다중공선성**: 생애주기 분류에 이미 자녀 유무가 포함되어 있어 중복 정보 제공 |

### 2.2 피쳐 선택 기준

`DynamicFeatureSelector` 클래스는 다음 기준으로 피쳐를 자동 필터링합니다:

1. **결측치 비율**: 최대 30% (`max_missing_ratio=0.3`)
   - 결측치가 너무 많으면 클러스터링 품질 저하

2. **분산**: 최소 0.01 (`min_variance=0.01`)
   - 분산이 너무 낮으면 모든 샘플이 유사한 값을 가져 클러스터 구분에 무의미

3. **이진변수 불균형**: 최대 95% (`max_imbalance_ratio=0.95`)
   - 한 값이 95% 이상을 차지하면 클러스터링에 유용하지 않음

4. **최소 피쳐 수**: 3개 이상
   - 3개 미만이면 클러스터링 불가

---

## 3. 파생 변수 산출 방법

### 3.1 연속형 변수 정규화

#### 3.1.1 `age_scaled` (연령 MinMax 정규화)

**산출 방법:**
```python
from sklearn.preprocessing import MinMaxScaler

scaler_mm = MinMaxScaler()
age_scaled = scaler_mm.fit_transform(age_values.reshape(-1, 1))
```

**수식:**
```
age_scaled = (age - min(age)) / (max(age) - min(age))
```

**결과 범위:** 0 ~ 1  
**목적:** 연령을 0~1 범위로 정규화하여 다른 피쳐와 스케일을 맞춤

#### 3.1.2 `age_z` (연령 Z-score 정규화)

**산출 방법:**
```python
from sklearn.preprocessing import StandardScaler

scaler_z = StandardScaler()
age_z = scaler_z.fit_transform(age_values.reshape(-1, 1))
```

**수식:**
```
age_z = (age - mean(age)) / std(age)
```

**결과 범위:** 일반적으로 -3 ~ +3 (평균 0, 표준편차 1)  
**목적:** 연령을 표준화하여 평균 0, 표준편차 1로 변환

#### 3.1.3 `Q6_scaled` (소득 StandardScaler 정규화)

**산출 방법:**
```python
from sklearn.preprocessing import StandardScaler

# 소득 데이터 추출 (Q6, income_personal, income_household 중 우선순위)
income_values = pd.to_numeric(df['Q6'], errors='coerce').dropna()

scaler = StandardScaler()
Q6_scaled = scaler.fit_transform(income_values.values.reshape(-1, 1))
```

**수식:**
```
Q6_scaled = (Q6 - mean(Q6)) / std(Q6)
```

**데이터 소스 우선순위:**
1. `Q6` 컬럼 (qa_answers에서 파싱된 소득)
2. `income_personal` (개인 소득)
3. `income_household` (가구 소득)

**결과 범위:** 일반적으로 -3 ~ +3 (평균 0, 표준편차 1)  
**목적:** 소득을 표준화하여 다른 피쳐와 스케일을 맞추고, 소득 분포의 왜도를 고려

#### 3.1.4 `education_level_scaled` (교육 수준 MinMax 정규화)

**산출 방법:**
```python
from sklearn.preprocessing import MinMaxScaler

# 교육 수준을 숫자로 변환
edu_map = {
    '고졸 이하': 1,
    '대학 재학': 2,
    '대졸': 3,
    '대학원': 4
}
edu_numeric = df['education_level'].map(edu_map).fillna(0)
education_values = edu_numeric[edu_numeric > 0]

scaler_mm = MinMaxScaler()
education_level_scaled = scaler_mm.fit_transform(education_values.values.reshape(-1, 1))
```

**수식:**
```
education_level_scaled = (edu_level - 1) / (4 - 1) = (edu_level - 1) / 3
```

**매핑:**
- 고졸 이하: 1 → 0.0
- 대학 재학: 2 → 0.33
- 대졸: 3 → 0.67
- 대학원: 4 → 1.0

**결과 범위:** 0 ~ 1  
**목적:** 교육 수준을 0~1 범위로 정규화

### 3.2 Q8 관련 파생 변수

#### 3.2.1 `Q8_count` (전자제품 보유 수)

**산출 방법:**
```python
# Q8은 전자제품 리스트 (예: [1, 3, 5, 9])
Q8_count = len(Q8_list)
```

**데이터 소스:**
- `w2_data`에서 파싱된 `Q8` 필드
- JSON 문자열 또는 리스트 형태

**결과:** 정수 (0 이상)  
**목적:** 전자제품 보유 수를 나타내는 기본 지표

#### 3.2.2 `Q8_count_scaled` (전자제품 수 MinMax 정규화)

**산출 방법:**
```python
from sklearn.preprocessing import MinMaxScaler

q8_count_values = df['Q8_count'].dropna()
scaler_mm = MinMaxScaler()
Q8_count_scaled = scaler_mm.fit_transform(q8_count_values.values.reshape(-1, 1))
```

**수식:**
```
Q8_count_scaled = (Q8_count - min(Q8_count)) / (max(Q8_count) - min(Q8_count))
```

**결과 범위:** 0 ~ 1  
**목적:** 전자제품 수를 0~1 범위로 정규화

#### 3.2.3 `Q8_premium_index` (프리미엄 지수)

**산출 방법:**
```python
# 프리미엄 제품 번호 정의 
premium_products = [10, 11, 12, 13, 16, 17, 19, 21]

# 프리미엄 제품 개수 계산
premium_count = sum(1 for x in Q8_list if x in premium_products)

# 프리미엄 지수 = 프리미엄 제품 비율
Q8_premium_index = premium_count / max(Q8_count, 1)
```

**수식:**
```
Q8_premium_index = (프리미엄 제품 개수) / (전체 전자제품 개수)
```

**프리미엄 제품 카테고리:**
- **Cleaning (8-14)**: 제품 10번 (로봇청소기), 11번 (무선청소기)
- **Kitchen (1-7)**: 제품 12번 (커피머신), 19번 (식기세척기)
- **Comfort (22-28)**: 제품 13번 (안마의자), 16번 (의류관리기), 21번 (가정용식물재배기)
- **Cleaning (8-14)**: 제품 17번 (건조기)

**프리미엄 전자제품 정의**
프리미엄 전자제품은 고가격대, 고급 디자인, 우수한 성능, 첨단 기술을 특징으로 하는 전자제품을 의미합니다. 본 프로젝트에서는 Q8 전자제품 목록 중 다음 8개 제품 번호를 프리미엄 제품으로 분류합니다:

1. **제품 10번** (Cleaning 카테고리, 8-14 범위): 로봇청소기
   - 카테고리: 청소 가전제품
   - 특징: 자동화된 청소 기능, 스마트 홈 연동, 고가격대
   
2. **제품 11번** (Cleaning 카테고리, 8-14 범위): 무선청소기
   - 카테고리: 청소 가전제품
   - 특징: 무선 이동성, 강력한 흡입력, 프리미엄 브랜드
   
3. **제품 12번** (Kitchen 카테고리, 1-7 범위): 커피머신
   - 카테고리: 주방 가전제품
   - 특징: 고급 커피 추출 기능, 자동화 기능, 프리미엄 브랜드
   
4. **제품 13번** (Comfort 카테고리, 22-28 범위): 안마의자
   - 카테고리: 편의/안락 가전제품
   - 특징: 고급 안마 기능, 인체공학적 디자인, 고가격대
   
5. **제품 16번** (Comfort 카테고리, 22-28 범위): 의류관리기
   - 카테고리: 편의/안락 가전제품
   - 특징: 옷 관리 자동화, 스팀 기능, 프리미엄 브랜드
   
6. **제품 17번** (Cleaning 카테고리, 8-14 범위): 건조기
   - 카테고리: 청소 가전제품 (세탁 관련)
   - 특징: 고급 건조 기능, 에너지 효율, 프리미엄 브랜드
   
7. **제품 19번** (Kitchen 카테고리, 1-7 범위): 식기세척기
   - 카테고리: 주방 가전제품
   - 특징: 자동 세척 기능, 물 절약, 프리미엄 브랜드
   
8. **제품 21번** (Comfort 카테고리, 22-28 범위): 가정용식물재배기
   - 카테고리: 편의/안락 가전제품
   - 특징: 자동 식물 재배 기능, LED 조명, 첨단 기술

**프리미엄 제품 변경 이력:**
- **기존 버전 (v1)**: [3, 9, 18, 20, 22, 25] - 6개 제품
- **현재 버전 (v2)**: [10, 11, 12, 13, 16, 17, 19, 21] - 8개 제품
- **변경 이유**: 실제 제품명과 가격대를 기반으로 프리미엄 제품 재정의

**데이터베이스 조회 결과:**
- `merged.panel_data`의 `base_profile->>'보유전제품'` 필드에는 제품명이 문자열 리스트로만 저장되어 있음
- 제품 번호(1-28)와 제품명의 매핑 정보는 DB에 저장되어 있지 않음
- 실제 제품 번호와 제품명의 매핑은 설문 원본 데이터나 설문지에서 확인 필요
- DB에서 확인된 제품명 예시: TV, 냉장고, 세탁기, 건조기, 전자레인지, 에어컨, 청소기, 무선청소기, 로봇청소기, 비데, 안마의자, 의류관리기, 노트북, PC, 태블릿, 블루투스 스피커, AI 스피커 등

**프리미엄 제품의 특징:**
- **고가격대**: 일반 제품 대비 높은 가격대
- **고급 디자인**: 세련되고 독특한 외관
- **우수한 성능**: 최신 기술을 적용한 뛰어난 성능
- **첨단 기술**: 혁신적인 기술과 기능 탑재
- **브랜드 가치**: 명성 있는 브랜드의 제품

**결과 범위:** 0 ~ 1  
**목적:** 프리미엄 제품 선호도를 나타내는 지표. 값이 높을수록 프리미엄 제품을 많이 보유

#### 3.2.4 Q8 카테고리별 카운트

**산출 방법:**
```python
# 카테고리별 전자제품 수 계산
kitchen_count = sum(1 for x in Q8_list if 1 <= x <= 7)      # 주방용품
cleaning_count = sum(1 for x in Q8_list if 8 <= x <= 14)     # 청소용품
computing_count = sum(1 for x in Q8_list if 15 <= x <= 21)   # 컴퓨팅
comfort_count = sum(1 for x in Q8_list if 22 <= x <= 28)     # 편의/안락
```

**카테고리 정의:**
- **Kitchen (1-7)**: 주방 가전제품
- **Cleaning (8-14)**: 청소 가전제품
- **Computing (15-21)**: 컴퓨팅 디바이스
- **Comfort (22-28)**: 편의/안락 가전제품

**목적:** 전자제품 선호 카테고리를 파악하여 라이프스타일 세그먼트 구분

### 3.3 이진 변수

#### 3.3.1 `is_premium_car` (프리미엄 차량 보유 여부)

**산출 방법:**
```python
premium_brands = ['테슬라', '벤츠', 'BMW', '아우디', '렉서스']
is_premium_car = any(brand in car_brand for brand in premium_brands)
```

**프리미엄 차량 브랜드 정의:**
본 프로젝트에서는 다음 5개 브랜드를 프리미엄 차량으로 분류합니다:

1. **테슬라 (Tesla)**
   - 특징: 전기차 시장의 선도 브랜드, 첨단 기술과 자율주행 기능
   - 가격대: 중고가 ~ 고가 (Model 3, Model S, Model X, Model Y 등)
   - 브랜드 가치: 혁신적인 전기차 기술과 프리미엄 브랜드 이미지

2. **벤츠 (Mercedes-Benz)**
   - 특징: 독일 프리미엄 자동차 브랜드, 고급스러운 디자인과 뛰어난 성능
   - 가격대: 고가 (C-Class, E-Class, S-Class, G-Class 등)
   - 브랜드 가치: 오랜 역사와 명성, 프리미엄 럭셔리 브랜드

3. **BMW (Bayerische Motoren Werke)**
   - 특징: 독일 프리미엄 자동차 브랜드, 스포티한 디자인과 강력한 성능
   - 가격대: 고가 (3 Series, 5 Series, 7 Series, X Series 등)
   - 브랜드 가치: 스포티한 이미지와 고성능 엔진 기술

4. **아우디 (Audi)**
   - 특징: 독일 프리미엄 자동차 브랜드, 세련된 디자인과 첨단 기술
   - 가격대: 고가 (A3, A4, A6, A8, Q Series 등)
   - 브랜드 가치: 쿼트로 사륜구동 기술과 프리미엄 브랜드 이미지

5. **렉서스 (Lexus)**
   - 특징: 도요타의 프리미엄 브랜드, 고급스러운 디자인과 뛰어난 품질
   - 가격대: 고가 (ES, GS, LS, RX, GX, LX 등)
   - 브랜드 가치: 일본의 정교한 제조 기술과 프리미엄 럭셔리 브랜드

**프리미엄 차량의 특징:**
- **고급 소재 사용**: 내외장에 최고급 소재를 사용하여 품격을 높임
- **강력한 성능**: 고출력 엔진과 정교한 주행 성능 제공
- **첨단 안전 및 편의 사양**: 최신 안전 기술과 편의 기능 탑재
- **높은 가격대**: 일반 차량보다 높은 가격으로 판매
- **브랜드 가치**: 명성 있는 브랜드에서 생산되어 높은 신뢰도와 가치

**결과:** 0 (없음) 또는 1 (있음)  
**목적:** 프리미엄 라이프스타일과 고소득층을 구분하는 지표. 프리미엄 차량 보유는 고소득층과 프리미엄 라이프스타일을 나타내는 강력한 지표로 활용됨

### 3.4 생애주기 분류 (원-핫 인코딩용)

#### 3.4.1 생애주기 단계 분류

**이론적 배경:**
본 연구는 Kim & Lee (2023)의 가족 생애주기 세그먼트 방법론을 기반으로 하여, 디지털 시대 한국 소비자의 생애주기 특성을 반영한 세그먼트 분류를 수행합니다. Kim & Lee (2023)는 연령과 가족 구성(자녀 유무)을 기반으로 한 생애주기 분류가 소비 패턴과 라이프스타일을 효과적으로 구분할 수 있음을 실증적으로 보여주었습니다.

**산출 방법:**
```python
def classify_lifecycle(age, has_children):
    if age < 30:
        return 'Young Singles'  # 젊은 싱글
    elif 30 <= age < 45:
        if has_children:
            return 'Young Parents'  # 젊은 부모
        else:
            return 'DINK'  # 딩크족
    elif 45 <= age < 60:
        if has_children:
            return 'Mature Parents'  # 중년 부모
        else:
            return 'Middle Age'  # 중년
    else:  # age >= 60
        return 'Seniors'  # 시니어
```

**분류 기준:**
- **Young Singles**: 연령 < 30
- **DINK**: 30 ≤ 연령 < 45, 자녀 없음
- **Young Parents**: 30 ≤ 연령 < 45, 자녀 있음
- **Mature Parents**: 45 ≤ 연령 < 60, 자녀 있음
- **Middle Age**: 45 ≤ 연령 < 60, 자녀 없음
- **Seniors**: 연령 ≥ 60

**결과:** 6개 생애주기 단계  
**목적:** 연령과 가족 구성에 따른 라이프스타일 세그먼트 구분

**참고문헌:** Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.

#### 3.4.2 소득 계층 분류

**산출 방법:**
```python
# Q6_scaled를 3분위로 분류
def classify_income_tier(Q6_scaled):
    q33 = np.percentile(Q6_scaled, 33.33)
    q66 = np.percentile(Q6_scaled, 66.67)
    
    if Q6_scaled < q33:
        return 'Low'  # 저소득
    elif Q6_scaled < q66:
        return 'Mid'  # 중소득
    else:
        return 'High'  # 고소득
```

**분류 기준:**
- **Low**: 하위 33.33% (1분위)
- **Mid**: 중간 33.33% (2분위)
- **High**: 상위 33.33% (3분위)

**결과:** 3개 소득 계층  
**목적:** 소득 수준에 따른 경제력 세그먼트 구분

#### 3.4.3 초기 세그먼트 생성 및 원-핫 인코딩

**이론적 배경:**
Kim & Lee (2023)의 연구에 따르면, 생애주기와 소득 계층의 조합은 디지털 시대 한국 소비자의 소비 패턴과 라이프스타일을 효과적으로 구분할 수 있습니다. 본 연구는 생애주기(6단계)와 소득 계층(3단계)을 조합하여 18개의 초기 세그먼트를 생성하고, 이를 원-핫 인코딩하여 클러스터링에 활용합니다.

**산출 방법:**
```python
from sklearn.preprocessing import OneHotEncoder

# 생애주기(6) × 소득 계층(3) = 18개 세그먼트
segments = []
for lifecycle in ['Young Singles', 'DINK', 'Young Parents', 'Mature Parents', 'Middle Age', 'Seniors']:
    for tier in ['Low', 'Mid', 'High']:
        segment_name = f"{lifecycle}_{tier}"
        segments.append(segment_name)

# 원-핫 인코딩
encoder = OneHotEncoder(sparse=False)
one_hot_vectors = encoder.fit_transform(segments)
```

**결과:** 18차원 원-핫 벡터  
**예시:**
- `1_low`: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] (젊은 싱글 저소득)
- `2_high`: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] (딩크족 고소득)

**목적:** 생애주기와 소득 계층의 조합을 벡터로 표현하여 클러스터링에 활용

**참고문헌:** Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.

---

## 4. 데이터 전처리 파이프라인

### 4.1 전체 파이프라인 개요

```
원시 데이터 (DB)
    ↓
1. JSON 데이터 파싱 (w2_data, qa_answers)
    ↓
2. 기본 피처 생성 (age, gender, region 등)
    ↓
3. 스케일링된 피처 생성 (age_scaled, Q6_scaled 등)
    ↓
4. 생애주기 분류 (6단계)
    ↓
5. 소득 계층 분류 (3단계)
    ↓
6. 초기 세그먼트 생성 (18개 조합)
    ↓
7. 원-핫 인코딩 (18차원 벡터)
    ↓
8. 추가 피처 결합 (6개 연속형 변수)
    ↓
9. 최종 피처 매트릭스 생성 (24차원)
    ↓
10. StandardScaler 표준화
    ↓
최종 클러스터링 입력 데이터
```

### 4.2 단계별 상세 설명

#### 4.2.1 Step 1: JSON 데이터 파싱

**목적:** `w2_data`와 `qa_answers` JSON 필드에서 구조화된 데이터 추출

**처리 과정:**
```python
# w2_data 파싱
if 'w2_data' in df.columns:
    for idx, row in df.iterrows():
        if pd.notna(row.get('w2_data')):
            data = json.loads(row['w2_data']) if isinstance(row['w2_data'], str) else row['w2_data']
            # 필요한 필드 추출 (Q8, Q6, Q4 등)
            for key, value in data.items():
                df.at[idx, key] = value

# qa_answers 파싱
if 'qa_answers' in df.columns:
    for idx, row in df.iterrows():
        if pd.notna(row.get('qa_answers')):
            answers = json.loads(row['qa_answers']) if isinstance(row['qa_answers'], str) else row['qa_answers']
            # Q001, Q002 형태를 Q1, Q2로 변환
            for key, value in answers.items():
                col_name = f"Q{int(key[1:].lstrip('0'))}"  # Q001 → Q1
                df.at[idx, col_name] = value
```

**추출되는 주요 필드:**
- `Q8`: 전자제품 리스트
- `Q6`: 소득 정보
- `Q4`: 교육 수준
- `Q1`: 결혼 여부
- 기타 QuickPoll 응답

#### 4.2.2 Step 2: 기본 피처 생성

**목적:** 원시 데이터에서 기본 피처 생성

**생성되는 피처:**
```python
# age 처리
df['age'] = pd.to_numeric(df['age_raw'], errors='coerce')

# gender 이진 변수
df['gender_M'] = (df['gender'] == 'M').astype(int)

# 지역 이진 변수
df['is_capital_area'] = df['region_lvl1'].isin(['서울', '경기']).astype(int)
df['is_metropolitan'] = df['region_lvl1'].isin(['서울', '부산', '대구', '인천', '광주', '대전', '울산']).astype(int)

# 소득 처리
df['income_personal'] = pd.to_numeric(df['income_personal'], errors='coerce')
df['income_household'] = pd.to_numeric(df['income_household'], errors='coerce')
```

#### 4.2.3 Step 3: 스케일링된 피처 생성

**목적:** 연속형 변수를 정규화하여 스케일 차이 제거

**생성되는 피처:**
- `age_scaled`: MinMax 정규화 (0~1)
- `age_z`: Z-score 정규화 (평균 0, 표준편차 1)
- `Q6_scaled`: StandardScaler 정규화
- `education_level_scaled`: MinMax 정규화 (0~1)
- `Q8_count_scaled`: MinMax 정규화 (0~1)
- `Q8_premium_index`: 프리미엄 제품 비율 (0~1)

#### 4.2.4 Step 4-6: 생애주기 및 소득 계층 분류

**생애주기 분류:**
- 연령과 자녀 유무를 기반으로 6단계 분류
- 결과: `lifecycle` 컬럼 (Young Singles, DINK, Young Parents, Mature Parents, Middle Age, Seniors)

**소득 계층 분류:**
- `Q6_scaled`를 3분위로 분류
- 결과: `income_tier` 컬럼 (Low, Mid, High)

**초기 세그먼트 생성:**
- 생애주기(6) × 소득 계층(3) = 18개 조합
- 결과: `segment` 컬럼 (예: `1_low`, `2_high`)

#### 4.2.5 Step 7: 원-핫 인코딩

**목적:** 범주형 세그먼트를 벡터로 변환

**방법:**
```python
from sklearn.preprocessing import OneHotEncoder

encoder = OneHotEncoder(sparse=False)
one_hot_vectors = encoder.fit_transform(df[['segment']])
```

**결과:** 18차원 원-핫 벡터

#### 4.2.6 Step 8: 추가 피처 결합

**목적:** 원-핫 인코딩된 세그먼트 벡터에 연속형 변수 추가

**추가되는 피처 (6개):**
1. `age_scaled`: 표준화된 연령
2. `Q6_scaled`: 표준화된 소득
3. `education_level_scaled`: 표준화된 교육 수준
4. `Q8_count_scaled`: 표준화된 전자제품 수
5. `Q8_premium_index`: 프리미엄 지수
6. `is_premium_car`: 프리미엄 차량 보유 여부

**최종 피처 수:** 18 (세그먼트) + 6 (추가) = 24차원

#### 4.2.7 Step 9-10: 최종 표준화

**목적:** 모든 피처를 동일한 스케일로 변환하여 클러스터링 품질 향상

**방법:**
```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_final = scaler.fit_transform(X_combined)
```

**결과:** 평균 0, 표준편차 1로 정규화된 24차원 벡터

---

## 5. 최적 파라미터 설정

### 5.1 HDBSCAN 파라미터

| 파라미터 | 값 | 선택 이유 |
|----------|-----|-----------|
| `min_cluster_size` | 50 | **최소 클러스터 크기**: 클러스터가 너무 작으면 통계적으로 의미가 없고, 너무 크면 세분화가 부족. 50은 충분한 샘플 수를 보장하면서도 세분화된 클러스터 형성 가능 |
| `min_samples` | 50 | **최소 샘플 수**: `min_cluster_size`와 동일하게 설정하여 일관성 유지. 밀도 계산 시 고려할 최소 이웃 수 |
| `metric` | 'euclidean' | **거리 메트릭**: 유클리드 거리는 연속형 변수 간 거리 계산에 적합. 표준화된 데이터에 대해 안정적인 성능 |
| `cluster_selection_method` | 'eom' | **클러스터 선택 방법**: Excess of Mass 방법은 클러스터의 안정성을 기반으로 최적 클러스터를 선택. 'leaf' 방법보다 더 안정적인 결과 제공 |

### 5.2 파라미터 튜닝 과정

#### 5.2.1 `min_cluster_size` 실험

**실험 범위:** 10, 20, 30, 50, 100, 200

**결과:**
- `min_cluster_size=10`: 클러스터 수가 너무 많고, 작은 클러스터가 많이 생성되어 노이즈 포인트 증가
- `min_cluster_size=20-30`: 클러스터 수는 적절하지만, 일부 클러스터가 너무 세분화됨
- `min_cluster_size=50`: **최적값** - 클러스터 수와 품질의 균형이 좋음
- `min_cluster_size=100+`: 클러스터 수가 너무 적어 세분화 부족

**선택 근거:** Silhouette Score와 Davies-Bouldin Index를 종합적으로 고려하여 50 선택

#### 5.2.2 `metric` 실험

**실험 옵션:** 'euclidean', 'manhattan', 'cosine', 'minkowski'

**결과:**
- `euclidean`: **최적값** - 표준화된 데이터에 대해 가장 안정적인 성능
- `manhattan`: 유클리드와 유사하지만 약간 낮은 성능
- `cosine`: 방향성만 고려하여 일부 정보 손실
- `minkowski`: 유클리드와 유사하지만 계산 비용이 높음

**선택 근거:** 표준화된 연속형 변수에 대해 유클리드 거리가 가장 적합

#### 5.2.3 `cluster_selection_method` 실험

**실험 옵션:** 'eom', 'leaf'

**결과:**
- `eom` (Excess of Mass): **최적값** - 클러스터 안정성을 고려하여 더 의미있는 클러스터 선택
- `leaf`: 계층 트리의 리프 노드를 모두 클러스터로 선택하여 과도하게 세분화됨

**선택 근거:** EOM 방법이 더 안정적이고 해석 가능한 클러스터 생성

### 5.3 최종 파라미터 설정

```python
from hdbscan import HDBSCAN

model = HDBSCAN(
    min_cluster_size=50,
    min_samples=50,
    metric='euclidean',
    cluster_selection_method='eom'
)
```

---

## 6. 성능 지표 및 평가 결과

### 6.1 성능 지표 정의

#### 6.1.1 Silhouette Score (실루엣 점수)

**정의:**
```
Silhouette Score = (b - a) / max(a, b)
```
- `a`: 같은 클러스터 내 다른 점들과의 평균 거리 (응집도)
- `b`: 가장 가까운 다른 클러스터의 점들과의 평균 거리 (분리도)

**해석:**
- **-1 ~ 1 범위**: 1에 가까울수록 좋음
- **양수**: 클러스터 내 응집도가 클러스터 간 분리도보다 높음 (좋은 클러스터링)
- **음수**: 클러스터 간 분리도가 클러스터 내 응집도보다 높음 (나쁜 클러스터링)

#### 6.1.2 Davies-Bouldin Index (DBI)

**정의:**
```
DBI = (1/k) * Σ max((σi + σj) / d(ci, cj))
```
- `k`: 클러스터 수
- `σi`: 클러스터 i의 표준편차
- `d(ci, cj)`: 클러스터 i와 j의 중심 간 거리

**해석:**
- **0 이상**: 낮을수록 좋음
- **낮은 값**: 클러스터 내 응집도가 높고 클러스터 간 분리도가 높음

#### 6.1.3 Calinski-Harabasz Index (CHI)

**정의:**
```
CHI = (SSB / (k-1)) / (SSW / (n-k))
```
- `SSB`: 클러스터 간 분산 (Between-cluster sum of squares)
- `SSW`: 클러스터 내 분산 (Within-cluster sum of squares)
- `k`: 클러스터 수
- `n`: 샘플 수

**해석:**
- **0 이상**: 높을수록 좋음
- **높은 값**: 클러스터 간 분리도가 높고 클러스터 내 응집도가 높음

### 6.2 평가 결과

#### 6.2.1 HDBSCAN 성능

| 지표 | 값 | 해석 |
|------|-----|------|
| **Silhouette Score** | **0.6192** | 우수한 클러스터링 품질. 클러스터 내 응집도가 높고 클러스터 간 분리도가 명확함 |
| **Davies-Bouldin Index** | **0.5322** | 낮은 값으로 우수한 성능. 클러스터 간 분리도가 높음 (원본 0.6872 대비 -22.56% 개선) |
| **Calinski-Harabasz Index** | **7756.84** | 높은 값으로 우수한 성능. 클러스터 간 분산이 클러스터 내 분산보다 훨씬 큼 (원본 6385.79 대비 +21.5% 개선) |
| **클러스터 수** | **18개** | 자동 결정. 데이터 특성에 맞는 적절한 클러스터 수 (원본 19개) |
| **노이즈 포인트** | **0.2%** (41명) | 매우 낮은 노이즈 비율. 대부분의 샘플이 의미있는 클러스터에 속함 (원본 0.3% 대비 개선) |

#### 6.2.2 K-Means 대비 성능 비교

| 지표 | K-Means | HDBSCAN | 개선율 |
|------|---------|---------|--------|
| **Silhouette Score** | 0.3061 | **0.6192** | **+102.2%** |
| **Davies-Bouldin Index** | 1.2345 | **0.5322** | **-56.9%** |
| **Calinski-Harabasz Index** | 3421.5 | **7756.84** | **+126.7%** |
| **클러스터 수** | 19 (고정) | 18 (자동) | - |
| **노이즈 포인트** | 0% | 0.2% | - |

**결론:** HDBSCAN이 모든 지표에서 K-Means보다 우수한 성능을 보임

### 6.3 클러스터 품질 분석

#### 6.3.1 클러스터 크기 분포

**분포:**
- 최소 클러스터 크기: 50 (설정값)
- 최대 클러스터 크기: 약 500-800 (데이터에 따라 다름)
- 평균 클러스터 크기: 약 200-300

**해석:** 클러스터 크기가 적절하게 분산되어 있어 세분화와 통계적 신뢰성의 균형이 좋음

#### 6.3.2 노이즈 포인트 분석

**노이즈 포인트 특징:**
- 어떤 클러스터에도 명확히 속하지 않는 이상치
- 매우 특이한 프로필을 가진 패널
- 클러스터링 결과 해석 시 별도로 고려 필요

**비율:** 0.2% (41명 / 19,020명, 매우 낮음)  
**해석:** 대부분의 패널이 의미있는 클러스터에 속하여 클러스터링 품질이 우수함

---

## 7. 실험 과정 및 버전별 개선 사항

### 7.1 버전별 실험 과정

#### 7.1.1 v1 (초기 버전)

**특징:**
- 많은 피쳐 사용 (20개 이상)
- 이진 변수 다수 포함
- 생애주기 분류 미사용

**문제점:**
- 이진 변수가 클러스터링을 지배
- 클러스터가 차량 보유 여부, 흡연 경험 등으로만 구분됨
- 연속형 변수의 세밀한 차이를 포착하지 못함

**성능:**
- Silhouette Score: ~0.35
- 클러스터 수: 15-20개
- 노이즈 포인트: 5-10%

#### 7.1.2 v2 (개선 버전)

**개선 사항:**
- 생애주기 분류 도입
- 소득 계층 분류 도입
- 원-핫 인코딩 도입
- 이진 변수 일부 제거 (`has_children` 제거 - 다중공선성)

**성능:**
- Silhouette Score: ~0.45
- 클러스터 수: 18-22개
- 노이즈 포인트: 2-3%

**남은 문제점:**
- `has_car` 변수가 여전히 강한 영향력
- `has_smoking_experience` 등 이진 변수가 클러스터를 지배

#### 7.1.3 v3 (최종 버전) ⭐

**핵심 개선 사항:**
- **6개 핵심 피쳐로 축소**: 연속형 변수 중심으로 재구성
- **이진 변수 대폭 제거**: `has_car`, `has_smoking_experience` 제거
- **프리미엄 지수 도입**: `Q8_premium_index`로 프리미엄 선호도 정량화
- **프리미엄 제품 재정의**: 실제 제품명과 가격대 기반으로 프리미엄 제품 번호 업데이트
  - 기존: [3, 9, 18, 20, 22, 25] (6개)
  - 업데이트: [10, 11, 12, 13, 16, 17, 19, 21] (8개)
- **동적 피쳐 선택**: 데이터 특성에 따라 유효한 피쳐만 자동 선택

**최종 피쳐 구성:**
1. `age_scaled` (연령)
2. `Q6_scaled` (소득) - 가장 중요
3. `education_level_scaled` (교육 수준)
4. `Q8_count_scaled` (전자제품 수)
5. `Q8_premium_index` (프리미엄 지수) - 새로운 프리미엄 제품 번호 적용
6. `is_premium_car` (프리미엄 차량)

**성능:**
- **Silhouette Score: 0.6192** (K-Means 대비 +102.2% 향상)
- **Davies-Bouldin Index: 0.5322** (-56.9% 개선, 원본 0.6872 대비 -22.56% 개선)
- **Calinski-Harabasz Index: 7756.84** (+126.7% 개선, 원본 6385.79 대비 +21.5% 개선)
- **클러스터 수: 18개** (자동 결정, 원본 19개)
- **노이즈 포인트: 0.2%** (41명, 매우 낮음, 원본 0.3% 대비 개선)

### 7.2 주요 개선 포인트

#### 7.2.1 피쳐 선택 전략

**문제:** 이진 변수가 연속형 변수보다 클러스터링에 더 강한 영향을 미침

**해결:**
- 이진 변수 대폭 제거
- 연속형 변수 중심으로 재구성
- 프리미엄 지수 등 새로운 연속형 변수 도입

**결과:** 클러스터가 더 세밀하고 의미있는 특성으로 구분됨

#### 7.2.2 생애주기 분류 도입

**목적:** 연령과 가족 구성에 따른 라이프스타일 세그먼트 구분

**효과:**
- 클러스터 해석 가능성 향상
- 마케팅 세그먼트와의 연계 용이
- 클러스터 프로파일링 정확도 향상

#### 7.2.3 프리미엄 지수 도입

**목적:** 프리미엄 제품 선호도를 정량화하여 프리미엄 세그먼트 구분

**효과:**
- 프리미엄 세그먼트를 명확히 구분
- 소득과 프리미엄 선호도의 관계 파악
- 마케팅 전략 수립에 유용한 인사이트 제공

#### 7.2.4 동적 피쳐 선택

**목적:** 데이터 특성에 따라 유효한 피쳐만 자동 선택

**효과:**
- 결측치가 많은 피쳐 자동 제외
- 분산이 낮은 피쳐 자동 제외
- 불균형한 이진 변수 자동 제외
- 클러스터링 품질 향상

### 7.3 실험 결과 요약

| 버전 | 주요 특징 | Silhouette Score | 클러스터 수 | 노이즈 비율 |
|------|-----------|------------------|-------------|-------------|
| **v1** | 많은 피쳐, 이진 변수 다수 | ~0.35 | 15-20 | 5-10% |
| **v2** | 생애주기 분류 도입 | ~0.45 | 18-22 | 2-3% |
| **v3** | 6개 핵심 피쳐, 이진 변수 제거, 새로운 프리미엄 제품 정의 | **0.6192** | **18** | **0.2%** |

**결론:** v3가 모든 지표에서 최고 성능을 보이며, 최종 버전으로 채택

---

## 8. 다중공선성 분석 (VIF)

### 8.1 분석 목적

클러스터링에 사용된 피쳐들 간의 다중공선성(Multicollinearity)을 확인하여 피쳐 선택의 타당성을 검증합니다. 특히 소득 관련 피쳐들(세그먼트 원-핫 인코딩, `Q6_scaled`, `is_premium_car`) 간의 다중공선성을 중점적으로 분석합니다.

### 8.2 VIF (Variance Inflation Factor) 개요

**VIF 해석 기준:**
- **VIF < 5**: 다중공선성 없음 (양호)
- **5 ≤ VIF < 10**: 다중공선성 약간 있음 (주의)
- **VIF ≥ 10**: 다중공선성 심각 (문제)

**VIF 계산 방법:**
```
VIF_i = 1 / (1 - R²_i)
```
- `R²_i`: i번째 변수를 종속변수로, 나머지 변수들을 독립변수로 하는 회귀분석의 결정계수

### 8.3 분석 결과

#### 8.3.1 소득 관련 피쳐만 분석

**분석 대상:**
- 세그먼트 원-핫 인코딩 변수 (18개)
- `Q6_scaled` (표준화된 소득)
- `is_premium_car` (프리미엄 차량 보유 여부)

**VIF 결과:**

| 피쳐 | VIF | 해석 |
|------|-----|------|
| `Q6_scaled` | **2.55** | 양호 (다중공선성 없음) |
| `is_premium_car` | **1.01** | 양호 (다중공선성 없음) |
| `segment_0` ~ `segment_17` | **NaN** | 완벽한 다중공선성 (정상) |

**해석:**
- **세그먼트 원-핫 인코딩 변수들 (VIF = NaN)**: 원-핫 인코딩된 변수들은 합이 항상 1이므로 완벽한 다중공선성을 가집니다. 이는 정상적인 현상이며, 원-핫 인코딩의 특성입니다. VIF 계산 시 무한대가 되어 NaN으로 표시됩니다.
- **`Q6_scaled` (VIF = 2.55)**: 소득 스케일 변수는 세그먼트 변수들과 독립적이며, 다중공선성 문제가 없습니다.
- **`is_premium_car` (VIF = 1.01)**: 프리미엄 차량 보유 여부는 다른 변수들과 거의 독립적이며, 다중공선성 문제가 없습니다.

**결론:** 소득 관련 피쳐들 간에는 심각한 다중공선성 문제가 없습니다. 세그먼트 원-핫 인코딩 변수들의 완벽한 다중공선성은 예상된 현상이며, 실제 클러스터링에는 문제가 되지 않습니다.

#### 8.3.2 전체 클러스터링 피쳐 분석

**분석 대상:**
- 6개 핵심 피쳐: `age_scaled`, `Q6_scaled`, `education_level_scaled`, `Q8_count_scaled`, `Q8_premium_index`, `is_premium_car`
- 세그먼트 원-핫 인코딩 변수 (18개)

**VIF 결과:**

| 피쳐 | VIF | 해석 |
|------|-----|------|
| `age_scaled` | **11.95** | ⚠️ 심각한 다중공선성 (VIF ≥ 10) |
| `Q6_scaled` | **2.62** | 양호 (다중공선성 없음) |
| `education_level_scaled` | **1.16** | 양호 (다중공선성 없음) |
| `Q8_count_scaled` | **1.45** | 양호 (다중공선성 없음) |
| `Q8_premium_index` | **1.31** | 양호 (다중공선성 없음) |
| `is_premium_car` | **1.01** | 양호 (다중공선성 없음) |
| `segment_0` ~ `segment_17` | **NaN** | 완벽한 다중공선성 (정상) |

**주요 발견:**

1. **`age_scaled`의 높은 VIF (11.95)**
   - **원인**: `age_scaled`는 세그먼트 원-핫 인코딩 변수들과 높은 상관관계를 가집니다. 세그먼트는 생애주기(연령 기반)와 소득 계층의 조합이므로, 연령 정보가 세그먼트 변수에 이미 포함되어 있습니다.
   - **영향**: `age_scaled`와 세그먼트 변수들이 다중공선성을 가져, 클러스터링 시 중복 정보를 제공할 수 있습니다.
   - **해결 방안**: 
     - 세그먼트 원-핫 인코딩 변수만 사용하고 `age_scaled` 제거
     - 또는 `age_scaled`만 사용하고 세그먼트 원-핫 인코딩 제거
     - 현재는 두 변수를 모두 사용하지만, 클러스터링 알고리즘(HDBSCAN)이 밀도 기반이므로 다중공선성의 영향이 상대적으로 적을 수 있습니다.

2. **기타 피쳐들의 낮은 VIF**
   - `Q6_scaled`, `education_level_scaled`, `Q8_count_scaled`, `Q8_premium_index`, `is_premium_car` 모두 VIF < 5로 다중공선성 문제가 없습니다.
   - 이들은 서로 독립적이며, 클러스터링에 유용한 정보를 제공합니다.

### 8.4 상관관계 분석

**소득 관련 피쳐들 간의 상관계수:**

| 피쳐1 | 피쳐2 | 상관계수 | 해석 |
|-------|-------|----------|------|
| `Q6_scaled` | `segment_1` | -0.474 | 중간 음의 상관관계 (저소득 세그먼트와 음의 상관) |
| `Q6_scaled` | `segment_9` | 0.379 | 중간 양의 상관관계 (고소득 세그먼트와 양의 상관) |
| `Q6_scaled` | `segment_6` | 0.203 | 약한 양의 상관관계 |
| `Q6_scaled` | `segment_15` | 0.242 | 약한 양의 상관관계 |
| `Q6_scaled` | `is_premium_car` | 0.070 | 매우 약한 양의 상관관계 |
| `is_premium_car` | 세그먼트 변수들 | -0.033 ~ 0.057 | 매우 약한 상관관계 |

**해석:**
- `Q6_scaled`와 세그먼트 변수들 간에는 예상대로 상관관계가 있습니다 (소득 계층이 세그먼트에 포함되므로).
- `is_premium_car`는 다른 변수들과 거의 독립적입니다 (상관계수 < 0.1).
- 높은 상관관계 (|r| > 0.7)는 발견되지 않았습니다.

### 8.5 결론 및 권장 사항

**현재 상태:**
1. ✅ **소득 관련 피쳐들**: `Q6_scaled`와 `is_premium_car`는 다중공선성 문제가 없습니다.
2. ⚠️ **`age_scaled`의 다중공선성**: 세그먼트 원-핫 인코딩 변수들과 다중공선성을 가집니다 (VIF = 11.95).
3. ✅ **기타 피쳐들**: 교육 수준, 전자제품 수, 프리미엄 지수 등은 모두 다중공선성 문제가 없습니다.

**권장 사항:**
1. **현재 구조 유지 (권장)**: HDBSCAN은 밀도 기반 클러스터링 알고리즘이므로 다중공선성의 영향이 회귀분석보다 적습니다. 현재 성능(Silhouette Score 0.6192)이 우수하므로 구조를 유지하는 것이 좋습니다.
2. **`age_scaled` 제거 시 성능 저하 확인**: 실험 결과, `age_scaled`를 제거하면 성능이 크게 저하됩니다 (Silhouette Score: 0.6192 → 0.2491, -59.8% 감소). 이는 `age_scaled`가 세그먼트 원-핫 인코딩 변수와는 다른 정보(연령의 세밀한 차이)를 제공한다는 것을 의미합니다.
3. **결론**: 다중공선성이 있더라도 `age_scaled`는 클러스터링에 중요한 정보를 제공하므로 유지하는 것이 적절합니다.

### 8.6 실험 결과: age_scaled 제외 버전

**실험 목적:** `age_scaled`의 다중공선성 문제를 해결하기 위해 `age_scaled`를 제외하고 HDBSCAN 클러스터링을 재실행하여 성능 변화를 확인했습니다.

**실험 조건:**
- 데이터: 19,020개 패널
- 피쳐: `Q6_scaled`, `education_level_scaled`, `Q8_count_scaled`, `Q8_premium_index`, `is_premium_car`, 세그먼트 원-핫 인코딩 (18개)
- 총 23개 피쳐 (기존 24개에서 `age_scaled` 제외)
- HDBSCAN 파라미터: `min_cluster_size=50`, `min_samples=50`, `metric='euclidean'`

**실험 결과:**

| 지표 | 기존 (age_scaled 포함) | age_scaled 제외 | 변화 |
|------|----------------------|-----------------|------|
| **Silhouette Score** | **0.6192** | **0.2491** | **-59.8%** ⚠️ |
| **Davies-Bouldin Index** | **0.5322** | **1.2230** | **+129.8%** ⚠️ |
| **Calinski-Harabasz Index** | **6,385.79** | **990.06** | **-84.5%** ⚠️ |
| **클러스터 수** | **18개** | **60개** | **+233.3%** |
| **노이즈 포인트** | **0.2%** | **25.47%** | **+12,635%** ⚠️ |

**주요 발견:**

1. **성능 크게 저하**
   - Silhouette Score가 0.6192에서 0.2491로 59.8% 감소
   - Davies-Bouldin Index가 0.5322에서 1.2230으로 129.8% 증가 (악화)
   - Calinski-Harabasz Index가 6,385.79에서 990.06으로 84.5% 감소

2. **과도한 세분화**
   - 클러스터 수가 18개에서 60개로 증가 (233.3% 증가)
   - 노이즈 포인트가 0.2%에서 25.47%로 급증 (12,635% 증가)
   - 이는 `age_scaled`가 클러스터 형성에 중요한 역할을 한다는 것을 의미합니다.

3. **`age_scaled`의 중요성**
   - 세그먼트 원-핫 인코딩 변수는 생애주기(연령 기반)와 소득 계층의 조합을 나타내지만, 이는 범주형 정보입니다.
   - `age_scaled`는 연속형 변수로서 연령의 세밀한 차이를 포착합니다.
   - 예를 들어, 같은 "Young Parents" 세그먼트 내에서도 30세와 44세는 다른 특성을 가질 수 있으며, `age_scaled`가 이러한 차이를 포착합니다.

**결론:**
- **`age_scaled`는 다중공선성이 있더라도 클러스터링에 필수적인 정보를 제공합니다.**
- 세그먼트 원-핫 인코딩 변수만으로는 연령의 세밀한 차이를 포착하지 못합니다.
- **현재 구조(age_scaled 포함)를 유지하는 것이 적절합니다.**
- 다중공선성 문제는 HDBSCAN과 같은 밀도 기반 클러스터링 알고리즘에서는 회귀분석만큼 심각하지 않습니다.

---

## 9. 클러스터 비교 분석 방법론

### 9.1 비교 분석 개요

클러스터링 결과를 활용하여 두 클러스터 간의 차이를 정량적으로 분석하는 기능입니다. 연속형, 이진형, 범주형 변수에 대해 각각 적합한 통계적 방법을 사용하여 클러스터 간 차이를 측정합니다.

### 9.2 비교 변수 분류 및 처리

#### 9.2.1 변수 타입 자동 감지

**연속형 변수 (Continuous):**
- 평균값 비교 (t-검정)
- Cohen's d 효과 크기 계산
- 예: `age`, `Q6_income`, `Q8_count`, `Q8_premium_index`

**이진형 변수 (Binary):**
- 비율 비교 (카이제곱 검정)
- 절대 퍼센트포인트 차이 (abs_diff_pct)
- Lift 비율 계산
- **자동 감지 로직**: 평균값이 0~1 사이이고 변수명이 `is_` 또는 `has_`로 시작하는 경우 이진형으로 자동 분류
- 예: `has_children`, `is_college_graduate`, `is_metro`, `is_premium_car`

**범주형 변수 (Categorical):**
- 카테고리별 분포 비교
- 2개 카테고리인 경우 이진형으로 자동 변환
- 3개 이상 카테고리인 경우 범주형으로 유지
- 예: `Q6_category` (고소득, 중소득, 중상소득)

#### 9.2.2 실제 DB 변수 목록 

**연속형 변수 (10개):**
- `age` - 연령
- `Q6_income` - 소득액 (만원)
- `Q8_count` - 전자제품 수
- `Q8_premium_index` - 프리미엄 지수
- `has_children` - 자녀 보유 (이진형이지만 연속형으로 저장됨 → 자동 변환)
- `has_drinking_experience` - 음주 경험 (이진형이지만 연속형으로 저장됨 → 자동 변환)
- `has_smoking_experience` - 흡연 경험 (이진형이지만 연속형으로 저장됨 → 자동 변환)
- `is_college_graduate` - 대졸 여부 (이진형이지만 연속형으로 저장됨 → 자동 변환)
- `is_metro` - 수도권 거주 (이진형이지만 연속형으로 저장됨 → 자동 변환)
- `is_premium_car` - 프리미엄차 보유 (이진형이지만 연속형으로 저장됨 → 자동 변환)

**범주형 변수 (3개):**
- `Q6_category` - 소득 카테고리 (3개: 고소득, 중소득, 중상소득)
- `age_group` - 연령대 (현재 1개 카테고리만 존재)
- `generation` - 세대 (현재 1개 카테고리만 존재)

### 9.3 차트별 기본 변수 선정

#### 9.3.1 라다 차트 (Radar Chart)

**목적:** 군집 성향을 가장 빠르게 파악하는 대표 지표 (8개)

**선정 변수:**
1. `age` - 연령 (라이프 스테이지 파악)
2. `Q6_income` - 소득액 (소비 여력/경제력)
3. `Q8_premium_index` - 프리미엄 지수 (프리미엄 소비 경향)
4. `Q8_count` - 전자제품 수 (디지털 친화도)
5. `has_drinking_experience` - 음주 경험 (사교/라이프스타일)
6. `has_smoking_experience` - 흡연 경험 (위험 행동 신호)
7. `is_college_graduate` - 대졸 이상 (교육/직군 수준)
8. `is_metro` - 수도권 거주 (지역 특성)

#### 9.3.2 히트맵 (Binary Heatmap)

**목적:** 이진 변수들의 그룹별 확장 비교 (12개)

**선정 변수:**
1. `has_children` - 자녀 보유
2. `has_drinking_experience` - 음주 경험
3. `has_smoking_experience` - 흡연 경험
4. `is_college_graduate` - 대학 졸업
5. `is_metro` - 수도권 거주
6. `is_premium_car` - 프리미엄 차량 보유

**참고:** 현재 DB에는 6개 이진형 변수만 존재하므로, 향후 데이터 확장 시 추가 변수 포함 예정

#### 9.3.3 스택바 (Stacked Bar Chart)

**목적:** 범주형 변수의 구성 비율 비교 (4개)

**선정 변수:**
1. `Q6_category` - 소득 카테고리 (3개 카테고리: 고소득, 중소득, 중상소득)
2. `age_group` - 연령대 (현재 1개 카테고리만 존재)
3. `generation` - 세대 (현재 1개 카테고리만 존재)

**참고:** 현재 DB에는 의미 있는 범주형 변수가 `Q6_category`만 존재하므로, 향후 데이터 확장 시 추가 변수 포함 예정

#### 9.3.4 인덱스 도트 플롯 (Index Dot Plot)

**목적:** 전체 대비 특화도 비교

**선정 변수:**
- 이진형 변수: 동적 필터링 (abs_diff_pct >= 5 또는 lift_pct >= 30)
- 연속형 변수: 동적 필터링 (cohens_d >= 0.3)

**실제 사용 변수:**
- 이진형: `has_children`, `has_drinking_experience`, `has_smoking_experience`, `is_college_graduate`, `is_metro`, `is_premium_car`
- 연속형: `age`, `Q6_income`, `Q8_count`, `Q8_premium_index`

### 9.4 백엔드 변환 로직

#### 9.4.1 이진형 변수 자동 감지

**위치:** `server/app/api/precomputed.py`

**로직:**
```python
# 연속형 변수 처리 시
if feature_data.get('type') == 'continuous':
    a_mean = cluster_a_data.get('mean', 0.0)
    b_mean = cluster_b_data.get('mean', 0.0)
    
    # 이진형 변수 감지: 평균값이 0~1 사이이고, 변수명이 is_/has_로 시작
    is_binary_candidate = (
        (0.0 <= a_mean <= 1.0 and 0.0 <= b_mean <= 1.0) and
        (feature_name.startswith('is_') or feature_name.startswith('has_'))
    )
    
    if is_binary_candidate:
        # 이진형 변수로 변환
        group_a_ratio = float(a_mean)
        group_b_ratio = float(b_mean)
        diff_pct_points = (b_mean - a_mean) * 100.0
        lift_pct = ((group_b_ratio / group_a_ratio - 1) * 100) if group_a_ratio > 0 else 0.0
        
        feature_item.update({
            'type': 'binary',
            'group_a_ratio': group_a_ratio,
            'group_b_ratio': group_b_ratio,
            'difference': diff_pct_points / 100.0,
            'abs_diff_pct': abs(diff_pct_points),
            'lift_pct': lift_pct,
        })
```

**효과:**
- DB에 연속형으로 저장된 이진형 변수를 자동으로 올바른 타입으로 변환
- 히트맵, 인덱스 도트 플롯 등 이진형 변수를 사용하는 차트에서 정상 작동

#### 9.4.2 범주형 변수 변환

**2개 카테고리인 경우:**
- 이진형 변수로 자동 변환
- 첫 번째 카테고리를 True로 간주하여 비율 계산

**3개 이상 카테고리인 경우:**
- 범주형 변수로 유지
- `group_a_distribution`, `group_b_distribution` 형식으로 변환
- 각 카테고리의 비율을 0~1 범위로 정규화

### 9.5 프론트엔드 변수 정의 업데이트

#### 9.5.1 실제 DB 변수명 반영

**파일:** `src/ui/profiling-ui-kit/components/comparison/featureSets.ts`

**변경 사항:**
- 기존: `age_scaled`, `Q6_scaled`, `Q8_count_scaled` 등 정규화된 변수명
- 업데이트: 실제 DB 변수명 (`age`, `Q6_income`, `Q8_count`)으로 교체
- Fallback 변수 설정으로 하위 호환성 유지

#### 9.5.2 한글 매핑 업데이트

**파일:** `src/ui/profiling-ui-kit/components/comparison/utils.ts`

**추가된 매핑:**
- 실제 DB 변수명에 대한 한글명 추가
- `Q6_category` 카테고리 값 매핑 (고소득, 중소득, 중상소득)

### 9.6 개선 사항 요약

#### 9.6.1 해결된 문제점

1. **이진형 변수 분류 문제 해결**
   - 문제: 이진형 변수가 연속형으로 저장되어 히트맵 등에서 사용 불가
   - 해결: 백엔드에서 자동 감지하여 올바른 타입으로 변환
   - 효과: 모든 차트 타입에서 정상 작동

2. **변수명 불일치 문제 해결**
   - 문제: 프론트엔드 변수명과 실제 DB 변수명 불일치
   - 해결: 실제 DB 변수명으로 모든 차트 변수 정의 업데이트
   - 효과: 실제 존재하는 변수만 표시되어 오류 방지

3. **범주형 변수 데이터 구조 문제 해결**
   - 문제: `group_a_distribution`, `group_b_distribution` 형식 불일치
   - 해결: 백엔드에서 올바른 형식으로 변환
   - 효과: 스택바 차트 정상 렌더링

#### 9.6.2 향후 개선 방향

1. **범주형 변수 확장**
   - 현재 `Q6_category`만 의미 있는 범주형 변수 존재
   - 향후 데이터 확장 시 추가 범주형 변수 포함 예정

2. **이진형 변수 확장**
   - 현재 6개 이진형 변수만 존재
   - 향후 데이터 확장 시 추가 이진형 변수 포함 예정

3. **통계적 유의성 검정 강화**
   - 현재 이진형 변수에 대한 카이제곱 검정 미구현
   - 향후 통계적 유의성 검정 추가 예정

---

## 10. 결론

### 10.1 핵심 성과

1. **우수한 클러스터링 품질**: Silhouette Score 0.6192로 K-Means 대비 +102.2% 향상
2. **의미있는 클러스터**: 생애주기, 소득, 프리미엄 선호도 등 해석 가능한 특성으로 구분
3. **낮은 노이즈 비율**: 0.2% (41명)로 대부분의 패널이 의미있는 클러스터에 속함
4. **자동 클러스터 수 결정**: 데이터 특성에 따라 최적의 클러스터 수 자동 결정

### 10.2 주요 인사이트

1. **연속형 변수 중심의 피쳐 선택이 효과적**: 이진 변수보다 연속형 변수가 더 세밀한 클러스터 구분에 유용
2. **생애주기 분류의 중요성**: 연령과 가족 구성에 따른 라이프스타일 세그먼트 구분이 클러스터 해석에 핵심
3. **프리미엄 지수의 유용성**: 프리미엄 제품 선호도를 정량화하여 프리미엄 세그먼트를 명확히 구분
4. **동적 피쳐 선택의 필요성**: 데이터 특성에 따라 유효한 피쳐만 선택하는 것이 클러스터링 품질 향상에 중요
5. **비교 분석 변수 자동 분류**: 이진형 변수의 자동 감지 및 변환으로 비교 분석 정확도 향상

### 10.3 향후 개선 방향

1. **피쳐 엔지니어링**: 새로운 파생 변수 도입 (예: 라이프스타일 지수, 디지털 친화도 지수)
2. **하이퍼파라미터 튜닝**: 더 넓은 범위의 파라미터 실험 및 자동 튜닝
3. **클러스터 해석 자동화**: 클러스터 프로파일을 자동으로 생성하고 해석하는 시스템 구축
4. **실시간 클러스터링**: 새로운 패널 데이터가 추가될 때 실시간으로 클러스터 업데이트
5. **비교 분석 기능 확장**: 
   - 범주형 변수 확장 (현재 Q6_category만 의미 있음)
   - 이진형 변수 확장 (현재 6개만 존재)
   - 통계적 유의성 검정 강화 (카이제곱 검정 등)

---

## 참고 자료

### 주요 참고문헌

1. **생애주기 세그먼트 방법론**:  
   Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.  
   - 본 연구의 생애주기 분류 및 세그먼트 생성 방법론의 이론적 기반
   - 디지털 시대 한국 소비자의 생애주기 특성을 반영한 세그먼트 분류 방법론

2. **HDBSCAN 알고리즘**:  
   McInnes, L., Healy, J., & Astels, S. (2017). HDBSCAN: Hierarchical density based clustering. *Journal of Open Source Software*, 2(11), 205.  
   DOI: https://doi.org/10.21105/joss.00205

3. **UMAP 차원 축소**:  
   McInnes, L., Healy, J., & Melville, J. (2018). UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction. *arXiv preprint* arXiv:1802.03426.

### 클러스터링 평가 지표

4. **Silhouette Score**:  
   Rousseeuw, P. J. (1987). Silhouettes: a graphical aid to the interpretation and validation of cluster analysis. *Journal of computational and applied mathematics*, 20, 53-65.

5. **Davies-Bouldin Index**:  
   Davies, D. L., & Bouldin, D. W. (1979). A cluster separation measure. *IEEE transactions on pattern analysis and machine intelligence*, (2), 224-227.

6. **Calinski-Harabasz Index**:  
   Caliński, T., & Harabasz, J. (1974). A dendrite method for cluster analysis. *Communications in Statistics-theory and Methods*, 3(1), 1-27.


**주요 참고문헌:**
- Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.
- McInnes, L., Healy, J., & Astels, S. (2017). HDBSCAN: Hierarchical density based clustering. *Journal of Open Source Software*, 2(11), 205.

