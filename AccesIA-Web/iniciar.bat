@echo off
setlocal
cd /d "%~dp0"
set "NODE_CMD="
where node >nul 2>nul
if %errorlevel% equ 0 set "NODE_CMD=node"
if not defined NODE_CMD if exist "%LOCALAPPDATA%\Programs\node-v22.14.0-win-x64\node.exe" set "NODE_CMD=%LOCALAPPDATA%\Programs\node-v22.14.0-win-x64\node.exe"
if not defined NODE_CMD (
  echo No se encontro Node.js. Instala Node LTS o usa la copia portable en LOCALAPPDATA.
  pause
  exit /b 1
)
echo Iniciando AccesIA Web...
echo Abre http://localhost:3000 en tu navegador.
"%NODE_CMD%" server.js
if %errorlevel% neq 0 pause
