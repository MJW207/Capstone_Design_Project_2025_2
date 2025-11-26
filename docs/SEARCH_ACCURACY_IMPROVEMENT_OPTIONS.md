# 검색 정확도 개선 방안

## 현재 상태 분석

### 현재 로직의 특징
- ✅ 유사도 점수 기준 정렬 (내림차순)
- ❌ 최소 유사도 점수 임계값 없음
- ❌ 마지막 카테고리 점수만 사용 (다른 카테고리 점수 무시)
- ❌ 재랭킹(Re-ranking) 없음
- ✅ Fallback 메커니즘 (필터 없이 재검색)

---

## 개선 방안

### 1. 최소 유사도 점수 임계값 설정 ⭐ (가장 간단하고 효과적)

**현재 문제:**
- 유사도 점수가 매우 낮은 결과도 포함될 수 있음
- 예: 점수 0.3인 결과도 반환 가능

**개선 방안:**
```python
# pinecone_result_filter.py 수정
MIN_SIMILARITY_SCORE = 0.6  # 최소 유사도 점수 (0.0 ~ 1.0)

# 최종 정렬 후 필터링
final_sorted = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
# ⭐ 최소 점수 이상만 필터링
filtered_sorted = [(mb_sn, score) for mb_sn, score in final_sorted if score >= MIN_SIMILARITY_SCORE]

if final_count is not None:
    final_mb_sns = [mb_sn for mb_sn, score in filtered_sorted[:final_count]]
else:
    final_mb_sns = [mb_sn for mb_sn, score in filtered_sorted]
```

**장점:**
- 구현 간단
- 즉시 적용 가능
- 낮은 유사도 결과 제거

**단점:**
- 임계값 설정이 어려울 수 있음 (데이터에 따라 다름)
- 너무 높으면 결과가 없을 수 있음

**권장 임계값:**
- 보수적: `0.5` (낮은 정확도 허용)
- 중간: `0.6` (권장)
- 엄격: `0.7` (높은 정확도)

---

### 2. 멀티 카테고리 점수 결합 ⭐⭐ (중간 난이도, 효과적)

**현재 문제:**
- 마지막 카테고리 점수만 사용
- 다른 카테고리 점수는 무시됨
- 예: "기본정보" 점수 0.8, "직업소득" 점수 0.9 → 0.9만 사용

**개선 방안:**
```python
# pinecone_result_filter.py 수정
def _combine_category_scores(
    self,
    category_scores: Dict[str, Dict[str, float]],  # {category: {mb_sn: score}}
    weights: Dict[str, float] = None  # 카테고리별 가중치
) -> Dict[str, float]:
    """
    여러 카테고리 점수를 결합하여 최종 점수 계산
    
    방법 1: 평균
    방법 2: 가중 평균 (카테고리별 중요도)
    방법 3: 최대값 (현재 방식)
    방법 4: 기하 평균
    """
    if weights is None:
        weights = {cat: 1.0 for cat in category_scores.keys()}
    
    combined_scores = {}
    for mb_sn in set().union(*[scores.keys() for scores in category_scores.values()]):
        scores = []
        total_weight = 0
        
        for category, category_weight in weights.items():
            if category in category_scores and mb_sn in category_scores[category]:
                score = category_scores[category][mb_sn]
                scores.append(score * category_weight)
                total_weight += category_weight
        
        if scores and total_weight > 0:
            # 가중 평균
            combined_scores[mb_sn] = sum(scores) / total_weight
    
    return combined_scores

# 사용 예시
# 방법 1: 단순 평균
combined_scores = {}
for mb_sn in all_mb_sns:
    scores = [cat_scores[cat].get(mb_sn, 0) for cat in category_order if mb_sn in cat_scores[cat]]
    if scores:
        combined_scores[mb_sn] = sum(scores) / len(scores)

# 방법 2: 가중 평균 (기본정보가 더 중요하다고 가정)
weights = {"기본정보": 0.5, "직업소득": 0.3, "자동차": 0.2}
combined_scores = self._combine_category_scores(category_scores, weights)
```

**장점:**
- 모든 카테고리 정보 활용
- 더 정확한 유사도 측정

**단점:**
- 구현 복잡도 증가
- 가중치 설정 필요

---

### 3. 재랭킹(Re-ranking) 모델 ⭐⭐⭐ (고난이도, 매우 효과적)

**현재 문제:**
- 벡터 유사도만으로 정렬
- 의미적 관련성은 고려하지만, 실제 관련성은 다를 수 있음

