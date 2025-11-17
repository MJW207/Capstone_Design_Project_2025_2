"""
HDBSCAN 클러스터링 결과를 기반으로 모든 클러스터 쌍의 비교 분석 생성
19개 클러스터에 대한 모든 쌍 (171개)의 비교 분석을 미리 계산
"""
import pandas as pd
import numpy as np
import json
import os
from pathlib import Path
import sys

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.clustering.compare import compare_groups, CONTINUOUS_FEATURES, BINARY_FEATURES, CATEGORICAL_FEATURES

print("=" * 80)
print("HDBSCAN 클러스터 비교 분석 데이터 생성")
print("=" * 80)

# 프로젝트 루트 기준 경로
project_root = Path(__file__).resolve().parents[3]  # server/app/clustering/generate_hdbscan_comparisons.py -> 프로젝트 루트

# 1. HDBSCAN 결과 CSV 로드
hdbscan_csv_path = project_root / 'clustering_data' / 'data' / 'precomputed' / 'flc_income_clustering_hdbscan.csv'
print(f"\n[1단계] HDBSCAN 결과 로드: {hdbscan_csv_path}")

if not hdbscan_csv_path.exists():
    print(f"[ERROR] HDBSCAN 결과 파일을 찾을 수 없습니다: {hdbscan_csv_path}")
    print(f"[INFO] 먼저 HDBSCAN 클러스터링을 실행하세요.")
    sys.exit(1)

df_hdbscan = pd.read_csv(hdbscan_csv_path)
print(f"[OK] HDBSCAN 결과 로드 완료: {len(df_hdbscan)}행, {len(df_hdbscan.columns)}열")

# 1-1. 원본 데이터 로드 (원본 변수를 위해)
original_csv_paths = [
    project_root / 'clustering_data' / 'data' / 'welcome_1st_2nd_joined.csv',
    project_root / 'clustering_data' / 'data' / 'welcome_1st.csv',
]
df_original = None
for path in original_csv_paths:
    if path.exists():
        print(f"[INFO] 원본 데이터 로드 시도: {path.name}")
        df_original = pd.read_csv(path)
        print(f"[OK] 원본 데이터 로드 완료: {len(df_original)}행, {len(df_original.columns)}열")
        break

if df_original is None:
    print(f"[WARNING] 원본 데이터 파일을 찾을 수 없습니다. HDBSCAN 데이터만 사용합니다.")
    df = df_hdbscan.copy()
else:
    # mb_sn 기준으로 조인
    merge_key = 'mb_sn' if 'mb_sn' in df_hdbscan.columns else 'panel_id'
    if merge_key in df_original.columns:
        df = pd.merge(df_hdbscan, df_original, on=merge_key, how='left', suffixes=('', '_original'))
        print(f"[OK] 데이터 조인 완료: {len(df)}행, {len(df.columns)}열")
    else:
        print(f"[WARNING] 조인 키({merge_key})를 찾을 수 없습니다. HDBSCAN 데이터만 사용합니다.")
        df = df_hdbscan.copy()

# 클러스터 컬럼 확인
cluster_col = 'cluster_hdbscan' if 'cluster_hdbscan' in df.columns else 'cluster'
if cluster_col not in df.columns:
    print(f"[ERROR] 클러스터 컬럼을 찾을 수 없습니다. 사용 가능한 컬럼: {list(df.columns)}")
    sys.exit(1)

labels = df[cluster_col].values
unique_clusters = np.unique(labels)
unique_clusters = unique_clusters[unique_clusters != -1]  # 노이즈 제외

print(f"[OK] 클러스터 수: {len(unique_clusters)}개")
print(f"클러스터 ID: {sorted(unique_clusters.tolist())}")

# 클러스터별 패널 수
for cluster_id in sorted(unique_clusters):
    count = np.sum(labels == cluster_id)
    print(f"  Cluster {int(cluster_id)}: {count:,}명 ({count/len(df)*100:.2f}%)")

# 2. 비교 분석에 사용할 컬럼 준비 (정규화된 변수 제외, 원본 변수만 사용)
print(f"\n[2단계] 비교 분석 변수 준비 (원본 변수만 사용)")

# 연속형 변수: 원본 변수만 사용 (_scaled 제외)
numeric_cols = []
for col in CONTINUOUS_FEATURES:
    # 정규화된 변수는 제외
    if col.endswith('_scaled'):
        continue
    # 원본 변수가 있으면 사용
    if col in df.columns:
        numeric_cols.append(col)
    # Q6_income이 없으면 Q6 확인
    elif col == "Q6_income" and "Q6" in df.columns:
        numeric_cols.append("Q6")

# Q8_premium_index는 항상 추가 (이미 있으면, 정규화되지 않은 값)
if "Q8_premium_index" in df.columns:
    if "Q8_premium_index" not in numeric_cols:
        numeric_cols.append("Q8_premium_index")

