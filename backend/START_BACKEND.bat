@echo off
echo ========================================
echo  Starting Backend Server
echo ========================================
echo.

cd /d "%~dp0"

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Starting server...
echo.
echo Backend will be available at:
echo   http://localhost:8000
echo   http://localhost:8000/docs (API Documentation)
echo.
echo Press CTRL+C to stop the server
echo.

venv\Scripts\python main.py

pause
