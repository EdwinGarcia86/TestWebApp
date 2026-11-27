@echo off
setlocal
set "NODE=C:\Users\santi\AppData\Local\Programs\node-v22.14.0-win-x64\node.exe"
set "RAIZ=%~dp0"

for %%P in (3000 3001) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
    taskkill /PID %%I /F >nul 2>&1
  )
)

start "AccesIA APK" /B "%NODE%" "%RAIZ%servir-apk.js"

cd /d "%RAIZ%..\AccesIA-Web"
set "HOST=0.0.0.0"
set "PORT=3000"
set "MOVIL_HTTPS=true"
set "MOVIL_PFX=%RAIZ%..\AccesIA-Web\certificado-movil.pfx"
set "MOVIL_PFX_PASS=accesia2026"
start "AccesIA Web" /B "%NODE%" server.js

echo Servidores AccesIA reiniciados.
endlocal
