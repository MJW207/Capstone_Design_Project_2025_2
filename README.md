# Panel Insight

React와 FastAPI로 구축된 종합 패널 분석 및 클러스터링 플랫폼입니다.

## 주요 기능

### 🔍 검색 및 분석
- **의미 기반 벡터 검색**: HuggingFace Sentence-Transformers를 활용한 임베딩 기반 검색
  * 자연어 쿼리를 768차원 벡터로 변환
  * pgvector를 통한 코사인 유사도 검색
  * 유사도 0.9 이상 결과만 필터링
- **고급 필터링**: 나이, 성별, 지역, 소득 등 다중 필터 조합
- **실시간 결과**: pagination과 result count를 포함한 live search
- **패널 상세정보**: 실제 데이터 기반 상세 정보 표시 (태그, 근거, 응답이력)

### 📊 클러스터링 및 시각화
- **KNN+Leiden 클러스터링**: noise detection이 가능한 고급 clustering algorithm
- **UMAP 시각화**: 패널 cluster의 interactive 2D visualization
- **품질 지표**: silhouette score, Calinski-Harabasz index, Davies-Bouldin index
- **클러스터 프로필**: tag와 characteristic을 포함한 각 cluster의 상세 분석

### 🔄 비교 분석
- **그룹 비교**: 서로 다른 cluster나 segment 간 comparison
- **통계 분석**: difference, lift, SMD analysis
- **내보내기 옵션**: CSV 및 PNG export functionality
- **인터랙티브 차트**: comparison result의 dynamic visualization

### 📚 히스토리 및 관리
- **종합 히스토리**: query, panel, cluster, comparison analysis 추적
- **스마트 네비게이션**: 이전 analysis에 대한 quick access
- **내보내기 및 북마크**: analysis result 저장 및 공유

## 기술 스택

### Frontend
- **React 18** with TypeScript
- **Vite** build tool
- **Tailwind CSS** styling
- **Recharts** data visualization
- **Lucide React** icons
- **Sonner** notifications

### Backend
- **FastAPI** with Python 3.13
- **PostgreSQL** with **pgvector** extension (벡터 데이터베이스)
- **HuggingFace Sentence-Transformers** (임베딩 생성)
  * 모델: `intfloat/multilingual-e5-base` (768차원)
- **SQLAlchemy** (비동기 ORM)
- **NumPy & SciPy** numerical computation
- **Scikit-learn** machine learning
- **Leiden Algorithm** graph clustering
- **UMAP** dimensionality reduction

## 🚀 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/username/panel-insight.git
cd panel-insight

# 2. 의존성 설치
npm install
cd server && pip install -r requirements.txt && cd ..

# 3. 서버 실행 (두 개의 터미널에서)
# 터미널 1: 백엔드
cd server && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 터미널 2: 프론트엔드
npm run dev
```

## 시작하기

### 사전 요구사항
- **Node.js 18+** 
- **Python 3.13+**
- **npm** 또는 **yarn**
- **Git** (저장소 클론용)

### 설치

1. **저장소 클론**
   ```bash
   git clone https://github.com/YOUR_USERNAME/panel-insight.git
   cd panel-insight
   ```

2. **Frontend 의존성 설치**
   ```bash
   npm install
   ```
   
   **주요 Frontend 라이브러리**:
   - `react@^18.0.0` - UI 라이브러리
   - `typescript` - 타입 안전성
   - `vite` - 빌드 도구
   - `tailwindcss` - CSS 프레임워크
   - `recharts` - 차트 라이브러리
   - `lucide-react` - 아이콘 라이브러리
   - `sonner` - 토스트 알림
   - `html2canvas` - 이미지 내보내기

3. **Backend 의존성 설치**
   ```bash
   cd server
   pip install -r requirements.txt
   ```
   
   **주요 Python 라이브러리**:
   - `fastapi==0.115.0` - 웹 API 프레임워크
   - `uvicorn[standard]==0.30.6` - ASGI 서버
   - `sentence-transformers>=3.0.0` - HuggingFace 임베딩 생성
   - `torch>=2.0.0` - PyTorch (Sentence-Transformers 의존성)
   - `asyncpg` - 비동기 PostgreSQL 드라이버
   - `sqlalchemy[asyncio]` - 비동기 ORM
   - `numpy` - 수치 계산
   - `scikit-learn` - 머신러닝
   - `leidenalg` - 그래프 클러스터링
   - `umap-learn` - 차원 축소
   - `pandas` - 데이터 처리

### 애플리케이션 실행

#### **방법 1: CMD (Windows)**
```cmd
# 백엔드 서버 (포트 8004)
cd server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8004

