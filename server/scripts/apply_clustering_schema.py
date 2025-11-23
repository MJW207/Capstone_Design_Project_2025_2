"""
클러스터링 스키마 적용 스크립트

NeonDB에 클러스터링 관련 테이블을 생성합니다.
"""
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# 프로젝트 루트를 경로에 추가
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

# 환경 변수 로드
load_dotenv(dotenv_path=project_root / '.env', override=True)
load_dotenv(dotenv_path=project_root / 'server' / '.env', override=True)

# Windows 이벤트 루프 정책 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def apply_schema():
    """스키마 적용"""
    # 데이터베이스 URI 가져오기
    uri = os.getenv("ASYNC_DATABASE_URI")
    if not uri:
        print("❌ ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
        return
    
    if uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    
    print("=" * 80)
    print("클러스터링 스키마 적용")
    print("=" * 80)
    print(f"데이터베이스 URI: {uri.split('@')[1] if '@' in uri else '***'}")
    print()
    
    # 스키마 파일 경로
    schema_path = project_root / 'server' / 'sql' / 'clustering_schema.sql'
    
    if not schema_path.exists():
        print(f"❌ 스키마 파일을 찾을 수 없습니다: {schema_path}")
        return
    
    # 스키마 SQL 읽기
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    print(f"[1단계] 스키마 파일 로드: {schema_path}")
    print(f"  파일 크기: {len(schema_sql)} bytes")
    print()
    
    # 데이터베이스 연결 및 스키마 적용
    engine = create_async_engine(uri, echo=False)
    
    try:
        print("[2단계] 데이터베이스 연결 및 스키마 적용 중...")
        async with engine.begin() as conn:
            # SQL을 세미콜론으로 분리하여 실행
            # 주의: 트리거 함수는 별도로 실행해야 할 수 있음
            statements = schema_sql.split(';')
            
            for i, statement in enumerate(statements, 1):
                statement = statement.strip()
                if not statement or statement.startswith('--'):
                    continue
                
                try:
                    await conn.execute(text(statement))
                    if 'CREATE TABLE' in statement.upper():
                        table_name = statement.split('IF NOT EXISTS')[1].split('(')[0].strip() if 'IF NOT EXISTS' in statement.upper() else statement.split('TABLE')[1].split('(')[0].strip()
                        print(f"  ✓ 테이블 생성: {table_name}")
                    elif 'CREATE INDEX' in statement.upper():
                        print(f"  ✓ 인덱스 생성")
                    elif 'CREATE OR REPLACE FUNCTION' in statement.upper():
                        print(f"  ✓ 함수 생성")
                    elif 'CREATE TRIGGER' in statement.upper():
                        print(f"  ✓ 트리거 생성")
                    elif 'CREATE OR REPLACE VIEW' in statement.upper():
                        print(f"  ✓ 뷰 생성")
                except Exception as e:
                    # 일부 오류는 무시 (이미 존재하는 경우 등)
                    if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                        continue
                    print(f"  ⚠ 경고: {str(e)[:100]}")
        
        print()
        print("[3단계] 스키마 적용 완료!")
        print()
        
        # 테이블 목록 확인
        print("[4단계] 생성된 테이블 확인:")
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (table_name LIKE 'clustering%' 
                     OR table_name LIKE 'panel_cluster%' 
                     OR table_name LIKE 'umap%' 
                     OR table_name LIKE 'cluster_%')
                ORDER BY table_name
            """))
            tables = result.fetchall()
            
            if tables:
                for table in tables:
                    print(f"  ✓ {table[0]}")
            else:
                print("  ⚠ 테이블을 찾을 수 없습니다.")
        
        print()
        print("=" * 80)
        print("✅ 스키마 적용 완료!")
        print("=" * 80)
        
    except Exception as e:
        print()
        print("=" * 80)
        print(f"❌ 스키마 적용 실패: {str(e)}")
        print("=" * 80)
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(apply_schema())

