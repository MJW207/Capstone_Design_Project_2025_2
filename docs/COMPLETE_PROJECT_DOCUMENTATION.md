# Panel Insight 프로젝트 완전 정리 문서

> 발표 및 질의응답을 위한 상세 가이드

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [검색 프로세스 상세 분석](#2-검색-프로세스-상세-분석)
3. [AI 인사이트 시스템](#3-ai-인사이트-시스템)
4. [백엔드-프론트엔드 연동](#4-백엔드-프론트엔드-연동)
5. [데이터 흐름 및 아키텍처](#5-데이터-흐름-및-아키텍처)
6. [클러스터링 시스템](#6-클러스터링-시스템)
7. [주요 기능 상세 설명](#7-주요-기능-상세-설명)
8. [기술 스택 및 도구](#8-기술-스택-및-도구)

---

## 1. 프로젝트 개요

### 1.1 무엇을 하는 프로젝트인가?

**Panel Insight**는 한국 소비자 패널 데이터를 분석하는 종합 플랫폼입니다. 사용자가 자연어로 "서울 거주 20대 여성"이라고 검색하면, AI가 이를 이해하고 관련된 패널들을 찾아서 보여줍니다.

### 1.2 핵심 가치

1. **의미 기반 검색**: 단순 키워드가 아닌 의미를 이해하는 검색
2. **AI 기반 분석**: LLM을 활용한 자동 인사이트 생성
3. **시각화**: 복잡한 데이터를 직관적으로 이해할 수 있는 차트와 그래프
4. **클러스터링**: 유사한 패널들을 자동으로 그룹화

### 1.3 사용자 여정

```
사용자 검색 입력
    ↓
AI가 의미 파악 (메타데이터 추출)
    ↓
Pinecone 벡터 검색
    ↓
결과 필터링 및 정렬
    ↓
패널 상세 정보 표시
    ↓
AI 인사이트 생성
    ↓
클러스터 분석 및 비교
```

---

## 2. 검색 프로세스 상세 분석

### 2.1 전체 검색 파이프라인 개요

검색은 **5단계 파이프라인**으로 구성되어 있습니다. 각 단계가 순차적으로 실행되며, 이전 단계의 결과를 다음 단계에서 사용합니다.

```
[사용자 입력] "서울 거주 20대 여성"
    ↓
[1단계] 메타데이터 추출 (LLM)
    ↓
[2단계] 카테고리 분류 (LLM)
    ↓
[2.5단계] 메타데이터 필터 추출
    ↓
[3단계] 자연어 텍스트 생성 (LLM)
    ↓
[4단계] 임베딩 생성 (OpenAI)
    ↓
[5단계] Pinecone 벡터 검색 + 필터링
    ↓
[결과] 패널 ID 리스트 반환
```

### 2.2 1단계: 메타데이터 추출

**목적**: 자연어 쿼리에서 구조화된 정보를 추출합니다.

**어떻게 작동하나?**

1. **입력**: 사용자가 "서울 거주 20대 여성"이라고 입력
2. **처리**: Anthropic Claude API에 프롬프트를 보냅니다
   - 프롬프트에는 추출 규칙이 상세히 정의되어 있습니다
   - 예: "나이", "성별", "지역", "소득", "직업" 등을 추출
3. **출력**: JSON 형태로 구조화된 데이터
   ```json
   {
     "나이": "20대",
     "성별": "여자",
     "지역": "서울"
   }
   ```

**코드 위치**: `server/app/services/metadata_extractor.py`

**사용 모델**: `claude-sonnet-4-5-20250929`

**왜 LLM을 사용하나?**
- 자연어의 다양한 표현을 이해할 수 있습니다
- "20대 초반", "20살", "20세" 모두 같은 의미로 인식
- 맥락을 이해하여 모호한 표현도 해석 가능

**예시 변환**:
- "서울 거주 20대 여성" → `{지역: "서울", 나이: "20대", 성별: "여자"}`
- "고소득 기혼 남성" → `{소득: "고소득", 결혼여부: "기혼", 성별: "남자"}`
- "프리미엄 차량 보유자" → `{자동차: "프리미엄"}`

### 2.3 2단계: 카테고리 분류

**목적**: 추출된 메타데이터를 사전 정의된 카테고리로 분류합니다.

**카테고리란?**
Pinecone에 저장된 데이터는 "topic"이라는 필드로 구분됩니다. 예를 들어:
- `인구`: 나이, 성별, 지역 등 기본 인구통계 정보
- `직업소득`: 직업, 소득, 학력 등
- `자동차`: 차량 보유 여부, 브랜드 등
- `IT기기`: 스마트폰, 전자제품 등

**어떻게 작동하나?**

1. **입력**: 1단계에서 추출한 메타데이터
2. **처리**: LLM이 각 메타데이터 항목을 적절한 카테고리로 분류
3. **출력**: 카테고리별로 그룹화된 메타데이터
   ```json
   {
     "인구": ["나이: 20대", "성별: 여자", "지역: 서울"],
     "직업소득": ["소득: 고소득"]
   }
   ```

**코드 위치**: `server/app/services/category_classifier.py`

**왜 카테고리로 나누나?**
- Pinecone에서 카테고리별로 검색하면 더 정확한 결과를 얻을 수 있습니다
- 각 카테고리는 서로 다른 "topic"으로 저장되어 있어, topic별 검색이 효율적입니다

### 2.4 2.5단계: 메타데이터 필터 추출

**목적**: Pinecone 검색 시 사용할 필터 조건을 준비합니다.

**필터란?**
Pinecone은 메타데이터 기반 필터링을 지원합니다. 예를 들어:
- `지역: ["서울", "경기"]` → 서울 또는 경기에 거주하는 패널만 검색
- `나이: {"$gte": 20, "$lte": 29}` → 20세 이상 29세 이하

**어떻게 작동하나?**

1. **입력**: 카테고리별로 분류된 메타데이터
2. **처리**: `MetadataFilterExtractor`가 각 카테고리별 필터 조건 생성
3. **출력**: Pinecone 필터 형식으로 변환
   ```python
   {
     "인구": {
       "지역": {"$in": ["서울"]},
       "성별": {"$in": ["여자"]}
     }
   }
   ```

**코드 위치**: `server/app/services/metadata_filter_extractor.py`

**특징**:
- 복수 값 지원: "서울 또는 경기" → `{"$in": ["서울", "경기"]}`
- 범위 지원: "20대" → `{"$gte": 20, "$lte": 29}`

### 2.5 3단계: 자연어 텍스트 생성

**목적**: 메타데이터를 Pinecone에 저장된 형식과 유사한 자연어 텍스트로 변환합니다.

**왜 텍스트로 변환하나?**
Pinecone에 저장된 벡터는 원본 텍스트를 임베딩한 것입니다. 예를 들어:
- 저장된 텍스트: "20대 여성, 서울 거주, 고소득"
- 검색 텍스트: "20대 여성, 서울 거주" (유사한 형식으로 생성)

**어떻게 작동하나?**

1. **입력**: 카테고리별 메타데이터
2. **처리**: LLM이 Pinecone 저장 형식을 참고하여 자연어 텍스트 생성
3. **출력**: 카테고리별 텍스트
   ```
   인구: "20대 여성, 서울 거주"
   직업소득: "고소득"
   ```

**코드 위치**: `server/app/services/text_generator.py`

**최적화**:
- 템플릿 기반 생성: 자주 사용되는 패턴은 템플릿으로 처리 (빠름)
- LLM 기반 생성: 복잡한 경우에만 LLM 사용

### 2.6 4단계: 임베딩 생성

**목적**: 자연어 텍스트를 벡터(숫자 배열)로 변환합니다.

**임베딩이란?**
의미가 비슷한 텍스트는 벡터 공간에서 가까운 위치에 있습니다.
- "20대 여성"과 "20살 여자"는 비슷한 벡터
- "서울 거주"와 "경기 거주"는 어느 정도 가까운 벡터

**어떻게 작동하나?**

1. **입력**: 카테고리별 자연어 텍스트
2. **처리**: OpenAI Embeddings API 호출
   - 모델: `text-embedding-3-small`
   - 차원: 1536차원 벡터
3. **출력**: 카테고리별 벡터
   ```python
   {
     "인구": [0.123, -0.456, 0.789, ...],  # 1536개 숫자
     "직업소득": [0.234, -0.567, 0.890, ...]
   }
   ```

**코드 위치**: `server/app/services/embedding_generator.py`

**특징**:
- 병렬 처리: 여러 카테고리를 동시에 임베딩 생성 (빠름)
- 캐싱: 동일한 텍스트는 재사용 (비용 절감)

### 2.7 5단계: Pinecone 벡터 검색 + 필터링

**목적**: 벡터 유사도 검색과 메타데이터 필터를 결합하여 최종 결과를 찾습니다.

**Pinecone이란?**
- 클라우드 기반 벡터 데이터베이스
- 수백만 개의 벡터를 빠르게 검색 가능
- 메타데이터 필터링 지원

**어떻게 작동하나?**

1. **단계적 필터링**: 카테고리 순서대로 검색
   - 첫 번째 카테고리로 초기 검색 (예: "인구")
   - 두 번째 카테고리로 결과를 좁힘 (예: "직업소득")
   - 최종 결과 도출

2. **검색 과정**:
   ```python
   # 1. 첫 번째 카테고리 검색
   results = pinecone.query(
     vector=인구_임베딩,
     top_k=10000,  # 충분히 많이 가져옴
     filter={"지역": {"$in": ["서울"]}, "성별": {"$in": ["여자"]}},
     include_metadata=True
   )
   
   # 2. 두 번째 카테고리로 필터링
   filtered = filter_by_second_category(results, 직업소득_임베딩)
   
   # 3. 최종 결과 반환
   return filtered[:top_k]
   ```

3. **점수 계산**:
   - 유사도 점수: 벡터 간 거리 (0~1, 높을수록 유사)
   - 필터 매칭 점수: 메타데이터 일치 여부
   - 최종 점수 = 유사도 점수 × 필터 매칭 점수

**코드 위치**: 
- `server/app/services/pinecone_searcher.py` (검색)
- `server/app/services/pinecone_result_filter.py` (필터링)

**최적화**:
- Fallback 메커니즘: 필터가 너무 강하면 필터 없이 재검색
- 병렬 처리: 여러 카테고리를 동시에 검색

### 2.8 검색 결과 후처리

**패널 상세 정보 조회**:
1. Pinecone에서 반환된 `mb_sn` (패널 ID) 리스트
2. NeonDB에서 실제 패널 데이터 조회
   - `RawData.panel_embeddings_v` 뷰 우선 조회
   - 없으면 `welcome_1st`, `welcome_2nd`, `quick_answer` 직접 조인
3. 패널 상세 정보 반환

**코드 위치**: `server/app/db/dao_panels.py`

---

## 3. AI 인사이트 시스템

### 3.1 AI 인사이트란?

사용자가 검색한 패널들에 대한 자동 분석 결과입니다. 예를 들어:
- "서울 거주 20대 여성" 검색 → "이 그룹은 프리미엄 제품 선호도가 높고, 디지털 친화적입니다"

### 3.2 인사이트 생성 프로세스

```
[검색 결과 패널들]
    ↓
[패널 데이터 수집]
    ↓
[LLM 분석 프롬프트 생성]
    ↓
[Anthropic Claude API 호출]
    ↓
[인사이트 텍스트 생성]
    ↓
[사용자에게 표시]
```

### 3.3 패널 AI 요약

**목적**: 개별 패널에 대한 요약 정보를 생성합니다.

**어떻게 작동하나?**

1. **입력**: 패널 ID (`mb_sn`)
2. **데이터 수집**: 
   - 패널 기본 정보 (나이, 성별, 지역 등)
   - QuickPoll 응답 (스트레스, AI 사용 등)
   - 보유 제품 정보
3. **LLM 호출**: Anthropic Claude에게 분석 요청
   ```python
   prompt = f"""
   다음 패널 정보를 분석하여 요약해주세요:
   - 나이: 25세
   - 성별: 여성
   - 지역: 서울
   - 스트레스 원인: 업무
   - AI 챗봇 사용: 예
   ...
   """
   ```
4. **출력**: 자연어 요약
   ```
   "25세 서울 거주 여성으로, 업무 스트레스를 경험하며 
   AI 챗봇을 활용하는 디지털 친화적 라이프스타일을 보입니다."
   ```

**코드 위치**: `server/app/api/panels.py` → `get_panel_ai_summary()`

**사용 모델**: `claude-sonnet-4-5-20250929`

**최적화**:
- 캐싱: 한 번 생성한 요약은 저장하여 재사용
- 지연 로딩: 패널 상세 정보를 열 때만 생성 (비용 절감)

### 3.4 라이프스타일 분류

**목적**: 패널의 라이프스타일을 8가지 유형으로 분류합니다.

**8가지 라이프스타일**:
1. 실용·효율 중심 도시형
2. 디지털·AI 친화형
3. 건강·체력관리형
4. 프리미엄·고급 선호형
5. 환경·지속가능성형
6. 가족·관계 중심형
7. 여가·경험 중심형
8. 기타

**어떻게 작동하나?**

1. **입력**: 패널의 다양한 정보 (QuickPoll 응답, 보유 제품 등)
2. **처리**: LLM이 각 라이프스타일 정의와 비교하여 분류
3. **출력**: 해당하는 라이프스타일 리스트 + 근거

**코드 위치**: `server/app/services/lifestyle_classifier.py`

**사용 모델**: `claude-opus-4-1-20250805`

---

## 4. 백엔드-프론트엔드 연동

### 4.1 전체 아키텍처

```
┌─────────────────┐
│   프론트엔드     │  React + TypeScript
│   (포트 5173)    │  Vite 개발 서버
└────────┬────────┘
         │ HTTP 요청 (fetch)
         │
         ▼
┌─────────────────┐
│   백엔드         │  FastAPI + Python
│   (포트 8004)    │  Uvicorn 서버
└────────┬────────┘
         │
         ├──► Pinecone (벡터 검색)
         ├──► NeonDB (PostgreSQL, 패널 데이터)
         ├──► Anthropic API (LLM)
         └──► OpenAI API (임베딩)
```

### 4.2 API 통신 방식

#### 4.2.1 프론트엔드에서 백엔드로 요청

**기본 설정**:
```typescript
// src/lib/config.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8004';
export const API_URL = `${API_BASE_URL}`;
```

**API 유틸리티 (상세 버전)**:
```typescript
// src/lib/utils.ts

// 1. GET 요청 (간단한 버전)
export const api = {
  get: async (url: string) => {
    try {
      const response = await fetch(`${API_URL}${url}`)
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }
      return response.json()
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error(`백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요. (${API_URL})`)
      }
      throw err
    }
  },
  
  // 2. POST 요청 (타임아웃 및 에러 처리 포함)
  post: async (url: string, data: any) => {
    const fullUrl = `${API_URL}${url}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // AbortController로 타임아웃 설정 (300초)
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    timeoutId = setTimeout(() => {
      controller.abort(); // 300초 후 요청 취소
    }, 300000);
    
    try {
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,  // 타임아웃 제어
        credentials: 'omit' as RequestCredentials,
        cache: 'no-cache' as RequestCache,
        mode: 'cors' as RequestMode
      };
      
      // Fetch 실행
      const response = await fetch(fullUrl, requestOptions);
      
      if (timeoutId) clearTimeout(timeoutId);
      
      // HTTP 에러 체크
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (textError) {
          // 에러 응답 본문 읽기 실패
        }
        
        // JSON 에러 응답 파싱 시도
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.detail || `HTTP error! status: ${response.status}`)
        } catch (parseError) {
          throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 200)}`)
        }
      }
      
      // 응답 본문 읽기
      const textData = await response.text();
      if (!textData || textData.trim() === '') {
        throw new Error('서버에서 빈 응답을 받았습니다.');
      }
      
      const jsonData = JSON.parse(textData);
      return jsonData;
      
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // 네트워크 에러 처리
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error(`백엔드 서버에 연결할 수 없습니다.\n\n요청 ID: ${requestId}\nURL: ${API_URL}\n전체 URL: ${fullUrl}`)
      }
      
      throw err
    }
  }
};
```

**실제 사용 예시 1: 검색 API 호출**:
```typescript
// src/lib/utils.ts - searchApi
export const searchApi = {
  searchPanels: async (query: string, filters?: any, page: number = 1, limit?: number) => {
    const payload: any = { 
      query: query || '', 
      filters: filters || {}, 
      page 
    };
    
    // limit이 명시적으로 전달된 경우에만 포함
    if (limit !== undefined) {
      payload.limit = limit;
    }
    
    try {
      const response = await api.post('/api/search', payload);
      return response;
    } catch (error: any) {
      console.error('검색 요청 실패:', error?.message);
      throw error;
    }
  }
};
```

**실제 사용 예시 2: 컴포넌트에서 검색 호출**:
```typescript
// src/components/pages/ResultsPage.tsx

const searchPanels = async (pageNum: number = currentPage, forceRefresh: boolean = false) => {
  // 1. 쿼리 검증
  if (!query || !query.trim()) {
    setPanels([]);
    setTotalResults(0);
    return;
  }
  
  // 2. 필터 객체 준비
  const filtersToSend = {
    selectedGenders: propFilters.selectedGenders || [],
    selectedRegions: propFilters.selectedRegions || [],
    selectedIncomes: propFilters.selectedIncomes || [],
    ageRange: propFilters.ageRange || [],
    quickpollOnly: propFilters.quickpollOnly || false,
  };
  
  setLoading(true);
  setError(null);
  
  try {
    // 3. API 호출
    const allResults = await fetchAllResults(query.trim(), filtersToSend);
    
    // 4. 결과 처리
    const total = allResults.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    
    // 5. 상태 업데이트
    setPanels(allResults);
    setTotalResults(total);
    setCurrentPage(pageNum);
    setTotalPages(pages);
    
  } catch (err: any) {
    // 6. 에러 처리
    let errorMsg = err?.message || '알 수 없는 오류';
    
    if (errorMsg.includes('Failed to fetch')) {
      errorMsg = `백엔드 서버에 연결할 수 없습니다 (네트워크/Fetch 오류)`;
    }
    
    setError(errorMsg);
    setPanels([]);
    setTotalResults(0);
  } finally {
    setLoading(false);
  }
};

// fetchAllResults 내부 구현
const fetchAllResults = async (query: string, filters: any) => {
  // searchApi를 통해 백엔드 호출
  const response = await searchApi.searchPanels(query, filters, 1);
  
  // 응답 구조: { panels: [...], total: 100 }
  return response.panels || [];
};
```

**실제 사용 예시 3: 패널 상세 정보 조회**:
```typescript
// src/lib/utils.ts - searchApi
getPanel: (id: string) =>
  api.get(`/api/panels/${id}`),

// 컴포넌트에서 사용
const fetchPanelDetail = async (panelId: string) => {
  try {
    const panel = await searchApi.getPanel(panelId);
    // panel 구조:
    // {
    //   mb_sn: "w123456",
    //   gender: "여자",
    //   age: 25,
    //   region: "서울",
    //   welcome1_info: {...},
    //   welcome2_info: {...},
    //   quickpoll_info: {...}
    // }
    return panel;
  } catch (error) {
    console.error('패널 조회 실패:', error);
    throw error;
  }
};
```

#### 4.2.2 백엔드 API 엔드포인트

**검색 API (상세 버전)**:
```python
# server/app/api/search.py

@router.post("/api/search")
async def api_search_post(payload: Dict[str, Any]):
    """
    패널 검색 API - Pinecone 검색 사용, 필터 지원
    
    요청 형식:
    {
        "query": "서울 거주 20대 여성",
        "filters": {
            "selectedGenders": ["여자"],
            "selectedRegions": ["서울"],
            "ageRange": [20, 29]
        },
        "page": 1,
        "limit": 20  # 선택적
    }
    
    응답 형식:
    {
        "panels": [
            {
                "mb_sn": "w123456",
                "gender": "여자",
                "age": 25,
                "region": "서울",
                ...
            },
            ...
        ],
        "total": 150,
        "page": 1
    }
    """
    import time
    start_time = time.time()
    
    query_text = payload.get("query", "").strip()
    filters_dict = payload.get("filters", {})
    page = payload.get("page", 1)
    limit = payload.get("limit")
    
    try:
        # 1. Pinecone 검색 실행
        search_result = await _search_with_pinecone(
            query_text=query_text,
            top_k=10000,  # 충분히 많이 가져옴
            use_cache=True,
            filters_dict=filters_dict
        )
        
        if not search_result:
            return {
                "panels": [],
                "total": 0,
                "page": page
            }
        
        # 2. mb_sn 리스트 추출
        mb_sn_list = search_result.get("mb_sns", []) if isinstance(search_result, dict) else search_result
        
        # 3. 패널 상세 정보 조회 (NeonDB)
        from app.api.pinecone_panel_details import get_panel_details_from_mb_sns
        panels = await get_panel_details_from_mb_sns(mb_sn_list)
        
        # 4. 페이지네이션 적용
        total = len(panels)
        if limit:
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            panels = panels[start_idx:end_idx]
        
        # 5. 결과 반환
        elapsed_time = time.time() - start_time
        logger.info(f"[검색 완료] 쿼리: '{query_text}', 결과: {total}개, 소요시간: {elapsed_time:.2f}초")
        
        return {
            "panels": panels,
            "total": total,
            "page": page
        }
        
    except Exception as e:
        logger.error(f"[검색 오류] 쿼리: '{query_text}', 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"검색 실패: {str(e)}")
```

**패널 상세 API (상세 버전)**:
```python
# server/app/api/panels.py

@router.get("/api/panels/{panel_id}")
async def get_panel(panel_id: str):
    """
    패널 상세 정보 조회
    
    요청: GET /api/panels/w123456
    
    응답:
    {
        "mb_sn": "w123456",
        "gender": "여자",
        "age": 25,
        "region": "서울",
        "detail_location": "강남구",
        "welcome1_info": {
            "gender": "여자",
            "age": 25,
            "region": "서울",
            "marriage": "미혼",
            "education": "대학교 졸업"
        },
        "welcome2_info": {
            "job": "사무직",
            "personal_income": "300만원 이상"
        },
        "quickpoll_info": {
            "스트레스_원인": "업무",
            "AI_챗봇_사용": "예"
        },
        "coverage": "qw"  # "qw" 또는 "w"
    }
    """
    logger.info(f"[Panel API] 패널 상세 조회 시작: {panel_id}")
    
    try:
        # 1. NeonDB merged.panel_data 테이블에서 기본 데이터 조회
        from app.utils.merged_data_loader import get_panel_from_merged_db
        merged_data = await get_panel_from_merged_db(panel_id)
        
        if not merged_data:
            raise HTTPException(status_code=404, detail=f"Panel not found: {panel_id}")
        
        # 2. 데이터 구조화
        welcome1_info = {
            "gender": merged_data.get("gender", ""),
            "age": merged_data.get("age", 0),
            "region": merged_data.get("location", ""),
            "marriage": merged_data.get("결혼여부", ""),
            "education": merged_data.get("최종학력", ""),
        }
        
        welcome2_info = {
            "job": merged_data.get("직업", ""),
            "personal_income": merged_data.get("월평균 개인소득", ""),
        }
        
        # 3. QuickPoll 정보 추출
        quick_answers = merged_data.get("quick_answers", {})
        quickpoll_info = {}
        if isinstance(quick_answers, dict):
            quickpoll_info = {
                "스트레스_원인": quick_answers.get("스트레스_원인", ""),
                "AI_챗봇_사용": quick_answers.get("AI_챗봇_사용", ""),
                # ... 기타 QuickPoll 필드
            }
        
        # 4. 결과 반환
        return {
            "mb_sn": panel_id,
            "gender": merged_data.get("gender", ""),
            "age": merged_data.get("age", 0),
            "region": merged_data.get("location", ""),
            "welcome1_info": welcome1_info,
            "welcome2_info": welcome2_info,
            "quickpoll_info": quickpoll_info,
            "coverage": "qw"  # Pinecone에서 가져옴
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Panel API] 패널 조회 실패: {panel_id}, 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"패널 조회 실패: {str(e)}")
```

**패널 배치 조회 API**:
```python
# server/app/api/panels.py

@router.post("/api/panels/batch")
async def get_panels_batch(request: BatchPanelRequest):
    """
    여러 패널의 상세 정보를 한 번에 조회 (내보내기 기능 최적화)
    
    요청:
    {
        "panel_ids": ["w123456", "w789012", "w345678"]
    }
    
    응답:
    {
        "panels": [
            { "mb_sn": "w123456", ... },
            { "mb_sn": "w789012", ... },
            { "mb_sn": "w345678", ... }
        ],
        "total": 3
    }
    """
    try:
        panels = []
        for panel_id in request.panel_ids:
            try:
                panel = await get_panel(panel_id)  # 위의 get_panel 함수 재사용
                panels.append(panel)
            except HTTPException:
                # 개별 패널 조회 실패 시 건너뛰기
                continue
        
        return {
            "panels": panels,
            "total": len(panels)
        }
    except Exception as e:
        logger.error(f"[Batch Panel API] 배치 조회 실패: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"배치 조회 실패: {str(e)}")
```

### 4.3 CORS 설정

**백엔드 CORS 설정**:
```python
# server/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 origin 허용
    allow_credentials=True,  # credentials 허용
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["*"],  # 모든 헤더 허용
)
```

**왜 필요한가?**
- 브라우저는 보안상 다른 도메인으로의 요청을 차단합니다 (Same-Origin Policy)
- 프론트엔드(`http://localhost:5173`)와 백엔드(`http://127.0.0.1:8004`)는 다른 포트이므로 다른 origin입니다
- CORS를 설정하면 프론트엔드에서 백엔드로 요청할 수 있습니다

**프로덕션 환경에서는**:
```python
# 프로덕션에서는 특정 origin만 허용
allow_origins=["https://yourdomain.com"]
```

### 4.4 에러 처리

**프론트엔드 에러 처리**:
```typescript
try {
  const response = await api.post('/api/search', data);
  return response;
} catch (err: any) {
  // 네트워크 에러
  if (err.message === 'Failed to fetch') {
    throw new Error('백엔드 서버에 연결할 수 없습니다');
  }
  // HTTP 에러
  if (err.message?.includes('HTTP error')) {
    throw new Error(`서버 오류: ${err.message}`);
  }
  throw err;
}
```

**백엔드 에러 처리**:
```python
try:
    result = pipeline.search(query)
    return result
except Exception as e:
    logger.error(f"검색 실패: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

### 4.5 타임아웃 설정

**프론트엔드 타임아웃**:
```typescript
// src/lib/utils.ts - api.post()

const controller = new AbortController();
let timeoutId: NodeJS.Timeout | null = null;

// 300초(5분) 후 요청 취소
timeoutId = setTimeout(() => {
  console.error(`[DEBUG] ⏱️ 요청 타임아웃 (300초)`);
  controller.abort();
}, 300000);

try {
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: controller.signal,  // 타임아웃 제어
    ...
  });
  
  if (timeoutId) clearTimeout(timeoutId);  // 성공 시 타임아웃 취소
  
} catch (err: any) {
  if (timeoutId) clearTimeout(timeoutId);
  
  // AbortError 체크 (타임아웃으로 인한 취소)
  if (err?.name === 'AbortError') {
    throw new Error('요청이 타임아웃되었거나 중단되었습니다. 서버가 응답하는 데 너무 오래 걸립니다.');
  }
  
  throw err;
}
```

**백엔드 타임아웃**:
```python
# server/app/api/search.py

async def _search_with_pinecone(...):
    try:
        loop = asyncio.get_event_loop()
        
        # 240초 타임아웃 설정
        search_result = await asyncio.wait_for(
            loop.run_in_executor(
                None, 
                lambda: pipeline.search(query_text, top_k=top_k)
            ),
            timeout=240.0  # 240초 타임아웃
        )
        
    except asyncio.TimeoutError:
        logger.error(f"[Pinecone 검색] pipeline.search 타임아웃 (240초 초과)")
        raise Exception(f"검색이 타임아웃되었습니다 (240초 초과).")
```

**왜 300초(프론트) / 240초(백엔드)인가?**
- **LLM 호출**: 메타데이터 추출, 카테고리 분류, 텍스트 생성 (약 3-5초 × 3단계 = 9-15초)
- **OpenAI 임베딩**: 여러 카테고리 동시 처리 (약 1-2초)
- **Pinecone 검색**: 벡터 검색 + 필터링 (약 1-2초)
- **데이터베이스 조회**: 패널 상세 정보 조회 (약 0.5-1초)
- **총 예상 시간**: 약 10-20초 (최악의 경우 30-60초)
- **여유 시간**: 네트워크 지연, 서버 부하 등을 고려하여 240-300초로 설정

---

## 5. 데이터 흐름 및 아키텍처

### 5.1 전체 데이터 흐름

```
[사용자 입력]
    ↓
[프론트엔드] ResultsPage.tsx
    ↓ fetch('/api/search')
[백엔드] search.py
    ↓
[검색 파이프라인] pinecone_pipeline.py
    ├─► 메타데이터 추출 (metadata_extractor.py)
    ├─► 카테고리 분류 (category_classifier.py)
    ├─► 텍스트 생성 (text_generator.py)
    ├─► 임베딩 생성 (embedding_generator.py)
    └─► Pinecone 검색 (pinecone_searcher.py)
    ↓
[결과 필터링] pinecone_result_filter.py
    ↓
[패널 데이터 조회] dao_panels.py
    ↓ NeonDB 조회
[결과 반환] JSON
    ↓
[프론트엔드] 결과 표시
```

### 5.2 데이터베이스 구조

#### 5.2.1 Pinecone (벡터 검색)

**구조**:
- **인덱스**: 단일 인덱스에 모든 패널 저장
- **벡터**: 1536차원 임베딩 벡터
- **메타데이터**: 패널 정보 (나이, 성별, 지역 등)
- **ID**: 패널 ID (`mb_sn`)

**저장 형식**:
```python
{
  "id": "mb_sn_12345",
  "values": [0.123, -0.456, ...],  # 1536개 숫자
  "metadata": {
    "topic": "인구",
    "나이": "20대",
    "성별": "여자",
    "지역": "서울"
  }
}
```

#### 5.2.2 NeonDB (PostgreSQL)

**스키마 구조**:

1. **RawData 스키마** (원본 데이터):
   - `welcome_1st`: 기본 인구통계 정보
   - `welcome_2nd`: 상세 설문 응답 (JSONB)
   - `quick_answer`: QuickPoll 응답 (JSONB)
   - `panel_embeddings_v`: 임베딩 뷰 (bridge view)

2. **merged 스키마** (전처리된 데이터):
   - `panel_data`: 패널 기본 정보 + 프로필 (JSONB)
   - `clustering_sessions`: 클러스터링 세션 정보
   - `panel_cluster_mappings`: 패널-클러스터 매핑
   - `umap_coordinates`: UMAP 2D 좌표

**데이터 조회 예시**:
```python
# 패널 상세 정보 조회
async def get_panel_detail(session, panel_id):
    # 1. panel_embeddings_v 뷰에서 조회 시도
    result = await session.execute(
        f"SELECT * FROM RawData.panel_embeddings_v WHERE mb_sn = :id",
        {"id": panel_id}
    )
    
    # 2. 없으면 직접 조인
    if not result:
        result = await session.execute("""
            SELECT w1.*, w2.data, qa.answers
            FROM RawData.welcome_1st w1
            LEFT JOIN RawData.welcome_2nd w2 ON w1.mb_sn = w2.mb_sn
            LEFT JOIN RawData.quick_answer qa ON w1.mb_sn = qa.mb_sn
            WHERE w1.mb_sn = :id
        """, {"id": panel_id})
    
    return result
```

### 5.3 상태 관리

**프론트엔드 상태 관리**:
- **React Hooks**: `useState`, `useEffect` 사용
- **로컬 스토리지**: 검색 히스토리, 북마크 저장
- **컨텍스트**: 다크 모드, 테마 관리

**백엔드 상태 관리**:
- **세션**: 데이터베이스 연결 세션
- **캐싱**: 검색 결과, 임베딩 캐시

---

## 6. 클러스터링 시스템

### 6.1 클러스터링 개요

**목적**: 유사한 패널들을 자동으로 그룹화하여 패턴을 발견합니다.

**방식**: 사전 클러스터링 (Precomputed)
- 전체 패널 데이터를 미리 클러스터링
- 검색 결과 패널들이 어떤 클러스터에 속하는지 확인
- UMAP으로 2D 시각화

### 6.2 클러스터링 프로세스

```
[전체 패널 데이터]
    ↓
[데이터 전처리]
    ├─► 생애주기 분류 (6단계)
    ├─► 소득 계층 분류 (3단계)
    ├─► 세그먼트 생성 (18개)
    └─► 원-핫 인코딩
    ↓
[피쳐 생성]
    ├─► age_scaled
    ├─► Q6_scaled (소득)
    ├─► education_level_scaled
    ├─► Q8_count_scaled
    ├─► Q8_premium_index
    └─► is_premium_car
    ↓
[HDBSCAN 클러스터링]
    ├─► min_cluster_size: 50
    ├─► min_samples: 50
    └─► metric: euclidean
    ↓
[클러스터 결과]
    ├─► 19개 클러스터
    └─► 노이즈: 0.3%
    ↓
[UMAP 차원 축소]
    ├─► 2D 좌표 생성
    └─► 시각화
```

### 6.3 클러스터 프로필

**생성 과정**:
1. 각 클러스터의 패널 데이터 수집
2. 통계 계산 (평균, 분포 등)
3. LLM으로 인사이트 생성
4. 태그 자동 생성

**저장 위치**: NeonDB `merged.cluster_profiles`

---

## 7. 주요 기능 상세 설명

### 7.1 검색 기능

**검색 입력**:
- 자연어 쿼리: "서울 거주 20대 여성"
- 필터 조합: 나이 슬라이더, 성별 선택, 지역 선택 등

**검색 결과**:
- 패널 리스트 (카드 형태)
- 페이지네이션
- 정렬 옵션

**코드 위치**:
- 프론트엔드: `src/components/pages/ResultsPage.tsx`
- 백엔드: `server/app/api/search.py`

### 7.2 필터 기능

**필터 종류**:
- 나이: 슬라이더 (최소-최대)
- 성별: 남자/여자
- 지역: 시/도 선택
- 소득: 구간 선택
- 기타: 직업, 학력, 차량 등

**필터 적용**:
1. 프론트엔드에서 필터 선택
2. 검색 요청과 함께 전송
3. 백엔드에서 Pinecone 필터로 변환
4. 검색 결과에 적용

**코드 위치**: `src/components/drawers/FilterDrawer.tsx`

### 7.3 패널 상세 정보

**표시 정보**:
- 기본 정보: 나이, 성별, 지역 등
- QuickPoll 응답: 스트레스, AI 사용 등
- 보유 제품: 전자제품, 차량 등
- AI 요약: 자동 생성된 요약

**코드 위치**: `src/components/drawers/PanelDetailDrawer.tsx`

### 7.4 클러스터 분석

**기능**:
- UMAP 2D 시각화
- 클러스터별 프로필
- 클러스터 비교
- 확장 클러스터링 (검색 결과 주변 분석)

**코드 위치**: `src/components/pages/ClusterLabPage.tsx`

### 7.5 비교 분석

**기능**:
- 그룹 간 비교 (클러스터, 세그먼트)
- 다양한 차트: 레이더, 히트맵, 스택바, 인덱스
- 통계 분석: 차이, 리프트, SMD

**코드 위치**: `src/components/pages/ComparePage.tsx`

---

## 8. 기술 스택 및 도구

### 8.1 프론트엔드

- **React 18**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Vite**: 빌드 도구
- **Tailwind CSS**: 스타일링
- **shadcn/ui**: UI 컴포넌트
- **Recharts**: 차트 라이브러리

### 8.2 백엔드

- **FastAPI**: 웹 프레임워크
- **Python 3.11+**: 프로그래밍 언어
- **SQLAlchemy**: ORM
- **Pydantic**: 데이터 검증

### 8.3 외부 서비스

- **Pinecone**: 벡터 검색
- **NeonDB**: PostgreSQL 데이터베이스
- **Anthropic Claude**: LLM (메타데이터 추출, 인사이트)
- **OpenAI**: 임베딩 생성

### 8.4 개발 도구

- **Git**: 버전 관리
- **ESLint**: 코드 품질
- **Black**: Python 코드 포맷팅
- **TypeScript**: 타입 체크

---

## 9. 질의응답 가이드

### Q1: 검색이 느린 이유는?

**A**: 검색은 여러 단계를 거칩니다:
1. LLM 호출 (메타데이터 추출, 카테고리 분류, 텍스트 생성) - 약 3-5초
2. OpenAI 임베딩 생성 - 약 1-2초
3. Pinecone 검색 - 약 1-2초
4. 데이터베이스 조회 - 약 0.5-1초

**총 소요 시간**: 약 5-10초

**최적화 방법**:
- 캐싱: 동일한 쿼리는 캐시에서 반환
- 병렬 처리: 여러 카테고리를 동시에 처리

### Q2: Pinecone과 NeonDB의 차이는?

**A**:
- **Pinecone**: 벡터 검색 전용. 빠른 유사도 검색에 최적화
- **NeonDB**: 관계형 데이터베이스. 패널 상세 정보 저장 및 조회

**사용 시나리오**:
- Pinecone: "어떤 패널들이 비슷한가?" (검색)
- NeonDB: "이 패널의 상세 정보는?" (조회)

### Q3: LLM을 왜 여러 번 호출하나?

**A**: 각 단계마다 다른 목적이 있습니다:
1. **메타데이터 추출**: 자연어 → 구조화된 데이터
2. **카테고리 분류**: 메타데이터 → 카테고리 매핑
3. **텍스트 생성**: 메타데이터 → 자연어 (Pinecone 형식)

각 단계를 분리하면:
- 정확도 향상: 각 단계에 최적화된 프롬프트
- 디버깅 용이: 어느 단계에서 문제가 생겼는지 파악 가능
- 유연성: 단계별로 다른 모델 사용 가능

### Q4: 클러스터링은 실시간인가?

**A**: 아니요, 사전 클러스터링입니다:
- 전체 패널 데이터를 미리 클러스터링
- 결과를 NeonDB에 저장
- 검색 시 저장된 클러스터 정보 사용

**이유**:
- 클러스터링은 시간이 오래 걸림 (수 분)
- 실시간 클러스터링은 사용자 경험 저하
- 사전 클러스터링으로 빠른 응답 가능

### Q5: 에러가 발생하면 어떻게 하나?

**A**: 단계별 에러 처리:
1. **프론트엔드**: 사용자에게 친화적인 에러 메시지 표시
2. **백엔드**: 로그에 상세 에러 기록
3. **Fallback**: 일부 단계 실패 시 대체 방법 사용
   - 예: 메타데이터 추출 실패 → 쿼리 텍스트 직접 임베딩

---

## 10. 발표 시 강조 포인트

### 10.1 기술적 혁신

1. **의미 기반 검색**: 단순 키워드가 아닌 의미 이해
2. **다단계 AI 파이프라인**: LLM을 단계별로 활용하여 정확도 향상
3. **벡터 검색 + 필터링**: Pinecone의 강력한 검색 기능 활용

### 10.2 사용자 경험

1. **자연어 검색**: 복잡한 필터 없이 자연스러운 검색
2. **시각화**: 복잡한 데이터를 직관적으로 이해
3. **AI 인사이트**: 자동으로 패턴 발견 및 설명

### 10.3 확장성

1. **모듈화된 구조**: 각 기능이 독립적으로 동작
2. **캐싱**: 성능 최적화
3. **사전 클러스터링**: 빠른 응답 시간

---

**문서 작성일**: 2025-11-25  
**최종 업데이트**: 2025-11-25  
**작성자**: Capstone Project Team

