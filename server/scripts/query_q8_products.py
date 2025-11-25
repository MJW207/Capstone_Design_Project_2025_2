"""
Q8 전자제품 번호와 실제 제품명 매핑 조회 스크립트
"""
import asyncio
import sys
import os
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import json
from collections import Counter

# Windows 이벤트 루프 정책 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()


async def query_q8_products():
    """Q8 전자제품 번호와 제품명 매핑 조회"""
    
    uri = os.getenv("ASYNC_DATABASE_URI")
    if not uri:
        print("❌ ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
        return
    
    # postgresql://를 postgresql+psycopg://로 변환
    if uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    elif "postgresql+asyncpg" in uri:
        uri = uri.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
    
    engine = create_async_engine(uri, echo=False, pool_pre_ping=True)
    
    try:
        async with engine.begin() as conn:
            # 방법 1: merged.panel_data에서 보유전제품 조회
            print("=" * 80)
            print("방법 1: merged.panel_data에서 보유전제품 조회")
            print("=" * 80)
            
            await conn.execute(text('SET search_path TO "merged", public'))
            
            result = await conn.execute(text("""
                SELECT 
                    base_profile->>'보유전제품' as products,
                    quick_answers->>'Q8' as q8_from_qa
                FROM merged.panel_data
                WHERE base_profile->>'보유전제품' IS NOT NULL
                   OR quick_answers->>'Q8' IS NOT NULL
                LIMIT 1000
            """))
            
            rows = result.mappings().all()
            print(f"조회된 행 수: {len(rows)}")
            
            # 제품 번호별 카운트
            product_numbers = Counter()
            product_names = {}  # 번호 -> 제품명 매핑
            
            for row in rows:
                # base_profile의 보유전제품
                products = row.get('products')
                if products:
                    try:
                        if isinstance(products, str):
                            products_list = json.loads(products)
                        else:
                            products_list = products
                        
                        if isinstance(products_list, list):
                            for item in products_list:
                                if isinstance(item, dict):
                                    # 제품 번호와 제품명이 딕셔너리로 저장된 경우
                                    for key, value in item.items():
                                        try:
                                            num = int(key)
                                            product_numbers[num] += 1
                                            if num not in product_names:
                                                product_names[num] = value
                                        except:
                                            pass
                                elif isinstance(item, (int, float)):
                                    # 제품 번호만 저장된 경우
                                    num = int(item)
                                    product_numbers[num] += 1
                    except Exception as e:
                        pass
                
                # quick_answers의 Q8
                q8_from_qa = row.get('q8_from_qa')
                if q8_from_qa:
                    try:
                        if isinstance(q8_from_qa, str):
                            q8_list = json.loads(q8_from_qa)
                        else:
                            q8_list = q8_from_qa
                        
                        if isinstance(q8_list, list):
                            for item in q8_list:
                                if isinstance(item, (int, float)):
                                    num = int(item)
                                    product_numbers[num] += 1
                    except Exception as e:
                        pass
            
            print(f"\n발견된 제품 번호: {sorted(product_numbers.keys())}")
            print(f"\n제품 번호별 빈도:")
            for num in sorted(product_numbers.keys()):
                print(f"  {num}: {product_numbers[num]}회")
            
            # 방법 2: RawData.welcome_2nd에서 Q8 조회
            print("\n" + "=" * 80)
            print("방법 2: RawData.welcome_2nd에서 Q8 조회")
            print("=" * 80)
            
            await conn.execute(text('SET search_path TO "RawData", public'))
            
            result2 = await conn.execute(text("""
                SELECT 
                    "data"->>'Q8' as q8_data
                FROM "RawData".welcome_2nd
                WHERE "data"->>'Q8' IS NOT NULL
                LIMIT 1000
            """))
            
            rows2 = result2.mappings().all()
            print(f"조회된 행 수: {len(rows2)}")
            
            for row in rows2:
                q8_data = row.get('q8_data')
                if q8_data:
                    try:
                        if isinstance(q8_data, str):
                            q8_list = json.loads(q8_data)
                        else:
                            q8_list = q8_data
                        
                        if isinstance(q8_list, list):
                            for item in q8_list:
                                if isinstance(item, (int, float)):
                                    num = int(item)
                                    product_numbers[num] += 1
                    except Exception as e:
                        pass
            
            print(f"\n전체 제품 번호: {sorted(product_numbers.keys())}")
            print(f"\n제품 번호별 최종 빈도:")
            for num in sorted(product_numbers.keys()):
                print(f"  {num}: {product_numbers[num]}회")
            
            # 방법 3: 제품명이 있는 샘플 찾기
            print("\n" + "=" * 80)
            print("방법 3: 제품명이 포함된 샘플 찾기")
            print("=" * 80)
            
            await conn.execute(text('SET search_path TO "merged", public'))
            
            result3 = await conn.execute(text("""
                SELECT 
                    base_profile,
                    quick_answers
                FROM merged.panel_data
                WHERE base_profile::text LIKE '%보유전제품%'
                   OR quick_answers::text LIKE '%Q8%'
                LIMIT 100
            """))
            
            rows3 = result3.mappings().all()
            print(f"조회된 행 수: {len(rows3)}")
            
            # 제품명이 포함된 샘플 찾기
            sample_with_names = []
            for row in rows3:
                base_profile = row.get('base_profile')
                quick_answers = row.get('quick_answers')
                
                if isinstance(base_profile, str):
                    base_profile = json.loads(base_profile)
                if isinstance(quick_answers, str):
                    quick_answers = json.loads(quick_answers)
                
                # 보유전제품 필드 확인
                products = base_profile.get('보유전제품') if base_profile else None
                if products:
                    if isinstance(products, list):
                        for item in products:
                            if isinstance(item, dict):
                                sample_with_names.append(item)
                                break
                            elif isinstance(item, str) and not item.isdigit():
                                # 제품명이 문자열로 저장된 경우
                                print(f"  제품명 발견: {item}")
                
                # Q8 필드 확인
                q8 = quick_answers.get('Q8') if quick_answers else None
                if q8:
                    if isinstance(q8, list):
                        for item in q8:
                            if isinstance(item, dict):
                                sample_with_names.append(item)
                                break
            
            if sample_with_names:
                print(f"\n제품명이 포함된 샘플 {len(sample_with_names)}개 발견:")
                for i, sample in enumerate(sample_with_names[:10], 1):
                    print(f"  샘플 {i}: {sample}")
            
            # 프리미엄 제품 번호 확인
            print("\n" + "=" * 80)
            print("프리미엄 제품 번호 확인")
            print("=" * 80)
            premium_products = [3, 9, 18, 20, 22, 25]
            print(f"프리미엄 제품 번호: {premium_products}")
            print(f"\n프리미엄 제품 번호별 빈도:")
            for num in premium_products:
                count = product_numbers.get(num, 0)
                name = product_names.get(num, "제품명 없음")
                print(f"  {num}: {count}회 - {name}")
            
            # 카테고리별 제품 번호 정리
            print("\n" + "=" * 80)
            print("카테고리별 제품 번호 정리")
            print("=" * 80)
            categories = {
                "Kitchen (1-7)": list(range(1, 8)),
                "Cleaning (8-14)": list(range(8, 15)),
                "Computing (15-21)": list(range(15, 22)),
                "Comfort (22-28)": list(range(22, 29))
            }
            
            for cat_name, nums in categories.items():
                print(f"\n{cat_name}:")
                for num in nums:
                    if num in product_numbers:
                        count = product_numbers[num]
                        name = product_names.get(num, "제품명 없음")
                        is_premium = "⭐ 프리미엄" if num in premium_products else ""
                        print(f"  {num}: {count}회 - {name} {is_premium}")
    
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(query_q8_products())