# 새 창에서 프론트엔드 서버
npm run dev
```

#### **방법 2: PowerShell (Windows)**
```powershell
# 백엔드 서버 (포트 8004)
cd server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8004

# 새 창에서 프론트엔드 서버
npm run dev
```

#### **방법 3: Bash (Linux/macOS)**
```bash
# 백엔드 서버 (포트 8004)
cd server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8004

# 새 터미널에서 프론트엔드 서버
npm run dev
```

#### **방법 4: 한 줄 실행 (CMD만 가능)**
```cmd
cd server && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8004
```

### **서버 접속 URL**
- **프론트엔드**: `http://localhost:3000` 또는 `http://localhost:3001`
- **백엔드 API**: `http://127.0.0.1:8004`
- **API 문서**: `http://127.0.0.1:8004/docs` (FastAPI 자동 생성)

### **환경 설정**

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경변수를 설정하세요:

```env
# 데이터베이스 연결
DATABASE_URL=postgresql://user:password@host:port/database

# 임베딩 설정
EMBEDDING_PROVIDER=hf
EMBEDDING_MODEL=intfloat/multilingual-e5-base
EMBEDDING_DIMENSION=768

# 디버그 모드 (선택사항)
DEBUG=false
```

### **문제 해결**

#### **포트 충돌 시**

**Windows:**
```cmd
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr ":8000 :3000 :3001"

# 프로세스 강제 종료
taskkill /PID [프로세스ID] /F
```

**Linux/macOS:**
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :8000 :3000 :3001

# 프로세스 강제 종료
kill -9 [프로세스ID]
```

#### **Python 라이브러리 설치 오류 시**

**Windows:**
```cmd
# pip 업그레이드
python -m pip install --upgrade pip

# 가상환경 사용 (권장)
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Linux/macOS:**
```bash
# pip 업그레이드
python3 -m pip install --upgrade pip

# 가상환경 사용 (권장)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### **Node.js 라이브러리 설치 오류 시**

**Windows:**
```cmd
# npm 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
rmdir /s node_modules
npm install
```

**Linux/macOS:**
```bash
# npm 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules
npm install
```

## 프로젝트 구조

```
panel-insight/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── drawers/             # Modal 및 drawer components
│   │   ├── pages/               # Main page components
│   │   ├── pi/                  # Panel Insight 전용 components
│   │   ├── filter/              # 필터 컴포넌트
│   │   ├── results/             # 결과 표시 컴포넌트
│   │   ├── summary/             # 요약 정보 컴포넌트
│   │   └── ui/                  # 공통 UI 컴포넌트
│   ├── lib/                     # Utility functions 및 API calls
│   ├── types/                   # TypeScript type definitions
│   └── styles/                  # Global styles
│
├── server/                       # Backend source code
│   ├── app/                     # FastAPI application
│   │   ├── main.py             # Main application entry point
│   │   ├── api/                 # API 엔드포인트
│   │   │   ├── search.py       # 벡터 검색 API
│   │   │   ├── search_rag.py   # RAG 의미 검색 API
│   │   │   ├── panels.py       # 패널 상세정보 API
│   │   │   ├── clustering.py  # 클러스터링 API
│   │   │   └── health.py       # Health check API
│   │   ├── db/                  # 데이터베이스 레이어
│   │   │   ├── dao_panels.py   # 패널 DAO
│   │   │   ├── dao_embeddings.py # 벡터 검색 DAO
│   │   │   └── session.py      # DB 세션 관리
│   │   ├── clustering/          # 클러스터링 알고리즘
│   │   │   ├── feature_pipeline.py # 피처 전처리
│   │   │   ├── compare.py      # 그룹 비교 분석
│   │   │   └── artifacts.py    # 세션 아티팩트 관리
│   │   ├── services/            # 비즈니스 로직
│   │   │   └── embedding_service.py # 임베딩 서비스
│   │   ├── core/                # 설정 및 공통 모듈
│   │   ├── embeddings.py        # HuggingFace 임베딩 생성
│   │   └── schemas.py           # Pydantic 스키마
│   ├── configs/                 # 설정 파일
│   │   ├── categories.yml
│   │   └── keywords.yml
│   ├── sql/                     # SQL 스크립트
│   │   ├── database_schema.sql
│   │   ├── panel_embeddings_data.sql
│   │   ├── bridge_views.sql
│   │   ├── indexes.sql
│   │   └── ...
│   ├── tests/                   # 테스트 파일
│   │   ├── test_compare.py
│   │   ├── test_preproc.py
│   │   ├── test_db_connection.py
│   │   └── ...
│   ├── scripts/                 # 유틸리티 스크립트
│   │   ├── check_server.py
│   │   └── create_sample_data.py
│   ├── data/                    # 데이터 파일
│   │   └── preprocessed_sample.csv
│   └── requirements.txt         # Python dependencies
│
├── notebooks/                   # Jupyter 노트북
│   └── panel_search_system_final.ipynb  # 자연어 검색 프로세스 초안
│
├── scripts/                     # 프로젝트 스크립트
│   └── close_ports.bat
│
├── index.html                   # Vite 진입점
├── package.json                 # Frontend 의존성
├── tsconfig.json                # TypeScript 설정
├── vite.config.ts               # Vite 설정
└── README.md                    # 프로젝트 문서                    

