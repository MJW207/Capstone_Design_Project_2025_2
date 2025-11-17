"""
클러스터링 실험 스크립트
다양한 k 값과 알고리즘으로 실험 수행
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from umap import UMAP
import json
import os
from pathlib import Path
import sys

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

print("=" * 80)
print("클러스터링 실험 스크립트")
print("=" * 80)

# 1. 데이터 로드
csv_path = 'clustering_data/data/welcome_1st_2nd_joined.csv'
print(f"\n[1단계] 데이터 로드: {csv_path}")

if not os.path.exists(csv_path):
    print(f"[ERROR] 파일을 찾을 수 없습니다: {csv_path}")
    sys.exit(1)

df = pd.read_csv(csv_path)
print(f"[OK] 원본 데이터: {len(df)}행, {len(df.columns)}열")

# 2. 피처 선택
features = [
    'age_scaled',
    'Q6_scaled',
    'education_level_scaled',
    'Q8_count_scaled',
    'Q8_premium_index',
    'is_premium_car',
]

print(f"\n[2단계] 피처 선택 및 검증")
available_features = []
for feat in features:
    if feat in df.columns:
        missing_ratio = df[feat].isna().sum() / len(df)
        variance = df[feat].var()
        if missing_ratio <= 0.3 and variance >= 0.01:
            available_features.append(feat)
            print(f"  [OK] {feat}: 사용 가능")
        else:
            print(f"  [WARN] {feat}: 결측치 {missing_ratio:.1%} 또는 분산 {variance:.6f}")
    else:
        print(f"  [X] {feat}: 컬럼이 존재하지 않음")

if len(available_features) < 3:
    print("[ERROR] 사용 가능한 피처가 3개 미만입니다.")
    sys.exit(1)

# 3. 전처리
print(f"\n[3단계] 전처리")
X = df[available_features].fillna(df[available_features].mean())
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print(f"[OK] 전처리 완료: {X_scaled.shape[0]}행 x {X_scaled.shape[1]}열")

# 4. 실험 설정
experiments = [
    {'name': 'K-Means k=3', 'algo': 'kmeans', 'k': 3},
    {'name': 'K-Means k=5', 'algo': 'kmeans', 'k': 5},
    {'name': 'K-Means k=7', 'algo': 'kmeans', 'k': 7},
    {'name': 'K-Means k=10', 'algo': 'kmeans', 'k': 10},
    {'name': 'MiniBatch K-Means k=5', 'algo': 'minibatch', 'k': 5},
    {'name': 'MiniBatch K-Means k=7', 'algo': 'minibatch', 'k': 7},
]

# 5. 실험 결과 저장 디렉토리
experiment_dir = Path('clustering_data/data/experiments')
experiment_dir.mkdir(parents=True, exist_ok=True)

results = []

print(f"\n[4단계] 클러스터링 실험 시작")
print("=" * 80)

for exp in experiments:
    print(f"\n[실험] {exp['name']}")
    print("-" * 80)
    
    try:
        # 알고리즘 선택
        if exp['algo'] == 'kmeans':
            model = KMeans(n_clusters=exp['k'], random_state=42, n_init=20, max_iter=300)
        elif exp['algo'] == 'minibatch':
            model = MiniBatchKMeans(n_clusters=exp['k'], random_state=42, batch_size=1024, max_iter=300)
        else:
            continue
        
        # 클러스터링 실행
        labels = model.fit_predict(X_scaled)
        
        # 클러스터 분포
        unique, counts = np.unique(labels, return_counts=True)
        cluster_dist = {int(cid): int(count) for cid, count in zip(unique, counts)}
        
        # 품질 지표 계산
        silhouette = silhouette_score(X_scaled, labels)
        davies_bouldin = davies_bouldin_score(X_scaled, labels)
        calinski_harabasz = calinski_harabasz_score(X_scaled, labels)
        
        # 결과 저장
        result = {
            'experiment': exp['name'],
            'algorithm': exp['algo'],
            'k': exp['k'],
            'n_samples': len(df),
            'n_clusters': len(unique),
            'cluster_distribution': cluster_dist,
            'silhouette_score': float(silhouette),
            'davies_bouldin_index': float(davies_bouldin),
            'calinski_harabasz_index': float(calinski_harabasz),
        }
        results.append(result)
        
        print(f"  클러스터 수: {len(unique)}")
        print(f"  Silhouette Score: {silhouette:.4f}")
        print(f"  Davies-Bouldin Index: {davies_bouldin:.4f}")
        print(f"  Calinski-Harabasz Index: {calinski_harabasz:.2f}")
        print(f"  클러스터 분포:")
        for cid, count in sorted(cluster_dist.items()):
            print(f"    Cluster {cid}: {count:,}명 ({count/len(labels)*100:.1f}%)")
        
    except Exception as e:
        print(f"  [ERROR] 실험 실패: {str(e)}")
        import traceback
        traceback.print_exc()

# 6. 결과 저장
print(f"\n[5단계] 실험 결과 저장")
results_file = experiment_dir / 'experiment_results.json'
with open(results_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"[OK] 결과 저장 완료: {results_file}")

# 7. 결과 요약
print(f"\n[6단계] 실험 결과 요약")
print("=" * 80)
print(f"{'실험명':<30} {'k':<5} {'Silhouette':<12} {'Davies-Bouldin':<15} {'Calinski-Harabasz':<18}")
print("-" * 80)
for r in results:
    print(f"{r['experiment']:<30} {r['k']:<5} {r['silhouette_score']:<12.4f} {r['davies_bouldin_index']:<15.4f} {r['calinski_harabasz_index']:<18.2f}")

# 최적 결과 찾기
best_silhouette = max(results, key=lambda x: x['silhouette_score'])
best_davies_bouldin = min(results, key=lambda x: x['davies_bouldin_index'])
best_calinski_harabasz = max(results, key=lambda x: x['calinski_harabasz_index'])

print(f"\n[최적 결과]")
print(f"  최고 Silhouette Score: {best_silhouette['experiment']} ({best_silhouette['silhouette_score']:.4f})")
print(f"  최저 Davies-Bouldin Index: {best_davies_bouldin['experiment']} ({best_davies_bouldin['davies_bouldin_index']:.4f})")
print(f"  최고 Calinski-Harabasz Index: {best_calinski_harabasz['experiment']} ({best_calinski_harabasz['calinski_harabasz_index']:.2f})")

print("\n" + "=" * 80)
print("실험 완료!")

