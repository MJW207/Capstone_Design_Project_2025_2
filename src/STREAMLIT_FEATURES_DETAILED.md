# Panel Insight - Streamlit 구현 상세 명세서

**목적**: 현재 React 기반 Panel Insight의 모든 기능을 Streamlit으로 구현하기 위한 완전한 기술 명세

**디자인 제외**: 모든 비주얼/애니메이션/스타일링 요소는 제외하고 순수 기능만 정의

---

## 목차

1. [데이터 스키마](#1-데이터-스키마)
2. [전역 상태 관리](#2-전역-상태-관리)
3. [페이지 구조](#3-페이지-구조)
4. [검색 & 필터링](#4-검색--필터링)
5. [결과 표시](#5-결과-표시)
6. [군집 분석](#6-군집-분석)
7. [비교 분석](#7-비교-분석)
8. [패널 상세 정보](#8-패널-상세-정보)
9. [히스토리 & 북마크](#9-히스토리--북마크)
10. [내보내기](#10-내보내기)
11. [Streamlit 구현 예시](#11-streamlit-구현-예시)

---

## 1. 데이터 스키마

### 1.1 Panel 데이터 구조

**파일**: `data/panels.csv` (또는 `panels.parquet`)

```python
PanelData = {
    # 기본 식별자
    "id": str,                      # 예: "P****001" (마스킹된 ID)
    
    # Coverage & Cluster
    "coverage": Literal["qw", "w"], # qw = Q+W(응답O), w = W only(응답X)
    "cluster": str,                 # 예: "C1", "C2", "C3", ..., "Noise"
    "cluster_probability": float,   # 0.0~1.0, 군집 할당 신뢰도
    
    # 인구통계
    "gender": str,                  # "남성" | "여성"
    "age": int,                     # 실제 나이 (20~65)
    "region": str,                  # "서울" | "경기" | "부산" | "인천" | ...
    "income": str,                  # "200~300" | "300~400" | ... (만원 단위)
    
    # 행동 & 관심사
    "tags": List[str],              # 예: ["OTT 이용", "스킨케어", "온라인쇼핑"]
    "categories": List[str],        # 상위 카테고리 ["뷰티", "테크", "라이프스타일"]
    
    # 품질 지표
    "response_count": int,          # 응답 수 (qw인 경우만 > 0)
    "last_answered": Optional[str], # ISO 8601 날짜, w인 경우 null
    "quality_score": float,         # 0.0~1.0, 데이터 완성도
    
    # 검색 관련
    "snippet": str,                 # AI 생성 요약 (1문장)
    "search_similarity": float,     # 0.0~1.0, 검색어 유사도 (검색시에만)
    
    # 메타데이터
    "is_pinned": bool,              # 사용자가 고정한 패널 여부
    "created_at": str,              # ISO 8601
    "updated_at": str,              # ISO 8601
}
```

**CSV 예시**:
```csv
id,coverage,cluster,cluster_probability,gender,age,region,income,tags,categories,response_count,last_answered,quality_score,snippet
P****001,qw,C1,0.85,여성,24,서울,300~400,"OTT 이용|스킨케어|온라인쇼핑","뷰티|테크",245,2025-01-10,0.92,넷플릭스를 주 3회 이상 시청하며 피부 관리에 관심이 많음
P****002,qw,C2,0.78,여성,27,서울,400~600,"OTT 이용|뷰티|운동","뷰티|헬스",312,2025-01-15,0.88,디즈니플러스와 넷플릭스를 모두 구독 중
P****003,w,Noise,0.42,여성,22,경기,200~300,"스킨케어|패션|K-POP","뷰티|문화",0,,0.65,스킨케어 루틴에 관심이 높고 새로운 제품 시도를 좋아함
```

### 1.2 Cluster 데이터 구조

**파일**: `data/clusters.json`

```python
ClusterData = {
    # 식별자
    "cluster_id": str,              # 예: "C1", "C2", ...
    
    # 레이블 & 설명
    "name": str,                    # 예: "디지털 얼리어답터"
    "label": str,                   # 예: "C1 · 디지털 얼리어답터"
    "description": str,             # 1-2문장 설명
    "color": str,                   # Hex 색상 (차트용, 무시 가능)
    
    # 크기 & 품질
    "size": int,                    # 패널 수
    "percentage": float,            # 전체 대비 비율 (%)
    "silhouette_score": float,      # 실루엣 점수 (-1.0~1.0)
    "avg_cluster_probability": float, # 평균 할당 신뢰도
    
    # 인구통계 프로필
    "demographics": {
        "avg_age": float,           # 평균 연령
        "gender_ratio": {
            "여성": float,          # 0.0~1.0
            "남성": float,
        },
        "top_regions": List[str],   # 상위 3개 지역
        "income_distribution": Dict[str, float],  # 소득 구간별 비율
    },
    
    # 행동 특성
    "top_tags": List[str],          # 대표 해시태그 Top 5
    "top_categories": List[str],    # 대표 카테고리 Top 3
    
    # Coverage 분포
    "coverage_ratio": {
        "qw": float,                # Q+W 비율
        "w": float,                 # W only 비율
    },
    
    # Evidence (정성적 증거)
    "evidence": List[str],          # AI 생성 대표 응답 예시 3개
    
    # 메타데이터
    "created_at": str,              # 군집 생성일
}
```

**JSON 예시**:
```json
{
  "cluster_id": "C1",
  "name": "디지털 얼리어답터",
  "label": "C1 · 디지털 얼리어답터",
  "description": "OTT/테크에 높은 관심, 20대 중반, 서울 집중",
  "color": "#2563EB",
  "size": 542,
  "percentage": 25.3,
  "silhouette_score": 0.72,
  "avg_cluster_probability": 0.81,
  "demographics": {
    "avg_age": 25.4,
    "gender_ratio": {"여성": 0.72, "남성": 0.28},
    "top_regions": ["서울", "경기", "부산"],
    "income_distribution": {
      "200~300": 0.15,
      "300~400": 0.42,
      "400~600": 0.31,
      "600+": 0.12
    }
  },
  "top_tags": ["OTT", "테크", "온라인쇼핑", "게임", "스트리밍"],
  "top_categories": ["테크", "엔터테인먼트", "쇼핑"],
  "coverage_ratio": {"qw": 0.68, "w": 0.32},
  "evidence": [
    "넷플릭스 헤비유저, 신기술 제품 구매 적극적",
    "디지털 콘텐츠 소비에 월 10만원 이상 지출",
    "소셜미디어 활동 활발, 인플루언서 팔로우 많음"
  ],
  "created_at": "2025-01-01T00:00:00Z"
}
```

### 1.3 UMAP Embeddings 데이터

**파일**: `data/umap_embeddings.npy` (NumPy binary) 또는 `umap_embeddings.csv`

```python
UMAPEmbedding = {
    "panel_id": str,        # 패널 ID (panels.csv와 조인 키)
    "umap_x": float,        # UMAP Dim 1 (-5.0 ~ 5.0 범위)
    "umap_y": float,        # UMAP Dim 2 (-5.0 ~ 5.0 범위)
    "cluster": str,         # 군집 ID
}
```

**CSV 예시**:
```csv
panel_id,umap_x,umap_y,cluster
P****001,2.3,1.5,C1
P****002,2.5,1.8,C1
P****003,-1.2,0.8,C2
```

### 1.4 Model Status 데이터

**파일**: `data/model_status.json`

```python
ModelStatus = {
    # 알고리즘 정보
    "algorithm": "KNN+Leiden",
    "dim_reduction": "UMAP",
    "version": str,                 # 예: "v2.1.0"
    
    # 학습 정보
    "trained_at": str,              # ISO 8601
    "trained_on_count": int,        # 학습에 사용된 패널 수
    "training_duration_seconds": float,
    
    # 결과 요약
    "total_clusters": int,          # Noise 제외한 군집 수
    "noise_count": int,             # Noise로 분류된 패널 수
    "noise_ratio": float,           # Noise 비율 (%)
    
    # 품질 지표
    "overall_silhouette": float,    # 전체 실루엣 점수
    "dbcv_score": Optional[float],  # DBCV 점수 (선택적)
    
    # 상태
    "status": Literal["synced", "outdated", "training"], # 모델 상태
    "last_updated": str,            # 마지막 업데이트 시각
    
    # 데이터 변화 추적 (outdated 판단용)
    "current_panel_count": int,     # 현재 패널 수
    "delta_since_training": int,    # 학습 이후 추가된 패널 수
}
```

**JSON 예시**:
```json
{
  "algorithm": "HDBSCAN",
  "dim_reduction": "UMAP",
  "version": "v2.1.0",
  "trained_at": "2025-01-01T03:00:00Z",
  "trained_on_count": 2140,
  "training_duration_seconds": 127.5,
  "total_clusters": 5,
  "noise_count": 87,
  "noise_ratio": 4.1,
  "overall_silhouette": 0.68,
  "dbcv_score": 0.72,
  "status": "synced",
  "last_updated": "2025-01-15T10:00:00Z",
  "current_panel_count": 2140,
  "delta_since_training": 0
}
```

### 1.5 비교 분석 데이터 구조

```python
ComparisonData = {
    # 그룹 정보
    "group_a": {
        "id": str,                  # 군집 ID 또는 필터 조합 해시
        "type": Literal["cluster", "segment"],
        "label": str,               # 표시명
        "count": int,               # 패널 수
        "percentage": float,        # 전체 대비 비율
    },
    "group_b": {...},               # 동일 구조
    
    # 분포 차이 (Δ%p)
    "distribution_diff": List[{
        "category": str,            # 예: "여성", "20대", "OTT 이용"
        "group_a_pct": float,       # Group A에서의 비율 (%)
        "group_b_pct": float,       # Group B에서의 비율 (%)
        "delta_pp": float,          # 차이 (%p)
    }],
    
    # Lift 분석
    "lift_analysis": List[{
        "feature": str,             # 특징명
        "group_a_lift": float,      # Group A Lift (1.0 = 전체 평균)
        "group_b_lift": float,      # Group B Lift
        "base_rate": float,         # 전체 평균 비율
    }],
    
    # SMD (표준화 평균 차이)
    "smd_analysis": List[{
        "metric": str,              # 지표명 (연속형 변수)
        "group_a_mean": float,      # Group A 평균
        "group_b_mean": float,      # Group B 평균
        "smd": float,               # SMD 값 (-∞ ~ +∞)
        "ci_lower": float,          # 95% 신뢰구간 하한
        "ci_upper": float,          # 95% 신뢰구간 상한
        "effect_size": Literal["small", "medium", "large"], # |SMD| 기준
    }],
}
```

---

## 2. 전역 상태 관리

Streamlit의 `st.session_state`를 사용하여 앱 전체 상태를 관리합니다.

### 2.1 필수 상태 변수

```python
# 초기화 함수
def init_session_state():
    if 'initialized' not in st.session_state:
        # 뷰 & 네비게이션
        st.session_state.current_page = 'start'  # 'start' | 'results' | 'cluster' | 'compare'
        st.session_state.active_tab = 'results'   # 'results' | 'cluster' | 'compare'
        
        # 검색 & 필터
        st.session_state.search_query = ''
        st.session_state.filters = {
            'gender': [],               # ['남성', '여성']
            'age_range': (20, 65),      # (min, max)
            'regions': [],              # ['서울', '경기', ...]
            'income_ranges': [],        # ['200~300', '300~400', ...]
            'tags': [],                 # 선택된 태그
            'coverage': [],             # ['qw', 'w']
            'clusters': [],             # ['C1', 'C2', ...]
            'min_responses': 0,         # 최소 응답 수
            'min_quality': 0.0,         # 최소 품질 점수 (0.0~1.0)
        }
        st.session_state.active_preset = None  # 프리셋 ID
        
        # 결과 표시
        st.session_state.view_mode = 'cards'    # 'cards' | 'table'
        st.session_state.sort_by = 'similarity' # 'similarity' | 'recent' | 'responses'
        st.session_state.sort_order = 'desc'    # 'desc' | 'asc'
        st.session_state.selected_panels = []   # 선택된 패널 ID 리스트
        
        # 군집 분석
        st.session_state.cluster_view = 'map'   # 'map' | 'profiles' | 'quality'
        st.session_state.selected_clusters_for_view = []  # 필터링할 군집
        st.session_state.show_noise = True      # Noise 포인트 표시 여부
        st.session_state.located_panel_id = None  # 지도에서 하이라이트할 패널
        
        # 비교 분석
        st.session_state.compare_group_a = None  # CompareGroup dict
        st.session_state.compare_group_b = None
        st.session_state.compare_metric = 'delta'  # 'delta' | 'lift' | 'smd'
        
        # 히스토리 & 북마크
        st.session_state.recent_panels = []     # List[RecentPanel], 최대 50개
        st.session_state.bookmarks = []         # 저장된 검색어/필터 조합
        st.session_state.presets = []           # 프리셋 목록
        
        # 모달/드로워 상태 (Streamlit에서는 expander/dialog로 대체)
        st.session_state.show_filter_drawer = False
        st.session_state.show_export_dialog = False
        st.session_state.show_history_drawer = False
        
        st.session_state.initialized = True

# 앱 시작 시 호출
init_session_state()
```

### 2.2 Recent Panel 구조

```python
RecentPanel = {
    "panel_id": str,
    "cluster": str,
    "coverage": str,
    "viewed_at": str,       # ISO 8601 또는 상대 시간 ("방금 전", "5분 전")
    "timestamp": float,     # Unix timestamp (정렬용)
}

# 추가 함수
def add_to_recent_panels(panel_id: str, cluster: str, coverage: str):
    """최근 본 패널에 추가 (중복 제거, 최대 50개 유지)"""
    recent = st.session_state.recent_panels
    
    # 중복 제거
    recent = [p for p in recent if p['panel_id'] != panel_id]
    
    # 새 패널 추가
    new_panel = {
        'panel_id': panel_id,
        'cluster': cluster,
        'coverage': coverage,
        'viewed_at': '방금 전',
        'timestamp': time.time(),
    }
    recent.insert(0, new_panel)
    
    # 최대 50개 유지
    st.session_state.recent_panels = recent[:50]
```

---

## 3. 페이지 구조

### 3.1 앱 라우팅

**main.py** (메인 엔트리포인트)

```python
import streamlit as st
from pages import start_page, results_page, cluster_page, compare_page

st.set_page_config(
    page_title="Panel Insight",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed"
)

init_session_state()

# 페이지 라우팅
if st.session_state.current_page == 'start':
    start_page.render()
elif st.session_state.current_page == 'results':
    # 탭 네비게이션
    tab_results, tab_cluster, tab_compare = st.tabs([
        "🔍 검색 결과",
        "📊 군집 분석",
        "⚖️ 비교 분석"
    ])
    
    with tab_results:
        results_page.render()
    
    with tab_cluster:
        cluster_page.render()
    
    with tab_compare:
        compare_page.render()
```

### 3.2 Start Page (시작 페이지)

**기능**:
- 자연어 검색창
- 프리셋 빠른 선택
- 고급 필터 열기 버튼
- 최근 검색어 표시

**Streamlit 구현**:

```python
# pages/start_page.py
import streamlit as st

def render():
    st.title("Panel Insight")
    st.caption("자연어로 패널을 검색하고 군집을 분석하세요")
    
    # 검색창
    col1, col2 = st.columns([4, 1])
    with col1:
        query = st.text_input(
            "검색어 입력",
            placeholder="예: 서울 20대 여성, OTT 이용·스킨케어 관심 200명",
            key="search_input",
            label_visibility="collapsed"
        )
    
    with col2:
        search_clicked = st.button("검색", type="primary", use_container_width=True)
    
    if search_clicked and query:
        st.session_state.search_query = query
        st.session_state.current_page = 'results'
        st.rerun()
    
    # 프리셋 빠른 선택
    st.subheader("빠른 시작")
    presets = [
        {"label": "20대 여성, OTT 이용자", "query": "20대 여성 OTT"},
        {"label": "서울 30대, 건강관리 관심", "query": "서울 30대 건강"},
        {"label": "가성비 추구형 소비자", "query": "가성비 할인 쿠폰"},
    ]
    
    cols = st.columns(3)
    for idx, preset in enumerate(presets):
        with cols[idx]:
            if st.button(preset['label'], use_container_width=True):
                st.session_state.search_query = preset['query']
                st.session_state.current_page = 'results'
                st.rerun()
    
    # 고급 필터
    if st.button("🎛️ 고급 필터", use_container_width=True):
        st.session_state.show_filter_drawer = True
        st.session_state.current_page = 'results'
        st.rerun()
    
    # 최근 검색어
    if st.session_state.recent_panels:
        st.subheader("최근 검색")
        for panel in st.session_state.recent_panels[:5]:
            st.caption(f"- {panel['panel_id']} ({panel['cluster']})")
```

---

## 4. 검색 & 필터링

### 4.1 자연어 검색 로직

**입력**: 자연어 검색어 (예: "서울 20대 여성 OTT 200명")

**처리**:
1. 검색어 파싱 (간단한 키워드 추출 또는 LLM)
2. 구조화된 필터로 변환
3. 패널 데이터 필터링
4. 유사도 점수 계산 (TF-IDF 또는 임베딩)

**출력**: 필터링된 패널 목록 + 유사도 점수

**Streamlit 구현**:

```python
# utils/search.py
import pandas as pd
import re
from typing import List, Dict

def parse_natural_query(query: str) -> Dict:
    """자연어 검색어를 구조화된 필터로 변환"""
    filters = {
        'gender': [],
        'age_range': None,
        'regions': [],
        'tags': [],
        'min_count': None,
    }
    
    # 성별 추출
    if '여성' in query:
        filters['gender'].append('여성')
    if '남성' in query:
        filters['gender'].append('남성')
    
    # 연령대 추출
    age_matches = re.findall(r'(\d+)대', query)
    if age_matches:
        age = int(age_matches[0])
        filters['age_range'] = (age, age + 9)
    
    # 지역 추출
    regions = ['서울', '경기', '부산', '인천', '대구']
    for region in regions:
        if region in query:
            filters['regions'].append(region)
    
    # 태그 추출 (키워드 매칭)
    tag_keywords = {
        'OTT': ['OTT', '넷플릭스', '디즈니', '스트리밍'],
        '스킨케어': ['스킨케어', '화장품', '뷰티'],
        '운동': ['운동', '피트니스', '헬스', '요가'],
        # ... 더 많은 태그
    }
    
    for tag, keywords in tag_keywords.items():
        if any(kw in query for kw in keywords):
            filters['tags'].append(tag)
    
    # 최소 개수 추출
    count_match = re.search(r'(\d+)\s*명', query)
    if count_match:
        filters['min_count'] = int(count_match.group(1))
    
    return filters

def search_panels(query: str, panels_df: pd.DataFrame) -> pd.DataFrame:
    """검색어로 패널 필터링 + 유사도 점수 계산"""
    filters = parse_natural_query(query)
    
    # 필터 적용
    result = panels_df.copy()
    
    if filters['gender']:
        result = result[result['gender'].isin(filters['gender'])]
    
    if filters['age_range']:
        min_age, max_age = filters['age_range']
        result = result[(result['age'] >= min_age) & (result['age'] <= max_age)]
    
    if filters['regions']:
        result = result[result['region'].isin(filters['regions'])]
    
    if filters['tags']:
        # tags는 리스트 컬럼이므로 부분 매칭
        result = result[result['tags'].apply(
            lambda tags: any(tag in tags for tag in filters['tags'])
        )]
    
    # 유사도 점수 계산 (간단한 키워드 매칭 기반)
    def calc_similarity(row):
        score = 0.0
        query_lower = query.lower()
        
        # snippet과의 유사도
        if query_lower in row['snippet'].lower():
            score += 0.5
        
        # 태그 매칭 점수
        matched_tags = len([t for t in filters['tags'] if t in row['tags']])
        score += matched_tags * 0.1
        
        return min(score, 1.0)
    
    result['search_similarity'] = result.apply(calc_similarity, axis=1)
    result = result.sort_values('search_similarity', ascending=False)
    
    # 최소 개수 필터
    if filters['min_count']:
        result = result.head(filters['min_count'])
    
    return result
```

### 4.2 고급 필터 UI

**Streamlit 구현**:

```python
# components/filter_drawer.py
import streamlit as st

def render_filter_drawer():
    """사이드바에 필터 렌더링"""
    with st.sidebar:
        st.header("🎛️ 고급 필터")
        
        # 인구통계 필터
        st.subheader("인구통계")
        
        gender = st.multiselect(
            "성별",
            options=['남성', '여성'],
            default=st.session_state.filters['gender']
        )
        
        age_range = st.slider(
            "연령",
            min_value=20,
            max_value=65,
            value=st.session_state.filters['age_range'],
            step=1
        )
        
        regions = st.multiselect(
            "지역",
            options=['서울', '경기', '부산', '인천', '대구', '대전', '광주'],
            default=st.session_state.filters['regions']
        )
        
        income_ranges = st.multiselect(
            "소득 (만원)",
            options=['200~300', '300~400', '400~600', '600+'],
            default=st.session_state.filters['income_ranges']
        )
        
        # Coverage 필터
        st.subheader("데이터 품질")
        
        coverage = st.multiselect(
            "Coverage",
            options=['qw', 'w'],
            default=st.session_state.filters['coverage'],
            format_func=lambda x: 'Q+W (응답 있음)' if x == 'qw' else 'W only (응답 없음)'
        )
        
        min_responses = st.number_input(
            "최소 응답 수",
            min_value=0,
            max_value=1000,
            value=st.session_state.filters['min_responses'],
            step=10
        )
        
        min_quality = st.slider(
            "최소 품질 점수",
            min_value=0.0,
            max_value=1.0,
            value=st.session_state.filters['min_quality'],
            step=0.05
        )
        
        # 군집 필터
        st.subheader("군집")
        
        clusters = st.multiselect(
            "군집 선택",
            options=['C1', 'C2', 'C3', 'C4', 'C5', 'Noise'],
            default=st.session_state.filters['clusters']
        )
        
        # 태그 필터
        st.subheader("관심사/행동")
        
        all_tags = ['OTT', '스킨케어', '뷰티', '운동', '여행', '쇼핑', '게임', 'K-POP']
        tags = st.multiselect(
            "태그",
            options=all_tags,
            default=st.session_state.filters['tags']
        )
        
        # 적용 버튼
        col1, col2 = st.columns(2)
        with col1:
            if st.button("적용", type="primary", use_container_width=True):
                st.session_state.filters = {
                    'gender': gender,
                    'age_range': age_range,
                    'regions': regions,
                    'income_ranges': income_ranges,
                    'coverage': coverage,
                    'min_responses': min_responses,
                    'min_quality': min_quality,
                    'clusters': clusters,
                    'tags': tags,
                }
                st.rerun()
        
        with col2:
            if st.button("초기화", use_container_width=True):
                st.session_state.filters = {
                    'gender': [],
                    'age_range': (20, 65),
                    'regions': [],
                    'income_ranges': [],
                    'coverage': [],
                    'min_responses': 0,
                    'min_quality': 0.0,
                    'clusters': [],
                    'tags': [],
                }
                st.rerun()
```

### 4.3 프리셋 & 북마크

**데이터 구조**:

```python
Preset = {
    "id": str,                  # UUID
    "name": str,                # 사용자 지정 이름
    "filters": Dict,            # filters 전체 dict
    "created_at": str,          # ISO 8601
}

Bookmark = {
    "id": str,
    "query": str,               # 검색어
    "filters": Dict,            # 저장된 필터
    "saved_at": str,
}
```

**Streamlit 구현**:

```python
# components/preset_menu.py
import streamlit as st
import uuid

def render_preset_menu():
    """프리셋 관리 UI"""
    st.subheader("🔖 저장된 프리셋")
    
    # 새 프리셋 저장
    with st.expander("➕ 새 프리셋 저장"):
        preset_name = st.text_input("프리셋 이름")
        if st.button("저장"):
            new_preset = {
                'id': str(uuid.uuid4()),
                'name': preset_name,
                'filters': st.session_state.filters.copy(),
                'created_at': pd.Timestamp.now().isoformat(),
            }
            st.session_state.presets.append(new_preset)
            st.success(f"프리셋 '{preset_name}' 저장됨")
            st.rerun()
    
    # 프리셋 목록
    for preset in st.session_state.presets:
        col1, col2, col3 = st.columns([3, 1, 1])
        
        with col1:
            st.text(preset['name'])
        
        with col2:
            if st.button("불러오기", key=f"load_{preset['id']}"):
                st.session_state.filters = preset['filters'].copy()
                st.success(f"프리셋 '{preset['name']}' 적용됨")
                st.rerun()
        
        with col3:
            if st.button("삭제", key=f"delete_{preset['id']}"):
                st.session_state.presets = [
                    p for p in st.session_state.presets if p['id'] != preset['id']
                ]
                st.rerun()
```

---

## 5. 결과 표시

### 5.1 Quick Insight Card

**목적**: 검색 결과 전체를 한눈에 요약

**데이터 구조**:

```python
QuickInsight = {
    "total_panels": int,            # 전체 결과 수
    
    # Coverage 분포
    "qw_count": int,
    "qw_ratio": float,              # %
    "w_count": int,
    "w_ratio": float,
    
    # 인구통계 분포
    "gender_distribution": {
        "여성": float,              # %
        "남성": float,
    },
    "gender_top": str,              # "여성" 또는 "남성"
    "gender_top_pct": float,        # 주도 성별 비율
    
    "age_distribution": {
        "20대": float,
        "30대": float,
        "40대": float,
        "50대+": float,
    },
    "age_top": str,                 # "20대"
    "age_top_pct": float,
    
    "region_distribution": Dict[str, float],
    "region_top": str,
    "region_top_pct": float,
    
    # 태그 분포
    "top_tags": List[Tuple[str, int]],  # (태그명, 출현 횟수) Top 10
    
    # 군집 분포
    "cluster_distribution": Dict[str, int],
}
```

**Streamlit 구현**:

```python
# components/quick_insight.py
import streamlit as st
import pandas as pd

def calculate_quick_insight(panels_df: pd.DataFrame) -> dict:
    """패널 데이터프레임에서 Quick Insight 계산"""
    total = len(panels_df)
    
    # Coverage
    qw_count = len(panels_df[panels_df['coverage'] == 'qw'])
    w_count = len(panels_df[panels_df['coverage'] == 'w'])
    
    # Gender
    gender_dist = panels_df['gender'].value_counts(normalize=True) * 100
    gender_top = gender_dist.idxmax()
    
    # Age
    def age_to_group(age):
        if age < 30:
            return '20대'
        elif age < 40:
            return '30대'
        elif age < 50:
            return '40대'
        else:
            return '50대+'
    
    panels_df['age_group'] = panels_df['age'].apply(age_to_group)
    age_dist = panels_df['age_group'].value_counts(normalize=True) * 100
    age_top = age_dist.idxmax()
    
    # Region
    region_dist = panels_df['region'].value_counts(normalize=True) * 100
    region_top = region_dist.idxmax()
    
    # Tags (flatten list column)
    all_tags = [tag for tags in panels_df['tags'] for tag in tags]
    tag_counts = pd.Series(all_tags).value_counts()
    top_tags = list(tag_counts.head(10).items())
    
    # Cluster
    cluster_dist = panels_df['cluster'].value_counts().to_dict()
    
    return {
        'total_panels': total,
        'qw_count': qw_count,
        'qw_ratio': (qw_count / total * 100) if total > 0 else 0,
        'w_count': w_count,
        'w_ratio': (w_count / total * 100) if total > 0 else 0,
        'gender_top': gender_top,
        'gender_top_pct': gender_dist[gender_top],
        'age_top': age_top,
        'age_top_pct': age_dist[age_top],
        'region_top': region_top,
        'region_top_pct': region_dist[region_top],
        'top_tags': top_tags,
        'cluster_distribution': cluster_dist,
    }

def render_quick_insight(insight: dict):
    """Quick Insight 카드 렌더링"""
    st.subheader("📊 Quick Insight")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("전체 결과", f"{insight['total_panels']:,}명")
    
    with col2:
        st.metric(
            "Q+W Coverage",
            f"{insight['qw_count']:,}명",
            delta=f"{insight['qw_ratio']:.1f}%"
        )
    
    with col3:
        st.metric(
            "주요 성별",
            insight['gender_top'],
            delta=f"{insight['gender_top_pct']:.0f}%"
        )
    
    with col4:
        st.metric(
            "주요 연령",
            insight['age_top'],
            delta=f"{insight['age_top_pct']:.0f}%"
        )
    
    # 상위 태그
    st.subheader("상위 태그")
    tags_df = pd.DataFrame(insight['top_tags'], columns=['태그', '출현 횟수'])
    st.dataframe(tags_df, use_container_width=True, hide_index=True)
    
    # 군집 분포
    st.subheader("군집 분포")
    cluster_df = pd.DataFrame(
        insight['cluster_distribution'].items(),
        columns=['군집', '패널 수']
    )
    st.bar_chart(cluster_df.set_index('군집'))
```

### 5.2 패널 목록 표시

**Table View vs Cards View**

**Streamlit 구현**:

```python
# pages/results_page.py
import streamlit as st
import pandas as pd

def render_panel_list(panels_df: pd.DataFrame):
    """패널 목록 렌더링"""
    
    # 뷰 모드 선택
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        st.subheader(f"검색 결과 ({len(panels_df):,}개)")
    
    with col2:
        view_mode = st.selectbox(
            "표시 방식",
            options=['cards', 'table'],
            format_func=lambda x: '카드' if x == 'cards' else '표',
            key='view_mode'
        )
    
    with col3:
        sort_by = st.selectbox(
            "정렬",
            options=['similarity', 'recent', 'responses'],
            format_func=lambda x: {
                'similarity': '유사도순',
                'recent': '최신순',
                'responses': '응답 수순'
            }[x],
            key='sort_by'
        )
    
    # 정렬 적용
    if sort_by == 'similarity':
        panels_df = panels_df.sort_values('search_similarity', ascending=False)
    elif sort_by == 'recent':
        panels_df = panels_df.sort_values('last_answered', ascending=False)
    elif sort_by == 'responses':
        panels_df = panels_df.sort_values('response_count', ascending=False)
    
    # 선택 바
    selected_count = len(st.session_state.selected_panels)
    if selected_count > 0:
        col1, col2, col3 = st.columns([2, 1, 1])
        with col1:
            st.info(f"✓ {selected_count}개 선택됨")
        with col2:
            if st.button("내보내기"):
                st.session_state.show_export_dialog = True
                st.rerun()
        with col3:
            if st.button("선택 해제"):
                st.session_state.selected_panels = []
                st.rerun()
    
    # Table View
    if view_mode == 'table':
        # 선택 체크박스 추가
        selection = st.data_editor(
            panels_df[[
                'id', 'coverage', 'cluster', 'gender', 'age',
                'region', 'income', 'tags', 'response_count', 'snippet'
            ]],
            column_config={
                'id': st.column_config.TextColumn('패널 ID', width='small'),
                'coverage': st.column_config.TextColumn('Coverage', width='small'),
                'cluster': st.column_config.TextColumn('군집', width='small'),
                'tags': st.column_config.ListColumn('태그'),
                'snippet': st.column_config.TextColumn('요약', width='large'),
            },
            use_container_width=True,
            hide_index=True,
            num_rows='fixed',
            key='panel_table'
        )
        
        # 행 클릭 시 패널 상세 열기
        # (Streamlit에서는 data_editor의 on_select 콜백 사용)
    
    # Cards View
    else:
        for idx, row in panels_df.iterrows():
            render_panel_card(row)

def render_panel_card(panel: pd.Series):
    """개별 패널 카드"""
    with st.container():
        col1, col2, col3 = st.columns([0.3, 3, 1])
        
        # 선택 체크박스
        with col1:
            is_selected = panel['id'] in st.session_state.selected_panels
            if st.checkbox("", value=is_selected, key=f"select_{panel['id']}"):
                if panel['id'] not in st.session_state.selected_panels:
                    st.session_state.selected_panels.append(panel['id'])
            else:
                if panel['id'] in st.session_state.selected_panels:
                    st.session_state.selected_panels.remove(panel['id'])
        
        # 패널 정보
        with col2:
            st.markdown(f"**{panel['id']}**")
            st.caption(f"{panel['gender']} · {panel['age']}세 · {panel['region']} · {panel['income']}만원")
            
            # 태그
            tags_html = ' '.join([f'<span style="background:#e0e7ff;padding:2px 8px;border-radius:12px;font-size:12px;">{tag}</span>' for tag in panel['tags'][:5]])
            st.markdown(tags_html, unsafe_allow_html=True)
            
            st.caption(panel['snippet'])
        
        # 액션 버튼
        with col3:
            if st.button("상세보기", key=f"detail_{panel['id']}"):
                # 패널 상세 다이얼로그 열기
                st.session_state.selected_panel_id = panel['id']
                st.session_state.show_panel_detail = True
                add_to_recent_panels(panel['id'], panel['cluster'], panel['coverage'])
                st.rerun()
            
            if st.button("지도에서 찾기", key=f"locate_{panel['id']}"):
                st.session_state.located_panel_id = panel['id']
                st.session_state.active_tab = 'cluster'
                st.success(f"{panel['id']} 위치 표시")
                st.rerun()
        
        st.divider()
```

### 5.3 정렬 & 페이지네이션

**Streamlit 구현**:

```python
# utils/pagination.py
import streamlit as st
import pandas as pd

def paginate_dataframe(df: pd.DataFrame, page_size: int = 20) -> pd.DataFrame:
    """데이터프레임 페이지네이션"""
    total_pages = (len(df) - 1) // page_size + 1
    
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        page = st.selectbox(
            "페이지",
            options=range(1, total_pages + 1),
            format_func=lambda x: f"페이지 {x} / {total_pages}",
            key='page_selector'
        )
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    return df.iloc[start_idx:end_idx]
```

---

## 6. 군집 분석

### 6.1 모델 상태 카드

**Streamlit 구현**:

```python
# components/model_status_card.py
import streamlit as st
import json

def load_model_status() -> dict:
    """model_status.json 로드"""
    with open('data/model_status.json') as f:
        return json.load(f)

def render_model_status():
    """모델 상태 카드"""
    status = load_model_status()
    
    st.subheader("🔬 군집 모델 상태")
    
    # 상태 배지
    status_color = {
        'synced': '🟢',
        'outdated': '🟡',
        'training': '🔵'
    }
    st.markdown(f"{status_color[status['status']]} **{status['status'].upper()}**")
    
    # 메트릭
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("알고리즘", status['algorithm'])
    
    with col2:
        st.metric("군집 수", status['total_clusters'])
    
    with col3:
        st.metric("실루엣 점수", f"{status['overall_silhouette']:.3f}")
    
    with col4:
        st.metric("Noise 비율", f"{status['noise_ratio']:.1f}%")
    
    # 상세 정보
    with st.expander("상세 정보"):
        st.text(f"학습 일시: {status['trained_at']}")
        st.text(f"학습 패널 수: {status['trained_on_count']:,}개")
        st.text(f"학습 소요 시간: {status['training_duration_seconds']:.1f}초")
        st.text(f"현재 패널 수: {status['current_panel_count']:,}개")
        st.text(f"학습 이후 증가: {status['delta_since_training']:,}개")
    
    # Outdated 경고
    if status['status'] == 'outdated':
        st.warning(
            f"⚠️ 모델이 {status['delta_since_training']}개 패널만큼 오래되었습니다. "
            "재학습을 권장합니다."
        )
        
        if st.button("재학습 요청 (Admin만 가능)"):
            st.info("재학습이 예약되었습니다. 완료 시 알림을 받게 됩니다.")
```

### 6.2 UMAP 시각화

**Streamlit 구현** (Plotly 사용):

```python
# components/umap_chart.py
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

def load_umap_data() -> pd.DataFrame:
    """UMAP embeddings + 패널 정보 조인"""
    umap_df = pd.read_csv('data/umap_embeddings.csv')
    panels_df = pd.read_csv('data/panels.csv')
    
    merged = umap_df.merge(
        panels_df[['id', 'gender', 'age', 'region', 'tags']],
        left_on='panel_id',
        right_on='id'
    )
    return merged

def render_umap_chart(
    selected_clusters: list = [],
    show_noise: bool = True,
    highlight_panel_id: str = None
):
    """UMAP 2D 산점도"""
    st.subheader("🗺️ UMAP 군집 지도")
    
    df = load_umap_data()
    
    # 필터링
    if selected_clusters:
        df = df[df['cluster'].isin(selected_clusters)]
    
    if not show_noise:
        df = df[df['cluster'] != 'Noise']
    
    # Plotly scatter
    fig = px.scatter(
        df,
        x='umap_x',
        y='umap_y',
        color='cluster',
        hover_data=['panel_id', 'gender', 'age', 'region'],
        title='UMAP 2D Projection',
        color_discrete_sequence=px.colors.qualitative.Set2
    )
    
    # 하이라이트 패널
    if highlight_panel_id:
        highlight = df[df['panel_id'] == highlight_panel_id]
        if not highlight.empty:
            fig.add_trace(go.Scatter(
                x=highlight['umap_x'],
                y=highlight['umap_y'],
                mode='markers',
                marker=dict(size=15, color='red', symbol='star', line=dict(width=2, color='white')),
                name='Located Panel',
                showlegend=True
            ))
    
    fig.update_layout(
        width=800,
        height=600,
        xaxis_title='UMAP Dimension 1',
        yaxis_title='UMAP Dimension 2'
    )
    
    st.plotly_chart(fig, use_container_width=True, key='umap_chart')
    
    # 인터랙션 (Streamlit의 plotly_chart는 클릭 이벤트 지원 안 함)
    # 대신 데이터 테이블로 클릭 가능
    st.caption("💡 패널을 클릭하려면 아래 표에서 선택하세요")
    selected_point = st.selectbox(
        "패널 선택",
        options=df['panel_id'].tolist(),
        format_func=lambda x: f"{x} ({df[df['panel_id']==x]['cluster'].iloc[0]})"
    )
    
    if st.button("선택한 패널 상세보기"):
        st.session_state.selected_panel_id = selected_point
        st.session_state.show_panel_detail = True
        st.rerun()
```

### 6.3 군집 프로필 카드

**Streamlit 구현**:

```python
# components/cluster_profile.py
import streamlit as st
import json

def load_cluster_data() -> list:
    """clusters.json 로드"""
    with open('data/clusters.json') as f:
        return json.load(f)

def render_cluster_profiles():
    """모든 군집 프로필"""
    st.subheader("📊 군집 프로필")
    
    clusters = load_cluster_data()
    
    for cluster in clusters:
        with st.expander(f"{cluster['label']} ({cluster['size']}명)"):
            # 기본 정보
            st.markdown(f"**설명**: {cluster['description']}")
            
            # 메트릭
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("패널 수", f"{cluster['size']:,}명")
            with col2:
                st.metric("실루엣 점수", f"{cluster['silhouette_score']:.3f}")
            with col3:
                st.metric("Q+W 비율", f"{cluster['coverage_ratio']['qw']*100:.0f}%")
            
            # 인구통계
            st.subheader("인구통계")
            demo = cluster['demographics']
            st.text(f"평균 연령: {demo['avg_age']:.1f}세")
            st.text(f"성비: 여성 {demo['gender_ratio']['여성']*100:.0f}% / 남성 {demo['gender_ratio']['남성']*100:.0f}%")
            st.text(f"주요 지역: {', '.join(demo['top_regions'])}")
            
            # 소득 분포 차트
            income_df = pd.DataFrame(
                demo['income_distribution'].items(),
                columns=['소득', '비율']
            )
            st.bar_chart(income_df.set_index('소득'))
            
            # 대표 태그
            st.subheader("대표 태그")
            tags_html = ' '.join([
                f'<span style="background:#e0e7ff;padding:4px 12px;border-radius:16px;margin:4px;">{tag}</span>'
                for tag in cluster['top_tags']
            ])
            st.markdown(tags_html, unsafe_allow_html=True)
            
            # Evidence
            st.subheader("대표 응답 예시")
            for i, evidence in enumerate(cluster['evidence'], 1):
                st.caption(f"{i}. {evidence}")
```

### 6.4 군집 품질 지표

**Streamlit 구현**:

```python
# components/cluster_quality.py
import streamlit as st
import pandas as pd

def render_cluster_quality():
    """군집별 실루엣 점수 차트"""
    st.subheader("📈 군집 품질 지표")
    
    clusters = load_cluster_data()
    
    # 실루엣 점수 데이터
    silhouette_data = [
        {'군집': c['cluster_id'], '실루엣 점수': c['silhouette_score']}
        for c in clusters
    ]
    df = pd.DataFrame(silhouette_data)
    
    # 막대 차트
    st.bar_chart(df.set_index('군집'))
    
    # 해석 가이드
    st.info(
        "**실루엣 점수 해석**\n\n"
        "- 0.7 이상: 매우 좋음\n"
        "- 0.5~0.7: 좋음\n"
        "- 0.25~0.5: 보통\n"
        "- 0.25 미만: 나쁨"
    )
    
    # 전체 실루엣 점수
    overall = load_model_status()['overall_silhouette']
    st.metric("전체 실루엣 점수", f"{overall:.3f}")
```

### 6.5 군집 필터 & 보기 제어

**Streamlit 구현**:

```python
# components/cluster_controls.py
import streamlit as st

def render_cluster_controls():
    """군집 필터 & 보기 제어"""
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 군집 선택
        selected_clusters = st.multiselect(
            "표시할 군집",
            options=['C1', 'C2', 'C3', 'C4', 'C5'],
            default=[],
            help="선택한 군집만 UMAP 지도에 표시합니다"
        )
        st.session_state.selected_clusters_for_view = selected_clusters
    
    with col2:
        # Noise 표시 토글
        show_noise = st.checkbox(
            "Noise 포인트 표시",
            value=st.session_state.show_noise
        )
        st.session_state.show_noise = show_noise
    
    # 뷰 모드
    view_mode = st.radio(
        "보기",
        options=['map', 'profiles', 'quality'],
        format_func=lambda x: {
            'map': '🗺️ UMAP 지도',
            'profiles': '📊 군집 프로필',
            'quality': '📈 품질 지표'
        }[x],
        horizontal=True
    )
    st.session_state.cluster_view = view_mode
    
    return view_mode
```

---

## 7. 비교 분석

### 7.1 그룹 선택

**Streamlit 구현**:

```python
# pages/compare_page.py
import streamlit as st

def render_group_selector():
    """비교할 두 그룹 선택"""
    st.subheader("⚖️ 비교 분석")
    
    col1, col2 = st.columns(2)
    
    # Group A
    with col1:
        st.markdown("### Group A")
        
        group_a_type = st.selectbox(
            "유형",
            options=['cluster', 'segment'],
            format_func=lambda x: '군집' if x == 'cluster' else '세그먼트',
            key='group_a_type'
        )
        
        if group_a_type == 'cluster':
            clusters = load_cluster_data()
            group_a_id = st.selectbox(
                "군집 선택",
                options=[c['cluster_id'] for c in clusters],
                format_func=lambda x: next(c['label'] for c in clusters if c['cluster_id'] == x),
                key='group_a_id'
            )
            
            # 선택된 군집 데이터 저장
            group_a_data = next(c for c in clusters if c['cluster_id'] == group_a_id)
            st.session_state.compare_group_a = group_a_data
            
            # 요약 표시
            st.info(f"{group_a_data['size']:,}명 ({group_a_data['percentage']:.1f}%)")
            st.caption(group_a_data['description'])
    
    # Group B
    with col2:
        st.markdown("### Group B")
        
        group_b_type = st.selectbox(
            "유형",
            options=['cluster', 'segment'],
            format_func=lambda x: '군집' if x == 'cluster' else '세그먼트',
            key='group_b_type'
        )
        
        if group_b_type == 'cluster':
            group_b_id = st.selectbox(
                "군집 선택",
                options=[c['cluster_id'] for c in clusters],
                format_func=lambda x: next(c['label'] for c in clusters if c['cluster_id'] == x),
                key='group_b_id'
            )
            
            group_b_data = next(c for c in clusters if c['cluster_id'] == group_b_id)
            st.session_state.compare_group_b = group_b_data
            
            st.info(f"{group_b_data['size']:,}명 ({group_b_data['percentage']:.1f}%)")
            st.caption(group_b_data['description'])
    
    # 비교 시작 버튼
    if st.button("비교 분석 시작", type="primary", use_container_width=True):
        st.session_state.show_comparison = True
        st.rerun()
```

### 7.2 분포 차이 (Δ%p)

**계산 로직**:

```python
# utils/comparison.py
import pandas as pd

def calculate_distribution_diff(group_a_df: pd.DataFrame, group_b_df: pd.DataFrame) -> pd.DataFrame:
    """
    두 그룹 간 카테고리별 분포 차이 계산
    
    Returns:
        DataFrame with columns: ['category', 'group_a_pct', 'group_b_pct', 'delta_pp']
    """
    results = []
    
    # 성별 분포
    for gender in ['남성', '여성']:
        a_pct = (group_a_df['gender'] == gender).sum() / len(group_a_df) * 100
        b_pct = (group_b_df['gender'] == gender).sum() / len(group_b_df) * 100
        results.append({
            'category': gender,
            'group_a_pct': a_pct,
            'group_b_pct': b_pct,
            'delta_pp': a_pct - b_pct
        })
    
    # 연령대 분포
    for age_group in ['20대', '30대', '40대', '50대+']:
        a_count = (group_a_df['age_group'] == age_group).sum()
        b_count = (group_b_df['age_group'] == age_group).sum()
        a_pct = a_count / len(group_a_df) * 100
        b_pct = b_count / len(group_b_df) * 100
        results.append({
            'category': age_group,
            'group_a_pct': a_pct,
            'group_b_pct': b_pct,
            'delta_pp': a_pct - b_pct
        })
    
    # 지역 분포
    all_regions = set(group_a_df['region']) | set(group_b_df['region'])
    for region in all_regions:
        a_pct = (group_a_df['region'] == region).sum() / len(group_a_df) * 100
        b_pct = (group_b_df['region'] == region).sum() / len(group_b_df) * 100
        results.append({
            'category': region,
            'group_a_pct': a_pct,
            'group_b_pct': b_pct,
            'delta_pp': a_pct - b_pct
        })
    
    # 태그 분포
    a_tags = [tag for tags in group_a_df['tags'] for tag in tags]
    b_tags = [tag for tags in group_b_df['tags'] for tag in tags]
    all_tags = set(a_tags) | set(b_tags)
    
    for tag in all_tags:
        a_pct = a_tags.count(tag) / len(a_tags) * 100 if a_tags else 0
        b_pct = b_tags.count(tag) / len(b_tags) * 100 if b_tags else 0
        results.append({
            'category': tag,
            'group_a_pct': a_pct,
            'group_b_pct': b_pct,
            'delta_pp': a_pct - b_pct
        })
    
    df = pd.DataFrame(results)
    df = df.sort_values('delta_pp', ascending=False, key=abs)
    return df
```

**시각화**:

```python
# components/distribution_diff_chart.py
import streamlit as st
import plotly.graph_objects as go

def render_distribution_diff(diff_df: pd.DataFrame):
    """분포 차이 차트 (Δ%p)"""
    st.subheader("📊 분포 차이 (Δ%p)")
    
    # 정렬 옵션
    sort_by = st.selectbox(
        "정렬 기준",
        options=['delta_abs', 'delta_desc', 'group_a', 'group_b'],
        format_func=lambda x: {
            'delta_abs': 'Δ%p 절댓값 큰 순',
            'delta_desc': 'Δ%p 내림차순',
            'group_a': 'Group A % 내림차순',
            'group_b': 'Group B % 내림차순'
        }[x]
    )
    
    if sort_by == 'delta_abs':
        diff_df = diff_df.sort_values('delta_pp', ascending=False, key=abs)
    elif sort_by == 'delta_desc':
        diff_df = diff_df.sort_values('delta_pp', ascending=False)
    elif sort_by == 'group_a':
        diff_df = diff_df.sort_values('group_a_pct', ascending=False)
    else:
        diff_df = diff_df.sort_values('group_b_pct', ascending=False)
    
    # 상위 20개만 표시
    diff_df = diff_df.head(20)
    
    # 양방향 막대 차트
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        y=diff_df['category'],
        x=diff_df['group_a_pct'],
        name='Group A',
        orientation='h',
        marker_color='#2563EB'
    ))
    
    fig.add_trace(go.Bar(
        y=diff_df['category'],
        x=diff_df['group_b_pct'],
        name='Group B',
        orientation='h',
        marker_color='#7C3AED'
    ))
    
    fig.update_layout(
        barmode='group',
        xaxis_title='비율 (%)',
        yaxis_title='카테고리',
        height=600
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # 데이터 테이블
    st.subheader("상세 데이터")
    st.dataframe(
        diff_df,
        column_config={
            'category': st.column_config.TextColumn('카테고리'),
            'group_a_pct': st.column_config.NumberColumn('Group A (%)', format='%.1f%%'),
            'group_b_pct': st.column_config.NumberColumn('Group B (%)', format='%.1f%%'),
            'delta_pp': st.column_config.NumberColumn('Δ%p', format='%+.1f'),
        },
        use_container_width=True,
        hide_index=True
    )
```

### 7.3 Lift 분석

**계산 로직**:

```python
# utils/comparison.py (continued)
def calculate_lift(group_a_df: pd.DataFrame, group_b_df: pd.DataFrame, baseline_df: pd.DataFrame) -> pd.DataFrame:
    """
    Lift 분석: 각 특징의 상대적 강도
    Lift = (그룹 내 비율) / (전체 평균 비율)
    
    Args:
        group_a_df: Group A 패널
        group_b_df: Group B 패널
        baseline_df: 전체 패널 (기준)
    
    Returns:
        DataFrame with columns: ['feature', 'group_a_lift', 'group_b_lift', 'base_rate']
    """
    results = []
    
    # 태그별 Lift
    all_tags = set()
    for df in [group_a_df, group_b_df, baseline_df]:
        for tags in df['tags']:
            all_tags.update(tags)
    
    for tag in all_tags:
        # 전체 평균 비율
        base_count = sum(tag in tags for tags in baseline_df['tags'])
        base_rate = base_count / len(baseline_df)
        
        # Group A 비율
        a_count = sum(tag in tags for tags in group_a_df['tags'])
        a_rate = a_count / len(group_a_df) if len(group_a_df) > 0 else 0
        a_lift = a_rate / base_rate if base_rate > 0 else 0
        
        # Group B 비율
        b_count = sum(tag in tags for tags in group_b_df['tags'])
        b_rate = b_count / len(group_b_df) if len(group_b_df) > 0 else 0
        b_lift = b_rate / base_rate if base_rate > 0 else 0
        
        results.append({
            'feature': tag,
            'group_a_lift': a_lift,
            'group_b_lift': b_lift,
            'base_rate': base_rate * 100
        })
    
    df = pd.DataFrame(results)
    df = df.sort_values('group_a_lift', ascending=False)
    return df
```

**시각화**:

```python
# components/lift_chart.py
import streamlit as st
import plotly.graph_objects as go

def render_lift_chart(lift_df: pd.DataFrame):
    """Lift 분석 차트"""
    st.subheader("📈 Lift 분석")
    
    st.info(
        "**Lift 해석**\n\n"
        "- Lift > 1.0: 해당 그룹에서 특징이 강함 (전체 평균보다 높음)\n"
        "- Lift = 1.0: 전체 평균과 동일\n"
        "- Lift < 1.0: 해당 그룹에서 특징이 약함 (전체 평균보다 낮음)"
    )
    
    # 상위 15개만
    lift_df = lift_df.head(15)
    
    # 그룹화 막대 차트
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        y=lift_df['feature'],
        x=lift_df['group_a_lift'],
        name='Group A Lift',
        orientation='h',
        marker_color='#2563EB'
    ))
    
    fig.add_trace(go.Bar(
        y=lift_df['feature'],
        x=lift_df['group_b_lift'],
        name='Group B Lift',
        orientation='h',
        marker_color='#7C3AED'
    ))
    
    # 기준선 (Lift = 1.0)
    fig.add_vline(x=1.0, line_dash='dash', line_color='gray', annotation_text='전체 평균')
    
    fig.update_layout(
        barmode='group',
        xaxis_title='Lift (1.0 = 전체 평균)',
        yaxis_title='특징',
        height=500
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # 데이터 테이블
    st.dataframe(
        lift_df,
        column_config={
            'feature': st.column_config.TextColumn('특징'),
            'group_a_lift': st.column_config.NumberColumn('Group A Lift', format='%.2f'),
            'group_b_lift': st.column_config.NumberColumn('Group B Lift', format='%.2f'),
            'base_rate': st.column_config.NumberColumn('전체 평균 (%)', format='%.1f%%'),
        },
        use_container_width=True,
        hide_index=True
    )
```

### 7.4 SMD (표준화 평균 차이)

**계산 로직**:

```python
# utils/comparison.py (continued)
import numpy as np
from scipy import stats

def calculate_smd(group_a_df: pd.DataFrame, group_b_df: pd.DataFrame) -> pd.DataFrame:
    """
    SMD (Standardized Mean Difference) 계산
    SMD = (Mean_A - Mean_B) / Pooled_SD
    
    연속형 변수에 대해서만 계산
    """
    results = []
    
    # 연령
    a_age = group_a_df['age'].values
    b_age = group_b_df['age'].values
    smd_age, ci_age = compute_smd_with_ci(a_age, b_age)
    results.append({
        'metric': '연령',
        'group_a_mean': np.mean(a_age),
        'group_b_mean': np.mean(b_age),
        'smd': smd_age,
        'ci_lower': ci_age[0],
        'ci_upper': ci_age[1],
        'effect_size': interpret_smd(smd_age)
    })
    
    # 응답 수
    a_responses = group_a_df[group_a_df['coverage'] == 'qw']['response_count'].values
    b_responses = group_b_df[group_b_df['coverage'] == 'qw']['response_count'].values
    if len(a_responses) > 0 and len(b_responses) > 0:
        smd_resp, ci_resp = compute_smd_with_ci(a_responses, b_responses)
        results.append({
            'metric': '응답 수',
            'group_a_mean': np.mean(a_responses),
            'group_b_mean': np.mean(b_responses),
            'smd': smd_resp,
            'ci_lower': ci_resp[0],
            'ci_upper': ci_resp[1],
            'effect_size': interpret_smd(smd_resp)
        })
    
    # 품질 점수
    a_quality = group_a_df['quality_score'].values
    b_quality = group_b_df['quality_score'].values
    smd_qual, ci_qual = compute_smd_with_ci(a_quality, b_quality)
    results.append({
        'metric': '품질 점수',
        'group_a_mean': np.mean(a_quality),
        'group_b_mean': np.mean(b_quality),
        'smd': smd_qual,
        'ci_lower': ci_qual[0],
        'ci_upper': ci_qual[1],
        'effect_size': interpret_smd(smd_qual)
    })
    
    return pd.DataFrame(results)

def compute_smd_with_ci(a: np.ndarray, b: np.ndarray, alpha: float = 0.05) -> tuple:
    """SMD와 95% 신뢰구간 계산"""
    n_a = len(a)
    n_b = len(b)
    mean_a = np.mean(a)
    mean_b = np.mean(b)
    var_a = np.var(a, ddof=1)
    var_b = np.var(b, ddof=1)
    
    # Pooled standard deviation
    pooled_sd = np.sqrt(((n_a - 1) * var_a + (n_b - 1) * var_b) / (n_a + n_b - 2))
    
    # SMD
    smd = (mean_a - mean_b) / pooled_sd if pooled_sd > 0 else 0
    
    # 95% CI (bootstrap or parametric)
    # 간단히 parametric 방법 사용
    se_smd = np.sqrt((n_a + n_b) / (n_a * n_b) + smd**2 / (2 * (n_a + n_b)))
    ci_lower = smd - 1.96 * se_smd
    ci_upper = smd + 1.96 * se_smd
    
    return smd, (ci_lower, ci_upper)

def interpret_smd(smd: float) -> str:
    """SMD 효과 크기 해석"""
    abs_smd = abs(smd)
    if abs_smd < 0.2:
        return 'negligible'
    elif abs_smd < 0.5:
        return 'small'
    elif abs_smd < 0.8:
        return 'medium'
    else:
        return 'large'
```

**시각화**:

```python
# components/smd_chart.py
import streamlit as st
import plotly.graph_objects as go

def render_smd_chart(smd_df: pd.DataFrame):
    """SMD 차트 (Forest Plot 스타일)"""
    st.subheader("📏 SMD (표준화 평균 차이)")
    
    st.info(
        "**SMD 해석**\n\n"
        "- |SMD| < 0.2: 무시 가능\n"
        "- 0.2 ≤ |SMD| < 0.5: 작은 효과\n"
        "- 0.5 ≤ |SMD| < 0.8: 중간 효과\n"
        "- |SMD| ≥ 0.8: 큰 효과\n\n"
        "SMD > 0: Group A가 더 높음\n"
        "SMD < 0: Group B가 더 높음"
    )
    
    # Forest plot
    fig = go.Figure()
    
    for idx, row in smd_df.iterrows():
        # 점 추정치
        fig.add_trace(go.Scatter(
            x=[row['smd']],
            y=[row['metric']],
            mode='markers',
            marker=dict(size=12, color='#2563EB'),
            name=row['metric'],
            showlegend=False
        ))
        
        # 95% CI
        fig.add_trace(go.Scatter(
            x=[row['ci_lower'], row['ci_upper']],
            y=[row['metric'], row['metric']],
            mode='lines',
            line=dict(color='#2563EB', width=2),
            showlegend=False
        ))
    
    # 기준선 (SMD = 0)
    fig.add_vline(x=0, line_dash='dash', line_color='gray')
    
    # 효과 크기 기준선
    fig.add_vline(x=-0.8, line_dash='dot', line_color='red', opacity=0.3)
    fig.add_vline(x=0.8, line_dash='dot', line_color='red', opacity=0.3)
    
    fig.update_layout(
        xaxis_title='SMD (95% CI)',
        yaxis_title='지표',
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # 데이터 테이블
    st.dataframe(
        smd_df,
        column_config={
            'metric': st.column_config.TextColumn('지표'),
            'group_a_mean': st.column_config.NumberColumn('Group A 평균', format='%.2f'),
            'group_b_mean': st.column_config.NumberColumn('Group B 평균', format='%.2f'),
            'smd': st.column_config.NumberColumn('SMD', format='%.3f'),
            'ci_lower': st.column_config.NumberColumn('95% CI 하한', format='%.3f'),
            'ci_upper': st.column_config.NumberColumn('95% CI 상한', format='%.3f'),
            'effect_size': st.column_config.TextColumn('효과 크기'),
        },
        use_container_width=True,
        hide_index=True
    )
```

---

## 8. 패널 상세 정보

### 8.1 패널 상세 다이얼로그

**Streamlit 구현** (st.dialog 사용):

```python
# components/panel_detail.py
import streamlit as st

@st.dialog("패널 상세 정보", width='large')
def show_panel_detail(panel_id: str):
    """패널 상세 정보 모달"""
    # 패널 데이터 로드
    panels_df = pd.read_csv('data/panels.csv')
    panel = panels_df[panels_df['id'] == panel_id].iloc[0]
    
    # 헤더
    col1, col2 = st.columns([3, 1])
    with col1:
        st.title(panel_id)
    with col2:
        if st.button("📍 지도에서 찾기"):
            st.session_state.located_panel_id = panel_id
            st.session_state.active_tab = 'cluster'
            st.rerun()
    
    # 기본 정보
    st.subheader("기본 정보")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Coverage", panel['coverage'].upper())
    with col2:
        st.metric("군집", panel['cluster'])
    with col3:
        st.metric("응답 수", panel['response_count'])
    with col4:
        st.metric("품질 점수", f"{panel['quality_score']:.2f}")
    
    # 인구통계
    st.subheader("인구통계")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.text(f"성별: {panel['gender']}")
    with col2:
        st.text(f"연령: {panel['age']}세")
    with col3:
        st.text(f"지역: {panel['region']}")
    with col4:
        st.text(f"소득: {panel['income']}만원")
    
    # 태그
    st.subheader("관심사 & 행동")
    tags_html = ' '.join([
        f'<span style="background:#e0e7ff;padding:6px 16px;border-radius:20px;margin:4px;display:inline-block;">{tag}</span>'
        for tag in panel['tags']
    ])
    st.markdown(tags_html, unsafe_allow_html=True)
    
    # Snippet
    st.subheader("AI 요약")
    st.info(panel['snippet'])
    
    # 메타데이터
    with st.expander("메타데이터"):
        st.text(f"마지막 응답: {panel['last_answered'] or 'N/A'}")
        st.text(f"생성일: {panel['created_at']}")
        st.text(f"업데이트: {panel['updated_at']}")
    
    # 액션 버튼
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("내보내기", use_container_width=True):
            # CSV 다운로드
            st.download_button(
                "CSV 다운로드",
                data=panel.to_csv(index=False),
                file_name=f"{panel_id}.csv",
                mime='text/csv'
            )
    
    with col2:
        if st.button("북마크 추가", use_container_width=True):
            # 북마크 추가 로직
            st.success("북마크에 추가되었습니다")
    
    with col3:
        if st.button("닫기", use_container_width=True):
            st.session_state.show_panel_detail = False
            st.rerun()

# 사용
if st.session_state.get('show_panel_detail'):
    show_panel_detail(st.session_state.selected_panel_id)
```

---

## 9. 히스토리 & 북마크

### 9.1 최근 본 패널

**Streamlit 구현**:

```python
# components/history_drawer.py
import streamlit as st

def render_history_sidebar():
    """사이드바에 최근 본 패널 히스토리"""
    with st.sidebar:
        st.header("📜 최근 본 패널")
        
        if not st.session_state.recent_panels:
            st.caption("아직 본 패널이 없습니다")
            return
        
        st.caption(f"최근 {len(st.session_state.recent_panels)}개")
        
        for panel in st.session_state.recent_panels[:20]:  # 상위 20개만
            with st.container():
                col1, col2, col3 = st.columns([2, 1, 1])
                
                with col1:
                    st.text(panel['panel_id'])
                    st.caption(f"{panel['cluster']} · {panel['coverage']}")
                
                with col2:
                    if st.button("열기", key=f"open_{panel['panel_id']}"):
                        st.session_state.selected_panel_id = panel['panel_id']
                        st.session_state.show_panel_detail = True
                        st.rerun()
                
                with col3:
                    if st.button("❌", key=f"remove_{panel['panel_id']}"):
                        st.session_state.recent_panels = [
                            p for p in st.session_state.recent_panels
                            if p['panel_id'] != panel['panel_id']
                        ]
                        st.rerun()
                
                st.divider()
        
        # 전체 삭제
        if st.button("전체 삭제", type="secondary", use_container_width=True):
            st.session_state.recent_panels = []
            st.rerun()
```

### 9.2 일괄 ID 붙여넣기

**Streamlit 구현**:

```python
# components/bulk_paste.py
import streamlit as st

def render_bulk_paste_dialog():
    """일괄 패널 ID 붙여넣기"""
    with st.expander("📋 일괄 ID 붙여넣기"):
        st.caption("패널 ID를 한 줄에 하나씩 입력하세요")
        
        bulk_ids = st.text_area(
            "패널 ID 목록",
            placeholder="P****001\nP****002\nP****003",
            height=150
        )
        
        if st.button("조회", type="primary"):
            ids = [id.strip() for id in bulk_ids.split('\n') if id.strip()]
            
            if not ids:
                st.warning("패널 ID를 입력하세요")
                return
            
            # 패널 조회
            panels_df = pd.read_csv('data/panels.csv')
            found = panels_df[panels_df['id'].isin(ids)]
            not_found = set(ids) - set(found['id'])
            
            st.success(f"{len(found)}개 패널 찾음")
            if not_found:
                st.warning(f"{len(not_found)}개 패널 없음: {', '.join(not_found)}")
            
            # 결과 표시
            st.dataframe(found, use_container_width=True)
            
            # 내보내기
            if st.button("선택한 패널 내보내기"):
                st.session_state.selected_panels = found['id'].tolist()
                st.session_state.show_export_dialog = True
                st.rerun()
```

---

## 10. 내보내기

### 10.1 내보내기 다이얼로그

**Streamlit 구현**:

```python
# components/export_dialog.py
import streamlit as st
import pandas as pd
import io

@st.dialog("내보내기", width='large')
def show_export_dialog():
    """내보내기 설정 및 다운로드"""
    st.subheader("📥 데이터 내보내기")
    
    # 내보낼 패널 선택
    export_scope = st.radio(
        "내보낼 범위",
        options=['selected', 'current', 'all'],
        format_func=lambda x: {
            'selected': f'선택한 패널 ({len(st.session_state.selected_panels)}개)',
            'current': '현재 검색 결과',
            'all': '전체 패널'
        }[x]
    )
    
    # 패널 데이터 로드
    panels_df = pd.read_csv('data/panels.csv')
    
    if export_scope == 'selected':
        export_df = panels_df[panels_df['id'].isin(st.session_state.selected_panels)]
    elif export_scope == 'current':
        # 현재 필터 적용
        export_df = apply_filters(panels_df, st.session_state.filters)
    else:
        export_df = panels_df
    
    st.info(f"총 {len(export_df):,}개 패널이 내보내집니다")
    
    # 포함할 필드 선택
    st.subheader("포함할 필드")
    
    col1, col2 = st.columns(2)
    
    with col1:
        include_basic = st.checkbox("기본 정보 (ID, Coverage, 군집)", value=True)
        include_demo = st.checkbox("인구통계 (성별, 연령, 지역, 소득)", value=True)
        include_tags = st.checkbox("태그 & 카테고리", value=True)
    
    with col2:
        include_quality = st.checkbox("품질 지표 (응답 수, 품질 점수)", value=True)
        include_search = st.checkbox("검색 관련 (유사도, Snippet)", value=False)
        include_meta = st.checkbox("메타데이터 (생성/업데이트 일시)", value=False)
    
    # 컬럼 선택
    columns = []
    if include_basic:
        columns.extend(['id', 'coverage', 'cluster', 'cluster_probability'])
    if include_demo:
        columns.extend(['gender', 'age', 'region', 'income'])
    if include_tags:
        columns.extend(['tags', 'categories'])
    if include_quality:
        columns.extend(['response_count', 'last_answered', 'quality_score'])
    if include_search:
        columns.extend(['search_similarity', 'snippet'])
    if include_meta:
        columns.extend(['created_at', 'updated_at'])
    
    export_df = export_df[columns]
    
    # 미리보기
    st.subheader("미리보기")
    st.dataframe(export_df.head(10), use_container_width=True)
    
    # 파일 형식
    st.subheader("파일 형식")
    file_format = st.selectbox(
        "형식",
        options=['csv', 'excel', 'json'],
        format_func=lambda x: x.upper()
    )
    
    # 다운로드 버튼
    if file_format == 'csv':
        csv_data = export_df.to_csv(index=False)
        st.download_button(
            "💾 CSV 다운로드",
            data=csv_data,
            file_name=f"panel_insight_export_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime='text/csv',
            type='primary',
            use_container_width=True
        )
    
    elif file_format == 'excel':
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            export_df.to_excel(writer, index=False, sheet_name='Panels')
        buffer.seek(0)
        
        st.download_button(
            "💾 Excel 다운로드",
            data=buffer,
            file_name=f"panel_insight_export_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            type='primary',
            use_container_width=True
        )
    
    elif file_format == 'json':
        json_data = export_df.to_json(orient='records', indent=2, force_ascii=False)
        st.download_button(
            "💾 JSON 다운로드",
            data=json_data,
            file_name=f"panel_insight_export_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime='application/json',
            type='primary',
            use_container_width=True
        )
    
    if st.button("닫기", use_container_width=True):
        st.session_state.show_export_dialog = False
        st.rerun()
```

---

## 11. Streamlit 구현 예시

### 11.1 완전한 main.py 예시

```python
# main.py
import streamlit as st
import pandas as pd
import json
from utils.search import search_panels
from utils.comparison import calculate_distribution_diff, calculate_lift, calculate_smd
from components.quick_insight import calculate_quick_insight, render_quick_insight
from components.filter_drawer import render_filter_drawer
from components.umap_chart import render_umap_chart
from components.cluster_profile import render_cluster_profiles
from components.cluster_quality import render_cluster_quality
from components.distribution_diff_chart import render_distribution_diff
from components.lift_chart import render_lift_chart
from components.smd_chart import render_smd_chart
from components.panel_detail import show_panel_detail
from components.export_dialog import show_export_dialog
from components.history_drawer import render_history_sidebar
from pages.results_page import render_panel_list

# 앱 설정
st.set_page_config(
    page_title="Panel Insight",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="auto"
)

# 전역 상태 초기화
def init_session_state():
    if 'initialized' not in st.session_state:
        st.session_state.current_page = 'start'
        st.session_state.active_tab = 'results'
        st.session_state.search_query = ''
        st.session_state.filters = {
            'gender': [],
            'age_range': (20, 65),
            'regions': [],
            'income_ranges': [],
            'tags': [],
            'coverage': [],
            'clusters': [],
            'min_responses': 0,
            'min_quality': 0.0,
        }
        st.session_state.view_mode = 'cards'
        st.session_state.sort_by = 'similarity'
        st.session_state.selected_panels = []
        st.session_state.cluster_view = 'map'
        st.session_state.selected_clusters_for_view = []
        st.session_state.show_noise = True
        st.session_state.located_panel_id = None
        st.session_state.compare_group_a = None
        st.session_state.compare_group_b = None
        st.session_state.recent_panels = []
        st.session_state.bookmarks = []
        st.session_state.presets = []
        st.session_state.show_filter_drawer = False
        st.session_state.show_export_dialog = False
        st.session_state.show_panel_detail = False
        st.session_state.initialized = True

init_session_state()

# 데이터 로드 (캐싱)
@st.cache_data
def load_panels():
    return pd.read_csv('data/panels.csv')

@st.cache_data
def load_clusters():
    with open('data/clusters.json') as f:
        return json.load(f)

@st.cache_data
def load_model_status():
    with open('data/model_status.json') as f:
        return json.load(f)

panels_df = load_panels()
clusters = load_clusters()
model_status = load_model_status()

# 페이지 라우팅
if st.session_state.current_page == 'start':
    # Start Page
    st.title("🔍 Panel Insight")
    st.caption("자연어로 패널을 검색하고 군집을 분석하세요")
    
    col1, col2 = st.columns([4, 1])
    with col1:
        query = st.text_input(
            "검색어 입력",
            placeholder="예: 서울 20대 여성, OTT 이용·스킨케어 관심 200명",
            key="search_input"
        )
    
    with col2:
        if st.button("검색", type="primary", use_container_width=True):
            if query:
                st.session_state.search_query = query
                st.session_state.current_page = 'results'
                st.rerun()
    
    # 프리셋
    st.subheader("빠른 시작")
    presets = [
        {"label": "20대 여성, OTT 이용자", "query": "20대 여성 OTT"},
        {"label": "서울 30대, 건강관리 관심", "query": "서울 30대 건강"},
        {"label": "가성비 추구형 소비자", "query": "가성비 할인"},
    ]
    
    cols = st.columns(3)
    for idx, preset in enumerate(presets):
        with cols[idx]:
            if st.button(preset['label'], use_container_width=True):
                st.session_state.search_query = preset['query']
                st.session_state.current_page = 'results'
                st.rerun()

elif st.session_state.current_page == 'results':
    # Results Page with Tabs
    
    # 상단 네비게이션
    col1, col2 = st.columns([3, 1])
    with col1:
        st.title("Panel Insight")
    with col2:
        if st.button("🏠 홈으로"):
            st.session_state.current_page = 'start'
            st.rerun()
    
    # 탭
    tab1, tab2, tab3 = st.tabs(["🔍 검색 결과", "📊 군집 분석", "⚖️ 비교 분석"])
    
    # 사이드바 (필터 & 히스토리)
    render_filter_drawer()
    render_history_sidebar()
    
    with tab1:
        # 검색 결과 페이지
        st.header("검색 결과")
        
        if st.session_state.search_query:
            # 검색 실행
            filtered_panels = search_panels(st.session_state.search_query, panels_df)
            
            # Quick Insight
            insight = calculate_quick_insight(filtered_panels)
            render_quick_insight(insight)
            
            st.divider()
            
            # 패널 목록
            render_panel_list(filtered_panels)
        else:
            st.info("검색어를 입력하세요")
    
    with tab2:
        # 군집 분석 페이지
        st.header("군집 분석")
        
        # 모델 상태
        from components.model_status_card import render_model_status
        render_model_status()
        
        st.divider()
        
        # 뷰 제어
        from components.cluster_controls import render_cluster_controls
        view_mode = render_cluster_controls()
        
        if view_mode == 'map':
            render_umap_chart(
                selected_clusters=st.session_state.selected_clusters_for_view,
                show_noise=st.session_state.show_noise,
                highlight_panel_id=st.session_state.located_panel_id
            )
        
        elif view_mode == 'profiles':
            render_cluster_profiles()
        
        elif view_mode == 'quality':
            render_cluster_quality()
    
    with tab3:
        # 비교 분석 페이지
        st.header("비교 분석")
        
        from pages.compare_page import render_group_selector
        render_group_selector()
        
        if st.session_state.get('show_comparison'):
            st.divider()
            
            # 그룹 데이터 로드
            group_a_df = panels_df[panels_df['cluster'] == st.session_state.compare_group_a['cluster_id']]
            group_b_df = panels_df[panels_df['cluster'] == st.session_state.compare_group_b['cluster_id']]
            
            # 분석 메트릭 선택
            metric_tabs = st.tabs(["Δ%p 분포 차이", "Lift 분석", "SMD"])
            
            with metric_tabs[0]:
                diff_df = calculate_distribution_diff(group_a_df, group_b_df)
                render_distribution_diff(diff_df)
            
            with metric_tabs[1]:
                lift_df = calculate_lift(group_a_df, group_b_df, panels_df)
                render_lift_chart(lift_df)
            
            with metric_tabs[2]:
                smd_df = calculate_smd(group_a_df, group_b_df)
                render_smd_chart(smd_df)

# 모달/다이얼로그
if st.session_state.get('show_panel_detail'):
    show_panel_detail(st.session_state.selected_panel_id)

if st.session_state.get('show_export_dialog'):
    show_export_dialog()
```

### 11.2 프로젝트 구조

```
streamlit_panel_insight/
├── main.py                         # 메인 엔트리포인트
├── requirements.txt                # 패키지 의존성
├── data/
│   ├── panels.csv                  # 패널 데이터
│   ├── clusters.json               # 군집 데이터
│   ├── umap_embeddings.csv         # UMAP 좌표
│   └── model_status.json           # 모델 상태
├── utils/
│   ├── search.py                   # 검색 로직
│   ├── filter.py                   # 필터링
│   ├── comparison.py               # 비교 분석 계산
│   └── pagination.py               # 페이지네이션
├── components/
│   ├── quick_insight.py
│   ├── filter_drawer.py
│   ├── umap_chart.py
│   ├── cluster_profile.py
│   ├── cluster_quality.py
│   ├── cluster_controls.py
│   ├── model_status_card.py
│   ├── distribution_diff_chart.py
│   ├── lift_chart.py
│   ├── smd_chart.py
│   ├── panel_detail.py
│   ├── export_dialog.py
│   ├── history_drawer.py
│   └── bulk_paste.py
└── pages/
    ├── results_page.py
    └── compare_page.py
```

### 11.3 requirements.txt

```txt
streamlit>=1.30.0
pandas>=2.0.0
numpy>=1.24.0
plotly>=5.18.0
scipy>=1.11.0
openpyxl>=3.1.0  # Excel 내보내기용
scikit-learn>=1.3.0  # 유사도 계산용 (선택적)
```

---

## 12. 추가 기능 & 확장

### 12.1 AI 인사이트 (선택적)

**기능**: 검색 결과나 군집에 대해 AI가 자동으로 인사이트 생성

**Streamlit 구현**:

```python
# components/ai_insight.py
import streamlit as st

def generate_ai_insight(panels_df: pd.DataFrame) -> str:
    """
    패널 데이터프레임에서 AI 인사이트 생성
    (실제로는 LLM API 호출)
    """
    # Mock 구현
    total = len(panels_df)
    top_cluster = panels_df['cluster'].mode()[0]
    top_gender = panels_df['gender'].mode()[0]
    avg_age = panels_df['age'].mean()
    
    insight = f"""
    **AI 인사이트**
    
    총 {total:,}명의 패널이 검색되었습니다.
    
    - **주요 군집**: {top_cluster}가 가장 많이 나타났습니다.
    - **인구통계**: 주로 {top_gender}, 평균 연령 {avg_age:.0f}세입니다.
    - **특징**: 이 그룹은 디지털 콘텐츠 소비가 활발하며, 건강과 라이프스타일에 관심이 많은 것으로 보입니다.
    
    **권장 사항**: 타겟팅 시 OTT 플랫폼과 건강 관련 제품/서비스를 중심으로 접근하는 것이 효과적일 수 있습니다.
    """
    
    return insight

def render_ai_insight(panels_df: pd.DataFrame):
    """AI 인사이트 렌더링"""
    with st.expander("🤖 AI 인사이트"):
        with st.spinner("인사이트 생성 중..."):
            insight = generate_ai_insight(panels_df)
            st.markdown(insight)
```

### 12.2 용어 사전 (Glossary)

**Streamlit 구현**:

```python
# components/glossary.py
import streamlit as st

@st.dialog("용어 사전", width='large')
def show_glossary():
    """용어 사전 다이얼로그"""
    st.subheader("📖 용어 사전")
    
    glossary = {
        "Coverage": {
            "Q+W": "설문(Q)과 행동 로그(W) 데이터가 모두 있는 패널",
            "W only": "행동 로그(W)만 있고 설문 응답이 없는 패널"
        },
        "군집 (Cluster)": {
            "정의": "유사한 특성을 가진 패널들의 그룹. KNN+Leiden 알고리즘으로 자동 생성됩니다.",
            "Noise": "어떤 군집에도 속하지 않는 이상치 패널"
        },
        "실루엣 점수 (Silhouette Score)": {
            "정의": "군집의 품질을 측정하는 지표. -1~1 범위입니다.",
            "해석": "0.7 이상은 매우 좋음, 0.5~0.7은 좋음, 0.25~0.5는 보통, 0.25 미만은 나쁨"
        },
        "UMAP": {
            "정의": "고차원 데이터를 2D로 투영하여 시각화하는 기법",
            "용도": "패널 간의 유사도를 지도 형태로 보여줍니다"
        },
        "Δ%p (Delta Percentage Point)": {
            "정의": "두 그룹 간 비율의 절대 차이",
            "예시": "Group A에서 여성이 60%, Group B에서 40%면 Δ%p = 20%p"
        },
        "Lift": {
            "정의": "특정 특징의 상대적 강도. 전체 평균 대비 배수.",
            "예시": "Lift = 2.0이면 전체 평균보다 2배 강함"
        },
        "SMD (Standardized Mean Difference)": {
            "정의": "두 그룹 간 평균 차이를 표준화한 효과 크기",
            "해석": "|SMD| < 0.2는 무시 가능, 0.2~0.5는 작음, 0.5~0.8은 중간, 0.8 이상은 큼"
        }
    }
    
    for category, items in glossary.items():
        with st.expander(category):
            for key, value in items.items():
                st.markdown(f"**{key}**: {value}")
```

---

## 13. 성능 최적화 & 캐싱

### 13.1 데이터 캐싱

```python
# Streamlit의 @st.cache_data 활용
@st.cache_data(ttl=3600)  # 1시간 캐싱
def load_large_dataset():
    return pd.read_parquet('data/panels.parquet')

@st.cache_data
def compute_expensive_metric(df: pd.DataFrame):
    # 비용이 큰 계산
    return df.groupby('cluster').agg({...})
```

### 13.2 대용량 데이터 처리

```python
# Lazy loading: 필요한 컬럼만 로드
@st.cache_data
def load_panels_minimal():
    return pd.read_csv(
        'data/panels.csv',
        usecols=['id', 'cluster', 'gender', 'age', 'tags']
    )

# 청크 처리
def process_large_file_in_chunks(file_path: str, chunk_size: int = 10000):
    for chunk in pd.read_csv(file_path, chunksize=chunk_size):
        yield chunk
```

---

## 14. 배포

### 14.1 Streamlit Cloud 배포

1. GitHub 리포지토리에 코드 업로드
2. https://share.streamlit.io 에서 배포
3. `requirements.txt` 자동 설치
4. 환경 변수는 Streamlit Cloud 설정에서 관리

### 14.2 로컬 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 앱 실행
streamlit run main.py
```

---

## 15. 요약

이 문서는 Panel Insight React 앱의 **모든 기능을 Streamlit으로 구현하기 위한 완전한 기술 명세**입니다.

**주요 포인트**:

1. **데이터 스키마**: CSV/JSON 기반, 명확한 타입 정의
2. **상태 관리**: `st.session_state`로 전역 상태 관리
3. **페이지 구조**: 탭 기반 네비게이션
4. **검색 & 필터링**: 자연어 파싱 + 구조화된 필터
5. **군집 분석**: UMAP 시각화 + 프로필 + 품질 지표
6. **비교 분석**: Δ%p, Lift, SMD 계산 및 시각화
7. **내보내기**: CSV/Excel/JSON 다운로드
8. **히스토리**: 최근 본 패널 50개 유지

**디자인 요소 제외**: 모든 비주얼/애니메이션/스타일링은 Streamlit 기본 테마 사용

**구현 가능 여부**: ✅ 100% 구현 가능

---

**다음 단계**: 실제 Python 코드 작성 또는 Mock 데이터 생성
