@echo off
echo AI Engineer - Setup Script
echo ==============================
echo.

echo Checking Python installation...
python --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH. Please install Python 3.8 or higher.
    echo Visit https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Checking Node.js installation...
node --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed or not in PATH. Please install Node.js 16 or higher.
    echo Visit https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Setting up backend...
cd backend

echo Creating virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing backend dependencies...
pip install -r requirements.txt

if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit the .env file to add your API keys.
)

echo.
echo Setting up frontend...
cd ..\frontend

echo Installing frontend dependencies...
npm install

echo.
echo Setup complete!
echo.
echo To start the application:
echo 1. Run start.bat in the project root directory
echo 2. Access the application at http://localhost:3000
echo.
echo Press any key to exit...
pause > nul