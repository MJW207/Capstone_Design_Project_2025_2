# 새로운 클러스터링 결과 DB 적재 및 UI 연결 계획서

## 📋 개요

새로운 프리미엄 제품 정의 `[10, 11, 12, 13, 16, 17, 19, 21]`로 재실행한 클러스터링 결과를 NeonDB에 적재하고 UI와 연결하는 작업 계획입니다.

**새 클러스터링 결과:**
- Silhouette Score: **0.6192** (원본 0.6014 대비 +2.96% 개선)
- Davies-Bouldin Index: **0.5322** (원본 0.6872 대비 -22.56% 개선)
- 클러스터 수: **18개**
- 노이즈 비율: **0.2%**

---

## 🎯 작업 목표

1. ✅ 새로운 클러스터링 결과 CSV 파일 확인
2. ✅ 클러스터링 세션 정보 DB 적재 (`merged.clustering_sessions`)
3. ✅ UMAP 좌표 DB 적재 (`merged.umap_coordinates`)
4. ✅ 패널-클러스터 매핑 DB 적재 (`merged.panel_cluster_mappings`)
5. ✅ 클러스터 프로필 생성 및 DB 적재 (`merged.cluster_profiles`)
6. ✅ 클러스터 비교 데이터 생성 및 DB 적재 (`merged.cluster_comparisons`)
7. ✅ Precomputed 세션 이름 업데이트 (`precomputed_name = "hdbscan_default"`)
8. ✅ UI 연결 확인 및 테스트

---

## 📁 입력 파일

```
clustering_data/data/precomputed/
├── flc_income_clustering_hdbscan.csv          # 클러스터링 결과 (mb_sn, cluster_hdbscan, umap_x, umap_y, ...)
├── flc_income_clustering_hdbscan_model.pkl    # 모델 파일 (HDBSCAN, UMAP, Scaler 등)
└── flc_income_clustering_hdbscan_metadata.json # 메타데이터 (성능 지표, 클러스터 프로필 등)
```

**CSV 파일 컬럼:**
- `mb_sn`: 패널 ID
- `cluster_hdbscan`: 클러스터 레이블 (-1은 노이즈)
- `umap_x`, `umap_y`: UMAP 좌표
- `life_stage`: 생애주기 단계 (1-6)
- `income_tier`: 소득 계층 (low, mid, high)
- `segment_initial`: 초기 세그먼트 (life_stage_income_tier)
- `age_scaled`, `Q6_scaled`, `education_level_scaled`: 스케일링된 피처
- `Q8_count_scaled`, `Q8_premium_index`: 전자제품 관련 피처
- `is_premium_car`: 프리미엄 차 보유 여부

---

## 🔧 작업 단계

### 1단계: 클러스터링 세션 정보 DB 적재

**목표:** `merged.clustering_sessions` 테이블에 세션 정보 저장

**작업 내용:**
- 새로운 UUID 생성 (`session_id`)
- 세션 메타데이터 추출:
  - `n_samples`: 19020
  - `n_clusters`: 18
  - `algorithm`: "HDBSCAN"
  - `silhouette_score`: 0.6192
  - `davies_bouldin_score`: 0.5322
  - `calinski_harabasz_score`: 7756.84
  - `is_precomputed`: true
  - `precomputed_name`: "hdbscan_default"
- 기존 `precomputed_name = "hdbscan_default"` 세션이 있으면 업데이트, 없으면 새로 생성

**스크립트:** `server/scripts/migrate_clustering_to_db.py` 수정 또는 새로 작성

---

### 2단계: UMAP 좌표 DB 적재

**목표:** `merged.umap_coordinates` 테이블에 UMAP 좌표 저장

**작업 내용:**
- CSV 파일에서 `mb_sn`, `umap_x`, `umap_y` 추출
- `session_id`와 함께 DB에 삽입
- 기존 좌표가 있으면 업데이트 (ON CONFLICT 처리)

