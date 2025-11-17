# 검색 시스템 플로우 문서

## 개요

사용자가 입력한 자연어 검색 문장이 어떻게 처리되어 `mb_sn` 목록으로 변환되고 웹페이지에 전달되는지 전체 플로우를 설명합니다.

---

## 전체 플로우 다이어그램

```
[사용자 입력]
    ↓
[Frontend: StartPage/ResultsPage]
    ↓
[API 요청: POST /api/search]
    ↓
[1단계: 임베딩 생성]
    ↓
[2단계: 벡터 검색 (PostgreSQL + pgvector)]
    ↓
[3단계: 필터 적용]
    ↓
[4단계: mb_sn 추출 및 결과 구성]
    ↓
[5단계: JSON 응답 반환]
    ↓
[Frontend: ResultsPage 표시]
```

---

## 상세 플로우

### 1. Frontend: 검색 쿼리 입력

**위치**: `src/components/pages/StartPage.tsx` 또는 `src/components/pages/ResultsPage.tsx`

**처리 과정**:
```typescript
// 사용자가 검색어 입력
const query = "서울 거주 20대 여성"

// 검색 실행
const handleSearch = async (searchQuery: string) => {
  setQuery(searchQuery);
  setView('results');
  
  // API 호출
  const response = await fetch(`${API_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: searchQuery,
      page: 1,
      limit: 20,
      filters: {
        selectedGenders: [],
        selectedRegions: [],
        ageRange: [],
        selectedIncomes: [],
        quickpollOnly: false
      }
    })
  });
  
  const data = await response.json();
  // data.results 배열에 mb_sn이 포함된 패널 정보가 들어있음
  setSearchResults(data.results);
};
```

**요청 페이로드 구조**:
```json
{
  "query": "서울 거주 20대 여성",
  "page": 1,
  "limit": 20,
  "filters": {
    "selectedGenders": ["F"],
    "selectedRegions": ["서울"],
    "ageRange": [20, 29],
    "selectedIncomes": [],
    "quickpollOnly": false
  }
}
```

---

### 2. Backend: API 엔드포인트 수신

**위치**: `server/app/api/search.py`

**함수**: `api_search_post()`

**처리 과정**:
```python
@router.post("/api/search")
async def api_search_post(
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_session)
):
    # 요청 파라미터 추출
    query_text = payload.get("query") or ""
    page = int(payload.get("page", 1))
    limit = int(payload.get("limit", 20))
    filters_dict = payload.get("filters") or {}
    
    # 쿼리가 비어있으면 빈 결과 반환
    if not query_text or not str(query_text).strip():
        return {
            "results": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "pages": 0,
            "mode": "vector",
            "query": query_text
        }
```

---

### 3. 임베딩 생성

**위치**: `server/app/embeddings.py`

**함수**: `embed_text()`

**처리 과정**:
```python
# 1. 텍스트를 임베딩으로 변환
query_text_clean = str(query_text).strip()
query_embedding = embed_text(query_text_clean)

# embed_text() 내부 처리:
# - HuggingFace Sentence-Transformers 모델 사용
# - 모델: intfloat/multilingual-e5-base
# - 차원: 768차원 벡터
# - 프롬프트: "query: {text}" 형식으로 변환
# - 정규화: normalize_embeddings=True (코사인 유사도 최적화)
```

**임베딩 생성 상세**:
```python
def embed_text(text: str) -> List[float]:
    """
    텍스트를 768차원 임베딩 벡터로 변환
    
    Args:
        text: 검색 쿼리 텍스트 (예: "서울 거주 20대 여성")
        
    Returns:
        768차원 float 리스트 (예: [0.123, -0.456, ..., 0.789])
    """
    # E5 모델 권장 프롬프트
    query_text = f"query: {text.strip()}"
    
    # 모델 로드 (캐싱됨)
    model = _hf_model()  # SentenceTransformer(MODEL)
    
    # 임베딩 생성
    vec = model.encode(query_text, normalize_embeddings=True)
    
    # 차원 검증 (768차원)
    return _assert_dim(vec.tolist())
