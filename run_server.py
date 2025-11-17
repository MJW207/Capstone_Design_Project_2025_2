"""프로젝트 루트에서 서버 실행 스크립트"""
import sys
import os
import asyncio
from pathlib import Path

# server 디렉토리로 이동
project_root = Path(__file__).parent.resolve()
server_dir = project_root / "server"

if not server_dir.exists():
    print(f"[ERROR] server 디렉토리를 찾을 수 없습니다: {server_dir}")
    sys.exit(1)

# Windows에서 ProactorEventLoop 문제 해결
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    print("[BOOT] Windows 이벤트 루프 정책 설정: WindowsSelectorEventLoopPolicy")

# server 디렉토리를 Python 경로에 추가 (모듈 검색을 위해)
sys.path.insert(0, str(server_dir))

# server 디렉토리로 이동
os.chdir(server_dir)
print(f"[BOOT] 작업 디렉토리 변경: {server_dir}")
print(f"[BOOT] Python 경로에 추가: {server_dir}")

# uvicorn 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8004,
        reload=False,
        log_level="info"
    )

