@echo off
setlocal

echo Starting NoteSpace...
echo.
echo Database window: start-db.bat
echo Backend window: npm run dev
echo Frontend window: npm run dev
echo.
echo Run .\init-db.bat once before first use or after schema changes.
echo.

start "NoteSpace Database" /D "%~dp0" cmd /k start-db.bat
ping -n 6 127.0.0.1 >nul
start "NoteSpace Backend" /D "%~dp0backend" cmd /k npm run dev
start "NoteSpace Frontend" /D "%~dp0frontend" cmd /k npm run dev

echo Open http://localhost:5173 after Vite finishes starting.
