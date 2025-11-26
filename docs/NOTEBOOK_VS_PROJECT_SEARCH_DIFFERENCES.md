# 노트북 vs 프로젝트 검색 결과 차이 분석 문서

## 개요

이 문서는 원본 노트북(`pinecone_panel_search_OpenAI버전_25-11-26.ipynb`)과 현재 프로젝트의 검색 파이프라인 간 차이점을 체계적으로 분석합니다. 검색 결과가 다른 이유를 단계별로 설명하고, 각 차이점이 결과에 미치는 영향을 분석합니다.

---

## 1. 입력/출력 형식 차이

### 1.1 함수 시그니처

**노트북:**
```python
def search(self, query: str, top_k: int = None) -> List[str]:
    """
    Returns:
        mb_sn 리스트 (문자열 리스트)
    """
```

**프로젝트:**
```python
def search(
    self, 
    query: str, 
    top_k: int = None, 
    external_filters: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Returns:
        {"mb_sns": List[str], "scores": Dict[str, float]}
    """
```

### 1.2 차이점 분석

| 항목 | 노트북 | 프로젝트 | 영향 |
|------|--------|----------|------|
| **입력 파라미터** | `query`, `top_k` | `query`, `top_k`, `external_filters` | 프로젝트는 프론트엔드 UI 필터 지원 |
| **출력 형식** | `List[str]` | `Dict[str, Any]` | 프로젝트는 유사도 점수도 함께 반환 (페이지네이션 정렬용) |
| **외부 필터** | 없음 | 있음 | 프로젝트는 UI에서 선택한 필터를 직접 적용 가능 |

### 1.3 영향도

- **낮음**: 출력 형식 차이는 단순 변환으로 해결 가능
- **중간**: `external_filters`는 프로젝트 전용 기능이므로 노트북과 비교 시 제외해야 함

---

## 2. 외부 필터 처리 로직 차이

### 2.1 노트북

- 외부 필터 개념 자체가 없음
- 모든 필터는 쿼리에서 추출된 메타데이터로부터 생성

### 2.2 프로젝트

**현재 구현 (옵션 2):**
```python
# 2.5단계: 카테고리별 메타데이터 필터 추출
if external_filters:
    # 외부 필터가 있으면 외부 필터만 사용 (쿼리 필터 무시)
    category_filters.update(external_filters)
else:
    # 외부 필터가 없으면 쿼리에서 추출한 필터만 사용
    for category in classified.keys():
        cat_filter = self.filter_extractor.extract_filters(metadata, category)
        if cat_filter:
            category_filters[category] = cat_filter
```

**특징:**
- 외부 필터와 쿼리 필터는 **병합하지 않고** 하나만 사용
- 외부 필터가 있으면 쿼리 필터는 무시됨
- 빈 쿼리 + 외부 필터만 있을 때는 랜덤 벡터 사용 (유사도 무시, 필터만 적용)

### 2.3 영향도

- **높음**: 외부 필터 사용 시 검색 결과가 완전히 달라질 수 있음
- **비교 시 주의사항**: 노트북과 비교할 때는 `external_filters=None`으로 테스트해야 함

---

## 3. LLM 모델 차이 (수정 완료)

### 3.1 수정 전

| 컴포넌트 | 노트북 | 프로젝트 (수정 전) |
|----------|--------|-------------------|
| `MetadataExtractor` | `claude-haiku-4-5-20251001` | `claude-sonnet-4-5-20250929` |
| `CategoryClassifier` | `claude-haiku-4-5-20251001` | `claude-sonnet-4-5-20250929` |
| `CategoryTextGenerator` | `claude-haiku-4-5-20251001` | `claude-sonnet-4-5-20250929` |
| `MetadataFilterExtractor` | LLM 기반 (haiku) | Rule-based |

### 3.2 수정 후

| 컴포넌트 | 노트북 | 프로젝트 (수정 후) |
|----------|--------|-------------------|
| `MetadataExtractor` | `claude-haiku-4-5-20251001` | `claude-haiku-4-5-20251001` ✅ |
| `CategoryClassifier` | `claude-haiku-4-5-20251001` | `claude-haiku-4-5-20251001` ✅ |
| `CategoryTextGenerator` | `claude-haiku-4-5-20251001` | `claude-haiku-4-5-20251001` ✅ |
| `MetadataFilterExtractor` | LLM 기반 (haiku) | LLM 기반 (haiku) ✅ |

