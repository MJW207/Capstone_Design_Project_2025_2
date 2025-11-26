# 검색 로직 간섭 분석

## 개요
노트북의 순수한 검색 로직 외에 프로젝트에서 추가로 개입하는 로직들을 분석하여 검색 결과에 영향을 줄 수 있는 부분을 식별합니다.

---

## 1. 검색 파이프라인 전 단계 (API 레이어)

### 1.1 프론트엔드 필터 변환 (`PineconeFilterConverter`)
**위치**: `server/app/api/search.py:260-264`

```python
if filters_dict:
    converter = PineconeFilterConverter()
    external_filters = converter.convert_to_pinecone_filters(filters_dict)
```

**영향**:
- 프론트엔드 필터(`selectedGenders`, `selectedRegions`, `ageRange`, `selectedIncomes`)를 Pinecone 필터로 변환
- 노트북에는 없는 `external_filters` 파라미터로 파이프라인에 전달
- **검색 결과에 직접 영향**: 필터 조건이 추가되어 검색 범위가 좁아짐

**노트북과의 차이**:
- 노트북: 쿼리에서만 필터 추출
- 프로젝트: 쿼리 필터 + 프론트엔드 필터 (exclusive OR)

---

### 1.2 캐싱 로직
**위치**: `server/app/api/search.py:247-251, 283-287`

```python
# 캐시 확인
if use_cache and not force_refresh:
    cached_result = _get_cached_result(query_text, top_k)
    if cached_result is not None:
        return cached_result  # ⚠️ 파이프라인 실행 전에 캐시 반환

# 검색 성공 시 캐시 저장
if search_result is not None and use_cache:
    mb_sns = search_result.get("mb_sns", [])
    if mb_sns:
        _set_cached_result(query_text, top_k, mb_sns)
```

**영향**:
- 동일한 쿼리로 재검색 시 파이프라인을 거치지 않고 캐시된 결과 반환
- **검색 결과에 직접 영향**: 최신 데이터 반영 안 됨, LLM/임베딩 변경사항 반영 안 됨

**노트북과의 차이**:
- 노트북: 캐싱 없음 (매번 새로 검색)
- 프로젝트: 메모리 기반 캐싱 (최대 100개)

---

## 2. 검색 파이프라인 내부

### 2.1 external_filters 처리 로직
**위치**: `server/app/services/pinecone_pipeline.py:197-208`

```python
# ⭐ 옵션 2: 외부 필터와 쿼리 필터 중 하나만 사용 (병합하지 않음)
if external_filters:
    # 외부 필터가 있으면 외부 필터만 사용 (쿼리 필터 무시)
    logger.info(f"[2.5단계] 외부 필터만 사용 (쿼리 필터 무시): {external_filters}")
    category_filters.update(external_filters)
else:
    # 외부 필터가 없으면 쿼리에서 추출한 필터만 사용
    for category in classified.keys():
        cat_filter = self.filter_extractor.extract_filters(metadata, category)
        if cat_filter:
            category_filters[category] = cat_filter
```

**영향**:
- 프론트엔드 필터가 있으면 쿼리에서 추출한 필터를 완전히 무시
- **검색 결과에 직접 영향**: 쿼리 의미와 다른 필터 적용 가능

**노트북과의 차이**:
- 노트북: 쿼리 필터만 사용
- 프로젝트: external_filters 우선, 쿼리 필터 무시

---

### 2.2 필터만 검색 모드 (랜덤 벡터)
**위치**: `server/app/services/pinecone_pipeline.py:213-233`

```python
is_filter_only_search = (not query or not query.strip()) and external_filters and not metadata

if is_filter_only_search:
    logger.info("[검색] 필터만 검색 모드 - 임베딩 생성 생략, 메타데이터 필터만으로 검색")
    
    # 랜덤 벡터 생성 (Pinecone 검색에 필요하지만 유사도는 무시)
    import numpy as np
    dimension = 1536
    random_vector = np.random.rand(dimension).astype(np.float32).tolist()
    # ... 정규화 ...
    
    embeddings = {}
    for category in category_order:
        embeddings[category] = random_vector
```

**영향**:
- 빈 쿼리 + 필터만 있는 경우 랜덤 벡터 사용
- **검색 결과에 직접 영향**: 유사도 기반 정렬이 아닌 필터 조건만으로 검색 (순서가 랜덤에 가까움)

**노트북과의 차이**:
- 노트북: 빈 쿼리 처리 없음
- 프로젝트: 필터만 검색 모드 지원

---

### 2.3 텍스트 없을 때 랜덤 벡터 사용
**위치**: `server/app/services/pinecone_pipeline.py:264-276`

