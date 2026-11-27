@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Este script debe ejecutarse como Administrador.
  echo Clic derecho en el archivo y elige "Ejecutar como administrador".
  pause
  exit /b 1
)

netsh advfirewall firewall delete rule name="AccesIA Web 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="AccesIA APK 3001" >nul 2>&1
netsh advfirewall firewall add rule name="AccesIA Web 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="AccesIA APK 3001" dir=in action=allow protocol=TCP localport=3001

echo Reglas de firewall agregadas.
pause
