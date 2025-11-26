"""
프리미엄 지수(Q8_premium_index)를 제외하고 HDBSCAN 클러스터링 재실행
"""
import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np
import hdbscan
from sklearn.preprocessing import StandardScaler, MinMaxScaler, OneHotEncoder
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
import json
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Windows 이벤트 루프 정책 설정
if sys.platform == 'win32':
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

def load_clustering_data():
    """기존 전처리된 클러스터링 데이터 로드"""
    csv_path = project_root / "clustering_data" / "data" / "precomputed" / "flc_income_clustering_hdbscan.csv"
    
    if not csv_path.exists():
        print(f"[오류] CSV 파일을 찾을 수 없습니다: {csv_path}")
        return None
    
    print(f"CSV 파일 로드 중: {csv_path}")
    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"로드 완료: {len(df)}행, {len(df.columns)}열")
    return df


def create_segment_onehot_features(df: pd.DataFrame) -> pd.DataFrame:
    """세그먼트 원-핫 인코딩 피쳐 생성"""
    if 'segment_initial' in df.columns:
        segments = df['segment_initial'].dropna().unique()
        if len(segments) > 0:
            try:
                encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            except TypeError:
                encoder = OneHotEncoder(sparse=False, handle_unknown='ignore')
            
            segment_encoded = encoder.fit_transform(df[['segment_initial']])
            segment_df = pd.DataFrame(
                segment_encoded,
                columns=[f'segment_{i}' for i in range(segment_encoded.shape[1])],
                index=df.index
            )
            df = pd.concat([df, segment_df], axis=1)
            print(f"세그먼트 원-핫 인코딩 완료: {segment_encoded.shape[1]}개 변수")
    
    return df


def prepare_features(df: pd.DataFrame, exclude_premium_index: bool = True) -> tuple:
    """
    클러스터링에 사용할 피쳐 준비 (프리미엄 지수 제외)
    
    Args:
        df: 원본 데이터프레임
        exclude_premium_index: Q8_premium_index 제외 여부
    
    Returns:
        (X, feature_names): 피쳐 매트릭스와 피쳐 이름 리스트
    """
    # 세그먼트 원-핫 인코딩
    df = create_segment_onehot_features(df)
    
    # 기본 피쳐 리스트 (프리미엄 지수 제외)
    base_features = [
        'age_scaled',
        'Q6_scaled',
        'education_level_scaled',
        'Q8_count_scaled',
        'is_premium_car'
    ]
    
    # 프리미엄 지수 추가 여부
    if not exclude_premium_index and 'Q8_premium_index' in df.columns:
        base_features.append('Q8_premium_index')
    
    # 세그먼트 원-핫 인코딩 변수 추가
    segment_features = [col for col in df.columns if col.startswith('segment_') and col != 'segment_initial']
    
    # 존재하는 피쳐만 선택
    available_features = []
    for feat in base_features + segment_features:
        if feat in df.columns:
            available_features.append(feat)
    
    print(f"\n선택된 피쳐 ({len(available_features)}개):")
    for i, feat in enumerate(available_features, 1):
        print(f"  {i}. {feat}")
    
    # 피쳐 매트릭스 생성
    X = df[available_features].values
    
    # float 타입으로 변환
    X = X.astype(float)
    
    # 결측치 처리
    if np.isnan(X).any():
        print(f"[경고] 결측치 발견: {np.isnan(X).sum()}개")
        X = np.nan_to_num(X, nan=0.0)
    
    print(f"최종 피쳐 매트릭스 형태: {X.shape}")
    
    return X, available_features


def run_hdbscan(X: np.ndarray, min_cluster_size: int = 50, min_samples: int = 50) -> dict:
    """HDBSCAN 클러스터링 실행"""
    print(f"\n{'='*80}")
    print("HDBSCAN 클러스터링 실행")
    print(f"{'='*80}")
    print(f"파라미터:")
    print(f"  - min_cluster_size: {min_cluster_size}")
    print(f"  - min_samples: {min_samples}")
    print(f"  - metric: euclidean")
    print(f"  - cluster_selection_method: eom")
    print(f"  - 데이터 크기: {X.shape[0]}행, {X.shape[1]}차원")
    
    # HDBSCAN 실행
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric='euclidean',
        cluster_selection_method='eom'
    )
    
    labels = clusterer.fit_predict(X)
    
    # 결과 분석
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int(np.sum(labels == -1))
    noise_ratio = n_noise / len(labels) * 100
    
    print(f"\n클러스터링 결과:")
    print(f"  - 클러스터 수: {n_clusters}개")
    print(f"  - 노이즈 포인트: {n_noise}개 ({noise_ratio:.2f}%)")
    
    # 성능 지표 계산
    if n_clusters > 1:
        df_clustered = pd.DataFrame(X[labels != -1], columns=[f'feat_{i}' for i in range(X.shape[1])])
        labels_clustered = labels[labels != -1]
        
        if len(df_clustered) > 1:
            silhouette = silhouette_score(df_clustered.values, labels_clustered)
            davies_bouldin = davies_bouldin_score(df_clustered.values, labels_clustered)
            calinski_harabasz = calinski_harabasz_score(df_clustered.values, labels_clustered)
            
            print(f"\n성능 지표 (노이즈 제외):")
            print(f"  - Silhouette Score: {silhouette:.4f}")
            print(f"  - Davies-Bouldin Index: {davies_bouldin:.4f}")
            print(f"  - Calinski-Harabasz Index: {calinski_harabasz:.2f}")
        else:
            silhouette, davies_bouldin, calinski_harabasz = np.nan, np.nan, np.nan
    else:
        silhouette, davies_bouldin, calinski_harabasz = np.nan, np.nan, np.nan
        print("  - 클러스터 수가 부족하여 성능 지표를 계산할 수 없습니다.")
    
    # 클러스터별 크기
    print(f"\n클러스터별 크기:")
    cluster_sizes = pd.Series(labels).value_counts().sort_index()
    print(cluster_sizes.to_string())
    
    return {
        'labels': labels,
        'n_clusters': n_clusters,
        'n_noise': n_noise,
        'noise_ratio': noise_ratio,
        'silhouette_score': silhouette if n_clusters > 1 else None,
        'davies_bouldin_score': davies_bouldin if n_clusters > 1 else None,
        'calinski_harabasz_score': calinski_harabasz if n_clusters > 1 else None,
        'cluster_sizes': cluster_sizes.to_dict()
    }


