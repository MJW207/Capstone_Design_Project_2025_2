"""
clustering_data 폴더에서 프리미엄 전자제품과 프리미엄 자동차 정의 확인
"""
import sys
from pathlib import Path
import pandas as pd
import json

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def check_premium_definitions():
    """프리미엄 전자제품과 자동차 정의 확인"""
    
    print("=" * 80)
    print("프리미엄 전자제품 및 자동차 정의 확인")
    print("=" * 80)
    
    # 1. 코드에서 정의 확인
    print("\n1. 코드에서 정의된 프리미엄 제품/브랜드")
    print("-" * 80)
    
    # 프리미엄 전자제품 번호
    premium_products = [3, 9, 18, 20, 22, 25]
    print(f"\n프리미엄 전자제품 번호 (Q8): {premium_products}")
    print("\n카테고리별 분류:")
    print(f"  - Kitchen (1-7): 제품 {premium_products[0]}번")
    print(f"  - Cleaning (8-14): 제품 {premium_products[1]}번")
    print(f"  - Computing (15-21): 제품 {premium_products[2]}, {premium_products[3]}번")
    print(f"  - Comfort (22-28): 제품 {premium_products[4]}, {premium_products[5]}번")
    
    # 프리미엄 자동차 브랜드
    premium_brands = ['테슬라', '벤츠', 'BMW', '아우디', '렉서스']
    print(f"\n프리미엄 자동차 브랜드: {premium_brands}")
    print("\n브랜드별 설명:")
    for i, brand in enumerate(premium_brands, 1):
        print(f"  {i}. {brand}")
    
    # 2. clustering_data CSV 파일 확인
    print("\n" + "=" * 80)
    print("2. clustering_data CSV 파일에서 실제 데이터 확인")
    print("-" * 80)
    
    csv_path = project_root / "clustering_data" / "data" / "precomputed" / "flc_income_clustering_hdbscan.csv"
    
    if csv_path.exists():
        print(f"\nCSV 파일 로드: {csv_path}")
        df = pd.read_csv(csv_path, nrows=1000)  # 샘플만 확인
        
        print(f"로드된 데이터: {len(df)}행, {len(df.columns)}열")
        print(f"컬럼: {df.columns.tolist()}")
        
        # Q8_premium_index 분포 확인
        if 'Q8_premium_index' in df.columns:
            print(f"\nQ8_premium_index 통계:")
            print(f"  - 평균: {df['Q8_premium_index'].mean():.4f}")
            print(f"  - 중앙값: {df['Q8_premium_index'].median():.4f}")
            print(f"  - 최소값: {df['Q8_premium_index'].min():.4f}")
            print(f"  - 최대값: {df['Q8_premium_index'].max():.4f}")
            print(f"  - 0인 경우: {(df['Q8_premium_index'] == 0).sum()}개 ({(df['Q8_premium_index'] == 0).sum() / len(df) * 100:.2f}%)")
            print(f"  - 0.5 이상: {(df['Q8_premium_index'] >= 0.5).sum()}개 ({(df['Q8_premium_index'] >= 0.5).sum() / len(df) * 100:.2f}%)")
        
        # is_premium_car 분포 확인
        if 'is_premium_car' in df.columns:
            print(f"\nis_premium_car 통계:")
            premium_car_count = df['is_premium_car'].sum()
            print(f"  - 프리미엄 차량 보유: {premium_car_count}개 ({premium_car_count / len(df) * 100:.2f}%)")
            print(f"  - 일반 차량: {len(df) - premium_car_count}개 ({(len(df) - premium_car_count) / len(df) * 100:.2f}%)")
        
        # 실제 데이터 샘플 확인
        print(f"\n데이터 샘플 (프리미엄 지수 높은 순):")
        if 'Q8_premium_index' in df.columns:
            top_premium = df.nlargest(5, 'Q8_premium_index')[['mb_sn', 'Q8_premium_index', 'is_premium_car']]
            print(top_premium.to_string(index=False))
        
        print(f"\n데이터 샘플 (프리미엄 차량 보유):")
        if 'is_premium_car' in df.columns:
            premium_car_samples = df[df['is_premium_car'] == 1].head(5)[['mb_sn', 'Q8_premium_index', 'is_premium_car']]
            if len(premium_car_samples) > 0:
                print(premium_car_samples.to_string(index=False))
            else:
                print("  프리미엄 차량 보유 샘플 없음")
    else:
        print(f"CSV 파일을 찾을 수 없습니다: {csv_path}")
    
    # 3. 원본 데이터 파일 확인 (welcome_2nd_label.csv)
    print("\n" + "=" * 80)
    print("3. 원본 데이터 파일에서 제품명 확인 시도")
    print("-" * 80)
    
    label_path = project_root / "clustering_data" / "data" / "welcome_2nd_label.csv"
    
    if label_path.exists():
        print(f"\n라벨 파일 로드: {label_path}")
        try:
            df_label = pd.read_csv(label_path, nrows=100)
            print(f"로드된 데이터: {len(df_label)}행, {len(df_label.columns)}열")
            print(f"컬럼: {df_label.columns.tolist()}")
            
            # Q8 관련 컬럼 찾기
            q8_cols = [col for col in df_label.columns if 'Q8' in str(col).upper() or '전제품' in str(col)]
            if q8_cols:
                print(f"\nQ8 관련 컬럼 발견: {q8_cols}")
                for col in q8_cols[:3]:  # 처음 3개만 확인
                    print(f"\n  {col} 샘플:")
                    sample_values = df_label[col].dropna().head(10).tolist()
                    for val in sample_values:
                        print(f"    - {val}")
        except Exception as e:
            print(f"라벨 파일 읽기 실패: {e}")
    else:
        print(f"라벨 파일을 찾을 수 없습니다: {label_path}")
    
    # 4. 메타데이터 파일 확인
    print("\n" + "=" * 80)
    print("4. 메타데이터 파일에서 정의 확인")
    print("-" * 80)
    
    metadata_path = project_root / "clustering_data" / "data" / "precomputed" / "flc_income_clustering_hdbscan_metadata.json"
    
    if metadata_path.exists():
        print(f"\n메타데이터 파일 로드: {metadata_path}")
        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            print(f"\n메타데이터 키: {list(metadata.keys())}")
            
            # 프리미엄 관련 정보 찾기
            if 'features' in metadata:
                print(f"\n피쳐 목록: {metadata.get('features', [])}")
            
            if 'parameters' in metadata:
                print(f"\n파라미터: {metadata.get('parameters', {})}")
                
        except Exception as e:
            print(f"메타데이터 파일 읽기 실패: {e}")
    else:
        print(f"메타데이터 파일을 찾을 수 없습니다: {metadata_path}")
    
    # 5. 요약
    print("\n" + "=" * 80)
    print("5. 요약")
    print("=" * 80)
    
    print("\n프리미엄 전자제품 정의:")
    print(f"  - 제품 번호: {premium_products}")
    print(f"  - 카테고리 분포:")
    print(f"    * Kitchen (1-7): {premium_products[0]}번")
    print(f"    * Cleaning (8-14): {premium_products[1]}번")
    print(f"    * Computing (15-21): {premium_products[2]}, {premium_products[3]}번")
    print(f"    * Comfort (22-28): {premium_products[4]}, {premium_products[5]}번")
    print(f"  - 계산 방식: Q8_premium_index = (프리미엄 제품 개수) / (전체 전자제품 개수)")
    print(f"  - 범위: 0 ~ 1 (높을수록 프리미엄 제품을 많이 보유)")
    
    print("\n프리미엄 자동차 정의:")
    print(f"  - 브랜드: {premium_brands}")
    print(f"  - 계산 방식: is_premium_car = 1 (해당 브랜드 포함) 또는 0 (없음)")
    print(f"  - 특징: 고가격대, 고급 디자인, 우수한 성능, 브랜드 가치")
    
    print("\n코드 위치:")
    print(f"  - 프리미엄 전자제품: server/app/clustering/data_preprocessor.py (line 320)")
    print(f"  - 프리미엄 자동차: server/app/clustering/data_preprocessor.py (line 329)")


if __name__ == "__main__":
    check_premium_definitions()