```

**결과 예시**:
```python
query_embedding = [
    0.123456, -0.234567, 0.345678, ...,  # 768개 float 값
]
```

---

### 4. 벡터 검색 (PostgreSQL + pgvector)

**위치**: `server/app/db/dao_embeddings.py`

**함수**: `search_panels_by_embedding()`

**처리 과정**:
```python
# 벡터 검색 실행
vector_rows = await search_panels_by_embedding(
    session, 
    query_embedding,  # 768차원 벡터
    limit=search_limit,  # 최대 200개
    filters=vector_filters  # 성별, 지역 등
)
```

**SQL 쿼리 구조**:
```sql
SELECT 
    mb_sn,                    -- ✅ 패널 고유번호 (최종 목표)
    demographics,             -- 인구통계 정보 (JSONB)
    combined_text,            -- 결합된 텍스트
    labeled_text,              -- 라벨링된 텍스트
    chunks,                    -- 청크 데이터
    chunk_count,               -- 청크 개수
    categories,                -- 카테고리
    all_labels,                -- 모든 라벨
    embedding,                 -- 임베딩 벡터
    1 - (embedding <#> CAST(:query_embedding AS vector)) AS similarity,  -- 유사도
    (embedding <#> CAST(:query_embedding AS vector)) AS distance           -- 거리
FROM "RawData"."panel_embeddings_v"  -- 뷰 또는 테이블
WHERE embedding IS NOT NULL
AND 1 - (embedding <#> CAST(:query_embedding AS vector)) >= 0.9  -- 유사도 0.9 이상만
ORDER BY distance ASC  -- 거리 오름차순 (가장 유사한 것부터)
LIMIT :limit
```

**검색 결과 예시**:
```python
vector_rows = [
    {
        "mb_sn": "P001234",           # ✅ 추출 대상
        "demographics": {"gender": "여성", "age": 25, "region": "서울"},
        "combined_text": "서울 거주, 25세, 여성, 커피 좋아함...",
        "similarity": 0.95,            # 유사도 점수
        "distance": 0.05,
        ...
    },
    {
        "mb_sn": "P005678",           # ✅ 추출 대상
        "demographics": {"gender": "여성", "age": 23, "region": "서울"},
        "combined_text": "서울 거주, 23세, 여성, 영화 관람...",
        "similarity": 0.92,
        "distance": 0.08,
        ...
    },
    ...
]
```

---

### 5. 필터 적용

**위치**: `server/app/api/search.py`

**처리 과정**:
```python
# 필터 구성
vector_filters = {}
if filters_dict.get("selectedGenders"):
    vector_filters["gender"] = filters_dict["selectedGenders"]
if filters_dict.get("selectedRegions"):
    vector_filters["region"] = filters_dict["selectedRegions"]
if filters_dict.get("ageRange"):
    vector_filters["age_min"] = filters_dict["ageRange"][0]
    vector_filters["age_max"] = filters_dict["ageRange"][1]

# 벡터 검색 결과 필터링
filtered_rows = []
for row in vector_rows:
    mb_sn = row.get("mb_sn")
    
    # 나이 필터 체크
    if vector_filters.get("age_min"):
        age = raw_info.get("age_raw", 0)
        if age < vector_filters["age_min"]:
            continue  # 필터링됨
    
    # 소득 필터 체크
    if vector_filters.get("income"):
        # 소득 범위 매칭 로직
        ...
    
    filtered_rows.append(row)  # 필터 통과
```

**필터링 후 결과**:
```python
filtered_rows = [
    {"mb_sn": "P001234", ...},  # 필터 통과
    {"mb_sn": "P005678", ...},  # 필터 통과
    # {"mb_sn": "P009999", ...},  # 필터링됨 (제외)
]
```

---

### 6. 페이지네이션 적용

**위치**: `server/app/api/search.py`

**처리 과정**:
```python
# 페이지네이션 계산
total_count = len(filtered_rows)
start_idx = (page - 1) * limit
end_idx = start_idx + limit
paginated_rows = filtered_rows[start_idx:end_idx]

# 예시:
# page=1, limit=20 → start_idx=0, end_idx=20 → [0:20]
# page=2, limit=20 → start_idx=20, end_idx=40 → [20:40]
```

---

### 7. mb_sn 추출 및 결과 구성

**위치**: `server/app/api/search.py`

**처리 과정**:
```python
# 결과 변환
results = []
for r in detailed_rows:
    # mb_sn 추출 ✅
    mb_sn = r.get("mb_sn")  # 또는 r["mb_sn"]
    
    # 추가 정보 추출
    gender = r.get("gender") or ""
    age = int(r.get("age_raw") or 0)
    region = r.get("location") or ""
    similarity = r.get("similarity") or 0.0
    combined_text = r.get("combined_text") or ""
    
    # 결과 객체 구성
    results.append({
        "id": mb_sn,              # ✅ mb_sn
        "name": mb_sn,            # ✅ mb_sn (표시용)
        "mb_sn": mb_sn,          # ✅ mb_sn (명시적 필드)
        "gender": gender,
        "age": age,
        "region": region,
        "coverage": "qw" if combined_text else "w",
        "similarity": similarity,
        "embedding": None,
        "responses": {"q1": combined_text[:140]},
        "created_at": datetime.now().isoformat()
    })
```

**최종 결과 구조**:
```python
results = [
    {
        "id": "P001234",           # ✅ mb_sn
        "name": "P001234",         # ✅ mb_sn
        "mb_sn": "P001234",        # ✅ mb_sn (클러스터링 매핑용)
        "gender": "여성",
        "age": 25,
        "region": "서울",
        "coverage": "qw",
        "similarity": 0.95,
        "embedding": None,
        "responses": {"q1": "서울 거주, 25세, 여성, 커피 좋아함..."},
        "created_at": "2025-01-15T10:30:00"
    },
    {
        "id": "P005678",           # ✅ mb_sn
        "name": "P005678",         # ✅ mb_sn
        "mb_sn": "P005678",        # ✅ mb_sn
        "gender": "여성",
        "age": 23,
        "region": "서울",
        "coverage": "qw",
        "similarity": 0.92,
        "embedding": None,
        "responses": {"q1": "서울 거주, 23세, 여성, 영화 관람..."},
        "created_at": "2025-01-15T10:30:00"
    },
    ...
]
```

---

### 8. JSON 응답 반환

**위치**: `server/app/api/search.py`

**응답 구조**:
```python
return {
    "query": query_text,           # 원본 검색 쿼리
    "page": page,                 # 현재 페이지
    "page_size": limit,           # 페이지 크기
    "count": len(results),        # 현재 페이지 결과 수
    "total": total,               # 전체 결과 수
    "pages": pages,               # 전체 페이지 수
    "mode": "vector",             # 검색 모드
    "results": results             # ✅ mb_sn이 포함된 결과 배열
}
```

**JSON 응답 예시**:
```json
{
  "query": "서울 거주 20대 여성",
  "page": 1,
  "page_size": 20,
  "count": 15,
  "total": 15,
  "pages": 1,
  "mode": "vector",
  "results": [
    {
      "id": "P001234",
      "name": "P001234",
      "mb_sn": "P001234",
      "gender": "여성",
      "age": 25,
      "region": "서울",
      "coverage": "qw",
      "similarity": 0.95,
      "embedding": null,
      "responses": {
        "q1": "서울 거주, 25세, 여성, 커피 좋아함..."
      },
      "created_at": "2025-01-15T10:30:00"
    },
    {
      "id": "P005678",
      "name": "P005678",
      "mb_sn": "P005678",
      "gender": "여성",
      "age": 23,
      "region": "서울",
      "coverage": "qw",
      "similarity": 0.92,
      "embedding": null,
      "responses": {
        "q1": "서울 거주, 23세, 여성, 영화 관람..."
      },
      "created_at": "2025-01-15T10:30:00"
    }
  ]
}
```

---

### 9. Frontend: 결과 수신 및 표시

**위치**: `src/components/pages/ResultsPage.tsx`

**처리 과정**:
```typescript
// API 응답 수신
const response = await fetch(`${API_URL}/api/search`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: query,
    page: currentPage,
    limit: pageSize,
    filters: filtersToSend
  })
});