## 주요 컴포넌트

### 검색 및 결과
- **StartPage**: quick action이 포함된 main search interface
- **ResultsPage**: table/card view와 pagination이 포함된 search results
- **FilterDrawer**: 고급 filtering options

### 클러스터링
- **ClusterLabPage**: interactive clustering analysis
- **PIClusteringExplainer**: algorithm 설명 및 FAQ
- **PIViewControls**: visualization control 및 settings

### 비교 분석
- **ComparePage**: group comparison analysis
- **PIGroupSelectionModal**: group selection interface
- **ExportDrawer**: data export options

### 히스토리 및 네비게이션
- **PIHistoryDrawer**: 종합 history management
- **PICommandPalette**: quick command access
- **PIPanelWindow**: panel detail viewer

## API 엔드포인트

### 검색
- `POST /api/search` - **의미 기반 벡터 검색** (임베딩 기반)
  * 자연어 쿼리를 벡터로 변환하여 유사도 검색
  * 필터 및 페이지네이션 지원
  * 유사도 0.9 이상 결과만 반환
- `GET /api/panels/{panel_id}` - 패널 상세정보 조회
  * 실제 데이터 기반 정보 표시 (태그, 근거, 응답이력)

### Health Check
- `GET /health` - 기본 Health check
- `GET /health/db` - 데이터베이스 연결 상태 확인
- `GET /healthz` - 종합 Health check (DB, 임베딩 모델 상태)
- `POST /health/enable-pgvector` - pgvector 확장 활성화

### 클러스터링 (현재 비활성화)
- `POST /api/clustering/global-pca` - global PCA model training
- `POST /api/clustering/cluster` - clustering analysis 실행

### 비교 분석 (현재 비활성화)
- `GET /api/groups` - 사용 가능한 group (cluster/segment) 조회
- `POST /api/compare` - 두 group 비교

## 벡터 검색 시스템

### 작동 방식
1. **쿼리 입력**: 사용자가 자연어로 검색어 입력 (예: "서울 거주 20대 여성")
2. **임베딩 생성**: HuggingFace Sentence-Transformers가 쿼리를 768차원 벡터로 변환
   - 자동으로 `query: ` 프롬프트 추가
   - 정규화된 벡터 생성 (코사인 유사도 최적화)
3. **벡터 검색**: pgvector를 사용하여 데이터베이스에서 유사한 임베딩 검색
   - 코사인 거리 (`<#>` 연산자) 사용
   - 유사도 = 1 - 거리
   - 유사도 0.9 이상만 필터링
4. **결과 조인**: 벡터 검색 결과를 RawData 테이블과 JOIN하여 상세 정보 반환

### 데이터베이스 요구사항
- **PostgreSQL 12+** 
- **pgvector 확장** 설치 필요
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- 벡터 타입 컬럼이 있는 테이블/뷰 필요
  - 권장: `testcl.panel_embeddings` 테이블
  - 뷰: `RawData.panel_embeddings_v` (자동 생성)

### 검색 예시
```bash
# API 호출
curl -X POST "http://127.0.0.1:8004/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "서울 거주 커피 좋아하는 패널",
    "page": 1,
    "limit": 20,
    "filters": {
      "selectedGenders": ["F"],
      "selectedRegions": ["서울"]
    }
  }'
```

## 개발

### 코드 스타일
- Type safety를 위한 TypeScript 사용
- Code formatting을 위한 ESLint와 Prettier
- Component-based architecture
- State management를 위한 custom hooks
- 비동기 프로그래밍 (async/await)

### 테스트
- Frontend: Jest와 React Testing Library
- Backend: API test를 위한 Pytest

## 기여하기

1. Repository fork
2. Feature branch 생성
3. 변경사항 적용
4. Test 추가 (해당하는 경우)
5. Pull request 제출

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

