@echo off
title Ticket Management System - Live
color 0A
echo =========================================================
echo       Starting Ticket Management System ^& Email Listener
echo =========================================================
echo.

:: 1. Start Server in background
cd /d "%~dp0\server"
start /B npm start

:: 2. Wait 3 seconds for server to boot
echo Waiting for system to initialize...
timeout /t 3 /nobreak >nul

:: 3. Open browser automatically
echo Opening dashboard...
start http://localhost:4000

echo.
echo =========================================================
echo  System is running live! Keep this window open.
echo =========================================================
echo.
pause