"""
FLC × Income Matrix 클러스터링 최적화 실험

문제점: age_scaled와 Q6_scaled가 생애주기/소득 계층에 이미 포함되어 중복 사용됨
해결: 중복 제거 및 새로운 피처 추가로 최적화

실험:
1. 실험 1: 중복 제거 (4개 피처)
2. 실험 2: 피처 추가 (8개 피처)
3. 실험 3: k값 최적화
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
import json
import logging

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'  # Windows
plt.rcParams['axes.unicode_minus'] = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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


def analyze_clusters(df, labels, experiment_name, life_stage_col='life_stage', income_tier_col='income_tier'):
    """클러스터 분석 함수"""
    print(f"\n{'='*80}")
    print(f"{experiment_name}")
    print(f"{'='*80}")
    
    n_clusters = len(np.unique(labels))
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
    
    for i in range(n_clusters):
        cluster_data = df_temp[df_temp['cluster'] == i]
        print(f"\n--- Cluster {i} ({len(cluster_data):,}명, {len(cluster_data)/len(df)*100:.1f}%) ---")
        
        # 기본 통계
        if 'age' in cluster_data.columns:
            print(f"평균 나이: {cluster_data['age'].mean():.1f}세")
        if 'Q6_income' in cluster_data.columns:
            print(f"평균 소득: {cluster_data['Q6_income'].mean():.0f}만원")
        elif 'Q6_scaled' in cluster_data.columns:
            print(f"평균 소득 (scaled): {cluster_data['Q6_scaled'].mean():.3f}")
        if 'has_children' in cluster_data.columns:
            print(f"자녀 있음: {cluster_data['has_children'].mean():.1%}")
        if 'Q8_premium_index' in cluster_data.columns:
            print(f"프리미엄 지수: {cluster_data['Q8_premium_index'].mean():.3f}")
        
        # 주요 생애주기
        if life_stage_col in cluster_data.columns:
            top_stages = cluster_data[life_stage_col].value_counts().head(2)
            print(f"주요 생애주기: ", end="")
            for stage, count in top_stages.items():
                stage_name = stage_names.get(int(stage), f'Stage{stage}')
                print(f"{stage_name}({count/len(cluster_data)*100:.0f}%) ", end="")
            print()
        
        # 소득 분포
        if income_tier_col in cluster_data.columns:
            income_dist = cluster_data[income_tier_col].value_counts()
            print(f"소득 분포: Low={income_dist.get('low', 0):,}명, "
                  f"Mid={income_dist.get('mid', 0):,}명, "
                  f"High={income_dist.get('high', 0):,}명")


def run_experiment_1(df, segment_encoded, output_dir):
    """
    실험 1: 중복 제거 (age_scaled, Q6_scaled 제거)
    피처: 18개 세그먼트 + 4개 추가 피처 = 22개
    """
    print("\n" + "="*80)
    print("실험 1: 중복 제거 (4개 피처)")
    print("="*80)
    
    # 추가 피처 (age_scaled, Q6_scaled 제거)
    additional_features = [
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
    print(f"[OK] 결합된 피처 매트릭스: {X_combined.shape}")
    print(f"  - 세그먼트 원-핫: {segment_encoded.shape[1]}개")
    print(f"  - 추가 피처: {len(additional_features)}개 (age_scaled, Q6_scaled 제거)")
    print(f"  - 총: {X_combined.shape[1]}개")
    
    # 표준화
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_combined)
    
    # K-Means (k=6, 7, 8 테스트)
    results = []
    best_k = 6
    best_score = -1
    best_labels = None
    best_model = None
    
    for k in range(6, 9):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=300)
        labels = kmeans.fit_predict(X_scaled)
        
        silhouette = silhouette_score(X_scaled, labels)
        db_index = davies_bouldin_score(X_scaled, labels)
        
        results.append({
            'k': k,
            'silhouette_score': silhouette,
            'davies_bouldin_index': db_index,
            'labels': labels,
            'model': kmeans
        })
        
        print(f"\n[테스트] k={k}")
        print(f"  Silhouette Score: {silhouette:.4f}")
        print(f"  Davies-Bouldin Index: {db_index:.4f}")
        
        if silhouette > best_score:
            best_score = silhouette
            best_k = k
            best_labels = labels
            best_model = kmeans
    
    print(f"\n[결과] 최적 k: {best_k}, Silhouette Score: {best_score:.4f}")
    
    # 분석
    analyze_clusters(df, best_labels, f"실험 1: 중복 제거 (k={best_k})")
    
    return {
        'experiment': '실험 1: 중복 제거',
        'features': additional_features,
        'n_features': X_combined.shape[1],
        'best_k': best_k,
        'silhouette_score': best_score,
        'davies_bouldin_index': results[best_k - 6]['davies_bouldin_index'],
        'labels': best_labels,
        'model': best_model,
        'scaler': scaler,
        'X_scaled': X_scaled
    }


def run_experiment_2(df, segment_encoded, output_dir):
    """
    실험 2: 피처 추가 (8개 피처)
    피처: 18개 세그먼트 + 8개 추가 피처 = 26개
    """
    print("\n" + "="*80)
    print("실험 2: 피처 추가 (8개 피처)")
    print("="*80)
    
    # 추가 피처 (age_scaled, Q6_scaled 제거 + 새로운 피처 추가)
    additional_features = [
        # 소비 패턴 (4개)
        'education_level_scaled',
        'Q8_count_scaled',
        'Q8_premium_index',
        'is_premium_car',
        
        # 라이프스타일 (2개) - 새로 추가
        'has_drinking_experience',
        'is_apple_user',
        
        # 지역/가족 (2개) - 새로 추가
        'is_metro',
        'has_children'  # life_stage에 포함되지만 세밀화용
    ]
    
    # 결측치 처리
    X_additional = df[additional_features].copy()
    for col in X_additional.columns:
        if col not in df.columns:
            print(f"[WARN] {col} 컬럼이 없습니다. 0으로 채웁니다.")
            X_additional[col] = 0
        elif X_additional[col].isna().sum() > 0:
            if X_additional[col].dtype in ['int64', 'float64']:
                X_additional[col] = X_additional[col].fillna(X_additional[col].median())
            else:
                X_additional[col] = X_additional[col].fillna(0)
    
    # 결합
    X_combined = np.hstack([segment_encoded, X_additional.values])
    print(f"[OK] 결합된 피처 매트릭스: {X_combined.shape}")
    print(f"  - 세그먼트 원-핫: {segment_encoded.shape[1]}개")
    print(f"  - 추가 피처: {len(additional_features)}개")
    print(f"    * 소비 패턴: education_level_scaled, Q8_count_scaled, Q8_premium_index, is_premium_car")
    print(f"    * 라이프스타일: has_drinking_experience, is_apple_user")
    print(f"    * 지역/가족: is_metro, has_children")
    print(f"  - 총: {X_combined.shape[1]}개")
    
    # 표준화
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_combined)
    
    # K-Means (k=6, 7, 8 테스트)
    results = []
    best_k = 6
    best_score = -1
    best_labels = None
    best_model = None
    
    for k in range(6, 9):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=300)
        labels = kmeans.fit_predict(X_scaled)
        
        silhouette = silhouette_score(X_scaled, labels)
        db_index = davies_bouldin_score(X_scaled, labels)
        
        results.append({
            'k': k,
            'silhouette_score': silhouette,
            'davies_bouldin_index': db_index,
            'labels': labels,
            'model': kmeans
        })
        
        print(f"\n[테스트] k={k}")
        print(f"  Silhouette Score: {silhouette:.4f}")
        print(f"  Davies-Bouldin Index: {db_index:.4f}")
        
        if silhouette > best_score:
            best_score = silhouette
            best_k = k
            best_labels = labels
            best_model = kmeans
    
    print(f"\n[결과] 최적 k: {best_k}, Silhouette Score: {best_score:.4f}")
    
    # 분석
    analyze_clusters(df, best_labels, f"실험 2: 피처 추가 (k={best_k})")
    
    return {
        'experiment': '실험 2: 피처 추가',
        'features': additional_features,
        'n_features': X_combined.shape[1],
        'best_k': best_k,
        'silhouette_score': best_score,
        'davies_bouldin_index': results[best_k - 6]['davies_bouldin_index'],
        'labels': best_labels,
        'model': best_model,
        'scaler': scaler,
        'X_scaled': X_scaled
    }


def run_experiment_3(df, segment_encoded, best_experiment_result, output_dir):
    """
    실험 3: k값 최적화 (k=3~8 범위)
    """
    print("\n" + "="*80)
    print("실험 3: k값 최적화 (k=3~8)")
    print("="*80)
    
    # 가장 좋은 실험의 피처 조합 사용
    X_scaled = best_experiment_result['X_scaled']
    features_used = best_experiment_result['features']
    
    print(f"[사용 피처 조합]: {best_experiment_result['experiment']}")
    print(f"[피처 수]: {best_experiment_result['n_features']}개")
    
    # k=3~8 범위 테스트
    results = []
    best_k = 3
    best_score = -1
    best_labels = None
    best_model = None
    
    for k in range(3, 9):
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
            'inertia': inertia,
            'labels': labels,
            'model': kmeans
        })
        
        print(f"\n[테스트] k={k}")
        print(f"  Silhouette Score: {silhouette:.4f}")
        print(f"  Davies-Bouldin Index: {db_index:.4f}")
        print(f"  Calinski-Harabasz Index: {ch_index:.2f}")
        print(f"  Inertia: {inertia:.2f}")
        
        # 클러스터 분포
        unique, counts = np.unique(labels, return_counts=True)
        print(f"  클러스터 분포:")
        for cid, count in zip(unique, counts):
            print(f"    Cluster {cid}: {count:,}명 ({count/len(labels)*100:.1f}%)")
        
        if silhouette > best_score:
            best_score = silhouette
            best_k = k
            best_labels = labels
            best_model = kmeans
    
    print(f"\n[결과] 최적 k: {best_k}, Silhouette Score: {best_score:.4f}")
    
    # 분석
    analyze_clusters(df, best_labels, f"실험 3: k값 최적화 (k={best_k})")
    
    return {
        'experiment': '실험 3: k값 최적화',
        'base_experiment': best_experiment_result['experiment'],
        'features': features_used,
        'n_features': best_experiment_result['n_features'],
        'best_k': best_k,
        'silhouette_score': best_score,
        'davies_bouldin_index': results[best_k - 3]['davies_bouldin_index'],
        'calinski_harabasz_index': results[best_k - 3]['calinski_harabasz_index'],
        'all_results': results,
        'labels': best_labels,
        'model': best_model,
        'scaler': best_experiment_result['scaler'],
        'X_scaled': X_scaled
    }


def create_flc_income_optimized(
    csv_path: str = 'clustering_data/data/welcome_1st_2nd_joined.csv',
    output_dir: str = 'clustering_data/data/precomputed'
):
    """
    FLC × Income Matrix 클러스터링 최적화 실험 수행
    """
    print("=" * 80)
    print("FLC × Income Matrix 클러스터링 최적화 실험")
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
    
    # 6. 실험 수행
    output_dir_path = Path(output_dir)
    output_dir_path.mkdir(parents=True, exist_ok=True)
    
    # 실험 1: 중복 제거
    result_1 = run_experiment_1(df, segment_encoded, output_dir_path)
    
    # 실험 2: 피처 추가
    result_2 = run_experiment_2(df, segment_encoded, output_dir_path)
    
    # 실험 3: k값 최적화 (가장 좋은 실험 선택)
    if result_2['silhouette_score'] > result_1['silhouette_score']:
        best_experiment = result_2
        print(f"\n[선택] 실험 2가 더 좋은 성능 (Silhouette: {result_2['silhouette_score']:.4f} > {result_1['silhouette_score']:.4f})")
    else:
        best_experiment = result_1
        print(f"\n[선택] 실험 1이 더 좋은 성능 (Silhouette: {result_1['silhouette_score']:.4f} > {result_2['silhouette_score']:.4f})")
    
    result_3 = run_experiment_3(df, segment_encoded, best_experiment, output_dir_path)
    
    # 7. 결과 비교
    print("\n" + "="*80)
    print("실험 결과 비교")
    print("="*80)
    print(f"{'실험':<30} {'피처 수':<10} {'k':<5} {'Silhouette':<12} {'Davies-Bouldin':<15}")
    print("-"*80)
    print(f"{result_1['experiment']:<30} {result_1['n_features']:<10} {result_1['best_k']:<5} {result_1['silhouette_score']:<12.4f} {result_1['davies_bouldin_index']:<15.4f}")
    print(f"{result_2['experiment']:<30} {result_2['n_features']:<10} {result_2['best_k']:<5} {result_2['silhouette_score']:<12.4f} {result_2['davies_bouldin_index']:<15.4f}")
    print(f"{result_3['experiment']:<30} {result_3['n_features']:<10} {result_3['best_k']:<5} {result_3['silhouette_score']:<12.4f} {result_3['davies_bouldin_index']:<15.4f}")
    
    # 최종 추천
    all_results = [result_1, result_2, result_3]
    best_result = max(all_results, key=lambda x: x['silhouette_score'])
    print(f"\n[최종 추천] {best_result['experiment']}")
    print(f"  피처 수: {best_result['n_features']}개")
    print(f"  최적 k: {best_result['best_k']}")
    print(f"  Silhouette Score: {best_result['silhouette_score']:.4f}")
    print(f"  Davies-Bouldin Index: {best_result['davies_bouldin_index']:.4f}")
    
    # 8. UMAP 차원 축소
    print(f"\n[8단계] UMAP 차원 축소")
    umap_model = UMAP(
        n_components=2,
        n_neighbors=15,
        min_dist=0.1,
        metric='cosine',
        random_state=42
    )
    coords_2d = umap_model.fit_transform(best_result['X_scaled'])
    df['umap_x'] = coords_2d[:, 0]
    df['umap_y'] = coords_2d[:, 1]
    df['cluster_optimized'] = best_result['labels']
    print(f"[OK] UMAP 완료: {coords_2d.shape[0]}개 좌표 생성")
    
    # 9. 결과 저장
    print(f"\n[9단계] 결과 저장")
    
    # 클러스터링 결과 CSV
    output_csv = output_dir_path / 'flc_income_clustering_optimized.csv'
    df[['mb_sn', 'cluster_optimized', 'umap_x', 'umap_y', 'life_stage', 'income_tier', 
        'segment_initial']].to_csv(output_csv, index=False)
    print(f"[OK] 클러스터링 결과 저장: {output_csv}")
    
    # 메타데이터 JSON
    metadata = {
        'method': 'FLC × Income Matrix (Optimized)',
        'reference': 'Kim & Lee (2023)',
        'n_samples': len(df),
        'best_experiment': best_result['experiment'],
        'n_features': best_result['n_features'],
        'features_used': best_result['features'],
        'n_clusters': best_result['best_k'],
        'silhouette_score': float(best_result['silhouette_score']),
        'davies_bouldin_index': float(best_result['davies_bouldin_index']),
        'calinski_harabasz_index': float(best_result.get('calinski_harabasz_index', 0)),
        'experiment_1': {
            'silhouette_score': float(result_1['silhouette_score']),
            'davies_bouldin_index': float(result_1['davies_bouldin_index']),
            'best_k': result_1['best_k'],
            'n_features': result_1['n_features']
        },
        'experiment_2': {
            'silhouette_score': float(result_2['silhouette_score']),
            'davies_bouldin_index': float(result_2['davies_bouldin_index']),
            'best_k': result_2['best_k'],
            'n_features': result_2['n_features']
        },
        'experiment_3': {
            'silhouette_score': float(result_3['silhouette_score']),
            'davies_bouldin_index': float(result_3['davies_bouldin_index']),
            'best_k': result_3['best_k'],
            'n_features': result_3['n_features'],
            'all_k_results': [
                {
                    'k': r['k'],
                    'silhouette_score': float(r['silhouette_score']),
                    'davies_bouldin_index': float(r['davies_bouldin_index'])
                }
                for r in result_3.get('all_results', [])
            ]
        }
    }
    
    metadata_file = output_dir_path / 'flc_income_clustering_optimized_metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[OK] 메타데이터 저장: {metadata_file}")
    
    # 모델 저장
    model_file = output_dir_path / 'flc_income_clustering_optimized_model.pkl'
    joblib.dump({
        'kmeans': best_result['model'],
        'scaler': best_result['scaler'],
        'encoder': encoder,
        'umap': umap_model,
        'best_k': best_result['best_k'],
        'experiment': best_result['experiment'],
        'features': best_result['features']
    }, model_file)
    print(f"[OK] 모델 저장: {model_file}")
    
    # 10. 시각화
    print(f"\n[10단계] 시각화 생성")
    viz_dir = output_dir_path / 'visualizations'
    viz_dir.mkdir(exist_ok=True)
    
    # UMAP 시각화
    fig, ax = plt.subplots(figsize=(12, 10))
    scatter = ax.scatter(
        df['umap_x'],
        df['umap_y'],
        c=df['cluster_optimized'],
        cmap='tab10',
        alpha=0.6,
        s=10
    )
    ax.set_xlabel('UMAP Dimension 1')
    ax.set_ylabel('UMAP Dimension 2')
    ax.set_title(f'UMAP Visualization - {best_result["experiment"]} (k={best_result["best_k"]}, Silhouette={best_result["silhouette_score"]:.3f})')
    plt.colorbar(scatter, ax=ax, label='Cluster')
    plt.tight_layout()
    plt.savefig(viz_dir / 'umap_optimized.png', dpi=300)
    print(f"[OK] UMAP 시각화 저장: {viz_dir / 'umap_optimized.png'}")
    plt.close()
    
    # 실험 비교 그래프
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle('실험 결과 비교', fontsize=16)
    
    experiments = ['실험 1\n(중복 제거)', '실험 2\n(피처 추가)', '실험 3\n(k 최적화)']
    silhouette_scores = [
        result_1['silhouette_score'],
        result_2['silhouette_score'],
        result_3['silhouette_score']
    ]
    db_indices = [
        result_1['davies_bouldin_index'],
        result_2['davies_bouldin_index'],
        result_3['davies_bouldin_index']
    ]
    
    axes[0].bar(experiments, silhouette_scores, color=['skyblue', 'lightgreen', 'gold'])
    axes[0].set_title('Silhouette Score 비교 (높을수록 좋음)')
    axes[0].set_ylabel('Score')
    axes[0].grid(True, alpha=0.3, axis='y')
    for i, score in enumerate(silhouette_scores):
        axes[0].text(i, score + 0.01, f'{score:.4f}', ha='center', va='bottom', fontweight='bold')
    
    axes[1].bar(experiments, db_indices, color=['lightcoral', 'lightgreen', 'gold'])
    axes[1].set_title('Davies-Bouldin Index 비교 (낮을수록 좋음)')
    axes[1].set_ylabel('Index')
    axes[1].grid(True, alpha=0.3, axis='y')
    for i, score in enumerate(db_indices):
        axes[1].text(i, score + 0.05, f'{score:.4f}', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(viz_dir / 'experiment_comparison.png', dpi=300)
    print(f"[OK] 실험 비교 그래프 저장: {viz_dir / 'experiment_comparison.png'}")
    plt.close()
    
    # k값별 실루엣 스코어 (실험 3)
    if 'all_results' in result_3:
        fig, ax = plt.subplots(figsize=(10, 6))
        k_values = [r['k'] for r in result_3['all_results']]
        silhouette_scores = [r['silhouette_score'] for r in result_3['all_results']]
        ax.plot(k_values, silhouette_scores, marker='o', linestyle='-', linewidth=2, markersize=8, color='skyblue')
        ax.axvline(x=result_3['best_k'], color='red', linestyle='--', label=f'Best k={result_3["best_k"]}')
        ax.set_xlabel('Number of Clusters (k)')
        ax.set_ylabel('Silhouette Score')
        ax.set_title('실험 3: k값별 Silhouette Score')
        ax.grid(True, alpha=0.3)
        ax.legend()
        plt.tight_layout()
        plt.savefig(viz_dir / 'k_optimization.png', dpi=300)
        print(f"[OK] k값 최적화 그래프 저장: {viz_dir / 'k_optimization.png'}")
        plt.close()
    
    print("\n" + "="*80)
    print("FLC × Income Matrix 클러스터링 최적화 실험 완료!")
    print("="*80)
    print(f"\n최종 결과:")
    print(f"  최적 실험: {best_result['experiment']}")
    print(f"  피처 수: {best_result['n_features']}개")
    print(f"  최적 k: {best_result['best_k']}")
    print(f"  Silhouette Score: {best_result['silhouette_score']:.4f}")
    print(f"  Davies-Bouldin Index: {best_result['davies_bouldin_index']:.4f}")
    print(f"\n결과 저장 위치:")
    print(f"  - 클러스터링 결과: {output_csv}")
    print(f"  - 메타데이터: {metadata_file}")
    print(f"  - 모델: {model_file}")
    print(f"  - 시각화: {viz_dir}")
    
    return df, best_result, metadata


if __name__ == "__main__":
    # 실행
    df_result, best_result, metadata = create_flc_income_optimized(
        csv_path='clustering_data/data/welcome_1st_2nd_joined.csv',
        output_dir='clustering_data/data/precomputed'
    )

