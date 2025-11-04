"""DB 연결 테스트 스크립트"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 환경변수 로드
load_dotenv()

print("=" * 60)
print("DB 연결 테스트")
print("=" * 60)

# 환경변수 확인
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT', '5432')
db_name = os.getenv('DB_NAME')
db_sslmode = os.getenv('DB_SSLMODE', '')

print(f"\n환경변수 확인:")
print(f"  DB_USER: {db_user if db_user else '(없음)'}")
print(f"  DB_PASSWORD: {'*' * len(db_password) if db_password else '(없음)'}")
print(f"  DB_HOST: {db_host if db_host else '(없음)'}")
print(f"  DB_PORT: {db_port}")
print(f"  DB_NAME: {db_name if db_name else '(없음)'}")
print(f"  DB_SSLMODE: {db_sslmode if db_sslmode else '(없음)'}")

# 필수 환경변수 확인
if not all([db_user, db_password, db_host, db_name]):
    print(f"\n❌ 필수 환경변수가 설정되지 않았습니다!")
    print(f"   .env 파일을 확인하세요.")
    exit(1)

# DB URL 생성
database_url = f"postgresql+psycopg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
if db_sslmode:
    database_url += f"?sslmode={db_sslmode}"

print(f"\nDB URL: postgresql+psycopg://{db_user}:***@{db_host}:{db_port}/{db_name}")

# 연결 시도
print(f"\n연결 시도 중...")
try:
    engine = create_engine(database_url, pool_pre_ping=True)
    
    with engine.connect() as conn:
        # 기본 연결 테스트
        result = conn.execute(text("SELECT 1")).scalar()
        
        if result == 1:
            print("✅ 기본 연결 성공!")
        
        # 데이터베이스 정보 조회
        db_name_result = conn.execute(text("SELECT current_database()")).scalar()
        db_user_result = conn.execute(text("SELECT current_user")).scalar()
        db_version = conn.execute(text("SELECT version()")).scalar()
        
        print(f"\n📊 데이터베이스 정보:")
        print(f"  데이터베이스: {db_name_result}")
        print(f"  사용자: {db_user_result}")
        print(f"  버전: {db_version.split(',')[0] if db_version else 'Unknown'}")
        
        # 스키마 확인
        schemas_query = text("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name IN ('RawData', 'testcl')
            ORDER BY schema_name
        """)
        available_schemas = [row[0] for row in conn.execute(schemas_query).fetchall()]
        
        print(f"\n📁 사용 가능한 스키마:")
        if available_schemas:
            for schema in available_schemas:
                print(f"  ✅ {schema}")
        else:
            print(f"  ⚠️  RawData, testcl 스키마가 없습니다")
        
        # RawData 스키마 테이블 확인
        if 'RawData' in available_schemas:
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'RawData'
                ORDER BY table_name
            """)
            tables = [row[0] for row in conn.execute(tables_query).fetchall()]
            print(f"\n📋 RawData 스키마 테이블:")
            for table in tables:
                print(f"  - {table}")
        
        # 테이블 데이터 개수 확인
        if 'RawData' in available_schemas:
            try:
                count_query = text("SELECT COUNT(*) FROM \"RawData\".welcome_1st")
                count = conn.execute(count_query).scalar()
                print(f"\n📈 데이터 개수:")
                print(f"  RawData.welcome_1st: {count:,}개")
            except Exception as e:
                print(f"\n⚠️  welcome_1st 테이블 조회 실패: {e}")
        
        print(f"\n{'=' * 60}")
        print("✅ DB 연결 성공!")
        print(f"{'=' * 60}")
        
except Exception as e:
    print(f"\n❌ DB 연결 실패!")
    print(f"에러: {e}")
    print(f"\n확인 사항:")
    print(f"  1. DB 서버가 실행 중인지 확인")
    print(f"  2. 호스트, 포트가 올바른지 확인")
    print(f"  3. 사용자 권한이 올바른지 확인")
    print(f"  4. SSL 모드 설정 확인 (Neon DB의 경우 require)")
    exit(1)