```python
if texts:
    embeddings = self.embedding_generator.generate(texts)
else:
    # 텍스트가 없으면 랜덤 벡터 사용
    logger.info("[4단계] 텍스트 없음, 랜덤 벡터 사용")
    random_vector = np.random.rand(dimension).astype(np.float32).tolist()
    # ... 정규화 ...
    embeddings = {}
    for category in classified.keys():
        embeddings[category] = random_vector
```

**영향**:
- 텍스트 생성 실패 시 랜덤 벡터로 검색
- **검색 결과에 직접 영향**: 유사도 기반 검색이 아닌 필터만으로 검색

**노트북과의 차이**:
- 노트북: 텍스트 없으면 검색 불가 (embeddings 비어있음)
- 프로젝트: 랜덤 벡터로 폴백

---

### 2.4 Fallback 로직 (인원수만 있을 때)
**위치**: `server/app/services/pinecone_pipeline.py:147-187`

```python
if not classified:
    # ⭐ 인원수만 있고 다른 메타데이터가 없는 경우: 쿼리 텍스트를 직접 임베딩해서 검색
    if final_count is not None and not metadata and not external_filters:
        logger.info(f"[Fallback] 인원수만 지정됨 ({final_count}명), 쿼리 텍스트 직접 검색으로 폴백")
        # 쿼리 텍스트를 직접 임베딩
        query_text_embedding = self.embedding_generator.generate(query)
        # Pinecone에서 검색 (필터 없이)
        results = searcher.search_by_category(...)
        # 유사도 점수 기준으로 정렬
        sorted_results = sorted(results, key=lambda x: x.get("score", 0.0), reverse=True)
        return mb_sns_with_scores
```

**영향**:
- 카테고리 분류 실패 시 쿼리 텍스트를 직접 임베딩하여 검색
- **검색 결과에 직접 영향**: 카테고리별 단계적 필터링 없이 단일 검색 수행

**노트북과의 차이**:
- 노트북: 카테고리 분류 실패 시 빈 결과 반환
- 프로젝트: Fallback으로 쿼리 직접 검색

---

## 3. 검색 파이프라인 후 단계 (결과 후처리)

### 3.1 페이지네이션 정렬 (`pinecone_panel_details.py`)
**위치**: `server/app/api/pinecone_panel_details.py:171-189`

```python
# ⭐ 노트북 기반 유사도로 정렬 후 페이지네이션 적용
if similarity_scores:
    # 유사도 점수 기준으로 정렬 (내림차순 - 높은 점수부터)
    sorted_mb_sn_list = sorted(
        mb_sn_list,
        key=lambda mb_sn: similarity_scores.get(mb_sn, 0.0),
        reverse=True
    )
else:
    # 유사도 점수가 없으면 원래 순서 유지
    sorted_mb_sn_list = mb_sn_list

# 페이지네이션 적용
paginated_mb_sn_list = sorted_mb_sn_list[start_idx:end_idx]
```

**영향**:
- 파이프라인에서 반환된 순서를 유사도 점수로 재정렬
- **검색 결과에 직접 영향**: 노트북과 동일한 순서 보장 (유사도 점수 기준)

**노트북과의 차이**:
- 노트북: 정렬 없음 (파이프라인에서 이미 정렬됨)
- 프로젝트: 유사도 점수로 재정렬 (페이지네이션 전)

---

### 3.2 merged_data 병합 (`pinecone_panel_details.py`)
**위치**: `server/app/api/pinecone_panel_details.py:193-310`

```python
# ⭐ merged 데이터도 함께 로드하여 metadata에 병합 (SummaryBar 통계 계산을 위해)
merged_data_map = await get_panels_from_merged_db_batch(paginated_mb_sn_list)

# merged 데이터를 metadata에 병합
if merged_data:
    # ⭐ 모든 merged_data 필드를 clean_metadata에 병합
    for key, value in merged_data.items():
        if key not in exclude_fields:
            clean_metadata[key] = value
```

**영향**:
- PostgreSQL의 `merged.panel_data` 테이블에서 추가 데이터 로드
- Pinecone 메타데이터와 병합하여 최종 결과 생성
- **검색 결과에 직접 영향 없음**: 검색 순서나 개수에는 영향 없음, 단지 표시용 데이터 보강

**노트북과의 차이**:
- 노트북: merged_data 병합 없음 (Pinecone 메타데이터만 사용)
- 프로젝트: merged_data 병합 (UI 표시용)

---

## 4. 검색 결과에 영향을 주는 로직 요약

### 4.1 검색 결과 순서/개수에 직접 영향
1. ✅ **프론트엔드 필터 변환** (`PineconeFilterConverter`)
   - 필터 조건 추가 → 검색 범위 축소
   
2. ✅ **external_filters 우선 처리**
   - 쿼리 필터 무시 → 다른 필터 조건 적용
   