**개선 방안:**
```python
# 새로운 파일: server/app/services/reranker.py
from typing import List, Dict, Any
import openai  # 또는 Cohere, Jina 등

class Reranker:
    """검색 결과 재랭킹"""
    
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"  # 또는 전용 reranker 모델
    
    def rerank(
        self,
        query: str,
        results: List[Dict[str, Any]],  # [{"mb_sn": ..., "text": ..., "score": ...}]
        top_k: int = None
    ) -> List[Dict[str, Any]]:
        """
        검색 결과를 쿼리와의 관련성으로 재정렬
        
        방법 1: LLM 기반 재랭킹 (GPT-4o-mini 등)
        방법 2: 전용 Reranker 모델 (Cohere Rerank, Jina Rerank 등)
        """
        if not results:
            return []
        
        # 방법 1: Cohere Rerank API 사용 (권장)
        import cohere
        co = cohere.Client(api_key=api_key)
        
        documents = [r.get("text", "") for r in results]
        rerank_response = co.rerank(
            model="rerank-multilingual-v3.0",
            query=query,
            documents=documents,
            top_n=top_k or len(results)
        )
        
        # 재정렬된 결과 반환
        reranked_results = []
        for result in rerank_response.results:
            original_result = results[result.index]
            reranked_results.append({
                **original_result,
                "rerank_score": result.relevance_score,
                "original_score": original_result.get("score", 0.0)
            })
        
        return reranked_results
```

**사용 예시:**
```python
# pinecone_result_filter.py 수정
from app.services.reranker import Reranker

# 최종 결과 재랭킹
if len(final_mb_sns) > 0 and query:
    reranker = Reranker(api_key=OPENAI_API_KEY)
    
    # 재랭킹을 위해 텍스트 정보 필요
    results_with_text = []
    for mb_sn in final_mb_sns[:100]:  # 상위 100개만 재랭킹 (비용 절감)
        # Pinecone에서 텍스트 가져오기
        text = self._get_panel_text(mb_sn)
        results_with_text.append({
            "mb_sn": mb_sn,
            "text": text,
            "score": final_scores.get(mb_sn, 0.0)
        })
    
    reranked = reranker.rerank(query, results_with_text, top_k=final_count)
    final_mb_sns = [r["mb_sn"] for r in reranked]
```

**장점:**
- 매우 높은 정확도 향상
- 쿼리와 결과의 실제 관련성 평가

**단점:**
- 추가 API 비용
- 응답 시간 증가
- 구현 복잡도 높음

**권장 서비스:**
- Cohere Rerank API (다국어 지원, 비용 효율적)
- Jina Rerank API
- OpenAI GPT-4o-mini (LLM 기반)

---

### 4. 쿼리 확장(Query Expansion) ⭐⭐ (중간 난이도)

**현재 문제:**
- 사용자 쿼리가 짧거나 모호할 수 있음
- 예: "서울 여성" → "서울 거주 여성, 서울 출신 여성" 등으로 확장 가능

**개선 방안:**
```python
# server/app/services/query_expander.py
class QueryExpander:
    """쿼리 확장 및 개선"""
    
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-haiku-4-5-20251001"
    
    def expand(self, query: str) -> List[str]:
        """
        쿼리를 여러 변형으로 확장
        
        예: "서울 여성" → ["서울 거주 여성", "서울 출신 여성", "서울 지역 여성"]
        """
        prompt = f"""
다음 검색 쿼리를 의미가 유사한 여러 변형으로 확장해주세요.
각 변형은 원래 쿼리의 의미를 유지하면서 다른 표현을 사용해야 합니다.

원래 쿼리: {query}

JSON 형식으로 반환:
{{
    "expanded_queries": ["변형1", "변형2", "변형3"]
}}
"""
        # LLM 호출 및 파싱
        # ...
        return expanded_queries
    
    def improve(self, query: str) -> str:
        """
        쿼리를 더 명확하고 검색에 적합하게 개선
        """
        # ...
        return improved_query
```

**사용 예시:**
```python
# pinecone_pipeline.py 수정
# 1단계 전에 쿼리 확장
query_expander = QueryExpander(anthropic_api_key)
expanded_queries = query_expander.expand(query)

# 여러 쿼리로 검색 후 결과 병합
all_results = []
for expanded_query in expanded_queries:
    results = self._search_single_query(expanded_query, ...)
    all_results.extend(results)

# 중복 제거 및 재정렬
final_results = self._merge_and_deduplicate(all_results)
```

**장점:**
- 짧은 쿼리 처리 개선
- 검색 결과 다양성 증가

**단점:**
- 검색 시간 증가
- 비용 증가

---

### 5. 하이브리드 검색 (Hybrid Search) ⭐⭐⭐ (고난이도)

**현재 문제:**
- 벡터 검색만 사용
- 키워드 매칭은 고려하지 않음

**개선 방안:**
```python
# 벡터 검색 + 키워드 검색 결합
class HybridSearcher:
    def search(
        self,
        query: str,
        vector_weight: float = 0.7,
        keyword_weight: float = 0.3
    ):
        # 1. 벡터 검색 (현재 방식)
        vector_results = self.vector_search(query)
        
        # 2. 키워드 검색 (BM25 등)
        keyword_results = self.keyword_search(query)
        
        # 3. 결과 병합 (점수 결합)
        combined_results = self._combine_results(
            vector_results,
            keyword_results,
            vector_weight,
            keyword_weight
        )
        
        return combined_results
```

