# 클러스터링 구분 명확화를 위한 피처 활용 전략

## 📊 현재 상황 분석

### 현재 사용 중인 피처 (6개)
- `age_scaled`: 연령 (표준화)
- `Q6_scaled`: 소득 (표준화)
- `education_level_scaled`: 학력 (표준화)
- `Q8_count_scaled`: 전자제품 수 (표준화)
- `Q8_premium_index`: 프리미엄 지수 (0~1)
- `is_premium_car`: 프리미엄 차량 보유 (이진)

### 문제점
1. **피처 수가 적음**: 6개만 사용하여 클러스터 구분이 모호할 수 있음
2. **이진 변수 비중 낮음**: `is_premium_car` 1개만 사용
3. **라이프스타일 변수 부재**: 음주/흡연 등 라이프스타일 특성 미반영
4. **가족/지역 변수 부재**: 가족 구성, 지역 특성 미반영
5. **피처 간 상관관계**: 일부 피처가 높은 상관관계를 가질 수 있음

---

## 🎯 개선 전략

### 전략 1: 파생변수 생성 (Feature Engineering)

#### 1.1 복합 지수 생성
**목적**: 여러 변수를 결합하여 더 명확한 구분 지표 생성

**예시 파생변수:**
- **`lifestyle_index`**: 음주/흡연 다양성 결합
  - `(drinking_types_count + smoking_types_count) / 2`
  - 또는 `drinking_types_count * 0.6 + smoking_types_count * 0.4`
  
- **`premium_lifestyle_index`**: 프리미엄 소비 패턴 종합
  - `Q8_premium_index * 0.5 + is_premium_car * 0.3 + is_premium_phone * 0.2`
  
- **`socioeconomic_index`**: 사회경제적 지위 종합
  - `Q6_scaled * 0.4 + education_level_scaled * 0.3 + is_metro * 0.3`
  
- **`tech_affinity_index`**: 기술 친화도
  - `Q8_count_scaled * 0.6 + is_apple_user * 0.2 + is_samsung_user * 0.2`
  
- **`family_lifecycle_index`**: 가족 생애주기
  - `has_children * 0.5 + children_category_ordinal * 0.3 + family_type_기혼_자녀있음 * 0.2`

#### 1.2 상호작용 변수 (Interaction Features)
**목적**: 두 변수의 상호작용 효과 반영

**예시:**
- **`age_income_interaction`**: 연령 × 소득
  - `age_scaled * Q6_scaled`
  - 고소득 젊은층 vs 저소득 중장년층 구분
  
- **`education_income_interaction`**: 학력 × 소득
  - `education_level_scaled * Q6_scaled`
  - 고학력 고소득 vs 저학력 저소득 구분
  
- **`premium_age_interaction`**: 프리미엄 × 연령
  - `Q8_premium_index * age_scaled`
  - 젊은 프리미엄 소비자 vs 중장년 프리미엄 소비자 구분

#### 1.3 비율 변수 (Ratio Features)
**목적**: 상대적 비율로 구분력 향상

**예시:**
- **`premium_ratio`**: 프리미엄 제품 비율
  - `Q8_premium_count / (Q8_count + 1)`
  - 이미 `Q8_premium_index`로 존재할 수 있음
  
- **`income_per_product`**: 제품당 소득
  - `Q6_income / (Q8_count + 1)`
  - 소비 여력 지표
  
- **`education_income_ratio`**: 학력 대비 소득
  - `Q6_scaled / (education_level_scaled + 0.1)`
  - 학력 대비 소득 수준 (기회의 평등 지표)

#### 1.4 범주형 변수 인코딩 개선
**목적**: 범주형 변수를 더 효과적으로 활용

**예시:**
- **`region_metro_combined`**: 지역 × 수도권 결합
  - `is_metro * 2 + is_metro_city * 1`
  - 수도권 > 광역시 > 기타 지역 구분
  
- **`employment_status_encoded`**: 취업 상태 인코딩
  - `is_employed * 2 - is_unemployed * 1 + is_student * 0.5`
  - 취업 > 학생 > 실업 구분

---

### 전략 2: 피처 선택 개선 (Feature Selection)

#### 2.1 도메인 기반 피처 확장
**현재 6개 → 12~15개로 확장**

