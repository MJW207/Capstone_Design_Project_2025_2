"""
다중공선성 확인: VIF (Variance Inflation Factor) 계산
소득 관련 피쳐들 간의 다중공선성 확인
"""
import asyncio
import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.tools.tools import add_constant

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import json

# Windows 이벤트 루프 정책 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()


def calculate_vif(df: pd.DataFrame, features: list) -> pd.DataFrame:
    """
    VIF (Variance Inflation Factor) 계산
    
    VIF 해석:
    - VIF < 5: 다중공선성 없음 (양호)
    - 5 ≤ VIF < 10: 다중공선성 약간 있음 (주의)
    - VIF ≥ 10: 다중공선성 심각 (문제)
    """
    # 결측치 제거
    df_clean = df[features].dropna()
    
    if len(df_clean) == 0:
        return pd.DataFrame()
    
    # 상수항 추가
    X = add_constant(df_clean)
    
    vif_data = []
    for i, feature in enumerate(features, start=1):  # const가 0번이므로 1부터 시작
        try:
            vif = variance_inflation_factor(X.values, i)
            vif_data.append({
                'feature': feature,
                'VIF': vif if not np.isinf(vif) and not np.isnan(vif) else None
            })
        except Exception as e:
            vif_data.append({
                'feature': feature,
                'VIF': None,
                'error': str(e)
            })
    
    vif_df = pd.DataFrame(vif_data)
    return vif_df


