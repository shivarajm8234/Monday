@echo off
echo Stopping silent Vite and Electron processes...
taskkill /f /im electron.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo Done. Stopped all running instances of Electron and Node (Vite).
timeout /t 2
