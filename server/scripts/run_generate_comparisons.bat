@echo off
echo ========================================
echo 클러스터 비교 데이터 생성 스크립트 실행
echo ========================================
echo.

cd /d "%~dp0\..\.."
echo 현재 디렉토리: %CD%
echo.

echo [1] Python 스크립트 실행 중...
echo     스크립트: server/scripts/generate_cluster_comparisons.py
echo.

python -m server.scripts.generate_cluster_comparisons

echo.
echo ========================================
echo 실행 완료
echo ========================================
pause

