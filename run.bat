@echo off
cd /d "%~dp0"
set NODE_ENV=development
echo Starting Vite development server on port 5180...
start cmd /k "npx vite --port 5180"
echo Waiting for Vite server to start...
timeout /t 3
echo Starting Electron application...
npm run electron:dev
pause
