@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
cd /d "%~dp0"
echo Starting Vite in %CD%...
node "node_modules\vite\bin\vite.js"
pause
