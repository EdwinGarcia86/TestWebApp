$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = 'C:\Users\santi\AppData\Local\Programs\node-v22.14.0-win-x64\node.exe'

$ip = $null
for ($i = 0; $i -lt 30 -and -not $ip; $i++) {
  $ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) { Start-Sleep -Seconds 1 }
}
if (-not $ip) { throw 'No se encontró IP de red local.' }

$url = "http://$($ip):3001/"
$json = & $node (Join-Path $raiz 'generar-qr.js') $url
$datos = $json | ConvertFrom-Json

$salida = Join-Path $raiz 'qr-descarga-apk.png'
$txt = Join-Path $raiz 'url-descarga.txt'
[System.IO.File]::WriteAllText($txt, $url, [System.Text.UTF8Encoding]::new($false))

Add-Type -AssemblyName System.Drawing

$modulos = [int]$datos.size
$silencio = 4
$escala = [math]::Max(4, [math]::Floor(640 / ($modulos + 2 * $silencio)))
$px = ($modulos + 2 * $silencio) * $escala

$bmp = New-Object System.Drawing.Bitmap($px, $px)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$brocha = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(23, 12, 38))

for ($f = 0; $f -lt $modulos; $f++) {
  for ($c = 0; $c -lt $modulos; $c++) {
    if ($datos.modules[$f][$c]) {
      $x = ($c + $silencio) * $escala
      $y = ($f + $silencio) * $escala
      $g.FillRectangle($brocha, $x, $y, $escala, $escala)
    }
  }
}

$bmp.Save($salida, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$brocha.Dispose()
$bmp.Dispose()

Write-Host "QR: $salida"
Write-Host "URL: $url"