const data = await response.json();

// ✅ mb_sn 추출
const mbSnList = data.results.map((result: any) => result.mb_sn);
// 예시: ["P001234", "P005678", ...]

// 검색 결과 저장
setSearchResults(data.results);
setTotalResults(data.total);

// 부모 컴포넌트에 전달
onDataChange(data.results);
```

**결과 표시**:
```typescript
// ResultsPage에서 결과 렌더링
{searchResults.map((result: any) => (
  <PanelCard
    key={result.mb_sn}           // ✅ mb_sn을 key로 사용
    panelId={result.mb_sn}        // ✅ mb_sn 전달
    name={result.name}
    gender={result.gender}
    age={result.age}
    region={result.region}
    similarity={result.similarity}
    onPanelClick={() => onPanelDetailOpen(result.mb_sn)}  // ✅ mb_sn 전달
  />
))}
```

---

## 핵심 데이터 추출 포인트

### 1. 데이터베이스에서 mb_sn 추출

**위치**: `server/app/db/dao_embeddings.py` → `search_panels_by_embedding()`

```python
# SQL 쿼리 결과에서 mb_sn 추출
vector_rows = await search_panels_by_embedding(...)

# 각 row에서 mb_sn 추출
for row in vector_rows:
    mb_sn = row.get("mb_sn")  # ✅ 여기서 추출
```

### 2. API 응답에서 mb_sn 포함

**위치**: `server/app/api/search.py` → `api_search_post()`

```python
results.append({
    "id": r["mb_sn"],        # ✅ mb_sn
    "name": r["mb_sn"],      # ✅ mb_sn
    "mb_sn": r["mb_sn"],     # ✅ mb_sn (명시적 필드)
    ...
})
```

### 3. Frontend에서 mb_sn 사용

**위치**: `src/components/pages/ResultsPage.tsx`

```typescript
// 검색 결과에서 mb_sn 추출
const mbSnList = data.results.map((result: any) => result.mb_sn);

