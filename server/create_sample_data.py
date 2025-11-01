"""샘플 데이터 생성 스크립트"""
import pandas as pd
import numpy as np
import os

np.random.seed(42)
n = 100

# 샘플 데이터 생성
df = pd.DataFrame({
    'panel_id': [f'P{i:03d}' for i in range(n)],
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
    'tech': np.random.randint(0, 2, n),
    'travel': np.random.randint(0, 2, n),
    'finance': np.random.randint(0, 2, n),
    'hobby': np.random.randint(0, 2, n),
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
    'chunk_count': np.random.randint(1, 10, n)
})

# 디렉터리 생성
os.makedirs('data', exist_ok=True)

# CSV 저장
df.to_csv('data/preprocessed_sample.csv', index=False, encoding='utf-8-sig')
print(f'Sample data created: {len(df)} rows, {len(df.columns)} columns')
print(f'Saved to: data/preprocessed_sample.csv')

