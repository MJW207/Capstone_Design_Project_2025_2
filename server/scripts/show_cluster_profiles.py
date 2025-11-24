"""
생성된 군집 프로파일 조회 및 출력 스크립트
"""
import asyncio
import json
import sys
from pathlib import Path

# Windows 이벤트 루프 정책 설정 (가장 먼저)
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv(override=True)

async def show_cluster_profiles():
    """생성된 군집 프로파일 조회 및 출력"""
    
    # DB 연결
    uri = os.getenv("ASYNC_DATABASE_URI")
    if not uri:
        print("ERROR: ASYNC_DATABASE_URI 환경변수가 설정되지 않았습니다.")
        return
    
    if uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    elif "postgresql+asyncpg" in uri:
        uri = uri.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
    
    engine = create_async_engine(uri, echo=False, pool_pre_ping=True)
    
    try:
        async with engine.begin() as conn:
            await conn.execute(text('SET search_path TO "clustering", public'))
            
            # 최신 세션의 프로파일 조회
            result = await conn.execute(text("""
                SELECT 
                    cp.cluster_id,
                    cp.name,
                    cp.size,
                    cp.percentage,
                    cp.tags,
                    cp.distinctive_features,
                    cp.insights_by_category,
                    cp.insights_storytelling,
                    cp.segments
                FROM clustering.cluster_profiles cp
                ORDER BY cp.cluster_id
                LIMIT 5
            """))
            
            rows = result.mappings().all()
            
            if not rows:
                print("생성된 프로파일이 없습니다.")
                return
            
            print("=" * 80)
            print(f"생성된 군집 프로파일 (총 {len(rows)}개 샘플)")
            print("=" * 80)
            
            for row in rows:
                print(f"\n[군집 {row['cluster_id']}]")
                print(f"  이름: {row['name']}")
                print(f"  크기: {row['size']}명 ({row['percentage']:.2f}%)")
                
                # 태그
                tags = row.get('tags', [])
                if tags:
                    if isinstance(tags, str):
                        tags = json.loads(tags)
                    print(f"  태그: {', '.join(tags[:5])}")
                
                # 특징 피처
                distinctive = row.get('distinctive_features', [])
                if distinctive:
                    if isinstance(distinctive, str):
                        distinctive = json.loads(distinctive)
                    print(f"  특징 피처: {len(distinctive)}개")
                    for feat in distinctive[:3]:
                        feature_name = feat.get('feature', 'N/A')
                        if feat.get('type') == 'numeric':
                            effect_size = feat.get('effect_size', 0)
                            print(f"    - {feature_name}: effect_size={effect_size:.2f} {feat.get('visual_strength', '')}")
                        elif feat.get('type') == 'binary':
                            lift = feat.get('lift', 0)
                            print(f"    - {feature_name}: lift={lift:.2f} {feat.get('visual_strength', '')}")
                
                # 스토리텔링 인사이트
                storytelling = row.get('insights_storytelling', {})
                if storytelling:
                    if isinstance(storytelling, str):
                        storytelling = json.loads(storytelling)
                    print(f"  스토리텔링 인사이트:")
                    for category, items in storytelling.items():
                        if items:
                            print(f"    - {category}: {len(items)}개")
                            for item in items[:2]:
                                msg = item.get('message', '')[:70]
                                print(f"      • {msg}...")
                
                # 마케팅 세그먼트
                segments = row.get('segments', {})
                if segments:
                    if isinstance(segments, str):
                        segments = json.loads(segments)
                    # 마케팅 가치 점수는 제거됨
                
                print("-" * 80)
            
            await engine.dispose()
    
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        try:
            await engine.dispose()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(show_cluster_profiles())

