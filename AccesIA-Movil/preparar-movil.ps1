$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path

& (Join-Path $raiz 'compilar-apk.ps1')
if (-not $?) { throw 'La compilación de la APK falló.' }

$url = Get-Content -Raw (Join-Path $raiz 'url-descarga.txt')
Write-Host "Listo. APK y QR actualizados: $url"
Write-Host 'Los servidores en 3000, 3001 y 3002 deben mantenerse iniciados por separado.'
