"""
클러스터링 실험 및 시각화 스크립트
다양한 k 값으로 실험하고 결과를 분석하며 시각화 그래프 생성
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from umap import UMAP
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # 백엔드 설정 (GUI 없이 실행)
import seaborn as sns
import json
import os
from pathlib import Path
import sys

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'  # Windows
plt.rcParams['axes.unicode_minus'] = False  # 마이너스 기호 깨짐 방지

print("=" * 80)
print("클러스터링 실험 및 시각화 스크립트")
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

# 4. 실험 설정 (k=2부터 15까지)
k_values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]
experiments = [{'name': f'K-Means k={k}', 'algo': 'kmeans', 'k': k} for k in k_values]

# 5. 실험 결과 저장 디렉토리
experiment_dir = Path('clustering_data/data/experiments')
experiment_dir.mkdir(parents=True, exist_ok=True)
viz_dir = experiment_dir / 'visualizations'
viz_dir.mkdir(parents=True, exist_ok=True)

results = []
all_labels = {}  # 각 k 값별 라벨 저장
all_umap_coords = {}  # 각 k 값별 UMAP 좌표 저장

print(f"\n[4단계] 클러스터링 실험 시작")
print("=" * 80)

# UMAP은 한 번만 계산 (모든 실험에 공통 사용)
print(f"\n[UMAP 계산] 모든 실험에 공통 사용할 UMAP 좌표 계산 중...")
umap_model = UMAP(n_components=2, n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
umap_coords = umap_model.fit_transform(X_scaled)
print(f"[OK] UMAP 계산 완료")

for exp in experiments:
    print(f"\n[실험] {exp['name']}")
    print("-" * 80)
    
    try:
        # K-Means 클러스터링
        model = KMeans(n_clusters=exp['k'], random_state=42, n_init=20, max_iter=300)
        labels = model.fit_predict(X_scaled)
        
        # 클러스터 분포
        unique, counts = np.unique(labels, return_counts=True)
        cluster_dist = {int(cid): int(count) for cid, count in zip(unique, counts)}
        
        # 품질 지표 계산
        silhouette = silhouette_score(X_scaled, labels)
        davies_bouldin = davies_bouldin_score(X_scaled, labels)
        calinski_harabasz = calinski_harabasz_score(X_scaled, labels)
        
        # Inertia (WCSS: Within-Cluster Sum of Squares)
        inertia = model.inertia_
        
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
            'inertia': float(inertia),
        }
        results.append(result)
        all_labels[exp['k']] = labels
        all_umap_coords[exp['k']] = umap_coords
        
        print(f"  클러스터 수: {len(unique)}")
        print(f"  Silhouette Score: {silhouette:.4f}")
        print(f"  Davies-Bouldin Index: {davies_bouldin:.4f}")
        print(f"  Calinski-Harabasz Index: {calinski_harabasz:.2f}")
        print(f"  Inertia (WCSS): {inertia:.2f}")
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

# 7. 시각화 생성
print(f"\n[6단계] 시각화 그래프 생성")
print("=" * 80)

# 7-1. 평가 지표 비교 그래프
print("[그래프 1] 평가 지표 비교")
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle('클러스터링 평가 지표 비교 (k 값별)', fontsize=16, fontweight='bold')

k_vals = [r['k'] for r in results]
silhouette_scores = [r['silhouette_score'] for r in results]
davies_bouldin_scores = [r['davies_bouldin_index'] for r in results]
calinski_harabasz_scores = [r['calinski_harabasz_index'] for r in results]
inertias = [r['inertia'] for r in results]

# Silhouette Score
axes[0, 0].plot(k_vals, silhouette_scores, marker='o', linewidth=2, markersize=8, color='#3B82F6')
axes[0, 0].set_xlabel('k (클러스터 수)', fontsize=12)
axes[0, 0].set_ylabel('Silhouette Score', fontsize=12)
axes[0, 0].set_title('Silhouette Score (높을수록 좋음)', fontsize=13, fontweight='bold')
axes[0, 0].grid(True, alpha=0.3)
axes[0, 0].set_xticks(k_vals)

# Davies-Bouldin Index
axes[0, 1].plot(k_vals, davies_bouldin_scores, marker='s', linewidth=2, markersize=8, color='#EF4444')
axes[0, 1].set_xlabel('k (클러스터 수)', fontsize=12)
axes[0, 1].set_ylabel('Davies-Bouldin Index', fontsize=12)
axes[0, 1].set_title('Davies-Bouldin Index (낮을수록 좋음)', fontsize=13, fontweight='bold')
axes[0, 1].grid(True, alpha=0.3)
axes[0, 1].set_xticks(k_vals)

# Calinski-Harabasz Index
axes[1, 0].plot(k_vals, calinski_harabasz_scores, marker='^', linewidth=2, markersize=8, color='#10B981')
axes[1, 0].set_xlabel('k (클러스터 수)', fontsize=12)
axes[1, 0].set_ylabel('Calinski-Harabasz Index', fontsize=12)
axes[1, 0].set_title('Calinski-Harabasz Index (높을수록 좋음)', fontsize=13, fontweight='bold')
axes[1, 0].grid(True, alpha=0.3)
axes[1, 0].set_xticks(k_vals)

# Elbow Method (Inertia)
axes[1, 1].plot(k_vals, inertias, marker='d', linewidth=2, markersize=8, color='#8B5CF6')
axes[1, 1].set_xlabel('k (클러스터 수)', fontsize=12)
axes[1, 1].set_ylabel('Inertia (WCSS)', fontsize=12)
axes[1, 1].set_title('Elbow Method (Inertia)', fontsize=13, fontweight='bold')
axes[1, 1].grid(True, alpha=0.3)
axes[1, 1].set_xticks(k_vals)

plt.tight_layout()
metrics_file = viz_dir / 'evaluation_metrics.png'
plt.savefig(metrics_file, dpi=300, bbox_inches='tight')
plt.close()
print(f"  [OK] 저장 완료: {metrics_file}")

# 7-2. 클러스터 분포 비교 (선택된 k 값들)
print("[그래프 2] 클러스터 분포 비교")
selected_k = [3, 5, 7, 10]
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle('클러스터 분포 비교 (k 값별)', fontsize=16, fontweight='bold')

axes_flat = axes.flatten()
for idx, k in enumerate(selected_k):
    if k in all_labels:
        labels = all_labels[k]
        unique, counts = np.unique(labels, return_counts=True)
        colors = plt.cm.Set3(np.linspace(0, 1, len(unique)))
        
        axes_flat[idx].pie(counts, labels=[f'Cluster {cid}' for cid in unique], 
                          autopct='%1.1f%%', startangle=90, colors=colors)
        axes_flat[idx].set_title(f'k={k} (총 {len(unique)}개 클러스터)', fontsize=13, fontweight='bold')

plt.tight_layout()
distribution_file = viz_dir / 'cluster_distribution.png'
plt.savefig(distribution_file, dpi=300, bbox_inches='tight')
plt.close()
print(f"  [OK] 저장 완료: {distribution_file}")

# 7-3. UMAP 시각화 (선택된 k 값들)
print("[그래프 3] UMAP 시각화")
fig, axes = plt.subplots(2, 2, figsize=(18, 16))
fig.suptitle('UMAP 2D 시각화 (k 값별)', fontsize=16, fontweight='bold')

axes_flat = axes.flatten()
for idx, k in enumerate(selected_k):
    if k in all_labels and k in all_umap_coords:
        labels = all_labels[k]
        coords = all_umap_coords[k]
        
        scatter = axes_flat[idx].scatter(coords[:, 0], coords[:, 1], c=labels, 
                                         cmap='tab20', s=1, alpha=0.6, edgecolors='none')
        axes_flat[idx].set_xlabel('UMAP 1', fontsize=11)
        axes_flat[idx].set_ylabel('UMAP 2', fontsize=11)
        axes_flat[idx].set_title(f'k={k} (클러스터 수: {len(np.unique(labels))})', 
                                fontsize=13, fontweight='bold')
        axes_flat[idx].grid(True, alpha=0.3)
        plt.colorbar(scatter, ax=axes_flat[idx], label='Cluster ID')

plt.tight_layout()
umap_file = viz_dir / 'umap_visualization.png'
plt.savefig(umap_file, dpi=300, bbox_inches='tight')
plt.close()
print(f"  [OK] 저장 완료: {umap_file}")

# 7-4. 종합 비교 테이블
print("[그래프 4] 종합 비교 테이블")
fig, ax = plt.subplots(figsize=(14, 8))
ax.axis('tight')
ax.axis('off')

table_data = []
for r in results:
    table_data.append([
        r['k'],
        f"{r['silhouette_score']:.4f}",
        f"{r['davies_bouldin_index']:.4f}",
        f"{r['calinski_harabasz_index']:.2f}",
        f"{r['inertia']:.0f}",
        len(r['cluster_distribution'])
    ])

table = ax.table(cellText=table_data,
                colLabels=['k', 'Silhouette', 'Davies-Bouldin', 'Calinski-Harabasz', 'Inertia', '클러스터 수'],
                cellLoc='center',
                loc='center',
                bbox=[0, 0, 1, 1])

table.auto_set_font_size(False)
table.set_fontsize(10)
table.scale(1, 2)

# 헤더 스타일
for i in range(6):
    table[(0, i)].set_facecolor('#3B82F6')
    table[(0, i)].set_text_props(weight='bold', color='white')

# 최적 값 강조
best_silhouette_k = max(results, key=lambda x: x['silhouette_score'])['k']
best_davies_k = min(results, key=lambda x: x['davies_bouldin_index'])['k']
best_calinski_k = max(results, key=lambda x: x['calinski_harabasz_index'])['k']

for i, r in enumerate(results):
    row_idx = i + 1
    if r['k'] == best_silhouette_k:
        table[(row_idx, 1)].set_facecolor('#D1FAE5')  # 녹색
    if r['k'] == best_davies_k:
        table[(row_idx, 2)].set_facecolor('#FEE2E2')  # 빨간색
    if r['k'] == best_calinski_k:
        table[(row_idx, 3)].set_facecolor('#DBEAFE')  # 파란색

plt.title('클러스터링 실험 결과 종합 비교', fontsize=16, fontweight='bold', pad=20)
table_file = viz_dir / 'comparison_table.png'
plt.savefig(table_file, dpi=300, bbox_inches='tight')
plt.close()
print(f"  [OK] 저장 완료: {table_file}")

# 7-5. 클러스터 크기 분포 (바 차트)
print("[그래프 5] 클러스터 크기 분포")
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle('클러스터 크기 분포 (k 값별)', fontsize=16, fontweight='bold')

axes_flat = axes.flatten()
for idx, k in enumerate(selected_k):
    if k in all_labels:
        labels = all_labels[k]
        unique, counts = np.unique(labels, return_counts=True)
        sorted_indices = np.argsort(counts)[::-1]  # 크기 순 정렬
        
        bars = axes_flat[idx].bar(range(len(unique)), counts[sorted_indices], 
                                  color=plt.cm.Set3(np.linspace(0, 1, len(unique))))
        axes_flat[idx].set_xlabel('클러스터 ID (크기 순)', fontsize=11)
        axes_flat[idx].set_ylabel('패널 수', fontsize=11)
        axes_flat[idx].set_title(f'k={k} (총 {len(unique)}개 클러스터)', fontsize=13, fontweight='bold')
        axes_flat[idx].set_xticks(range(len(unique)))
        axes_flat[idx].set_xticklabels([f'C{unique[i]}' for i in sorted_indices], rotation=45)
        axes_flat[idx].grid(True, alpha=0.3, axis='y')
        
        # 값 표시
        for i, (bar, count) in enumerate(zip(bars, counts[sorted_indices])):
            height = bar.get_height()
            axes_flat[idx].text(bar.get_x() + bar.get_width()/2., height,
                               f'{int(count):,}',
                               ha='center', va='bottom', fontsize=9)

plt.tight_layout()
size_dist_file = viz_dir / 'cluster_size_distribution.png'
plt.savefig(size_dist_file, dpi=300, bbox_inches='tight')
plt.close()
print(f"  [OK] 저장 완료: {size_dist_file}")

# 8. 결과 요약
print(f"\n[7단계] 실험 결과 요약")
print("=" * 80)
print(f"{'실험명':<20} {'k':<5} {'Silhouette':<12} {'Davies-Bouldin':<15} {'Calinski-Harabasz':<18} {'Inertia':<12}")
print("-" * 80)
for r in results:
    print(f"{r['experiment']:<20} {r['k']:<5} {r['silhouette_score']:<12.4f} {r['davies_bouldin_index']:<15.4f} {r['calinski_harabasz_index']:<18.2f} {r['inertia']:<12.0f}")

# 최적 결과 찾기
best_silhouette = max(results, key=lambda x: x['silhouette_score'])
best_davies_bouldin = min(results, key=lambda x: x['davies_bouldin_index'])
best_calinski_harabasz = max(results, key=lambda x: x['calinski_harabasz_index'])

print(f"\n[최적 결과]")
print(f"  최고 Silhouette Score: {best_silhouette['experiment']} ({best_silhouette['silhouette_score']:.4f})")
print(f"  최저 Davies-Bouldin Index: {best_davies_bouldin['experiment']} ({best_davies_bouldin['davies_bouldin_index']:.4f})")
print(f"  최고 Calinski-Harabasz Index: {best_calinski_harabasz['experiment']} ({best_calinski_harabasz['calinski_harabasz_index']:.2f})")

print(f"\n[생성된 시각화 파일]")
print(f"  1. 평가 지표 비교: {viz_dir / 'evaluation_metrics.png'}")
print(f"  2. 클러스터 분포 비교: {viz_dir / 'cluster_distribution.png'}")
print(f"  3. UMAP 시각화: {viz_dir / 'umap_visualization.png'}")
print(f"  4. 종합 비교 테이블: {viz_dir / 'comparison_table.png'}")
print(f"  5. 클러스터 크기 분포: {viz_dir / 'cluster_size_distribution.png'}")

print("\n" + "=" * 80)
print("실험 및 시각화 완료!")

