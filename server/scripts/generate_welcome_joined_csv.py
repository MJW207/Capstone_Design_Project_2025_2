"""
welcome_1st_2nd_joined.csv 생성 스크립트
데이터베이스에서 welcome_1st, welcome_2nd 데이터를 조인하여 CSV 파일 생성
"""
import pandas as pd
import asyncio
import sys
from pathlib import Path
import os

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.db.session import get_session
from app.core.config import DBN, fq
from sqlalchemy import text

async def generate_welcome_joined_csv():
    """데이터베이스에서 welcome_1st_2nd 조인 데이터를 CSV로 저장"""
    
    print("=" * 80)
    print("welcome_1st_2nd_joined.csv 생성 스크립트")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    output_dir = Path(__file__).resolve().parents[2] / 'clustering_data' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / 'welcome_1st_2nd_joined.csv'
    
    print(f"\n[1단계] 데이터베이스 연결 및 데이터 추출")
    
    async for session in get_session():
        try:
            W1 = fq(DBN.RAW, "welcome_1st")
            W2 = fq(DBN.RAW, "welcome_2nd")
            
            # search_path 설정
            await session.execute(text(f'SET search_path TO "{DBN.RAW}", public'))
            
            # 전체 데이터 조회 쿼리
            # 클러스터링에 필요한 피처들을 추출
            sql = f"""
            SELECT 
                w1.mb_sn,
                -- 기본 정보
                w1.gender,
                CASE 
                    WHEN COALESCE(NULLIF(w1.birth_year, ''), NULL) IS NOT NULL
                         AND w1.birth_year ~ '^[0-9]+$'
                    THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, MAKE_DATE(w1.birth_year::int, 1, 1)))::int
                    ELSE NULL 
                END AS age,
                w1."location" AS region,
                -- 소득 정보 (welcome_2nd.data에서 추출)
                CASE 
                    WHEN w2.data->>'income_personal' ~ '^[0-9]+$'
                    THEN (w2.data->>'income_personal')::numeric
                    ELSE NULL
                END AS income_personal,
                CASE 
                    WHEN w2.data->>'income_household' ~ '^[0-9]+$'
                    THEN (w2.data->>'income_household')::numeric
                    ELSE NULL
                END AS income_household,
                -- Q6 (소득 구간)
                CASE 
                    WHEN w2.data->>'Q6' ~ '^[0-9]+$'
                    THEN (w2.data->>'Q6')::int
                    ELSE NULL
                END AS Q6,
                -- Q7 (학력)
                CASE 
                    WHEN w2.data->>'Q7' ~ '^[0-9]+$'
                    THEN (w2.data->>'Q7')::int
                    ELSE NULL
                END AS Q7,
                -- Q8 (전자제품) - JSONB 배열로 저장된 경우 처리
                w2.data->'Q8' AS Q8,
                -- 전체 data JSONB (필요시 사용)
                w2.data AS w2_data
            FROM {W1} w1
            LEFT JOIN {W2} w2 ON w1.mb_sn = w2.mb_sn
            WHERE w2.mb_sn IS NOT NULL  -- welcome_2nd 데이터가 있는 것만
            ORDER BY w1.mb_sn
            """
            
            print(f"[SQL 실행 중...]")
            result = await session.execute(text(sql))
            rows = result.mappings().all()
            
            if not rows:
                print("[ERROR] 데이터가 없습니다.")
                return
            
            print(f"[OK] 데이터 추출 완료: {len(rows)}행")
            
            # DataFrame으로 변환
            print(f"\n[2단계] DataFrame 변환 및 전처리")
            df = pd.DataFrame([dict(row) for row in rows])
            
            # Q8 전자제품 배열 처리
            if 'Q8' in df.columns:
                # Q8이 JSONB 배열인 경우 리스트로 변환
                def parse_q8(q8_value):
                    if q8_value is None:
                        return []
                    if isinstance(q8_value, list):
                        return q8_value
                    if isinstance(q8_value, str):
                        import json
                        try:
                            return json.loads(q8_value)
                        except:
                            return []
                    return []
                
                df['Q8_list'] = df['Q8'].apply(parse_q8)
                df['Q8_count'] = df['Q8_list'].apply(len)
                
                # 프리미엄 제품 인덱스 계산 (예: 아이폰, 고가 제품 등)
                # Q8에 특정 값이 포함되어 있는지 확인
                premium_products = [1, 2, 3]  # 예시: 프리미엄 제품 ID
                df['Q8_premium_count'] = df['Q8_list'].apply(
                    lambda x: sum(1 for item in x if item in premium_products)
                )
                df['is_premium_car'] = df['Q8_list'].apply(
                    lambda x: any(item in [9, 10] for item in x)  # 예시: 차량 관련
                )
            
            # 소득 정보 정리
            if 'income_personal' in df.columns and 'income_household' in df.columns:
                # 개인 소득이 없으면 가구 소득 사용
                df['Q6_income'] = df['income_personal'].fillna(df['income_household'])
            elif 'income_household' in df.columns:
                df['Q6_income'] = df['income_household']
            elif 'income_personal' in df.columns:
                df['Q6_income'] = df['income_personal']
            
            # 결측치 처리
            df['age'] = df['age'].fillna(df['age'].median())
            df['Q6_income'] = df['Q6_income'].fillna(df['Q6_income'].median())
            df['Q6'] = df['Q6'].fillna(df['Q6'].median())
            df['Q7'] = df['Q7'].fillna(df['Q7'].median())
            df['Q8_count'] = df['Q8_count'].fillna(0)
            df['Q8_premium_count'] = df['Q8_premium_count'].fillna(0)
            df['is_premium_car'] = df['is_premium_car'].fillna(False)
            
            # 스케일링된 피처 생성 (generate_precomputed_data.py와 동일한 형식)
            from sklearn.preprocessing import StandardScaler
            
            # 스케일링할 피처들
            scale_features = ['age', 'Q6_income', 'Q7', 'Q8_count']
            scaler = StandardScaler()
            
            for feat in scale_features:
                if feat in df.columns:
                    scaled_col = f'{feat}_scaled'
                    df[scaled_col] = scaler.fit_transform(df[[feat]])
            
            # education_level_scaled (Q7 기반)
            if 'Q7' in df.columns:
                df['education_level_scaled'] = df['Q7_scaled'] if 'Q7_scaled' in df.columns else df['Q7']
            
            # Q8_premium_index 계산
            if 'Q8_premium_count' in df.columns and 'Q8_count' in df.columns:
                df['Q8_premium_index'] = df['Q8_premium_count'] / (df['Q8_count'] + 1)  # 0으로 나누기 방지
            
            print(f"[OK] 전처리 완료")
            print(f"  - 총 행 수: {len(df)}")
            print(f"  - 컬럼 수: {len(df.columns)}")
            print(f"  - 컬럼 목록: {list(df.columns)[:10]}...")
            
            # CSV 저장
            print(f"\n[3단계] CSV 파일 저장")
            df.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"[OK] 저장 완료: {output_path}")
            print(f"  - 파일 크기: {output_path.stat().st_size / 1024 / 1024:.2f} MB")
            
            # 샘플 데이터 출력
            print(f"\n[4단계] 샘플 데이터 확인")
            print(df.head().to_string())
            
            break
            
        except Exception as e:
            print(f"[ERROR] 오류 발생: {str(e)}")
            import traceback
            traceback.print_exc()
            break

if __name__ == "__main__":
    asyncio.run(generate_welcome_joined_csv())

