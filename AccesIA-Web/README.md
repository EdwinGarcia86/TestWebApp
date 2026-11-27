# AccesIA Web

Versión web local de AccesIA. Conserva el proyecto Android original en `../AccesIA` y usa el mismo archivo `local.properties` para leer la clave de Gemini.

## Iniciar

1. Doble clic en `iniciar.bat`.
2. Abre `http://localhost:3000` en tu navegador.
3. Si el puerto 3000 está ocupado, puedes usar otro puerto:

```bat
set PORT=3001
iniciar.bat
```

No necesitas `npm install`: el servidor usa solamente módulos incluidos en Node.js.

Por seguridad, el servidor escucha solo en `127.0.0.1`. No lo expongas a internet ni a otros equipos; la clave de Gemini queda en el servidor.

## Dónde está la clave

El navegador **nunca recibe la API key**. El servidor la lee desde:

```text
..\AccesIA\local.properties
```

Ejemplo de contenido:

```properties
GEMINI_API_KEY=TU_CLAVE
GEMINI_MODEL=gemini-3.5-flash
sdk.dir=C\:\\Users\\santi\\AppData\\Local\\Android\\Sdk
```

Opcional: `GEMINI_GROUNDING=true` activa búsqueda con fuentes oficiales. Solo conviene si el plan de Google AI tiene facturación; en el plan gratuito esa herramienta devuelve `429` y se desactiva automáticamente.

Si la clave está en otro archivo, puedes indicarlo con `ACCESIA_PROPERTIES`.

## Funciones

- Configuración inicial sin pedir credenciales.
- **Toda la interfaz cambia al idioma elegido**: menús, botones, etiquetas, mensajes y registro de actividad.
- Si eliges **Otra**, escribe el nombre del idioma y pulsa **Aplicar idioma**.
- Al responder **Sí** en “¿Tienes discapacidad visual severa?”, se abre directamente el asistente y el micrófono queda en escucha continua: vuelve a activarse solo después de cada respuesta sin volver a pedir permiso. Se libera al salir del asistente o al pulsar **Detener escucha**.
- Las traducciones de la interfaz se guardan en caché para no repetir llamadas.
- Inicio con categorías: trámites, salud, educación, empleo, apoyos gubernamentales e información general.
- Asistente IA con respuestas paso a paso.
- Traducción español ↔ lenguas indígenas con Gemini.
- Transcripción de audio y asistente por voz.
- Clasificación de comandos de voz: inicio, asistente, accesibilidad, traducir, leer y ayuda.
- Lectura en voz alta con el motor TTS del navegador.
- Controles de tamaño de texto, contraste y conmutadores de accesibilidad.
- Modo demostración: simula voz, comandos y traducción para exposiciones sin micrófono. Se activa en **Accesibilidad → Modo demostración**.
- Conversación continua: aviso sonoro al activar el micrófono, corte automático tras 1 segundo de silencio y reactivación cuando termina la respuesta hablada.
- Lectura completa: las respuestas largas se dividen en fragmentos y se leen hasta el final con voz más lenta en modo discapacidad visual; el micrófono ya no cancela la síntesis de voz.
- Exactitud: el asistente usa búsqueda con fuentes oficiales cuando el plan lo permite, temperatura 0 y reglas que prohíben inventar costos, plazos o teléfonos. Si la respuesta depende del estado o municipio, hace una pregunta de aclaración. Si se agota la cuota, usa respuestas locales de demostración.

El micrófono y la síntesis de voz funcionan en `localhost` o HTTPS. Si el navegador pide permiso para el micrófono, acéptalo.

## Uso desde el celular

La APK de `AccesIA-Movil` abre esta misma interfaz en la misma Wi‑Fi. Para iniciar el servidor en modo móvil:

```bat
..\AccesIA-Movil\iniciar-movil.bat
```

Ese modo usa HTTPS con el certificado generado por `AccesIA-Movil\preparar-movil.ps1`, por lo que el micrófono funciona desde el celular. La clave de Gemini sigue leyéndose solo de `AccesIA/local.properties`.

## Comprobación rápida

Con el servidor iniciado:

```bat
curl http://localhost:3000/api/health
```

La respuesta indica si la clave está configurada y qué modelo se usa, sin mostrar la clave.

## Estructura

```text
AccesIA-Web/
  iniciar.bat
  server.js
  README.md
  public/
    index.html
    styles.css
    app.js
```
