from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from umap import UMAP
import pandas as pd
import numpy as np
import joblib
import os
import sys

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 1. 데이터 로드
csv_path = 'clustering_data/data/welcome_1st_2nd_joined.csv'
print(f"[1단계] 데이터 로드: {csv_path}")

if not os.path.exists(csv_path):
    print(f"[ERROR] 파일을 찾을 수 없습니다: {csv_path}")
    sys.exit(1)

df = pd.read_csv(csv_path)
print(f"[OK] 원본 데이터: {len(df)}행, {len(df.columns)}열")

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

X = df[available_features].fillna(df[available_features].mean())
print(f"[OK] 피처 매트릭스: {X.shape[0]}행 x {X.shape[1]}열")

# 2. StandardScaler 적용
print(f"\n[3단계] StandardScaler 적용")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print(f"[OK] 표준화 완료: 평균={X_scaled.mean():.6f}, 표준편차={X_scaled.std():.6f}")

# 3. PCA로 차원 축소 (10차원)
print(f"\n[4단계] PCA 차원 축소 (10차원)")
pca = PCA(n_components=10, random_state=42)
X_pca = pca.fit_transform(X_scaled)
explained_variance = pca.explained_variance_ratio_.sum()
print(f"[OK] PCA 완료: 설명 분산 {explained_variance:.2%}")
print(f"  각 주성분 설명 분산:")
for i, var in enumerate(pca.explained_variance_ratio_[:5], 1):
    print(f"    PC{i}: {var:.2%}")
if len(pca.explained_variance_ratio_) > 5:
    print(f"    ... (총 {len(pca.explained_variance_ratio_)}개 주성분)")

# 4. 최적 k 찾기
print(f"\n[5단계] 최적 k 찾기 (k=3, 4, 5 테스트)")
best_k = 3  # 기본값
best_silhouette = 0

for k in [3, 4, 5]:
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=300)
    labels = kmeans.fit_predict(X_pca)
    score = silhouette_score(X_pca, labels)
    print(f"  k={k}: Silhouette={score:.4f}")
    
    if score > best_silhouette:
        best_silhouette = score
        best_k = k

print(f"\n[OK] 최적 k: {best_k}, Silhouette: {best_silhouette:.4f}")

# 실루엣 점수 해석
if best_silhouette >= 0.5:
    interpretation = "매우 좋음"
elif best_silhouette >= 0.3:
    interpretation = "양호"
elif best_silhouette >= 0.1:
    interpretation = "보통"
else:
    interpretation = "개선 필요"
print(f"  해석: {interpretation}")

# 5. 최종 클러스터링
print(f"\n[6단계] 최종 클러스터링 (k={best_k})")
kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=20, max_iter=300)
labels_pca = kmeans.fit_predict(X_pca)
print(f"[OK] 클러스터링 완료")

# 6. UMAP 2D (시각화용)
print(f"\n[7단계] UMAP 2D 시각화 좌표 생성")
umap_2d = UMAP(n_components=2, n_neighbors=15, min_dist=0.1, 
               metric='cosine', random_state=42)
coords_2d = umap_2d.fit_transform(X_scaled)
print(f"[OK] UMAP 완료: {coords_2d.shape[0]}개 좌표 생성")

# 7. 클러스터 분포
print(f"\n[8단계] 클러스터 분포 분석")
unique, counts = np.unique(labels_pca, return_counts=True)
print("클러스터 분포:")
for cluster_id, count in zip(unique, counts):
    print(f"  Cluster {cluster_id}: {count}명 ({count/len(labels_pca)*100:.1f}%)")

# 클러스터 크기 균형도 계산
min_size = counts.min()
max_size = counts.max()
balance_ratio = min_size / max_size
print(f"\n클러스터 균형도: {balance_ratio:.2f} (1.0에 가까울수록 균형)")
if balance_ratio >= 0.7:
    balance_status = "매우 균형"
elif balance_ratio >= 0.5:
    balance_status = "균형"
elif balance_ratio >= 0.3:
    balance_status = "다소 불균형"
else:
    balance_status = "불균형"
print(f"  상태: {balance_status}")

# 8. 결과 저장
print(f"\n[9단계] 결과 저장")
output_dir = 'clustering_data/data'
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'improved_clustering.pkl')

results = {
    'coords': coords_2d,
    'labels': labels_pca,
    'panel_ids': df['mb_sn'].tolist(),
    'features': available_features,
    'scaler': scaler,
    'pca': pca,
    'umap_model': umap_2d,
    'kmeans_model': kmeans,
    'cluster_centers': kmeans.cluster_centers_,
    'silhouette_score': best_silhouette,
    'n_clusters': best_k,
    'explained_variance_ratio': pca.explained_variance_ratio_,
    'balance_ratio': balance_ratio
}

joblib.dump(results, output_path)
print(f"[OK] 저장 완료: {output_path}")

# 결과 요약
print("\n" + "=" * 80)
print("결과 요약")
print("=" * 80)
print(f"사용된 피처: {len(available_features)}개")
print(f"PCA 차원: {X_pca.shape[1]}차원 (설명 분산: {explained_variance:.2%})")
print(f"최적 클러스터 수: {best_k}개")
print(f"실루엣 점수: {best_silhouette:.4f} ({interpretation})")
print(f"클러스터 균형도: {balance_ratio:.2f} ({balance_status})")
print("=" * 80)


