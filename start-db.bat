@echo off
setlocal EnableExtensions

call "%~dp0db-env.bat"

set "MARIADB_HOME=%~dp0.mariadb"
set "BASE=%MARIADB_HOME%\mariadb-11.4.10-winx64"
set "DATA=%MARIADB_HOME%\data"
set "ZIP=%~dp0mariadb-11.4.10-winx64.zip"
set "MARIADBD=%BASE%\bin\mariadbd.exe"
set "INSTALLDB=%BASE%\bin\mariadb-install-db.exe"
if not exist "%INSTALLDB%" set "INSTALLDB=%BASE%\bin\mysql_install_db.exe"
set "MYSQL=%BASE%\bin\mariadb.exe"
if not exist "%MYSQL%" set "MYSQL=%BASE%\bin\mysql.exe"
set "LOG=%~dp0mariadb-server-%DB_PORT%.err.log"
set "PID_FILE=%DATA%\note-app-mariadb-%DB_PORT%.pid"

if not exist "%MARIADBD%" (
  if not exist "%ZIP%" (
    echo MariaDB server not found at "%MARIADBD%"
    echo Portable archive not found at "%ZIP%"
    exit /b 1
  )

  echo MariaDB portable files not found. Extracting "%ZIP%"...
  if not exist "%MARIADB_HOME%" mkdir "%MARIADB_HOME%"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%MARIADB_HOME%' -Force"
  if errorlevel 1 exit /b 1
)

if not exist "%MYSQL%" (
  echo MariaDB client not found at "%BASE%\bin".
  exit /b 1
)

if not exist "%DATA%\mysql" (
  if not exist "%INSTALLDB%" (
    echo MariaDB install tool not found at "%BASE%\bin".
    exit /b 1
  )

  echo MariaDB data directory is missing. Initializing "%DATA%"...
  if "%DB_PASSWORD%"=="" (
    "%INSTALLDB%" -d "%DATA%" -P %DB_PORT%
  ) else (
    "%INSTALLDB%" -d "%DATA%" -P %DB_PORT% -p"%DB_PASSWORD%"
  )
  if errorlevel 1 (
    echo Failed to initialize MariaDB data directory.
    exit /b 1
  )
)

call :FindPortProcess
if defined PORT_PID (
  call :ReadServerDataDir
  if not errorlevel 1 (
    call :IsProjectDataDir
    if not errorlevel 1 (
      echo MariaDB is already running on %DB_HOST%:%DB_PORT%.
      echo Data directory: %SERVER_DATADIR%
      echo User: %DB_USER%
      echo Password: %DB_PASSWORD_STATUS%
      exit /b 0
    )

    echo Port %DB_PORT% is already used by another MariaDB/MySQL instance.
    echo Listening PID: %PORT_PID%
    echo Detected data directory: %SERVER_DATADIR%
    echo Expected data directory: %DATA%
    echo Stop that process or change DB_PORT consistently in backend\.env.
    exit /b 1
  )

  echo Port %DB_PORT% is already in use, but it is not accepting this project's MariaDB credentials.
  echo Listening PID: %PORT_PID%
  echo If this is another process, stop it or change DB_PORT consistently in backend\.env.
  echo If this is this project's MariaDB, check DB_USER and DB_PASSWORD in backend\.env.
  exit /b 1
)

call :CanWriteDataDir
if errorlevel 1 (
  echo The portable MariaDB data directory is not writable:
  echo   %DATA%
  echo Close any old mysqld.exe or mariadbd.exe process that may be using this folder, then run .\start-db.bat again.
  echo Do not delete .mariadb. If a reset is necessary, rename .mariadb to .mariadb_old first.
  exit /b 1
)

echo Starting MariaDB on %DB_HOST%:%DB_PORT%...
echo Data directory: %DATA%
echo User: %DB_USER%
echo Password: %DB_PASSWORD_STATUS%
echo.

pushd "%DATA%" || exit /b 1
start "Note App MariaDB %DB_PORT%" /B "%MARIADBD%" --no-defaults --basedir="%BASE%" --datadir="%DATA%" --port=%DB_PORT% --bind-address=%DB_HOST% --ssl=OFF --pid-file="%PID_FILE%" --log-error="%LOG%"
popd

for /l %%I in (1,1,30) do (
  call :CanConnect
  if not errorlevel 1 goto Started
  ping -n 2 127.0.0.1 >nul
)

call :FindPortProcess
if defined PORT_PID (
  echo MariaDB started on port %DB_PORT%, but the configured login failed.
  echo Check DB_USER and DB_PASSWORD in backend\.env.
) else (
  echo MariaDB did not start on %DB_HOST%:%DB_PORT%.
)
findstr /I /C:"Permission denied" "%LOG%" >nul 2>nul
if not errorlevel 1 (
  echo MariaDB reported a permission error while opening the data directory.
  echo Close any old mysqld.exe or mariadbd.exe process that may be using .mariadb\data.
)
echo Log file: %LOG%
exit /b 1

:Started
echo MariaDB started successfully on %DB_HOST%:%DB_PORT%.
echo Log file: %LOG%
echo Keep this window open while developing.
echo Use .\stop-db.bat from another terminal to stop the database.
echo.

:KeepAlive
ping -n 6 127.0.0.1 >nul
call :FindPortProcess
if defined PORT_PID goto KeepAlive
echo MariaDB is no longer listening on %DB_HOST%:%DB_PORT%.
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

:CanWriteDataDir
set "PROJECT_DATADIR=%DATA%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir=$env:PROJECT_DATADIR; try { $p=Join-Path $dir ('note-app-write-test-' + [guid]::NewGuid().ToString() + '.tmp'); [IO.File]::WriteAllText($p, 'test'); Remove-Item -LiteralPath $p -Force; exit 0 } catch { exit 1 }" >nul 2>nul
exit /b %ERRORLEVEL%

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
