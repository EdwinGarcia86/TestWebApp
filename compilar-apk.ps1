$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$web = Join-Path (Split-Path -Parent $raiz) 'AccesIA-Web'
$javaHome = 'C:\Users\santi\AppData\Local\Programs\Microsoft\jdk-17.0.10.7-hotspot'
$sdk = 'C:\Users\santi\AppData\Local\Android\Sdk'
$buildTools = Join-Path $sdk 'build-tools\35.0.0'
$androidJar = Join-Path $sdk 'platforms\android-35\android.jar'

$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

$aapt2 = Join-Path $buildTools 'aapt2.exe'
$d8 = Join-Path $buildTools 'd8.bat'
$zipalign = Join-Path $buildTools 'zipalign.exe'
$apksigner = Join-Path $buildTools 'apksigner.bat'
$keytool = Join-Path $javaHome 'bin\keytool.exe'
$javac = Join-Path $javaHome 'bin\javac.exe'
$jar = Join-Path $javaHome 'bin\jar.exe'
$pass = 'accesia2026'

function Check-Last($paso) {
  if ($LASTEXITCODE -ne 0) { throw "$paso falló (código $LASTEXITCODE)" }
}

# La APK usa la IP real de la laptop, que está en la misma Wi-Fi.
$ip = $null
for ($i = 0; $i -lt 30 -and -not $ip; $i++) {
  $ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) { Start-Sleep -Seconds 1 }
}
if (-not $ip) { throw 'No se encontró IP de red local.' }
Write-Host "IP de la laptop: $ip"

$javaPath = Join-Path $raiz 'app\src\main\java\com\equipo404\accesia\movil\MainActivity.java'
$xmlPath = Join-Path $raiz 'app\src\main\res\xml\network_security_config.xml'
$java = Get-Content -Raw $javaPath
$java = [regex]::Replace($java, 'https://\d{1,3}(?:\.\d{1,3}){3}:3000/', "https://$($ip):3000/")
[System.IO.File]::WriteAllText($javaPath, $java, [System.Text.UTF8Encoding]::new($false))
$xml = Get-Content -Raw $xmlPath
$xml = [regex]::Replace($xml, '<domain[^>]*>[^<]+</domain>', "<domain includeSubdomains=`"false`">$ip</domain>")
[System.IO.File]::WriteAllText($xmlPath, $xml, [System.Text.UTF8Encoding]::new($false))

# Certificado HTTPS confiable para Android.
$pfx = Join-Path $web 'certificado-movil.pfx'
$crt = Join-Path $web 'certificado-movil.crt'
$rawDir = Join-Path $raiz 'app\src\main\res\raw'
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
Remove-Item $pfx, $crt -Force -ErrorAction SilentlyContinue
& $keytool -genkeypair -alias accesia -keyalg RSA -keysize 2048 -validity 3650 `
  -keystore $pfx -storetype PKCS12 -storepass $pass -keypass $pass `
  -dname 'CN=AccesIA Local, OU=AccesIA, O=Equipo404, L=MX, ST=MX, C=MX' `
  -ext "SAN=dns:localhost,ip:127.0.0.1,ip:$ip" | Out-Null
& $keytool -exportcert -alias accesia -keystore $pfx -storetype PKCS12 `
  -storepass $pass -file $crt -rfc | Out-Null
Copy-Item $crt (Join-Path $rawDir 'accesia_movil.crt') -Force

$build = Join-Path $raiz 'build-directo'
Remove-Item $build -Recurse -Force -ErrorAction SilentlyContinue
$gen = Join-Path $build 'gen'
$classes = Join-Path $build 'classes'
$dex = Join-Path $build 'dex'
foreach ($dir in @($gen, $classes, $dex)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

$resFlat = Join-Path $build 'res.flata'
$baseApk = Join-Path $build 'base.apk'
$aligned = Join-Path $build 'aligned.apk'
$manifest = Join-Path $raiz 'app\src\main\AndroidManifest.xml'
$resDir = Join-Path $raiz 'app\src\main\res'
$mainJava = Join-Path $raiz 'app\src\main\java\com\equipo404\accesia\movil\MainActivity.java'
$rJava = Join-Path $gen 'com\equipo404\accesia\movil\R.java'

Write-Host 'Compilando recursos...'
& $aapt2 compile --dir $resDir -o $resFlat
Check-Last 'aapt2 compile'
& $aapt2 link -o $baseApk -I $androidJar --manifest $manifest -R $resFlat `
  --auto-add-overlay --java $gen --min-sdk-version 24 --target-sdk-version 35
Check-Last 'aapt2 link'

Write-Host 'Compilando Java...'
& $javac -source 17 -target 17 -cp $androidJar -d $classes $rJava $mainJava
Check-Last 'javac'

Write-Host 'Generando DEX...'
$classesJar = Join-Path $build 'classes.jar'
& $jar cf $classesJar -C $classes .
Check-Last 'jar classes'
& $d8 --lib $androidJar --output $dex $classesJar
Check-Last 'd8'
& $jar uf $baseApk -C $dex 'classes.dex'
Check-Last 'jar dex'

Write-Host 'Alineando y firmando...'
& $zipalign -f 4 $baseApk $aligned
Check-Last 'zipalign'

$debugKey = Join-Path $raiz 'debug.jks'
if (-not (Test-Path $debugKey)) {
  & $keytool -genkeypair -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 `
    -keystore $debugKey -storepass android -keypass android `
    -dname 'CN=Android Debug, O=Android, C=US' | Out-Null
}

$apk = Join-Path $raiz 'AccesIA-Movil.apk'
Remove-Item $apk -Force -ErrorAction SilentlyContinue
& $apksigner sign --ks $debugKey --ks-pass pass:android --key-pass pass:android `
  --out $apk $aligned
Check-Last 'apksigner sign'
& $apksigner verify $apk
Check-Last 'apksigner verify'

& (Join-Path $raiz 'generar-qr.ps1')

Write-Host "APK listo: $apk"
Write-Host "URL dentro de la APK: https://$($ip):3000/"
