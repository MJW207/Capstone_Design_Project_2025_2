"""클러스터링 스키마 확인 스크립트"""
import asyncio
import sys
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# 프로젝트 루트 경로 추가
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "server"))

# Windows 이벤트 루프 정책 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv(override=True)

async def check_clustering_schema():
    """클러스터링 관련 테이블 구조 확인"""
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
            # 테이블 목록 확인
            print("=" * 80)
            print("클러스터링 관련 테이블 확인")
            print("=" * 80)
            
            tables = [
                'clustering_sessions',
                'panel_cluster_mappings',
                'umap_coordinates',
                'cluster_profiles',
                'cluster_metadata',
                'cluster_comparisons'
            ]
            
            for table_name in tables:
                print(f"\n📋 테이블: {table_name}")
                print("-" * 80)
                
                # 테이블 존재 여부 확인
                check_table = await conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table_name}'
                    );
                """))
                exists = check_table.scalar()
                
                if not exists:
                    print(f"  ❌ 테이블이 존재하지 않습니다.")
                    continue
                
                # 컬럼 정보 조회
                columns_query = await conn.execute(text(f"""
                    SELECT 
                        column_name,
                        data_type,
                        character_maximum_length,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_name = '{table_name}'
                    ORDER BY ordinal_position;
                """))
                
                columns = columns_query.fetchall()
                print(f"  ✅ 테이블 존재 (컬럼 수: {len(columns)})")
                print(f"\n  컬럼 구조:")
                for col in columns:
                    col_name = col[0]
                    col_type = col[1]
                    col_length = f"({col[2]})" if col[2] else ""
                    nullable = "NULL" if col[3] == 'YES' else "NOT NULL"
                    default = f" DEFAULT {col[4]}" if col[4] else ""
                    print(f"    - {col_name}: {col_type}{col_length} {nullable}{default}")
                
                # 행 수 확인
                count_query = await conn.execute(text(f"SELECT COUNT(*) FROM {table_name};"))
                row_count = count_query.scalar()
                print(f"\n  데이터 행 수: {row_count:,}개")
                
                # 샘플 데이터 확인 (있는 경우)
                if row_count > 0:
                    sample_query = await conn.execute(text(f"SELECT * FROM {table_name} LIMIT 1;"))
                    sample = sample_query.fetchone()
                    if sample:
                        print(f"\n  샘플 데이터 (첫 번째 행):")
                        for i, col in enumerate(columns):
                            col_name = col[0]
                            value = sample[i]
                            if isinstance(value, (dict, list)):
                                value_str = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                            else:
                                value_str = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                            print(f"    - {col_name}: {value_str}")
            
            # 인덱스 확인
            print(f"\n\n📊 인덱스 정보")
            print("-" * 80)
            for table_name in tables:
                indexes_query = await conn.execute(text(f"""
                    SELECT 
                        indexname,
                        indexdef
                    FROM pg_indexes
                    WHERE tablename = '{table_name}'
                    ORDER BY indexname;
                """))
                indexes = indexes_query.fetchall()
                if indexes:
                    print(f"\n  테이블: {table_name}")
                    for idx in indexes:
                        print(f"    - {idx[0]}")
                        print(f"      {idx[1]}")
            
            # 뷰 확인
            print(f"\n\n👁️ 뷰 정보")
            print("-" * 80)
            views = ['clustering_sessions_summary', 'cluster_panel_counts']
            for view_name in views:
                check_view = await conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.views 
                        WHERE table_name = '{view_name}'
                    );
                """))
                exists = check_view.scalar()
                if exists:
                    print(f"  ✅ {view_name} 존재")
                else:
                    print(f"  ❌ {view_name} 없음")
            
            # Precomputed 세션 확인
            print(f"\n\n🔍 Precomputed 세션 확인")
            print("-" * 80)
            precomputed_query = await conn.execute(text("""
                SELECT 
                    session_id,
                    precomputed_name,
                    n_samples,
                    n_clusters,
                    algorithm,
                    created_at,
                    is_precomputed
                FROM clustering_sessions
                WHERE is_precomputed = TRUE
                ORDER BY created_at DESC;
            """))
            precomputed_sessions = precomputed_query.fetchall()
            
            if precomputed_sessions:
                print(f"  ✅ Precomputed 세션: {len(precomputed_sessions)}개")
                for session in precomputed_sessions:
                    print(f"\n    세션 ID: {session[0]}")
                    print(f"    이름: {session[1]}")
                    print(f"    샘플 수: {session[2]:,}개")
                    print(f"    클러스터 수: {session[3]}개")
                    print(f"    알고리즘: {session[4]}")
                    print(f"    생성일: {session[5]}")
            else:
                print(f"  ⚠️ Precomputed 세션이 없습니다.")
            
            # 전체 세션 통계
            print(f"\n\n📈 전체 세션 통계")
            print("-" * 80)
            stats_query = await conn.execute(text("""
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(*) FILTER (WHERE is_precomputed = TRUE) as precomputed_sessions,
                    COUNT(*) FILTER (WHERE is_precomputed = FALSE) as regular_sessions,
                    SUM(n_samples) as total_samples,
                    AVG(n_clusters) as avg_clusters
                FROM clustering_sessions;
            """))
            stats = stats_query.fetchone()
            if stats and stats[0]:
                print(f"  총 세션 수: {stats[0]}개")
                print(f"  - Precomputed: {stats[1]}개")
                print(f"  - 일반: {stats[2]}개")
                print(f"  총 샘플 수: {stats[3]:,}개")
                print(f"  평균 클러스터 수: {stats[4]:.1f}개")
            
            print("\n" + "=" * 80)
            print("스키마 확인 완료")
            print("=" * 80)
            
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_clustering_schema())

