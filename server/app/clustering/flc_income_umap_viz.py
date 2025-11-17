"""
FLC × Income Matrix 클러스터링 k=12 UMAP 시각화

실험 A의 최적 결과 (k=12)로 UMAP 2D 시각화 생성
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score
from umap import UMAP
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # 백엔드 설정 (GUI 없이 실행)
import seaborn as sns
import os
import sys
from pathlib import Path
import joblib

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'  # Windows
plt.rcParams['axes.unicode_minus'] = False


def get_life_stage(row):
    """가족 생애주기 단계 분류"""
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


def create_umap_visualization(
    csv_path: str = 'clustering_data/data/welcome_1st_2nd_joined.csv',
    output_dir: str = 'clustering_data/data/precomputed',
    k: int = 12
):
    """
    k=12로 클러스터링하고 UMAP 시각화 생성
    """
    print("=" * 80)
    print(f"FLC × Income Matrix 클러스터링 k={k} UMAP 시각화")
    print("=" * 80)
    
    # 1. 데이터 로드
    print(f"\n[1단계] 데이터 로드: {csv_path}")
    if not os.path.exists(csv_path):
        print(f"[ERROR] 파일을 찾을 수 없습니다: {csv_path}")
        return None
    
    df = pd.read_csv(csv_path)
    print(f"[OK] 원본 데이터: {len(df)}행, {len(df.columns)}열")
    
    # 필요한 컬럼 확인
    required_cols = ['age', 'has_children']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"[ERROR] 필수 컬럼이 없습니다: {missing_cols}")
        return None
    
    # 2. 가족 생애주기 (FLC) 단계 생성
    print(f"\n[2단계] 가족 생애주기 단계 분류")
    df['life_stage'] = df.apply(get_life_stage, axis=1)
    
    # 결측치 처리
    if df['life_stage'].isna().sum() > 0:
        most_common = df['life_stage'].mode()[0]
        df['life_stage'] = df['life_stage'].fillna(most_common)
        print(f"[INFO] life_stage 결측치를 {most_common}으로 대체")
    
    # 3. 소득 계층 (Income Tier) 생성
    print(f"\n[3단계] 소득 계층 분류 (3분위)")
    if 'Q6_scaled' in df.columns:
        income_col = 'Q6_scaled'
    elif 'Q6_income' in df.columns:
        scaler_income = StandardScaler()
        df['Q6_scaled'] = scaler_income.fit_transform(df[['Q6_income']])
        income_col = 'Q6_scaled'
    else:
        print(f"[ERROR] 소득 정보가 없습니다")
        return None
    
    # 결측치 처리
    if df[income_col].isna().sum() > 0:
        median_income = df[income_col].median()
        df[income_col] = df[income_col].fillna(median_income)
    
    # 3분위 분류
    try:
        df['income_tier'] = pd.qcut(
            df[income_col],
            q=3,
            labels=['low', 'mid', 'high'],
            duplicates='drop'
        )
    except ValueError:
        income_33 = df[income_col].quantile(0.33)
        income_67 = df[income_col].quantile(0.67)
        df['income_tier'] = pd.cut(
            df[income_col],
            bins=[-np.inf, income_33, income_67, np.inf],
            labels=['low', 'mid', 'high']
        )
    
    # 4. 초기 세그먼트 생성 (18개 조합)
    print(f"\n[4단계] 초기 세그먼트 생성 (Life Stage × Income Tier)")
    df['segment_initial'] = (
        df['life_stage'].astype(str) + '_' + 
        df['income_tier'].astype(str)
    )
    
    # 5. 원-핫 인코딩
    print(f"\n[5단계] 원-핫 인코딩")
    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    segment_encoded = encoder.fit_transform(df[['segment_initial']])
    print(f"[OK] 세그먼트 원-핫 인코딩: {segment_encoded.shape[1]}개 피처")
    
    # 6. 추가 피처 준비 (24개 피처)
    print(f"\n[6단계] 추가 피처 준비")
    additional_features = [
        'age_scaled',
        'Q6_scaled',
        'education_level_scaled',
        'Q8_count_scaled',
        'Q8_premium_index',
        'is_premium_car'
    ]
    
    # 결측치 처리
    X_additional = df[additional_features].copy()
    for col in X_additional.columns:
        if X_additional[col].isna().sum() > 0:
            if X_additional[col].dtype in ['int64', 'float64']:
                X_additional[col] = X_additional[col].fillna(X_additional[col].median())
            else:
                X_additional[col] = X_additional[col].fillna(0)
    
    # 결합
    X_combined = np.hstack([segment_encoded, X_additional.values])
    print(f"[OK] 결합된 피처 매트릭스: {X_combined.shape} (18개 세그먼트 + 6개 추가)")
    
    # 7. 표준화
    print(f"\n[7단계] 표준화")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_combined)
    print(f"[OK] 표준화 완료")
    
    # 8. K-Means 클러스터링 (k=12)
    print(f"\n[8단계] K-Means 클러스터링 (k={k})")
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=300)
    labels = kmeans.fit_predict(X_scaled)
    
    # 평가 지표
    silhouette = silhouette_score(X_scaled, labels)
    db_score = davies_bouldin_score(X_scaled, labels)
    
    print(f"[OK] 클러스터링 완료")
    print(f"  Silhouette Score: {silhouette:.4f}")
    print(f"  Davies-Bouldin Index: {db_score:.4f}")
    
    # 클러스터 분포
    unique, counts = np.unique(labels, return_counts=True)
    print(f"\n[클러스터 분포]")
    for cid, count in zip(unique, counts):
        print(f"  Cluster {cid}: {count:,}명 ({count/len(labels)*100:.1f}%)")
    
    # 9. UMAP 차원 축소
    print(f"\n[9단계] UMAP 차원 축소")
    umap_model = UMAP(
        n_components=2,
        n_neighbors=15,
        min_dist=0.1,
        metric='cosine',
        random_state=42,
        verbose=True
    )
    coords_2d = umap_model.fit_transform(X_scaled)
    df['umap_x'] = coords_2d[:, 0]
    df['umap_y'] = coords_2d[:, 1]
    df['cluster_k12'] = labels
    print(f"[OK] UMAP 완료: {coords_2d.shape[0]}개 좌표 생성")
    
    # 10. 시각화 생성
    print(f"\n[10단계] 시각화 생성")
    output_dir_path = Path(output_dir)
    output_dir_path.mkdir(parents=True, exist_ok=True)
    viz_dir = output_dir_path / 'visualizations'
    viz_dir.mkdir(exist_ok=True)
    
    # 10.1. 기본 UMAP 시각화
    fig, ax = plt.subplots(figsize=(14, 12))
    scatter = ax.scatter(
        df['umap_x'],
        df['umap_y'],
        c=df['cluster_k12'],
        cmap='tab20',  # 12개 클러스터를 위해 tab20 사용
        alpha=0.6,
        s=8,
        edgecolors='none'
    )
    ax.set_xlabel('UMAP Dimension 1', fontsize=12)
    ax.set_ylabel('UMAP Dimension 2', fontsize=12)
    ax.set_title(
        f'UMAP 2D Visualization - FLC × Income Clustering (k={k})\n'
        f'Silhouette Score: {silhouette:.4f}, Davies-Bouldin: {db_score:.4f}',
        fontsize=14,
        fontweight='bold'
    )
    plt.colorbar(scatter, ax=ax, label='Cluster ID', ticks=range(k))
    plt.tight_layout()
    umap_path = viz_dir / f'umap_k{k}.png'
    plt.savefig(umap_path, dpi=300, bbox_inches='tight')
    print(f"[OK] UMAP 시각화 저장: {umap_path}")
    plt.close()
    
    # 10.2. 클러스터별 색상 구분 (더 큰 점)
    fig, ax = plt.subplots(figsize=(14, 12))
    colors = plt.cm.tab20(np.linspace(0, 1, k))
    for cluster_id in range(k):
        cluster_data = df[df['cluster_k12'] == cluster_id]
        ax.scatter(
            cluster_data['umap_x'],
            cluster_data['umap_y'],
            c=[colors[cluster_id]],
            label=f'Cluster {cluster_id} ({len(cluster_data):,}명)',
            alpha=0.7,
            s=10,
            edgecolors='black',
            linewidths=0.3
        )
    ax.set_xlabel('UMAP Dimension 1', fontsize=12)
    ax.set_ylabel('UMAP Dimension 2', fontsize=12)
    ax.set_title(
        f'UMAP 2D Visualization - FLC × Income Clustering (k={k})\n'
        f'Silhouette Score: {silhouette:.4f}',
        fontsize=14,
        fontweight='bold'
    )
    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=9)
    plt.tight_layout()
    umap_legend_path = viz_dir / f'umap_k{k}_with_legend.png'
    plt.savefig(umap_legend_path, dpi=300, bbox_inches='tight')
    print(f"[OK] UMAP 시각화 (범례 포함) 저장: {umap_legend_path}")
    plt.close()
    
    # 10.3. 생애주기별 색상 구분
    fig, ax = plt.subplots(figsize=(14, 12))
    stage_names = {
        1: 'Young Singles',
        2: 'DINK',
        3: 'Young Parents',
        4: 'Mature Parents',
        5: 'Middle Age',
        6: 'Seniors'
    }
    stages = sorted(df['life_stage'].unique())
    colors_stage = plt.cm.Set3(np.linspace(0, 1, len(stages)))
    for idx, stage in enumerate(stages):
        stage_data = df[df['life_stage'] == stage]
        ax.scatter(
            stage_data['umap_x'],
            stage_data['umap_y'],
            c=[colors_stage[idx]],
            label=f'{stage_names[stage]} ({len(stage_data):,}명)',
            alpha=0.6,
            s=8,
            edgecolors='none'
        )
    ax.set_xlabel('UMAP Dimension 1', fontsize=12)
    ax.set_ylabel('UMAP Dimension 2', fontsize=12)
    ax.set_title(
        f'UMAP 2D Visualization by Life Stage (k={k})\n'
        f'Silhouette Score: {silhouette:.4f}',
        fontsize=14,
        fontweight='bold'
    )
    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=9)
    plt.tight_layout()
    umap_stage_path = viz_dir / f'umap_k{k}_by_life_stage.png'
    plt.savefig(umap_stage_path, dpi=300, bbox_inches='tight')
    print(f"[OK] UMAP 시각화 (생애주기별) 저장: {umap_stage_path}")
    plt.close()
    
    # 10.4. 소득 계층별 색상 구분
    fig, ax = plt.subplots(figsize=(14, 12))
    income_tiers = ['low', 'mid', 'high']
    colors_income = ['#FF6B6B', '#4ECDC4', '#45B7D1']
    for idx, tier in enumerate(income_tiers):
        tier_data = df[df['income_tier'] == tier]
        ax.scatter(
            tier_data['umap_x'],
            tier_data['umap_y'],
            c=colors_income[idx],
            label=f'{tier.upper()} ({len(tier_data):,}명)',
            alpha=0.6,
            s=8,
            edgecolors='none'
        )
    ax.set_xlabel('UMAP Dimension 1', fontsize=12)
    ax.set_ylabel('UMAP Dimension 2', fontsize=12)
    ax.set_title(
        f'UMAP 2D Visualization by Income Tier (k={k})\n'
        f'Silhouette Score: {silhouette:.4f}',
        fontsize=14,
        fontweight='bold'
    )
    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=10)
    plt.tight_layout()
    umap_income_path = viz_dir / f'umap_k{k}_by_income_tier.png'
    plt.savefig(umap_income_path, dpi=300, bbox_inches='tight')
    print(f"[OK] UMAP 시각화 (소득 계층별) 저장: {umap_income_path}")
    plt.close()
    
    # 11. 결과 저장
    print(f"\n[11단계] 결과 저장")
    
    # CSV 저장
    output_csv = output_dir_path / f'flc_income_clustering_k{k}.csv'
    df[['mb_sn', 'cluster_k12', 'umap_x', 'umap_y', 'life_stage', 'income_tier', 
        'segment_initial'] + additional_features].to_csv(output_csv, index=False)
    print(f"[OK] 클러스터링 결과 저장: {output_csv}")
    
    # 모델 저장
    model_file = output_dir_path / f'flc_income_clustering_k{k}_model.pkl'
    joblib.dump({
        'kmeans': kmeans,
        'scaler': scaler,
        'encoder': encoder,
        'umap': umap_model,
        'k': k,
        'silhouette_score': silhouette,
        'davies_bouldin_index': db_score,
        'features': additional_features
    }, model_file)
    print(f"[OK] 모델 저장: {model_file}")
    
    print("\n" + "="*80)
    print("UMAP 시각화 생성 완료!")
    print("="*80)
    print(f"\n생성된 파일:")
    print(f"  - UMAP 시각화: {umap_path}")
    print(f"  - UMAP 시각화 (범례): {umap_legend_path}")
    print(f"  - UMAP 시각화 (생애주기): {umap_stage_path}")
    print(f"  - UMAP 시각화 (소득 계층): {umap_income_path}")
    print(f"  - 클러스터링 결과: {output_csv}")
    print(f"  - 모델: {model_file}")
    
    return df, kmeans, umap_model, coords_2d


if __name__ == "__main__":
    # k=12로 UMAP 시각화 생성
    df_result, kmeans_model, umap_model, coords = create_umap_visualization(
        csv_path='clustering_data/data/welcome_1st_2nd_joined.csv',
        output_dir='clustering_data/data/precomputed',
        k=12
    )

