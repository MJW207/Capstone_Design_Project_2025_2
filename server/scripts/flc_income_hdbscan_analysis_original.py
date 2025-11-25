"""
HDBSCAN 클러스터링 결과 UMAP 시각화 및 메타데이터 분석

최적 설정: min_cluster_size=50, min_samples=50
클러스터 수: 19개, Silhouette Score: 0.6014

이 파일은 Git 히스토리에서 복원한 원본 클러스터링 코드입니다.
커밋: 1e97a8f^ (프로젝트 정리 및 NeonDB 마이그레이션 이전)
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
    print("[ERROR] HDBSCAN이 설치되어 있지 않습니다.")
    sys.exit(1)

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'  # Windows
plt.rcParams['axes.unicode_minus'] = False


def get_life_stage(row):
    """가족 생애주기 단계 결정"""
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
        2: '딩크부부',
        3: '젊은부모',
        4: '성숙부모',
        5: '중년',
        6: '시니어'
    }
    
    income_names = {
        'low': '저소득',
        'mid': '중간소득',
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
        print(f"\n{'-'*80}")
        print(f"Cluster {cluster_id} | {len(cluster_data):,}명({len(cluster_data)/len(df)*100:.1f}%)")
        print(f"{'-'*80}")
        
        print(f"\n[인구통계]")
        if 'avg_age' in profile:
            print(f"  평균 나이:     {profile['avg_age']:.1f}세(±{profile['std_age']:.1f})")
        if 'avg_income' in profile:
            print(f"  평균 소득:     {profile['avg_income']:.0f}만원")
        elif 'avg_income_scaled' in profile:
            print(f"  평균 소득 (scaled): {profile['avg_income_scaled']:.3f}")
        if 'college_graduate_rate' in profile:
            print(f"  대학졸업:     {profile['college_graduate_rate']:.1%}")
        
        print(f"\n[가족구성]")
        if 'has_children_rate' in profile:
            print(f"  자녀 보유:     {profile['has_children_rate']:.1%}")
            if 'avg_children_count' in profile:
                print(f"  평균 자녀 수:  {profile['avg_children_count']:.1f}명")
        
        print(f"\n[소비 패턴]")
        if 'avg_electronics_count' in profile:
            print(f"  전자제품 수:   {profile['avg_electronics_count']:.1f}개")
        if 'avg_premium_index' in profile:
            print(f"  프리미엄 지수: {profile['avg_premium_index']:.3f}")
        if 'premium_car_rate' in profile:
            print(f"  프리미엄 자동차: {profile['premium_car_rate']:.1%}")
        
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
        print(f"\n{'-'*80}")
        print(f"Noise Points (노이즈) | {len(noise_data):,}명({len(noise_data)/len(df)*100:.1f}%)")
        print(f"{'-'*80}")
        if 'age' in noise_data.columns:
            print(f"  평균 나이:     {noise_data['age'].mean():.1f}세")
        if 'Q6_income' in noise_data.columns:
            print(f"  평균 소득:     {noise_data['Q6_income'].mean():.0f}만원")
    
    return cluster_profiles


def preprocess_features(df: pd.DataFrame):
    """
    클러스터링에 필요한 피처 전처리
    - age_scaled, Q6_scaled, education_level_scaled 생성
    - Q8_premium_index, Q8_count_scaled 계산
    - is_premium_car 계산
    """
    from sklearn.preprocessing import StandardScaler, MinMaxScaler
    
    print(f"\n[전처리] 피처 생성 시작")
    
    # 1. age_scaled 생성
    if 'age' in df.columns:
        age_values = df['age'].dropna()
        if len(age_values) > 0:
            scaler_mm = MinMaxScaler()
            df['age_scaled'] = pd.Series(
                scaler_mm.fit_transform(age_values.values.reshape(-1, 1)).flatten(),
                index=age_values.index
            )
            print(f"[OK] age_scaled 생성 완료")
        else:
            df['age_scaled'] = 0.0
    else:
        df['age_scaled'] = 0.0
        print(f"[경고] age 컬럼이 없어 age_scaled를 0으로 설정")
    
    # 2. Q6_scaled 생성 (소득)
    if 'Q6' in df.columns:
        income_values = pd.to_numeric(df['Q6'], errors='coerce').dropna()
        if len(income_values) > 0:
            scaler = StandardScaler()
            df['Q6_scaled'] = pd.Series(
                scaler.fit_transform(income_values.values.reshape(-1, 1)).flatten(),
                index=income_values.index
            )
            print(f"[OK] Q6_scaled 생성 완료")
        else:
            df['Q6_scaled'] = 0.0
    else:
        df['Q6_scaled'] = 0.0
        print(f"[경고] Q6 컬럼이 없어 Q6_scaled를 0으로 설정")
    
    # 3. education_level_scaled 생성
    if 'Q4' in df.columns:
        education_values = pd.to_numeric(df['Q4'], errors='coerce').dropna()
        if len(education_values) > 0:
            scaler_mm = MinMaxScaler()
            df['education_level_scaled'] = pd.Series(
                scaler_mm.fit_transform(education_values.values.reshape(-1, 1)).flatten(),
                index=education_values.index
            )
            print(f"[OK] education_level_scaled 생성 완료")
        else:
            df['education_level_scaled'] = 0.0
    else:
        df['education_level_scaled'] = 0.0
        print(f"[경고] Q4 컬럼이 없어 education_level_scaled를 0으로 설정")
    
    # 4. Q8 데이터 파싱 및 프리미엄 지수 계산
    # 프리미엄 제품: 로봇청소기(10), 무선청소기(11), 커피머신(12), 안마의자(13),
    # 의류관리기(16), 건조기(17), 식기세척기(19), 가정용식물재배기(21)
    premium_products = [10, 11, 12, 13, 16, 17, 19, 21]  # 새로운 프리미엄 제품 번호
    
    # Q8 컬럼 찾기
    q8_col = None
    if 'Q8' in df.columns:
        q8_col = 'Q8'
    elif '보유전제품' in df.columns:
        q8_col = '보유전제품'
    
    if q8_col:
        q8_counts = []
        q8_premium_indices = []
        
        for idx, q8_value in df[q8_col].items():
            q8_list = []
            if pd.notna(q8_value):
                try:
                    if isinstance(q8_value, str):
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
            
            q8_count = len(q8_list)
            q8_counts.append(q8_count)
            
            # 프리미엄 지수 계산
            premium_count = sum(1 for x in q8_list if x in premium_products)
            premium_index = premium_count / max(q8_count, 1)  # 0~1 범위
            q8_premium_indices.append(premium_index)
        
        df['Q8_count'] = q8_counts
        df['Q8_premium_index'] = q8_premium_indices
        
        # Q8_count_scaled 생성
        if len(q8_counts) > 0 and max(q8_counts) > min(q8_counts):
            scaler_mm = MinMaxScaler()
            df['Q8_count_scaled'] = scaler_mm.fit_transform(
                np.array(q8_counts).reshape(-1, 1)
            ).flatten()
        else:
            df['Q8_count_scaled'] = 0.0
        
        print(f"[OK] Q8_premium_index, Q8_count_scaled 생성 완료")
        print(f"  Q8_count 통계: 평균={np.mean(q8_counts):.2f}, 최소={min(q8_counts)}, 최대={max(q8_counts)}")
        print(f"  Q8_premium_index 통계: 평균={np.mean(q8_premium_indices):.4f}")
    else:
        df['Q8_count'] = 0
        df['Q8_count_scaled'] = 0.0
        df['Q8_premium_index'] = 0.0
        print(f"[경고] Q8 컬럼이 없어 Q8 관련 피처를 0으로 설정")
    
    # 5. is_premium_car 계산
    premium_brands = ['테슬라', '벤츠', 'BMW', '아우디', '렉서스']
    car_brand_col = None
    if '자동차 제조사' in df.columns:
        car_brand_col = '자동차 제조사'
    elif 'Q7' in df.columns:
        car_brand_col = 'Q7'
    
    if car_brand_col:
        df['is_premium_car'] = df[car_brand_col].apply(
            lambda x: any(brand in str(x) for brand in premium_brands) if pd.notna(x) else False
        )
        print(f"[OK] is_premium_car 생성 완료 (프리미엄 차 보유율: {df['is_premium_car'].mean():.2%})")
    else:
        df['is_premium_car'] = False
        print(f"[경고] 자동차 제조사 컬럼이 없어 is_premium_car를 False로 설정")
    
    return df


def create_hdbscan_analysis(
    csv_path: str = 'clustering_data/data/welcome_1st_2nd_joined.csv',
    output_dir: str = 'clustering_data/data/precomputed',
    min_cluster_size: int = 50,
    min_samples: int = 50
):
    """
    HDBSCAN 클러스터링 실행 및 분석
    """
    print("=" * 80)
    print("HDBSCAN 클러스터링 및 UMAP 시각화 및 메타데이터 분석")
    print("=" * 80)
    
    # 1. 데이터 로드
    print(f"\n[1단계] 데이터 로드: {csv_path}")
    if not os.path.exists(csv_path):
        print(f"[ERROR] 파일을 찾을 수 없습니다: {csv_path}")
        return None
    
    df = pd.read_csv(csv_path)
    print(f"[OK] 로드 완료: {len(df)}행, {len(df.columns)}열")
    
    # 1-1. 피처 전처리
    df = preprocess_features(df)
    
    # 필수 컬럼 확인
    required_cols = ['age', 'has_children']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"[ERROR] 필수 컬럼이 없습니다: {missing_cols}")
        return None
    
    # 2. 가족 생애주기 (FLC) 단계 생성
    print(f"\n[2단계] 가족 생애주기 단계 결정")
    df['life_stage'] = df.apply(get_life_stage, axis=1)
    
    # 결측치 처리
    if df['life_stage'].isna().sum() > 0:
        most_common = df['life_stage'].mode()[0]
        df['life_stage'] = df['life_stage'].fillna(most_common)
    
    # 3. 소득 계층 (Income Tier) 생성
    print(f"\n[3단계] 소득 계층 결정 (3계층)")
    if 'Q6_scaled' in df.columns:
        income_col = 'Q6_scaled'
    elif 'Q6_income' in df.columns:
        scaler_income = StandardScaler()
        df['Q6_scaled'] = scaler_income.fit_transform(df[['Q6_income']])
        income_col = 'Q6_scaled'
    else:
        print(f"[ERROR] 소득 컬럼이 없습니다")
        return None
    
    # 결측치 처리
    if df[income_col].isna().sum() > 0:
        median_income = df[income_col].median()
        df[income_col] = df[income_col].fillna(median_income)
    
    # 3계층 결정
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
    
    # 5. 세그먼트 원-핫 인코딩
    print(f"\n[5단계] 세그먼트 원-핫 인코딩")
    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    segment_encoded = encoder.fit_transform(df[['segment_initial']])
    print(f"[OK] 세그먼트 원-핫 인코딩: {segment_encoded.shape[1]}개 피쳐")
    
    # 6. 추가 피쳐 준비 (24개 피쳐)
    print(f"\n[6단계] 추가 피쳐 준비")
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
    print(f"[OK] 결합된 피쳐 매트릭스: {X_combined.shape} (18개 세그먼트 + 6개 추가)")
    
    # 7. 스케일링
    print(f"\n[7단계] 스케일링")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_combined)
    print(f"[OK] 스케일링 완료")
    
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
    
    # 성능 지표 (노이즈 제외)
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
    print(f"  노이즈 포인트:    {n_noise:,}명({noise_ratio*100:.1f}%)")
    print(f"  Silhouette Score:  {silhouette:.4f}")
    print(f"  Davies-Bouldin:    {db_score:.4f}")
    print(f"  Calinski-Harabasz: {ch_score:.2f}")
    
    # 클러스터 분포
    unique, counts = np.unique(labels, return_counts=True)
    print(f"\n[클러스터 분포]")
    for cid, count in zip(unique, counts):
        if cid == -1:
            print(f"  Noise: {count:,}명({count/len(labels)*100:.1f}%)")
        else:
            print(f"  Cluster {cid}: {count:,}명({count/len(labels)*100:.1f}%)")
    
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
    print(f"[OK] UMAP 완료: {coords_2d.shape[0]}개 포인트 생성")
    
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
        f'Clusters: {n_clusters}, Noise: {n_noise:,}명({noise_ratio*100:.1f}%)\n'
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
    
    # 11.2. 생애주기별로 색상 구분
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
    print(f"[OK] UMAP 시각화(생애주기별) 저장: {umap_stage_path}")
    plt.close()
    
    # 11.3. 소득 계층별로 색상 구분
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
    print(f"[OK] UMAP 시각화(소득 계층별) 저장: {umap_income_path}")
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
    print(f"  - UMAP 시각화(생애주기): {umap_stage_path}")
    print(f"  - UMAP 시각화(소득 계층): {umap_income_path}")
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

