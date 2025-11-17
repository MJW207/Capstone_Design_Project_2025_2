# ChromaDB 검색 시스템 통합 계획

## 📋 개요

`chroma_panel_search.ipynb`의 ChromaDB 기반 검색 프로세스를 기존 PostgreSQL + pgvector 검색 시스템에 통합하는 단계별 계획입니다.

---

## ✅ 사전 확인 사항

### 1. 필요한 리소스 확인

- ✅ **Chroma_db 폴더**: 프로젝트 루트에 존재 (`C:\Capstone_Project\Chroma_db\`)
  - 1000개 이상의 패널 폴더 (`panel_w{mb_sn}` 형식)
- ✅ **category_config.json**: 프로젝트 루트에 존재
  - 17개 카테고리 정의 (기본정보, 직업소득, 전자제품, 자동차, 흡연, 음주, 스트레스, 미용, AI서비스, 미디어, 소비, 라이프스타일, 경험, 식습관, 여행, 계절, 건강)
- ⚠️ **API 키**: 환경변수 설정 필요
  - `ANTHROPIC_API_KEY`: Claude API (메타데이터 추출, 카테고리 분류)
  - `UPSTAGE_API_KEY`: Upstage Solar 임베딩

### 2. 현재 검색 시스템 구조

**기존 검색 플로우** (`server/app/api/search.py`):
```
사용자 쿼리 → HuggingFace 임베딩 → PostgreSQL + pgvector 검색 → mb_sn 반환
```

**ChromaDB 검색 플로우** (`chroma_panel_search.ipynb`):
```
사용자 쿼리 → LLM 메타데이터 추출 → 카테고리 분류 → 텍스트 생성 → Upstage 임베딩 → ChromaDB 검색 → mb_sn 반환
```

---

## 🎯 통합 목표

1. **기존 API 엔드포인트 유지**: `POST /api/search` 호환성 유지
2. **검색 모드 선택**: 환경변수 또는 요청 파라미터로 검색 방식 선택
   - `vector`: 기존 PostgreSQL + pgvector (HuggingFace)
   - `chroma`: 새로운 ChromaDB 검색 (Upstage Solar)
3. **결과 형식 통일**: 두 방식 모두 동일한 JSON 응답 형식 반환

---

## 📝 단계별 구현 계획

### **Phase 1: 환경 설정 및 의존성 추가**

#### 1.1 requirements.txt 업데이트

**파일**: `server/requirements.txt`

**추가할 패키지**:
```txt
anthropic>=0.34.0
langchain-upstage>=0.1.0
langchain-chroma>=0.1.0
chromadb>=0.4.0
```

**작업**:
- [ ] `server/requirements.txt`에 패키지 추가
- [ ] 패키지 설치 테스트: `pip install -r requirements.txt`

#### 1.2 환경변수 설정

**파일**: `.env` (프로젝트 루트)

**추가할 변수**:
```env
# ChromaDB 검색 설정
CHROMA_SEARCH_ENABLED=true
CHROMA_BASE_DIR=C:\Capstone_Project\Chroma_db
CATEGORY_CONFIG_PATH=C:\Capstone_Project\category_config.json

# API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
UPSTAGE_API_KEY=up_...
```

**작업**:
- [ ] `.env` 파일에 변수 추가
- [ ] `server/app/core/config.py`에 설정 추가

---

### **Phase 2: ChromaDB 검색 모듈 생성**

#### 2.1 메타데이터 추출기 모듈

**파일**: `server/app/services/metadata_extractor.py`

**기능**:
- `MetadataExtractor` 클래스 (LLM 기반)
- 자연어 쿼리에서 메타데이터 추출
- 직업 정규화 (15개 보기)

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `MetadataExtractor` 클래스 코드 추출
- [ ] FastAPI 비동기 환경에 맞게 수정
- [ ] 에러 처리 및 로깅 추가

#### 2.2 카테고리 분류기 모듈

**파일**: `server/app/services/category_classifier.py`

**기능**:
- `CategoryClassifier` 클래스
- 메타데이터를 카테고리별로 분류
- `category_config.json` 로드

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `CategoryClassifier` 클래스 코드 추출
- [ ] `category_config.json` 경로를 환경변수에서 읽도록 수정
- [ ] 비동기 처리 추가

#### 2.3 텍스트 생성기 모듈

**파일**: `server/app/services/text_generator.py`

**기능**:
- `CategoryTextGenerator` 클래스
- 카테고리별 자연어 텍스트 생성
- ChromaDB 저장 형식에 맞춘 텍스트 생성

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `CategoryTextGenerator` 클래스 코드 추출
- [ ] 템플릿 기반 생성 로직 유지

#### 2.4 ChromaDB 검색기 모듈

**파일**: `server/app/services/chroma_searcher.py`

**기능**:
- `ChromaPanelSearcher` 클래스
- ChromaDB에서 topic + 메타데이터 필터링 검색
- 단계적 완화 필터링 (엄격 → 부분 매칭)

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `ChromaPanelSearcher` 클래스 코드 추출
- [ ] `Chroma_db` 경로를 환경변수에서 읽도록 수정
- [ ] 연결 관리 및 메모리 최적화

#### 2.5 결과 필터 모듈

**파일**: `server/app/services/result_filter.py`

**기능**:
- `ResultFilter` 클래스
- 단계적 필터링으로 최종 후보 선별
- 병렬 검색 최적화

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `ResultFilter` 클래스 코드 추출
- [ ] 비동기 처리로 변경 (ThreadPoolExecutor → asyncio)

#### 2.6 통합 파이프라인 모듈

**파일**: `server/app/services/chroma_pipeline.py`

**기능**:
- `ChromaSearchPipeline` 클래스
- 전체 검색 파이프라인 통합
- 캐싱 및 성능 최적화

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `PanelSearchPipeline` 클래스 코드 추출
- [ ] FastAPI 비동기 환경에 맞게 수정
- [ ] 싱글톤 패턴으로 파이프라인 인스턴스 관리

---

### **Phase 3: API 엔드포인트 통합**

#### 3.1 검색 모드 설정 추가

**파일**: `server/app/core/config.py`

**추가할 설정**:
```python
# ChromaDB 검색 설정
CHROMA_SEARCH_ENABLED: Final[bool] = os.getenv("CHROMA_SEARCH_ENABLED", "false").lower() in ("true", "1", "yes", "on")
CHROMA_BASE_DIR: Final[str] = os.getenv("CHROMA_BASE_DIR", "C:\\Capstone_Project\\Chroma_db")
CATEGORY_CONFIG_PATH: Final[str] = os.getenv("CATEGORY_CONFIG_PATH", "C:\\Capstone_Project\\category_config.json")
ANTHROPIC_API_KEY: Final[str] = os.getenv("ANTHROPIC_API_KEY", "")
UPSTAGE_API_KEY: Final[str] = os.getenv("UPSTAGE_API_KEY", "")
```

#### 3.2 검색 API 수정

**파일**: `server/app/api/search.py`

**수정 사항**:
1. 요청 파라미터에 `search_mode` 추가 (선택사항)
   - `vector`: 기존 PostgreSQL 검색 (기본값)
   - `chroma`: ChromaDB 검색
2. ChromaDB 검색 분기 추가

**코드 구조**:
```python
@router.post("/api/search")
async def api_search_post(
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_session)
):
    search_mode = payload.get("search_mode", "vector")  # 기본값: vector
    
    if search_mode == "chroma" and CHROMA_SEARCH_ENABLED:
        # ChromaDB 검색
        return await chroma_search(payload)
    else:
        # 기존 PostgreSQL 검색
        return await vector_search(payload, session)
