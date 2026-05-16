@echo off
setlocal EnableExtensions

call "%~dp0db-env.bat"

set "BASE=%~dp0.mariadb\mariadb-11.4.10-winx64"
set "MYSQL=%BASE%\bin\mariadb.exe"
if not exist "%MYSQL%" set "MYSQL=%BASE%\bin\mysql.exe"
set "SCHEMA=%~dp0backend\schema.sql"

if not exist "%MYSQL%" (
  echo MariaDB client not found at "%BASE%\bin".
  exit /b 1
)

if not exist "%SCHEMA%" (
  echo Schema file not found at "%SCHEMA%".
  exit /b 1
)

call :FindPortProcess
if not defined PORT_PID (
  echo Database is not running. Please run .\start-db.bat first.
  exit /b 1
)

call :CanConnect
if errorlevel 1 (
  echo.
  echo Cannot connect to MariaDB with the credentials from backend\.env.
  echo If the error says Access denied, DB_PASSWORD in backend\.env does not match the current .mariadb data directory.
  echo Current password status: %DB_PASSWORD_STATUS%
  echo.
  echo Safe reset option:
  echo   1. .\stop-db.bat
  echo      If stop fails because the old password is unknown, close the MariaDB window or stop the process from Task Manager.
  echo   2. Rename .mariadb to .mariadb_old
  echo   3. .\start-db.bat
  echo   4. .\init-db.bat
  exit /b 1
)

echo Importing backend\schema.sql into MariaDB on %DB_HOST%:%DB_PORT%...
echo Database: %DB_NAME%
echo User: %DB_USER%
echo Password: %DB_PASSWORD_STATUS%
echo.

if "%DB_PASSWORD%"=="" (
  "%MYSQL%" --protocol=TCP --ssl=0 --default-character-set=utf8mb4 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" < "%SCHEMA%"
) else (
  "%MYSQL%" --protocol=TCP --ssl=0 --default-character-set=utf8mb4 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" "--password=%DB_PASSWORD%" < "%SCHEMA%"
)

if errorlevel 1 (
  echo.
  echo Import failed. Make sure start-db.bat is running in another window and backend\.env uses DB_PORT=%DB_PORT%.
  exit /b 1
)

if "%DB_PASSWORD%"=="" (
  "%MYSQL%" --protocol=TCP --ssl=0 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" --database="%DB_NAME%" --execute="SHOW TABLES;"
) else (
  "%MYSQL%" --protocol=TCP --ssl=0 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" "--password=%DB_PASSWORD%" --database="%DB_NAME%" --execute="SHOW TABLES;"
)
if errorlevel 1 (
  echo.
  echo Schema import finished, but database verification failed.
  exit /b 1
)

if exist "%~dp0backend\scripts\migrate-db.js" (
  echo.
  echo Applying safe schema migrations...
  pushd "%~dp0backend" || exit /b 1
  node ".\scripts\migrate-db.js"
  if errorlevel 1 set "MIGRATE_FAILED=1"
  popd
  if defined MIGRATE_FAILED (
    echo Database migration failed.
    exit /b 1
  )
)

echo Database schema imported successfully.
exit /b 0

:FindPortProcess
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%DB_PORT% .*LISTENING"') do if not defined PORT_PID set "PORT_PID=%%P"
exit /b 0

:CanConnect
if "%DB_PASSWORD%"=="" (
  "%MYSQL%" --protocol=TCP --ssl=0 --connect-timeout=2 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" --batch --skip-column-names --execute="SELECT 1;" >nul 2>nul
) else (
  "%MYSQL%" --protocol=TCP --ssl=0 --connect-timeout=2 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" "--password=%DB_PASSWORD%" --batch --skip-column-names --execute="SELECT 1;" >nul 2>nul
)
exit /b %ERRORLEVEL%
