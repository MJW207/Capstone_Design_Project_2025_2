import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
import matplotlib.pyplot as plt
import os
import sys

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 데이터 로드
csv_path = 'clustering_data/data/welcome_1st_2nd_joined.csv'
print(f"[1단계] 데이터 로드: {csv_path}")

if not os.path.exists(csv_path):
    print(f"[ERROR] 파일을 찾을 수 없습니다: {csv_path}")
    sys.exit(1)

df = pd.read_csv(csv_path)
print(f"[OK] 원본 데이터: {len(df)}행, {len(df.columns)}열")

# 피처 선택
features = [
    'age_scaled', 'Q6_scaled', 'education_level_scaled', 'is_metro',
    'has_children', 'children_category_ordinal',
    'is_premium_car', 'is_premium_phone', 'is_apple_user', 'has_car', 
    'Q8_premium_count',
    'has_drinking_experience', 'drinking_types_count', 
    'has_smoking_experience', 'is_college_graduate'
]

print(f"\n[2단계] 피처 선택 및 검증")
print(f"요청된 피처 수: {len(features)}개")

# 피처 존재 여부 확인
available_features = []
missing_features = []

for feat in features:
    if feat in df.columns:
        # 결측치 비율 확인
        missing_ratio = df[feat].isna().sum() / len(df)
        if missing_ratio > 0.3:
            print(f"  [WARN] {feat}: 결측치 비율 {missing_ratio:.1%} (30% 초과, 제외)")
            missing_features.append(feat)
        else:
            # 분산 확인
            variance = df[feat].var()
            if variance < 0.01:
                print(f"  [WARN] {feat}: 분산 {variance:.6f} (0.01 미만, 제외)")
                missing_features.append(feat)
            else:
                available_features.append(feat)
                print(f"  [OK] {feat}: 사용 가능 (결측치 {missing_ratio:.1%}, 분산 {variance:.6f})")
    else:
        print(f"  [X] {feat}: 컬럼이 존재하지 않음")
        missing_features.append(feat)

print(f"\n사용 가능한 피처: {len(available_features)}개")
print(f"제외된 피처: {len(missing_features)}개")

if len(available_features) < 3:
    print("[ERROR] 사용 가능한 피처가 3개 미만입니다. 클러스터링을 수행할 수 없습니다.")
    sys.exit(1)

# 피처 매트릭스 구성
print(f"\n[3단계] 피처 매트릭스 구성")
X = df[available_features].fillna(df[available_features].mean())
print(f"[OK] 피처 매트릭스: {X.shape[0]}행 x {X.shape[1]}열")

# k=2부터 15까지 테스트
print(f"\n[4단계] k값 최적화 테스트 (k=2~15)")
k_range = range(2, 16)
results = {
    'k': [],
    'inertia': [],
    'silhouette': [],
    'calinski': [],
    'davies_bouldin': []
}

for k in k_range:
    print(f"Testing k={k}...")
    
    kmeans = KMeans(
        n_clusters=k,
        random_state=42,
        n_init=20,
        max_iter=300
    )
    labels = kmeans.fit_predict(X)
    
    results['k'].append(k)
    results['inertia'].append(kmeans.inertia_)
    results['silhouette'].append(silhouette_score(X, labels))
    results['calinski'].append(calinski_harabasz_score(X, labels))
    results['davies_bouldin'].append(davies_bouldin_score(X, labels))
    
    print(f"  Silhouette: {results['silhouette'][-1]:.4f}, "
          f"Calinski-Harabasz: {results['calinski'][-1]:.2f}, "
          f"Davies-Bouldin: {results['davies_bouldin'][-1]:.4f}")

# 결과 출력
results_df = pd.DataFrame(results)
print("\n" + "=" * 80)
print("=== 결과 요약 ===")
print("=" * 80)
print(results_df.to_string(index=False))

# 최적 k 찾기
best_k_silhouette = int(results_df.loc[results_df['silhouette'].idxmax(), 'k'])
best_k_calinski = int(results_df.loc[results_df['calinski'].idxmax(), 'k'])
best_k_davies = int(results_df.loc[results_df['davies_bouldin'].idxmin(), 'k'])

