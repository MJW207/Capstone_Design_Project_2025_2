from sklearn.cluster import KMeans
from umap import UMAP
import pandas as pd
import numpy as np
import joblib
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

# UMAP 차원 축소
print(f"\n[4단계] UMAP 차원 축소 실행 중...")
umap = UMAP(
    n_components=2,
    n_neighbors=15,
    min_dist=0.1,
    metric='cosine',
    random_state=42
)
coords_2d = umap.fit_transform(X)
print(f"[OK] UMAP 완료: {coords_2d.shape[0]}개 좌표 생성")

# K-Means 클러스터링 (6개 클러스터)
print(f"\n[5단계] K-Means 클러스터링 실행 중...")
kmeans = KMeans(
    n_clusters=6,        # 원하는 클러스터 수
    random_state=42,
    n_init=20,           # 초기화 횟수
    max_iter=300
)
labels = kmeans.fit_predict(X)
print(f"[OK] K-Means 클러스터링 완료")

# 클러스터 분포 출력
print(f"\n클러스터 분포:")
unique, counts = np.unique(labels, return_counts=True)
for cluster_id, count in zip(unique, counts):
    print(f"  Cluster {cluster_id}: {count}명 ({count/len(labels)*100:.1f}%)")

# 실루엣 점수
from sklearn.metrics import silhouette_score
silhouette = silhouette_score(X, labels)
print(f"\n[6단계] 실루엣 점수 계산")
print(f"[OK] 실루엣 점수: {silhouette:.4f}")

# 실루엣 점수 해석
if silhouette >= 0.5:
    interpretation = "매우 좋음"
elif silhouette >= 0.3:
    interpretation = "양호"
elif silhouette >= 0.1:
    interpretation = "보통"
else:
    interpretation = "개선 필요"
print(f"  해석: {interpretation}")

# 결과 저장
print(f"\n[7단계] 결과 저장")
output_dir = 'clustering_data/data'
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'precomputed_clustering.pkl')

results = {
    'coords': coords_2d,
    'labels': labels,
    'panel_ids': df['mb_sn'].tolist(),
    'features': available_features,
    'umap_model': umap,
    'kmeans_model': kmeans,
    'cluster_centers': kmeans.cluster_centers_,
    'silhouette_score': silhouette,
    'n_clusters': 6
}

joblib.dump(results, output_path)
print(f"[OK] 저장 완료: {output_path}")

# 결과 요약
print(f"\n" + "=" * 80)
print("결과 요약")
print("=" * 80)
print(f"사용된 피처: {len(available_features)}개")
print(f"  {', '.join(available_features[:5])}{' ...' if len(available_features) > 5 else ''}")
print(f"생성된 클러스터: {len(unique)}개")
print(f"실루엣 점수: {silhouette:.4f} ({interpretation})")
print("=" * 80)