// 또는 개별 접근
result.mb_sn  // ✅ 패널 고유번호
result.id     // ✅ 동일 (mb_sn과 같음)
result.name   // ✅ 동일 (mb_sn과 같음)
```

---

## 데이터 흐름 요약

```
1. 사용자 입력: "서울 거주 20대 여성"
   ↓
2. Frontend → Backend: POST /api/search
   {
     "query": "서울 거주 20대 여성",
     "page": 1,
     "limit": 20,
     "filters": {...}
   }
   ↓
3. Backend: 임베딩 생성
   query_text → embed_text() → [768차원 벡터]
   ↓
4. Backend: 벡터 검색
   query_embedding → search_panels_by_embedding() → vector_rows
   ↓
5. Backend: mb_sn 추출
   vector_rows → [{"mb_sn": "P001234", ...}, {"mb_sn": "P005678", ...}, ...]
   ↓
6. Backend: 결과 구성
   results = [
     {"mb_sn": "P001234", "id": "P001234", "name": "P001234", ...},
     {"mb_sn": "P005678", "id": "P005678", "name": "P005678", ...},
     ...
   ]
   ↓
7. Backend → Frontend: JSON 응답
   {
     "results": [
       {"mb_sn": "P001234", ...},
       {"mb_sn": "P005678", ...},
       ...
     ],
     "total": 15,
     ...
   }
   ↓
8. Frontend: 결과 표시
   searchResults.map(result => result.mb_sn)  // ✅ ["P001234", "P005678", ...]
```

---

## 주요 파일 및 함수

| 단계 | 파일 | 함수/엔드포인트 | 역할 |
|------|------|----------------|------|
| 1. 입력 | `src/components/pages/StartPage.tsx` | `handleSearch()` | 검색 쿼리 입력 및 API 호출 |
| 2. API 수신 | `server/app/api/search.py` | `POST /api/search` | API 엔드포인트 |
| 3. 임베딩 | `server/app/embeddings.py` | `embed_text()` | 텍스트 → 768차원 벡터 |
| 4. 벡터 검색 | `server/app/db/dao_embeddings.py` | `search_panels_by_embedding()` | 벡터 유사도 검색 |
| 5. 필터링 | `server/app/api/search.py` | `api_search_post()` | 필터 적용 |
| 6. mb_sn 추출 | `server/app/api/search.py` | `api_search_post()` | 결과에서 mb_sn 추출 |
| 7. 응답 구성 | `server/app/api/search.py` | `api_search_post()` | JSON 응답 생성 |
| 8. 결과 표시 | `src/components/pages/ResultsPage.tsx` | `searchPanels()` | 결과 렌더링 |

---

## 참고사항

### 1. mb_sn 필드 위치

검색 결과에서 `mb_sn`은 다음 세 곳에 모두 포함됩니다:
- `result.id` → `mb_sn`과 동일
- `result.name` → `mb_sn`과 동일
- `result.mb_sn` → 명시적 필드 (클러스터링 매핑용)

### 2. 유사도 필터링

벡터 검색 시 유사도 0.9 이상인 결과만 반환됩니다:
```sql
WHERE 1 - (embedding <#> CAST(:query_embedding AS vector)) >= 0.9
```

### 3. 페이지네이션

- 기본 페이지 크기: 20개
- 최대 검색 결과: 200개 (limit=200)
- 페이지 계산: `pages = max(1, (total + limit - 1) // limit)`

### 4. 필터 적용 순서

1. 벡터 검색 (유사도 0.9 이상)
2. demographics JSONB 필터 (성별, 지역)
3. RawData JOIN 필터 (나이, 소득, 퀵폴)
4. 페이지네이션

---

## 예시 시나리오

### 시나리오: "서울 거주 20대 여성" 검색

1. **사용자 입력**: "서울 거주 20대 여성"
2. **임베딩 생성**: `[0.123, -0.456, ..., 0.789]` (768차원)
3. **벡터 검색**: 유사도 0.9 이상 패널 50개 발견
4. **필터 적용**: 
   - 성별: 여성만 → 45개
   - 지역: 서울만 → 30개
   - 나이: 20-29세 → 25개
5. **페이지네이션**: 1페이지 → 20개
6. **mb_sn 추출**: `["P001234", "P005678", ..., "P009999"]` (20개)
7. **결과 반환**: JSON 응답에 20개 패널 정보 포함
8. **Frontend 표시**: 20개 패널 카드 렌더링

---

**작성일**: 2025-01-15  
**버전**: 1.0




## 개요

사용자가 입력한 자연어 검색 문장이 어떻게 처리되어 `mb_sn` 목록으로 변환되고 웹페이지에 전달되는지 전체 플로우를 설명합니다.

---

## 전체 플로우 다이어그램

```
[사용자 입력]
    ↓
[Frontend: StartPage/ResultsPage]
    ↓
[API 요청: POST /api/search]
    ↓
[1단계: 임베딩 생성]
    ↓
[2단계: 벡터 검색 (PostgreSQL + pgvector)]
    ↓
[3단계: 필터 적용]
    ↓
[4단계: mb_sn 추출 및 결과 구성]
    ↓
[5단계: JSON 응답 반환]
    ↓
[Frontend: ResultsPage 표시]
```

---

## 상세 플로우

### 1. Frontend: 검색 쿼리 입력

**위치**: `src/components/pages/StartPage.tsx` 또는 `src/components/pages/ResultsPage.tsx`

**처리 과정**:
```typescript
// 사용자가 검색어 입력
const query = "서울 거주 20대 여성"

// 검색 실행
const handleSearch = async (searchQuery: string) => {
  setQuery(searchQuery);
  setView('results');
  
  // API 호출
  const response = await fetch(`${API_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: searchQuery,
      page: 1,
      limit: 20,
      filters: {
        selectedGenders: [],
        selectedRegions: [],
        ageRange: [],
        selectedIncomes: [],
        quickpollOnly: false
      }
    })
  });
  
  const data = await response.json();
  // data.results 배열에 mb_sn이 포함된 패널 정보가 들어있음
  setSearchResults(data.results);
};
```

**요청 페이로드 구조**:
```json
{
  "query": "서울 거주 20대 여성",
  "page": 1,
  "limit": 20,
  "filters": {
    "selectedGenders": ["F"],
    "selectedRegions": ["서울"],
    "ageRange": [20, 29],
    "selectedIncomes": [],
    "quickpollOnly": false
  }
}
```

---

### 2. Backend: API 엔드포인트 수신

**위치**: `server/app/api/search.py`

**함수**: `api_search_post()`

**처리 과정**:
```python
@router.post("/api/search")
async def api_search_post(
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_session)
):
    # 요청 파라미터 추출
    query_text = payload.get("query") or ""
    page = int(payload.get("page", 1))
    limit = int(payload.get("limit", 20))
    filters_dict = payload.get("filters") or {}
    
    # 쿼리가 비어있으면 빈 결과 반환
    if not query_text or not str(query_text).strip():
        return {
            "results": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "pages": 0,
            "mode": "vector",
            "query": query_text
        }
