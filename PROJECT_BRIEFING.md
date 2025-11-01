# Panel Insight API - 전체 프로젝트 브리핑

## 📋 프로젝트 개요

**Panel Insight API**는 패널 데이터의 검색, 클러스터링, 비교 분석을 제공하는 FastAPI 기반 백엔드 서비스입니다.

- **기술 스택**: FastAPI, PostgreSQL (Neon), SQLAlchemy (asyncio), NumPy, Pandas, Scikit-learn, UMAP
- **주요 기능**: 필터 기반 검색, RAG 의미 검색, 클러스터링, 그룹 비교, UMAP 시각화

---

## 🏗️ 시스템 아키텍처

### 디렉토리 구조

```
server/
├── app/
│   ├── main.py              # FastAPI 앱 진입점 (74줄, 슬림화)
│   ├── api/                 # API 엔드포인트 라우터
│   │   ├── search.py        # 필터 전용 검색
│   │   ├── search_rag.py    # RAG 의미 검색 (자연어)
│   │   ├── clustering.py   # 클러스터링 & 비교
│   │   ├── panels.py        # 패널 상세 조회
│   │   └── health.py        # Health check
│   ├── db/                  # 데이터베이스 레이어
│   │   ├── session.py       # 비동기 DB 세션 관리
│   │   └── dao_panels.py   # 패널 데이터 접근 객체
│   ├── clustering/         # 클러스터링 로직
│   │   ├── feature_pipeline.py  # 피처 전처리
│   │   ├── compare.py          # 그룹 비교 (SMD, JSD)
│   │   └── artifacts.py        # 세션 아티팩트 저장/로드
│   └── core/
│       └── config.py        # 설정 관리
├── configs/                 # 설정 파일
│   ├── categories.yml
│   └── keywords.yml
├── sql/                     # SQL 스크립트
├── tests/                   # 단위 테스트
└── requirements.txt         # Python 의존성
```

---

## 🔌 API 엔드포인트

### 1. 검색 API

#### `POST /api/search` - 필터 전용 검색
- **목적**: 성별, 지역, 나이 등 필터만으로 패널 검색
- **LIKE 기반 검색 제거**: 완전히 필터 전용
- **Request**:
  ```json
  {
    "filters": {
      "selectedGenders": ["M", "F"],
      "selectedRegions": ["서울", "경기"],
      "ageRange": [20, 30]
    },
    "page": 1,
    "limit": 20
  }
  ```
- **Response**:
  ```json
  {
    "results": [...],
    "total": 1000,
    "page": 1,
    "pages": 50,
    "mode": "filter"
  }
  ```

#### `POST /api/search/rag` - RAG 의미 검색
- **목적**: 자연어 쿼리로 의미 기반 검색 (현재는 플레이스홀더)
- **Request**:
  ```json
  {
    "query": "20대 서울 거주 커피 좋아하는 패널",
    "filters": {...},
    "top_k": 20
  }
  ```
- **Response**:
  ```json
  {
    "mode": "rag",
    "answer": "요약 텍스트",
    "chunks": [{...}]
  }
  ```

### 2. 클러스터링 API

#### `POST /api/clustering/run` - 클러스터링 실행
- **입력**: 패널 ID 리스트, 알고리즘 설정
- **출력**: 세션 ID, 클러스터 라벨, 평가 지표
- **알고리즘**: K-Means, HDBSCAN 지원
- **평가 지표**: Silhouette, Calinski-Harabasz, Davies-Bouldin

#### `POST /api/clustering/compare` - 그룹 비교
- **입력**: `session_id`, 클러스터 ID 2개 (c1, c2)
- **출력**: 
  - 연속형: SMD (Standardized Mean Difference)
  - 범주/이진: JSD (Jensen-Shannon Divergence)
  - **rankings**: 정렬된 결과
    - `continuous`: |SMD| 내림차순
    - `categorical`: JSD 내림차순