### 3.3 영향도

- **높음**: 다른 LLM 모델은 다른 출력을 생성할 수 있음
- **해결**: 모든 모델을 haiku로 통일하여 해결

---

## 4. text_generator.generate 호출 차이 (수정 완료)

### 4.1 노트북

```python
self.text_generator.generate(category, items, full_metadata_dict=metadata)
```

### 4.2 프로젝트 (수정 전)

```python
self.text_generator.generate(category, items)  # full_metadata_dict 누락
```

### 4.3 프로젝트 (수정 후)

```python
self.text_generator.generate(category, items, full_metadata_dict=metadata)  # ✅ 추가
```

### 4.4 영향도

- **중간**: `full_metadata_dict`는 컨텍스트 제공용이므로 텍스트 생성 품질에 영향을 줄 수 있음
- **해결**: `full_metadata_dict=metadata` 추가하여 해결

---

## 5. Pinecone 검색 결과 처리 차이 (수정 완료)

### 5.1 무응답 필터링

**노트북:**
- 무응답 필터링 없음
- 모든 결과를 그대로 사용

**프로젝트 (수정 전):**
```python
def _is_no_response(text: str) -> bool:
    """텍스트가 무응답인지 확인"""
    no_response_patterns = [
        "무응답", "응답하지 않았", "정보 없음", ...
    ]
    # ... 필터링 로직

# 검색 결과에서 무응답 제거
valid_results = [r for r in search_results.matches if not _is_no_response(r.metadata.get("text", ""))]
```

**프로젝트 (수정 후):**
```python
# ⭐ 노트북과 동일: 무응답 필터링 제거
valid_results = list(search_results.matches)  # ✅ 모든 결과 포함
```

### 5.2 결과 재정렬

**노트북:**
- Pinecone이 반환한 결과를 그대로 사용 (이미 유사도 순으로 정렬됨)
- 추가 정렬 없음

**프로젝트 (수정 전):**
```python
# Pinecone 결과를 명시적으로 재정렬
sorted_results = sorted(
    search_results.matches,
    key=lambda x: x.score,
    reverse=True
)
```

**프로젝트 (수정 후):**
```python
# ⭐ 노트북과 동일: Pinecone이 이미 정렬된 결과를 그대로 사용
valid_results = list(search_results.matches)  # ✅ 재정렬 제거
```

### 5.3 top_k 제한

**노트북:**
```python
search_results = self.index.query(
    vector=query_embedding,
    top_k=top_k,  # 그대로 사용
    include_metadata=True,
    filter=filter_with_metadata
)
```

**프로젝트 (수정 전):**
```python
MAX_TOP_K = 10000
search_results = self.index.query(
    vector=query_embedding,
    top_k=min(top_k, MAX_TOP_K),  # 제한 적용
    include_metadata=True,
    filter=filter_with_metadata
)
```

**프로젝트 (수정 후):**
```python
# ⭐ 노트북과 동일: top_k를 그대로 사용 (제한 없음)
search_results = self.index.query(
    vector=query_embedding,
    top_k=top_k,  # ✅ 제한 제거
    include_metadata=True,
    filter=filter_with_metadata
)
```

### 5.4 영향도

- **높음**: 무응답 필터링, 재정렬, top_k 제한 모두 검색 결과에 직접적인 영향을 미침
- **해결**: 모두 노트북과 동일하게 수정 완료

---

## 6. pinecone_result_filter 로직 차이 (수정 완료)

### 6.1 초기 검색 수 결정

**노트북:**
```python
if final_count is None:
    if has_metadata_filter:
        initial_count = 10000  # 메타데이터 조건 만족하는 모든 패널 검색
    else:
        initial_count = 10000  # 벡터 유사도 높은 상위 10000개 검색
else:
    if has_metadata_filter:
        initial_count = 10000  # 메타데이터 조건 만족하는 모든 패널 검색
    else:
        initial_count = max(final_count * 10, 2000)  # 여유있게 검색
```

**프로젝트 (수정 전):**
- 다른 로직 사용 (정확한 값 확인 필요)

