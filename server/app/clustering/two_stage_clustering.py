import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from umap import UMAP
import joblib
import os
import sys

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 데이터 로드
csv_path = 'clustering_data/data/welcome_1st_2nd_joined.csv'
print(f"[데이터 로드] {csv_path}")

if not os.path.exists(csv_path):
    print(f"[ERROR] 파일을 찾을 수 없습니다: {csv_path}")
    sys.exit(1)

df = pd.read_csv(csv_path)
print(f"[OK] 원본 데이터: {len(df)}행, {len(df.columns)}열\n")

# 피처 (검증된 6개)
features = [
    'age_scaled',
    'Q6_scaled',
    'education_level_scaled',
    'Q8_count_scaled',
    'Q8_premium_index',
    'is_premium_car',
]

print(f"[피쳐 검증]")
available_features = []
for feat in features:
    if feat in df.columns:
        missing_ratio = df[feat].isna().sum() / len(df)
        variance = df[feat].var()
        if missing_ratio <= 0.3 and variance >= 0.01:
            available_features.append(feat)
            print(f"  [OK] {feat}")
        else:
            print(f"  [WARN] {feat}: 결측치 {missing_ratio:.1%}, 분산 {variance:.6f}")
    else:
        print(f"  [X] {feat}: 컬럼이 존재하지 않음")

if len(available_features) < 3:
    print("[ERROR] 사용 가능한 피쳐가 부족합니다.")
    sys.exit(1)

X = df[available_features].fillna(df[available_features].mean())
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("\n" + "=" * 80)
print("1단계: 특이 그룹 분리")
print("=" * 80)

# 1단계: 특이 그룹 찾기
kmeans_first = KMeans(n_clusters=3, random_state=42, n_init=20, max_iter=300)
labels_first = kmeans_first.fit_predict(X_scaled)

unique, counts = np.unique(labels_first, return_counts=True)
outlier_cluster = unique[np.argmin(counts)]  # 가장 작은 클러스터

print(f"\n특이 클러스터: {outlier_cluster}")
print(f"특이 그룹 크기: {counts.min():,}명 ({counts.min()/len(X_scaled)*100:.1f}%)")

# 클러스터별 크기 출력
print("\n1단계 클러스터 분포:")
for cid, count in zip(unique, counts):
    marker = " [특이]" if cid == outlier_cluster else ""
    print(f"  C{cid}: {count:,}명 ({count/len(X_scaled)*100:.1f}%){marker}")

# 2단계: 메인 그룹 추출
main_mask = labels_first != outlier_cluster
X_main = X_scaled[main_mask]
main_indices = np.where(main_mask)[0]  # 원본 인덱스 저장

print(f"\n메인 그룹 크기: {len(X_main):,}명 ({len(X_main)/len(X_scaled)*100:.1f}%)")

print("\n" + "=" * 80)
print("2단계: 메인 그룹 재클러스터링 (k=3~6 테스트)")
print("=" * 80)

# 최적 k 찾기
best_k = 3
best_score = 0
k_scores = {}

for k in range(3, 7):
    kmeans_temp = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=300)
    labels_temp = kmeans_temp.fit_predict(X_main)
    score = silhouette_score(X_main, labels_temp)
    k_scores[k] = score
    
    print(f"  k={k}: Silhouette={score:.4f}")
    
    if score > best_score:
        best_score = score
        best_k = k

print(f"\n[OK] 최적 k: {best_k}, Silhouette: {best_score:.4f}")

# 실루엣 점수 해석
if best_score >= 0.5:
    interpretation = "매우 좋음"
elif best_score >= 0.3:
    interpretation = "양호"
elif best_score >= 0.1:
    interpretation = "보통"
else:
    interpretation = "개선 필요"
print(f"  해석: {interpretation}")

