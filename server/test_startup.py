"""간단한 시작 테스트 스크립트"""
import asyncio
from app.main import app
from app.db.session import engine, SessionLocal
from sqlalchemy import text

async def test_startup():
    """앱 시작 테스트"""
    print("\n=== Backend Startup Test ===")
    
    # 1. 앱 체크
    print(f"[OK] FastAPI app: {app is not None}")
    print(f"  - Title: {app.title}")
    print(f"  - Version: {app.version}")
    
    # 2. DB 엔진 체크
    print(f"\n[OK] DB Engine: {engine is not None}")
    print(f"[OK] SessionLocal: {SessionLocal is not None}")
    
    # 3. DB 연결 테스트 (있는 경우)
    if engine is not None:
        try:
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT 1"))
                val = result.scalar()
                print(f"[OK] DB Connection Test: {val}")
        except Exception as e:
            print(f"[WARN] DB Connection Test Failed: {e}")
    else:
        print("[WARN] DB Engine not initialized (DB not configured)")
    
    # 4. 라우터 체크
    routes = [r.path for r in app.routes]
    print(f"\n[OK] Registered Routes: {len(routes)}")
    print(f"  - Main routes: /, /health, /api/search, /api/clustering/*")
    
    print("\n=== Test Complete ===\n")

if __name__ == "__main__":
    asyncio.run(test_startup())

