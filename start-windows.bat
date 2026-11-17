@echo off
title LogicLab Studio
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js 18 or newer from https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules\mongodb (
  echo Installing required packages...
  call npm install
  if errorlevel 1 (
    echo Package installation failed. Check your internet connection.
    pause
    exit /b 1
  )
)
echo Starting LogicLab Studio...
node server.js
pause