# 3단계: 최종 클러스터링
print(f"\n[최종 클러스터링 실행] k={best_k}")
kmeans_final = KMeans(n_clusters=best_k, random_state=42, n_init=20, max_iter=300)
labels_main = kmeans_final.fit_predict(X_main)

# 4단계: 전체 레이블 구성
labels_final = np.full(len(X_scaled), -1)
labels_final[main_mask] = labels_main
labels_final[~main_mask] = 999  # 특이 그룹

# 5단계: UMAP (전체)
print("\n" + "=" * 80)
print("3단계: UMAP 2D 좌표 생성")
print("=" * 80)
umap_2d = UMAP(n_components=2, n_neighbors=15, min_dist=0.1, 
               metric='cosine', random_state=42)
coords_2d = umap_2d.fit_transform(X_scaled)
print("[OK] UMAP 완료")

# 결과 출력
print("\n" + "=" * 80)
print("최종 결과")
print("=" * 80)

unique_final, counts_final = np.unique(labels_final, return_counts=True)
n_clusters_total = len(unique_final)

print(f"\n총 클러스터 수: {n_clusters_total}개 (메인 {best_k}개 + 특이 1개)")
print(f"메인 그룹 실루엣 스코어: {best_score:.4f} ({interpretation})")

print("\n클러스터 분포:")
cluster_info = []
for cid in sorted(unique_final):
    count = (labels_final == cid).sum()
    percentage = count/len(labels_final)*100
    if cid == 999:
        cluster_info.append({'id': '특이 그룹', 'count': count, 'percentage': percentage})
        print(f"  [특이 그룹]: {count:,}명 ({percentage:.1f}%)")
    else:
        cluster_info.append({'id': f'Cluster {cid}', 'count': count, 'percentage': percentage})
        print(f"  Cluster {cid}: {count:,}명 ({percentage:.1f}%)")

# 메인 그룹만의 균형도 계산
main_cluster_counts = [c['count'] for c in cluster_info if c['id'] != '특이 그룹']
if main_cluster_counts:
    min_main = min(main_cluster_counts)
    max_main = max(main_cluster_counts)
    balance_ratio = min_main / max_main if max_main > 0 else 0
    
    if balance_ratio >= 0.7:
        balance_status = "매우 균형"
    elif balance_ratio >= 0.5:
        balance_status = "균형"
    elif balance_ratio >= 0.3:
        balance_status = "다소 불균형"
    else:
        balance_status = "불균형"
    
    print(f"\n메인 그룹 균형도: {balance_ratio:.2f} ({balance_status})")

# 저장
print("\n[결과 저장]")
output_dir = 'clustering_data/data'
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'two_stage_clustering.pkl')

results = {
    'coords': coords_2d,
    'labels': labels_final,
    'panel_ids': df['mb_sn'].tolist(),
    'features': available_features,
    'scaler': scaler,
    'umap_model': umap_2d,
    'kmeans_main': kmeans_final,
    'kmeans_first': kmeans_first,
    'outlier_cluster_id': 999,
    'outlier_original_id': int(outlier_cluster),
    'main_silhouette_score': best_score,
    'n_clusters': n_clusters_total,
    'n_main_clusters': best_k,
    'is_two_stage': True,
    'main_mask': main_mask,
    'k_scores': k_scores
}

joblib.dump(results, output_path)
print(f"[OK] 저장 완료: {output_path}")

# 결과 요약
print("\n" + "=" * 80)
print("결과 요약")
print("=" * 80)
print(f"1단계: 특이 그룹 분리 완료 ({counts.min()}명, {counts.min()/len(X_scaled)*100:.1f}%)")
print(f"2단계: 메인 그룹 재클러스터링 완료 (k={best_k}, 실루엣 {best_score:.4f})")
print(f"최종: 총 {n_clusters_total}개 클러스터 (메인 {best_k}개 + 특이 1개)")
if main_cluster_counts:
    print(f"메인 그룹 균형도: {balance_ratio:.2f} ({balance_status})")
print("=" * 80)


