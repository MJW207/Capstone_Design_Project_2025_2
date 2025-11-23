@echo off
echo 포트를 사용 중인 프로세스를 종료합니다...

REM 포트 3000 (프론트엔드 개발 서버)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo 포트 3000 종료: PID %%a
    taskkill /F /PID %%a 2>nul
)

REM 포트 3001 (다른 개발 서버)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo 포트 3001 종료: PID %%a
    taskkill /F /PID %%a 2>nul
)

REM 포트 3002 (다른 개발 서버)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    echo 포트 3002 종료: PID %%a
    taskkill /F /PID %%a 2>nul
)

REM 포트 8004 (백엔드 서버) - 필요시 주석 해제
REM for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8004 ^| findstr LISTENING') do (
REM     echo 포트 8004 종료: PID %%a
REM     taskkill /F /PID %%a 2>nul
REM )

echo.
echo 포트 정리 완료!
pause

