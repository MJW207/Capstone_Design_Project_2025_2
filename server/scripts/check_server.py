"""간단한 서버 상태 확인 스크립트"""
import requests
import sys

try:
    # 1. 기본 엔드포인트
    r = requests.get("http://127.0.0.1:8004/", timeout=2)
    print(f"[OK] Root endpoint: {r.status_code}")
    print(f"     Response: {r.json()}")
    
    # 2. Health 체크
    r = requests.get("http://127.0.0.1:8004/health", timeout=2)
    print(f"[OK] Health endpoint: {r.status_code}")
    print(f"     Response: {r.json()}")
    
    # 3. Health DB 체크 (DB 설정이 있는 경우)
    try:
        r = requests.get("http://127.0.0.1:8004/health/db", timeout=2)
        print(f"[OK] Health DB endpoint: {r.status_code}")
        print(f"     Response: {r.json()}")
    except Exception as e:
        print(f"[WARN] Health DB: {e}")
    
    print("\n[OK] Server is running!")
    sys.exit(0)
    
except requests.exceptions.ConnectionError:
    print("[ERROR] Server is not running. Start with:")
    print("  cd server")
    print("  python -m uvicorn app.main:app --reload --port 8004 --host 127.0.0.1")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] {e}")
    sys.exit(1)