**추가 고려 피처:**
- **라이프스타일 (3~4개)**
  - `has_drinking_experience`: 음주 경험
  - `drinking_types_count`: 음주 다양성
  - `has_smoking_experience`: 흡연 경험
  - `smoking_types_count`: 흡연 다양성
  
- **가족/생활 (2~3개)**
  - `has_children`: 자녀 유무
  - `children_category_ordinal`: 자녀 수
  - `family_type_기혼_자녀있음`: 가족 유형
  
- **지역/사회 (2개)**
  - `is_metro`: 수도권 거주
  - `is_college_graduate`: 대졸 이상
  
- **소비/제품 (2~3개)**
  - `is_premium_phone`: 프리미엄 폰
  - `is_apple_user`: 애플 사용자
  - `Q8_premium_count`: 프리미엄 제품 수

#### 2.2 피처 중요도 기반 선택
**방법:**
1. **상관관계 분석**: 높은 상관관계 피처 제거 (다중공선성 방지)
2. **분산 분석**: 분산이 너무 낮은 피처 제거
3. **클러스터 구분력 분석**: 각 피처가 클러스터 구분에 기여하는 정도 측정
4. **PCA 기반 선택**: 주성분 분석으로 중요 피처 식별

#### 2.3 단계적 피처 추가
**전략:**
1. **1단계**: 기본 인구통계 (age, income, education) - 3개
2. **2단계**: 소비 패턴 (Q8_count, premium) - 2개
3. **3단계**: 라이프스타일 (drinking, smoking) - 2~3개
4. **4단계**: 가족/지역 (children, metro) - 2개
5. **각 단계별 Silhouette Score 측정하여 최적 조합 찾기**

---

### 전략 3: 피처 가중치 적용 (Feature Weighting)

#### 3.1 도메인 지식 기반 가중치
**목적**: 비즈니스 관점에서 중요한 피처에 더 높은 가중치 부여

**예시 가중치:**
- **인구통계 (가중치 1.0)**
  - `age_scaled`: 1.0
  - `Q6_scaled`: 1.2 (소득이 더 중요)
  - `education_level_scaled`: 0.8
  
- **소비 패턴 (가중치 1.2)**
  - `Q8_count_scaled`: 1.0
  - `Q8_premium_index`: 1.5 (프리미엄 지수가 더 중요)
  - `is_premium_car`: 1.3
  
- **라이프스타일 (가중치 0.8)**
  - `drinking_types_count`: 0.8
  - `smoking_types_count`: 0.8

#### 3.2 통계적 가중치
**방법:**
- **분산 기반 가중치**: 분산이 큰 피처에 높은 가중치
- **상관관계 기반 가중치**: 다른 피처와 상관관계가 낮은 독립적 피처에 높은 가중치
- **클러스터 구분력 기반 가중치**: 클러스터 간 차이가 큰 피처에 높은 가중치

---

### 전략 4: 차원 축소 전 피처 선택

#### 4.1 PCA 전 피처 필터링
**전략:**
1. **고분산 피처 우선**: 분산이 높은 피처만 선택
2. **상관관계 낮은 피처 우선**: 독립적인 정보를 제공하는 피처 선택
3. **PCA 후 설명력 확인**: 각 주성분이 얼마나 설명하는지 확인

#### 4.2 UMAP 파라미터 조정
**현재 설정:**
- `n_neighbors=15`
- `min_dist=0.1`
- `metric='cosine'`

**개선 방안:**
- **`n_neighbors` 조정**: 10~20 범위에서 실험
  - 작을수록: 지역적 구조 강조
  - 클수록: 전역적 구조 강조
  
- **`min_dist` 조정**: 0.05~0.3 범위에서 실험
  - 작을수록: 클러스터가 더 밀집
  - 클수록: 클러스터가 더 분산
  
- **`metric` 변경**: 'euclidean', 'manhattan', 'hamming' 등 실험

---

### 전략 5: 다단계 클러스터링 (Hierarchical/Multi-stage)

#### 5.1 2단계 클러스터링
**전략:**
1. **1단계**: 인구통계 기반 대분류 (3~5개 클러스터)
   - 피처: age, income, education
   
