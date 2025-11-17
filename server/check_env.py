"""환경변수 로드 확인 스크립트"""
from pathlib import Path
from dotenv import load_dotenv
import os
import sys

# UTF-8 인코딩 설정 (Windows)
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# server 디렉토리로 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

# .env 파일 로드
env_path = Path(__file__).parent / ".env"
print("=" * 60)
print("환경변수 로드 확인")
print("=" * 60)
print(f"[1] .env 파일 경로: {env_path.resolve()}")
print(f"[2] .env 파일 존재: {env_path.exists()}")

if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"[3] .env 파일 로드 완료")
else:
    print(f"[3] ⚠️ .env 파일이 없습니다!")
    print(f"    {env_path} 경로에 파일을 생성하세요.")

print("\n" + "=" * 60)
print("환경변수 값 확인")
print("=" * 60)

# PostgreSQL 설정 확인
print("\n[PostgreSQL 설정]")
print(f"  PGHOST: {os.getenv('PGHOST', '없음')}")
print(f"  PGPORT: {os.getenv('PGPORT', '없음')}")
print(f"  PGDATABASE: {os.getenv('PGDATABASE', '없음')}")
print(f"  PGUSER: {os.getenv('PGUSER', '없음')}")
print(f"  PGPASSWORD: {'설정됨' if os.getenv('PGPASSWORD') else '없음'}")
print(f"  PGSSLMODE: {os.getenv('PGSSLMODE', '없음')}")

# 임베딩 설정 확인
print("\n[임베딩 설정]")
print(f"  EMBEDDING_PROVIDER: {os.getenv('EMBEDDING_PROVIDER', '없음')}")
print(f"  EMBEDDING_MODEL: {os.getenv('EMBEDDING_MODEL', '없음')}")
print(f"  EMBEDDING_DIMENSION: {os.getenv('EMBEDDING_DIMENSION', '없음')}")

# ChromaDB 설정 확인
print("\n[ChromaDB 설정]")
chroma_base_dir = os.getenv('CHROMA_BASE_DIR', '')
category_config_path = os.getenv('CATEGORY_CONFIG_PATH', '')
print(f"  CHROMA_SEARCH_ENABLED: {os.getenv('CHROMA_SEARCH_ENABLED', '없음')}")
print(f"  CHROMA_BASE_DIR: {chroma_base_dir}")
if chroma_base_dir:
    print(f"    존재 여부: {os.path.exists(chroma_base_dir)}")
print(f"  CATEGORY_CONFIG_PATH: {category_config_path}")
if category_config_path:
    print(f"    존재 여부: {os.path.exists(category_config_path)}")

# API Keys 확인
print("\n[API Keys]")
anthropic_key = os.getenv('ANTHROPIC_API_KEY', '')
upstage_key = os.getenv('UPSTAGE_API_KEY', '')
print(f"  ANTHROPIC_API_KEY: {'설정됨 (길이: ' + str(len(anthropic_key)) + ')' if anthropic_key else '없음'}")
print(f"  UPSTAGE_API_KEY: {'설정됨 (길이: ' + str(len(upstage_key)) + ')' if upstage_key else '없음'}")

# 폴백 설정
print("\n[폴백 설정]")
print(f"  FALLBACK_TO_VECTOR_SEARCH: {os.getenv('FALLBACK_TO_VECTOR_SEARCH', '없음')}")

print("\n" + "=" * 60)
print("config.py에서 로드 확인")
print("=" * 60)

try:
    from app.core.config import (
        CHROMA_BASE_DIR,
        CATEGORY_CONFIG_PATH,
        ANTHROPIC_API_KEY as CONFIG_ANTHROPIC_KEY,
        UPSTAGE_API_KEY as CONFIG_UPSTAGE_KEY,
        CHROMA_SEARCH_ENABLED,
        load_category_config
    )
    
    print(f"\n[config.py 값]")
    print(f"  CHROMA_BASE_DIR: {CHROMA_BASE_DIR}")
    print(f"    존재 여부: {os.path.exists(CHROMA_BASE_DIR)}")
    print(f"  CATEGORY_CONFIG_PATH: {CATEGORY_CONFIG_PATH}")
    print(f"    존재 여부: {os.path.exists(CATEGORY_CONFIG_PATH)}")
    print(f"  CHROMA_SEARCH_ENABLED: {CHROMA_SEARCH_ENABLED}")
    print(f"  ANTHROPIC_API_KEY: {'설정됨' if CONFIG_ANTHROPIC_KEY else '없음'}")
    print(f"  UPSTAGE_API_KEY: {'설정됨' if CONFIG_UPSTAGE_KEY else '없음'}")
    
    # 카테고리 설정 로드 테스트
    print("\n[카테고리 설정 로드 테스트]")
    try:
        config = load_category_config()
        print(f"  [OK] 성공: {len(config)}개 카테고리 로드됨")
        print(f"  카테고리 목록: {', '.join(list(config.keys())[:5])}...")
    except Exception as e:
        print(f"  [ERROR] 실패: {e}")
        
