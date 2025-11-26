# Panel Insight

React와 FastAPI로 구축된 종합 패널 분석 및 클러스터링 플랫폼입니다. 의미 기반 벡터 검색, 사전 클러스터링 기반 군집 분석, 그리고 다양한 시각화를 통한 그룹 비교 분석을 제공합니다.

## 📋 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [빠른 시작](#빠른-시작)
- [프로젝트 구조](#프로젝트-구조)
- [주요 컴포넌트](#주요-컴포넌트)
- [API 엔드포인트](#api-엔드포인트)
- [비교 분석 기능](#비교-분석-기능)
- [Pinecone 검색 프로세스](#pinecone-검색-프로세스)
- [클러스터링 방법론](#클러스터링-방법론)
- [문제 해결](#문제-해결)
- [개발 가이드](#개발-가이드)

## 주요 기능

### 🔍 검색 및 분석

- **의미 기반 벡터 검색**: Pinecone과 OpenAI Embeddings를 활용한 임베딩 기반 검색
  * 자연어 쿼리를 벡터로 변환하여 의미 기반 검색
  * Pinecone을 통한 코사인 유사도 검색
  * 단계적 필터링 및 메타데이터 기반 검색
  * QuickPoll 응답 여부 자동 감지 (Q+W / W 표시)
- **고급 필터링**: 나이, 성별, 지역, 소득 등 다중 필터 조합
- **실시간 결과**: pagination과 result count를 포함한 live search
- **패널 상세정보**: NeonDB 기반 실제 데이터 표시 (태그, 근거, 응답이력)
- **프리셋 관리**: 자주 사용하는 필터 조합을 프리셋으로 저장 및 재사용
- **SummaryBar 통계**: 검색 결과의 통계 정보를 한눈에 확인
  * 전체 Found 수, 평균 연령, 성비, 주요 지역, Q+W 비율
  * 평균 월수입, 기혼/미혼 비율, 차량 보유율, 주요 스마트폰 브랜드
  * 클릭 가능한 칩으로 상세 분포 그래프 확인

### 📊 클러스터링 및 시각화

- **사전 클러스터링 기반 분석**: 사전에 전처리한 데이터로 사전 클러스터링을 수행한 뒤, 검색 결과로 나온 패널들이 UMAP 상에서 어디에 위치하는지 파악하는 방식으로 군집 분석을 수행합니다.
- **HDBSCAN 밀도 기반 클러스터링**: 
  * **알고리즘**: HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise)
  * **참고 논문**: McInnes, L., Healy, J., & Astels, S. (2017). HDBSCAN: Hierarchical density based clustering. Journal of Open Source Software, 2(11), 205.
  * **최적 파라미터**: 
    - `min_cluster_size`: 50 (최소 클러스터 크기)
    - `min_samples`: 50 (최소 샘플 수)
    - `metric`: euclidean (유클리드 거리)
    - `cluster_selection_method`: eom (Excess of Mass)
  * **성능 지표**: 
    - Silhouette Score: 0.6014 (K-Means 대비 +96.5% 향상)
    - Davies-Bouldin Index: 0.6872 (낮을수록 좋음)
    - Calinski-Harabasz Index: 6385.79
    - 클러스터 수: 19개 (자동 결정)
    - 노이즈 포인트: 0.3% (매우 낮음)
- **데이터 전처리 과정**:
  1. **생애주기 분류**: 연령과 자녀 유무를 기반으로 6단계 분류 (Young Singles, DINK, Young Parents, Mature Parents, Middle Age, Seniors)
     * **참고 논문**: Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.
  2. **소득 계층 분류**: 소득을 3분위로 분류 (Low, Mid, High)
  3. **초기 세그먼트 생성**: 생애주기 × 소득 계층 = 18개 조합
  4. **원-핫 인코딩**: 18개 세그먼트를 원-핫 벡터로 변환
  5. **추가 피처 결합**: 연령, 소득, 교육 수준, 프리미엄 지수 등 6개 연속형 변수 추가
  6. **표준화**: StandardScaler를 사용하여 모든 피처를 표준화 (평균 0, 표준편차 1)
- **UMAP 차원 축소**: 
  * **목적**: 고차원 클러스터링 결과를 2D 공간으로 시각화
  * **파라미터**: 
    - `n_components`: 2
    - `n_neighbors`: 15
    - `min_dist`: 0.1
    - `metric`: cosine
  * **참고 논문**: McInnes, L., Healy, J., & Melville, J. (2018). UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction. arXiv preprint arXiv:1802.03426.
  * **성능 최적화**: 
    - 호버 기반 툴팁 렌더링 (기본 정보는 표시하지 않음)
    - NeonDB에서 패널 프로필 정보를 지연 로드 (on-hover)
    - `useMemo`, `useCallback`을 활용한 렌더링 최적화
- **클러스터 프로필**: NeonDB에서 로드되는 tag, insights, segments, insights_by_category를 포함한 각 cluster의 상세 분석
- **품질 지표**: silhouette score, Calinski-Harabasz index, Davies-Bouldin index
- **클러스터 필터링**: 특정 클러스터만 선택하여 분석
- **확장 클러스터링**: 검색된 패널 주변의 클러스터 분석 (Precomputed HDBSCAN 결과 활용)

### 🔄 비교 분석

- **그룹 비교**: 서로 다른 cluster나 segment 간 comparison
- **다양한 차트 타입**:
  * **레이더 차트**: 핵심 8개 지표를 한눈에 비교 (연령, 소득, 프리미엄 지수, 음주 유형 수, 흡연 경험, 전자제품 수, 대졸 이상, 프리미엄 폰)
  * **히트맵**: 이진형 변수들의 비율 차이를 그룹별로 접기/펼치기 가능 (인구·사회, 음주, 흡연, 디지털/브랜드, 차량, 지역)
  * **스택 바 차트**: 범주형 변수 분포를 100% 스택으로 비교 (여러 변수 동시 표시 가능)
  * **인덱스 도트 플롯**: 전체 평균 대비 클러스터별 비율 (Index = 군집비율/전체비율 × 100, 120 이상 강조)
- **변수 선택 패널**: 사용자가 원하는 변수를 자유롭게 선택하고 순서 조정 가능
  * 리사이즈 가능한 패널
  * 부드러운 애니메이션
  * 휠 스크롤 지원
- **통계 분석**: difference, lift, SMD analysis, Cohen's d
- **변수 설명**: 주요 변수(프리미엄 지수, 수도권, 프리미엄 폰 등)의 정의 및 계산 방식 설명
- **주요 차이점 하이라이트**: 가장 큰 차이를 보이는 변수들을 자동으로 하이라이트
- **내보내기 옵션**: CSV, JSON, TXT 및 PNG export functionality

### 📚 히스토리 및 북마크

- **종합 히스토리**: query, panel, cluster, comparison analysis 추적
- **스마트 네비게이션**: 이전 analysis에 대한 quick access
- **북마크 기능**: 패널, 클러스터, 비교 분석 결과를 북마크로 저장
- **북마크 관리**: 북마크 패널에서 개별 삭제 및 전체 관리

### 🎨 UI/UX

- **다크 모드**: 완전한 다크 모드 지원
- **반응형 디자인**: 다양한 화면 크기에 최적화
- **애니메이션**: Framer Motion을 활용한 부드러운 전환 효과
- **탭 음영 처리**: 선택된 탭(검색 결과/군집 분석/비교 분석)을 명확하게 구분
- **인터랙티브 통계 그래프**: SummaryBar 칩 클릭 시 상세 분포 그래프 표시
  * 지역 분포 (막대그래프)
  * 차량 브랜드 분포 (막대그래프)
  * 스마트폰 브랜드 분포 (막대그래프)
  * 직업 분포 (막대그래프)
  * 소득 분포 (막대그래프)
  * 연령 분포 (막대그래프)
  * 기혼인 사람의 자녀 분포 (막대그래프)
  * 리사이즈 가능한 drawer (400px ~ 1200px)

## 기술 스택

### Frontend

- **React 18** with TypeScript
- **Vite** build tool
- **Tailwind CSS** styling
- **Radix UI** 컴포넌트 라이브러리
- **Framer Motion** 애니메이션
- **Recharts** 데이터 시각화
- **Lucide React** 아이콘
- **Sonner** 알림
- **html2canvas** 이미지 내보내기

### Backend

- **FastAPI** with Python 3.13
- **NeonDB (PostgreSQL)** 패널 데이터 저장 및 클러스터링 데이터 관리
- **Pinecone** 벡터 검색 엔진 (클라우드 기반)
- **OpenAI Embeddings** (임베딩 생성)
  * 모델: `text-embedding-3-small`
- **Pinecone Client** Pinecone 통합
- **SQLAlchemy** (비동기 ORM)
- **NumPy & SciPy** 수치 계산
- **Scikit-learn** 머신러닝
- **HDBSCAN** 밀도 기반 클러스터링
- **UMAP** 차원 축소
- **Anthropic Claude** (메타데이터 추출 및 카테고리 분류, 텍스트 생성)

## 🚀 빠른 시작

### 사전 요구사항

- **Node.js 18+** 
- **Python 3.13+**
- **PostgreSQL 12+**
- **npm** 또는 **yarn**
- **Pinecone** (클라우드 벡터 데이터베이스)
  * Pinecone API 키 필요

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

3. **Backend 의존성 설치**
   
   **방법 1: 전체 설치 (권장)**
   ```bash
   cd server
   pip install -r requirements.txt
   cd ..
   ```
   
   **방법 2: 가상환경 사용 (권장)**
   ```bash
   # 가상환경 생성
   python -m venv venv
   
   # 가상환경 활성화
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   
   # 의존성 설치
   cd server
   pip install --upgrade pip
   pip install -r requirements.txt
   cd ..
   ```
   
   **설치되는 주요 패키지 카테고리**:
   - **Web Framework**: FastAPI, Uvicorn
   - **Database**: PostgreSQL (psycopg), pgvector, SQLAlchemy (비동기)
   - **Configuration**: python-dotenv, pydantic-settings
   - **Data Processing**: pandas, numpy, scipy, pyyaml, pyarrow
   - **Machine Learning & Clustering**: scikit-learn, HDBSCAN, UMAP
   - **벡터 검색**: anthropic, openai, pinecone
   - **OpenAI**: `openai>=1.0.0` (임베딩 생성용)
   - **HTTP Client**: httpx
   - **Testing**: pytest
   
   **주의사항**:
   - Python 3.13+ 필요
   - Pinecone은 클라우드 기반이므로 API 키 설정이 필요합니다

4. **환경 변수 설정**
   
   프로젝트 루트에 `.env` 파일을 생성하고 다음 환경변수를 설정하세요:
   ```env
   # 데이터베이스 연결 (선택적, 세션 관리용)
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # Pinecone 설정
   PINECONE_API_KEY=your_pinecone_api_key_here
   PINECONE_INDEX_NAME=panel-profiles
   PINECONE_ENVIRONMENT=us-east-1
   
   # 임베딩 설정 (OpenAI)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Anthropic API (메타데이터 추출 및 카테고리 분류용)
   ANTHROPIC_API_KEY=your_anthropic_api_key_here

   ```

### 애플리케이션 실행

#### **백엔드 서버 실행**
```bash
cd server
python run_server.py
# 또는
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8004
```

#### **프론트엔드 서버 실행** (새 터미널)
```bash
npm run dev
```

### **서버 접속 URL**
- **프론트엔드**: `http://localhost:3000` 또는 `http://localhost:3001`
- **백엔드 API**: `http://127.0.0.1:8004`
- **API 문서**: `http://127.0.0.1:8004/docs` (FastAPI 자동 생성)

## 프로젝트 구조

```
panel-insight/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── drawers/             # Modal 및 drawer components
│   │   │   ├── FilterDrawer.tsx
│   │   │   ├── PanelDetailDrawer.tsx
│   │   │   ├── ClusterDetailDrawer.tsx
│   │   │   └── ExportDrawer.tsx
│   │   └── pages/               # Main page components
│   │       ├── StartPage.tsx
│   │       ├── ResultsPage.tsx
│   │       ├── ClusterLabPage.tsx
│   │       └── ComparePage.tsx
│   ├── lib/                     # Utility functions 및 API calls
│   │   ├── utils.ts
│   │   ├── history.ts
│   │   ├── bookmarkManager.ts
│   │   ├── presetManager.ts
│   │   └── DarkModeSystem.tsx
│   ├── types/                   # TypeScript type definitions
│   ├── ui/                      # UI 컴포넌트 라이브러리
│   │   ├── pi/                  # Panel Insight 전용 components
│   │   ├── profiling-ui-kit/    # 프로파일링 UI 컴포넌트
│   │   │   └── components/
│   │   │       └── comparison/  # 비교 분석 컴포넌트
│   │   │           ├── PIRadarChart.tsx
│   │   │           ├── PIBinaryHeatmap.tsx
│   │   │           ├── PIStackedBarChart.tsx
│   │   │           ├── PIIndexDotPlot.tsx
│   │   │           ├── PIFeatureSelector.tsx
│   │   │           └── PIVariableDescription.tsx
│   │   ├── summary/             # 요약 정보 컴포넌트
│   │   └── base/                # 기본 UI 컴포넌트
│   └── styles/                  # Global styles
│
├── server/                       # Backend source code
│   ├── app/                     # FastAPI application
│   │   ├── main.py             # Main application entry point
│   │   ├── api/                 # API 엔드포인트
│   │   │   ├── search.py       # 벡터 검색 API
│   │   │   ├── panels.py       # 패널 상세정보 API
│   │   │   ├── clustering.py  # 클러스터링 API
│   │   │   ├── precomputed.py  # 사전 계산된 데이터 API
│   │   │   └── health.py       # Health check API
│   │   ├── db/                  # 데이터베이스 레이어
│   │   │   ├── dao_panels.py   # 패널 DAO
│   │   │   ├── dao_embeddings.py # 벡터 검색 DAO
│   │   │   └── session.py      # DB 세션 관리
│   │   ├── clustering/          # 클러스터링 알고리즘
│   │   │   ├── compare.py      # 그룹 비교 분석
│   │   │   ├── data_preprocessor.py # 데이터 전처리
│   │   │   └── generate_hdbscan_comparisons.py # 비교 데이터 생성
│   │   ├── services/            # 비즈니스 로직
│   │   │   ├── pinecone_pipeline.py # Pinecone 검색 파이프라인
│   │   │   ├── metadata_extractor.py # 메타데이터 추출
│   │   │   └── embedding_generator.py # OpenAI 임베딩 생성
│   ├── configs/                 # 설정 파일
│   ├── sql/                     # SQL 스크립트
│   ├── tests/                   # 테스트 파일
│   └── requirements.txt         # Python dependencies
│
├── docs/                         # 프로젝트 문서
├── scripts/                     # 프로젝트 스크립트
├── index.html                   # Vite 진입점
├── package.json                 # Frontend 의존성
├── tsconfig.json                # TypeScript 설정
├── vite.config.ts               # Vite 설정
└── README.md                    # 프로젝트 문서
```

## 주요 컴포넌트

### 검색 및 결과
- **StartPage**: quick action이 포함된 main search interface
- **ResultsPage**: table view와 pagination이 포함된 search results
  * 카드 뷰 및 테이블 뷰 지원
  * Q+W/W 배지 표시 (QuickPoll 응답 여부)
  * 아이콘 및 색상으로 정보 시각화
- **FilterDrawer**: 고급 filtering options (나이, 성별, 지역, 소득 등)
- **PanelDetailDrawer**: 패널 상세 정보 표시 (태그, 근거, 응답이력)
- **SummaryBar**: 검색 결과 통계 요약 및 인터랙티브 그래프
  * 클릭 가능한 칩으로 상세 분포 그래프 확인
  * 리사이즈 가능한 drawer (기본 최대 크기)
- **SummaryStatDrawer**: 통계 분포 그래프 표시
  * 지역, 차량, 스마트폰, 직업, 소득, 연령, 자녀 분포

### 클러스터링
- **ClusterLabPage**: interactive clustering analysis with UMAP visualization
- **ClusterDetailDrawer**: 클러스터 상세 정보 및 검색된 패널 목록

### 비교 분석
- **ComparePage**: group comparison analysis
- **PIComparisonView**: 비교 분석 메인 뷰
- **PIRadarChart**: 라다 차트를 통한 다차원 비교 (8개 핵심 지표)
- **PIBinaryHeatmap**: 이진 변수 히트맵 (그룹별 접기/펼치기)
- **PIStackedBarChart**: 범주형 변수 스택 바 차트 (여러 변수 동시 표시)
- **PIIndexDotPlot**: 인덱스 도트 플롯 (120 이상 강조)
- **PIFeatureSelector**: 변수 선택 및 순서 조정 패널
- **PIVariableDescription**: 주요 변수 설명
- **PIComparisonHighlights**: 주요 차이점 하이라이트

### 히스토리 및 네비게이션
- **PIHistoryDrawer**: 종합 history management
- **PIBookmarkPanel**: 북마크 관리 패널
- **ExportDrawer**: 데이터 내보내기 (CSV, JSON, TXT, PNG)

## API 엔드포인트

### 검색
- `POST /api/search` - **의미 기반 벡터 검색** (임베딩 기반)
  * 자연어 쿼리를 벡터로 변환하여 유사도 검색
  * 필터 및 페이지네이션 지원
  * 유사도 0.9 이상 결과만 반환
- `GET /api/panels/{panel_id}` - 패널 상세정보 조회
  * 실제 데이터 기반 정보 표시 (태그, 근거, 응답이력)
  * NeonDB `merged.panel_data` 테이블에서 로드
- `POST /api/panels/batch` - 여러 패널 상세정보 배치 조회
  * 효율적인 대량 패널 데이터 로드 (내보내기 기능 최적화)

### 클러스터링
- `GET /api/precomputed/clusters` - 사전 계산된 클러스터 정보 조회 (NeonDB)
- `GET /api/precomputed/umap` - UMAP 좌표 조회 (NeonDB)
- `GET /api/precomputed/comparison` - 클러스터 비교 데이터 조회 (NeonDB)
- `GET /api/precomputed/profiles` - 클러스터 프로필 조회 (NeonDB 우선, 파일 시스템 fallback)
- `POST /api/clustering/cluster-around-search` - 검색된 패널 주변 클러스터 분석
  * Precomputed HDBSCAN 결과 활용
  * NeonDB에서 UMAP 좌표 및 클러스터 매핑 로드

### Health Check
- `GET /health` - 기본 Health check
- `GET /health/db` - 데이터베이스 연결 상태 확인
- `GET /healthz` - 종합 Health check (DB, 임베딩 모델 상태)

## 비교 분석 기능

### 차트 타입별 특징

#### 1. 레이더 차트 (Radar Chart)
- **목적**: 군집 성향을 가장 빠르게 파악하는 대표 지표
- **변수**: 8개 핵심 지표
  * 인구통계: 연령, 소득
  * 소비 패턴: 프리미엄 지수, 전자제품 수
  * 라이프스타일: 음주 유형 수, 흡연 경험
  * 교육/디바이스: 대졸 이상, 프리미엄 폰
- **특징**: 
  * 클러스터 색상과 자동 매칭
  * 12시/6시 방향 텍스트 중앙 정렬
  * 동적 레이블 위치 조정

#### 2. 히트맵 (Binary Heatmap)
- **목적**: 이진형 변수들의 비율 차이를 전체적으로 비교
- **변수 그룹**: 
  * 인구·사회: 연령, 소득, 학력, 취업 상태
  * 음주: 음주 경험, 음주 유형별 비율
  * 흡연: 흡연 경험, 흡연 유형별 비율
  * 디지털/브랜드: 전자제품 수, 애플/삼성 사용자, 프리미엄 폰
  * 차량: 차량 보유, 프리미엄 차량, 국산차
  * 지역: 수도권, 광역시
- **특징**: 
  * 그룹별 접기/펼치기 기능
  * 색상 강도로 차이 크기 표현

#### 3. 스택 바 차트 (Stacked Bar Chart)
- **목적**: 범주형 변수 분포를 100% 스택으로 비교
- **변수**: 범주형 변수 (생애주기, 소득 구간, 가족 유형, 세대 등)
- **특징**: 
  * 여러 변수를 동시에 표시 가능
  * 각 변수마다 별도의 스택 바 생성
  * 카테고리별 색상 구분

#### 4. 인덱스 도트 플롯 (Index Dot Plot)
- **목적**: 전체 평균 대비 클러스터별 비율 비교
- **계산식**: Index = (군집비율 / 전체비율) × 100
- **기준선**: 100 (전체 평균)
- **특징**: 
  * 120 이상: 초록색, 큰 점, 펄스 애니메이션으로 강조
  * 80 이하: 빨간색으로 표시
  * 사용자 변수 선택 시 모든 변수 표시

### 변수 선택 기능

- **PIFeatureSelector**: 리사이즈 가능한 변수 선택 패널
  * 선택된 변수: 순서 조정 및 제거 가능
  * 사용 가능한 변수: 체크박스로 선택
  * 차트 타입별 필터링: 레이더(연속형+이진형), 히트맵(이진형), 스택바(범주형), 인덱스(이진형)
  * 휠 스크롤 지원
  * localStorage로 패널 너비 저장

### 변수 설명

- **PIVariableDescription**: 주요 변수의 정의 및 계산 방식 설명
  * 프리미엄 지수: 계산 방식, 프리미엄 제품 번호, 해석 기준
  * 수도권: 서울특별시, 경기도
  * 프리미엄 폰: 고가 스마트폰 정의

## Pinecone 검색 프로세스

### 개요

Panel Insight은 Pinecone을 활용한 의미 기반 벡터 검색 시스템을 구현했습니다. 자연어 쿼리를 단계적으로 처리하여 가장 관련성 높은 패널을 찾아냅니다.

### 검색 파이프라인 (PanelSearchPipeline)

검색 프로세스는 다음 5단계로 구성됩니다:

#### 1단계: 메타데이터 추출
- **목적**: 자연어 쿼리에서 구조화된 메타데이터 추출
- **도구**: Anthropic Claude API
- **추출 항목**: 나이, 성별, 지역, 소득, 직업, 학력 등
- **예시**: "서울 거주 20대 여성" → `{age: "20대", gender: "여성", region: "서울"}`

#### 2단계: 카테고리 분류
- **목적**: 추출된 메타데이터를 사전 정의된 카테고리로 분류
- **도구**: Anthropic Claude API + CategoryClassifier
- **카테고리 예시**: 인구통계, IT기기, 보유제품, 기호품, 라이프스타일 등
- **출력**: 카테고리별 메타데이터 매핑

#### 2.5단계: 메타데이터 필터 추출
- **목적**: 카테고리별로 필요한 메타데이터 필터 조건 추출
- **도구**: MetadataFilterExtractor
- **기능**: 복수 값 OR 조건 지원 (예: 지역=["서울", "경기"])

#### 3단계: 자연어 텍스트 생성
- **목적**: 카테고리별 메타데이터를 자연어 텍스트로 변환
- **도구**: CategoryTextGenerator (Anthropic Claude)
- **병렬 처리**: 여러 카테고리를 동시에 처리하여 성능 향상
- **예시**: `{age: "20대", gender: "여성"}` → "20대 여성"

#### 4단계: 임베딩 생성
- **목적**: 자연어 텍스트를 벡터 임베딩으로 변환
- **도구**: OpenAI Embeddings API
- **모델**: `text-embedding-3-small` (1536차원)
- **출력**: 카테고리별 벡터 임베딩

#### 5단계: 단계적 필터링 검색
- **목적**: Pinecone에서 벡터 유사도 검색 및 메타데이터 필터링
- **도구**: PineconePanelSearcher + PineconeResultFilter
- **프로세스**:
  1. Pinecone 인덱스에서 카테고리별 벡터 검색
  2. 메타데이터 필터 조건 적용 (Pinecone $in 연산자 지원)
  3. 소득 범위 필터링 지원 (개인소득_min, 개인소득_max)
  4. 유사도 점수와 필터 매칭 점수를 결합하여 최종 점수 계산
  5. 상위 top_k개 패널 반환

### Pinecone 구조

- **저장 방식**: 클라우드 기반 벡터 데이터베이스
- **인덱스 구조**: 단일 인덱스에 모든 패널 데이터 저장
- **Topic 구조**: 카테고리별로 topic으로 구분 (예: "인구", "직업소득")
- **메타데이터**: 각 벡터에 패널 정보(나이, 성별, 지역, 소득 등) 포함
- **필터링**: Pinecone 네이티브 메타데이터 필터 지원 ($in, $lte, $gte 등)

### 검색 최적화

- **캐싱**: 동일 쿼리에 대한 결과 캐싱으로 성능 향상
- **병렬 처리**: 여러 카테고리 텍스트 생성 및 검색을 병렬로 처리
- **단계적 필터링**: 완전 매칭 → 부분 매칭 → 유사도 순으로 필터링
- **폴백 메커니즘**: 메타데이터 추출 실패 시 쿼리 텍스트를 직접 임베딩하여 검색

### 데이터베이스 요구사항
- **Pinecone** (벡터 검색용, 클라우드 기반)
  * Pinecone API 키 필요
  * 인덱스 이름: `panel-profiles` (기본값)
- **NeonDB (PostgreSQL)** (클러스터링 데이터 및 패널 정보 저장)
  * **스키마**: `merged` 스키마에 패널 데이터, 클러스터링 세션, UMAP 좌표, 클러스터 프로필, 비교 분석 데이터 저장
  * **주요 테이블**:
    - `merged.panel_data`: 패널 기본 정보 및 프로필
    - `merged.clustering_sessions`: 클러스터링 세션 메타데이터
    - `merged.panel_cluster_mappings`: 패널-클러스터 매핑
    - `merged.umap_coordinates`: UMAP 2D 좌표
    - `merged.cluster_profiles`: 클러스터 프로필 (insights, tags, segments 등)
    - `merged.cluster_comparisons`: 클러스터 간 비교 분석 데이터
  * **데이터 마이그레이션**: 모든 클러스터링 관련 데이터가 파일 시스템에서 NeonDB로 마이그레이션 완료

## 클러스터링 방법론

### 개요

Panel Insight은 HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise) 알고리즘을 사용하여 패널 데이터를 클러스터링합니다. 이 방법은 밀도 기반 클러스터링으로, 클러스터 수를 사전에 지정하지 않고 데이터의 자연스러운 밀도 분포를 기반으로 자동으로 클러스터를 발견합니다.

### 알고리즘 선택 배경

**주요 참고 논문**:
- **HDBSCAN**: McInnes, L., Healy, J., & Astels, S. (2017). HDBSCAN: Hierarchical density based clustering. Journal of Open Source Software, 2(11), 205.
- **생애주기 세그먼트**: Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.

**선택 이유**:
1. **자동 클러스터 수 결정**: K-Means와 달리 클러스터 수를 사전에 지정할 필요가 없어 데이터의 자연스러운 구조를 포착
2. **노이즈 포인트 식별**: 어떤 클러스터에도 속하지 않는 이상치를 자동으로 식별하여 클러스터 품질 향상
3. **불규칙한 형태 포착**: 밀도 기반 클러스터링으로 구형이 아닌 불규칙한 형태의 클러스터도 포착 가능
4. **최고 성능**: K-Means 대비 Silhouette Score +96.5% 향상 (0.3061 → 0.6014)

### 데이터 전처리 파이프라인

#### 1단계: 생애주기 분류
- **입력**: 연령(`age`), 자녀 유무(`has_children`)
- **분류 기준**:
  - 연령 < 30: Young Singles (젊은 싱글)
  - 30 ≤ 연령 < 45, 자녀 없음: DINK (딩크족)
  - 30 ≤ 연령 < 45, 자녀 있음: Young Parents (젊은 부모)
  - 45 ≤ 연령 < 60, 자녀 있음: Mature Parents (중년 부모)
  - 45 ≤ 연령 < 60, 자녀 없음: Middle Age (중년)
  - 연령 ≥ 60: Seniors (시니어)
- **출력**: 6개 생애주기 단계
- **참고 논문**: Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.

#### 2단계: 소득 계층 분류
- **입력**: 표준화된 소득(`Q6_scaled`)
- **방법**: 3분위 분류 (Quantile-based)
- **출력**: Low, Mid, High 3개 계층

#### 3단계: 초기 세그먼트 생성
- **조합**: 생애주기(6) × 소득 계층(3) = 18개 세그먼트
- **예시**: `1_low` (젊은 싱글 저소득), `2_high` (딩크족 고소득) 등

#### 4단계: 원-핫 인코딩
- **방법**: `sklearn.preprocessing.OneHotEncoder` 사용
- **출력**: 18차원 원-핫 벡터

#### 5단계: 추가 피처 결합
- **연속형 변수 6개**:
  1. `age_scaled`: 표준화된 연령
  2. `Q6_scaled`: 표준화된 소득
  3. `education_level_scaled`: 표준화된 교육 수준
  4. `Q8_count_scaled`: 표준화된 제품 구매 수
  5. `Q8_premium_index`: 프리미엄 지수 (0~1)
  6. `is_premium_car`: 프리미엄 차량 보유 여부 (0/1)
- **최종 피처 수**: 18 (세그먼트) + 6 (추가) = 24차원

#### 6단계: 표준화
- **방법**: `sklearn.preprocessing.StandardScaler`
- **목적**: 모든 피처를 평균 0, 표준편차 1로 정규화하여 스케일 차이 제거

### HDBSCAN 클러스터링

#### 최적 파라미터
```python
hdbscan.HDBSCAN(
    min_cluster_size=50,      # 최소 클러스터 크기
    min_samples=50,           # 최소 샘플 수
    metric='euclidean',       # 유클리드 거리
    cluster_selection_method='eom'  # Excess of Mass 방법
)
```

#### 파라미터 설명
- **`min_cluster_size`**: 클러스터로 인정받기 위한 최소 포인트 수. 너무 작으면 노이즈가 많아지고, 너무 크면 클러스터 수가 줄어듭니다.
- **`min_samples`**: 밀도 계산 시 고려할 최소 이웃 수. `min_cluster_size`와 동일하게 설정하여 일관성 유지.
- **`metric`**: 거리 측정 방법. 유클리드 거리를 사용하여 표준화된 데이터에 적합.
- **`cluster_selection_method`**: 'eom' (Excess of Mass) 방법으로 클러스터를 선택하여 안정적인 결과를 얻습니다.

#### 클러스터링 결과
- **클러스터 수**: 19개 (자동 결정)
- **노이즈 포인트**: 60명 (0.3%)
- **성능 지표**:
  - Silhouette Score: **0.6014** 
  - Davies-Bouldin Index: **0.6872** 
  - Calinski-Harabasz Index: **6385.79**

### UMAP 차원 축소

**참고 논문**: McInnes, L., Healy, J., & Melville, J. (2018). UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction. arXiv preprint arXiv:1802.03426.

#### 목적
고차원 클러스터링 결과(24차원)를 2D 공간으로 시각화하여 사용자가 인터랙티브하게 클러스터를 탐색할 수 있도록 합니다.

#### 파라미터
```python
umap.UMAP(
    n_components=2,      # 2차원으로 축소
    n_neighbors=15,      # 지역 구조를 결정하는 이웃 수
    min_dist=0.1,        # 포인트 간 최소 거리 (클러스터 밀도 조절)
    metric='cosine',      # 코사인 유사도 사용
    random_state=42       # 재현성을 위한 시드
)
```

#### 출력
- **UMAP 좌표**: 각 패널의 2D 좌표 (`umap_x`, `umap_y`)
- **시각화**: 클러스터별 색상으로 구분된 인터랙티브 차트

### 성능 평가

#### K-Means와 비교

| 방법 | 클러스터 수 | Silhouette Score | Davies-Bouldin Index | 평가 |
|------|------------|------------------|---------------------|------|
| **K-Means (k=8)** | 8 | 0.3061 | 1.7035 | 기준 |
| **K-Means (k=16)** | 16 | 0.5423 | 1.0613 | +77.2% |
| **HDBSCAN** | **19** | **0.6014** | **0.6872** | **+96.5%** ⭐ |

**결론**: HDBSCAN이 모든 평가 지표에서 최고 성능을 달성했습니다.

#### 클러스터 품질
- **명확한 구분**: 생애주기와 소득 계층별로 명확하게 구분됨
- **균형도**: 클러스터 크기가 다양하게 분포 (최소 1.3% ~ 최대 17.4%)
- **낮은 노이즈**: 0.3%의 노이즈 포인트로 안정적인 결과

### 구현 위치

- **클러스터링 스크립트**: `server/app/clustering/flc_income_hdbscan_analysis.py`
- **API 엔드포인트**: `GET /api/precomputed/clusters`
- **데이터 저장소**: NeonDB `merged` 스키마 (모든 클러스터링 데이터)
- **상세 분석 보고서**: 
  - `docs/HDBSCAN_CLUSTERING_METHODOLOGY.md` (상세 방법론)
  - `docs/COMPLETE_PROJECT_DOCUMENTATION.md` (프로젝트 완전 정리)

### 최근 개선 사항

#### 2025-11-25
- **프리미엄 제품 선정 개선**: 새로운 프리미엄 제품 정의 `[10, 11, 12, 13, 16, 17, 19, 21]` 적용
  - **Silhouette Score**: 0.6014 → **0.6192** (+2.96% 개선)
  - **Davies-Bouldin Index**: 0.6872 → **0.5322** (-22.56% 개선, 낮을수록 좋음)
  - **Calinski-Harabasz Index**: 6385.79 → **7756.84** (+21.5% 개선)
  - **클러스터 수**: 19개 → **18개** (자동 결정)
  - **노이즈 비율**: 0.3% → **0.2%** (41명 / 19,020명)
  - **새로운 프리미엄 제품**: 로봇청소기, 무선청소기, 커피머신, 안마의자, 의류관리기, 건조기, 식기세척기, 가정용식물재배기
- **다중공선성 분석 (VIF)**: 소득 관련 피쳐들 간의 다중공선성 분석 완료
  - `Q6_scaled`: VIF = 2.55 (양호)
  - `is_premium_car`: VIF = 1.01 (양호)
  - `age_scaled`: VIF = 11.95 (세그먼트 변수와 다중공선성, 하지만 클러스터링에 필수)
- **age_scaled 제외 실험**: 성능 저하 확인 (Silhouette Score: 0.6014 → 0.2491)
  - 결론: 다중공선성이 있어도 `age_scaled`는 클러스터링에 필수적
- **생애주기 분류 논문 반영**: Kim & Lee (2023) 논문 기반 방법론 문서화
- **프로젝트 완전 정리 문서**: 발표 및 질의응답용 상세 문서 작성 (`docs/COMPLETE_PROJECT_DOCUMENTATION.md`)

#### 2025-11-24
- **데이터 마이그레이션 완료**: 모든 클러스터링 관련 데이터를 파일 시스템에서 NeonDB로 마이그레이션
- **UMAP 렌더링 최적화**: 
  - 호버 기반 툴팁 렌더링으로 초기 렌더링 성능 향상
  - NeonDB에서 패널 프로필 정보를 지연 로드 (on-hover)
  - React `useMemo`, `useCallback`을 활용한 불필요한 리렌더링 방지
- **배치 API 구현**: 패널 내보내기 기능 최적화를 위한 배치 조회 API 추가
- **확장 클러스터링 개선**: Precomputed HDBSCAN 결과만 활용하여 불필요한 데이터 로드 제거

## 문제 해결

### 포트 충돌 시

**Windows:**
```cmd
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr ":8004 :3000 :3001"

# 프로세스 강제 종료
taskkill /PID [프로세스ID] /F
```

**Linux/macOS:**
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :8004 :3000 :3001

# 프로세스 강제 종료
kill -9 [프로세스ID]
```

### Python 라이브러리 설치 오류 시

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

### Node.js 라이브러리 설치 오류 시

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

## 개발 가이드

### 코드 스타일
- Type safety를 위한 TypeScript 사용
- Component-based architecture
- State management를 위한 custom hooks
- 비동기 프로그래밍 (async/await)

### 빌드
```bash
# Frontend 빌드
npm run build

# 빌드 결과는 dist/ 폴더에 생성됩니다
```

### 주요 개발 패턴

#### Frontend
- **컴포넌트 구조**: 페이지 → 컴포넌트 → UI 킷
- **상태 관리**: React Hooks (useState, useMemo, useEffect)
- **스타일링**: Tailwind CSS + 인라인 스타일
- **애니메이션**: Framer Motion
- **다크 모드**: Context API 기반

#### Backend
- **비동기 처리**: async/await 패턴
- **데이터베이스**: SQLAlchemy 비동기 ORM
- **API 구조**: FastAPI 라우터 기반
- **에러 처리**: 전역 예외 핸들러

## 참고 자료

### 주요 문서
- **프로젝트 완전 정리 문서**: `docs/COMPLETE_PROJECT_DOCUMENTATION.md` (발표 및 질의응답용)
- **HDBSCAN 클러스터링 방법론**: `docs/HDBSCAN_CLUSTERING_METHODOLOGY.md` (상세 방법론)

### 주요 참고 논문
- **HDBSCAN**: McInnes, L., Healy, J., & Astels, S. (2017). HDBSCAN: Hierarchical density based clustering. Journal of Open Source Software, 2(11), 205.
- **생애주기 세그먼트**: Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: Evidence from Korean Consumers." *Asia Pacific Journal of Marketing*, 35(2), 234-251.
- **UMAP**: McInnes, L., Healy, J., & Melville, J. (2018). UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction. arXiv preprint arXiv:1802.03426.

## 기여하기

1. Repository fork
2. Feature branch 생성
3. 변경사항 적용
4. Test 추가 (해당하는 경우)
5. Pull request 제출

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.