3. ✅ **필터만 검색 모드 (랜덤 벡터)**
   - 유사도 기반 정렬 불가 → 순서가 랜덤에 가까움
   
4. ✅ **텍스트 없을 때 랜덤 벡터**
   - 유사도 기반 검색 불가 → 필터만으로 검색
   
5. ✅ **Fallback 로직 (인원수만 있을 때)**
   - 카테고리별 단계적 필터링 생략 → 단일 검색 수행
   
6. ✅ **페이지네이션 정렬**
   - 유사도 점수로 재정렬 → 순서 보장 (노트북과 동일)

### 4.2 검색 결과 순서/개수에 영향 없음 (표시용)
1. ❌ **merged_data 병합**
   - UI 표시용 데이터 보강만 수행
   
2. ❌ **캐싱 로직**
   - 검색 결과 자체에는 영향 없음 (단지 재사용)

---

## 5. 노트북과 다른 검색 결과가 나올 수 있는 시나리오

### 시나리오 1: 프론트엔드 필터 사용
```
노트북: "서울 20대 남자" → 쿼리에서 필터 추출 → 검색
프로젝트: "서울 20대 남자" + 프론트엔드 필터(연령대 30-40) → external_filters 우선 → 쿼리 필터 무시 → 다른 결과
```

### 시나리오 2: 필터만 검색
```
노트북: 빈 쿼리 → 검색 불가
프로젝트: 빈 쿼리 + 필터 → 랜덤 벡터로 검색 → 필터 조건만으로 검색 (순서 랜덤)
```

### 시나리오 3: 텍스트 생성 실패
```
노트북: 텍스트 없음 → embeddings 비어있음 → 검색 불가
프로젝트: 텍스트 없음 → 랜덤 벡터 사용 → 필터만으로 검색
```

### 시나리오 4: 카테고리 분류 실패
```
노트북: 분류 실패 → 빈 결과 반환
프로젝트: 분류 실패 → Fallback으로 쿼리 직접 검색 → 다른 결과
```

### 시나리오 5: 캐싱
```
노트북: 매번 새로 검색
프로젝트: 캐시된 결과 반환 → 최신 데이터 반영 안 됨
```

---

## 6. 검색 결과에 영향을 주지 않는 로직

### 6.1 merged_data 병합
- **목적**: UI 표시용 데이터 보강 (SummaryBar 통계 등)
- **영향**: 검색 순서/개수에 영향 없음
- **위치**: `pinecone_panel_details.py:193-310`

### 6.2 성능 측정 로깅
- **목적**: 각 단계별 시간 측정
- **영향**: 검색 결과에 영향 없음
- **위치**: 모든 서비스 파일

---

## 7. 권장 사항

### 7.1 노트북과 동일한 결과를 원하는 경우
1. **프론트엔드 필터 사용 안 함** (`filters_dict=None`)
2. **캐싱 비활성화** (`use_cache=False` 또는 `force_refresh=True`)
3. **빈 쿼리 + 필터 조합 피하기**
4. **텍스트 생성 실패 시 에러 처리** (랜덤 벡터 사용 안 함)

### 7.2 현재 로직 유지 시 주의사항
1. **프론트엔드 필터 사용 시**: 쿼리 필터가 무시됨을 인지
2. **캐싱**: 최신 데이터 필요 시 `force_refresh=True` 사용
3. **필터만 검색**: 순서가 랜덤에 가까울 수 있음
4. **Fallback**: 예상과 다른 검색 결과 가능

---

## 8. 검증 방법

### 8.1 노트북과 동일한 조건으로 검색
```python
# 프로젝트에서
pipeline.search(query="서울 20대 남자", top_k=30, external_filters=None)
```

### 8.2 로그 확인
- `[2.5단계]` 로그에서 어떤 필터가 사용되는지 확인
- `[검색] 필터만 검색 모드` 로그 확인
- `[Fallback]` 로그 확인

### 8.3 캐시 확인
- `/api/search/cache` 엔드포인트로 캐시 상태 확인
- `force_refresh=True`로 캐시 무시하고 검색

---

## 9. 결론

**검색 결과에 영향을 주는 주요 로직**:
1. ✅ **external_filters 우선 처리** (가장 큰 영향)
2. ✅ **필터만 검색 모드 (랜덤 벡터)**
3. ✅ **텍스트 없을 때 랜덤 벡터**
4. ✅ **Fallback 로직**
5. ✅ **캐싱** (재검색 시)

**검색 결과에 영향 없는 로직**:
1. ❌ **merged_data 병합** (표시용)
2. ❌ **성능 측정** (로깅만)

**노트북과 동일한 결과를 원하면**:
- `external_filters=None` 전달
- `use_cache=False` 또는 `force_refresh=True`
- 빈 쿼리 + 필터 조합 피하기