**프로젝트 (수정 후):**
```python
# ⭐ 노트북과 완전히 동일: 초기 검색 수 결정
if final_count is None:
    if has_metadata_filter:
        initial_count = 10000  # ✅ 노트북과 동일
    else:
        initial_count = 10000  # ✅ 노트북과 동일
else:
    if has_metadata_filter:
        initial_count = 10000  # ✅ 노트북과 동일
    else:
        initial_count = max(final_count * 10, 2000)  # ✅ 노트북과 동일
```

### 6.2 중간 단계 검색 수 결정

**노트북:**
```python
if final_count is None and has_category_filter:
    search_count = min(len(candidate_mb_sns) * 3, 10000)
else:
    search_count = min(len(candidate_mb_sns) * 2, 10000)
```

**프로젝트 (수정 후):**
```python
# ⭐ 노트북과 완전히 동일: 후보 수에 따라 검색 수 결정
if final_count is None and has_category_filter:
    search_count = min(len(candidate_mb_sns) * 3, 10000)  # ✅ 노트북과 동일
else:
    search_count = min(len(candidate_mb_sns) * 2, 10000)  # ✅ 노트북과 동일
```

### 6.3 최종 정렬 로직

**노트북:**
```python
# 마지막 카테고리 점수만 사용하여 정렬
last_category = category_order[-1]
final_search_results = self.searcher.search_by_category(
    query_embedding=last_embedding,
    category=last_category,
    top_k=len(candidate_mb_sns),
    filter_mb_sns=candidate_mb_sns
)

# 마지막 카테고리 점수 기준으로 정렬
final_scores = {r["mb_sn"]: r["score"] for r in final_search_results}
sorted_results = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
```

**프로젝트 (수정 전):**
- 모든 카테고리의 평균 점수를 사용하거나 다른 로직 사용 가능

**프로젝트 (수정 후):**
```python
# ⭐ 노트북과 동일: 마지막 카테고리 점수만 사용
final_results = self.searcher.search_by_category(
    query_embedding=embeddings[category_order[-1]],
    category=category_order[-1],
    top_k=len(candidate_mb_sns),
    filter_mb_sns=candidate_mb_sns
)

final_scores = {}
for r in final_results:
    mb_sn = r.get("mb_sn", "")
    if mb_sn in candidate_mb_sns:
        score = r.get("score", 0.0)
        if mb_sn not in final_scores or score > final_scores[mb_sn]:
            final_scores[mb_sn] = score

# ⭐ 노트북과 동일: 마지막 카테고리 점수 기준으로 정렬
final_sorted = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
```

### 6.4 영향도

- **매우 높음**: 검색 수 결정과 정렬 로직은 최종 결과에 직접적인 영향을 미침
- **해결**: 모두 노트북과 동일하게 수정 완료

---

## 7. 필터만 검색 모드 (프로젝트 전용)

### 7.1 노트북

- 필터만 검색 모드 없음
- 항상 쿼리 텍스트가 있어야 함

### 7.2 프로젝트

**구현:**
```python
# 빈 쿼리 + 외부 필터만 있을 때
if (not query or not query.strip()) and external_filters:
    # 랜덤 벡터 생성 (Pinecone 검색에 필요하지만 유사도는 무시)
    dimension = 1536
    random_vector = np.random.rand(dimension).astype(np.float32).tolist()
    # 정규화
    norm = np.linalg.norm(random_vector)
    if norm > 0:
        random_vector = (np.array(random_vector) / norm).tolist()
    
    # 각 카테고리별로 동일한 랜덤 벡터 사용
    embeddings = {}
    for category in category_filters.keys():
        embeddings[category] = random_vector
```

**특징:**
- 유사도는 무시하고 메타데이터 필터만 적용
- 프론트엔드 UI에서 필터만 선택했을 때 사용

### 7.3 영향도

- **중간**: 노트북과 비교 시 이 모드는 사용하지 않아야 함
- **비교 시 주의사항**: 빈 쿼리 + 외부 필터 조합은 노트북에 없는 기능이므로 비교에서 제외

---

## 8. Fallback 로직 차이

### 8.1 노트북

```python
# 인원수만 있고 다른 메타데이터가 없는 경우
if final_count is not None and not metadata and not external_filters:
    # 쿼리 텍스트를 직접 임베딩해서 검색
    query_text_embedding = self.embedding_generator.generate(query)
    results = searcher.search_by_category(
        query_text_embedding,
        default_category,
        top_k=final_count * 10 if final_count else 10000,
        filter_mb_sns=None,
        metadata_filter=None
    )
    # 유사도 점수 기준으로 정렬
    sorted_results = sorted(results, key=lambda x: x.get("score", 0.0), reverse=True)
    final_results = sorted_results[:final_count] if final_count else sorted_results
```