2. **2단계**: 각 대분류 내에서 소비/라이프스타일 기반 세분류
   - 피처: Q8_count, premium, drinking, smoking
   
3. **결과**: 계층적 클러스터 구조 (예: Cluster 1-1, 1-2, 2-1, 2-2...)

#### 5.2 조건부 클러스터링
**전략:**
1. **조건별 분리**: 예) 프리미엄 소비자 vs 일반 소비자로 먼저 분리
2. **각 그룹별 독립 클러스터링**: 각 그룹 내에서 별도 클러스터링 수행
3. **결과 통합**: 최종적으로 통합된 클러스터 레이블 생성

---

### 전략 6: 클러스터링 알고리즘 다양화

#### 6.1 알고리즘 비교
**현재**: K-Means만 사용

**추가 고려:**
- **DBSCAN**: 밀도 기반, 이상치 자동 제거
- **Gaussian Mixture Model (GMM)**: 확률적 클러스터링, 유연한 클러스터 형태
- **Agglomerative Clustering**: 계층적 클러스터링
- **Spectral Clustering**: 비선형 구조 처리

#### 6.2 앙상블 클러스터링
**전략:**
1. **여러 알고리즘으로 클러스터링 수행**
2. **결과 통합**: Voting 또는 Consensus Clustering
3. **최종 클러스터 할당**: 다수결 또는 확률 기반

---

## 📋 실험 우선순위

### Phase 1: 빠른 개선 (1~2일)
1. ✅ **피처 수 확장**: 6개 → 12~15개
2. ✅ **파생변수 3~5개 추가**: premium_lifestyle_index, lifestyle_index 등
3. ✅ **이진 변수 추가**: drinking, smoking, children 등

### Phase 2: 중기 개선 (3~5일)
4. ✅ **상호작용 변수 추가**: age_income_interaction 등
5. ✅ **피처 가중치 실험**: 도메인 지식 기반 가중치
6. ✅ **UMAP 파라미터 튜닝**: n_neighbors, min_dist 조정

### Phase 3: 장기 개선 (1주 이상)
7. ✅ **다단계 클러스터링**: 2단계 클러스터링 실험
8. ✅ **알고리즘 다양화**: DBSCAN, GMM 등 시도
9. ✅ **앙상블 클러스터링**: 여러 알고리즘 결과 통합

---

## 🎯 예상 효과

### 피처 확장 (6개 → 15개)
- **Silhouette Score**: 0.25 → 0.35~0.40 예상
- **클러스터 구분력**: 20~30% 향상 예상

### 파생변수 추가 (5개)
- **클러스터 해석력**: 30~40% 향상 예상
- **비즈니스 인사이트**: 더 명확한 프로필 구분

### 가중치 적용
- **중요 피처 강조**: 프리미엄, 소득 등 핵심 변수 영향력 증가
- **클러스터 품질**: 10~15% 추가 향상 예상

---

## ⚠️ 주의사항

### 1. 과적합 방지
- 피처가 너무 많으면 (20개 이상) 오히려 성능 저하 가능
- 최적 피처 수: 10~15개 권장

### 2. 다중공선성 주의
- 높은 상관관계 피처는 제거하거나 결합
- 예: `Q8_premium_index`와 `Q8_premium_count`는 중복 가능

### 3. 결측치 처리
- 파생변수 생성 시 결측치 처리 방법 명확히 정의
- 결측치 비율 30% 이상 피처는 제외

### 4. 해석 가능성 유지
- 복잡한 파생변수는 해석이 어려울 수 있음
- 비즈니스 관점에서 이해 가능한 변수 우선

---

## 📊 평가 지표

### 클러스터 품질 지표
- **Silhouette Score**: 0.5 이상 목표 (현재 0.25)
- **Davies-Bouldin Index**: 1.0 이하 목표
- **Calinski-Harabasz Index**: 높을수록 좋음

### 비즈니스 지표
- **클러스터 간 차이**: 각 클러스터의 평균값 차이가 통계적으로 유의한지
- **클러스터 해석 가능성**: 각 클러스터의 프로필이 명확한지
- **클러스터 크기 균형**: 너무 작거나 큰 클러스터가 없는지 (각 10~40% 범위)

---

**작성일**: 2025-01-15  
**목적**: 클러스터링 구분 명확화를 위한 전략 수립