**SQL 예시:**
```sql
INSERT INTO merged.umap_coordinates (session_id, mb_sn, x, y)
VALUES (:session_id, :mb_sn, :umap_x, :umap_y)
ON CONFLICT (session_id, mb_sn) DO UPDATE SET
    x = EXCLUDED.x,
    y = EXCLUDED.y,
    updated_at = CURRENT_TIMESTAMP;
```

---

### 3단계: 패널-클러스터 매핑 DB 적재

**목표:** `merged.panel_cluster_mappings` 테이블에 매핑 정보 저장

**작업 내용:**
- CSV 파일에서 `mb_sn`, `cluster_hdbscan` 추출
- `session_id`와 함께 DB에 삽입
- 노이즈 포인트(-1)도 포함

**SQL 예시:**
```sql
INSERT INTO merged.panel_cluster_mappings (session_id, mb_sn, cluster_id)
VALUES (:session_id, :mb_sn, :cluster_hdbscan)
ON CONFLICT (session_id, mb_sn) DO UPDATE SET
    cluster_id = EXCLUDED.cluster_id,
    updated_at = CURRENT_TIMESTAMP;
```

---

### 4단계: 클러스터 프로필 생성 및 DB 적재

**목표:** `merged.cluster_profiles` 테이블에 클러스터 프로필 저장

**작업 내용:**
1. **프로필 생성:**
   - 기존 스크립트 `server/scripts/generate_and_load_cluster_profiles.py` 활용
   - CSV 파일과 원본 패널 데이터(`merged.panel_data`) 결합
   - 클러스터별 통계 계산:
     - 인구통계: 평균 나이, 소득, 교육 수준
     - 가족 구성: 자녀 보유율, 평균 자녀 수
     - 소비 패턴: 전자제품 수, 프리미엄 지수, 프리미엄 차 보유율
     - 생애주기/소득 분포
   - 클러스터 이름, 태그, 인사이트 생성

2. **DB 적재:**
   - `insert_profiles_to_db()` 함수 사용
   - 기존 프로필 삭제 후 새로 삽입

**스크립트:** `server/scripts/generate_and_load_cluster_profiles.py` 실행

**실행 명령:**
```bash
cd C:\Capstone_Project
python server\scripts\generate_and_load_cluster_profiles.py
```

---

### 5단계: 클러스터 비교 데이터 생성 및 DB 적재

**목표:** `merged.cluster_comparisons` 테이블에 비교 데이터 저장

**작업 내용:**
1. **비교 데이터 생성:**
   - 모든 클러스터 쌍에 대해 비교 분석 수행
   - 비교 항목:
     - 피처별 차이 (평균값, 비율 등)
     - 통계적 유의성 검정
     - 기회 영역 (Opportunity Areas) 식별
   - JSONB 형식으로 저장

2. **DB 적재:**
   - `cluster_a`, `cluster_b`, `comparison_data` 저장
   - 기존 비교 데이터 삭제 후 새로 삽입

**스크립트:** 새로 작성 필요 (`server/scripts/generate_cluster_comparisons.py`)

**SQL 예시:**
```sql
INSERT INTO merged.cluster_comparisons (
    session_id, cluster_a, cluster_b, comparison_data
)
VALUES (
    :session_id, :cluster_a, :cluster_b, 
    CAST(:comparison_data AS jsonb)
)
ON CONFLICT (session_id, cluster_a, cluster_b) DO UPDATE SET
    comparison_data = EXCLUDED.comparison_data,
    updated_at = CURRENT_TIMESTAMP;
```

---

### 6단계: Precomputed 세션 이름 업데이트

**목표:** 기존 `precomputed_name = "hdbscan_default"` 세션을 새 결과로 업데이트

**작업 내용:**
- 기존 세션의 `is_precomputed = true`, `precomputed_name = "hdbscan_default"` 확인
- 있으면 해당 세션의 모든 관련 데이터 업데이트
- 없으면 새 세션 생성 후 `precomputed_name` 설정