def save_results(df: pd.DataFrame, result: dict, feature_names: list, exclude_premium_index: bool, output_dir: Path):
    """결과 저장"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 클러스터 레이블 추가
    df['cluster_hdbscan_no_premium'] = result['labels']
    
    # CSV 저장
    output_csv = output_dir / f"hdbscan_without_premium_index_{timestamp}.csv"
    df.to_csv(output_csv, index=False, encoding='utf-8')
    print(f"\nCSV 파일 저장: {output_csv}")
    
    # 메타데이터 저장
    metadata = {
        "timestamp": timestamp,
        "exclude_premium_index": exclude_premium_index,
        "n_samples": len(df),
        "n_features": len(feature_names),
        "features": feature_names,
        "parameters": {
            "min_cluster_size": 50,
            "min_samples": 50,
            "metric": "euclidean",
            "cluster_selection_method": "eom"
        },
        "results": {
            "n_clusters": result['n_clusters'],
            "n_noise": result['n_noise'],
            "noise_ratio": result['noise_ratio'],
            "silhouette_score": result['silhouette_score'],
            "davies_bouldin_score": result['davies_bouldin_score'],
            "calinski_harabasz_score": result['calinski_harabasz_score'],
            "cluster_sizes": result['cluster_sizes']
        }
    }
    
    output_json = output_dir / f"hdbscan_without_premium_index_{timestamp}_metadata.json"
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"메타데이터 JSON 파일 저장: {output_json}")
    
    return output_csv, output_json


def main():
    """메인 함수"""
    print("=" * 80)
    print("HDBSCAN 클러스터링 재실행: 프리미엄 지수 제외")
    print("=" * 80)
    
    # 1. 데이터 로드
    print("\n1. 데이터 로드 중...")
    df = load_clustering_data()
    if df is None:
        return
    
    # 2. 피쳐 준비 (프리미엄 지수 제외)
    print("\n2. 피쳐 준비 중 (Q8_premium_index 제외)...")
    X, feature_names = prepare_features(df, exclude_premium_index=True)
    print(f"최종 피쳐 매트릭스: {X.shape}")
    
    # 3. HDBSCAN 실행
    print("\n3. HDBSCAN 클러스터링 실행 중...")
    result = run_hdbscan(X, min_cluster_size=50, min_samples=50)
    
    # 4. 결과 저장
    print("\n4. 결과 저장 중...")
    output_dir = project_root / "clustering_data" / "data" / "precomputed"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_csv, output_json = save_results(df, result, feature_names, exclude_premium_index=True, output_dir=output_dir)
    
    # 5. 기존 결과와 비교
    print("\n" + "=" * 80)
    print("기존 결과와 비교")
    print("=" * 80)
    
    print("\n기존 결과 (프리미엄 지수 포함):")
    print("  - Silhouette Score: 0.6014")
    print("  - Davies-Bouldin Index: 0.6872")
    print("  - Calinski-Harabasz Index: 6385.79")
    print("  - 클러스터 수: 19개")
    print("  - 노이즈 포인트: 0.3%")
    
    print(f"\n새로운 결과 (프리미엄 지수 제외):")
    if result['silhouette_score']:
        print(f"  - Silhouette Score: {result['silhouette_score']:.4f}")
        print(f"  - Davies-Bouldin Index: {result['davies_bouldin_score']:.4f}")
        print(f"  - Calinski-Harabasz Index: {result['calinski_harabasz_score']:.2f}")
    else:
        print("  - 성능 지표 계산 불가")
    print(f"  - 클러스터 수: {result['n_clusters']}개")
    print(f"  - 노이즈 포인트: {result['noise_ratio']:.2f}%")
    
    if result['silhouette_score']:
        improvement = ((result['silhouette_score'] - 0.6014) / 0.6014) * 100
        print(f"\nSilhouette Score 변화: {improvement:+.2f}%")
    
    print("\n" + "=" * 80)
    print("완료!")
    print("=" * 80)
    print(f"\n결과 파일:")
    print(f"  - CSV: {output_csv}")
    print(f"  - 메타데이터: {output_json}")


if __name__ == "__main__":
    main()