def load_clustering_data_from_csv():
    """clustering_data CSV 파일에서 클러스터링에 사용된 실제 데이터 로드"""
    
    # CSV 파일 경로
    csv_path = Path(__file__).parent.parent.parent / "clustering_data" / "data" / "precomputed" / "flc_income_clustering_hdbscan.csv"
    
    if not csv_path.exists():
        print(f"❌ CSV 파일을 찾을 수 없습니다: {csv_path}")
        return None
    
    try:
        print(f"CSV 파일 로드 중: {csv_path}")
        df = pd.read_csv(csv_path, encoding='utf-8')
        print(f"로드 완료: {len(df)}행, {len(df.columns)}열")
        print(f"컬럼: {df.columns.tolist()}")
        return df
    except Exception as e:
        print(f"❌ CSV 파일 로드 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def create_segment_onehot_features(df: pd.DataFrame) -> pd.DataFrame:
    """세그먼트 원-핫 인코딩 피쳐 생성"""
    
    # segment_initial 컬럼이 있으면 이를 기반으로 원-핫 인코딩
    if 'segment_initial' in df.columns:
        from sklearn.preprocessing import OneHotEncoder
        
        segments = df['segment_initial'].dropna().unique()
        if len(segments) > 0:
            try:
                # sklearn 최신 버전 (sparse_output 사용)
                encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            except TypeError:
                # sklearn 구버전 (sparse 사용)
                encoder = OneHotEncoder(sparse=False, handle_unknown='ignore')
            
            segment_encoded = encoder.fit_transform(df[['segment_initial']])
            segment_df = pd.DataFrame(
                segment_encoded,
                columns=[f'segment_{i}' for i in range(segment_encoded.shape[1])],
                index=df.index
            )
            df = pd.concat([df, segment_df], axis=1)
            print(f"   세그먼트 원-핫 인코딩 완료: {segment_encoded.shape[1]}개 변수")
    
    return df


def main():
    """메인 함수"""
    print("=" * 80)
    print("다중공선성 확인: VIF (Variance Inflation Factor) 계산")
    print("=" * 80)
    
    # 데이터 로드
    print("\n1. CSV 파일에서 데이터 로드 중...")
    df = load_clustering_data_from_csv()
    
    if df is None or len(df) == 0:
        print("❌ 데이터를 로드할 수 없습니다.")
        return
    
    print(f"   로드된 데이터: {len(df)}행, {len(df.columns)}열")
    
    # 세그먼트 원-핫 인코딩 피쳐 생성
    print("\n2. 세그먼트 원-핫 인코딩 피쳐 생성 중...")
    df = create_segment_onehot_features(df)
    print(f"   최종 피쳐 수: {len(df.columns)}개")
    
    # 소득 관련 피쳐들 정의
    income_related_features = []
    
    # 원-핫 인코딩된 세그먼트 피쳐들 (생애주기 × 소득 계층)
    segment_features = [col for col in df.columns if col.startswith('segment_') and col != 'segment_initial']
    income_related_features.extend(segment_features)
    
    # 소득 스케일
    if 'Q6_scaled' in df.columns:
        income_related_features.append('Q6_scaled')
    
    # 프리미엄 차량
    if 'is_premium_car' in df.columns:
        income_related_features.append('is_premium_car')
    
    # 추가 피쳐들 (전체 클러스터링 피쳐)
    all_clustering_features = [
        'age_scaled',
        'Q6_scaled',
        'education_level_scaled',
        'Q8_count_scaled',
        'Q8_premium_index',
        'is_premium_car'
    ]
    
    # 존재하는 피쳐만 필터링
    available_features = [f for f in all_clustering_features if f in df.columns]
    available_features.extend(segment_features)
    
    print(f"\n3. 소득 관련 피쳐: {len(income_related_features)}개")
    print(f"   - 세그먼트 원-핫 인코딩: {len(segment_features)}개")
    print(f"   - Q6_scaled: {'있음' if 'Q6_scaled' in df.columns else '없음'}")
    print(f"   - is_premium_car: {'있음' if 'is_premium_car' in df.columns else '없음'}")
    
    # VIF 계산: 소득 관련 피쳐만
    print("\n" + "=" * 80)
    print("VIF 계산 1: 소득 관련 피쳐만 (세그먼트 + Q6_scaled + is_premium_car)")
    print("=" * 80)
    
    if len(income_related_features) > 0:
        vif_income = calculate_vif(df, income_related_features)
        if len(vif_income) > 0:
            print("\n소득 관련 피쳐 VIF:")
            print(vif_income.to_string(index=False))
            
            # VIF 해석
            print("\nVIF 해석:")
            high_vif = vif_income[(vif_income['VIF'] >= 10) & (vif_income['VIF'].notna())]
            medium_vif = vif_income[(vif_income['VIF'] >= 5) & (vif_income['VIF'] < 10) & (vif_income['VIF'].notna())]
            low_vif = vif_income[(vif_income['VIF'] < 5) & (vif_income['VIF'].notna())]
            nan_vif = vif_income[vif_income['VIF'].isna()]
            
            if len(high_vif) > 0:
                print(f"  [경고] 심각한 다중공선성 (VIF >= 10): {len(high_vif)}개")
                for _, row in high_vif.iterrows():
                    print(f"     - {row['feature']}: VIF = {row['VIF']:.2f}")
            
            if len(medium_vif) > 0:
                print(f"  [주의] 다중공선성 주의 (5 <= VIF < 10): {len(medium_vif)}개")
                for _, row in medium_vif.iterrows():
                    print(f"     - {row['feature']}: VIF = {row['VIF']:.2f}")
            
            if len(low_vif) > 0:
                print(f"  [양호] 다중공선성 없음 (VIF < 5): {len(low_vif)}개")
                for _, row in low_vif.iterrows():
                    print(f"     - {row['feature']}: VIF = {row['VIF']:.2f}")
            
            if len(nan_vif) > 0:
                print(f"  [주의] 완벽한 다중공선성 (VIF = NaN): {len(nan_vif)}개")
                print(f"     - 원-핫 인코딩된 세그먼트 변수들은 합이 항상 1이므로 완벽한 다중공선성을 가집니다.")
                print(f"     - 이는 정상적인 현상이며, 원-핫 인코딩의 특성입니다.")
                print(f"     - 세그먼트 변수들: {', '.join(nan_vif['feature'].tolist()[:5])} ...")
    
    # VIF 계산: 전체 클러스터링 피쳐
    print("\n" + "=" * 80)
    print("VIF 계산 2: 전체 클러스터링 피쳐 (6개 핵심 + 세그먼트)")
    print("=" * 80)
    
    if len(available_features) > 0:
        vif_all = calculate_vif(df, available_features)
        if len(vif_all) > 0:
            print("\n전체 클러스터링 피쳐 VIF:")
            print(vif_all.to_string(index=False))
            
            # VIF 해석
            print("\nVIF 해석:")
            high_vif = vif_all[(vif_all['VIF'] >= 10) & (vif_all['VIF'].notna())]
            medium_vif = vif_all[(vif_all['VIF'] >= 5) & (vif_all['VIF'] < 10) & (vif_all['VIF'].notna())]
            low_vif = vif_all[(vif_all['VIF'] < 5) & (vif_all['VIF'].notna())]
            nan_vif = vif_all[vif_all['VIF'].isna()]
            
            if len(high_vif) > 0:
                print(f"  [경고] 심각한 다중공선성 (VIF >= 10): {len(high_vif)}개")
                for _, row in high_vif.iterrows():
                    print(f"     - {row['feature']}: VIF = {row['VIF']:.2f}")
            
            if len(medium_vif) > 0:
                print(f"  [주의] 다중공선성 주의 (5 <= VIF < 10): {len(medium_vif)}개")
                for _, row in medium_vif.iterrows():
                    print(f"     - {row['feature']}: VIF = {row['VIF']:.2f}")
            
            if len(low_vif) > 0:
                print(f"  [양호] 다중공선성 없음 (VIF < 5): {len(low_vif)}개")
                for _, row in low_vif.iterrows():
                    print(f"     - {row['feature']}: VIF = {row['VIF']:.2f}")
            
            if len(nan_vif) > 0:
                print(f"  [주의] 완벽한 다중공선성 (VIF = NaN): {len(nan_vif)}개")
                print(f"     - 원-핫 인코딩된 세그먼트 변수들은 합이 항상 1이므로 완벽한 다중공선성을 가집니다.")
                print(f"     - 이는 정상적인 현상이며, 원-핫 인코딩의 특성입니다.")
    
    # 상관관계 분석
    print("\n" + "=" * 80)
    print("상관관계 분석: 소득 관련 피쳐들 간의 상관계수")
    print("=" * 80)
    
    if len(income_related_features) > 0:
        corr_features = [f for f in income_related_features if f in df.columns]
        if len(corr_features) > 1:
            corr_matrix = df[corr_features].corr()
            print("\n상관계수 행렬:")
            print(corr_matrix.to_string())
            
            # 높은 상관관계 찾기
            print("\n높은 상관관계 (|r| > 0.7):")
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    corr_val = corr_matrix.iloc[i, j]
                    if abs(corr_val) > 0.7 and not pd.isna(corr_val):
                        print(f"  {corr_matrix.columns[i]} ↔ {corr_matrix.columns[j]}: {corr_val:.3f}")


if __name__ == "__main__":
    main()