**주의사항:**
- 기존 데이터를 완전히 대체해야 함
- 관련 테이블 모두 업데이트:
  - `clustering_sessions`
  - `umap_coordinates`
  - `panel_cluster_mappings`
  - `cluster_profiles`
  - `cluster_comparisons`

---

### 7단계: UI 연결 확인

**목표:** 프론트엔드에서 새로운 클러스터링 결과가 정상적으로 표시되는지 확인

**확인 항목:**
1. **ClusterLabPage:**
   - UMAP 시각화가 새로운 좌표로 표시되는지
   - 클러스터 수가 18개로 표시되는지
   - 클러스터 프로필이 정상적으로 로드되는지

2. **ComparePage:**
   - 클러스터 비교 기능이 정상 작동하는지
   - 비교 데이터가 새로운 결과를 반영하는지

3. **API 엔드포인트:**
   - `GET /api/precomputed/clustering`: 클러스터링 데이터 반환
   - `GET /api/precomputed/umap`: UMAP 좌표 반환
   - `GET /api/precomputed/profiles`: 클러스터 프로필 반환
   - `GET /api/precomputed/comparison/{cluster_a}/{cluster_b}`: 비교 데이터 반환

**테스트 방법:**
```bash
# 백엔드 서버 실행
cd C:\Capstone_Project\server
python run_server.py

# 프론트엔드 실행
cd C:\Capstone_Project
npm run dev

# 브라우저에서 확인
# http://localhost:5173/cluster-lab
```

---

## 📝 스크립트 작성 계획

### 1. 통합 마이그레이션 스크립트

**파일:** `server/scripts/migrate_new_clustering_to_db.py`

**기능:**
- CSV 파일 로드
- 세션 정보 생성 및 DB 적재
- UMAP 좌표 DB 적재
- 패널-클러스터 매핑 DB 적재
- 기존 `precomputed_name = "hdbscan_default"` 세션 업데이트

**실행 순서:**
1. CSV 파일 로드
2. 세션 정보 생성/업데이트
3. UMAP 좌표 적재
4. 패널-클러스터 매핑 적재
5. 완료 메시지 출력

---

### 2. 클러스터 프로필 생성 스크립트 (기존 활용)

**파일:** `server/scripts/generate_and_load_cluster_profiles.py`

**수정 사항:**
- 새로운 세션 ID 사용
- 새로운 클러스터 수 (18개) 반영
- 프리미엄 제품 정의 업데이트 확인

---

### 3. 클러스터 비교 데이터 생성 스크립트 (신규 작성)

**파일:** `server/scripts/generate_cluster_comparisons.py`

**기능:**
- 모든 클러스터 쌍에 대해 비교 분석
- 피처별 차이 계산
- 통계적 유의성 검정
- 기회 영역 식별
- DB 적재

**비교 항목:**
- 인구통계: 나이, 소득, 교육 수준
- 가족 구성: 자녀 보유율, 평균 자녀 수
- 소비 패턴: 전자제품 수, 프리미엄 지수, 프리미엄 차 보유율
- 생애주기/소득 분포

---

## 🗄️ 데이터베이스 스키마

### 테이블 구조

1. **`merged.clustering_sessions`**
   - `session_id` (UUID, PK)
   - `n_samples`, `n_clusters`
   - `algorithm`, `silhouette_score`, `davies_bouldin_score`, `calinski_harabasz_score`
   - `is_precomputed`, `precomputed_name`

2. **`merged.umap_coordinates`**
   - `session_id` (UUID, FK)
   - `mb_sn` (VARCHAR, FK)
   - `x`, `y` (FLOAT)
   - UNIQUE(session_id, mb_sn)

3. **`merged.panel_cluster_mappings`**
   - `session_id` (UUID, FK)
   - `mb_sn` (VARCHAR, FK)
   - `cluster_id` (INTEGER)
   - UNIQUE(session_id, mb_sn)

