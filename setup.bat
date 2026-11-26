@echo off
REM AutoViews Multi-Player Dashboard - Setup Script for Windows

echo.
echo 🎬 AutoViews Multi-Player Dashboard - Setup Guide
echo ==================================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install it from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✓ Node.js found: %NODE_VERSION%
echo ✓ npm found: %NPM_VERSION%
echo.

REM Install server dependencies
echo 📦 Installing server dependencies...
cd server
call npm install
cd ..
echo ✓ Server dependencies installed
echo.

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
call npm install
cd ..
echo ✓ Client dependencies installed
echo.

REM Create .env file
if not exist server\.env (
    copy server\.env.example server\.env
    echo ✓ Created server\.env file
)

echo.
echo 🎉 Setup complete!
echo.
echo To start development, run these commands in separate terminals:
echo.
echo Terminal 1 ^(Backend^):
echo   cd server ^&^& npm run dev
echo.
echo Terminal 2 ^(Frontend^):
echo   cd client ^&^& npm run dev
echo.
echo Then open http://localhost:5173 in your browser
echo.
pause
