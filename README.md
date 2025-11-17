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
- [문제 해결](#문제-해결)
- [개발 가이드](#개발-가이드)

## 주요 기능

### 🔍 검색 및 분석

- **의미 기반 벡터 검색**: HuggingFace Sentence-Transformers를 활용한 임베딩 기반 검색
  * 자연어 쿼리를 768차원 벡터로 변환
  * ChromaDB와 pgvector를 통한 코사인 유사도 검색
  * 유사도 0.9 이상 결과만 필터링
- **고급 필터링**: 나이, 성별, 지역, 소득 등 다중 필터 조합
- **실시간 결과**: pagination과 result count를 포함한 live search
- **패널 상세정보**: 실제 데이터 기반 상세 정보 표시 (태그, 근거, 응답이력)
- **프리셋 관리**: 자주 사용하는 필터 조합을 프리셋으로 저장 및 재사용

### 📊 클러스터링 및 시각화

- **사전 클러스터링 기반 분석**: 사전에 전처리한 데이터로 사전 클러스터링을 수행한 뒤, 검색 결과로 나온 패널들이 UMAP 상에서 어디에 위치하는지 파악하는 방식으로 군집 분석을 수행합니다.
- **UMAP 시각화**: 사전 클러스터링된 패널들의 2D 공간상 위치를 interactive하게 시각화
- **클러스터 프로필**: tag와 characteristic을 포함한 각 cluster의 상세 분석
- **품질 지표**: silhouette score, Calinski-Harabasz index, Davies-Bouldin index
- **클러스터 필터링**: 특정 클러스터만 선택하여 분석

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
- **PostgreSQL** with **pgvector** extension (벡터 데이터베이스)
- **ChromaDB** 벡터 검색 엔진
- **HuggingFace Sentence-Transformers** (임베딩 생성)
  * 모델: `intfloat/multilingual-e5-base` (768차원)
- **SQLAlchemy** (비동기 ORM)
- **NumPy & SciPy** 수치 계산
- **Scikit-learn** 머신러닝
- **HDBSCAN** 밀도 기반 클러스터링
- **UMAP** 차원 축소

## 🚀 빠른 시작

### 사전 요구사항

- **Node.js 18+** 
- **Python 3.13+**
- **PostgreSQL 12+** with pgvector extension
- **npm** 또는 **yarn**

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
   ```bash
   cd server
   pip install -r requirements.txt
   cd ..
   ```

4. **환경 변수 설정**
   
   프로젝트 루트에 `.env` 파일을 생성하고 다음 환경변수를 설정하세요:
   ```env
   # 데이터베이스 연결
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # 임베딩 설정
   EMBEDDING_PROVIDER=hf
   EMBEDDING_MODEL=intfloat/multilingual-e5-base
   EMBEDDING_DIMENSION=768
   
   # Anthropic API (선택사항 - 메타데이터 추출용)
   ANTHROPIC_API_KEY=your_api_key_here
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
│   │   │   ├── chroma_pipeline.py # ChromaDB 검색 파이프라인
│   │   │   ├── metadata_extractor.py # 메타데이터 추출
│   │   │   └── embedding_generator.py # 임베딩 생성
│   │   └── embeddings.py        # HuggingFace 임베딩 생성
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
- **FilterDrawer**: 고급 filtering options (나이, 성별, 지역, 소득 등)
- **PanelDetailDrawer**: 패널 상세 정보 표시 (태그, 근거, 응답이력)

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

### 클러스터링
- `GET /api/precomputed/clusters` - 사전 계산된 클러스터 정보 조회
- `GET /api/precomputed/umap` - UMAP 좌표 조회
- `GET /api/precomputed/comparison` - 클러스터 비교 데이터 조회
- `GET /api/precomputed/profiles` - 클러스터 프로필 조회

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

## 벡터 검색 시스템

### 작동 방식
1. **쿼리 입력**: 사용자가 자연어로 검색어 입력 (예: "서울 거주 20대 여성")
2. **임베딩 생성**: HuggingFace Sentence-Transformers가 쿼리를 768차원 벡터로 변환
   - 자동으로 `query: ` 프롬프트 추가
   - 정규화된 벡터 생성 (코사인 유사도 최적화)
3. **벡터 검색**: ChromaDB와 pgvector를 사용하여 데이터베이스에서 유사한 임베딩 검색
   - 코사인 거리 사용
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

## 기여하기

1. Repository fork
2. Feature branch 생성
3. 변경사항 적용
4. Test 추가 (해당하는 경우)
5. Pull request 제출

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.
