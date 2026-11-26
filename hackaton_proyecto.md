**Equipo:** 404  
**Integrantes:**
* García Villatoro Edwin Gael
* Gómez Valencia Santiago
* Sintora Benitez Sonny M. Lee

**Institución:** Universidad del Valle de México (UVM)  
**Campus:** Coyoacán  

---

## 1. Resumen ejecutivo

**AccesIA** es una aplicación móvil desarrollada en Android Studio diseñada como un asistente digital inclusivo que facilita el acceso a información y servicios esenciales para todas las personas. Dirigida a comunidades indígenas, personas con discapacidad visual severa y adultos mayores, la app integra inteligencia artificial (**Gemini**) y herramientas de accesibilidad desde el primer uso. Mediante traducción entre español y lenguas indígenas, lectura en voz alta, navegación y dictado por voz, y una interfaz simplificada ajustable, **AccesIA** elimina barreras lingüísticas, visuales y tecnológicas para guiar paso a paso en trámites, salud, educación, empleo y apoyos gubernamentales.

---

## 2. Boceto y concepto

### El problema
Existe una marcada desigualdad en el acceso a la información y a los servicios públicos que afecta gravemente a sectores en situación de vulnerabilidad o desventaja social. Las comunidades indígenas, las personas con discapacidad visual severa y los adultos mayores enfrentan serios obstáculos al intentar realizar trámites, acceder a servicios de salud, solicitar apoyos gubernamentales o consultar oportunidades educativas y laborales. Esto ocurre porque la información institucional suele presentarse en un lenguaje complejo, en formatos poco accesibles o exclusivamente en español, ampliando la brecha de desigualdad e impidiendo el pleno ejercicio de sus derechos.

### Propuesta de solución
Desarrollar **AccesIA**, una aplicación móvil accesible e intuitiva que adapta su experiencia desde el primer momento según las necesidades del usuario. Organizada mediante categorías visuales claras y respaldada por un asistente conversacional con IA, la aplicación guía de manera sencilla y paso a paso a cada persona en la realización de trámites y consultas de interés público.

### Alineación con los Objetivos de Desarrollo Sostenible (ODS)
* **ODS 10 (Reducción de las desigualdades):** Contribuye directamente a disminuir las brechas de acceso mediante una herramienta tecnológica inclusiva que permite a personas de distintos contextos sociales, culturales y físicos acceder a información, servicios y oportunidades en condiciones equitativas, garantizando el ejercicio de sus derechos.
* **ODS 11 (Ciudades y comunidades sostenibles):** Fomenta comunidades más inclusivas, participativas y sostenibles al integrar activamente a las comunidades indígenas en el acceso a los trámites y servicios urbanos y públicos, derribando las barreras lingüísticas que históricamente las han excluido de la vida institucional.

---

## 3. Documentación funcional

De acuerdo con el diseño conceptual de la aplicación, **AccesIA** cuenta con cuatro módulos principales:

1. **Configuración inicial y personalización:** Al abrir la app por primera vez, adapta la interfaz mediante dos preguntas clave:
   * *Selección de lengua nativa:* Permite elegir entre Español, Náhuatl, Maya (Yucateco), Mixteco, Zapoteco, Otomí, Totonaco, Huichol u Otra.
   * *Detección de discapacidad visual severa:* Incluye botones rápidos de **Sí** y **No** para activar automáticamente la asistencia auditiva y lectura en pantalla antes de continuar.
2. **Pantalla principal (Inicio) y categorías de servicio:** Organiza la información en seis tarjetas temáticas con íconos y colores diferenciados (**Trámites**, **Servicios de salud**, **Educación**, **Empleo y oportunidades**, **Apoyos gubernamentales** e **Información general**), además de un botón de acceso directo para **Hablar con el asistente IA** y una barra de navegación inferior (*Inicio*, *Asistente*, *Accesibilidad*).
3. **Asistente IA conversacional y guiado paso a paso:** Permite realizar consultas mediante voz o texto (por ejemplo, cómo tramitar la credencial del INE) y ofrece:
   * *Respuestas estructuradas y sencillas:* Divide los procedimientos en pasos numerados claros (ej. reunir documentos, agendar cita, acudir al módulo).
   * *Acompañamiento interactivo:* Proporciona botones de seguimiento rápido para ayudar al usuario a completar acciones (como *«Sí, agendemos»* o *«No, gracias»*).
4. **Panel de Accesibilidad e inclusión:** Concentra los interruptores y controles visuales para personalizar el uso en cualquier momento:
   * *Traducción de idioma:* Traducción bidireccional entre español y lenguas indígenas.
   * *Lectura en voz alta:* Reproduce la información en audio para guiar al usuario en cada paso.
   * *Navegación por voz:* Permite controlar toda la aplicación mediante comandos de voz.
   * *Dictado por voz:* Permite escribir consultas dictando con la voz.
   * *Interfaz simplificada:* Activa un diseño con botones grandes, textos claros y estructura simple.
   * *Tamaño del texto y contraste:* Controles dedicados para escalar el tamaño de letra (`A`) y ajustar el nivel de contraste visual.

---

## 4. Documentación técnica

