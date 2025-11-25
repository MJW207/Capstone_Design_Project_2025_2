"""
프리미엄 제품명과 제품 번호 매핑 역계산
처음 버전에서 사용했던 프리미엄 제품명들이 [3, 9, 18, 20, 22, 25]와 매칭되는지 확인
"""
import sys
from pathlib import Path
import pandas as pd
import json
from collections import Counter

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 처음 버전에서 사용했던 프리미엄 제품명
ORIGINAL_PREMIUM_PRODUCT_NAMES = [
    "로봇청소기",
    "무선청소기(예:다이슨, 코드제로, 제트 등)",
    "안마의자",
    "의류 관리기(스타일러)",
    "가정용 식물 재배기",
    "식기세척기",
    "건조기",
    "커피 머신(에스프레소 머신, 캡슐커피 머신 등)"
]

# 기존 프리미엄 제품 번호
ORIGINAL_PREMIUM_PRODUCT_NUMBERS = [3, 9, 18, 20, 22, 25]

def load_raw_data():
    """원본 데이터 로드"""
    csv_path = project_root / "clustering_data" / "data" / "welcome_1st_2nd_joined.csv"
    
    if not csv_path.exists():
        print(f"[오류] 원본 CSV 파일을 찾을 수 없습니다: {csv_path}")
        return None
    
    print(f"원본 CSV 파일 로드 중: {csv_path}")
    df = pd.read_csv(csv_path, encoding='utf-8', nrows=1000)  # 샘플만 확인
    print(f"로드 완료: {len(df)}행, {len(df.columns)}열")
    return df


def extract_q8_data(df: pd.DataFrame):
    """Q8 데이터 추출 및 제품명-번호 매핑 생성"""
    print("\n" + "=" * 80)
    print("Q8 데이터 분석")
    print("=" * 80)
    
    # Q8 또는 보유전제품 컬럼 찾기
    q8_col = None
    if 'Q8' in df.columns:
        q8_col = 'Q8'
    elif '보유전제품' in df.columns:
        q8_col = '보유전제품'
    else:
        print("[경고] Q8 또는 보유전제품 컬럼을 찾을 수 없습니다.")
        return None, None
    
    print(f"Q8 컬럼: {q8_col}")
    
    # 제품명-번호 매핑 수집
    product_mappings = {}  # {제품명: [번호들]}
    product_number_samples = {}  # {번호: [제품명 샘플들]}
    
    for idx, q8_value in df[q8_col].items():
        if pd.isna(q8_value):
            continue
        
        # Q8 값 파싱
        q8_list = []
        product_names = []
        
                try:
                    if isinstance(q8_value, str):
                        # JSON 문자열인 경우
                        if q8_value.startswith('['):
                            q8_list = json.loads(q8_value)
                        # 딕셔너리 리스트인 경우
                        elif q8_value.startswith('{'):
                            try:
                                parsed = json.loads(q8_value)
                                if isinstance(parsed, list):
                                    for item in parsed:
                                        if isinstance(item, dict):
                                            if 'number' in item:
                                                q8_list.append(item['number'])
                                            if 'name' in item:
                                                product_names.append(item['name'])
                            except:
                                pass
                        # 쉼표로 구분된 숫자 문자열
                        elif ',' in q8_value:
                    parts = q8_value.split(',')
                    for part in parts:
                        part = part.strip()
                        if part.isdigit():
                            q8_list.append(int(part))
                        else:
                            product_names.append(part)
            elif isinstance(q8_value, list):
                q8_list = q8_value
        except:
            pass
        
        # 제품명-번호 매핑 저장
        if q8_list and product_names:
            for num, name in zip(q8_list, product_names):
                if name not in product_mappings:
                    product_mappings[name] = []
                if num not in product_mappings[name]:
                    product_mappings[name].append(num)
                
                if num not in product_number_samples:
                    product_number_samples[num] = []
                if name not in product_number_samples[num]:
                    product_number_samples[num].append(name)
    
    return product_mappings, product_number_samples


