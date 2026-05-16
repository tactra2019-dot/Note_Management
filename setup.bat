@echo off
setlocal

echo Setting up Note Management App...
echo.

echo Step 1: Installing backend dependencies...
pushd backend || exit /b 1
call npm install
if errorlevel 1 exit /b 1
popd

echo.
echo Step 2: Installing frontend dependencies...
pushd frontend || exit /b 1
call npm install
if errorlevel 1 exit /b 1
popd

echo.
echo Step 3: Database configuration
echo Bundled MariaDB is configured for 127.0.0.1:3307.
echo User: root
echo Password: set in backend\.env
echo Database: note_app
echo.
echo Start the database in a separate terminal:
echo   .\start-db.bat
echo.
echo Then initialize the schema:
echo   .\init-db.bat
echo.

echo Setup complete.
echo.
echo Start backend:
echo   cd backend
echo   npm run dev
echo.
echo Start frontend:
echo   cd frontend
echo   npm run dev
echo.
echo Open http://localhost:5173