#### `POST /api/clustering/umap` - UMAP 2D 좌표
- **입력**: `session_id`, 샘플링 옵션
- **출력**: 2D 좌표 배열 (시각화용)
- **메트릭**: cosine, euclidean, manhattan

#### `GET /api/clustering/sessions` - 세션 목록
- **출력**: 저장된 클러스터링 세션 목록

#### `GET /api/clustering/sessions/{session_id}` - 세션 상세
- **출력**: 세션 메타데이터, 아티팩트 정보

### 3. 패널 API

#### `GET /api/panels/{panel_id}` - 패널 상세
- **출력**: 패널 ID, 인구통계, 응답 텍스트 등

### 4. Health API

#### `GET /health` - 기본 Health check
- **출력**: `{"ok": true}`

#### `GET /health/db` - DB 연결 확인
- **출력**: `{"ok": true, "search_path": "...", "version": "..."}`

#### `GET /health/raw-sample?limit=5` - RawData 샘플 조회
- **출력**: RawData 스키마에서 샘플 데이터

---

## 💾 데이터베이스 구조

### 스키마: `RawData`
- **`welcome_1st`**: 기본 인구통계 (성별, 지역, 나이 등)
- **`welcome_2nd`**: 상세 응답 (JSONB)
- **`quick_answer`**: 빠른 응답 (JSONB)

### 스키마: `testcl`
- **`panel_embeddings_v`** (뷰): 패널 임베딩 통합 뷰

### 연결 관리
- **비동기 엔진**: SQLAlchemy `create_async_engine` (psycopg)
- **연결 풀**: QueuePool (기본) 또는 NullPool (Neon 서버리스)
- **search_path 고정**: 모든 세션에서 `"RawData", public` 우선 탐색

### 환경 변수
```env
# DB 연결 (우선순위: ASYNC_DATABASE_URI > PG*/DB* 개별 변수)
ASYNC_DATABASE_URI=postgresql+psycopg://...
# 또는
PGHOST=...
PGPORT=5432
PGDATABASE=...
PGUSER=...
PGPASSWORD=...
PGSSLMODE=require

# Neon 서버리스 권장
DB_USE_NULL_POOL=true
```

---

## 🔄 데이터 흐름

### 1. 검색 흐름
```
Client → POST /api/search
  → app.api.search.api_search_post()
  → app.db.dao_panels.search_panels()
  → RawData 스키마 쿼리 (LIKE 없음, 필터만)
  → 결과 반환
```

### 2. 클러스터링 흐름
```
Client → POST /api/clustering/run
  → extract_features_for_clustering() (RawData에서 피처 추출)
  → preprocess() (전처리: 정규화, PCA 등)
  → K-Means/HDBSCAN 실행
  → save_artifacts() (세션 저장)
  → 결과 반환 (session_id 포함)
```

### 3. 비교 흐름
```
Client → POST /api/clustering/compare
  → load_artifacts() (세션 로드)
  → compare_groups() (SMD, JSD 계산)
  → rankings 생성 (정렬 규칙 적용)
  → 결과 반환
```

---

## 🎯 주요 기능 상세

### 1. 필터 전용 검색
- **LIKE/ILIKE 완전 제거**: 모든 텍스트 검색 제거
- **정확 매칭**: 성별, 지역은 정확 매칭
- **범위 검색**: 나이는 `age_min`, `age_max`로 범위 검색
- **리스트 지원**: 성별, 지역은 배열로 다중 선택 가능

### 2. 클러스터링
- **알고리즘**: K-Means (기본), HDBSCAN (옵션)
- **전처리**: 
  - 구형 정규화 (spherical normalization)
  - 키워드 PCA (옵션)
  - 범주형 인코딩
- **평가**: 3가지 지표 자동 계산

### 3. 그룹 비교
- **연속형 피처**: SMD (Standardized Mean Difference)
  - 정렬: |SMD| 내림차순 (`rankings.continuous`)