```

---

### 3. 임베딩 생성

**위치**: `server/app/embeddings.py`

**함수**: `embed_text()`

**처리 과정**:
```python
# 1. 텍스트를 임베딩으로 변환
query_text_clean = str(query_text).strip()
query_embedding = embed_text(query_text_clean)

# embed_text() 내부 처리:
# - HuggingFace Sentence-Transformers 모델 사용
# - 모델: intfloat/multilingual-e5-base
# - 차원: 768차원 벡터
# - 프롬프트: "query: {text}" 형식으로 변환
# - 정규화: normalize_embeddings=True (코사인 유사도 최적화)
```

**임베딩 생성 상세**:
```python
def embed_text(text: str) -> List[float]:
    """
    텍스트를 768차원 임베딩 벡터로 변환
    
    Args:
        text: 검색 쿼리 텍스트 (예: "서울 거주 20대 여성")
        
    Returns:
        768차원 float 리스트 (예: [0.123, -0.456, ..., 0.789])
    """
    # E5 모델 권장 프롬프트
    query_text = f"query: {text.strip()}"
    
    # 모델 로드 (캐싱됨)
    model = _hf_model()  # SentenceTransformer(MODEL)
    
    # 임베딩 생성
    vec = model.encode(query_text, normalize_embeddings=True)
    
    # 차원 검증 (768차원)
    return _assert_dim(vec.tolist())
