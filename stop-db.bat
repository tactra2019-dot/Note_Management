@echo off
setlocal EnableExtensions

call "%~dp0db-env.bat"

set "BASE=%~dp0.mariadb\mariadb-11.4.10-winx64"
set "DATA=%~dp0.mariadb\data"
set "MYSQLADMIN=%BASE%\bin\mariadb-admin.exe"
if not exist "%MYSQLADMIN%" set "MYSQLADMIN=%BASE%\bin\mysqladmin.exe"
set "MYSQL=%BASE%\bin\mariadb.exe"
if not exist "%MYSQL%" set "MYSQL=%BASE%\bin\mysql.exe"

if not exist "%MYSQLADMIN%" (
  echo MariaDB admin client not found at "%BASE%\bin".
  exit /b 1
)

if not exist "%MYSQL%" (
  echo MariaDB client not found at "%BASE%\bin".
  exit /b 1
)

call :FindPortProcess
if not defined PORT_PID (
  echo MariaDB is not running on %DB_HOST%:%DB_PORT%.
  exit /b 0
)

call :ReadServerDataDir
if errorlevel 1 (
  echo A process is listening on %DB_HOST%:%DB_PORT%, but it did not accept this project's MariaDB credentials.
  echo Listening PID: %PORT_PID%
  echo stop-db.bat will not shut it down because it cannot verify the portable .mariadb data directory.
  echo Check DB_USER and DB_PASSWORD in backend\.env.
  exit /b 1
)

call :IsProjectDataDir
if errorlevel 1 (
  echo Refusing to stop the process on port %DB_PORT% because it is not using this project's portable data directory.
  echo Listening PID: %PORT_PID%
  echo Detected data directory: %SERVER_DATADIR%
  echo Expected data directory: %DATA%
  exit /b 1
)

echo Stopping portable MariaDB on %DB_HOST%:%DB_PORT%...
if "%DB_PASSWORD%"=="" (
  "%MYSQLADMIN%" --protocol=TCP --ssl=0 --connect-timeout=2 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" shutdown
) else (
  "%MYSQLADMIN%" --protocol=TCP --ssl=0 --connect-timeout=2 -h "%DB_HOST%" -P %DB_PORT% --user="%DB_USER%" "--password=%DB_PASSWORD%" shutdown
)

if errorlevel 1 (
  echo.
  echo Stop failed. Check DB_USER and DB_PASSWORD in backend\.env.
  echo Current password status: %DB_PASSWORD_STATUS%
  exit /b 1
)

for /l %%I in (1,1,15) do (
  call :FindPortProcess
  if not defined PORT_PID goto Stopped
  ping -n 2 127.0.0.1 >nul
)

echo Shutdown was sent, but port %DB_PORT% is still listening.
exit /b 1

:Stopped
echo Portable MariaDB stopped.
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
