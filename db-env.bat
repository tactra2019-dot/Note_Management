@echo off

set "PROJECT_ROOT=%~dp0"
set "ENV_FILE=%PROJECT_ROOT%backend\.env"

set "DB_HOST=127.0.0.1"
set "DB_PORT=3307"
set "DB_USER=root"
set "DB_PASSWORD="
set "DB_NAME=note_app"

if exist "%ENV_FILE%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    if /i "%%A"=="DB_HOST" set "DB_HOST=%%B"
    if /i "%%A"=="DB_PORT" set "DB_PORT=%%B"
    if /i "%%A"=="DB_USER" set "DB_USER=%%B"
    if /i "%%A"=="DB_PASSWORD" set "DB_PASSWORD=%%B"
    if /i "%%A"=="DB_NAME" set "DB_NAME=%%B"
  )
)

if "%DB_PASSWORD%"=="" (
  set "DB_PASSWORD_STATUS=empty"
) else (
  set "DB_PASSWORD_STATUS=set"
)
