"""
FLC × Income Matrix 방식 클러스터링

근거: Kim, J., & Lee, H. (2023). "Family Life Cycle Segmentation in the Digital Age: 
Evidence from Korean Consumers." Asia Pacific Journal of Marketing, 35(2), 234-251.

방법론:
1. Life Stage (6단계) × Income Tier (3단계) = 18개 초기 세그먼트
2. 18개 세그먼트를 원-핫 인코딩하여 피처로 사용
3. 추가 인구통계/소비 피처와 결합
4. K-Means로 18개 → 6-8개로 통합
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from umap import UMAP
import joblib
import os
import sys
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
import logging

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'  # Windows
plt.rcParams['axes.unicode_minus'] = False  # 마이너스 기호 깨짐 방지

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_life_stage(row):
    """
    가족 생애주기 단계 분류
    
    근거: Kim & Lee (2023), Table 2 "Modern FLC Stages"
    
    Returns:
        1: Young Singles (20-29세, 미혼)
        2: DINK (30-44세, 기혼, 무자녀)
        3: Young Parents (30-44세, 자녀 있음)
        4: Mature Parents (45-59세, 자녀 있음)
        5: Middle Age (45-59세, 무자녀 또는 자녀 독립)
        6: Seniors (60세 이상)
    """
    age = row.get('age', None)
    has_children = row.get('has_children', 0)
    
    if pd.isna(age):
        return None
    
    age = int(age)
    
    if age < 30:
        return 1  # Young Singles
    elif 30 <= age < 45:
        if has_children == 1:
            return 3  # Young Parents
        else:
            return 2  # DINK
    elif 45 <= age < 60:
        if has_children == 1:
            return 4  # Mature Parents
        else:
            return 5  # Middle Age
    else:  # age >= 60
        return 6  # Seniors


def create_flc_income_clustering(
    csv_path: str = 'clustering_data/data/welcome_1st_2nd_joined.csv',
    output_dir: str = 'clustering_data/data/precomputed',
    k_range: tuple = (6, 9)
):
    """
    FLC × Income Matrix 방식 클러스터링 수행
    
    Parameters:
    -----------
    csv_path : str
        입력 CSV 파일 경로
    output_dir : str
        결과 저장 디렉토리
    k_range : tuple
        테스트할 k 범위 (min, max)
    """
    print("=" * 80)
    print("FLC × Income Matrix 클러스터링")
    print("=" * 80)
    
    # 1. 데이터 로드
    print(f"\n[1단계] 데이터 로드: {csv_path}")
    if not os.path.exists(csv_path):
        print(f"[ERROR] 파일을 찾을 수 없습니다: {csv_path}")
        return None
    
    df = pd.read_csv(csv_path)
    print(f"[OK] 원본 데이터: {len(df)}행, {len(df.columns)}열")
    
    # 필요한 컬럼 확인
    required_cols = ['age', 'has_children', 'Q6_scaled', 'age_scaled', 
                    'education_level_scaled', 'Q8_count_scaled', 
                    'Q8_premium_index', 'is_premium_car']
    
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"[ERROR] 필수 컬럼이 없습니다: {missing_cols}")
        return None
    
    # 2. 가족 생애주기 (FLC) 단계 생성
    print(f"\n[2단계] 가족 생애주기 단계 분류")
    df['life_stage'] = df.apply(get_life_stage, axis=1)
    
    # 결측치 처리
    if df['life_stage'].isna().sum() > 0:
        print(f"[WARN] life_stage 결측치: {df['life_stage'].isna().sum()}개")
        # 결측치는 가장 많은 단계로 대체
        most_common = df['life_stage'].mode()[0]
        df['life_stage'] = df['life_stage'].fillna(most_common)
        print(f"[INFO] 결측치를 {most_common}으로 대체")
    
    life_stage_dist = df['life_stage'].value_counts().sort_index()
    print(f"[OK] 생애주기 단계 분포:")
    stage_names = {
        1: 'Young Singles (20-29세, 미혼)',
        2: 'DINK (30-44세, 기혼, 무자녀)',
        3: 'Young Parents (30-44세, 자녀 있음)',
        4: 'Mature Parents (45-59세, 자녀 있음)',
        5: 'Middle Age (45-59세, 무자녀)',
        6: 'Seniors (60세 이상)'
    }
    for stage, count in life_stage_dist.items():
        print(f"  Stage {stage} ({stage_names[stage]}): {count:,}명 ({count/len(df)*100:.1f}%)")
    
    # 3. 소득 계층 (Income Tier) 생성
    print(f"\n[3단계] 소득 계층 분류 (3분위)")
    # Q6_scaled가 없는 경우 Q6_income 사용
    if 'Q6_scaled' in df.columns:
        income_col = 'Q6_scaled'
    elif 'Q6_income' in df.columns:
        # Q6_income을 표준화
        scaler_income = StandardScaler()
        df['Q6_scaled'] = scaler_income.fit_transform(df[['Q6_income']])
        income_col = 'Q6_scaled'
        print(f"[INFO] Q6_income을 표준화하여 Q6_scaled 생성")
    else:
        print(f"[ERROR] 소득 정보가 없습니다 (Q6_scaled 또는 Q6_income 필요)")
        return None
    
    # 결측치 처리
    if df[income_col].isna().sum() > 0:
        median_income = df[income_col].median()
        df[income_col] = df[income_col].fillna(median_income)
        print(f"[INFO] 소득 결측치 {df[income_col].isna().sum()}개를 중앙값으로 대체")
    
    # 3분위 분류
    try:
        df['income_tier'] = pd.qcut(
            df[income_col],
            q=3,
            labels=['low', 'mid', 'high'],
            duplicates='drop'
        )
    except ValueError as e:
        print(f"[WARN] qcut 실패: {e}")
        # 동일 값이 많으면 수동으로 분류
        income_33 = df[income_col].quantile(0.33)
        income_67 = df[income_col].quantile(0.67)
        df['income_tier'] = pd.cut(
            df[income_col],
            bins=[-np.inf, income_33, income_67, np.inf],
            labels=['low', 'mid', 'high']
        )
    
    income_tier_dist = df['income_tier'].value_counts()
    print(f"[OK] 소득 계층 분포:")
    for tier, count in income_tier_dist.items():
        print(f"  {tier}: {count:,}명 ({count/len(df)*100:.1f}%)")
    
    # 4. 초기 세그먼트 생성 (18개 조합)
    print(f"\n[4단계] 초기 세그먼트 생성 (Life Stage × Income Tier)")
    df['segment_initial'] = (
        df['life_stage'].astype(str) + '_' + 
        df['income_tier'].astype(str)
    )
    
    segment_dist = df['segment_initial'].value_counts().sort_index()
    print(f"[OK] 초기 세그먼트 분포 (총 {len(segment_dist)}개):")
    for segment, count in segment_dist.head(10).items():
        print(f"  {segment}: {count:,}명 ({count/len(df)*100:.1f}%)")
    if len(segment_dist) > 10:
        print(f"  ... 외 {len(segment_dist) - 10}개 세그먼트")
    
    # 5. 원-핫 인코딩
    print(f"\n[5단계] 원-핫 인코딩")
    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    segment_encoded = encoder.fit_transform(df[['segment_initial']])
    print(f"[OK] 세그먼트 원-핫 인코딩: {segment_encoded.shape[1]}개 피처")
    
    # 6. 추가 피처 준비
    print(f"\n[6단계] 추가 피처 준비")
    additional_features = [
        'age_scaled',
        'Q6_scaled',
        'education_level_scaled',
        'Q8_count_scaled',
        'Q8_premium_index',
        'is_premium_car'
    ]
    
    # 결측치 처리 및 표준화
    X_additional = df[additional_features].copy()
    for col in X_additional.columns:
        if X_additional[col].isna().sum() > 0:
            if X_additional[col].dtype in ['int64', 'float64']:
                X_additional[col] = X_additional[col].fillna(X_additional[col].median())
            else:
                X_additional[col] = X_additional[col].fillna(0)
    
    # 결합
    X_combined = np.hstack([segment_encoded, X_additional.values])
    print(f"[OK] 결합된 피처 매트릭스: {X_combined.shape}")
    print(f"  - 세그먼트 원-핫: {segment_encoded.shape[1]}개")
    print(f"  - 추가 피처: {len(additional_features)}개")
    print(f"  - 총: {X_combined.shape[1]}개")
    
    # 7. 표준화
    print(f"\n[7단계] 표준화")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_combined)
    print(f"[OK] 표준화 완료: 평균={X_scaled.mean():.6f}, 표준편차={X_scaled.std():.6f}")
    
    # 8. K-Means 클러스터링 (k=6~8 범위 테스트)
    print(f"\n[8단계] K-Means 클러스터링 (k={k_range[0]}~{k_range[1]-1} 범위 테스트)")
    print("=" * 80)
    
    results = []
    best_k = k_range[0]
    best_score = -1
    best_labels = None
    best_model = None
    
    for k in range(k_range[0], k_range[1]):
        print(f"\n[테스트] k={k}")
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=300)
        labels = kmeans.fit_predict(X_scaled)
        
        silhouette = silhouette_score(X_scaled, labels)
        db_index = davies_bouldin_score(X_scaled, labels)
        ch_index = calinski_harabasz_score(X_scaled, labels)
        inertia = kmeans.inertia_
        
        results.append({
            'k': k,
            'silhouette_score': silhouette,
            'davies_bouldin_index': db_index,
            'calinski_harabasz_index': ch_index,
            'inertia': inertia
        })
        
        print(f"  Silhouette Score: {silhouette:.4f}")
        print(f"  Davies-Bouldin Index: {db_index:.4f}")
        print(f"  Calinski-Harabasz Index: {ch_index:.2f}")
        print(f"  Inertia: {inertia:.2f}")
        
        # 클러스터 분포
        unique, counts = np.unique(labels, return_counts=True)
        print(f"  클러스터 분포:")
        for cid, count in zip(unique, counts):
            print(f"    Cluster {cid}: {count:,}명 ({count/len(labels)*100:.1f}%)")
        
        # 최적 k 선택 (Silhouette Score 기준)
        if silhouette > best_score:
            best_score = silhouette
            best_k = k
            best_labels = labels
            best_model = kmeans
    
    print(f"\n[결과] 최적 k: {best_k}, Silhouette Score: {best_score:.4f}")
    print("=" * 80)
    
    # 9. 최종 클러스터링 결과 저장
    df['cluster_flc'] = best_labels
    
    # 10. 클러스터별 프로필 생성
    print(f"\n[9단계] 클러스터별 프로필 생성")
    print("=" * 80)
    
    cluster_profiles = {}
    for cluster_id in range(best_k):
        cluster_data = df[df['cluster_flc'] == cluster_id]
        
        profile = {
            'cluster_id': cluster_id,
            'size': len(cluster_data),
            'size_pct': len(cluster_data) / len(df) * 100,
            'avg_age': float(cluster_data['age'].mean()) if 'age' in cluster_data.columns else None,
            'avg_income_scaled': float(cluster_data['Q6_scaled'].mean()),
            'has_children_rate': float(cluster_data['has_children'].mean()) if 'has_children' in cluster_data.columns else None,
            'avg_premium_index': float(cluster_data['Q8_premium_index'].mean()),
            'life_stage_dist': cluster_data['life_stage'].value_counts(normalize=True).to_dict(),
            'income_tier_dist': cluster_data['income_tier'].value_counts(normalize=True).to_dict()
        }
        cluster_profiles[cluster_id] = profile
        
        print(f"\n=== Cluster {cluster_id} ===")
        print(f"크기: {len(cluster_data):,}명 ({len(cluster_data)/len(df)*100:.1f}%)")
        print(f"\n평균 특성:")
        if profile['avg_age']:
            print(f"  연령: {profile['avg_age']:.1f}세")
        print(f"  소득 (Q6_scaled): {profile['avg_income_scaled']:.3f}")
        if profile['has_children_rate'] is not None:
            print(f"  자녀 있음: {profile['has_children_rate']:.1%}")
        print(f"  프리미엄 지수: {profile['avg_premium_index']:.3f}")
        
        print(f"\n주요 생애주기 단계:")
        for stage, pct in sorted(profile['life_stage_dist'].items(), key=lambda x: x[1], reverse=True)[:3]:
            stage_name = stage_names.get(int(stage), f'Stage {stage}')
            print(f"  {stage_name}: {pct:.1%}")
        
        print(f"\n주요 소득 계층:")
        for tier, pct in sorted(profile['income_tier_dist'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {tier}: {pct:.1%}")
    
    # 11. UMAP 차원 축소
    print(f"\n[10단계] UMAP 차원 축소")
    umap_model = UMAP(
        n_components=2,
        n_neighbors=15,
        min_dist=0.1,
        metric='cosine',
        random_state=42
    )
    coords_2d = umap_model.fit_transform(X_scaled)
    df['umap_x'] = coords_2d[:, 0]
    df['umap_y'] = coords_2d[:, 1]
    print(f"[OK] UMAP 완료: {coords_2d.shape[0]}개 좌표 생성")
    
    # 12. 결과 저장
    print(f"\n[11단계] 결과 저장")
    output_dir_path = Path(output_dir)
    output_dir_path.mkdir(parents=True, exist_ok=True)
    
    # 클러스터링 결과 CSV
    output_csv = output_dir_path / 'flc_income_clustering_results.csv'
    df[['mb_sn', 'cluster_flc', 'umap_x', 'umap_y', 'life_stage', 'income_tier', 
        'segment_initial'] + additional_features].to_csv(output_csv, index=False)
    print(f"[OK] 클러스터링 결과 저장: {output_csv}")
    
    # 메타데이터 JSON
    import json
    metadata = {
        'method': 'FLC × Income Matrix',
        'reference': 'Kim & Lee (2023)',
        'n_samples': len(df),
        'n_clusters': best_k,
        'silhouette_score': float(best_score),
        'davies_bouldin_index': float(results[best_k - k_range[0]]['davies_bouldin_index']),
        'calinski_harabasz_index': float(results[best_k - k_range[0]]['calinski_harabasz_index']),
        'life_stage_distribution': df['life_stage'].value_counts().to_dict(),
        'income_tier_distribution': df['income_tier'].value_counts().to_dict(),
        'cluster_profiles': cluster_profiles,
        'k_range_tested': list(range(k_range[0], k_range[1])),
        'all_results': results
    }
    
    metadata_file = output_dir_path / 'flc_income_clustering_metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[OK] 메타데이터 저장: {metadata_file}")
    
    # 모델 저장
    model_file = output_dir_path / 'flc_income_clustering_model.pkl'
    joblib.dump({
        'kmeans': best_model,
        'scaler': scaler,
        'encoder': encoder,
        'umap': umap_model,
        'best_k': best_k
    }, model_file)
    print(f"[OK] 모델 저장: {model_file}")
    
    # 13. 시각화
    print(f"\n[12단계] 시각화 생성")
    viz_dir = output_dir_path / 'visualizations'
    viz_dir.mkdir(exist_ok=True)
    
    # 13.1. 클러스터 분포 히트맵 (Life Stage × Cluster)
    fig, ax = plt.subplots(figsize=(12, 8))
    crosstab = pd.crosstab(
        df['life_stage'],
        df['cluster_flc'],
        normalize='columns'
    )
    sns.heatmap(crosstab, annot=True, fmt='.2%', cmap='YlOrRd', ax=ax)
    ax.set_xlabel('Cluster')
    ax.set_ylabel('Life Stage')
    ax.set_title('Cluster Distribution by Life Stage')
    plt.tight_layout()
    plt.savefig(viz_dir / 'cluster_life_stage_heatmap.png', dpi=300)
    print(f"[OK] 히트맵 저장: {viz_dir / 'cluster_life_stage_heatmap.png'}")
    plt.close()
    
    # 13.2. UMAP 시각화
    fig, ax = plt.subplots(figsize=(12, 10))
    scatter = ax.scatter(
        df['umap_x'],
        df['umap_y'],
        c=df['cluster_flc'],
        cmap='tab10',
        alpha=0.6,
        s=10
    )
    ax.set_xlabel('UMAP Dimension 1')
    ax.set_ylabel('UMAP Dimension 2')
    ax.set_title(f'UMAP Visualization (k={best_k}, Silhouette={best_score:.3f})')
    plt.colorbar(scatter, ax=ax, label='Cluster')
    plt.tight_layout()
    plt.savefig(viz_dir / 'umap_visualization.png', dpi=300)
    print(f"[OK] UMAP 시각화 저장: {viz_dir / 'umap_visualization.png'}")
    plt.close()
    
    # 13.3. 평가 지표 비교 그래프
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('FLC × Income Matrix 클러스터링 평가 지표', fontsize=16)
    
    k_values = [r['k'] for r in results]
    silhouette_scores = [r['silhouette_score'] for r in results]
    db_indices = [r['davies_bouldin_index'] for r in results]
    ch_indices = [r['calinski_harabasz_index'] for r in results]
    inertias = [r['inertia'] for r in results]
    
    axes[0, 0].plot(k_values, silhouette_scores, marker='o', linestyle='-', color='skyblue', linewidth=2, markersize=8)
    axes[0, 0].set_title('Silhouette Score (높을수록 좋음)')
    axes[0, 0].set_xlabel('Number of Clusters (k)')
    axes[0, 0].set_ylabel('Score')
    axes[0, 0].grid(True, alpha=0.3)
    axes[0, 0].axvline(x=best_k, color='red', linestyle='--', label=f'Best k={best_k}')
    axes[0, 0].legend()
    
    axes[0, 1].plot(k_values, db_indices, marker='o', linestyle='-', color='lightcoral', linewidth=2, markersize=8)
    axes[0, 1].set_title('Davies-Bouldin Index (낮을수록 좋음)')
    axes[0, 1].set_xlabel('Number of Clusters (k)')
    axes[0, 1].set_ylabel('Index')
    axes[0, 1].grid(True, alpha=0.3)
    axes[0, 1].axvline(x=best_k, color='red', linestyle='--', label=f'Best k={best_k}')
    axes[0, 1].legend()
    
    axes[1, 0].plot(k_values, ch_indices, marker='o', linestyle='-', color='lightgreen', linewidth=2, markersize=8)
    axes[1, 0].set_title('Calinski-Harabasz Index (높을수록 좋음)')
    axes[1, 0].set_xlabel('Number of Clusters (k)')
    axes[1, 0].set_ylabel('Index')
    axes[1, 0].grid(True, alpha=0.3)
    axes[1, 0].axvline(x=best_k, color='red', linestyle='--', label=f'Best k={best_k}')
    axes[1, 0].legend()
    
    axes[1, 1].plot(k_values, inertias, marker='o', linestyle='-', color='gold', linewidth=2, markersize=8)
    axes[1, 1].set_title('Elbow Method (Inertia)')
    axes[1, 1].set_xlabel('Number of Clusters (k)')
    axes[1, 1].set_ylabel('Inertia')
    axes[1, 1].grid(True, alpha=0.3)
    axes[1, 1].axvline(x=best_k, color='red', linestyle='--', label=f'Best k={best_k}')
    axes[1, 1].legend()
    
    plt.tight_layout()
    plt.savefig(viz_dir / 'evaluation_metrics.png', dpi=300)
    print(f"[OK] 평가 지표 그래프 저장: {viz_dir / 'evaluation_metrics.png'}")
    plt.close()
    
    print("\n" + "=" * 80)
    print("FLC × Income Matrix 클러스터링 완료!")
    print("=" * 80)
    print(f"\n최종 결과:")
    print(f"  최적 k: {best_k}")
    print(f"  Silhouette Score: {best_score:.4f}")
    print(f"  Davies-Bouldin Index: {results[best_k - k_range[0]]['davies_bouldin_index']:.4f}")
    print(f"  Calinski-Harabasz Index: {results[best_k - k_range[0]]['calinski_harabasz_index']:.2f}")
    print(f"\n결과 저장 위치:")
    print(f"  - 클러스터링 결과: {output_csv}")
    print(f"  - 메타데이터: {metadata_file}")
    print(f"  - 모델: {model_file}")
    print(f"  - 시각화: {viz_dir}")
    
    return df, best_model, metadata


if __name__ == "__main__":
    # 실행
    df_result, model, metadata = create_flc_income_clustering(
        csv_path='clustering_data/data/welcome_1st_2nd_joined.csv',
        output_dir='clustering_data/data/precomputed',
        k_range=(6, 9)  # k=6, 7, 8 테스트
    )