4. **`merged.cluster_profiles`**
   - `session_id` (UUID, FK)
   - `cluster_id` (INTEGER)
   - `size`, `percentage`
   - `name`, `tags`, `insights`
   - `distinctive_features`, `insights_by_category`, `segments`, `features` (JSONB)
   - UNIQUE(session_id, cluster_id)

5. **`merged.cluster_comparisons`**
   - `session_id` (UUID, FK)
   - `cluster_a`, `cluster_b` (INTEGER)
   - `comparison_data` (JSONB)
   - UNIQUE(session_id, cluster_a, cluster_b)

---

## ✅ 체크리스트

### 데이터 준비
- [ ] CSV 파일 확인 (`flc_income_clustering_hdbscan.csv`)
- [ ] 메타데이터 JSON 확인 (`flc_income_clustering_hdbscan_metadata.json`)
- [ ] 모델 파일 확인 (`flc_income_clustering_hdbscan_model.pkl`)

### DB 적재
- [ ] 클러스터링 세션 정보 적재
- [ ] UMAP 좌표 적재 (19,020개)
- [ ] 패널-클러스터 매핑 적재 (19,020개)
- [ ] 클러스터 프로필 생성 및 적재 (18개)
- [ ] 클러스터 비교 데이터 생성 및 적재 (18C2 = 153개 쌍)

### Precomputed 세션 업데이트
- [ ] 기존 `hdbscan_default` 세션 확인
- [ ] 새 세션으로 업데이트 또는 새로 생성
- [ ] 관련 테이블 모두 업데이트 확인

### UI 연결
- [ ] ClusterLabPage에서 UMAP 시각화 확인
- [ ] 클러스터 프로필 표시 확인
- [ ] ComparePage에서 비교 기능 확인
- [ ] API 엔드포인트 응답 확인

### 검증
- [ ] 클러스터 수 확인 (18개)
- [ ] 노이즈 포인트 확인 (41개, 0.2%)
- [ ] 성능 지표 확인 (Silhouette: 0.6192)
- [ ] 데이터 일관성 확인

---

## 🚀 실행 순서

1. **데이터 마이그레이션 스크립트 실행**
   ```bash
   python server\scripts\migrate_new_clustering_to_db.py
   ```

2. **클러스터 프로필 생성 및 적재**
   ```bash
   python server\scripts\generate_and_load_cluster_profiles.py
   ```

3. **클러스터 비교 데이터 생성 및 적재**
   ```bash
   python server\scripts\generate_cluster_comparisons.py
   ```

4. **UI 테스트**
   - 백엔드 서버 실행
   - 프론트엔드 실행
   - 브라우저에서 확인

---

## 📊 예상 작업 시간

- 데이터 마이그레이션: 30분
- 클러스터 프로필 생성: 1시간
- 클러스터 비교 데이터 생성: 1시간
- UI 테스트 및 검증: 30분

**총 예상 시간: 약 3시간**

---

## ⚠️ 주의사항

1. **기존 데이터 백업**
   - 마이그레이션 전에 기존 `hdbscan_default` 세션 데이터 백업 권장

2. **트랜잭션 처리**
   - 모든 DB 작업은 트랜잭션으로 처리하여 일관성 보장

3. **에러 처리**
   - 각 단계마다 에러 처리 및 롤백 로직 포함

4. **성능 최적화**
   - 대량 데이터 삽입 시 배치 처리 사용
   - 인덱스 활용

5. **데이터 검증**
   - 각 단계 완료 후 데이터 검증 수행

---

## 📚 참고 파일

- `server/scripts/generate_and_load_cluster_profiles.py`: 클러스터 프로필 생성 스크립트
- `server/app/utils/clustering_loader.py`: DB 로더 유틸리티
- `server/app/api/precomputed.py`: Precomputed API 엔드포인트
- `server/sql/clustering_schema.sql`: DB 스키마 정의
- `clustering_data/data/precomputed/flc_income_clustering_hdbscan.csv`: 클러스터링 결과 CSV

---

**작성일:** 2025-11-25  
**작성자:** AI Assistant  
**버전:** 1.0

