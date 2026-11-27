$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path

& (Join-Path $raiz 'compilar-apk.ps1')
if (-not $?) { throw 'La compilación de la APK falló.' }

& (Join-Path $raiz 'reiniciar-servidores.bat')
if (-not $?) { throw 'No se pudieron reiniciar los servidores.' }

$url = Get-Content -Raw (Join-Path $raiz 'url-descarga.txt')
Write-Host "Listo. QR actualizado: $url"
