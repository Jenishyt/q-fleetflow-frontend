@echo off
REM Q-FORGE frontend - one-click setup and run (Windows)
REM Place this file inside your q-fleetflow-web (or "web") folder, then double-click it.

echo ============================================
echo  Q-FORGE frontend - setup and run
echo ============================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js was not found on this PC.
    echo Please install it from https://nodejs.org/ ^(the LTS version^)
    echo Then run this file again.
    pause
    exit /b 1
)
echo [OK] Node.js found.

if not exist node_modules (
    echo Installing dependencies - first run takes a few minutes, please wait...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed. See the error above.
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed.
echo.

echo ============================================
echo  IMPORTANT: make sure the backend is already running
echo  (double-click setup_and_run.bat in the backend folder FIRST)
echo ============================================
echo.
echo Starting the frontend at http://localhost:3000
echo Press CTRL+C in this window to stop it.
echo.
call npm run dev

pause
