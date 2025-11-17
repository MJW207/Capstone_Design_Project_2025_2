"""
FLC × Income Matrix 클러스터링 추가 최적화 실험

목표: 기존 24개 피처 방식의 성능을 더 끌어올리기

실험:
A. k=6~12 확장 테스트
B. 가중치 조정 (age_scaled, Q6_scaled)
C. MiniBatch K-Means
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from umap import UMAP
import joblib
import os
import sys
from pathlib import Path
import json
import logging

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

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


def run_experiment_a(df, segment_encoded, scaler_base):
    """
    실험 A: k=6~12 확장 테스트 (기존 24개 피처)
    """
    print("\n" + "="*80)
    print("실험 A: k=6~12 확장 테스트 (기존 24개 피처)")
    print("="*80)
    
    # 기존 24개 피처 사용
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
    
    # 표준화
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_combined)
    
    print(f"[OK] 피처 매트릭스: {X_combined.shape} (18개 세그먼트 + 6개 추가)")
    
    # k=6~12 테스트
    best_scores = {}
    
    for k in range(6, 13):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=300)
        labels = kmeans.fit_predict(X_scaled)
        
        silhouette = silhouette_score(X_scaled, labels)
        db_score = davies_bouldin_score(X_scaled, labels)
        calinski = calinski_harabasz_score(X_scaled, labels)
        
        # 클러스터 크기 분포
        unique, counts = np.unique(labels, return_counts=True)
        min_size = counts.min()
        max_size = counts.max()
        balance = min_size / max_size if max_size > 0 else 0
        
        best_scores[k] = {
            'silhouette': silhouette,
            'davies_bouldin': db_score,
            'calinski_harabasz': calinski,
            'min_size': int(min_size),
            'max_size': int(max_size),
            'balance': balance,
            'labels': labels,
            'model': kmeans
        }
        
        print(f"k={k:2d}: Silhouette={silhouette:.4f}, DB={db_score:.4f}, "
              f"Calinski={calinski:.0f}, 균형도={balance:.2f}")
    
    # 최적 k 선택
    best_k = max(best_scores.keys(), key=lambda k: best_scores[k]['silhouette'])
    
    print(f"\n[결과] 최적 k: {best_k}")
    print(f"  Silhouette Score: {best_scores[best_k]['silhouette']:.4f}")
    print(f"  Davies-Bouldin Index: {best_scores[best_k]['davies_bouldin']:.4f}")
    print(f"  Calinski-Harabasz Index: {best_scores[best_k]['calinski_harabasz']:.0f}")
    print(f"  균형도: {best_scores[best_k]['balance']:.2f}")
    
    return {
        'experiment': '실험 A: k 확장 테스트',
        'best_k': best_k,
        'best_scores': best_scores,
        'X_scaled': X_scaled,
        'scaler': scaler,
        'additional_features': additional_features
    }


def run_experiment_b(df, segment_encoded, scaler_base):
    """
    실험 B: 가중치 조정 (age_scaled, Q6_scaled)
    """
    print("\n" + "="*80)
    print("실험 B: 가중치 조정 실험 (age_scaled, Q6_scaled)")
    print("="*80)
    
    weights = [0.1, 0.3, 0.5, 0.7, 1.0]
    best_scores = {}
    
    for weight in weights:
        # 세그먼트 더미는 그대로
        X_combined = segment_encoded.copy()
        
        # age, Q6에 가중치 적용
        if 'age_scaled' in df.columns:
            age_weighted = df['age_scaled'].fillna(df['age_scaled'].median()) * weight
            X_combined = np.hstack([X_combined, age_weighted.values.reshape(-1, 1)])
        else:
            print(f"[WARN] age_scaled 컬럼이 없습니다.")
            continue
        
        if 'Q6_scaled' in df.columns:
            q6_weighted = df['Q6_scaled'].fillna(df['Q6_scaled'].median()) * weight
            X_combined = np.hstack([X_combined, q6_weighted.values.reshape(-1, 1)])
        else:
            print(f"[WARN] Q6_scaled 컬럼이 없습니다.")
            continue
        
        # 나머지는 그대로
        other_features = ['education_level_scaled', 'Q8_count_scaled', 
                         'Q8_premium_index', 'is_premium_car']
        
        for feat in other_features:
            if feat in df.columns:
                feat_data = df[feat].fillna(df[feat].median() if df[feat].dtype in ['int64', 'float64'] else 0)
                X_combined = np.hstack([X_combined, feat_data.values.reshape(-1, 1)])
            else:
                print(f"[WARN] {feat} 컬럼이 없습니다.")
                X_combined = np.hstack([X_combined, np.zeros((len(df), 1))])
        
        # 표준화
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_combined)
        
        # k=8로 테스트 (기존 최적값)
        kmeans = KMeans(n_clusters=8, random_state=42, n_init=20, max_iter=300)
        labels = kmeans.fit_predict(X_scaled)
        
        silhouette = silhouette_score(X_scaled, labels)
        db_score = davies_bouldin_score(X_scaled, labels)
        calinski = calinski_harabasz_score(X_scaled, labels)
        
        best_scores[weight] = {
            'silhouette': silhouette,
            'davies_bouldin': db_score,
            'calinski_harabasz': calinski,
            'labels': labels,
            'model': kmeans,
            'scaler': scaler,
            'X_scaled': X_scaled
        }
        
        print(f"가중치 {weight:.1f}: Silhouette={silhouette:.4f}, DB={db_score:.4f}, "
              f"Calinski={calinski:.0f}")
    
    # 최적 가중치 선택
    best_weight = max(best_scores.keys(), key=lambda w: best_scores[w]['silhouette'])
    
    print(f"\n[결과] 최적 가중치: {best_weight:.1f}")
    print(f"  Silhouette Score: {best_scores[best_weight]['silhouette']:.4f}")
    print(f"  Davies-Bouldin Index: {best_scores[best_weight]['davies_bouldin']:.4f}")
    print(f"  Calinski-Harabasz Index: {best_scores[best_weight]['calinski_harabasz']:.0f}")
    
    return {
        'experiment': '실험 B: 가중치 조정',
        'best_weight': best_weight,
        'best_scores': best_scores,
        'additional_features': ['age_scaled', 'Q6_scaled', 'education_level_scaled', 
                               'Q8_count_scaled', 'Q8_premium_index', 'is_premium_car']
    }


def run_experiment_c(df, segment_encoded, scaler_base):
    """
    실험 C: MiniBatch K-Means
    """
    print("\n" + "="*80)
    print("실험 C: MiniBatch K-Means 테스트")
    print("="*80)
    
    # 기존 24개 피처 사용
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
    
    # 표준화
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_combined)
    
    print(f"[OK] 피처 매트릭스: {X_combined.shape} (18개 세그먼트 + 6개 추가)")
    
    # k=6~10 테스트
    best_scores = {}
    
    for k in range(6, 11):
        mbk = MiniBatchKMeans(
            n_clusters=k,
            random_state=42,
            batch_size=1000,
            n_init=20,
            max_iter=300
        )
        labels = mbk.fit_predict(X_scaled)
        
        silhouette = silhouette_score(X_scaled, labels)
        db_score = davies_bouldin_score(X_scaled, labels)
        calinski = calinski_harabasz_score(X_scaled, labels)
        
        # 클러스터 크기 분포
        unique, counts = np.unique(labels, return_counts=True)
        min_size = counts.min()
        max_size = counts.max()
        balance = min_size / max_size if max_size > 0 else 0
        
        best_scores[k] = {
            'silhouette': silhouette,
            'davies_bouldin': db_score,
            'calinski_harabasz': calinski,
            'min_size': int(min_size),
            'max_size': int(max_size),
            'balance': balance,
            'labels': labels,
            'model': mbk
        }
        
        print(f"k={k:2d}: Silhouette={silhouette:.4f}, DB={db_score:.4f}, "
              f"Calinski={calinski:.0f}, 균형도={balance:.2f}")
    
    # 최적 k 선택
    best_k = max(best_scores.keys(), key=lambda k: best_scores[k]['silhouette'])
    
    print(f"\n[결과] 최적 k: {best_k}")
    print(f"  Silhouette Score: {best_scores[best_k]['silhouette']:.4f}")
    print(f"  Davies-Bouldin Index: {best_scores[best_k]['davies_bouldin']:.4f}")
    print(f"  Calinski-Harabasz Index: {best_scores[best_k]['calinski_harabasz']:.0f}")
    print(f"  균형도: {best_scores[best_k]['balance']:.2f}")
    
    return {
        'experiment': '실험 C: MiniBatch K-Means',
        'best_k': best_k,
        'best_scores': best_scores,
        'X_scaled': X_scaled,
        'scaler': scaler,
        'additional_features': additional_features
    }


def create_advanced_optimization(
    csv_path: str = 'clustering_data/data/welcome_1st_2nd_joined.csv',
    output_dir: str = 'clustering_data/data/precomputed'
):
    """
    FLC × Income Matrix 클러스터링 추가 최적화 실험 수행
    """
    print("=" * 80)
    print("FLC × Income Matrix 클러스터링 추가 최적화 실험")
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
    
    # 실험 A: k 확장 테스트
    result_a = run_experiment_a(df, segment_encoded, None)
    
    # 실험 B: 가중치 조정
    result_b = run_experiment_b(df, segment_encoded, None)
    
    # 실험 C: MiniBatch K-Means
    result_c = run_experiment_c(df, segment_encoded, None)
    
    # 7. 결과 비교
    print("\n" + "="*80)
    print("최종 결과 요약")
    print("="*80)
    
    print(f"\n[기존 결과]")
    print(f"  k=8, 24개 피처: Silhouette=0.3061")
    
    print(f"\n[실험 A: k 확장 테스트]")
    print(f"  최적 k: {result_a['best_k']}")
    print(f"  Silhouette Score: {result_a['best_scores'][result_a['best_k']]['silhouette']:.4f}")
    print(f"  Davies-Bouldin Index: {result_a['best_scores'][result_a['best_k']]['davies_bouldin']:.4f}")
    
    print(f"\n[실험 B: 가중치 조정]")
    print(f"  최적 가중치: {result_b['best_weight']:.1f}")
    print(f"  Silhouette Score: {result_b['best_scores'][result_b['best_weight']]['silhouette']:.4f}")
    print(f"  Davies-Bouldin Index: {result_b['best_scores'][result_b['best_weight']]['davies_bouldin']:.4f}")
    
    print(f"\n[실험 C: MiniBatch K-Means]")
    print(f"  최적 k: {result_c['best_k']}")
    print(f"  Silhouette Score: {result_c['best_scores'][result_c['best_k']]['silhouette']:.4f}")
    print(f"  Davies-Bouldin Index: {result_c['best_scores'][result_c['best_k']]['davies_bouldin']:.4f}")
    
    # 최고 성능 찾기
    all_results = [
        ('기존', 8, 0.3061, 1.7035),
        ('실험 A', result_a['best_k'], 
         result_a['best_scores'][result_a['best_k']]['silhouette'],
         result_a['best_scores'][result_a['best_k']]['davies_bouldin']),
        ('실험 B', 8, 
         result_b['best_scores'][result_b['best_weight']]['silhouette'],
         result_b['best_scores'][result_b['best_weight']]['davies_bouldin']),
        ('실험 C', result_c['best_k'],
         result_c['best_scores'][result_c['best_k']]['silhouette'],
         result_c['best_scores'][result_c['best_k']]['davies_bouldin'])
    ]
    
    best_result = max(all_results, key=lambda x: x[2])
    
    print(f"\n{'='*80}")
    print(f"[최고 성능] {best_result[0]}")
    print(f"{'='*80}")
    print(f"  k: {best_result[1]}")
    print(f"  Silhouette Score: {best_result[2]:.4f}")
    print(f"  Davies-Bouldin Index: {best_result[3]:.4f}")
    
    # 8. 결과 저장
    print(f"\n[8단계] 결과 저장")
    
    metadata = {
        'method': 'FLC × Income Matrix (Advanced Optimization)',
        'reference': 'Kim & Lee (2023)',
        'n_samples': len(df),
        'baseline': {
            'k': 8,
            'silhouette_score': 0.3061,
            'davies_bouldin_index': 1.7035
        },
        'experiment_a': {
            'best_k': result_a['best_k'],
            'silhouette_score': float(result_a['best_scores'][result_a['best_k']]['silhouette']),
            'davies_bouldin_index': float(result_a['best_scores'][result_a['best_k']]['davies_bouldin']),
            'all_k_results': {
                str(k): {
                    'silhouette_score': float(v['silhouette']),
                    'davies_bouldin_index': float(v['davies_bouldin']),
                    'calinski_harabasz_index': float(v['calinski_harabasz'])
                }
                for k, v in result_a['best_scores'].items()
            }
        },
        'experiment_b': {
            'best_weight': float(result_b['best_weight']),
            'silhouette_score': float(result_b['best_scores'][result_b['best_weight']]['silhouette']),
            'davies_bouldin_index': float(result_b['best_scores'][result_b['best_weight']]['davies_bouldin']),
            'all_weight_results': {
                str(w): {
                    'silhouette_score': float(v['silhouette']),
                    'davies_bouldin_index': float(v['davies_bouldin']),
                    'calinski_harabasz_index': float(v['calinski_harabasz'])
                }
                for w, v in result_b['best_scores'].items()
            }
        },
        'experiment_c': {
            'best_k': result_c['best_k'],
            'silhouette_score': float(result_c['best_scores'][result_c['best_k']]['silhouette']),
            'davies_bouldin_index': float(result_c['best_scores'][result_c['best_k']]['davies_bouldin']),
            'all_k_results': {
                str(k): {
                    'silhouette_score': float(v['silhouette']),
                    'davies_bouldin_index': float(v['davies_bouldin']),
                    'calinski_harabasz_index': float(v['calinski_harabasz'])
                }
                for k, v in result_c['best_scores'].items()
            }
        },
        'best_overall': {
            'experiment': best_result[0],
            'k': best_result[1],
            'silhouette_score': float(best_result[2]),
            'davies_bouldin_index': float(best_result[3])
        }
    }
    
    metadata_file = output_dir_path / 'flc_income_advanced_optimization_metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[OK] 메타데이터 저장: {metadata_file}")
    
    print("\n" + "="*80)
    print("추가 최적화 실험 완료!")
    print("="*80)
    
    return df, result_a, result_b, result_c, metadata


if __name__ == "__main__":
    # 실행
    df_result, result_a, result_b, result_c, metadata = create_advanced_optimization(
        csv_path='clustering_data/data/welcome_1st_2nd_joined.csv',
        output_dir='clustering_data/data/precomputed'
    )

