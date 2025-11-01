"""
군집 비교 모듈 테스트
"""
import pytest
import pandas as pd
import numpy as np
import sys
import os

# 상위 디렉터리를 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# 비교 분석은 clustering/compare.py로 이동됨
# TODO: 테스트를 clustering/compare.py 기반으로 업데이트 필요
from app.clustering.compare import compare_groups


def test_proportion_ztest():
    """비율 z-test 테스트"""
    # 간단한 테스트 케이스
    p1, p2, pval = proportion_ztest(50, 100, 30, 100)
    
    assert 0 <= p1 <= 1, "p1이 비율 범위를 벗어났습니다"
    assert 0 <= p2 <= 1, "p2가 비율 범위를 벗어났습니다"
    assert 0 <= pval <= 1, "p-value가 범위를 벗어났습니다"
    
    print(f"✓ proportion_ztest 테스트 통과: p1={p1:.2f}, p2={p2:.2f}, pval={pval:.4f}")


def test_compare_clusters():
    """군집 비교 테스트"""
    np.random.seed(42)
    n = 100
    
    # 테스트 데이터 생성
    df = pd.DataFrame({
        'panel_id': [f'P{i:03d}' for i in range(n)],
        'cluster': np.random.choice([0, 1, 2], n),
        'age_raw': np.random.randint(20, 60, n),
        'income_personal': np.random.randint(100, 500, n) * 10000,
        'income_household': np.random.randint(200, 800, n) * 10000,
        'gender': np.random.choice(['M', 'F'], n),
        'age_bucket': np.random.choice(['20s', '30s', '40s', '50s'], n),
        'region_lvl1': np.random.choice(['서울', '경기', '부산'], n),
        'health': np.random.randint(0, 2, n),
        'beauty': np.random.randint(0, 2, n),
        'fashion': np.random.randint(0, 2, n),
        'food': np.random.randint(0, 2, n),
        'kw_ott': np.random.randint(0, 2, n),
        'kw_netflix': np.random.randint(0, 2, n),
        'kw_gym': np.random.randint(0, 2, n),
        'chunk_count': np.random.randint(1, 10, n)
    })
    
    # 비교 실행
    cfg = CompareConfig(c1=0, c2=1, min_base=10)
    result = compare_clusters(df, cfg)
    
    # 검증
    assert "meta" in result, "meta 필드가 없습니다"
    assert "by_feature" in result, "by_feature 필드가 없습니다"
    assert "opportunities" in result, "opportunities 필드가 없습니다"
    
    assert len(result["by_feature"]) > 0, "비교 결과가 없습니다"
    
    # 각 타입별로 하나씩 있는지 확인
    types = [f["type"] for f in result["by_feature"]]
    assert "categorical" in types, "범주형 비교 결과가 없습니다"
    assert "binary" in types, "이진 비교 결과가 없습니다"
    assert "numeric" in types, "숫자형 비교 결과가 없습니다"
    
    print(f"✓ 군집 비교 테스트 통과: {len(result['by_feature'])}개 피처 비교")


if __name__ == "__main__":
    test_proportion_ztest()
    test_compare_clusters()
    print("\n모든 비교 테스트 통과!")




