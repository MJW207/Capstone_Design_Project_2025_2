# Panel Insight

React와 FastAPI로 구축된 종합 패널 분석 및 클러스터링 플랫폼입니다.

## 주요 기능

### 🔍 검색 및 분석
- **패널 검색**: 나이, 성별, 지역, 소득 등 필터를 활용한 고급 검색
- **실시간 결과**: pagination과 result count를 포함한 live search
- **필터 시스템**: preset 관리가 가능한 dynamic filtering

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
cd server && python -c "import uvicorn; uvicorn.run('app.main:app', host='127.0.0.1', port=8000)"

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
   - `anthropic==0.40.0` - AI API 클라이언트
   - `numpy` - 수치 계산
   - `scikit-learn` - 머신러닝
   - `leidenalg` - 그래프 클러스터링
   - `umap-learn` - 차원 축소
   - `pandas` - 데이터 처리

### 애플리케이션 실행

#### **방법 1: CMD (Windows)**
```cmd
# 백엔드 서버
cd panel-insight/server
python -c "import uvicorn; uvicorn.run('app.main:app', host='127.0.0.1', port=8000)"

# 새 창에서 프론트엔드 서버
cd panel-insight
npm run dev
```

#### **방법 2: PowerShell (Windows)**
```powershell
# 백엔드 서버
cd panel-insight/server
python -c "import uvicorn; uvicorn.run('app.main:app', host='127.0.0.1', port=8000)"

# 새 창에서 프론트엔드 서버
cd panel-insight
npm run dev
```

#### **방법 3: Bash (Linux/macOS)**
```bash
# 백엔드 서버
cd panel-insight/server
python -c "import uvicorn; uvicorn.run('app.main:app', host='127.0.0.1', port=8000)"

# 새 터미널에서 프론트엔드 서버
cd panel-insight
npm run dev
```

#### **방법 4: 한 줄 실행 (CMD만 가능)**
```cmd
cd panel-insight/server && python -c "import uvicorn; uvicorn.run('app.main:app', host='127.0.0.1', port=8000)"
```

### **서버 접속 URL**
- **프론트엔드**: `http://localhost:3000` 또는 `http://localhost:3001`
- **백엔드 API**: `http://127.0.0.1:8000`
- **API 문서**: `http://127.0.0.1:8000/docs` (FastAPI 자동 생성)

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
│   │   └── pi/                  # Panel Insight 전용 components
│   ├── lib/                     # Utility functions 및 API calls
│   ├── types/                   # TypeScript type definitions
│   └── styles/                  # Global styles
├── server/                       # Backend source code
│   ├── app/                     # FastAPI application
│   │   ├── main.py             # Main application entry point
│   │   ├── clustering.py       # Clustering algorithms
│   │   └── rag_system.py       # RAG system (optional)
│   └── requirements.txt         # Python dependencies
└── README.md                    

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
- `POST /api/search` - filter와 pagination을 포함한 panel search
- `GET /api/panels` - pagination을 포함한 panel list 조회

### 클러스터링
- `POST /api/clustering/global-pca` - global PCA model training
- `POST /api/clustering/cluster` - clustering analysis 실행

### 비교 분석
- `GET /api/groups` - 사용 가능한 group (cluster/segment) 조회
- `POST /api/compare` - 두 group 비교

### 내보내기
- `POST /api/export` - 다양한 format으로 data export

## 개발

### 코드 스타일
- Type safety를 위한 TypeScript 사용
- Code formatting을 위한 ESLint와 Prettier
- Component-based architecture
- State management를 위한 custom hooks

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

