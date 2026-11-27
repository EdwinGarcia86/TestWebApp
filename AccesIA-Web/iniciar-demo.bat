@echo off
setlocal
set "NODE=C:\Users\santi\AppData\Local\Programs\node-v22.14.0-win-x64\node.exe"
cd /d "%~dp0"
set "PORT=3002"
set "HOST=127.0.0.1"
set "MOVIL_HTTPS="
set "MOVIL_PFX="
set "MOVIL_PFX_PASS="
start "AccesIA Demo" /B "%NODE%" server.js
echo Demo AccesIA en http://localhost:3002/
endlocal