def search_in_merged_data():
    """merged.panel_data에서 제품명 찾기"""
    print("\n" + "=" * 80)
    print("merged.panel_data에서 제품명 검색")
    print("=" * 80)
    
    try:
        import os
        from dotenv import load_dotenv
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        
        load_dotenv(override=True)
        
        uri = os.getenv("ASYNC_DATABASE_URI")
        if not uri:
            print("[경고] ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
            return None
        
        if uri.startswith("postgresql://"):
            uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
        
        engine = create_async_engine(uri, echo=False)
        
        async def query_products():
            async with engine.begin() as conn:
                await conn.execute(text('SET search_path TO "merged", public'))
                
                # base_profile에서 보유전제품 필드 확인
                result = await conn.execute(text("""
                    SELECT 
                        mb_sn,
                        base_profile->'보유전제품' as products
                    FROM merged.panel_data
                    WHERE base_profile->'보유전제품' IS NOT NULL
                    LIMIT 100
                """))
                
                rows = result.mappings().all()
                
                product_mappings = {}
                for row in rows:
                    products = row.get('products')
                    if products:
                        if isinstance(products, str):
                            try:
                                products = json.loads(products)
                            except:
                                pass
                        
                        if isinstance(products, list):
                            for item in products:
                                if isinstance(item, dict):
                                    name = item.get('name') or item.get('제품명')
                                    number = item.get('number') or item.get('번호')
                                    if name and number:
                                        if name not in product_mappings:
                                            product_mappings[name] = []
                                        if number not in product_mappings[name]:
                                            product_mappings[name].append(number)
                
                return product_mappings
        
        import asyncio
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
        product_mappings = asyncio.run(query_products())
        await engine.dispose()
        
        return product_mappings
        
    except Exception as e:
        print(f"[오류] DB 조회 실패: {str(e)}")
        return None


def match_premium_products(product_mappings, product_number_samples):
    """프리미엄 제품명과 번호 매칭"""
    print("\n" + "=" * 80)
    print("프리미엄 제품명-번호 매칭 결과")
    print("=" * 80)
    
    print(f"\n기존 프리미엄 제품 번호: {ORIGINAL_PREMIUM_PRODUCT_NUMBERS}")
    print(f"\n처음 버전 프리미엄 제품명 ({len(ORIGINAL_PREMIUM_PRODUCT_NAMES)}개):")
    for i, name in enumerate(ORIGINAL_PREMIUM_PRODUCT_NAMES, 1):
        print(f"  {i}. {name}")
    
    # 제품명 매칭 시도
    matched_numbers = {}
    unmatched_names = []
    
    for product_name in ORIGINAL_PREMIUM_PRODUCT_NAMES:
        # 정확한 매칭
        if product_name in product_mappings:
            matched_numbers[product_name] = product_mappings[product_name]
        else:
            # 부분 매칭 시도
            matched = False
            for key in product_mappings.keys():
                if product_name in key or key in product_name:
                    matched_numbers[product_name] = product_mappings[key]
                    matched = True
                    break
            
            if not matched:
                unmatched_names.append(product_name)
    
    print("\n" + "-" * 80)
    print("매칭 결과:")
    print("-" * 80)
    
    for product_name, numbers in matched_numbers.items():
        print(f"\n{product_name}:")
        print(f"  매칭된 번호: {numbers}")
        is_premium = any(num in ORIGINAL_PREMIUM_PRODUCT_NUMBERS for num in numbers)
        print(f"  프리미엄 번호 포함: {'예' if is_premium else '아니오'}")
    
    if unmatched_names:
        print(f"\n매칭되지 않은 제품명 ({len(unmatched_names)}개):")
        for name in unmatched_names:
            print(f"  - {name}")
    
    # 역방향 검색: 프리미엄 번호에 해당하는 제품명 찾기
    print("\n" + "-" * 80)
    print("역방향 검색: 프리미엄 번호에 해당하는 제품명")
    print("-" * 80)
    
    for num in ORIGINAL_PREMIUM_PRODUCT_NUMBERS:
        print(f"\n제품 번호 {num}:")
        if num in product_number_samples:
            print(f"  발견된 제품명 샘플: {product_number_samples[num][:5]}")
        else:
            print(f"  제품명 샘플 없음")
    
    # 전체 제품명-번호 매핑 요약
    print("\n" + "-" * 80)
    print("전체 제품명-번호 매핑 요약 (상위 20개)")
    print("-" * 80)
    
    if product_mappings:
        sorted_mappings = sorted(product_mappings.items(), key=lambda x: len(x[1]), reverse=True)
        for name, numbers in sorted_mappings[:20]:
            print(f"  {name}: {numbers}")


def main():
    """메인 함수"""
    print("=" * 80)
    print("프리미엄 제품명-번호 매핑 역계산")
    print("=" * 80)
    
    # 1. 원본 데이터 로드
    df = load_raw_data()
    if df is None:
        return
    
    # 2. Q8 데이터 추출
    product_mappings, product_number_samples = extract_q8_data(df)
    
    # 3. merged.panel_data에서 추가 검색
    db_mappings = search_in_merged_data()
    if db_mappings:
        # 병합
        for name, numbers in db_mappings.items():
            if name not in product_mappings:
                product_mappings[name] = []
            for num in numbers:
                if num not in product_mappings[name]:
                    product_mappings[name].append(num)
    
    # 4. 프리미엄 제품명-번호 매칭
    if product_mappings or product_number_samples:
        match_premium_products(product_mappings or {}, product_number_samples or {})
    else:
        print("\n[경고] 제품명-번호 매핑을 찾을 수 없습니다.")
    
    print("\n" + "=" * 80)
    print("완료!")
    print("=" * 80)


if __name__ == "__main__":
    main()

