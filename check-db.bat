@echo off
setlocal EnableExtensions

call "%~dp0db-env.bat"

set "BASE=%~dp0.mariadb\mariadb-11.4.10-winx64"
set "DATA=%~dp0.mariadb\data"
set "MYSQL=%BASE%\bin\mariadb.exe"
if not exist "%MYSQL%" set "MYSQL=%BASE%\bin\mysql.exe"

if not exist "%MYSQL%" (
  echo MariaDB client not found at "%BASE%\bin".
  exit /b 1
)

call :FindPortProcess
if not defined PORT_PID (
  echo Database is not accepting connections on %DB_HOST%:%DB_PORT%.
  echo Run .\start-db.bat first.
  exit /b 1
)

call :ReadServerDataDir
if errorlevel 1 (
  echo Port %DB_PORT% is listening, but MariaDB did not accept the credentials from backend\.env.
  echo Listening PID: %PORT_PID%
  echo Check DB_USER and DB_PASSWORD in backend\.env.
  exit /b 1
)

call :IsProjectDataDir
if errorlevel 1 (
  echo Port %DB_PORT% is used by a MariaDB/MySQL instance, but not this project's portable database.
  echo Listening PID: %PORT_PID%
  echo Detected data directory: %SERVER_DATADIR%
  echo Expected data directory: %DATA%
  exit /b 1
)

echo Database is accepting connections on %DB_HOST%:%DB_PORT%.
echo Data directory: %SERVER_DATADIR%
echo Database: %DB_NAME%
echo User: %DB_USER%
echo Password: %DB_PASSWORD_STATUS%
exit /b 0

:FindPortProcess
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%DB_PORT% .*LISTENING"') do if not defined PORT_PID set "PORT_PID=%%P"
exit /b 0

:ReadServerDataDir
set "SERVER_DATADIR="
set "DATADIR_FILE=%TEMP%\note-app-mariadb-datadir-%DB_PORT%-%RANDOM%.txt"
if "%DB_PASSWORD%"=="" (
  "%MYSQL%" --protocol=TCP --ssl=0 --connect-timeout=2 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" --batch --skip-column-names --execute="SELECT @@datadir;" > "%DATADIR_FILE%" 2>nul
) else (
  "%MYSQL%" --protocol=TCP --ssl=0 --connect-timeout=2 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" "--password=%DB_PASSWORD%" --batch --skip-column-names --execute="SELECT @@datadir;" > "%DATADIR_FILE%" 2>nul
)
if errorlevel 1 (
  if exist "%DATADIR_FILE%" del "%DATADIR_FILE%" >nul 2>nul
  exit /b 1
)
for /f "usebackq delims=" %%D in ("%DATADIR_FILE%") do if not defined SERVER_DATADIR set "SERVER_DATADIR=%%D"
if exist "%DATADIR_FILE%" del "%DATADIR_FILE%" >nul 2>nul
if defined SERVER_DATADIR exit /b 0
exit /b 1

:IsProjectDataDir
set "PROJECT_DATADIR=%DATA%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$server=$env:SERVER_DATADIR; $project=$env:PROJECT_DATADIR; if ([string]::IsNullOrWhiteSpace($server)) { exit 1 }; $a=([IO.Path]::GetFullPath($server) -replace '[\\/]+$',''); $b=([IO.Path]::GetFullPath($project) -replace '[\\/]+$',''); if ([string]::Equals($a, $b, [StringComparison]::OrdinalIgnoreCase)) { exit 0 } else { exit 1 }" >nul 2>nul
exit /b %ERRORLEVEL%