```

**결과 예시**:
```python
query_embedding = [
    0.123456, -0.234567, 0.345678, ...,  # 768개 float 값
]
```

---

### 4. 벡터 검색 (PostgreSQL + pgvector)

**위치**: `server/app/db/dao_embeddings.py`

**함수**: `search_panels_by_embedding()`

**처리 과정**:
```python
# 벡터 검색 실행
vector_rows = await search_panels_by_embedding(
    session, 
    query_embedding,  # 768차원 벡터
    limit=search_limit,  # 최대 200개
    filters=vector_filters  # 성별, 지역 등
)
```

**SQL 쿼리 구조**:
```sql
SELECT 
    mb_sn,                    -- ✅ 패널 고유번호 (최종 목표)
    demographics,             -- 인구통계 정보 (JSONB)
    combined_text,            -- 결합된 텍스트
    labeled_text,              -- 라벨링된 텍스트
    chunks,                    -- 청크 데이터
    chunk_count,               -- 청크 개수
    categories,                -- 카테고리
    all_labels,                -- 모든 라벨
    embedding,                 -- 임베딩 벡터
    1 - (embedding <#> CAST(:query_embedding AS vector)) AS similarity,  -- 유사도
    (embedding <#> CAST(:query_embedding AS vector)) AS distance           -- 거리
FROM "RawData"."panel_embeddings_v"  -- 뷰 또는 테이블
WHERE embedding IS NOT NULL
AND 1 - (embedding <#> CAST(:query_embedding AS vector)) >= 0.9  -- 유사도 0.9 이상만
ORDER BY distance ASC  -- 거리 오름차순 (가장 유사한 것부터)
LIMIT :limit
```

**검색 결과 예시**:
```python
vector_rows = [
    {
        "mb_sn": "P001234",           # ✅ 추출 대상
        "demographics": {"gender": "여성", "age": 25, "region": "서울"},
        "combined_text": "서울 거주, 25세, 여성, 커피 좋아함...",
        "similarity": 0.95,            # 유사도 점수
        "distance": 0.05,
        ...
    },
    {
        "mb_sn": "P005678",           # ✅ 추출 대상
        "demographics": {"gender": "여성", "age": 23, "region": "서울"},
        "combined_text": "서울 거주, 23세, 여성, 영화 관람...",
        "similarity": 0.92,
        "distance": 0.08,
        ...
    },
    ...
]
```

---

### 5. 필터 적용

**위치**: `server/app/api/search.py`

**처리 과정**:
```python
# 필터 구성
vector_filters = {}
if filters_dict.get("selectedGenders"):
    vector_filters["gender"] = filters_dict["selectedGenders"]
if filters_dict.get("selectedRegions"):
    vector_filters["region"] = filters_dict["selectedRegions"]
if filters_dict.get("ageRange"):
    vector_filters["age_min"] = filters_dict["ageRange"][0]
    vector_filters["age_max"] = filters_dict["ageRange"][1]

# 벡터 검색 결과 필터링
filtered_rows = []
for row in vector_rows:
    mb_sn = row.get("mb_sn")
    
    # 나이 필터 체크
    if vector_filters.get("age_min"):
        age = raw_info.get("age_raw", 0)
        if age < vector_filters["age_min"]:
            continue  # 필터링됨
    
    # 소득 필터 체크
    if vector_filters.get("income"):
        # 소득 범위 매칭 로직
        ...
    
    filtered_rows.append(row)  # 필터 통과
```

**필터링 후 결과**:
```python
filtered_rows = [
    {"mb_sn": "P001234", ...},  # 필터 통과
    {"mb_sn": "P005678", ...},  # 필터 통과
    # {"mb_sn": "P009999", ...},  # 필터링됨 (제외)
]
```

---

### 6. 페이지네이션 적용

**위치**: `server/app/api/search.py`

**처리 과정**:
```python
# 페이지네이션 계산
total_count = len(filtered_rows)
start_idx = (page - 1) * limit
end_idx = start_idx + limit
paginated_rows = filtered_rows[start_idx:end_idx]

# 예시:
# page=1, limit=20 → start_idx=0, end_idx=20 → [0:20]
# page=2, limit=20 → start_idx=20, end_idx=40 → [20:40]
```

---

### 7. mb_sn 추출 및 결과 구성

**위치**: `server/app/api/search.py`

**처리 과정**:
```python
# 결과 변환
results = []
for r in detailed_rows:
    # mb_sn 추출 ✅
    mb_sn = r.get("mb_sn")  # 또는 r["mb_sn"]
    
    # 추가 정보 추출
    gender = r.get("gender") or ""
    age = int(r.get("age_raw") or 0)
    region = r.get("location") or ""
    similarity = r.get("similarity") or 0.0
    combined_text = r.get("combined_text") or ""
    
    # 결과 객체 구성
    results.append({
        "id": mb_sn,              # ✅ mb_sn
        "name": mb_sn,            # ✅ mb_sn (표시용)
        "mb_sn": mb_sn,          # ✅ mb_sn (명시적 필드)
        "gender": gender,
        "age": age,
        "region": region,
        "coverage": "qw" if combined_text else "w",
        "similarity": similarity,
        "embedding": None,
        "responses": {"q1": combined_text[:140]},
        "created_at": datetime.now().isoformat()
    })
```

**최종 결과 구조**:
```python
results = [
    {
        "id": "P001234",           # ✅ mb_sn
        "name": "P001234",         # ✅ mb_sn
        "mb_sn": "P001234",        # ✅ mb_sn (클러스터링 매핑용)
        "gender": "여성",
        "age": 25,
        "region": "서울",
        "coverage": "qw",
        "similarity": 0.95,
        "embedding": None,
        "responses": {"q1": "서울 거주, 25세, 여성, 커피 좋아함..."},
        "created_at": "2025-01-15T10:30:00"
    },
    {
        "id": "P005678",           # ✅ mb_sn
        "name": "P005678",         # ✅ mb_sn
        "mb_sn": "P005678",        # ✅ mb_sn
        "gender": "여성",
        "age": 23,
        "region": "서울",
        "coverage": "qw",
        "similarity": 0.92,
        "embedding": None,
        "responses": {"q1": "서울 거주, 23세, 여성, 영화 관람..."},
        "created_at": "2025-01-15T10:30:00"
    },
    ...
]
```

---

### 8. JSON 응답 반환

**위치**: `server/app/api/search.py`

**응답 구조**:
```python
return {
    "query": query_text,           # 원본 검색 쿼리
    "page": page,                 # 현재 페이지
    "page_size": limit,           # 페이지 크기
    "count": len(results),        # 현재 페이지 결과 수
    "total": total,               # 전체 결과 수
    "pages": pages,               # 전체 페이지 수
    "mode": "vector",             # 검색 모드
    "results": results             # ✅ mb_sn이 포함된 결과 배열
}
```

**JSON 응답 예시**:
```json
{
  "query": "서울 거주 20대 여성",
  "page": 1,
  "page_size": 20,
  "count": 15,
  "total": 15,
  "pages": 1,
  "mode": "vector",
  "results": [
    {
      "id": "P001234",
      "name": "P001234",
      "mb_sn": "P001234",
      "gender": "여성",
      "age": 25,
      "region": "서울",
      "coverage": "qw",
      "similarity": 0.95,
      "embedding": null,
      "responses": {
        "q1": "서울 거주, 25세, 여성, 커피 좋아함..."
      },
      "created_at": "2025-01-15T10:30:00"
    },
    {
      "id": "P005678",
      "name": "P005678",
      "mb_sn": "P005678",
      "gender": "여성",
      "age": 23,
      "region": "서울",
      "coverage": "qw",
      "similarity": 0.92,
      "embedding": null,
      "responses": {
        "q1": "서울 거주, 23세, 여성, 영화 관람..."
      },
      "created_at": "2025-01-15T10:30:00"
    }
  ]
}
```

---

### 9. Frontend: 결과 수신 및 표시

**위치**: `src/components/pages/ResultsPage.tsx`

**처리 과정**:
```typescript
// API 응답 수신
const response = await fetch(`${API_URL}/api/search`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: query,
    page: currentPage,
    limit: pageSize,
    filters: filtersToSend
  })
});