### Arquitectura general
**AccesIA** es una aplicación móvil nativa para Android estructurada en una navegación de tres vistas principales (*Inicio*, *Asistente* y *Accesibilidad*) precedidas por un flujo de configuración inicial (*onboarding*). La interfaz de usuario se conecta con los servicios en la nube de **Google Gemini**, el cual actúa como capa intermediaria para procesar entradas multimodales (texto o voz), traducir lenguas indígenas, simplificar lenguaje institucional y devolver respuestas estructuradas en pantalla y audio.

### Stack tecnológico
* **Entorno de desarrollo / Frontend móvil:** Android Studio (Android nativo)
* **Inteligencia Artificial:** Google Gemini API
* **Servicios de Accesibilidad / Voz:** Reconocimiento de voz (Speech-to-Text) y síntesis de voz (Text-to-Speech) nativos de Android
* **Backend / Base de datos:** [PENDIENTE: Especificar si se utiliza almacenamiento local para preferencias de usuario o servicios en la nube como Firebase]

### Integración con Gemini
**Gemini** es el motor del **Asistente IA** y se integra en el flujo principal de conversación para desempeñar las siguientes tareas:
* **Interpretación de intención:** Comprende consultas cotidianas expresadas en lenguaje natural (ej. *"¿Cómo puedo sacar mi credencial de INE?"*).
* **Estructuración y simplificación:** Transforma procedimientos burocráticos complejos en listas numeradas con lenguaje claro y directo.
* **Traducción lingüística:** Facilita la comunicación bidireccional entre el español y las lenguas indígenas seleccionadas por el usuario.
* **Acompañamiento proactivo:** Genera sugerencias interactivas de seguimiento para asistir al usuario en el siguiente paso de su trámite.

---

## 5. Manual de usuario

Esta guía te ayudará a comenzar a utilizar **AccesIA** por primera vez de forma sencilla.

### Paso 1: Instalación y configuración inicial
1. Instala la aplicación **AccesIA** en tu teléfono Android y toca su ícono para abrirla.
2. En la pantalla de **Configuración inicial**, selecciona tu **lengua nativa** en la lista desplegable (puedes elegir Español, Náhuatl, Maya, Mixteco, Zapoteco, Otomí, Totonaco, Huichol u Otra).
3. Responde a la pregunta *"¿Usted tiene discapacidad visual severa?"* tocando el botón verde **Sí** (si necesitas que la aplicación te lea todo en voz alta) o el botón rojo **No**, y luego presiona **Continuar**.
4. Acepta los permisos de **micrófono** cuando el teléfono te los pida para poder hablar con la aplicación.

### Paso 2: Navegación en la pantalla de Inicio
1. En la pantalla principal (*"¿En qué te podemos ayudar hoy?"*), toca cualquiera de los seis cuadros de colores según lo que necesites consultar: **Trámites**, **Servicios de salud**, **Educación**, **Empleo y oportunidades**, **Apoyos gubernamentales** o **Información general**.
2. Si prefieres preguntar directamente, toca el botón morado **Hablar con el asistente IA** ubicado en la parte inferior.

### Paso 3: Usar el Asistente IA
1. Dentro de la sección **Asistente IA**, escribe tu duda en la barra inferior (*"Habla o escribe tu pregunta..."*) o toca el ícono del **micrófono** para dictarla con tu voz.
2. El asistente te responderá con una lista numerada fácil de entender. Si el asistente te ofrece ayuda adicional (por ejemplo, para agendar una cita), simplemente toca los botones de respuesta rápida en pantalla (como **Sí, agendemos**).

### Paso 4: Ajustar la accesibilidad
1. Toca el ícono de **Accesibilidad** en la barra inferior derecha en cualquier momento.
2. Activa o desactiva con un toque las funciones de **Traducción de idioma**, **Lectura en voz alta**, **Navegación por voz**, **Dictado por voz** o **Interfaz simplificada**.
3. En la parte inferior de esa pantalla, selecciona el **tamaño del texto** (`A`) y el nivel de **contraste** que te resulte más cómodo para leer.

---

## 6. Accesibilidad e impacto

### Diseño inclusivo y accesibilidad
**AccesIA** incorpora accesibilidad adaptativa desde el primer segundo de uso para eliminar barreras físicas, lingüísticas y digitales:
* **Personalización temprana:** El flujo inicial configura el idioma y la asistencia auditiva antes de mostrar contenido complejo.
* **Accesibilidad visual:** Combina lectura en voz alta paso a paso, navegación por comandos de voz, ajuste de tamaño de fuente y modos de alto contraste para personas con discapacidad visual severa o baja visión.
* **Accesibilidad lingüística:** Integra soporte dedicado para lenguas originarias de México (Náhuatl, Maya Yucateco, Mixteco, Zapoteco, Otomí, Totonaco, Huichol, entre otras).
* **Accesibilidad cognitiva y tecnológica:** Emplea tarjetas temáticas con colores diferenciados, botones de gran tamaño, dictado por voz y respuestas divididas en pasos cortos para adultos mayores.

### Impacto esperado
Con la implementación de **AccesIA**, el Equipo 404 busca demostrar que la inteligencia artificial puede ser un motor práctico de justicia social, logrando:
* Reducir la exclusión digital y administrativa de poblaciones vulnerables.
* Permitir que comunidades indígenas, personas con discapacidad visual y adultos mayores comprendan y gestionen trámites de identidad, salud, educación y apoyos sociales de manera autónoma.
* Fortalecer el ejercicio pleno de los derechos ciudadanos y construir comunidades más justas mediante el acceso equitativo a la información pública.
