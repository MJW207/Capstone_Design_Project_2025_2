# 클러스터링 실험 가이드

## 파일 위치

### 입력 데이터
- `dynamic_clustering/data/welcome_1st_2nd_joined.csv` - 원본 데이터

### 사전 클러스터링 결과
- `dynamic_clustering/data/precomputed/clustering_results.csv` - 클러스터링 결과 (k=3)
- `dynamic_clustering/data/precomputed/clustering_metadata.json` - 메타데이터
- `dynamic_clustering/data/precomputed/comparison_results.json` - 비교 분석 결과
- `dynamic_clustering/data/precomputed/cluster_profiles.json` - 클러스터 프로필

### 실험 결과
- `dynamic_clustering/data/experiments/experiment_results.json` - 실험 결과

## 사전 클러스터링 실행

### 기본 사전 클러스터링 (k=3)
```bash
python server/app/clustering/generate_precomputed_data.py
```

### 클러스터링 실험 (다양한 k 값 테스트)
```bash
python server/scripts/experiment_clustering.py
```

## 실험 내용

### 현재 실험 설정
- K-Means: k=3, 5, 7, 10
- MiniBatch K-Means: k=5, 7

### 평가 지표
- **Silhouette Score**: 높을수록 좋음 (클러스터 내 응집도, 클러스터 간 분리도)
- **Davies-Bouldin Index**: 낮을수록 좋음 (클러스터 간 거리)
- **Calinski-Harabasz Index**: 높을수록 좋음 (클러스터 간 분산 비율)

## 실험 결과 해석

1. **Silhouette Score가 높은 실험**: 클러스터가 잘 분리되어 있음
2. **Davies-Bouldin Index가 낮은 실험**: 클러스터 간 거리가 적절함
3. **Calinski-Harabasz Index가 높은 실험**: 클러스터 간 분산이 큼

## 다음 실험 아이디어

1. **다른 알고리즘 테스트**
   - HDBSCAN (노이즈 감지)
   - DBSCAN
   - Agglomerative Clustering

2. **피처 조합 실험**
   - 다른 피처 조합 테스트
   - 피처 선택 최적화

3. **k 값 최적화**
   - Elbow Method
   - Gap Statistic

4. **UMAP 파라미터 튜닝**
   - n_neighbors 조정
   - min_dist 조정

## 파일 구조

```
dynamic_clustering/
├── data/
│   ├── welcome_1st_2nd_joined.csv          # 원본 데이터
│   ├── precomputed/                        # 사전 클러스터링 결과
│   │   ├── clustering_results.csv
│   │   ├── clustering_metadata.json
│   │   ├── comparison_results.json
│   │   └── cluster_profiles.json
│   └── experiments/                        # 실험 결과
│       └── experiment_results.json
```

