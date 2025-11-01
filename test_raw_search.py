"""RawData 스키마에서 직접 검색 테스트"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

# DB 연결
DATABASE_URL = f"postgresql+psycopg://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
_sslmode = os.getenv("DB_SSLMODE") or ""
if _sslmode:
    DATABASE_URL += f"?sslmode={_sslmode}"

engine = create_engine(DATABASE_URL)

print("RawData 스키마 검색 테스트 시작...")

try:
    with engine.connect() as conn:
        # 1. 테이블 존재 확인
        print("\n[1] 테이블 존재 확인:")
        tables_query = text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'RawData'
            ORDER BY table_name
        """)
        tables = conn.execute(tables_query).fetchall()
        print(f"  RawData 스키마 테이블: {[t[0] for t in tables]}")
        
        # 2. welcome_1st 샘플 데이터 확인
        print("\n[2] welcome_1st 샘플 데이터:")
        sample_query = text("""
            SELECT mb_sn, gender, birth_year, location, detail_location
            FROM "RawData".welcome_1st
            LIMIT 5
        """)
        samples = conn.execute(sample_query).mappings().all()
        for i, row in enumerate(samples, 1):
            print(f"  [{i}] mb_sn={row['mb_sn']}, gender={row['gender']}, birth_year={row['birth_year']}, location={row['location']}")
        
        # 3. 간단한 텍스트 검색 테스트
        print("\n[3] 텍스트 검색 테스트 ('서울' 검색):")
        search_query = text("""
            SELECT 
                w1.mb_sn,
                w1.gender,
                w1.location,
                w1.birth_year,
                w2.data::text as data_text
            FROM "RawData".welcome_1st w1
            LEFT JOIN "RawData".welcome_2nd w2 ON w1.mb_sn = w2.mb_sn
            WHERE LOWER(w1.location) LIKE :search OR LOWER(w2.data::text) LIKE :search
            LIMIT 5
        """)
        results = conn.execute(search_query, {"search": "%서울%"}).mappings().all()
        print(f"  검색 결과 수: {len(results)}")
        for i, row in enumerate(results, 1):
            print(f"  [{i}] mb_sn={row['mb_sn']}, gender={row['gender']}, location={row['location']}")
        
        print("\n[OK] RawData 스키마 검색 테스트 완료!")
        
except Exception as e:
    print(f"\n[ERROR] 검색 테스트 실패: {e}")
    import traceback
    traceback.print_exc()





