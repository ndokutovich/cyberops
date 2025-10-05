@echo off
echo Starting CyberOps: Syndicate game server...
echo.
echo The game will open at: http://localhost:3005
echo Press Ctrl+C to stop the server
echo.
rem python -m http.server 3005
set PORT=3005
serve .