const data = await response.json();

// ✅ mb_sn 추출
const mbSnList = data.results.map((result: any) => result.mb_sn);
// 예시: ["P001234", "P005678", ...]

// 검색 결과 저장
setSearchResults(data.results);
setTotalResults(data.total);

// 부모 컴포넌트에 전달
onDataChange(data.results);
```

**결과 표시**:
```typescript
// ResultsPage에서 결과 렌더링
{searchResults.map((result: any) => (
  <PanelCard
    key={result.mb_sn}           // ✅ mb_sn을 key로 사용
    panelId={result.mb_sn}        // ✅ mb_sn 전달
    name={result.name}
    gender={result.gender}
    age={result.age}
    region={result.region}
    similarity={result.similarity}
    onPanelClick={() => onPanelDetailOpen(result.mb_sn)}  // ✅ mb_sn 전달
  />
))}
```

---

## 핵심 데이터 추출 포인트

### 1. 데이터베이스에서 mb_sn 추출

**위치**: `server/app/db/dao_embeddings.py` → `search_panels_by_embedding()`

```python
# SQL 쿼리 결과에서 mb_sn 추출
vector_rows = await search_panels_by_embedding(...)

# 각 row에서 mb_sn 추출
for row in vector_rows:
    mb_sn = row.get("mb_sn")  # ✅ 여기서 추출
```

### 2. API 응답에서 mb_sn 포함

**위치**: `server/app/api/search.py` → `api_search_post()`

```python
results.append({
    "id": r["mb_sn"],        # ✅ mb_sn
    "name": r["mb_sn"],      # ✅ mb_sn
    "mb_sn": r["mb_sn"],     # ✅ mb_sn (명시적 필드)
    ...
})
```

### 3. Frontend에서 mb_sn 사용

**위치**: `src/components/pages/ResultsPage.tsx`

```typescript
// 검색 결과에서 mb_sn 추출
const mbSnList = data.results.map((result: any) => result.mb_sn);