except Exception as e:
    print(f"[ERROR] config.py import 실패: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("검증 완료")
print("=" * 60)


from dotenv import load_dotenv
import os
import sys

# UTF-8 인코딩 설정 (Windows)
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# server 디렉토리로 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

# .env 파일 로드
env_path = Path(__file__).parent / ".env"
print("=" * 60)
print("환경변수 로드 확인")
print("=" * 60)
print(f"[1] .env 파일 경로: {env_path.resolve()}")
print(f"[2] .env 파일 존재: {env_path.exists()}")

if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"[3] .env 파일 로드 완료")
else:
    print(f"[3] ⚠️ .env 파일이 없습니다!")
    print(f"    {env_path} 경로에 파일을 생성하세요.")

print("\n" + "=" * 60)
print("환경변수 값 확인")
print("=" * 60)

# PostgreSQL 설정 확인
print("\n[PostgreSQL 설정]")
print(f"  PGHOST: {os.getenv('PGHOST', '없음')}")
print(f"  PGPORT: {os.getenv('PGPORT', '없음')}")
print(f"  PGDATABASE: {os.getenv('PGDATABASE', '없음')}")
print(f"  PGUSER: {os.getenv('PGUSER', '없음')}")
print(f"  PGPASSWORD: {'설정됨' if os.getenv('PGPASSWORD') else '없음'}")
print(f"  PGSSLMODE: {os.getenv('PGSSLMODE', '없음')}")

# 임베딩 설정 확인
print("\n[임베딩 설정]")
print(f"  EMBEDDING_PROVIDER: {os.getenv('EMBEDDING_PROVIDER', '없음')}")
print(f"  EMBEDDING_MODEL: {os.getenv('EMBEDDING_MODEL', '없음')}")
print(f"  EMBEDDING_DIMENSION: {os.getenv('EMBEDDING_DIMENSION', '없음')}")

# ChromaDB 설정 확인
print("\n[ChromaDB 설정]")
chroma_base_dir = os.getenv('CHROMA_BASE_DIR', '')
category_config_path = os.getenv('CATEGORY_CONFIG_PATH', '')
print(f"  CHROMA_SEARCH_ENABLED: {os.getenv('CHROMA_SEARCH_ENABLED', '없음')}")
print(f"  CHROMA_BASE_DIR: {chroma_base_dir}")
if chroma_base_dir:
    print(f"    존재 여부: {os.path.exists(chroma_base_dir)}")
print(f"  CATEGORY_CONFIG_PATH: {category_config_path}")
if category_config_path:
    print(f"    존재 여부: {os.path.exists(category_config_path)}")

# API Keys 확인
print("\n[API Keys]")
anthropic_key = os.getenv('ANTHROPIC_API_KEY', '')
upstage_key = os.getenv('UPSTAGE_API_KEY', '')
print(f"  ANTHROPIC_API_KEY: {'설정됨 (길이: ' + str(len(anthropic_key)) + ')' if anthropic_key else '없음'}")
print(f"  UPSTAGE_API_KEY: {'설정됨 (길이: ' + str(len(upstage_key)) + ')' if upstage_key else '없음'}")

# 폴백 설정
print("\n[폴백 설정]")
print(f"  FALLBACK_TO_VECTOR_SEARCH: {os.getenv('FALLBACK_TO_VECTOR_SEARCH', '없음')}")

print("\n" + "=" * 60)
print("config.py에서 로드 확인")
print("=" * 60)

try:
    from app.core.config import (
        CHROMA_BASE_DIR,
        CATEGORY_CONFIG_PATH,
        ANTHROPIC_API_KEY as CONFIG_ANTHROPIC_KEY,
        UPSTAGE_API_KEY as CONFIG_UPSTAGE_KEY,
        CHROMA_SEARCH_ENABLED,
        load_category_config
    )
    
    print(f"\n[config.py 값]")
    print(f"  CHROMA_BASE_DIR: {CHROMA_BASE_DIR}")
    print(f"    존재 여부: {os.path.exists(CHROMA_BASE_DIR)}")
    print(f"  CATEGORY_CONFIG_PATH: {CATEGORY_CONFIG_PATH}")
    print(f"    존재 여부: {os.path.exists(CATEGORY_CONFIG_PATH)}")
    print(f"  CHROMA_SEARCH_ENABLED: {CHROMA_SEARCH_ENABLED}")
    print(f"  ANTHROPIC_API_KEY: {'설정됨' if CONFIG_ANTHROPIC_KEY else '없음'}")
    print(f"  UPSTAGE_API_KEY: {'설정됨' if CONFIG_UPSTAGE_KEY else '없음'}")
    
    # 카테고리 설정 로드 테스트
    print("\n[카테고리 설정 로드 테스트]")
    try:
        config = load_category_config()
        print(f"  [OK] 성공: {len(config)}개 카테고리 로드됨")
        print(f"  카테고리 목록: {', '.join(list(config.keys())[:5])}...")
    except Exception as e:
        print(f"  [ERROR] 실패: {e}")
        
except Exception as e:
    print(f"[ERROR] config.py import 실패: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("검증 완료")
print("=" * 60)