- **범주/이진 피처**: JSD (Jensen-Shannon Divergence)
  - 정렬: JSD 내림차순 (`rankings.categorical`)
- **상위 N 추출**: `highlights` 필드 제공

### 4. UMAP 시각화
- **동적 계산**: 세션 아티팩트에서 피처 재생성 후 UMAP 적용
- **샘플링**: 대용량 데이터 처리 (sample 옵션)
- **메트릭**: cosine, euclidean, manhattan 지원

---

## 🛠️ 기술적 특징

### 1. 비동기 처리
- **전체 API**: FastAPI async/await
- **DB 세션**: SQLAlchemy AsyncSession
- **연결 풀**: Neon 서버리스 환경에 최적화 (NullPool 옵션)

### 2. 세션 관리
- **lifespan**: FastAPI lifespan으로 startup/shutdown 처리
- **DB 연결**: 앱 시작 시 확인, 종료 시 정리

### 3. 코드 정리
- **중복 제거**: 동기 DB 엔진 코드 삭제 (비동기로 통일)
- **불필요한 파일 삭제**: demo.py, dummy_items.py 등
- **슬림화**: main.py를 74줄로 축소

---

## 📊 현재 상태

### ✅ 완료된 기능
1. 필터 전용 검색 (`/api/search`)
2. 클러스터링 실행/비교 (`/api/clustering/*`)
3. UMAP 2D 좌표 계산 (`/api/clustering/umap`)
4. Health check API (`/health/*`)
5. 비동기 DB 연결 (NullPool 옵션)
6. 세션 아티팩트 저장/로드

### 🚧 진행 중
1. **RAG 의미 검색** (`/api/search/rag`)
   - 현재는 플레이스홀더 (필터 검색 + 텍스트 매칭)
   - 향후: pgvector + LangChain 통합 예정

### 📝 향후 계획
1. pgvector 기반 실제 임베딩 검색
2. LangChain Retriever 통합
3. RAG 답변 생성 (LLM 연동)

---

## 🔧 실행 방법

### 백엔드 실행
```bash
cd server
python -m uvicorn app.main:app --reload --port 8004 --host 127.0.0.1
```

### 확인
- http://127.0.0.1:8004/ → `{"name": "Panel Insight API", "version": "0.1.0"}`
- http://127.0.0.1:8004/docs → Swagger UI
- http://127.0.0.1:8004/health → `{"ok": true}`

---

## 📈 성능 및 최적화

### DB 연결
- **비동기 처리**: 모든 DB 쿼리 비동기
- **연결 풀**: QueuePool 또는 NullPool (Neon 권장)
- **search_path 고정**: 스키마 접두사 생략 가능

### 클러스터링
- **세션 저장**: 결과 재사용 가능
- **UMAP 샘플링**: 대용량 데이터 처리

---

## 🎯 요약

| 항목 | 상태 |
|------|------|
| **검색** | ✅ 필터 전용 (LIKE 제거 완료) |
| **RAG 검색** | 🚧 플레이스홀더 (향후 pgvector 통합) |
| **클러스터링** | ✅ 완료 (K-Means, HDBSCAN) |
| **비교 분석** | ✅ 완료 (SMD, JSD, rankings) |
| **UMAP 시각화** | ✅ 완료 (동적 계산) |
| **DB 연결** | ✅ 비동기 (NullPool 옵션) |
| **Health Check** | ✅ 완료 (3개 엔드포인트) |

---

## 📚 주요 파일 참고

- **`server/app/main.py`**: FastAPI 앱 진입점
- **`server/app/db/session.py`**: 비동기 DB 세션 관리
- **`server/app/api/search.py`**: 필터 전용 검색
- **`server/app/api/search_rag.py`**: RAG 검색 (플레이스홀더)
- **`server/app/api/clustering.py`**: 클러스터링 & 비교
- **`server/app/clustering/compare.py`**: SMD/JSD 계산 및 rankings

---

**최종 업데이트**: 2024년 현재  
**버전**: 0.1.0


