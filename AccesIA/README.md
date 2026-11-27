# AccesIA — aplicación Android (Android Studio)

Proyecto Kotlin + Jetpack Compose basado en `Propuesta.pdf` y `Boceto.pdf`.
Usa la **API key de Google AI Studio** (Gemini) para:

- Traducir entre español y lenguas indígenas.
- Reconocer/transcribir audio (dictado y preguntas habladas al asistente).
- Clasificar comandos de voz (navegación por voz).
- Generar respuestas paso a paso del asistente.
- Lectura en voz alta con el motor TTS del dispositivo.

## 1. Abrir en Android Studio

1. Android Studio → **Open** → selecciona la carpeta `AccesIA`.
2. Usa **JDK 17** (Gradle 8.7 + AGP 8.6.1 se descargan solos).
   En este equipo quedó instalado en
   `C:\Users\santi\AppData\Local\Programs\Microsoft\jdk-17.0.10.7-hotspot`
   y configurado en `JAVA_HOME`. Reinicia Android Studio para que lo detecte.
3. Espera a que sincronice Gradle.
4. Instala un dispositivo/emulador con **API 24 o superior**.
5. Ejecuta la configuración `app`.

## 2. Colocar la API key (solo en `local.properties`)

La aplicación **no muestra ni permite escribir la clave** en ninguna pantalla.
Se lee en tiempo de compilación desde `app/build.gradle.kts`.

1. Obtén la clave en <https://aistudio.google.com/app/apikey>.
2. Crea `AccesIA/local.properties` (este archivo está ignorado por Git):

```properties
sdk.dir=C\\:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
GEMINI_API_KEY=AIzaTU_CLAVE_AQUI
GEMINI_MODEL=gemini-3.5-flash-lite
```

3. Sincroniza Gradle y vuelve a compilar.

`app/build.gradle.kts` lee `local.properties` y genera `BuildConfig.GEMINI_API_KEY`
y `BuildConfig.GEMINI_MODEL`. El modelo por defecto es `gemini-3.5-flash-lite`
(multimodal, acepta audio y tiene capa gratuita); cámbialo con `GEMINI_MODEL`.

> Nota de seguridad: cualquier clave incluida en una app se puede extraer del APK.
> `local.properties` evita subirla al repositorio, pero para producción conviene
> usar un servidor intermediario que guarde la clave y haga las llamadas a Gemini.

## 3. Permisos

El manifiesto declara:

- `INTERNET` → llamadas a `generativelanguage.googleapis.com`.
- `RECORD_AUDIO` → grabación con `MediaRecorder` (formato M4A/AAC).

Android pedirá el permiso de micrófono la primera vez que grabes.

## 4. Estructura principal

```text
app/src/main/java/com/equipo404/accesia/
├── MainActivity.kt              # permisos, navegación inferior,Snackbar
├── AppViewModel.kt              # estado, chat, traducción, TTS
├── data/
│   ├── AppSettings.kt           # idioma y preferencias de accesibilidad
│   ├── SettingsRepository.kt    # SharedPreferences
│   └── GeminiRepository.kt      # REST generateContent + audio inline_data
├── audio/
│   ├── AudioRecorder.kt         # MediaRecorder → archivo .m4a
│   └── Speaker.kt               # TextToSpeech
└── ui/
    ├── Theme.kt                 # tema, contraste y escala de texto
    ├── SetupScreen.kt           # configuración inicial del boceto
    ├── HomeScreen.kt            # 6 tarjetas de servicios
    ├── AssistantScreen.kt       # chat, dictado y audio al asistente
    └── AccessibilityScreen.kt   # interruptores, traducción y ajustes
```

## 5. Notas

- La transcripción se hace enviando el audio a Gemini (`inline_data`), no con el
  reconocedor de voz del sistema. Las grabaciones se limitan a 60 s y se guardan
  temporalmente en `cacheDir`; se eliminan después de enviarlas.
- La traducción a lenguas indígenas depende de lo que conozca el modelo; puede no
  ser exacta. La interfaz lo indica.
- Si la API responde `403`, revisa que la clave tenga acceso al modelo en AI Studio.
- Si responde `429`, espera unos segundos: es el límite de la capa gratuita.
- No subas tu API key a un repositorio público.
