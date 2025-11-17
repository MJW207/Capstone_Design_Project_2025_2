"""
FLC × Income Matrix 클러스터링 k=12~16 확장 테스트 및 HDBSCAN 실험

목표: k=12에서 0.4458 달성 후, 더 높은 k에서도 성능 향상 가능한지 확인
추가: HDBSCAN으로 밀도 기반 클러스터링 실험
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # 백엔드 설정 (GUI 없이 실행)
import seaborn as sns
import os
import sys
from pathlib import Path
import json

# HDBSCAN import
try:
    import hdbscan
    HDBSCAN_AVAILABLE = True
except ImportError:
    HDBSCAN_AVAILABLE = False
    print("[WARN] HDBSCAN이 설치되지 않았습니다. pip install hdbscan 실행 필요")

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


def run_k_extended_test(df, segment_encoded, X_scaled, output_dir):
    """
    k=12~16 확장 테스트
    """
    print("\n" + "="*80)
    print("k=12~16 확장 테스트 (기존 24개 피처)")
    print("="*80)
    
    best_scores = {}
    
    for k in range(12, 17):
        kmeans = KMeans(
            n_clusters=k,
            random_state=42,
            n_init=20,
            max_iter=300
        )
        labels = kmeans.fit_predict(X_scaled)
        
        silhouette = silhouette_score(X_scaled, labels)
        db_score = davies_bouldin_score(X_scaled, labels)
        ch_score = calinski_harabasz_score(X_scaled, labels)
        
        # 클러스터 크기 분포
        unique, counts = np.unique(labels, return_counts=True)
        min_size = counts.min()
        max_size = counts.max()
        balance = min_size / max_size if max_size > 0 else 0
        
        best_scores[k] = {
            'silhouette': silhouette,
            'davies_bouldin': db_score,
            'calinski_harabasz': ch_score,
            'min_size': int(min_size),
            'max_size': int(max_size),
            'balance': balance,
            'labels': labels,
            'model': kmeans
        }
        
        print(f"\nk={k:2d}:")
        print(f"  Silhouette:         {silhouette:.4f}")
        print(f"  Davies-Bouldin:     {db_score:.4f}")
        print(f"  Calinski-Harabasz:  {ch_score:.2f}")
        print(f"  클러스터 크기:      {min_size}~{max_size}명 (균형도: {balance:.2f})")
        
        # 클러스터 분포
        print(f"  클러스터 분포:")
        for cid, count in zip(unique, counts):
            print(f"    Cluster {cid}: {count:,}명 ({count/len(labels)*100:.1f}%)")
    
    # 최적 k 선택
    best_k = max(best_scores.keys(), key=lambda k: best_scores[k]['silhouette'])
    
    print("\n" + "="*80)
    print(f"[최적 k] {best_k}")
    print("="*80)
    print(f"Silhouette:         {best_scores[best_k]['silhouette']:.4f}")
    print(f"Davies-Bouldin:     {best_scores[best_k]['davies_bouldin']:.4f}")
    print(f"Calinski-Harabasz:  {best_scores[best_k]['calinski_harabasz']:.2f}")
    print(f"균형도:             {best_scores[best_k]['balance']:.2f}")
    
    return best_scores, best_k


def run_hdbscan_test(X_scaled, output_dir):
    """
    HDBSCAN 밀도 기반 클러스터링 실험
    """
    if not HDBSCAN_AVAILABLE:
        print("\n[WARN] HDBSCAN이 설치되지 않아 실험을 건너뜁니다.")
        return None
    
    print("\n" + "="*80)
    print("HDBSCAN 밀도 기반 클러스터링 실험")
    print("="*80)
    
    # min_cluster_size와 min_samples 조합 테스트
    min_cluster_sizes = [50, 100, 200, 500]
    min_samples_list = [10, 20, 30, 50]
    
    best_scores = {}
    best_result = None
    best_score = -1
    
    for min_cluster_size in min_cluster_sizes:
        for min_samples in min_samples_list:
            clusterer = hdbscan.HDBSCAN(
                min_cluster_size=min_cluster_size,
                min_samples=min_samples,
                metric='euclidean',
                cluster_selection_method='eom'
            )
            labels = clusterer.fit_predict(X_scaled)
            
            # 노이즈 포인트 제외하고 평가
            n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
            n_noise = list(labels).count(-1)
            noise_ratio = n_noise / len(labels)
            
            if n_clusters < 2:
                continue
            
            # 노이즈 제외한 데이터로 평가
            mask = labels != -1
            if mask.sum() < 100:  # 너무 적으면 스킵
                continue
            
            X_filtered = X_scaled[mask]
            labels_filtered = labels[mask]
            
            silhouette = silhouette_score(X_filtered, labels_filtered)
            db_score = davies_bouldin_score(X_filtered, labels_filtered)
            ch_score = calinski_harabasz_score(X_filtered, labels_filtered)
            
            key = f"min_cluster_size={min_cluster_size}, min_samples={min_samples}"
            best_scores[key] = {
                'silhouette': silhouette,
                'davies_bouldin': db_score,
                'calinski_harabasz': ch_score,
                'n_clusters': n_clusters,
                'n_noise': n_noise,
                'noise_ratio': noise_ratio,
                'labels': labels,
                'model': clusterer
            }
            
            print(f"\n{key}:")
            print(f"  클러스터 수:       {n_clusters}")
            print(f"  노이즈 포인트:    {n_noise:,}명 ({noise_ratio*100:.1f}%)")
            print(f"  Silhouette:        {silhouette:.4f}")
            print(f"  Davies-Bouldin:    {db_score:.4f}")
            print(f"  Calinski-Harabasz: {ch_score:.2f}")
            
            if silhouette > best_score:
                best_score = silhouette
                best_result = best_scores[key]
                best_result['key'] = key
    
    if best_result:
        print("\n" + "="*80)
        print(f"[최적 HDBSCAN 설정] {best_result['key']}")
        print("="*80)
        print(f"클러스터 수:       {best_result['n_clusters']}")
        print(f"노이즈 포인트:    {best_result['n_noise']:,}명 ({best_result['noise_ratio']*100:.1f}%)")
        print(f"Silhouette:        {best_result['silhouette']:.4f}")
        print(f"Davies-Bouldin:    {best_result['davies_bouldin']:.4f}")
        print(f"Calinski-Harabasz: {best_result['calinski_harabasz']:.2f}")
    
    return best_scores, best_result


def create_visualization(k_scores, output_dir):
    """
    k값별 성능 지표 시각화
    """
    print("\n[시각화 생성]")
    output_dir_path = Path(output_dir)
    viz_dir = output_dir_path / 'visualizations'
    viz_dir.mkdir(exist_ok=True)
    
    ks = sorted(k_scores.keys())
    silhouettes = [k_scores[k]['silhouette'] for k in ks]
    dbs = [k_scores[k]['davies_bouldin'] for k in ks]
    chs = [k_scores[k]['calinski_harabasz'] for k in ks]
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    fig.suptitle('k값별 클러스터링 성능 지표 (k=12~16)', fontsize=16, fontweight='bold')
    
    # Silhouette Score
    axes[0].plot(ks, silhouettes, marker='o', linewidth=2, markersize=10, color='#3B82F6')
    axes[0].set_xlabel('Number of Clusters (k)', fontsize=12)
    axes[0].set_ylabel('Silhouette Score', fontsize=12)
    axes[0].set_title('Silhouette Score (높을수록 좋음)', fontsize=13, fontweight='bold')
    axes[0].grid(True, alpha=0.3)
    for k, score in zip(ks, silhouettes):
        axes[0].text(k, score + 0.005, f'{score:.4f}', ha='center', va='bottom', fontsize=9)
    
    # Davies-Bouldin Index
    axes[1].plot(ks, dbs, marker='o', linewidth=2, markersize=10, color='#F59E0B')
    axes[1].set_xlabel('Number of Clusters (k)', fontsize=12)
    axes[1].set_ylabel('Davies-Bouldin Index', fontsize=12)
    axes[1].set_title('Davies-Bouldin Index (낮을수록 좋음)', fontsize=13, fontweight='bold')
    axes[1].grid(True, alpha=0.3)
    for k, score in zip(ks, dbs):
        axes[1].text(k, score + 0.02, f'{score:.4f}', ha='center', va='bottom', fontsize=9)
    
    # Calinski-Harabasz Index
    axes[2].plot(ks, chs, marker='o', linewidth=2, markersize=10, color='#10B981')
    axes[2].set_xlabel('Number of Clusters (k)', fontsize=12)
    axes[2].set_ylabel('Calinski-Harabasz Index', fontsize=12)
    axes[2].set_title('Calinski-Harabasz Index (높을수록 좋음)', fontsize=13, fontweight='bold')
    axes[2].grid(True, alpha=0.3)
    for k, score in zip(ks, chs):
        axes[2].text(k, score + 30, f'{score:.0f}', ha='center', va='bottom', fontsize=9)
    
    plt.tight_layout()
    viz_path = viz_dir / 'k_optimization_extended.png'
    plt.savefig(viz_path, dpi=300, bbox_inches='tight')
    print(f"[OK] 그래프 저장: {viz_path}")
    plt.close()


def create_k_extended_test(
    csv_path: str = 'clustering_data/data/welcome_1st_2nd_joined.csv',
    output_dir: str = 'clustering_data/data/precomputed'
):
    """
    k=12~16 확장 테스트 및 HDBSCAN 실험 수행
    """
    print("=" * 80)
    print("FLC × Income Matrix 클러스터링 k=12~16 확장 테스트")
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
    
    # 8. k=12~16 확장 테스트
    k_scores, best_k = run_k_extended_test(df, segment_encoded, X_scaled, output_dir)
    
    # 9. HDBSCAN 실험
    hdbscan_scores, best_hdbscan = run_hdbscan_test(X_scaled, output_dir)
    
    # 10. 시각화 생성
    create_visualization(k_scores, output_dir)
    
    # 11. 결과 저장
    print(f"\n[11단계] 결과 저장")
    output_dir_path = Path(output_dir)
    output_dir_path.mkdir(parents=True, exist_ok=True)
    
    metadata = {
        'method': 'FLC × Income Matrix (k=12~16 Extended Test)',
        'reference': 'Kim & Lee (2023)',
        'n_samples': len(df),
        'k_extended_results': {
            str(k): {
                'silhouette_score': float(v['silhouette']),
                'davies_bouldin_index': float(v['davies_bouldin']),
                'calinski_harabasz_index': float(v['calinski_harabasz']),
                'min_size': v['min_size'],
                'max_size': v['max_size'],
                'balance': float(v['balance'])
            }
            for k, v in k_scores.items()
        },
        'best_k': best_k,
        'best_k_silhouette': float(k_scores[best_k]['silhouette']),
        'hdbscan_available': HDBSCAN_AVAILABLE
    }
    
    if best_hdbscan:
        metadata['hdbscan_best'] = {
            'key': best_hdbscan['key'],
            'n_clusters': best_hdbscan['n_clusters'],
            'n_noise': best_hdbscan['n_noise'],
            'noise_ratio': float(best_hdbscan['noise_ratio']),
            'silhouette_score': float(best_hdbscan['silhouette']),
            'davies_bouldin_index': float(best_hdbscan['davies_bouldin']),
            'calinski_harabasz_index': float(best_hdbscan['calinski_harabasz'])
        }
    
    metadata_file = output_dir_path / 'flc_income_k_extended_metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[OK] 메타데이터 저장: {metadata_file}")
    
    # 12. 결과 비교
    print("\n" + "="*80)
    print("최종 결과 비교")
    print("="*80)
    
    print(f"\n[k 확장 테스트]")
    print(f"  최적 k: {best_k}")
    print(f"  Silhouette Score: {k_scores[best_k]['silhouette']:.4f}")
    print(f"  Davies-Bouldin Index: {k_scores[best_k]['davies_bouldin']:.4f}")
    
    if best_hdbscan:
        print(f"\n[HDBSCAN 실험]")
        print(f"  최적 설정: {best_hdbscan['key']}")
        print(f"  클러스터 수: {best_hdbscan['n_clusters']}")
        print(f"  노이즈: {best_hdbscan['n_noise']:,}명 ({best_hdbscan['noise_ratio']*100:.1f}%)")
        print(f"  Silhouette Score: {best_hdbscan['silhouette']:.4f}")
        print(f"  Davies-Bouldin Index: {best_hdbscan['davies_bouldin']:.4f}")
    
    print("\n" + "="*80)
    print("k 확장 테스트 완료!")
    print("="*80)
    
    return df, k_scores, best_k, hdbscan_scores, best_hdbscan, metadata


if __name__ == "__main__":
    # 실행
    df_result, k_scores, best_k, hdbscan_scores, best_hdbscan, metadata = create_k_extended_test(
        csv_path='clustering_data/data/welcome_1st_2nd_joined.csv',
        output_dir='clustering_data/data/precomputed'
    )

