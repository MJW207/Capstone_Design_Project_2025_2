# 클러스터링 모듈 사용 가이드

## 개요

모듈화된 클러스터링 시스템으로, 필터, 프로세서, 알고리즘을 자유롭게 교체하여 사용할 수 있습니다.

## 구조

```
server/app/clustering/
├── core/                    # 핵심 모듈
│   ├── strategy_manager.py  # 전략 결정
│   ├── feature_selector.py  # 피쳐 선택
│   ├── k_optimizer.py       # k 최적화
│   └── pipeline.py          # 동적 파이프라인
├── filters/                 # 필터 모듈
│   ├── base.py             # 필터 베이스 클래스
│   └── panel_filter.py     # 패널 필터 구현
├── processors/              # 프로세서 모듈
│   ├── base.py             # 프로세서 베이스 클래스
│   ├── vector_processor.py # 벡터 프로세서
│   └── embedding_processor.py # 임베딩 프로세서
├── algorithms/              # 알고리즘 모듈
│   ├── base.py             # 알고리즘 베이스 클래스
│   ├── kmeans.py           # K-Means
│   ├── minibatch_kmeans.py # MiniBatch K-Means
│   └── hdbscan.py          # HDBSCAN
├── integrated_pipeline.py  # 통합 파이프라인
├── artifacts.py            # 아티팩트 관리
└── compare.py              # 비교 분석
```

## 기본 사용법

### 1. 동적 전략 사용 (권장)

```python
from app.clustering import IntegratedClusteringPipeline
import pandas as pd

# 데이터 준비
df = pd.DataFrame(...)

# 파이프라인 생성 (기본값: 동적 전략)
pipeline = IntegratedClusteringPipeline()

# 클러스터링 실행
result = pipeline.cluster(df, verbose=True)

if result['success']:
    print(f"클러스터 수: {result['n_clusters']}")
    print(f"데이터: {result['data']}")
```

### 2. 커스텀 필터 사용

```python
from app.clustering import IntegratedClusteringPipeline, PanelFilter
from app.clustering.filters.base import BaseFilter

# 커스텀 필터 구현
class CustomFilter(BaseFilter):
    def filter(self, data, **kwargs):
        # 필터링 로직
        return filtered_data
    
    def get_filter_info(self):
        return {'type': 'CustomFilter'}

# 파이프라인에 적용
pipeline = IntegratedClusteringPipeline(
    filter=CustomFilter(),
    use_dynamic_strategy=False
)
```

### 3. 커스텀 프로세서 사용

```python
from app.clustering import IntegratedClusteringPipeline, VectorProcessor
from app.clustering.processors.base import BaseProcessor

# 커스텀 프로세서 구현
class CustomProcessor(BaseProcessor):
    def process(self, data, **kwargs):
        # 처리 로직
        return processed_array
    
    def get_processor_info(self):
        return {'type': 'CustomProcessor'}

# 파이프라인에 적용
pipeline = IntegratedClusteringPipeline(
    processor=CustomProcessor(),
    use_dynamic_strategy=False
)
```

### 4. 특정 알고리즘 사용

```python
from app.clustering import (
    IntegratedClusteringPipeline,
    KMeansAlgorithm,
    MiniBatchKMeansAlgorithm,
    HDBSCANAlgorithm
)

# K-Means 사용
pipeline = IntegratedClusteringPipeline(
    algorithm=KMeansAlgorithm(n_clusters=8),
    use_dynamic_strategy=False
)

# MiniBatch K-Means 사용 (대용량 데이터)
pipeline = IntegratedClusteringPipeline(
    algorithm=MiniBatchKMeansAlgorithm(n_clusters=8, batch_size=1024),
    use_dynamic_strategy=False
)

# HDBSCAN 사용 (노이즈 감지)
pipeline = IntegratedClusteringPipeline(
    algorithm=HDBSCANAlgorithm(min_cluster_size=5),
    use_dynamic_strategy=False
)
```

