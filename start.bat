@echo off
echo Starting AI Engineer Application...
echo.

echo Starting Backend Server...
start cmd /k "cd backend && python server.py"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo Starting Frontend Development Server...
start cmd /k "cd frontend && npm start"

echo.
echo AI Engineer is starting up!
echo Backend API: http://localhost:8001
echo Frontend UI: http://localhost:3000
echo.
echo Press any key to exit this window. The servers will continue running.
pause > nul