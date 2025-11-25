"""
클러스터링 데이터 DB 적재 확인 스크립트
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


async def verify_db_data():
    """DB 데이터 확인"""
    print("=" * 80)
    print("클러스터링 데이터 DB 적재 확인")
    print("=" * 80)
    
    uri = os.getenv("ASYNC_DATABASE_URI")
    if not uri:
        print("❌ ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
        return
    
    if uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    elif "postgresql+asyncpg" in uri:
        uri = uri.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
    
    engine = create_async_engine(uri, echo=False, pool_pre_ping=True)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with SessionLocal() as session:
            # 1. 세션 정보 확인
            print("\n[1] 클러스터링 세션 정보")
            print("-" * 80)
            result = await session.execute(
                text("""
                    SELECT 
                        session_id, 
                        n_samples, 
                        n_clusters, 
                        silhouette_score,
                        davies_bouldin_score,
                        is_precomputed,
                        precomputed_name
                    FROM merged.clustering_sessions
                    WHERE precomputed_name = 'hdbscan_default'
                    ORDER BY created_at DESC
                    LIMIT 1
                """)
            )
            row = result.fetchone()
            if row:
                print(f"[OK] 세션 ID: {row.session_id}")
                print(f"   샘플 수: {row.n_samples}")
                print(f"   클러스터 수: {row.n_clusters}")
                print(f"   Silhouette Score: {row.silhouette_score:.4f}")
                print(f"   Davies-Bouldin Index: {row.davies_bouldin_score:.4f}")
                session_id = str(row.session_id)
            else:
                print("[ERROR] Precomputed 세션을 찾을 수 없습니다.")
                return
            
            # 2. UMAP 좌표 확인
            print("\n[2] UMAP 좌표")
            print("-" * 80)
            result = await session.execute(
                text("""
                    SELECT COUNT(*) as total
                    FROM merged.umap_coordinates
                    WHERE session_id = :session_id
                """),
                {"session_id": session_id}
            )
            row = result.fetchone()
            if row:
                print(f"[OK] UMAP 좌표: {row.total}개")
            else:
                print("[ERROR] UMAP 좌표가 없습니다.")
            
            # 3. 패널-클러스터 매핑 확인
            print("\n[3] 패널-클러스터 매핑")
            print("-" * 80)
            result = await session.execute(
                text("""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(DISTINCT cluster_id) as cluster_count
                    FROM merged.panel_cluster_mappings
                    WHERE session_id = :session_id
                """),
                {"session_id": session_id}
            )
            row = result.fetchone()
            if row:
                print(f"[OK] 매핑 데이터: {row.total}개")
                print(f"   클러스터 수: {row.cluster_count}개")
            
            # 4. 클러스터 프로필 확인
            print("\n[4] 클러스터 프로필")
            print("-" * 80)
            result = await session.execute(
                text("""
                    SELECT 
                        COUNT(*) as total,
                        SUM(size) as total_size
                    FROM merged.cluster_profiles
                    WHERE session_id = :session_id
                """),
                {"session_id": session_id}
            )
            row = result.fetchone()
            if row:
                print(f"[OK] 프로필 수: {row.total}개")
                print(f"   총 패널 수: {row.total_size}개")
            
            # 클러스터별 프로필 샘플
            result = await session.execute(
                text("""
                    SELECT 
                        cluster_id, 
                        size, 
                        percentage, 
                        name
                    FROM merged.cluster_profiles
                    WHERE session_id = :session_id
                    ORDER BY cluster_id
                    LIMIT 5
                """),
                {"session_id": session_id}
            )
            rows = result.fetchall()
            if rows:
                print("\n   프로필 샘플 (상위 5개):")
                for r in rows:
                    print(f"   - Cluster {r.cluster_id}: {r.name} ({r.size}개, {r.percentage:.2f}%)")
            
            # 5. 클러스터 비교 데이터 확인
            print("\n[5] 클러스터 비교 데이터")
            print("-" * 80)
            result = await session.execute(
                text("""
                    SELECT COUNT(*) as total
                    FROM merged.cluster_comparisons
                    WHERE session_id = :session_id
                """),
                {"session_id": session_id}
            )
            row = result.fetchone()
            if row:
                print(f"[OK] 비교 데이터: {row.total}개")
                expected = 18 * 17 // 2  # 18C2 = 153
                if row.total == expected:
                    print(f"   [OK] 예상 개수와 일치: {expected}개")
                else:
                    print(f"   [WARNING] 예상 개수와 다름: 예상 {expected}개, 실제 {row.total}개")
            
            # 비교 데이터 샘플 확인
            result = await session.execute(
                text("""
                    SELECT 
                        cluster_a, 
                        cluster_b,
                        jsonb_typeof(comparison_data) as data_type
                    FROM merged.cluster_comparisons
                    WHERE session_id = :session_id
                    LIMIT 3
                """),
                {"session_id": session_id}
            )
            rows = result.fetchall()
            if rows:
                print("\n   비교 데이터 샘플 (상위 3개):")
                for r in rows:
                    print(f"   - Cluster {r.cluster_a} vs {r.cluster_b} (타입: {r.data_type})")
            
            print("\n" + "=" * 80)
            print("[OK] 모든 데이터 확인 완료!")
            print("=" * 80)
            
    except Exception as e:
        print(f"[ERROR] 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(verify_db_data())

