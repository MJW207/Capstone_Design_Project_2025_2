"""
Precomputed 클러스터링 및 비교 분석 데이터 생성 스크립트
실시간 클러스터링 대신 미리 계산된 데이터를 사용
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from umap import UMAP
import json
import os
from pathlib import Path
import sys

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.clustering.compare import compare_groups, CONTINUOUS_FEATURES, BINARY_FEATURES, CATEGORICAL_FEATURES
from fastapi.exceptions import HTTPException

print("=" * 80)
print("Precomputed 클러스터링 및 비교 분석 데이터 생성")
print("=" * 80)

# 1. 데이터 로드
csv_path = 'clustering_data/data/welcome_1st_2nd_joined.csv'
print(f"\n[1단계] 데이터 로드: {csv_path}")

if not os.path.exists(csv_path):
    print(f"[ERROR] 파일을 찾을 수 없습니다: {csv_path}")
    sys.exit(1)

df = pd.read_csv(csv_path)
print(f"[OK] 원본 데이터: {len(df)}행, {len(df.columns)}열")

# 2. 피처 선택 (원래 MiniBatch K-Means에서 사용한 6개 핵심 피쳐)
features = [
    'age_scaled',
    'Q6_scaled',
    'education_level_scaled',
    'Q8_count_scaled',
    'Q8_premium_index',
    'is_premium_car',
]

print(f"\n[2단계] 피처 선택 및 검증")
print(f"요청된 피처 수: {len(features)}개")

available_features = []
for feat in features:
    if feat in df.columns:
        missing_ratio = df[feat].isna().sum() / len(df)
        variance = df[feat].var()
        if missing_ratio <= 0.3 and variance >= 0.01:
            available_features.append(feat)
            print(f"  [OK] {feat}: 사용 가능")
        else:
            print(f"  [WARN] {feat}: 결측치 {missing_ratio:.1%} 또는 분산 {variance:.6f}")
    else:
        print(f"  [X] {feat}: 컬럼이 존재하지 않음")

if len(available_features) < 3:
    print("[ERROR] 사용 가능한 피처가 3개 미만입니다.")
    sys.exit(1)

# 3. 전처리
print(f"\n[3단계] 전처리")
X = df[available_features].fillna(df[available_features].mean())
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print(f"[OK] 전처리 완료: {X_scaled.shape[0]}행 x {X_scaled.shape[1]}열")

# 4. K-Means 클러스터링 (k=3, 원래 실험에서 최적)
print(f"\n[4단계] K-Means 클러스터링 (k=3)")
kmeans = KMeans(n_clusters=3, random_state=42, n_init=20, max_iter=300)
labels = kmeans.fit_predict(X_scaled)
print(f"[OK] 클러스터링 완료")

# 클러스터 분포
unique, counts = np.unique(labels, return_counts=True)
print("\n클러스터 분포:")
for cluster_id, count in zip(unique, counts):
    print(f"  Cluster {cluster_id}: {count:,}명 ({count/len(labels)*100:.1f}%)")

# 5. 품질 지표 계산
print(f"\n[5단계] 품질 지표 계산")
silhouette = silhouette_score(X_scaled, labels)
davies_bouldin = davies_bouldin_score(X_scaled, labels)
calinski_harabasz = calinski_harabasz_score(X_scaled, labels)

print(f"  Silhouette Score: {silhouette:.4f}")
print(f"  Davies-Bouldin Index: {davies_bouldin:.4f}")
print(f"  Calinski-Harabasz Index: {calinski_harabasz:.2f}")

# 6. UMAP 차원 축소
print(f"\n[6단계] UMAP 차원 축소")
umap_model = UMAP(
    n_components=2,
    n_neighbors=15,
    min_dist=0.1,
    metric='cosine',
    random_state=42
)
coords_2d = umap_model.fit_transform(X_scaled)
print(f"[OK] UMAP 완료: {coords_2d.shape[0]}개 좌표 생성")

# 7. 클러스터링 결과 CSV 저장
print(f"\n[7단계] 클러스터링 결과 CSV 저장")
output_dir = Path('clustering_data/data/precomputed')
output_dir.mkdir(parents=True, exist_ok=True)

# 클러스터링 결과 DataFrame 생성
clustering_df = pd.DataFrame({
    'mb_sn': df['mb_sn'].values,
    'cluster': labels,
    'umap_x': coords_2d[:, 0],
    'umap_y': coords_2d[:, 1],
})

# 원본 데이터의 주요 컬럼도 포함
for col in ['age', 'Q6_income', 'Q7', 'Q8_count', 'gender', 'region']:
    if col in df.columns:
        clustering_df[col] = df[col].values

clustering_csv_path = output_dir / 'clustering_results.csv'
clustering_df.to_csv(clustering_csv_path, index=False, encoding='utf-8-sig')
print(f"[OK] 저장 완료: {clustering_csv_path}")

# 8. 메타데이터 저장
metadata = {
    'n_samples': len(df),
    'n_clusters': len(unique),
    'features': available_features,
    'silhouette_score': float(silhouette),
    'davies_bouldin_score': float(davies_bouldin),
    'calinski_harabasz_score': float(calinski_harabasz),
    'cluster_distribution': {
        int(cluster_id): int(count) for cluster_id, count in zip(unique, counts)
    },
    'cluster_percentages': {
        int(cluster_id): float(count/len(labels)*100) for cluster_id, count in zip(unique, counts)
    }
}

metadata_path = output_dir / 'clustering_metadata.json'
with open(metadata_path, 'w', encoding='utf-8') as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)
print(f"[OK] 메타데이터 저장 완료: {metadata_path}")

# 9. 비교 분석 데이터 생성 (모든 클러스터 쌍)
print(f"\n[8단계] 비교 분석 데이터 생성")

# 비교 분석에 사용할 컬럼 준비
df_with_cluster = df.copy()
df_with_cluster['cluster'] = labels

# 연속형, 이진형, 범주형 컬럼 자동 감지
numeric_cols = df_with_cluster.select_dtypes(include=[np.number]).columns.tolist()
numeric_cols = [col for col in numeric_cols if col not in ['cluster', 'mb_sn'] and col in CONTINUOUS_FEATURES]

binary_cols = []
for col in BINARY_FEATURES:
    if col in df_with_cluster.columns:
        unique_vals = df_with_cluster[col].nunique()
        if unique_vals <= 2:
            binary_cols.append(col)

categorical_cols = []
for col in CATEGORICAL_FEATURES:
    if col in df_with_cluster.columns:
        categorical_cols.append(col)

print(f"  연속형 변수: {len(numeric_cols)}개")
print(f"  이진 변수: {len(binary_cols)}개")
print(f"  범주형 변수: {len(categorical_cols)}개")

# 모든 클러스터 쌍에 대해 비교 분석 수행
comparison_results = {}
cluster_pairs = []

for i in range(len(unique)):
    for j in range(i + 1, len(unique)):
        cluster_a = int(unique[i])
        cluster_b = int(unique[j])
        pair_key = f"{cluster_a}_vs_{cluster_b}"
        cluster_pairs.append({
            'cluster_a': cluster_a,
            'cluster_b': cluster_b,
            'key': pair_key
        })
        
        print(f"\n  비교 분석: Cluster {cluster_a} vs Cluster {cluster_b}")
        
        try:
            comparison = compare_groups(
                df_with_cluster,
                labels,
                cluster_a,
                cluster_b,
                bin_cols=binary_cols,
                cat_cols=categorical_cols,
                num_cols=numeric_cols
            )
            
            comparison_results[pair_key] = {
                'cluster_a': cluster_a,
                'cluster_b': cluster_b,
                'comparison': comparison.get('comparison', []),
                'group_a': comparison.get('group_a', {}),
                'group_b': comparison.get('group_b', {})
            }
            print(f"    [OK] 비교 항목 {len(comparison.get('comparison', []))}개 생성")
        except Exception as e:
            print(f"    [ERROR] 비교 분석 실패: {str(e)}")
            comparison_results[pair_key] = {
                'cluster_a': cluster_a,
                'cluster_b': cluster_b,
                'error': str(e)
            }

# 비교 분석 결과 저장
comparison_path = output_dir / 'comparison_results.json'
with open(comparison_path, 'w', encoding='utf-8') as f:
    json.dump({
        'cluster_pairs': cluster_pairs,
        'comparisons': comparison_results
    }, f, ensure_ascii=False, indent=2, default=str)
print(f"\n[OK] 비교 분석 결과 저장 완료: {comparison_path}")

# 10. 클러스터 프로필 데이터 생성
print(f"\n[9단계] 클러스터 프로필 데이터 생성")

# 세션 ID 생성 (precomputed 데이터용)
session_id = "precomputed_default"

# artifacts를 load_artifacts가 기대하는 형식으로 저장
from app.clustering.artifacts import save_artifacts, new_session_dir
import joblib

try:
    # runs 디렉토리에 세션 디렉토리 생성
    session_dir = Path('runs') / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[DEBUG] 세션 디렉토리: {session_dir}")
    print(f"[DEBUG] 세션 디렉토리 존재 여부: {session_dir.exists()}")
    
    # 메타데이터 구성
    meta = {
        'result_meta': {
            'algorithm_info': {
                'features': available_features,
                'type': 'kmeans',
                'n_clusters': len(unique),
                'silhouette_score': float(silhouette),
                'davies_bouldin_score': float(davies_bouldin),
                'calinski_harabasz_score': float(calinski_harabasz),
            }
        }
    }
    
    # save_artifacts 사용 (올바른 형식으로 저장)
    print(f"[DEBUG] artifacts 저장 시작...")
    save_artifacts(
        session_dir=session_dir,
        df=df_with_cluster,
        labels=labels,
        meta=meta
    )
    print(f"[DEBUG] artifacts 저장 완료")
    
    # 추가 모델 저장 (있는 경우)
    if 'kmeans_model' in locals():
        model_path = session_dir / "model.joblib"
        joblib.dump(kmeans, model_path)
        print(f"[DEBUG] K-Means 모델 저장 완료: {model_path}")
    
    # 클러스터 프로필 생성 (비동기 함수를 직접 호출)
    print(f"[DEBUG] 클러스터 프로필 생성 시작...")
    from app.api.clustering_viz import get_cluster_profiles
    import asyncio
    
    # 비동기 함수를 동기적으로 실행
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        profiles_response = loop.run_until_complete(get_cluster_profiles(session_id))
        print(f"[DEBUG] 클러스터 프로필 응답 수신")
        print(f"[DEBUG] 응답 타입: {type(profiles_response)}")
        print(f"[DEBUG] 응답 속성: {dir(profiles_response)}")
        
        if hasattr(profiles_response, 'body'):
            profiles_data = json.loads(profiles_response.body)
            print(f"[DEBUG] 프로필 데이터 키: {profiles_data.keys() if isinstance(profiles_data, dict) else 'N/A'}")
            
            if profiles_data.get('success'):
                profiles_path = output_dir / 'cluster_profiles.json'
                with open(profiles_path, 'w', encoding='utf-8') as f:
                    json.dump(profiles_data, f, ensure_ascii=False, indent=2, default=str)
                print(f"[OK] 클러스터 프로필 저장 완료: {profiles_path}")
                print(f"[DEBUG] 저장된 프로필 수: {len(profiles_data.get('data', []))}개")
            else:
                error_msg = profiles_data.get('message', 'Unknown error')
                print(f"[ERROR] 클러스터 프로필 생성 실패: {error_msg}")
                print(f"[DEBUG] 전체 응답: {profiles_data}")
        else:
            print(f"[ERROR] 클러스터 프로필 응답 형식 오류")
            print(f"[DEBUG] 응답 객체: {profiles_response}")
    except HTTPException as http_err:
        print(f"[ERROR] HTTP 오류 발생: {http_err.status_code} - {http_err.detail}")
        print(f"[DEBUG] 세션 디렉토리 확인: {session_dir.exists()}")
        if session_dir.exists():
            print(f"[DEBUG] 세션 디렉토리 내용: {list(session_dir.iterdir())}")
        import traceback
        traceback.print_exc()
    except Exception as e:
        print(f"[ERROR] 클러스터 프로필 생성 중 예외 발생: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[DEBUG] 상세 스택 트레이스:")
        traceback.print_exc()
    finally:
        loop.close()
        
except Exception as e:
    print(f"[ERROR] 클러스터 프로필 생성 단계 전체 실패: {type(e).__name__}: {str(e)}")
    print(f"[DEBUG] 상세 오류 정보:")
    import traceback
    traceback.print_exc()
    print(f"[WARN] 프로필이 없어도 계속 진행합니다.")

# 최종 요약
print("\n" + "=" * 80)
print("생성 완료 요약")
print("=" * 80)
print(f"클러스터링 결과 CSV: {clustering_csv_path}")
print(f"메타데이터 JSON: {metadata_path}")
print(f"비교 분석 JSON: {comparison_path}")
print(f"클러스터 프로필 JSON: {output_dir / 'cluster_profiles.json'}")
print(f"\n생성된 클러스터: {len(unique)}개")
print(f"총 패널 수: {len(df):,}명")
print(f"비교 분석 쌍: {len(cluster_pairs)}개")
print("=" * 80)

