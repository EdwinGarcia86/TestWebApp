# AccesIA móvil (APK conectada a la laptop)

La APK abre la **misma AccesIA Web** en un WebView. No redibuja la interfaz: conserva el diseño del boceto (morado Material 3, tarjetas, categorías de colores y navegación inferior).

La clave de Gemini sigue en `AccesIA/local.properties` de la laptop. **No está en la APK.**

## Estado actual

- APK: `AccesIA-Movil.apk` (compilada y firmada).
- QR de descarga: `qr-descarga-apk.png`.
- URL del QR: `http://192.168.43.120:3001/` (abre una página con el botón Descargar APK).
- URL dentro de la APK: `https://192.168.43.120:3000/`.
- Servidor móvil: `iniciar-movil.bat` inicia el HTTPS en `0.0.0.0:3000` y la descarga del APK en `0.0.0.0:3001`.
- La laptop y el celular deben estar en la **misma red**. Si la Wi‑Fi del campus (`UVM_Academia`) aísla a los dispositivos, usa el hotspot del celular.

## Instalar

1. Copia `AccesIA-Movil.apk` al celular e instálala.
2. En la laptop ejecuta `iniciar-movil.bat`.
3. Conecta el celular a la misma red de la laptop y abre AccesIA.
4. Acepta el permiso de micrófono.

Si el celular no abre la página del QR, ejecuta una sola vez `permitir-firewall.bat` como Administrador en la laptop. Eso abre los puertos 3000 y 3001 en el firewall de Windows.

## Error `net::ERR_ADDRESS_UNREACHABLE`

Significa que el celular no puede alcanzar la IP de la laptop. En `UVM_Academia` esto ocurre porque la Wi‑Fi del campus suele aislar a los dispositivos entre sí.

Solución recomendada:

1. En el celular, activa **Hotspot móvil / Compartir internet**.
2. Conecta la Wi‑Fi de la laptop a ese hotspot.
3. En la laptop ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\preparar-movil.ps1
```

4. Reinicia `iniciar-movil.bat`.
5. Instala la nueva `AccesIA-Movil.apk` y escanea el nuevo `qr-descarga-apk.png`.

El hotspot cambia la IP de la laptop; por eso hay que recompilar y reinstalar la APK.

## Si cambia la IP de la laptop

Ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\preparar-movil.ps1
```

Ese único script detecta la nueva IP, regenera el certificado HTTPS, actualiza la URL dentro de la APK, recompila, genera el QR y reinicia ambos servidores. Después solo reinstala la APK y escanea el nuevo QR.

La compilación es directa con `aapt2`, `javac`, `d8`, `zipalign` y `apksigner`; no depende de Gradle ni de internet.