**장점:**
- 벡터 검색 + 키워드 검색의 장점 결합
- 정확도 향상

**단점:**
- 구현 복잡도 높음
- Pinecone에서 키워드 검색 지원 필요

---

### 6. 검색 결과 품질 평가 및 필터링 ⭐ (간단)

**개선 방안:**
```python
# pinecone_result_filter.py 수정
def _filter_low_quality_results(
    self,
    results: List[Dict[str, Any]],
    min_score: float = 0.6,
    max_results: int = None
) -> List[Dict[str, Any]]:
    """
    낮은 품질 결과 필터링
    """
    # 1. 최소 점수 이상만
    filtered = [r for r in results if r.get("score", 0.0) >= min_score]
    
    # 2. 점수 차이가 너무 큰 경우 제외 (예: 상위와 0.3 이상 차이)
    if filtered and max_results:
        top_score = filtered[0].get("score", 0.0)
        filtered = [
            r for r in filtered 
            if top_score - r.get("score", 0.0) <= 0.3
        ][:max_results]
    
    return filtered
```

---

## 권장 구현 순서

### 1단계: 즉시 적용 가능 (간단)
1. **최소 유사도 점수 임계값 설정** (0.6 권장)
   - 구현 시간: 10분
   - 효과: 중간

### 2단계: 중기 개선 (중간 난이도)
2. **멀티 카테고리 점수 결합**
   - 구현 시간: 2-3시간
   - 효과: 높음

3. **검색 결과 품질 평가 및 필터링**
   - 구현 시간: 1시간
   - 효과: 중간

### 3단계: 장기 개선 (고난이도)
4. **재랭킹(Re-ranking) 모델**
   - 구현 시간: 1-2일
   - 효과: 매우 높음
   - 비용: API 사용료 발생

5. **쿼리 확장**
   - 구현 시간: 반나절
   - 효과: 중간

6. **하이브리드 검색**
   - 구현 시간: 2-3일
   - 효과: 높음

---

## 즉시 적용 가능한 코드 예시

### 최소 유사도 점수 임계값 설정

```python
# server/app/services/pinecone_result_filter.py 수정

# 파일 상단에 상수 추가
MIN_SIMILARITY_SCORE = float(os.getenv("MIN_SIMILARITY_SCORE", "0.6"))  # 환경변수로 설정 가능

# filter_by_categories 메서드의 최종 부분 수정
# 기존 코드 (218-219줄):
# if final_count is not None:
#     final_mb_sns = final_mb_sns[:final_count]

# 수정 후:
if final_count is not None:
    # ⭐ 최소 유사도 점수 이상만 필터링
    filtered_mb_sns = [
        mb_sn for mb_sn in final_mb_sns 
        if final_scores.get(mb_sn, 0.0) >= MIN_SIMILARITY_SCORE
    ]
    final_mb_sns = filtered_mb_sns[:final_count]
    logger.info(f"✅ 최소 유사도 {MIN_SIMILARITY_SCORE} 이상: {len(final_mb_sns)}개 패널 선별 완료 ({final_count}명 요청)")
else:
    # 명수 미명시 시에도 최소 점수 필터링
    final_mb_sns = [
        mb_sn for mb_sn in final_mb_sns 
        if final_scores.get(mb_sn, 0.0) >= MIN_SIMILARITY_SCORE
    ]
    logger.info(f"✅ 최소 유사도 {MIN_SIMILARITY_SCORE} 이상: {len(final_mb_sns)}개 패널 선별 완료 (조건 만족하는 전체 반환)")
```

---

## 성능 측정 방법

개선 전후 비교:
1. **정확도 지표:**
   - Precision@K (상위 K개 중 관련 결과 비율)
   - Recall@K (전체 관련 결과 중 상위 K개에 포함된 비율)
   - NDCG@K (정규화된 누적 이득)

2. **사용자 피드백:**
   - 검색 결과 만족도
   - 클릭률
   - 북마크 비율

3. **A/B 테스트:**
   - 기존 방식 vs 개선 방식 비교

---

## 결론

**가장 빠르고 효과적인 개선:**
1. 최소 유사도 점수 임계값 설정 (0.6 권장) - 즉시 적용 가능
2. 멀티 카테고리 점수 결합 - 중기 개선

**가장 큰 효과:**
- 재랭킹(Re-ranking) 모델 - 장기 개선, 비용 발생

**권장 접근:**
1. 먼저 최소 유사도 점수 임계값 설정으로 시작
2. 효과 측정 후 멀티 카테고리 점수 결합 적용
3. 필요시 재랭킹 모델 도입 검토

