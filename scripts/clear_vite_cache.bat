@echo off
echo ========================================
echo Vite 캐시 삭제 및 서버 재시작
echo ========================================
echo.

echo [1] Vite 서버가 실행 중이면 Ctrl+C로 중지하세요.
pause

echo.
echo [2] Vite 캐시 삭제 중...
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
    echo ✅ 캐시 삭제 완료
) else (
    echo ℹ️  캐시 폴더가 없습니다.
)

echo.
echo [3] 서버 재시작...
echo npm run dev를 실행하세요.
echo.
pause


