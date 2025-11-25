"""
새로운 프리미엄 제품 번호 [10, 13, 16, 22, 25, 26]로 재클러스터링
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

# 처음 버전 프리미엄 제품 번호 (제품명 기반)
# 로봇청소기(10), 무선청소기(11), 커피머신(12), 안마의자(13), 
# 의류관리기(16), 건조기(17), 식기세척기(19), 가정용식물재배기(21)
NEW_PREMIUM_PRODUCTS = [10, 11, 12, 13, 16, 17, 19, 21]
OLD_PREMIUM_PRODUCTS = [3, 9, 18, 20, 22, 25]

def load_raw_data():
    """원본 데이터 로드"""
    csv_path = project_root / "clustering_data" / "data" / "welcome_1st_2nd_joined.csv"
    
    if not csv_path.exists():
        print(f"[오류] 원본 CSV 파일을 찾을 수 없습니다: {csv_path}")
        return None
    
    print(f"원본 CSV 파일 로드 중: {csv_path}")
    df = pd.read_csv(csv_path, encoding='utf-8', nrows=None)
    print(f"로드 완료: {len(df)}행, {len(df.columns)}열")
    return df


def preprocess_data_with_new_premium(df: pd.DataFrame, premium_products: list) -> pd.DataFrame:
    """
    새로운 프리미엄 제품 번호로 데이터 전처리
    
    Args:
        df: 원본 데이터프레임
        premium_products: 프리미엄 제품 번호 리스트
    
    Returns:
        전처리된 데이터프레임
    """
    print(f"\n{'='*80}")
    print("데이터 전처리 시작 (새로운 프리미엄 제품 번호 적용)")
    print(f"{'='*80}")
    print(f"프리미엄 제품 번호: {premium_products}")
    
    df_processed = df.copy()
    
    # 1. Q8 데이터 파싱 및 프리미엄 지수 계산
    if 'Q8' in df_processed.columns or '보유전제품' in df_processed.columns:
        q8_col = 'Q8' if 'Q8' in df_processed.columns else '보유전제품'
        
        q8_counts = []
        q8_premium_indices = []
        
        for idx, q8_value in df_processed[q8_col].items():
            # Q8 값 파싱
            q8_list = []
            if pd.notna(q8_value):
                try:
                    if isinstance(q8_value, str):
                        import json
                        if q8_value.startswith('['):
                            q8_list = json.loads(q8_value)
                        elif ',' in q8_value:
                            q8_list = [int(x.strip()) for x in q8_value.split(',') if x.strip().isdigit()]
                    elif isinstance(q8_value, list):
                        q8_list = q8_value
                    elif isinstance(q8_value, (int, float)):
                        q8_list = [int(q8_value)]
                except:
                    q8_list = []
            
            # Q8_count: 총 전자제품 수
            q8_count = len(q8_list)
            q8_counts.append(q8_count)
            
            # 프리미엄 지수 계산 (새로운 프리미엄 제품 번호 사용)
            premium_count = sum(1 for x in q8_list if x in premium_products)
            premium_index = premium_count / max(q8_count, 1)  # 0~1 범위
            q8_premium_indices.append(premium_index)
        
        df_processed['Q8_count'] = q8_counts
        df_processed['Q8_premium_index'] = q8_premium_indices
        
        # Q8_count_scaled: MinMax 정규화
        if len(q8_counts) > 0 and max(q8_counts) > min(q8_counts):
            scaler_mm = MinMaxScaler()
            df_processed['Q8_count_scaled'] = scaler_mm.fit_transform(
                np.array(q8_counts).reshape(-1, 1)
            ).flatten()
        else:
            df_processed['Q8_count_scaled'] = 0.0
        
        print(f"Q8_count 통계: 평균={np.mean(q8_counts):.2f}, 최소={min(q8_counts)}, 최대={max(q8_counts)}")
        print(f"Q8_premium_index 통계: 평균={np.mean(q8_premium_indices):.4f}, 최소={min(q8_premium_indices):.4f}, 최대={max(q8_premium_indices):.4f}")
    else:
        print("[경고] Q8 또는 보유전제품 컬럼을 찾을 수 없습니다. 기본값 0으로 설정합니다.")
        df_processed['Q8_count'] = 0
        df_processed['Q8_count_scaled'] = 0.0
        df_processed['Q8_premium_index'] = 0.0
    
    # 2. is_premium_car 생성 (기존과 동일)
    car_brand_col = '자동차 제조사'
    if car_brand_col in df_processed.columns:
        premium_brands = ['테슬라', '벤츠', 'BMW', '아우디', '렉서스']
        df_processed['is_premium_car'] = df_processed[car_brand_col].apply(
            lambda x: any(brand in str(x) for brand in premium_brands) if pd.notna(x) else False
        )
        premium_car_count = df_processed['is_premium_car'].sum()
        print(f"프리미엄 차량 보유: {premium_car_count}개 ({premium_car_count/len(df_processed)*100:.2f}%)")
    else:
        df_processed['is_premium_car'] = False
        print("[경고] 자동차 제조사 컬럼을 찾을 수 없습니다. 기본값 False로 설정합니다.")
    
    # 3. 기타 필요한 피쳐 생성 (간단 버전)
    # age_scaled, Q6_scaled, education_level_scaled는 기존 전처리된 데이터에서 가져오거나
    # 여기서 계산해야 함. 일단 기존 CSV에서 로드하는 방식 사용
    
    return df_processed


def load_preprocessed_base_features():
    """기존 전처리된 데이터에서 기본 피쳐 로드"""
    csv_path = project_root / "clustering_data" / "data" / "precomputed" / "flc_income_clustering_hdbscan.csv"
    
    if not csv_path.exists():
        print(f"[오류] 전처리된 CSV 파일을 찾을 수 없습니다: {csv_path}")
        return None
    
    print(f"\n기존 전처리된 데이터에서 기본 피쳐 로드: {csv_path}")
    df_base = pd.read_csv(csv_path, encoding='utf-8', usecols=[
        'mb_sn', 'age_scaled', 'Q6_scaled', 'education_level_scaled', 
        'life_stage', 'income_tier', 'segment_initial'
    ])
    print(f"로드 완료: {len(df_base)}행")
    return df_base


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


def prepare_features_for_clustering(df_merged: pd.DataFrame) -> tuple:
    """
    클러스터링에 사용할 피쳐 준비
    
    Args:
        df_merged: 병합된 데이터프레임 (기본 피쳐 + 새로운 프리미엄 지수)
    
    Returns:
        (X, feature_names): 피쳐 매트릭스와 피쳐 이름 리스트
    """
    # 세그먼트 원-핫 인코딩
    df_merged = create_segment_onehot_features(df_merged)
    
    # 기본 피쳐 리스트
    base_features = [
        'age_scaled',
        'Q6_scaled',
        'education_level_scaled',
        'Q8_count_scaled',
        'Q8_premium_index',  # 새로운 프리미엄 지수
        'is_premium_car'
    ]
    
    # 세그먼트 원-핫 인코딩 변수 추가
    segment_features = [col for col in df_merged.columns if col.startswith('segment_') and col != 'segment_initial']
    
    # 존재하는 피쳐만 선택
    available_features = []
    for feat in base_features + segment_features:
        if feat in df_merged.columns:
            available_features.append(feat)
    
    print(f"\n선택된 피쳐 ({len(available_features)}개):")
    for i, feat in enumerate(available_features, 1):
        print(f"  {i}. {feat}")
    
    # 피쳐 매트릭스 생성
    X = df_merged[available_features].values
    
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


def save_results(df: pd.DataFrame, result: dict, feature_names: list, premium_products: list, output_dir: Path):
    """결과 저장"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 클러스터 레이블 추가
    df['cluster_hdbscan_new'] = result['labels']
    
    # CSV 저장
    output_csv = output_dir / f"hdbscan_new_premium_{timestamp}.csv"
    df.to_csv(output_csv, index=False, encoding='utf-8')
    print(f"\nCSV 파일 저장: {output_csv}")
    
    # 메타데이터 저장
    metadata = {
        "timestamp": timestamp,
        "premium_products": premium_products,
        "old_premium_products": OLD_PREMIUM_PRODUCTS,
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
    
    output_json = output_dir / f"hdbscan_new_premium_{timestamp}_metadata.json"
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"메타데이터 JSON 파일 저장: {output_json}")
    
    return output_csv, output_json


