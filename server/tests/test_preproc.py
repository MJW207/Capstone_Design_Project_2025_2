"""
전처리 모듈 테스트
"""
import pytest
import pandas as pd
import numpy as np
import sys
import os

# 상위 디렉터리를 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# 전처리는 clustering/feature_pipeline.py로 이동됨
# TODO: 테스트를 feature_pipeline.py 기반으로 업데이트 필요
from app.clustering.feature_pipeline import preprocess


def test_preproc_basic():
    """기본 전처리 테스트"""
    # 테스트 데이터 생성
    np.random.seed(42)
    n = 10
    
    df = pd.DataFrame({
        'panel_id': [f'P{i:03d}' for i in range(n)],
        'age_raw': np.random.randint(20, 60, n),
        'income_personal': np.random.randint(100, 500, n) * 10000,
        'gender': np.random.choice(['M', 'F', 'UNK'], n),
        'age_bucket': np.random.choice(['20s', '30s', '40s', '50s'], n),
        'region_lvl1': np.random.choice(['서울', '경기', '부산'], n),
        'health': np.random.randint(0, 2, n),
        'beauty': np.random.randint(0, 2, n),
        'kw_ott': np.random.randint(0, 2, n),
        'kw_netflix': np.random.randint(0, 2, n),
        'kw_gym': np.random.randint(0, 2, n),
        'chunk_count': np.random.randint(1, 10, n)
    })
    
    # 전처리 실행
    X, feature_names, fitted_obj = fit_transform(df, PreprocConfig())
    
    # 검증
    assert X.shape[0] == n, "행 수가 맞지 않습니다"
    assert len(feature_names) > 0, "피처 이름이 없습니다"
    assert X.shape[1] == len(feature_names), "피처 수가 맞지 않습니다"
    assert isinstance(fitted_obj, FittedPreprocessor), "피팅된 객체 타입이 맞지 않습니다"
    
    print(f"✓ 기본 전처리 테스트 통과: {X.shape}, {len(feature_names)}개 피처")


def test_preproc_kw_pca():
    """키워드 PCA 테스트"""
    np.random.seed(42)
    n = 20
    
    df = pd.DataFrame({
        'panel_id': [f'P{i:03d}' for i in range(n)],
        'age_raw': np.random.randint(20, 60, n),
        'gender': np.random.choice(['M', 'F'], n),
        'kw_ott': np.random.randint(0, 2, n),
        'kw_netflix': np.random.randint(0, 2, n),
        'kw_disney_plus': np.random.randint(0, 2, n),
        'kw_secondhand': np.random.randint(0, 2, n),
        'kw_gym': np.random.randint(0, 2, n),
        'kw_jeju_trip': np.random.randint(0, 2, n),
        'kw_beauty': np.random.randint(0, 2, n),
        'kw_skincare': np.random.randint(0, 2, n),
        'kw_delivery': np.random.randint(0, 2, n),
        'kw_coffee': np.random.randint(0, 2, n),
        'kw_travel': np.random.randint(0, 2, n),
        'kw_shopping': np.random.randint(0, 2, n),
        'kw_fitness': np.random.randint(0, 2, n),
        'kw_book': np.random.randint(0, 2, n),
        'kw_music': np.random.randint(0, 2, n),
        'kw_movie': np.random.randint(0, 2, n),
        'kw_game': np.random.randint(0, 2, n),
        'kw_cooking': np.random.randint(0, 2, n),
        'kw_pet': np.random.randint(0, 2, n),
        'kw_car': np.random.randint(0, 2, n),
    })
    
    # PCA 없이 전처리
    X_no_pca, _, _ = fit_transform(df, PreprocConfig(kw_pca_components=None))
    kw_cols_no_pca = [c for c in df.columns if c.startswith('kw_')]
    
    # PCA 적용 전처리
    X_with_pca, feature_names_pca, _ = fit_transform(df, PreprocConfig(kw_pca_components=8))
    
    # 검증
    assert X_with_pca.shape[1] < X_no_pca.shape[1], "PCA 적용 시 차원이 축소되어야 합니다"
    assert any('kw_pca' in name for name in feature_names_pca), "PCA 피처 이름이 있어야 합니다"
    
    print(f"✓ 키워드 PCA 테스트 통과: {X_no_pca.shape[1]} -> {X_with_pca.shape[1]} 차원")


if __name__ == "__main__":
    test_preproc_basic()
    test_preproc_kw_pca()
    print("\n모든 전처리 테스트 통과!")




