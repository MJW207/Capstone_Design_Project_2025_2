"""
HDBSCAN 클러스터링 결과 UMAP 시각화 및 데이터 분석

최적 설정: min_cluster_size=50, min_samples=50
클러스터 수: 19개
Silhouette Score: 0.6014
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from umap import UMAP
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # 백엔드 설정 (GUI 없이 실행)
import seaborn as sns
import os
import sys
from pathlib import Path
import joblib
import json

# HDBSCAN import
try:
    import hdbscan
    HDBSCAN_AVAILABLE = True
except ImportError:
    HDBSCAN_AVAILABLE = False
    print("[ERROR] HDBSCAN이 설치되지 않았습니다.")
    sys.exit(1)

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


def analyze_cluster_profiles(df, labels, output_dir):
    """
    클러스터별 상세 프로파일 분석
    """
    print("\n" + "="*80)
    print("클러스터 프로파일 분석")
    print("="*80)
    
    df_temp = df.copy()
    df_temp['cluster'] = labels
    
    stage_names = {
        1: '젊은싱글',
        2: '딩크족',
        3: '젊은부모',
        4: '중년부모',
        5: '중년',
        6: '시니어'
    }
    
    income_names = {
        'low': '저소득',
        'mid': '중소득',
        'high': '고소득'
    }
    
    cluster_profiles = {}
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    
    for cluster_id in sorted(set(labels)):
        if cluster_id == -1:  # 노이즈는 별도 처리
            continue
        
        cluster_data = df_temp[df_temp['cluster'] == cluster_id]
        
        profile = {
            'cluster_id': cluster_id,
            'size': len(cluster_data),
            'size_pct': len(cluster_data) / len(df) * 100,
        }
        
        # 기본 인구통계
        if 'age' in cluster_data.columns:
            profile['avg_age'] = float(cluster_data['age'].mean())
            profile['std_age'] = float(cluster_data['age'].std())
        
        if 'Q6_income' in cluster_data.columns:
            profile['avg_income'] = float(cluster_data['Q6_income'].mean())
        elif 'Q6_scaled' in cluster_data.columns:
            profile['avg_income_scaled'] = float(cluster_data['Q6_scaled'].mean())
        
        if 'is_college_graduate' in cluster_data.columns:
            profile['college_graduate_rate'] = float(cluster_data['is_college_graduate'].mean())
        
        # 가족 구성
        if 'has_children' in cluster_data.columns:
            profile['has_children_rate'] = float(cluster_data['has_children'].mean())
            if profile['has_children_rate'] > 0:
                children_data = cluster_data[cluster_data['has_children'] == 1]
                if 'children_category_ordinal' in children_data.columns:
                    profile['avg_children_count'] = float(children_data['children_category_ordinal'].mean())
        
        # 소비 패턴
        if 'Q8_count' in cluster_data.columns:
            profile['avg_electronics_count'] = float(cluster_data['Q8_count'].mean())
        if 'Q8_premium_index' in cluster_data.columns:
            profile['avg_premium_index'] = float(cluster_data['Q8_premium_index'].mean())
        if 'is_premium_car' in cluster_data.columns:
            profile['premium_car_rate'] = float(cluster_data['is_premium_car'].mean())
        
        # 생애주기 분포
        if 'life_stage' in cluster_data.columns:
            life_stage_dist = cluster_data['life_stage'].value_counts(normalize=True).to_dict()
            profile['life_stage_dist'] = {int(k): float(v) for k, v in life_stage_dist.items()}
            top_stage = max(life_stage_dist.items(), key=lambda x: x[1])
            profile['top_life_stage'] = int(top_stage[0])
            profile['top_life_stage_pct'] = float(top_stage[1])
        
        # 소득 분포
        if 'income_tier' in cluster_data.columns:
            income_dist = cluster_data['income_tier'].value_counts(normalize=True).to_dict()
            profile['income_tier_dist'] = {str(k): float(v) for k, v in income_dist.items()}
            top_income = max(income_dist.items(), key=lambda x: x[1])
            profile['top_income_tier'] = str(top_income[0])
            profile['top_income_tier_pct'] = float(top_income[1])
        
        # 지역 분포
        if 'is_metro' in cluster_data.columns:
            profile['metro_rate'] = float(cluster_data['is_metro'].mean())
        
        cluster_profiles[cluster_id] = profile
        
        # 출력
        print(f"\n{'─'*80}")
        print(f"Cluster {cluster_id} | {len(cluster_data):,}명 ({len(cluster_data)/len(df)*100:.1f}%)")
        print(f"{'─'*80}")
        
        print(f"\n[인구통계]")
        if 'avg_age' in profile:
            print(f"  평균 나이:     {profile['avg_age']:.1f}세 (±{profile['std_age']:.1f})")
        if 'avg_income' in profile:
            print(f"  평균 소득:     {profile['avg_income']:.0f}만원")
        elif 'avg_income_scaled' in profile:
            print(f"  평균 소득 (scaled): {profile['avg_income_scaled']:.3f}")
        if 'college_graduate_rate' in profile:
            print(f"  대졸 이상:     {profile['college_graduate_rate']:.1%}")
        
        print(f"\n[가족 구성]")
        if 'has_children_rate' in profile:
            print(f"  자녀 있음:     {profile['has_children_rate']:.1%}")
            if 'avg_children_count' in profile:
                print(f"  평균 자녀 수:  {profile['avg_children_count']:.1f}명")
        
        print(f"\n[소비 패턴]")
        if 'avg_electronics_count' in profile:
            print(f"  전자제품 수:   {profile['avg_electronics_count']:.1f}개")
        if 'avg_premium_index' in profile:
            print(f"  프리미엄 지수: {profile['avg_premium_index']:.3f}")
        if 'premium_car_rate' in profile:
            print(f"  프리미엄 차량: {profile['premium_car_rate']:.1%}")
        
        print(f"\n[주요 생애주기 TOP 3]")
        if 'life_stage_dist' in profile:
            sorted_stages = sorted(profile['life_stage_dist'].items(), key=lambda x: x[1], reverse=True)
            for idx, (stage, pct) in enumerate(sorted_stages[:3], 1):
                stage_name = stage_names.get(stage, f'Stage{stage}')
                print(f"  {idx}. {stage_name:10s} {pct*100:4.1f}%")
        
        print(f"\n[소득 분포]")
        if 'income_tier_dist' in profile:
            for tier in ['low', 'mid', 'high']:
                pct = profile['income_tier_dist'].get(tier, 0)
                tier_name = income_names.get(tier, tier)
                print(f"  {tier_name:6s} {pct*100:4.1f}%")
        
        if 'metro_rate' in profile:
            print(f"\n[지역]")
            print(f"  수도권:        {profile['metro_rate']:.1%}")
    
    # 노이즈 포인트 분석
    noise_data = df_temp[df_temp['cluster'] == -1]
    if len(noise_data) > 0:
        print(f"\n{'─'*80}")
        print(f"Noise Points (노이즈) | {len(noise_data):,}명 ({len(noise_data)/len(df)*100:.1f}%)")
        print(f"{'─'*80}")
        if 'age' in noise_data.columns:
            print(f"  평균 나이:     {noise_data['age'].mean():.1f}세")
        if 'Q6_income' in noise_data.columns:
            print(f"  평균 소득:     {noise_data['Q6_income'].mean():.0f}만원")
    
    return cluster_profiles


def create_hdbscan_analysis(
    csv_path: str = 'clustering_data/data/welcome_1st_2nd_joined.csv',
    output_dir: str = 'clustering_data/data/precomputed',
    min_cluster_size: int = 50,
    min_samples: int = 50
):
    """
    HDBSCAN 클러스터링 수행 및 분석
    """
    print("=" * 80)
    print("HDBSCAN 클러스터링 UMAP 시각화 및 데이터 분석")
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
    
    # 8. HDBSCAN 클러스터링
    print(f"\n[8단계] HDBSCAN 클러스터링")
    print(f"  설정: min_cluster_size={min_cluster_size}, min_samples={min_samples}")
    
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric='euclidean',
        cluster_selection_method='eom'
    )
    labels = clusterer.fit_predict(X_scaled)
    
    df['cluster_hdbscan'] = labels
    
    # 평가 지표 (노이즈 제외)
    mask = labels != -1
    X_filtered = X_scaled[mask]
    labels_filtered = labels[mask]
    
    silhouette = silhouette_score(X_filtered, labels_filtered)
    db_score = davies_bouldin_score(X_filtered, labels_filtered)
    ch_score = calinski_harabasz_score(X_filtered, labels_filtered)
    
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = list(labels).count(-1)
    noise_ratio = n_noise / len(labels)
    
    print(f"[OK] 클러스터링 완료")
    print(f"  클러스터 수:       {n_clusters}")
    print(f"  노이즈 포인트:    {n_noise:,}명 ({noise_ratio*100:.1f}%)")
    print(f"  Silhouette Score:  {silhouette:.4f}")
    print(f"  Davies-Bouldin:    {db_score:.4f}")
    print(f"  Calinski-Harabasz: {ch_score:.2f}")
    
    # 클러스터 분포
    unique, counts = np.unique(labels, return_counts=True)
    print(f"\n[클러스터 분포]")
    for cid, count in zip(unique, counts):
        if cid == -1:
            print(f"  Noise: {count:,}명 ({count/len(labels)*100:.1f}%)")
        else:
            print(f"  Cluster {cid}: {count:,}명 ({count/len(labels)*100:.1f}%)")
    
    # 9. 클러스터 프로파일 분석
    cluster_profiles = analyze_cluster_profiles(df, labels, output_dir)
    
    # 10. UMAP 차원 축소
    print(f"\n[10단계] UMAP 차원 축소")
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
    print(f"[OK] UMAP 완료: {coords_2d.shape[0]}개 좌표 생성")
    
    # 11. 시각화 생성
    print(f"\n[11단계] 시각화 생성")
    output_dir_path = Path(output_dir)
    output_dir_path.mkdir(parents=True, exist_ok=True)
    viz_dir = output_dir_path / 'visualizations'
    viz_dir.mkdir(exist_ok=True)
    
    # 11.1. 기본 UMAP 시각화 (클러스터별)
    fig, ax = plt.subplots(figsize=(16, 14))
    
    # 노이즈 포인트 먼저 그리기 (회색)
    noise_mask = labels == -1
    if noise_mask.sum() > 0:
        ax.scatter(
            df.loc[noise_mask, 'umap_x'],
            df.loc[noise_mask, 'umap_y'],
            c='lightgray',
            alpha=0.3,
            s=5,
            label=f'Noise ({n_noise:,}명)',
            edgecolors='none'
        )
    
    # 클러스터별로 그리기
    colors = plt.cm.tab20(np.linspace(0, 1, n_clusters))
    for cluster_id in sorted(set(labels)):
        if cluster_id == -1:
            continue
        cluster_mask = labels == cluster_id
        ax.scatter(
            df.loc[cluster_mask, 'umap_x'],
            df.loc[cluster_mask, 'umap_y'],
            c=[colors[cluster_id % len(colors)]],
            label=f'Cluster {cluster_id} ({cluster_mask.sum():,}명)',
            alpha=0.7,
            s=8,
            edgecolors='black',
            linewidths=0.2
        )
    
    ax.set_xlabel('UMAP Dimension 1', fontsize=14)
    ax.set_ylabel('UMAP Dimension 2', fontsize=14)
    ax.set_title(
        f'HDBSCAN Clustering UMAP Visualization\n'
        f'min_cluster_size={min_cluster_size}, min_samples={min_samples} | '
        f'Clusters: {n_clusters}, Noise: {n_noise:,}명 ({noise_ratio*100:.1f}%)\n'
        f'Silhouette Score: {silhouette:.4f}, Davies-Bouldin: {db_score:.4f}',
        fontsize=16,
        fontweight='bold'
    )
    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=9, ncol=2)
    plt.tight_layout()
    umap_path = viz_dir / 'hdbscan_umap.png'
    plt.savefig(umap_path, dpi=300, bbox_inches='tight')
    print(f"[OK] UMAP 시각화 저장: {umap_path}")
    plt.close()
    
    # 11.2. 생애주기별 색상 구분
    fig, ax = plt.subplots(figsize=(16, 14))
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
    ax.set_xlabel('UMAP Dimension 1', fontsize=14)
    ax.set_ylabel('UMAP Dimension 2', fontsize=14)
    ax.set_title(
        f'HDBSCAN UMAP Visualization by Life Stage\n'
        f'Silhouette Score: {silhouette:.4f}',
        fontsize=16,
        fontweight='bold'
    )
    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=10)
    plt.tight_layout()
    umap_stage_path = viz_dir / 'hdbscan_umap_by_life_stage.png'
    plt.savefig(umap_stage_path, dpi=300, bbox_inches='tight')
    print(f"[OK] UMAP 시각화 (생애주기별) 저장: {umap_stage_path}")
    plt.close()
    
    # 11.3. 소득 계층별 색상 구분
    fig, ax = plt.subplots(figsize=(16, 14))
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
    ax.set_xlabel('UMAP Dimension 1', fontsize=14)
    ax.set_ylabel('UMAP Dimension 2', fontsize=14)
    ax.set_title(
        f'HDBSCAN UMAP Visualization by Income Tier\n'
        f'Silhouette Score: {silhouette:.4f}',
        fontsize=16,
        fontweight='bold'
    )
    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=12)
    plt.tight_layout()
    umap_income_path = viz_dir / 'hdbscan_umap_by_income_tier.png'
    plt.savefig(umap_income_path, dpi=300, bbox_inches='tight')
    print(f"[OK] UMAP 시각화 (소득 계층별) 저장: {umap_income_path}")
    plt.close()
    
    # 12. 결과 저장
    print(f"\n[12단계] 결과 저장")
    
    # CSV 저장
    output_csv = output_dir_path / 'flc_income_clustering_hdbscan.csv'
    df[['mb_sn', 'cluster_hdbscan', 'umap_x', 'umap_y', 'life_stage', 'income_tier', 
        'segment_initial'] + additional_features].to_csv(output_csv, index=False)
    print(f"[OK] 클러스터링 결과 저장: {output_csv}")
    
    # 모델 저장
    model_file = output_dir_path / 'flc_income_clustering_hdbscan_model.pkl'
    joblib.dump({
        'hdbscan': clusterer,
        'scaler': scaler,
        'encoder': encoder,
        'umap': umap_model,
        'min_cluster_size': min_cluster_size,
        'min_samples': min_samples,
        'silhouette_score': silhouette,
        'davies_bouldin_index': db_score,
        'calinski_harabasz_index': ch_score,
        'n_clusters': n_clusters,
        'n_noise': n_noise,
        'features': additional_features
    }, model_file)
    print(f"[OK] 모델 저장: {model_file}")
    
    # 메타데이터 저장 (모든 숫자 타입을 JSON 직렬화 가능한 타입으로 변환)
    def convert_to_json_serializable(obj):
        """재귀적으로 모든 숫자 타입을 JSON 직렬화 가능한 타입으로 변환"""
        if isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, dict):
            return {str(k): convert_to_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [convert_to_json_serializable(item) for item in obj]
        else:
            return obj
    
    cluster_profiles_serializable = convert_to_json_serializable(cluster_profiles)
    metadata = {
        'method': 'HDBSCAN (Density-based Clustering)',
        'reference': 'McInnes et al. (2017)',
        'n_samples': len(df),
        'min_cluster_size': min_cluster_size,
        'min_samples': min_samples,
        'n_clusters': n_clusters,
        'n_noise': int(n_noise),
        'noise_ratio': float(noise_ratio),
        'silhouette_score': float(silhouette),
        'davies_bouldin_index': float(db_score),
        'calinski_harabasz_index': float(ch_score),
        'cluster_profiles': cluster_profiles_serializable
    }
    
    metadata_file = output_dir_path / 'flc_income_clustering_hdbscan_metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[OK] 메타데이터 저장: {metadata_file}")
    
    print("\n" + "="*80)
    print("HDBSCAN 분석 완료!")
    print("="*80)
    print(f"\n생성된 파일:")
    print(f"  - UMAP 시각화: {umap_path}")
    print(f"  - UMAP 시각화 (생애주기): {umap_stage_path}")
    print(f"  - UMAP 시각화 (소득 계층): {umap_income_path}")
    print(f"  - 클러스터링 결과: {output_csv}")
    print(f"  - 모델: {model_file}")
    print(f"  - 메타데이터: {metadata_file}")
    
    return df, clusterer, umap_model, coords_2d, cluster_profiles, metadata


if __name__ == "__main__":
    # 최적 설정으로 HDBSCAN 분석
    df_result, clusterer_model, umap_model, coords, profiles, metadata = create_hdbscan_analysis(
        csv_path='clustering_data/data/welcome_1st_2nd_joined.csv',
        output_dir='clustering_data/data/precomputed',
        min_cluster_size=50,
        min_samples=50
    )

