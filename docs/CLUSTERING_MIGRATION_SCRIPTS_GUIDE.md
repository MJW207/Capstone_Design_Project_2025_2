# 클러스터링 데이터 마이그레이션 스크립트 가이드

## 📋 작성된 스크립트 목록

### 1. `server/scripts/migrate_new_clustering_to_db.py`
**목적:** 새로운 클러스터링 결과를 NeonDB에 적재

**작업 내용:**
- 클러스터링 세션 정보 DB 적재 (`merged.clustering_sessions`)
- UMAP 좌표 DB 적재 (`merged.umap_coordinates`) - 19,020개
- 패널-클러스터 매핑 DB 적재 (`merged.panel_cluster_mappings`) - 19,020개
- Precomputed 세션 이름 설정 (`precomputed_name = "hdbscan_default"`)

**입력 파일:**
- `clustering_data/data/precomputed/flc_income_clustering_hdbscan.csv`
- `clustering_data/data/precomputed/flc_income_clustering_hdbscan_metadata.json`

**실행 명령:**
```bash
cd C:\Capstone_Project
python server\scripts\migrate_new_clustering_to_db.py
```

**상태:** ✅ 완료

---

### 2. `server/scripts/generate_and_load_cluster_profiles.py`
**목적:** 클러스터 프로필 생성 및 DB 적재

**작업 내용:**
- 원본 패널 데이터 로드 (`merged.panel_data`)
- 피처 추출 및 변환
- 클러스터별 프로필 분석 (18개 클러스터)
- 클러스터 이름, 태그, 인사이트 생성
- DB 적재 (`merged.cluster_profiles`)

**실행 명령:**
```bash
cd C:\Capstone_Project
python server\scripts\generate_and_load_cluster_profiles.py
```

**상태:** ✅ 완료

---

### 3. `server/scripts/generate_cluster_comparisons.py`
**목적:** 클러스터 비교 데이터 생성 및 DB 적재

**작업 내용:**
- 모든 클러스터 쌍에 대해 비교 분석 (18C2 = 153개 쌍)
- 피처별 차이 계산 (연속형/범주형)
- 통계적 유의성 검정 (t-검정)
- DB 적재 (`merged.cluster_comparisons`)

**실행 명령:**
```bash
cd C:\Capstone_Project
python server\scripts\generate_cluster_comparisons.py
```

**상태:** ⚠️ JSON 직렬화 오류 수정 완료, 재실행 필요

**알려진 이슈:**
- `bool` 타입 JSON 직렬화 오류 → 수정 완료 (`default=str` 추가)
- `int64` 타입 JSON 직렬화 오류 → 수정 완료 (명시적 `int()` 변환)

---

## 🚀 실행 순서

### 전체 마이그레이션 (처음부터)
```bash
# 1단계: 기본 데이터 마이그레이션
python server\scripts\migrate_new_clustering_to_db.py

# 2단계: 클러스터 프로필 생성
python server\scripts\generate_and_load_cluster_profiles.py

# 3단계: 클러스터 비교 데이터 생성
python server\scripts\generate_cluster_comparisons.py
```

### 비교 데이터만 재생성
```bash
# 비교 데이터만 다시 생성하고 싶을 때
python server\scripts\generate_cluster_comparisons.py
```

---

## 📊 예상 실행 시간

- **1단계 (migrate_new_clustering_to_db.py):** 약 15초
- **2단계 (generate_and_load_cluster_profiles.py):** 약 20초
- **3단계 (generate_cluster_comparisons.py):** 약 2-3분 (153개 쌍 비교)

**총 예상 시간:** 약 3-4분

---

## ✅ 완료 체크리스트

### 1단계 완료 확인
- [ ] `merged.clustering_sessions` 테이블에 세션 정보 확인
- [ ] `merged.umap_coordinates` 테이블에 19,020개 좌표 확인
- [ ] `merged.panel_cluster_mappings` 테이블에 19,020개 매핑 확인
- [ ] `precomputed_name = "hdbscan_default"` 설정 확인

### 2단계 완료 확인
- [ ] `merged.cluster_profiles` 테이블에 18개 프로필 확인
- [ ] 각 프로필에 `name`, `tags`, `insights` 포함 확인

### 3단계 완료 확인
- [ ] `merged.cluster_comparisons` 테이블에 153개 비교 데이터 확인
- [ ] 각 비교 데이터에 `comparison_data` JSONB 포함 확인

---

## 🔍 DB 확인 쿼리

### 세션 정보 확인
```sql
SELECT 
    session_id, 
    n_samples, 
    n_clusters, 
    silhouette_score,
    is_precomputed,
    precomputed_name
FROM merged.clustering_sessions
WHERE precomputed_name = 'hdbscan_default';
```

### UMAP 좌표 개수 확인
```sql
SELECT COUNT(*) as total_coordinates
FROM merged.umap_coordinates
WHERE session_id = (
    SELECT session_id 
    FROM merged.clustering_sessions 
    WHERE precomputed_name = 'hdbscan_default'
    LIMIT 1
);
```

### 클러스터 프로필 확인
```sql
SELECT 
    cluster_id, 
    size, 
    percentage, 
    name
FROM merged.cluster_profiles
WHERE session_id = (
    SELECT session_id 
    FROM merged.clustering_sessions 
    WHERE precomputed_name = 'hdbscan_default'
    LIMIT 1
)
ORDER BY cluster_id;
```

### 비교 데이터 개수 확인
```sql
SELECT COUNT(*) as total_comparisons
FROM merged.cluster_comparisons
WHERE session_id = (
    SELECT session_id 
    FROM merged.clustering_sessions 
    WHERE precomputed_name = 'hdbscan_default'
    LIMIT 1
);
```

---

## ⚠️ 주의사항

1. **환경변수 확인**
   - `ASYNC_DATABASE_URI` 환경변수가 설정되어 있어야 합니다
   - `.env` 파일에 올바른 DB 연결 정보가 있는지 확인

2. **데이터 덮어쓰기**
   - 기존 `precomputed_name = "hdbscan_default"` 세션이 있으면 업데이트됩니다
   - 기존 데이터를 백업하고 싶다면 먼저 백업하세요

3. **실행 순서**
   - 반드시 1단계 → 2단계 → 3단계 순서로 실행해야 합니다
   - 각 단계는 이전 단계의 결과에 의존합니다

4. **에러 발생 시**
   - 로그를 확인하여 어느 단계에서 실패했는지 확인
   - DB 연결 오류인지, 데이터 문제인지 확인
   - 필요시 해당 단계만 재실행

---

## 📝 로그 확인

각 스크립트는 상세한 로그를 출력합니다:
- ✅ 성공: `✅ 클러스터 프로필 생성 및 DB 적재 완료!`
- ❌ 실패: 에러 메시지와 트레이스백 출력

---

**작성일:** 2025-11-25  
**버전:** 1.0