print("\n" + "=" * 80)
print("=== 최적 k값 분석 ===")
print("=" * 80)
print(f"최적 k (Silhouette Score): {best_k_silhouette} (점수: {results_df.loc[results_df['silhouette'].idxmax(), 'silhouette']:.4f})")
print(f"최적 k (Calinski-Harabasz): {best_k_calinski} (점수: {results_df.loc[results_df['calinski'].idxmax(), 'calinski']:.2f})")
print(f"최적 k (Davies-Bouldin): {best_k_davies} (점수: {results_df.loc[results_df['davies_bouldin'].idxmin(), 'davies_bouldin']:.4f})")

# 시각화
print(f"\n[5단계] 시각화 생성")
fig, axes = plt.subplots(2, 2, figsize=(15, 10))

# Elbow Method
axes[0, 0].plot(results['k'], results['inertia'], 'bo-', linewidth=2, markersize=8)
axes[0, 0].set_xlabel('k (클러스터 수)', fontsize=12)
axes[0, 0].set_ylabel('Inertia (왜곡)', fontsize=12)
axes[0, 0].set_title('Elbow Method (낮을수록 좋음)', fontsize=14, fontweight='bold')
axes[0, 0].grid(True, alpha=0.3)
axes[0, 0].axvline(x=best_k_silhouette, color='r', linestyle='--', alpha=0.5, label=f'Best k={best_k_silhouette}')
axes[0, 0].legend()

# Silhouette Score
axes[0, 1].plot(results['k'], results['silhouette'], 'ro-', linewidth=2, markersize=8)
axes[0, 1].set_xlabel('k (클러스터 수)', fontsize=12)
axes[0, 1].set_ylabel('Silhouette Score', fontsize=12)
axes[0, 1].set_title('Silhouette Analysis (높을수록 좋음)', fontsize=14, fontweight='bold')
axes[0, 1].axhline(y=0.5, color='g', linestyle='--', alpha=0.7, label='Very Good (0.5)')
axes[0, 1].axhline(y=0.3, color='y', linestyle='--', alpha=0.7, label='Fair (0.3)')
axes[0, 1].axvline(x=best_k_silhouette, color='r', linestyle='--', alpha=0.5, label=f'Best k={best_k_silhouette}')
axes[0, 1].legend()
axes[0, 1].grid(True, alpha=0.3)

# Calinski-Harabasz Score
axes[1, 0].plot(results['k'], results['calinski'], 'go-', linewidth=2, markersize=8)
axes[1, 0].set_xlabel('k (클러스터 수)', fontsize=12)
axes[1, 0].set_ylabel('Calinski-Harabasz Score', fontsize=12)
axes[1, 0].set_title('Calinski-Harabasz Index (높을수록 좋음)', fontsize=14, fontweight='bold')
axes[1, 0].axvline(x=best_k_calinski, color='r', linestyle='--', alpha=0.5, label=f'Best k={best_k_calinski}')
axes[1, 0].legend()
axes[1, 0].grid(True, alpha=0.3)

# Davies-Bouldin Score
axes[1, 1].plot(results['k'], results['davies_bouldin'], 'mo-', linewidth=2, markersize=8)
axes[1, 1].set_xlabel('k (클러스터 수)', fontsize=12)
axes[1, 1].set_ylabel('Davies-Bouldin Score', fontsize=12)
axes[1, 1].set_title('Davies-Bouldin Index (낮을수록 좋음)', fontsize=14, fontweight='bold')
axes[1, 1].axvline(x=best_k_davies, color='r', linestyle='--', alpha=0.5, label=f'Best k={best_k_davies}')
axes[1, 1].legend()
axes[1, 1].grid(True, alpha=0.3)

plt.tight_layout()

# 그래프 저장
output_dir = 'clustering_data/data'
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'optimal_k_analysis.png')
plt.savefig(output_path, dpi=300, bbox_inches='tight')
print(f"[OK] 그래프 저장: {output_path}")

# 결과 CSV 저장
csv_output_path = os.path.join(output_dir, 'optimal_k_results.csv')
results_df.to_csv(csv_output_path, index=False, encoding='utf-8-sig')
print(f"[OK] 결과 CSV 저장: {csv_output_path}")

print("\n" + "=" * 80)
print("분석 완료!")
print("=" * 80)