## API 사용

### 클러스터링 요청

```python
POST /api/clustering/cluster
{
    "panel_ids": ["panel1", "panel2", ...],
    "algo": "auto",  # "auto", "kmeans", "minibatch_kmeans", "hdbscan"
    "n_clusters": null,  # null이면 자동 선택
    "use_dynamic_strategy": true,
    "filter_params": {
        "age_range": [20, 30],
        "genders": ["M", "F"]
    },
    "processor_params": {
        "scaler_type": "standard"
    },
    "algorithm_params": {
        "n_clusters": 8
    }
}
```

### 비교 분석 요청

```python
POST /api/clustering/compare
{
    "session_id": "uuid",
    "c1": 0,
    "c2": 1
}
```

### UMAP 좌표 요청

```python
POST /api/clustering/umap
{
    "session_id": "uuid",
    "sample": 1000,
    "metric": "cosine",
    "n_neighbors": 15,
    "min_dist": 0.1,
    "seed": 42
}
```

## 확장 가이드

### 새로운 필터 추가

1. `BaseFilter`를 상속받아 클래스 생성
2. `filter()` 메서드 구현
3. `get_filter_info()` 메서드 구현

```python
from app.clustering.filters.base import BaseFilter

class MyCustomFilter(BaseFilter):
    def filter(self, data, **kwargs):
        # 필터링 로직
        return filtered_data
    
    def get_filter_info(self):
        return {'type': 'MyCustomFilter'}
```

### 새로운 프로세서 추가

1. `BaseProcessor`를 상속받아 클래스 생성
2. `process()` 메서드 구현
3. `get_processor_info()` 메서드 구현

```python
from app.clustering.processors.base import BaseProcessor

class MyCustomProcessor(BaseProcessor):
    def process(self, data, **kwargs):
        # 처리 로직
        return processed_array
    
    def get_processor_info(self):
        return {'type': 'MyCustomProcessor'}
```

### 새로운 알고리즘 추가

1. `BaseClusteringAlgorithm`을 상속받아 클래스 생성
2. `fit()`, `predict()`, `fit_predict()` 메서드 구현
3. `get_algorithm_info()` 메서드 구현

```python
from app.clustering.algorithms.base import BaseClusteringAlgorithm

class MyCustomAlgorithm(BaseClusteringAlgorithm):
    def fit(self, X, **kwargs):
        # 학습 로직
        return self
    
    def predict(self, X):
        # 예측 로직
        return labels
    
    def fit_predict(self, X, **kwargs):
        # 학습 및 예측
        return labels
    
    def get_algorithm_info(self):
        return {'type': 'MyCustomAlgorithm'}
```

## 동적 전략

동적 전략은 샘플 수에 따라 자동으로 최적의 클러스터링 방법을 선택합니다:

- **< 100명**: 프로파일링만 제공
- **100~500명**: Simple clustering (k=2~4)
- **500~3,000명**: Standard clustering (k=3~8)
- **3,000명 이상**: Advanced clustering (k=4~12)

## 아티팩트 관리

클러스터링 결과는 세션별로 저장됩니다:

```python
from app.clustering.artifacts import save_artifacts, load_artifacts, new_session_dir

# 세션 생성
session_dir = new_session_dir()

# 결과 저장
save_artifacts(session_dir, df, labels, meta)

# 결과 로드
artifacts = load_artifacts(session_id)
```

## 비교 분석

두 클러스터 간 비교 분석:

```python
from app.clustering.compare import compare_groups

comparison = compare_groups(
    df,
    labels,
    cluster_a=0,
    cluster_b=1,
    bin_cols=['has_car', 'has_children'],
    cat_cols=['region', 'education'],
    num_cols=['age', 'income']
)
```

## 예제

전체 예제는 `server/tests/` 디렉터리를 참고하세요.