# 추가 원본 변수들 (자녀수, 전자제품 수 등)
original_numeric_cols = [
    'Q8_count',           # 전자제품 수
    'Q6_income',          # 소득
    'Q6',                 # 소득 (대체)
    'age',                # 연령
    'children_count',     # 자녀 수
    'has_children',      # 자녀 유무 (이진형이지만 확인)
]
for col in original_numeric_cols:
    if col in df.columns and col not in numeric_cols:
        # 이진형이 아닌 숫자형만 추가
        if df[col].dtype in ['int64', 'float64'] and df[col].nunique() > 2:
            numeric_cols.append(col)

print(f"  연속형 변수: {len(numeric_cols)}개 - {numeric_cols[:5]}...")

# 이진 변수
binary_cols = []
for col in BINARY_FEATURES:
    if col in df.columns:
        unique_vals = df[col].nunique()
        if unique_vals <= 2:
            binary_cols.append(col)

# is_premium_car는 항상 추가 (이미 있으면)
if "is_premium_car" in df.columns:
    if "is_premium_car" not in binary_cols:
        binary_cols.append("is_premium_car")

print(f"  이진 변수: {len(binary_cols)}개 - {binary_cols[:5]}...")

# 범주형 변수: life_stage, income_tier 등 HDBSCAN CSV에 있는 변수 사용
categorical_cols = []
for col in CATEGORICAL_FEATURES:
    if col in df.columns:
        categorical_cols.append(col)

# HDBSCAN CSV에 있는 범주형 변수 추가
if "life_stage" in df.columns and "life_stage" not in categorical_cols:
    categorical_cols.append("life_stage")
if "income_tier" in df.columns and "income_tier" not in categorical_cols:
    categorical_cols.append("income_tier")

print(f"  범주형 변수: {len(categorical_cols)}개 - {categorical_cols[:5]}...")

# 3. 모든 클러스터 쌍에 대해 비교 분석 수행
print(f"\n[3단계] 모든 클러스터 쌍 비교 분석 생성")
print(f"총 쌍 수: {len(unique_clusters) * (len(unique_clusters) - 1) // 2}개")

comparison_results = {}
cluster_pairs = []
total_pairs = len(unique_clusters) * (len(unique_clusters) - 1) // 2
processed = 0

for i in range(len(unique_clusters)):
    for j in range(i + 1, len(unique_clusters)):
        cluster_a = int(unique_clusters[i])
        cluster_b = int(unique_clusters[j])
        pair_key = f"{cluster_a}_vs_{cluster_b}"
        
        cluster_pairs.append({
            'cluster_a': cluster_a,
            'cluster_b': cluster_b,
            'key': pair_key
        })
        
        processed += 1
        if processed % 10 == 0 or processed == total_pairs:
            print(f"  진행률: {processed}/{total_pairs} ({processed/total_pairs*100:.1f}%)")
        
        try:
            comparison = compare_groups(
                df,
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
            
            if processed % 20 == 0:
                print(f"    [OK] {pair_key}: {len(comparison.get('comparison', []))}개 항목")
        except Exception as e:
            print(f"    [ERROR] {pair_key} 비교 분석 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            comparison_results[pair_key] = {
                'cluster_a': cluster_a,
                'cluster_b': cluster_b,
                'error': str(e)
            }

# 4. 비교 분석 결과 저장
print(f"\n[4단계] 비교 분석 결과 저장")

output_dir = project_root / 'clustering_data' / 'data' / 'precomputed'
output_dir.mkdir(parents=True, exist_ok=True)

comparison_path = output_dir / 'comparison_results.json'

# 기존 파일이 있으면 백업
if comparison_path.exists():
    backup_path = output_dir / f'comparison_results_backup_{pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")}.json'
    import shutil
    shutil.copy2(comparison_path, backup_path)
    print(f"[INFO] 기존 파일 백업: {backup_path}")

# 새 파일 저장
with open(comparison_path, 'w', encoding='utf-8') as f:
    json.dump({
        'cluster_pairs': cluster_pairs,
        'comparisons': comparison_results,
        'metadata': {
            'n_clusters': len(unique_clusters),
            'total_pairs': len(cluster_pairs),
            'generated_at': pd.Timestamp.now().isoformat(),
            'source': 'flc_income_clustering_hdbscan.csv'
        }
    }, f, ensure_ascii=False, indent=2, default=str)

print(f"[OK] 비교 분석 결과 저장 완료: {comparison_path}")
print(f"  총 쌍 수: {len(cluster_pairs)}개")
print(f"  성공: {sum(1 for v in comparison_results.values() if 'error' not in v)}개")
print(f"  실패: {sum(1 for v in comparison_results.values() if 'error' in v)}개")

# 5. 샘플 확인
print(f"\n[5단계] 샘플 확인")
sample_keys = list(comparison_results.keys())[:3]
for key in sample_keys:
    comp = comparison_results[key]
    if 'error' not in comp:
        print(f"  {key}: {len(comp.get('comparison', []))}개 비교 항목")
    else:
        print(f"  {key}: 오류 - {comp.get('error', 'Unknown')}")

print("\n" + "=" * 80)
print("생성 완료!")
print("=" * 80)
print(f"비교 분석 JSON: {comparison_path}")
print(f"총 클러스터 쌍: {len(cluster_pairs)}개")
print("=" * 80)