// 또는 개별 접근
result.mb_sn  // ✅ 패널 고유번호
result.id     // ✅ 동일 (mb_sn과 같음)
result.name   // ✅ 동일 (mb_sn과 같음)
```

---

## 데이터 흐름 요약

```
1. 사용자 입력: "서울 거주 20대 여성"
   ↓
2. Frontend → Backend: POST /api/search
   {
     "query": "서울 거주 20대 여성",
     "page": 1,
     "limit": 20,
     "filters": {...}
   }
   ↓
3. Backend: 임베딩 생성
   query_text → embed_text() → [768차원 벡터]
   ↓
4. Backend: 벡터 검색
   query_embedding → search_panels_by_embedding() → vector_rows
   ↓
5. Backend: mb_sn 추출
   vector_rows → [{"mb_sn": "P001234", ...}, {"mb_sn": "P005678", ...}, ...]
   ↓
6. Backend: 결과 구성
   results = [
     {"mb_sn": "P001234", "id": "P001234", "name": "P001234", ...},
     {"mb_sn": "P005678", "id": "P005678", "name": "P005678", ...},
     ...
   ]
   ↓
7. Backend → Frontend: JSON 응답
   {
     "results": [
       {"mb_sn": "P001234", ...},
       {"mb_sn": "P005678", ...},
       ...
     ],
     "total": 15,
     ...
   }
   ↓
8. Frontend: 결과 표시
   searchResults.map(result => result.mb_sn)  // ✅ ["P001234", "P005678", ...]
```

---

## 주요 파일 및 함수

| 단계 | 파일 | 함수/엔드포인트 | 역할 |
|------|------|----------------|------|
| 1. 입력 | `src/components/pages/StartPage.tsx` | `handleSearch()` | 검색 쿼리 입력 및 API 호출 |
| 2. API 수신 | `server/app/api/search.py` | `POST /api/search` | API 엔드포인트 |
| 3. 임베딩 | `server/app/embeddings.py` | `embed_text()` | 텍스트 → 768차원 벡터 |
| 4. 벡터 검색 | `server/app/db/dao_embeddings.py` | `search_panels_by_embedding()` | 벡터 유사도 검색 |
| 5. 필터링 | `server/app/api/search.py` | `api_search_post()` | 필터 적용 |
| 6. mb_sn 추출 | `server/app/api/search.py` | `api_search_post()` | 결과에서 mb_sn 추출 |
| 7. 응답 구성 | `server/app/api/search.py` | `api_search_post()` | JSON 응답 생성 |
| 8. 결과 표시 | `src/components/pages/ResultsPage.tsx` | `searchPanels()` | 결과 렌더링 |

---

## 참고사항

### 1. mb_sn 필드 위치

검색 결과에서 `mb_sn`은 다음 세 곳에 모두 포함됩니다:
- `result.id` → `mb_sn`과 동일
- `result.name` → `mb_sn`과 동일
- `result.mb_sn` → 명시적 필드 (클러스터링 매핑용)

### 2. 유사도 필터링

벡터 검색 시 유사도 0.9 이상인 결과만 반환됩니다:
```sql
WHERE 1 - (embedding <#> CAST(:query_embedding AS vector)) >= 0.9
```

### 3. 페이지네이션

- 기본 페이지 크기: 20개
- 최대 검색 결과: 200개 (limit=200)
- 페이지 계산: `pages = max(1, (total + limit - 1) // limit)`

### 4. 필터 적용 순서

1. 벡터 검색 (유사도 0.9 이상)
2. demographics JSONB 필터 (성별, 지역)
3. RawData JOIN 필터 (나이, 소득, 퀵폴)
4. 페이지네이션

---

## 예시 시나리오

### 시나리오: "서울 거주 20대 여성" 검색

1. **사용자 입력**: "서울 거주 20대 여성"
2. **임베딩 생성**: `[0.123, -0.456, ..., 0.789]` (768차원)
3. **벡터 검색**: 유사도 0.9 이상 패널 50개 발견
4. **필터 적용**: 
   - 성별: 여성만 → 45개
   - 지역: 서울만 → 30개
   - 나이: 20-29세 → 25개
5. **페이지네이션**: 1페이지 → 20개
6. **mb_sn 추출**: `["P001234", "P005678", ..., "P009999"]` (20개)
7. **결과 반환**: JSON 응답에 20개 패널 정보 포함
8. **Frontend 표시**: 20개 패널 카드 렌더링

---

**작성일**: 2025-01-15  
**버전**: 1.0


