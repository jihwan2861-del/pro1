@echo off
title React Game Server Runner
cd /d "%~dp0"

:: Node.js 경로 추가 (환경 변수에 없는 경우 대비)
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ==========================================
echo       React Game Server 시작 중...
echo ==========================================

:: 새 CMD 창에서 해당 폴더 위치로 개발 서버 구동
start "React Game Server" /d "%~dp0" cmd /k "npm run dev"

:: 서버 구동 대기 (3초)
echo 개발 서버가 켜질 때까지 잠시 대기합니다...
ping -n 4 127.0.0.1 > nul

:: 브라우저로 게임 주소 열기
echo 브라우저에서 게임 페이지를 엽니다...
start http://localhost:3000/

echo ==========================================
echo 서버 실행 완료! 게임을 즐기세요.
echo ==========================================