### 8.2 프로젝트

- 노트북과 동일하게 구현됨

### 8.3 영향도

- **낮음**: Fallback 로직은 특수 케이스에서만 작동하므로 일반적인 검색 결과에는 영향 없음

---

## 9. 출력 형식 차이

### 9.1 노트북

```python
return final_mb_sns  # List[str]
```

### 9.2 프로젝트

```python
# mb_sn 리스트와 score 맵 반환
mb_sns = [r["mb_sn"] for r in final_results]
score_map = {r["mb_sn"]: r["score"] for r in final_results}

return {"mb_sns": mb_sns, "scores": score_map}  # Dict[str, Any]
```

### 9.3 영향도

- **낮음**: 출력 형식만 다를 뿐, 실제 검색 결과(mb_sns)는 동일해야 함
- **용도**: 프로젝트는 페이지네이션 정렬을 위해 유사도 점수가 필요

---

## 10. 종합 분석 및 권장사항

### 10.1 주요 차이점 요약

| 차이점 | 상태 | 영향도 | 비고 |
|--------|------|--------|------|
| LLM 모델 차이 | ✅ 수정 완료 | 높음 | haiku로 통일 |
| text_generator 호출 차이 | ✅ 수정 완료 | 중간 | full_metadata_dict 추가 |
| 무응답 필터링 | ✅ 수정 완료 | 높음 | 제거 |
| 결과 재정렬 | ✅ 수정 완료 | 높음 | 제거 |
| top_k 제한 | ✅ 수정 완료 | 높음 | 제거 |
| 초기 검색 수 결정 | ✅ 수정 완료 | 매우 높음 | 노트북과 동일 |
| 중간 검색 수 결정 | ✅ 수정 완료 | 매우 높음 | 노트북과 동일 |
| 최종 정렬 로직 | ✅ 수정 완료 | 매우 높음 | 마지막 카테고리 점수만 사용 |
| 외부 필터 처리 | ⚠️ 프로젝트 전용 | 높음 | 비교 시 제외 필요 |
| 필터만 검색 모드 | ⚠️ 프로젝트 전용 | 중간 | 비교 시 제외 필요 |
| 출력 형식 | ⚠️ 프로젝트 전용 | 낮음 | 단순 변환 가능 |

### 10.2 노트북과 비교 시 주의사항

1. **외부 필터 제외**: `external_filters=None`으로 테스트
2. **빈 쿼리 + 필터 조합 제외**: 노트북에 없는 기능
3. **출력 형식 변환**: `result["mb_sns"]`만 비교

### 10.3 검증 방법

```python
# 노트북과 동일한 조건으로 테스트
result = pipeline.search(
    query="서울 20대 여성",
    top_k=100,
    external_filters=None  # ⚠️ 외부 필터 제외
)

# mb_sns만 비교
mb_sns = result["mb_sns"]  # 프로젝트
# vs
mb_sns = notebook_result  # 노트북
```

### 10.4 남은 잠재적 차이점

1. **카테고리 순서**: `category_order`가 다를 수 있음
2. **메타데이터 추출 품질**: LLM 출력의 비결정성으로 인한 미세한 차이
3. **Pinecone 인덱스 상태**: 노트북과 프로젝트가 다른 시점의 인덱스를 사용할 수 있음
4. **환경 변수**: API 키, 인덱스 이름 등이 다를 수 있음

---

## 11. 결론

대부분의 주요 차이점은 수정 완료되었습니다. 남은 차이점은 주로 프로젝트 전용 기능(외부 필터, 필터만 검색 모드)이거나 출력 형식 차이입니다.

**노트북과 동일한 결과를 얻으려면:**
1. ✅ 모든 수정 사항이 적용되었는지 확인
2. ⚠️ `external_filters=None`으로 테스트
3. ⚠️ 출력 형식 변환 (`result["mb_sns"]`만 비교)
4. ⚠️ 동일한 Pinecone 인덱스 사용 확인

**여전히 결과가 다르다면:**
1. 카테고리 순서 확인
2. 메타데이터 추출 결과 비교 (LLM 비결정성)
3. Pinecone 인덱스 상태 확인
4. 환경 변수 확인