def main():
    """메인 함수"""
    print("=" * 80)
    print("HDBSCAN 클러스터링 재실행: 처음 버전 프리미엄 제품 번호 적용")
    print("=" * 80)
    print(f"\n기존 프리미엄 제품 번호: {OLD_PREMIUM_PRODUCTS}")
    print(f"처음 버전 프리미엄 제품 번호: {NEW_PREMIUM_PRODUCTS}")
    print(f"  (로봇청소기(10), 무선청소기(11), 커피머신(12), 안마의자(13),")
    print(f"   의류관리기(16), 건조기(17), 식기세척기(19), 가정용식물재배기(21))")
    
    # 1. 원본 데이터 로드
    print("\n1. 원본 데이터 로드 중...")
    df_raw = load_raw_data()
    if df_raw is None:
        return
    
    # 2. 기존 전처리된 데이터에서 기본 피쳐 로드
    print("\n2. 기존 전처리된 데이터에서 기본 피쳐 로드 중...")
    df_base = load_preprocessed_base_features()
    if df_base is None:
        return
    
    # 3. 새로운 프리미엄 제품 번호로 전처리
    print("\n3. 새로운 프리미엄 제품 번호로 전처리 중...")
    df_preprocessed = preprocess_data_with_new_premium(df_raw, NEW_PREMIUM_PRODUCTS)
    
    # 4. 데이터 병합 (mb_sn 기준)
    print("\n4. 데이터 병합 중...")
    df_merged = df_base.merge(
        df_preprocessed[['mb_sn', 'Q8_count', 'Q8_count_scaled', 'Q8_premium_index', 'is_premium_car']],
        on='mb_sn',
        how='inner'
    )
    print(f"병합 완료: {len(df_merged)}행")
    
    # 5. 피쳐 준비
    print("\n5. 클러스터링 피쳐 준비 중...")
    X, feature_names = prepare_features_for_clustering(df_merged)
    
    # 6. HDBSCAN 실행
    print("\n6. HDBSCAN 클러스터링 실행 중...")
    result = run_hdbscan(X, min_cluster_size=50, min_samples=50)
    
    # 7. 결과 저장
    print("\n7. 결과 저장 중...")
    output_dir = project_root / "clustering_data" / "data" / "precomputed"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # UMAP 좌표는 기존 데이터에서 가져오거나 새로 계산해야 함
    # 일단 기본 컬럼만 저장
    df_result = df_merged[['mb_sn', 'life_stage', 'income_tier', 'segment_initial', 
                          'age_scaled', 'Q6_scaled', 'education_level_scaled',
                          'Q8_count_scaled', 'Q8_premium_index', 'is_premium_car']].copy()
    df_result['cluster_hdbscan_new'] = result['labels']
    
    output_csv, output_json = save_results(df_result, result, feature_names, NEW_PREMIUM_PRODUCTS, output_dir)
    
    # 8. 기존 결과와 비교
    print("\n" + "=" * 80)
    print("기존 결과와 비교")
    print("=" * 80)
    
    print("\n기존 결과 (프리미엄 제품: [3, 9, 18, 20, 22, 25] - 김치냉장고, 일반청소기, 전기레인지, 에어프라이기, 노트북, 무선이어폰):")
    print("  - Silhouette Score: 0.6014")
    print("  - Davies-Bouldin Index: 0.6872")
    print("  - Calinski-Harabasz Index: 6385.79")
    print("  - 클러스터 수: 19개")
    print("  - 노이즈 포인트: 0.3%")
    
    print(f"\n처음 버전 결과 (프리미엄 제품: {NEW_PREMIUM_PRODUCTS} - 로봇청소기, 무선청소기, 커피머신, 안마의자, 의류관리기, 건조기, 식기세척기, 가정용식물재배기):")
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