```

**작업**:
- [ ] `chroma_search()` 함수 구현
- [ ] `vector_search()` 함수 분리 (기존 로직)
- [ ] 에러 처리 및 폴백 메커니즘 추가

#### 3.3 ChromaDB 검색 함수 구현

**파일**: `server/app/api/search.py`

**함수**: `async def chroma_search(payload: Dict[str, Any]) -> Dict[str, Any]`

**처리 플로우**:
```python
async def chroma_search(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    ChromaDB 기반 검색
    
    1. 쿼리 추출
    2. ChromaSearchPipeline 초기화 (싱글톤)
    3. 검색 실행 (top_k 계산)
    4. mb_sn 리스트 반환
    5. 페이지네이션 적용
    6. 결과 형식 변환 (기존 형식과 동일)
    """
    query = payload.get("query", "")
    page = int(payload.get("page", 1))
    limit = int(payload.get("limit", 20))
    top_k = page * limit  # 최대 검색 개수
    
    # 파이프라인 초기화 (싱글톤)
    pipeline = get_chroma_pipeline()
    
    # 검색 실행
    mb_sn_list = await pipeline.search_async(query, top_k=top_k)
    
    # 페이지네이션
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_mb_sns = mb_sn_list[start_idx:end_idx]
    
    # 결과 형식 변환 (기존 형식과 동일)
    results = []
    for mb_sn in paginated_mb_sns:
        results.append({
            "id": mb_sn,
            "name": mb_sn,
            "mb_sn": mb_sn,
            "gender": "",
            "age": 0,
            "region": "",
            "coverage": "qw",
            "similarity": 1.0,  # ChromaDB 검색 결과는 유사도 정보 없음
            "embedding": None,
            "responses": {"q1": ""},
            "created_at": datetime.now().isoformat()
        })
    
    return {
        "query": query,
        "page": page,
        "page_size": limit,
        "count": len(results),
        "total": len(mb_sn_list),
        "pages": max(1, (len(mb_sn_list) + limit - 1) // limit),
        "mode": "chroma",
        "results": results
    }
```

**작업**:
- [ ] `chroma_search()` 함수 구현
- [ ] `get_chroma_pipeline()` 싱글톤 함수 구현
- [ ] 결과 형식 변환 로직 추가

---

### **Phase 4: 비동기 처리 및 최적화**

#### 4.1 비동기 변환

**작업**:
- [ ] `ThreadPoolExecutor` → `asyncio` 변환
- [ ] LLM API 호출 비동기 처리
- [ ] ChromaDB 검색 비동기 처리

**주요 변경점**:
```python
# 기존 (동기)
with ThreadPoolExecutor(max_workers=5) as executor:
    future_to_mb_sn = {
        executor.submit(...): mb_sn
        for mb_sn in available_panels
    }

# 변경 (비동기)
async def search_panel_async(mb_sn, category, embedding, filter):
    return await searcher.search_by_category_async(...)

tasks = [
    search_panel_async(mb_sn, category, embedding, filter)
    for mb_sn in available_panels
]
results = await asyncio.gather(*tasks)
```

#### 4.2 캐싱 추가

**작업**:
- [ ] 파이프라인 인스턴스 캐싱 (싱글톤)
- [ ] 카테고리별 임베딩 캐싱 (LRU Cache)
- [ ] 메타데이터 추출 결과 캐싱 (동일 쿼리)

**구현**:
```python
from functools import lru_cache
from typing import Optional

_chroma_pipeline: Optional[ChromaSearchPipeline] = None

def get_chroma_pipeline() -> ChromaSearchPipeline:
    """싱글톤 패턴으로 파이프라인 인스턴스 반환"""
    global _chroma_pipeline
    if _chroma_pipeline is None:
        _chroma_pipeline = ChromaSearchPipeline(
            chroma_base_dir=CHROMA_BASE_DIR,
            category_config_path=CATEGORY_CONFIG_PATH,
            anthropic_api_key=ANTHROPIC_API_KEY,
            upstage_api_key=UPSTAGE_API_KEY
        )
    return _chroma_pipeline
```

#### 4.3 에러 처리 및 폴백

**작업**:
- [ ] ChromaDB 검색 실패 시 기존 검색으로 폴백
- [ ] LLM API 실패 시 에러 메시지 반환
- [ ] 타임아웃 설정

**구현**:
```python
async def chroma_search(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # ChromaDB 검색 시도
        ...
    except Exception as e:
        logger.error(f"ChromaDB 검색 실패: {e}")
        # 폴백: 기존 검색 사용
        if FALLBACK_TO_VECTOR_SEARCH:
            return await vector_search(payload, session)
        else:
            raise HTTPException(500, f"검색 실패: {str(e)}")
```

---

### **Phase 5: 테스트 및 검증**

#### 5.1 단위 테스트

**파일**: `server/tests/test_chroma_search.py`

**테스트 항목**:
- [ ] 메타데이터 추출 테스트
- [ ] 카테고리 분류 테스트
- [ ] 텍스트 생성 테스트
- [ ] ChromaDB 검색 테스트
- [ ] 결과 필터링 테스트

#### 5.2 통합 테스트

**테스트 시나리오**:
- [ ] "서울 20대 남자" 검색
- [ ] "전문직에서 일하는 사람" 검색
- [ ] "커피 좋아하는 30대 여성" 검색
- [ ] 페이지네이션 테스트
- [ ] 에러 처리 테스트

#### 5.3 성능 테스트

**측정 항목**:
- [ ] 검색 응답 시간
- [ ] 동시 요청 처리 능력
- [ ] 메모리 사용량
- [ ] LLM API 호출 횟수

---

### **Phase 6: 문서화 및 배포**

#### 6.1 API 문서 업데이트

**작업**:
- [ ] FastAPI 자동 문서 (`/docs`) 확인
- [ ] `search_mode` 파라미터 설명 추가
- [ ] 예시 요청/응답 추가

#### 6.2 README 업데이트

**작업**:
- [ ] ChromaDB 검색 사용법 추가
- [ ] 환경변수 설정 가이드 추가
- [ ] 검색 모드 선택 방법 설명

#### 6.3 배포 체크리스트

**작업**:
- [ ] 환경변수 설정 확인
- [ ] Chroma_db 폴더 경로 확인
- [ ] category_config.json 경로 확인
- [ ] API 키 유효성 확인
- [ ] 의존성 설치 확인

---

## 📁 파일 구조

```
server/
├── app/
│   ├── api/
│   │   └── search.py                    # ✅ 수정: ChromaDB 검색 분기 추가
│   ├── services/
│   │   ├── metadata_extractor.py        # 🆕 생성: 메타데이터 추출
│   │   ├── category_classifier.py       # 🆕 생성: 카테고리 분류
│   │   ├── text_generator.py           # 🆕 생성: 텍스트 생성
│   │   ├── chroma_searcher.py          # 🆕 생성: ChromaDB 검색
│   │   ├── result_filter.py            # 🆕 생성: 결과 필터링
│   │   └── chroma_pipeline.py          # 🆕 생성: 통합 파이프라인
│   └── core/
│       └── config.py                    # ✅ 수정: ChromaDB 설정 추가
├── tests/
│   └── test_chroma_search.py           # 🆕 생성: 테스트
└── requirements.txt                     # ✅ 수정: 패키지 추가
```

---

## 🔄 검색 모드 비교

| 항목 | 기존 (Vector) | 새로운 (Chroma) |
|------|---------------|-----------------|
| **임베딩 모델** | HuggingFace (multilingual-e5-base) | Upstage Solar |
| **데이터베이스** | PostgreSQL + pgvector | ChromaDB (로컬) |
| **검색 방식** | 벡터 유사도 검색 | Topic + 메타데이터 필터링 |
| **메타데이터 활용** | 제한적 (demographics JSONB) | LLM 기반 구조화 |
| **카테고리 분류** | 없음 | 17개 카테고리 |
| **필터링** | SQL WHERE 절 | 단계적 완화 필터링 |
| **응답 시간** | 빠름 (~100ms) | 느림 (~2-5초, LLM 호출) |
| **정확도** | 높음 (벡터 유사도) | 매우 높음 (의미 기반) |

---

## ⚠️ 주의사항

### 1. 성능 고려사항

- **LLM API 호출**: 메타데이터 추출 및 카테고리 분류에 LLM 사용 → 응답 시간 증가
- **해결책**: 
  - 캐싱 활용 (동일 쿼리 재사용)
  - 비동기 처리로 병렬화
  - 타임아웃 설정

### 2. 비용 고려사항

- **Anthropic API**: 메타데이터 추출, 카테고리 분류에 사용
- **Upstage API**: 임베딩 생성에 사용
- **해결책**: 
  - 캐싱으로 API 호출 최소화
  - 검색 모드 선택권 제공 (기존 검색도 유지)

### 3. 데이터 일관성

- **ChromaDB 데이터**: 로컬 파일 시스템 기반
- **PostgreSQL 데이터**: 데이터베이스 기반
- **해결책**: 
  - 데이터 동기화 확인
  - 검색 결과 검증

---

## 📊 예상 작업 시간

| Phase | 작업 내용 | 예상 시간 |
|-------|----------|----------|
| Phase 1 | 환경 설정 및 의존성 | 1시간 |
| Phase 2 | ChromaDB 검색 모듈 생성 | 4-6시간 |
| Phase 3 | API 엔드포인트 통합 | 2-3시간 |
| Phase 4 | 비동기 처리 및 최적화 | 3-4시간 |
| Phase 5 | 테스트 및 검증 | 2-3시간 |
| Phase 6 | 문서화 및 배포 | 1-2시간 |
| **총계** | | **13-19시간** |

---

## 🚀 시작하기

### 1단계: 환경 설정
```bash
# 1. 패키지 설치
cd server
pip install -r requirements.txt

# 2. 환경변수 설정
# .env 파일에 ANTHROPIC_API_KEY, UPSTAGE_API_KEY 추가
```

### 2단계: 모듈 생성
- Phase 2의 각 모듈 파일 생성
- `chroma_panel_search.ipynb`에서 코드 추출 및 수정

### 3단계: API 통합
- `server/app/api/search.py` 수정
- 검색 모드 분기 추가

### 4단계: 테스트
- 단위 테스트 작성 및 실행
- 통합 테스트 수행

---

**작성일**: 2025-01-15  
**버전**: 1.0




## 📋 개요

`chroma_panel_search.ipynb`의 ChromaDB 기반 검색 프로세스를 기존 PostgreSQL + pgvector 검색 시스템에 통합하는 단계별 계획입니다.

---

## ✅ 사전 확인 사항

### 1. 필요한 리소스 확인

- ✅ **Chroma_db 폴더**: 프로젝트 루트에 존재 (`C:\Capstone_Project\Chroma_db\`)
  - 1000개 이상의 패널 폴더 (`panel_w{mb_sn}` 형식)
- ✅ **category_config.json**: 프로젝트 루트에 존재
  - 17개 카테고리 정의 (기본정보, 직업소득, 전자제품, 자동차, 흡연, 음주, 스트레스, 미용, AI서비스, 미디어, 소비, 라이프스타일, 경험, 식습관, 여행, 계절, 건강)
- ⚠️ **API 키**: 환경변수 설정 필요
  - `ANTHROPIC_API_KEY`: Claude API (메타데이터 추출, 카테고리 분류)
  - `UPSTAGE_API_KEY`: Upstage Solar 임베딩

### 2. 현재 검색 시스템 구조

**기존 검색 플로우** (`server/app/api/search.py`):
```
사용자 쿼리 → HuggingFace 임베딩 → PostgreSQL + pgvector 검색 → mb_sn 반환
```

**ChromaDB 검색 플로우** (`chroma_panel_search.ipynb`):
```
사용자 쿼리 → LLM 메타데이터 추출 → 카테고리 분류 → 텍스트 생성 → Upstage 임베딩 → ChromaDB 검색 → mb_sn 반환
```

---

## 🎯 통합 목표

1. **기존 API 엔드포인트 유지**: `POST /api/search` 호환성 유지
2. **검색 모드 선택**: 환경변수 또는 요청 파라미터로 검색 방식 선택
   - `vector`: 기존 PostgreSQL + pgvector (HuggingFace)
   - `chroma`: 새로운 ChromaDB 검색 (Upstage Solar)
3. **결과 형식 통일**: 두 방식 모두 동일한 JSON 응답 형식 반환

---

## 📝 단계별 구현 계획

### **Phase 1: 환경 설정 및 의존성 추가**

#### 1.1 requirements.txt 업데이트

**파일**: `server/requirements.txt`

**추가할 패키지**:
```txt
anthropic>=0.34.0
langchain-upstage>=0.1.0
langchain-chroma>=0.1.0
chromadb>=0.4.0
```

**작업**:
- [ ] `server/requirements.txt`에 패키지 추가
- [ ] 패키지 설치 테스트: `pip install -r requirements.txt`

#### 1.2 환경변수 설정

**파일**: `.env` (프로젝트 루트)

**추가할 변수**:
```env
# ChromaDB 검색 설정
CHROMA_SEARCH_ENABLED=true
CHROMA_BASE_DIR=C:\Capstone_Project\Chroma_db
CATEGORY_CONFIG_PATH=C:\Capstone_Project\category_config.json

# API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
UPSTAGE_API_KEY=up_...
```

**작업**:
- [ ] `.env` 파일에 변수 추가
- [ ] `server/app/core/config.py`에 설정 추가

---

### **Phase 2: ChromaDB 검색 모듈 생성**

#### 2.1 메타데이터 추출기 모듈

**파일**: `server/app/services/metadata_extractor.py`

**기능**:
- `MetadataExtractor` 클래스 (LLM 기반)
- 자연어 쿼리에서 메타데이터 추출
- 직업 정규화 (15개 보기)

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `MetadataExtractor` 클래스 코드 추출
- [ ] FastAPI 비동기 환경에 맞게 수정
- [ ] 에러 처리 및 로깅 추가

#### 2.2 카테고리 분류기 모듈

**파일**: `server/app/services/category_classifier.py`

**기능**:
- `CategoryClassifier` 클래스
- 메타데이터를 카테고리별로 분류
- `category_config.json` 로드

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `CategoryClassifier` 클래스 코드 추출
- [ ] `category_config.json` 경로를 환경변수에서 읽도록 수정
- [ ] 비동기 처리 추가

#### 2.3 텍스트 생성기 모듈

**파일**: `server/app/services/text_generator.py`

**기능**:
- `CategoryTextGenerator` 클래스
- 카테고리별 자연어 텍스트 생성
- ChromaDB 저장 형식에 맞춘 텍스트 생성

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `CategoryTextGenerator` 클래스 코드 추출
- [ ] 템플릿 기반 생성 로직 유지

#### 2.4 ChromaDB 검색기 모듈

**파일**: `server/app/services/chroma_searcher.py`

**기능**:
- `ChromaPanelSearcher` 클래스
- ChromaDB에서 topic + 메타데이터 필터링 검색
- 단계적 완화 필터링 (엄격 → 부분 매칭)

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `ChromaPanelSearcher` 클래스 코드 추출
- [ ] `Chroma_db` 경로를 환경변수에서 읽도록 수정
- [ ] 연결 관리 및 메모리 최적화

#### 2.5 결과 필터 모듈

**파일**: `server/app/services/result_filter.py`

**기능**:
- `ResultFilter` 클래스
- 단계적 필터링으로 최종 후보 선별
- 병렬 검색 최적화

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `ResultFilter` 클래스 코드 추출
- [ ] 비동기 처리로 변경 (ThreadPoolExecutor → asyncio)

#### 2.6 통합 파이프라인 모듈

**파일**: `server/app/services/chroma_pipeline.py`

**기능**:
- `ChromaSearchPipeline` 클래스
- 전체 검색 파이프라인 통합
- 캐싱 및 성능 최적화

**작업**:
- [ ] `chroma_panel_search.ipynb`의 `PanelSearchPipeline` 클래스 코드 추출
- [ ] FastAPI 비동기 환경에 맞게 수정
- [ ] 싱글톤 패턴으로 파이프라인 인스턴스 관리

---

### **Phase 3: API 엔드포인트 통합**

#### 3.1 검색 모드 설정 추가

**파일**: `server/app/core/config.py`

**추가할 설정**:
```python
# ChromaDB 검색 설정
CHROMA_SEARCH_ENABLED: Final[bool] = os.getenv("CHROMA_SEARCH_ENABLED", "false").lower() in ("true", "1", "yes", "on")
CHROMA_BASE_DIR: Final[str] = os.getenv("CHROMA_BASE_DIR", "C:\\Capstone_Project\\Chroma_db")
CATEGORY_CONFIG_PATH: Final[str] = os.getenv("CATEGORY_CONFIG_PATH", "C:\\Capstone_Project\\category_config.json")
ANTHROPIC_API_KEY: Final[str] = os.getenv("ANTHROPIC_API_KEY", "")
UPSTAGE_API_KEY: Final[str] = os.getenv("UPSTAGE_API_KEY", "")
```

#### 3.2 검색 API 수정

**파일**: `server/app/api/search.py`

**수정 사항**:
1. 요청 파라미터에 `search_mode` 추가 (선택사항)
   - `vector`: 기존 PostgreSQL 검색 (기본값)
   - `chroma`: ChromaDB 검색
2. ChromaDB 검색 분기 추가

**코드 구조**:
```python
@router.post("/api/search")
async def api_search_post(
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_session)
):
    search_mode = payload.get("search_mode", "vector")  # 기본값: vector
    
    if search_mode == "chroma" and CHROMA_SEARCH_ENABLED:
        # ChromaDB 검색
        return await chroma_search(payload)
    else:
        # 기존 PostgreSQL 검색
        return await vector_search(payload, session)
```

**작업**:
- [ ] `chroma_search()` 함수 구현
- [ ] `vector_search()` 함수 분리 (기존 로직)
- [ ] 에러 처리 및 폴백 메커니즘 추가

#### 3.3 ChromaDB 검색 함수 구현

**파일**: `server/app/api/search.py`

**함수**: `async def chroma_search(payload: Dict[str, Any]) -> Dict[str, Any]`

**처리 플로우**:
```python
async def chroma_search(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    ChromaDB 기반 검색
    
    1. 쿼리 추출
    2. ChromaSearchPipeline 초기화 (싱글톤)
    3. 검색 실행 (top_k 계산)
    4. mb_sn 리스트 반환
    5. 페이지네이션 적용
    6. 결과 형식 변환 (기존 형식과 동일)
    """
    query = payload.get("query", "")
    page = int(payload.get("page", 1))
    limit = int(payload.get("limit", 20))
    top_k = page * limit  # 최대 검색 개수
    
    # 파이프라인 초기화 (싱글톤)
    pipeline = get_chroma_pipeline()
    
    # 검색 실행
    mb_sn_list = await pipeline.search_async(query, top_k=top_k)
    
    # 페이지네이션
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_mb_sns = mb_sn_list[start_idx:end_idx]
    
    # 결과 형식 변환 (기존 형식과 동일)
    results = []
    for mb_sn in paginated_mb_sns:
        results.append({
            "id": mb_sn,
            "name": mb_sn,
            "mb_sn": mb_sn,
            "gender": "",
            "age": 0,
            "region": "",
            "coverage": "qw",
            "similarity": 1.0,  # ChromaDB 검색 결과는 유사도 정보 없음
            "embedding": None,
            "responses": {"q1": ""},
            "created_at": datetime.now().isoformat()
        })
    
    return {
        "query": query,
        "page": page,
        "page_size": limit,
        "count": len(results),
        "total": len(mb_sn_list),
        "pages": max(1, (len(mb_sn_list) + limit - 1) // limit),
        "mode": "chroma",
        "results": results
    }
```

**작업**:
- [ ] `chroma_search()` 함수 구현
- [ ] `get_chroma_pipeline()` 싱글톤 함수 구현
- [ ] 결과 형식 변환 로직 추가

---

### **Phase 4: 비동기 처리 및 최적화**

#### 4.1 비동기 변환

**작업**:
- [ ] `ThreadPoolExecutor` → `asyncio` 변환
- [ ] LLM API 호출 비동기 처리
- [ ] ChromaDB 검색 비동기 처리

**주요 변경점**:
```python
# 기존 (동기)
with ThreadPoolExecutor(max_workers=5) as executor:
    future_to_mb_sn = {
        executor.submit(...): mb_sn
        for mb_sn in available_panels
    }

# 변경 (비동기)
async def search_panel_async(mb_sn, category, embedding, filter):
    return await searcher.search_by_category_async(...)

tasks = [
    search_panel_async(mb_sn, category, embedding, filter)
    for mb_sn in available_panels
]
results = await asyncio.gather(*tasks)
```

#### 4.2 캐싱 추가

**작업**:
- [ ] 파이프라인 인스턴스 캐싱 (싱글톤)
- [ ] 카테고리별 임베딩 캐싱 (LRU Cache)
- [ ] 메타데이터 추출 결과 캐싱 (동일 쿼리)

**구현**:
```python
from functools import lru_cache
from typing import Optional

_chroma_pipeline: Optional[ChromaSearchPipeline] = None

def get_chroma_pipeline() -> ChromaSearchPipeline:
    """싱글톤 패턴으로 파이프라인 인스턴스 반환"""
    global _chroma_pipeline
    if _chroma_pipeline is None:
        _chroma_pipeline = ChromaSearchPipeline(
            chroma_base_dir=CHROMA_BASE_DIR,
            category_config_path=CATEGORY_CONFIG_PATH,
            anthropic_api_key=ANTHROPIC_API_KEY,
            upstage_api_key=UPSTAGE_API_KEY
        )
    return _chroma_pipeline
```

#### 4.3 에러 처리 및 폴백

**작업**:
- [ ] ChromaDB 검색 실패 시 기존 검색으로 폴백
- [ ] LLM API 실패 시 에러 메시지 반환
- [ ] 타임아웃 설정

**구현**:
```python
async def chroma_search(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # ChromaDB 검색 시도
        ...
    except Exception as e:
        logger.error(f"ChromaDB 검색 실패: {e}")
        # 폴백: 기존 검색 사용
        if FALLBACK_TO_VECTOR_SEARCH:
            return await vector_search(payload, session)
        else:
            raise HTTPException(500, f"검색 실패: {str(e)}")
```

---

### **Phase 5: 테스트 및 검증**

#### 5.1 단위 테스트

**파일**: `server/tests/test_chroma_search.py`

**테스트 항목**:
- [ ] 메타데이터 추출 테스트
- [ ] 카테고리 분류 테스트
- [ ] 텍스트 생성 테스트
- [ ] ChromaDB 검색 테스트
- [ ] 결과 필터링 테스트

#### 5.2 통합 테스트

**테스트 시나리오**:
- [ ] "서울 20대 남자" 검색
- [ ] "전문직에서 일하는 사람" 검색
- [ ] "커피 좋아하는 30대 여성" 검색
- [ ] 페이지네이션 테스트
- [ ] 에러 처리 테스트

#### 5.3 성능 테스트

**측정 항목**:
- [ ] 검색 응답 시간
- [ ] 동시 요청 처리 능력
- [ ] 메모리 사용량
- [ ] LLM API 호출 횟수

---

### **Phase 6: 문서화 및 배포**

#### 6.1 API 문서 업데이트

**작업**:
- [ ] FastAPI 자동 문서 (`/docs`) 확인
- [ ] `search_mode` 파라미터 설명 추가
- [ ] 예시 요청/응답 추가

#### 6.2 README 업데이트

**작업**:
- [ ] ChromaDB 검색 사용법 추가
- [ ] 환경변수 설정 가이드 추가
- [ ] 검색 모드 선택 방법 설명

#### 6.3 배포 체크리스트

**작업**:
- [ ] 환경변수 설정 확인
- [ ] Chroma_db 폴더 경로 확인
- [ ] category_config.json 경로 확인
- [ ] API 키 유효성 확인
- [ ] 의존성 설치 확인

---

## 📁 파일 구조

```
server/
├── app/
│   ├── api/
│   │   └── search.py                    # ✅ 수정: ChromaDB 검색 분기 추가
│   ├── services/
│   │   ├── metadata_extractor.py        # 🆕 생성: 메타데이터 추출
│   │   ├── category_classifier.py       # 🆕 생성: 카테고리 분류
│   │   ├── text_generator.py           # 🆕 생성: 텍스트 생성
│   │   ├── chroma_searcher.py          # 🆕 생성: ChromaDB 검색
│   │   ├── result_filter.py            # 🆕 생성: 결과 필터링
│   │   └── chroma_pipeline.py          # 🆕 생성: 통합 파이프라인
│   └── core/
│       └── config.py                    # ✅ 수정: ChromaDB 설정 추가
├── tests/
│   └── test_chroma_search.py           # 🆕 생성: 테스트
└── requirements.txt                     # ✅ 수정: 패키지 추가
```

---

## 🔄 검색 모드 비교

| 항목 | 기존 (Vector) | 새로운 (Chroma) |
|------|---------------|-----------------|
| **임베딩 모델** | HuggingFace (multilingual-e5-base) | Upstage Solar |
| **데이터베이스** | PostgreSQL + pgvector | ChromaDB (로컬) |
| **검색 방식** | 벡터 유사도 검색 | Topic + 메타데이터 필터링 |
| **메타데이터 활용** | 제한적 (demographics JSONB) | LLM 기반 구조화 |
| **카테고리 분류** | 없음 | 17개 카테고리 |
| **필터링** | SQL WHERE 절 | 단계적 완화 필터링 |
| **응답 시간** | 빠름 (~100ms) | 느림 (~2-5초, LLM 호출) |
| **정확도** | 높음 (벡터 유사도) | 매우 높음 (의미 기반) |

---

## ⚠️ 주의사항

### 1. 성능 고려사항

- **LLM API 호출**: 메타데이터 추출 및 카테고리 분류에 LLM 사용 → 응답 시간 증가
- **해결책**: 
  - 캐싱 활용 (동일 쿼리 재사용)
  - 비동기 처리로 병렬화
  - 타임아웃 설정

### 2. 비용 고려사항

- **Anthropic API**: 메타데이터 추출, 카테고리 분류에 사용
- **Upstage API**: 임베딩 생성에 사용
- **해결책**: 
  - 캐싱으로 API 호출 최소화
  - 검색 모드 선택권 제공 (기존 검색도 유지)

### 3. 데이터 일관성

- **ChromaDB 데이터**: 로컬 파일 시스템 기반
- **PostgreSQL 데이터**: 데이터베이스 기반
- **해결책**: 
  - 데이터 동기화 확인
  - 검색 결과 검증

---

## 📊 예상 작업 시간

| Phase | 작업 내용 | 예상 시간 |
|-------|----------|----------|
| Phase 1 | 환경 설정 및 의존성 | 1시간 |
| Phase 2 | ChromaDB 검색 모듈 생성 | 4-6시간 |
| Phase 3 | API 엔드포인트 통합 | 2-3시간 |
| Phase 4 | 비동기 처리 및 최적화 | 3-4시간 |
| Phase 5 | 테스트 및 검증 | 2-3시간 |
| Phase 6 | 문서화 및 배포 | 1-2시간 |
| **총계** | | **13-19시간** |

---

## 🚀 시작하기

### 1단계: 환경 설정
```bash
# 1. 패키지 설치
cd server
pip install -r requirements.txt

# 2. 환경변수 설정
# .env 파일에 ANTHROPIC_API_KEY, UPSTAGE_API_KEY 추가
```

### 2단계: 모듈 생성
- Phase 2의 각 모듈 파일 생성
- `chroma_panel_search.ipynb`에서 코드 추출 및 수정

### 3단계: API 통합
- `server/app/api/search.py` 수정
- 검색 모드 분기 추가

### 4단계: 테스트
- 단위 테스트 작성 및 실행
- 통합 테스트 수행

---

**작성일**: 2025-01-15  
**버전**: 1.0


