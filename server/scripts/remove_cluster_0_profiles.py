"""
군집 0 프로필 삭제 스크립트

노이즈 군집 프로필이 별도로 있으므로 군집 0 프로필을 제거합니다.
"""
import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).resolve().parents[2]
server_dir = project_root / "server"
sys.path.insert(0, str(server_dir))
sys.path.insert(0, str(project_root))

# Windows 이벤트 루프 정책 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv(override=True)

async def remove_cluster_0_profiles():
    """군집 0 프로필 삭제"""
    print("=" * 80)
    print("군집 0 프로필 삭제")
    print("=" * 80)
    
    uri = os.getenv("ASYNC_DATABASE_URI")
    if not uri:
        print("[ERROR] ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
        return
    
    if uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    elif "postgresql+asyncpg" in uri:
        uri = uri.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
    
    engine = create_async_engine(uri, echo=False, pool_pre_ping=True)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with SessionLocal() as session:
            async with session.begin():
                # Precomputed 세션 ID 조회
                from app.utils.clustering_loader import get_precomputed_session_id
                
                precomputed_name = "hdbscan_default"
                session_id = await get_precomputed_session_id(precomputed_name)
                
                if not session_id:
                    print(f"[ERROR] Precomputed 세션을 찾을 수 없습니다: name={precomputed_name}")
                    return
                
                print(f"[OK] Precomputed 세션 ID: {session_id}")
                
                # 군집 0 프로필 개수 확인
                result = await session.execute(
                    text("""
                        SELECT COUNT(*) as count
                        FROM merged.cluster_profiles
                        WHERE session_id = :session_id AND cluster_id = 0
                    """),
                    {"session_id": session_id}
                )
                row = result.fetchone()
                count_before = row[0] if row else 0
                
                print(f"[INFO] 삭제 전 군집 0 프로필 개수: {count_before}개")
                
                if count_before == 0:
                    print("[INFO] 삭제할 군집 0 프로필이 없습니다.")
                    return
                
                # 군집 0 프로필 삭제
                result = await session.execute(
                    text("""
                        DELETE FROM merged.cluster_profiles
                        WHERE session_id = :session_id AND cluster_id = 0
                    """),
                    {"session_id": session_id}
                )
                
                deleted_count = result.rowcount
                print(f"[OK] 군집 0 프로필 삭제 완료: {deleted_count}개")
                
                # 삭제 후 확인
                result = await session.execute(
                    text("""
                        SELECT COUNT(*) as count
                        FROM merged.cluster_profiles
                        WHERE session_id = :session_id AND cluster_id = 0
                    """),
                    {"session_id": session_id}
                )
                row = result.fetchone()
                count_after = row[0] if row else 0
                
                if count_after == 0:
                    print("[OK] 군집 0 프로필이 모두 삭제되었습니다.")
                else:
                    print(f"[WARNING] 군집 0 프로필이 아직 {count_after}개 남아있습니다.")
                
    except Exception as e:
        print(f"[ERROR] 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(remove_cluster_0_profiles())








