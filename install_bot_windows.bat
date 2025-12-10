@echo off
title WhatsApp Bot Installer (Windows)
echo =========================================
echo      WHATSAPP BOT INSTALLER - WINDOWS
echo =========================================
echo.

REM --- CEK NODE.JS ---
echo [1/6] Checking Node.js installation...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Node.js belum terinstall!
    echo Silakan install dari: https://nodejs.org/
    pause
    exit /b
)
echo Node.js terdeteksi.

echo.
echo [2/6] Installing dotenv...
npm install dotenv

echo.
echo [3/6] Installing whatsapp-web.js...
npm install whatsapp-web.js

echo.
echo [4/6] Installing mssql...
npm install mssql@9.3.2


echo.
echo [5/6] Installing qrcode-terminal...
npm install qrcode-terminal


echo.
echo [6/6] Installing dateformat...
npm install dateformat@4.5.1

echo.
echo [7/6] Creating required folders...
if not exist data mkdir data
if not exist logs mkdir logs

echo Folder siap.

echo.
echo [8/6] Install PM2? (y/n)
set /p pm2choice=">> "

if /I "%pm2choice%"=="y" (
    echo Installing PM2...
    npm install -g pm2
    echo PM2 installed.
) else (
    echo PM2 skipped.
)

echo.
echo =========================================
echo      INSTALLATION COMPLETE!
echo =========================================
echo.

echo Jalankan bot dengan:
echo   node index.js
echo atau, jika memakai PM2:
echo   pm2 start ecosystem.config.js
echo.

pause
exit
