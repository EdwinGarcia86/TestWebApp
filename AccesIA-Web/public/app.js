'use strict';

const LANGUAGES = ['Español', 'Náhuatl', 'Maya (Yucateco)', 'Mixteco', 'Zapoteco', 'Otomí', 'Totonaco', 'Huichol', 'Otra'];
const PREFS_KEY = 'accesiaWebPrefs';
const UI_CACHE_PREFIX = 'accesiaUi_';
const SILENCE_MS = 3000;

const SPEECH_LANGS = {
  'Español': 'es-MX',
  'Náhuatl': 'nah-MX',
  'Maya (Yucateco)': 'yua-MX',
  'Mixteco': 'mix-MX',
  'Zapoteco': 'zap-MX',
  'Otomí': 'otm-MX',
  'Totonaco': 'tos-MX',
  'Huichol': 'hux-MX'
};

const ACTION_NAMES = {
  translate: 'Traducción',
  assistant: 'Asistente',
  transcribe: 'Transcripción',
  'audio-assistant': 'Asistente por audio',
  command: 'Comando de voz'
};

// Textos que no siempre están en el DOM inicial (mensajes, badges, errores, etc.).
const EXTRA_SOURCE_STRINGS = [
  'AccesIA · App web accesible',
  'Conectando…',
  'Gemini listo',
  'Falta la API key en local.properties',
  'No se pudo conectar con el servidor',
  'Aplicando idioma…',
  'Traduciendo interfaz…',
  'Interfaz traducida',
  'No se pudo traducir la interfaz',
  'Idioma seleccionado',
  'Servidor verificado',
  'Error de conexión',
  'Listo',
  'La app web está cargada.',
  'Registro limpiado',
  'OK',
  'Traducción',
  'Asistente',
  'Transcripción',
  'Asistente por audio',
  'Comando de voz',
  'Dictado completado',
  'Comando interpretado',
  'Audio grabado',
  'Grabando audio',
  'Micrófono no disponible',
  'Error en audio',
  'Configuración guardada',
  'Conversación borrada',
  'Tú',
  'Asistente IA',
  '🎤 Audio enviado',
  'Pensando…',
  'Escuchando…',
  'Sí, continuar',
  'No, gracias',
  'Resultado',
  'Nombre del idioma',
  'Escribe el nombre de tu idioma',
  'Aplicar idioma',
  'Escribe el nombre de tu idioma antes de continuar.',
  'Micrófono activo. Habla cuando quieras.',
  '■ Detener escucha',
  'Escucha continua activada',
  'Escucha continua desactivada',
  'No se pudo activar el micrófono automáticamente. Toca el botón para intentar de nuevo.',
  'Modo demostración',
  'Simula la voz para exponer sin micrófono',
  '▶ Simular voz',
  '▶ Simular comando',
  '▶ Simular traducción',
  'Voz simulada',
  'Dictado simulado',
  'Comando simulado',
  'Demo terminada',
  'Micrófono activado',
  'Silencio detectado',
  'Detección de silencio no disponible',
  'Sin cuota de IA · respuestas demo',
  'Sin cuota de IA',
  'La IA está sin cuota. No pude escuchar tu audio; estoy usando información de demostración.'
];

const defaultPrefs = {
  language: 'Español',
  customLanguage: '',
  lowVision: false,
  toggles: {
    translation: true,
    readAloud: true,
    voiceNav: true,
    dictation: true,
    simplified: false,
    demo: false
  },
  scale: 1,
  contrast: 0,
  setupDone: false
};

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return {
      ...defaultPrefs,
      ...saved,
      toggles: { ...defaultPrefs.toggles, ...(saved.toggles || {}) }
    };
  } catch {
    return { ...defaultPrefs, toggles: { ...defaultPrefs.toggles } };
  }
}

const state = {
  ...loadPrefs(),
  screen: loadPrefs().setupDone ? 'home' : 'setup',
  messages: [],
  draft: '',
  busy: false,
  recording: false,
  recordKind: '',
  recorder: null,
  stream: null,
  translateInput: '',
  translateFrom: 'Español',
  translateTo: 'Náhuatl',
  translated: '',
  busyTranslate: false,
  model: '...',
  error: '',
  translatingLang: '',
  continuousVoice: false,
  collectingSources: false,
  sourceStrings: [],
  demoIndex: 0,
  silenceWatcher: null,
  quotaFallback: false
};

const DEMO_QUESTIONS = [
  '¿Cómo puedo tramitar una credencial?',
  '¿Qué apoyos gubernamentales existen?',
  'Dame tres pasos para usar el simulador'
];
const DEMO_DICTATION = 'Necesito ayuda con un trámite';
const DEMO_TRANSLATION = 'Buenos días, ¿cómo estás?';
const DEMO_COMMANDS = ['INICIO', 'ASISTENTE', 'ACCESIBILIDAD', 'TRADUCIR', 'LEER', 'AYUDA'];

let UI_DICT = {};

const screenEl = document.getElementById('screen');
const tabsEl = document.getElementById('tabs');
const logEl = document.getElementById('log');
const badgeEl = document.getElementById('connectionBadge');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const t = text => UI_DICT[text] || text;

const normalizeLanguage = language => String(language || '').trim().toLocaleLowerCase();

const isSourceLanguage = language => ['español', 'espanol', 'spanish'].includes(normalizeLanguage(language));

function speechLanguage(language = state.language) {
  return SPEECH_LANGS[language] || 'es-MX';
}

function savePrefs() {
  const { language, customLanguage, lowVision, toggles, scale, contrast, setupDone } = state;
  localStorage.setItem(PREFS_KEY, JSON.stringify({ language, customLanguage, lowVision, toggles, scale, contrast, setupDone }));
}

function setBadge(text, isError = false) {
  badgeEl.textContent = text;
  badgeEl.classList.toggle('error', isError);
}

function applyTheme() {
  document.body.className = `scale-${state.scale} contrast-${['normal', 'high', 'max'][state.contrast]}`;
}

function log(title, payload) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  const time = new Date().toLocaleTimeString('es-MX', { hour12: false });
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  entry.innerHTML = `<div class="log-title"><span data-no-translate>${esc(time)}</span> · <span>${esc(t(title))}</span></div><pre data-no-translate>${esc(text)}</pre>`;
  logEl.prepend(entry);
  while (logEl.children.length > 40) logEl.lastChild.remove();
  translateDom();
}

function opts(selected) {
  return LANGUAGES.map(language =>
    `<option data-no-translate value="${esc(language)}" ${language === selected ? 'selected' : ''}>${esc(language)}</option>`
  ).join('');
}

/* ---------- Traducción de la interfaz ---------- */

function collectVisibleStrings(target) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, [data-no-translate]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) {
    const value = walker.currentNode.nodeValue.trim();
    if (value) target.add(value);
  }

  document.querySelectorAll('[title], [aria-label], [placeholder]').forEach(element => {
    if (element.closest('[data-no-translate]')) return;
    for (const attribute of ['title', 'aria-label', 'placeholder']) {
      const value = element.getAttribute(attribute);
      if (value && value.trim()) target.add(value.trim());
    }
  });
}

function collectAllSources() {
  const previousScreen = state.screen;
  const previousDictionary = UI_DICT;
  state.collectingSources = true;
  UI_DICT = {};
  const sources = new Set(EXTRA_SOURCE_STRINGS);

  for (const route of ['setup', 'home', 'assistant', 'accessibility']) {
    state.screen = route;
    render();
    collectVisibleStrings(sources);
  }

  state.screen = previousScreen;
  state.collectingSources = false;
  UI_DICT = previousDictionary;
  render();
  state.sourceStrings = [...sources];
  return state.sourceStrings;
}

function translateDom() {
  if (state.collectingSources) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, [data-no-translate]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const original = node.nodeValue.trim();
    if (UI_DICT[original]) {
      node.nodeValue = node.nodeValue.replace(original, UI_DICT[original]);
    }
  }

  document.querySelectorAll('[title], [aria-label], [placeholder]').forEach(element => {
    if (element.closest('[data-no-translate]')) return;
    for (const attribute of ['title', 'aria-label', 'placeholder']) {
      const value = element.getAttribute(attribute);
      if (value && UI_DICT[value.trim()]) {
        element.setAttribute(attribute, UI_DICT[value.trim()]);
      }
    }
  });

  document.title = t('AccesIA · App web accesible');
}

async function applyLanguage(language) {
  const target = String(language || '').trim();
  if (!target) return;

  state.language = target;
  if (!LANGUAGES.includes(target)) state.customLanguage = target;
  state.error = '';
  savePrefs();
  log('Idioma seleccionado', target);
  render();

  const sources = state.sourceStrings.length ? state.sourceStrings : collectAllSources();
  const normalized = normalizeLanguage(target);

  if (isSourceLanguage(target)) {
    UI_DICT = {};
    render();
    checkHealth();
    return;
  }

  const cacheKey = UI_CACHE_PREFIX + normalized;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      UI_DICT = JSON.parse(cached) || {};
    } catch {
      UI_DICT = {};
    }
    render();
    checkHealth();
    return;
  }

  if (state.translatingLang === normalized) return;
  state.translatingLang = normalized;
  setBadge(t('Traduciendo interfaz…'));
  log('Traduciendo interfaz…', target);

  try {
    const response = await fetch('/api/ui-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: target, strings: sources })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
    UI_DICT = data.translations || {};
    localStorage.setItem(cacheKey, JSON.stringify(UI_DICT));
    log('Interfaz traducida', target);
  } catch (error) {
    UI_DICT = {};
    log('No se pudo traducir la interfaz', error.message);
  } finally {
    state.translatingLang = '';
    render();
    checkHealth();
  }
}

/* ---------- Voz y API ---------- */

function splitSpeech(text) {
  const clean = String(text || '')
    .replace(/[*_`#]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?…\n]+[.!?…\n]?/g) || [clean];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    const part = sentence.trim();
    if (!part) continue;
    if (current && (current.length + part.length + 1) > 260) {
      chunks.push(current);
      current = part;
    } else {
      current = current ? `${current} ${part}` : part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function waitForVoices() {
  if (speechSynthesis.getVoices().length) return Promise.resolve(true);
  return new Promise(resolve => {
    let done = false;
    const finish = ok => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    speechSynthesis.onvoiceschanged = () => finish(speechSynthesis.getVoices().length > 0);
    window.setTimeout(() => finish(false), 1200);
  });
}

async function speak(text, language = state.language) {
  if (!state.toggles.readAloud || !('speechSynthesis' in window) || !text) return;
  if (!(await waitForVoices())) return;
  const chunks = splitSpeech(text);
  if (!chunks.length) return;

  return new Promise(resolve => {
    let index = 0;
    let finished = false;
    let timer = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      resolve();
    };
    const next = () => {
      if (finished) return;
      if (index >= chunks.length) { finish(); return; }
      const chunk = chunks[index++];
      if (timer) clearTimeout(timer);
      let advanced = false;
      const advance = () => {
        if (advanced || finished) return;
        advanced = true;
        if (timer) clearTimeout(timer);
        window.setTimeout(next, 150);
      };
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = speechLanguage(language);
      utterance.rate = state.lowVision ? 0.85 : 1;
      utterance.onend = advance;
      utterance.onerror = advance;
      speechSynthesis.speak(utterance);
      const words = chunk.split(/\s+/).filter(Boolean).length;
      const minutes = words / (state.lowVision ? 100 : 150);
      const limit = Math.min(180000, Math.max(15000, Math.ceil(minutes * 60000) + 8000));
      timer = window.setTimeout(() => {
        if (advanced || finished) return;
        // Solo si el navegador nunca avisó de fin: pasar al siguiente fragmento.
        try { speechSynthesis.cancel(); } catch { /* ignorar */ }
        advance();
      }, limit);
    };
    speechSynthesis.cancel();
    next();
  });
}

let audioCtx = null;

function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playMicSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1175].forEach((frequency, index) => {
      const offset = index * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });
  } catch {
    // El aviso sonoro es opcional.
  }
}

async function api(action, payload) {
  const label = ACTION_NAMES[action] || action;
  const safePayload = payload.audioBase64
    ? {
        action,
        mimeType: payload.mimeType,
        bytes: Math.round(payload.audioBase64.length * 3 / 4),
        language: payload.language
      }
    : { action, ...payload };
  log(label, safePayload);

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || `Error HTTP ${response.status}`;
    log(label, { estado: response.status, error: message });
    throw new Error(message);
  }
  const preview = data.text.length > 420 ? `${data.text.slice(0, 420)}…` : data.text;
  log(label, preview);
  if (data.demoFallback) {
    state.quotaFallback = true;
    log('Sin cuota de IA', t('La IA está sin cuota. No pude escuchar tu audio; estoy usando información de demostración.'));
    setBadge(t('Sin cuota de IA · respuestas demo'), true);
    render();
  }
  return data.text;
}

/* ---------- Pantallas ---------- */

function renderBrand(showSettings) {
  return `
  <div class="mobile-brand">
    <div class="logo" data-no-translate aria-hidden="true">A</div>
    <div>
      <h2 data-no-translate>AccesIA</h2>
      <p>Información y servicios para todas las personas</p>
    </div>
    ${showSettings
      ? `<button class="btn secondary slim" data-action="setup" title="Configuración" aria-label="Configuración">⚙</button>`
      : `<span class="star" data-no-translate aria-hidden="true">✦</span>`}
  </div>`;
}

function renderSetup() {
  const custom = !LANGUAGES.includes(state.language);
  return `
  ${renderBrand(false)}
  <section class="card intro">
    <h2>Configuración inicial</h2>
    <p class="hint">Te haremos unas preguntas para personalizar tu experiencia. No necesitas escribir claves: Gemini ya está configurado en el servidor.</p>
  </section>
  <section class="card">
    <label for="langSelect">¿Cuál es tu lengua nativa?</label>
    <select id="langSelect">${opts(custom ? 'Otra' : state.language)}</select>
    ${custom ? `
      <label for="customLanguage">Nombre del idioma</label>
      <input id="customLanguage" value="${esc(state.customLanguage)}" placeholder="Escribe el nombre de tu idioma">
      <button class="btn secondary slim" style="margin-top:8px" data-action="applyCustomLanguage">Aplicar idioma</button>
    ` : ''}
    <label>¿Tienes discapacidad visual severa?</label>
    <div class="row">
      <button class="btn ${state.lowVision ? 'green' : 'secondary'}" data-action="vision" data-value="yes">Sí</button>
      <button class="btn ${!state.lowVision ? 'red' : 'secondary'}" data-action="vision" data-value="no">No</button>
    </div>
    <button class="btn block" style="margin-top:18px" data-action="finishSetup">Continuar →</button>
  </section>`;
}

function renderHome() {
  const categories = [
    ['Trámites', '📄', 'tramites'],
    ['Servicios de salud', '♥', 'salud'],
    ['Educación', '🎓', 'edu'],
    ['Empleo y oportunidades', '💼', 'empleo'],
    ['Apoyos gubernamentales', '🏛️', 'apoyos'],
    ['Información general', 'ℹ️', 'info']
  ];
  return `
  ${renderBrand(true)}
  <section class="card intro">
    <h2>¿En qué te podemos ayudar hoy?</h2>
    <p class="hint">Elige una tarjeta o habla con el asistente. Puedes escribir o usar tu voz.</p>
  </section>
  <section class="grid">
    ${categories.map(([title, icon, css]) => `
      <button class="cat ${css}" data-action="category" data-value="${esc(title)}">
        <span class="ic" data-no-translate aria-hidden="true">${icon}</span><span>${esc(title)}</span>
      </button>`).join('')}
  </section>
  <section class="card" style="margin-top:16px">
    <button class="btn block" data-action="go" data-value="assistant">🎤 Hablar con el asistente IA</button>
  </section>`;
}

function renderAssistant() {
  const bubbles = state.messages.map(message => `
    <div class="bubble ${message.fromUser ? 'user' : ''}">
      <span class="who">${esc(t(message.fromUser ? 'Tú' : 'Asistente IA'))}</span><span data-no-translate>${esc(message.text)}</span>
    </div>`).join('');
  const last = state.messages[state.messages.length - 1];
  const followUps = (!state.busy && last && !last.fromUser && last.text.includes('?'))
    ? `<div class="row" style="margin:10px 0">
        <button class="btn secondary" data-action="send" data-value="Sí, continuar por favor">Sí, continuar</button>
        <button class="btn secondary" data-action="send" data-value="No, gracias">No, gracias</button>
       </div>`
    : '';
  return `
  <section class="card">
    <div class="row" style="align-items:center">
      <h2 style="margin:0;flex:1">✦ Asistente IA</h2>
      <button class="icon-btn" data-action="speakLast" title="Escuchar última respuesta" aria-label="Escuchar última respuesta">🔊</button>
      <button class="icon-btn" data-action="clearChat" title="Borrar conversación" aria-label="Borrar conversación">🗑</button>
    </div>
    <p class="hint">Habla o escribe tu pregunta. Te explicaré paso a paso con palabras sencillas.</p>
    ${state.continuousVoice ? `<div class="result" style="margin:10px 0"><b>${esc(t('Micrófono activo. Habla cuando quieras.'))}</b></div>` : ''}
    <div class="chat">
      ${bubbles || `<div class="thinking">${esc(t('Aún no hay mensajes. Prueba con “¿Cómo saco mi INE?”'))}</div>`}
      ${state.busy ? `<div class="thinking">${esc(t('Pensando…'))}</div>` : ''}
    </div>
    ${followUps}
    <div class="composer">
      <button class="icon-btn ${state.recording && state.recordKind === 'dictate' ? 'rec' : ''}"
        data-action="mic" data-value="dictate" title="Dictar con audio" aria-label="Dictar con audio">
        ${state.recording && state.recordKind === 'dictate' ? '■' : '🎤'}
      </button>
      <textarea id="draft" placeholder="${esc(t(state.recording ? 'Escuchando…' : 'Habla o escribe tu pregunta…'))}"></textarea>
      <button class="icon-btn" data-action="send" title="Enviar" aria-label="Enviar" ${state.busy ? 'disabled' : ''}>➤</button>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="btn secondary" data-action="mic" data-value="assistant" ${state.busy ? 'disabled' : ''}>
        ${state.toggles.demo
          ? esc(t('▶ Simular voz'))
          : state.recording && state.recordKind === 'assistant'
            ? esc(t(state.continuousVoice ? '■ Detener escucha' : '■ Detener grabación'))
            : esc(t('🎤 Habla con el asistente'))}
      </button>
    </div>
    ${state.error ? `<p class="error" data-no-translate>${esc(state.error)}</p>` : ''}
  </section>`;
}

function renderAccessibility() {
  const toggle = (key, title, subtitle) => `
    <div class="toggle-row">
      <div><b>${esc(title)}</b><small>${esc(subtitle)}</small></div>
      <button class="switch ${state.toggles[key] ? 'on' : ''}" data-action="toggle" data-value="${key}"
        role="switch" aria-checked="${state.toggles[key]}" aria-label="${esc(title)}"></button>
    </div>`;
  return `
  <section class="card">
    <h2>♿ Accesibilidad</h2>
    ${toggle('translation', 'Traducción de idioma', 'Español ↔ lenguas indígenas')}
    ${toggle('readAloud', 'Lectura en voz alta', 'Escucha la información en audio')}
    ${toggle('voiceNav', 'Navegación por voz', 'Controla la app con comandos')}
    ${toggle('dictation', 'Dictado por voz', 'Escribe con tu voz')}
    ${toggle('simplified', 'Interfaz simplificada', 'Botones grandes y textos claros')}
    ${toggle('demo', 'Modo demostración', 'Simula la voz para exponer sin micrófono')}
  </section>

  ${state.toggles.voiceNav ? `
  <section class="card">
    <h3>Comando por voz</h3>
    <p class="hint">Di: inicio, asistente, accesibilidad, traducir o leer.</p>
    <button class="btn ${state.recording && state.recordKind === 'command' ? 'red' : ''}"
      data-action="mic" data-value="command">
      ${state.toggles.demo
        ? esc(t('▶ Simular comando'))
        : state.recording && state.recordKind === 'command' ? '■ Detener y enviar' : '🎤 Decir un comando'}
    </button>
  </section>` : ''}

  ${state.toggles.translation ? `
  <section class="card">
    <h3>🌐 Traducción con Gemini</h3>
    <label for="fromLang">Desde</label>
    <select id="fromLang">${opts(state.translateFrom)}</select>
    <label for="toLang">Hacia</label>
    <select id="toLang">${opts(state.translateTo)}</select>
    <label for="translateText">Texto a traducir</label>
    <textarea id="translateText" placeholder="Escribe aquí…"></textarea>
    <button class="btn block" style="margin-top:10px" data-action="translate" ${state.busyTranslate ? 'disabled' : ''}>
      ${state.busyTranslate ? 'Traduciendo…' : 'Traducir'}
    </button>
    ${state.toggles.demo ? `
      <button class="btn secondary block" style="margin-top:8px" data-action="demoTranslate">
        ${esc(t('▶ Simular traducción'))}
      </button>` : ''}
    ${state.translated ? `
      <div class="result">
        <small class="hint">Resultado</small>
        <div data-no-translate>${esc(state.translated)}</div>
        <button class="btn secondary slim" style="margin-top:8px" data-action="speakTranslated">🔊 Escuchar</button>
      </div>` : ''}
    <p class="hint">La precisión depende de la lengua y de los datos del modelo.</p>
  </section>` : ''}

  <section class="card">
    <h3>Tamaño del texto</h3>
    <div class="seg">
      <button data-no-translate class="${state.scale === 1 ? 'active' : ''}" data-action="scale" data-value="1">A</button>
      <button data-no-translate class="${state.scale === 2 ? 'active' : ''}" data-action="scale" data-value="2">A+</button>
      <button data-no-translate class="${state.scale === 3 ? 'active' : ''}" data-action="scale" data-value="3">A++</button>
    </div>
    <h3 style="margin-top:16px">Contraste</h3>
    <div class="seg">
      <button class="${state.contrast === 0 ? 'active' : ''}" data-action="contrast" data-value="0">Normal</button>
      <button class="${state.contrast === 1 ? 'active' : ''}" data-action="contrast" data-value="1">Alto</button>
      <button class="${state.contrast === 2 ? 'active' : ''}" data-action="contrast" data-value="2">Máximo</button>
    </div>
  </section>

  <section class="card">
    <h3>Configuración</h3>
    <p class="hint">La conexión con Gemini se configura en el servidor. No hay claves en esta interfaz.</p>
    <button class="btn secondary" data-action="setup">Nueva configuración</button>
  </section>`;
}

function setValuesAfterRender() {
  const draft = document.getElementById('draft');
  if (draft) draft.value = state.draft;

  const translateText = document.getElementById('translateText');
  if (translateText) translateText.value = state.translateInput;

  const fromLang = document.getElementById('fromLang');
  if (fromLang) fromLang.value = state.translateFrom;

  const toLang = document.getElementById('toLang');
  if (toLang) toLang.value = state.translateTo;

  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = LANGUAGES.includes(state.language) ? state.language : 'Otra';
}

function render() {
  screenEl.innerHTML =
    state.screen === 'setup' ? renderSetup() :
    state.screen === 'home' ? renderHome() :
    state.screen === 'assistant' ? renderAssistant() :
    renderAccessibility();

  tabsEl.style.display = state.screen === 'setup' ? 'none' : 'flex';
  tabsEl.querySelectorAll('button').forEach(button => {
    button.classList.toggle('active', button.dataset.value === state.screen);
  });
  applyTheme();
  setValuesAfterRender();
  translateDom();

  if (state.screen === 'assistant') {
    const chat = screenEl.querySelector('.chat');
    if (chat) chat.scrollTop = chat.scrollHeight;
  }
}

/* ---------- Audio ---------- */

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('No se pudo leer el audio grabado.'));
    reader.readAsDataURL(blob);
  });
}

async function handleAudio(kind, blob) {
  const audioBase64 = await blobToBase64(blob);
  const mimeType = blob.type || 'audio/webm';
  const history = state.messages.slice(0, -1);

  try {
    if (kind === 'dictate') {
      const text = await api('transcribe', { audioBase64, mimeType, language: state.language });
      state.draft = text;
      speak(text);
      log('Dictado completado', text);
    } else if (kind === 'assistant') {
      state.messages.push({ fromUser: true, text: t('🎤 Audio enviado') });
      state.busy = true;
      render();
      const answer = await api('audio-assistant', { audioBase64, mimeType, language: state.language, history });
      state.messages.push({ fromUser: false, text: answer });
      await speak(answer);
    } else if (kind === 'command') {
      const raw = await api('command', { audioBase64, mimeType });
      const command = ['INICIO', 'ASISTENTE', 'ACCESIBILIDAD', 'TRADUCIR', 'LEER', 'AYUDA']
        .find(item => raw.toUpperCase().includes(item)) || 'AYUDA';
      log('Comando interpretado', command);
      speak(command === 'AYUDA'
        ? t('No entendí el comando. Puedes decir inicio, asistente o accesibilidad.')
        : command);
      if (command === 'INICIO') go('home');
      if (command === 'ASISTENTE') go('assistant');
      if (command === 'ACCESIBILIDAD' || command === 'TRADUCIR') go('accessibility');
      if (command === 'LEER') {
        const last = state.messages.filter(message => !message.fromUser).pop();
        if (last) speak(last.text);
      }
    }
  } catch (error) {
    state.error = error.message;
    log('Error en audio', error.message);
  } finally {
    state.busy = false;
    render();
    maybeRestartContinuousVoice(kind);
  }
}

function stopSilenceWatcher() {
  const watcher = state.silenceWatcher;
  if (!watcher) return;
  if (watcher.timer) window.clearInterval(watcher.timer);
  try { watcher.source.disconnect(); } catch { /* ya desconectado */ }
  state.silenceWatcher = null;
}

function watchSilence(stream, kind) {
  stopSilenceWatcher();
  const ctx = getAudioContext();
  if (!ctx) {
    log('Detección de silencio no disponible', 'AudioContext no disponible');
    return;
  }
  try {
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const watcher = {
      source,
      analyser,
      samples,
      voiceDetected: false,
      lastVoiceAt: Date.now(),
      timer: null
    };
    state.silenceWatcher = watcher;
    watcher.timer = window.setInterval(() => {
      if (!state.recording || !state.silenceWatcher) {
        stopSilenceWatcher();
        return;
      }
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const value of samples) {
        const sample = (value - 128) / 128;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / samples.length);
      const now = Date.now();
      if (rms > 0.025) {
        watcher.voiceDetected = true;
        watcher.lastVoiceAt = now;
      } else if (watcher.voiceDetected && now - watcher.lastVoiceAt >= SILENCE_MS) {
        stopSilenceWatcher();
        log('Silencio detectado', { kind, ms: SILENCE_MS });
        stopCurrentRecording();
      }
    }, 100);
  } catch (error) {
    log('Detección de silencio no disponible', error.message);
  }
}

function stopMicrophone() {
  stopSilenceWatcher();
  if (state.stream) state.stream.getTracks().forEach(track => track.stop());
  state.stream = null;
}

function stopCurrentRecording() {
  if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop();
}

async function startRecording(kind, interruptSpeech = false) {
  if (state.recording) return;

  const streamReused = Boolean(state.stream);
  if (!state.stream) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      state.error = t('Este navegador no permite grabar audio. Puedes escribir tu mensaje.');
      render();
      throw new Error('MediaRecorder no disponible');
    }
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      state.error = t('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
      log('Micrófono no disponible', error.message);
      render();
      throw error;
    }
  }

  playMicSound();
  log('Micrófono activado', { kind, streamReused });
  try {
    // No cancelar la síntesis aquí: la respuesta debe terminar antes de volver a escuchar.
    const recorder = new MediaRecorder(state.stream);
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      stopSilenceWatcher();
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      state.recorder = null;
      state.recording = false;
      const keepMicrophone = state.continuousVoice && kind === 'assistant';
      if (!keepMicrophone) stopMicrophone();
      log('Audio grabado', { bytes: blob.size, mimeType: blob.type });
      handleAudio(kind, blob);
    };
    recorder.start();
    watchSilence(state.stream, kind);
    state.recorder = recorder;
    state.recording = true;
    state.recordKind = kind;
    state.error = '';
    log('Grabando audio', { kind, streamReused });
    render();
  } catch (error) {
    if (!state.recording) stopMicrophone();
    state.error = t('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
    log('Micrófono no disponible', error.message);
    render();
    throw error;
  }
}

async function maybeRestartContinuousVoice(kind) {
  if (kind !== 'assistant' || !state.continuousVoice || state.screen !== 'assistant') return;
  if (state.recording || state.busy) return;
  if (state.toggles.demo) {
    demoVoice('assistant');
    return;
  }
  try {
    await startRecording('assistant');
  } catch {
    state.continuousVoice = false;
    stopMicrophone();
    state.error = t('No se pudo activar el micrófono automáticamente. Toca el botón para intentar de nuevo.');
    render();
  }
}

async function toggleRecording(kind) {
  if (state.recording) {
    if (state.continuousVoice) {
      state.continuousVoice = false;
      log('Escucha continua desactivada', { motivo: 'botón' });
    }
    stopCurrentRecording();
    return;
  }
  try {
    await startRecording(kind);
  } catch {
    // startRecording ya mostró el error en pantalla.
  }
}

/* ---------- Modo demostración ---------- */

function demoVoice(kind) {
  state.error = '';
  playMicSound();
  log('Micrófono activado', { kind, demo: true });

  if (kind === 'dictate') {
    state.draft = DEMO_DICTATION;
    speak(DEMO_DICTATION);
    log('Dictado simulado', DEMO_DICTATION);
    render();
    return;
  }

  if (kind === 'command') {
    const command = DEMO_COMMANDS[state.demoIndex % DEMO_COMMANDS.length];
    state.demoIndex += 1;
    log('Comando simulado', command);
    speak(command);
    if (command === 'INICIO') go('home');
    if (command === 'ASISTENTE') go('assistant');
    if (command === 'ACCESIBILIDAD' || command === 'TRADUCIR') go('accessibility');
    if (command === 'LEER') {
      const last = state.messages.filter(message => !message.fromUser).pop();
      if (last) speak(last.text);
    }
    render();
    return;
  }

  if (state.busy) return;
  const manual = !state.continuousVoice;
  if (manual && state.demoIndex >= DEMO_QUESTIONS.length) state.demoIndex = 0;
  if (state.continuousVoice && state.demoIndex >= DEMO_QUESTIONS.length) {
    state.continuousVoice = false;
    log('Demo terminada', { preguntas: state.demoIndex });
    render();
    return;
  }
  const question = DEMO_QUESTIONS[state.demoIndex % DEMO_QUESTIONS.length];
  state.demoIndex += 1;
  log('Voz simulada', question);
  sendText(question);
}

function demoTranslate() {
  const textarea = document.getElementById('translateText');
  if (textarea) textarea.value = DEMO_TRANSLATION;
  state.translateInput = DEMO_TRANSLATION;
  translate();
}

/* ---------- Acciones ---------- */

function go(route) {
  if (route !== 'assistant' && state.continuousVoice && state.screen === 'assistant') {
    state.continuousVoice = false;
    if (state.recording) stopCurrentRecording(); else stopMicrophone();
    log('Escucha continua desactivada', { motivo: 'navegación' });
  }
  state.screen = route;
  state.error = '';
  if (route === 'assistant' && state.lowVision && !state.recording && !state.busy) {
    state.continuousVoice = true;
    if (state.toggles.demo) {
      demoVoice('assistant');
    } else {
      startRecording('assistant').catch(() => {
        state.continuousVoice = false;
        state.error = t('No se pudo activar el micrófono automáticamente. Toca el botón para intentar de nuevo.');
        render();
      });
    }
  }
  render();
}

async function sendText(text) {
  const question = String(text || '').trim();
  if (!question || state.busy) return;
  state.draft = '';
  state.error = '';
  const history = state.messages.slice();
  state.messages.push({ fromUser: true, text: question });
  state.busy = true;
  render();
  let restartVoice = false;
  try {
    const answer = await api('assistant', { question, language: state.language, history });
    state.messages.push({ fromUser: false, text: answer });
    await speak(answer);
    restartVoice = state.continuousVoice && state.screen === 'assistant';
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
    if (restartVoice) await maybeRestartContinuousVoice('assistant');
  }
}

async function translate() {
  const from = document.getElementById('fromLang')?.value || state.translateFrom;
  const to = document.getElementById('toLang')?.value || state.translateTo;
  const text = document.getElementById('translateText')?.value || state.translateInput;
  state.translateFrom = from;
  state.translateTo = to;
  state.translateInput = text;
  if (!text.trim() || state.busyTranslate) return;
  state.busyTranslate = true;
  state.error = '';
  render();
  try {
    const result = await api('translate', { text, from, to });
    state.translated = result;
    speak(result, to);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busyTranslate = false;
    render();
  }
}

function handle(action, value) {
  switch (action) {
    case 'go': go(value); break;
    case 'setup': go('setup'); break;
    case 'vision': {
      state.lowVision = value === 'yes';
      if (state.lowVision) {
        state.toggles.simplified = true;
        state.scale = 2;
        state.continuousVoice = true;
        savePrefs();
        log('Escucha continua activada', { activada: true });
        go('assistant');
      } else {
        state.continuousVoice = false;
        if (state.recording) stopCurrentRecording(); else stopMicrophone();
        savePrefs();
        log('Escucha continua desactivada', { activada: false });
        render();
      }
      break;
    }
    case 'applyCustomLanguage': {
      const custom = String(document.getElementById('customLanguage')?.value || '').trim();
      if (!custom) {
        state.error = t('Escribe el nombre de tu idioma antes de continuar.');
        render();
        return;
      }
      applyLanguage(custom);
      break;
    }
    case 'finishSetup': {
      const finalLanguage = LANGUAGES.includes(state.language)
        ? state.language
        : String(state.customLanguage || '').trim();
      if (!finalLanguage || finalLanguage === 'Otra') {
        state.error = t('Escribe el nombre de tu idioma antes de continuar.');
        render();
        return;
      }
      state.setupDone = true;
      savePrefs();
      log('Configuración guardada', { lengua: finalLanguage, discapacidadVisual: state.lowVision });
      go(state.lowVision ? 'assistant' : 'home');
      applyLanguage(finalLanguage);
      break;
    }
    case 'category':
      go('assistant');
      sendText(`Quiero información y ayuda sobre: ${value}`);
      break;
    case 'send': sendText(value || document.getElementById('draft')?.value || ''); break;
    case 'mic':
      if (state.toggles.demo) demoVoice(value); else toggleRecording(value);
      break;
    case 'demoVoice': demoVoice(value); break;
    case 'demoTranslate': demoTranslate(); break;
    case 'translate': translate(); break;
    case 'speakLast': {
      const last = state.messages.filter(message => !message.fromUser).pop();
      if (last) speak(last.text);
      break;
    }
    case 'speakTranslated': speak(state.translated, state.translateTo); break;
    case 'clearChat':
      state.messages = [];
      state.error = '';
      log('Conversación borrada', { ok: true });
      render(); break;
    case 'toggle':
      state.toggles[value] = !state.toggles[value];
      savePrefs(); render(); break;
    case 'scale': state.scale = Number(value); savePrefs(); render(); break;
    case 'contrast': state.contrast = Number(value); savePrefs(); render(); break;
  }
}

document.addEventListener('click', event => {
  const element = event.target.closest('[data-action]');
  if (element && !element.disabled) handle(element.dataset.action, element.dataset.value);
});

document.getElementById('settingsBtn').addEventListener('click', () => go('setup'));
document.getElementById('clearLog').addEventListener('click', () => {
  logEl.innerHTML = '';
  log('Registro limpiado', { ok: true });
});

document.addEventListener('input', event => {
  if (event.target.id === 'draft') state.draft = event.target.value;
  if (event.target.id === 'translateText') state.translateInput = event.target.value;
  if (event.target.id === 'customLanguage') {
    state.customLanguage = event.target.value;
    savePrefs();
  }
});

document.addEventListener('change', event => {
  if (event.target.id === 'langSelect') {
    const chosen = event.target.value;
    if (chosen === 'Otra') {
      state.language = 'Otra';
      savePrefs();
      render();
      document.getElementById('customLanguage')?.focus();
    } else {
      applyLanguage(chosen);
    }
  }
  if (event.target.id === 'fromLang') state.translateFrom = event.target.value;
  if (event.target.id === 'toLang') state.translateTo = event.target.value;
});

async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    state.model = data.model || '...';
    if (state.quotaFallback) {
      setBadge(t('Sin cuota de IA · respuestas demo'), true);
    } else if (data.keyConfigured) {
      setBadge(`${t('Gemini listo')} · ${state.model}`);
    } else {
      setBadge(t('Falta la API key en local.properties'), true);
    }
    log('Servidor verificado', { modelo: state.model, claveConfigurada: data.keyConfigured });
  } catch (error) {
    setBadge(t('No se pudo conectar con el servidor'), true);
    log('Error de conexión', error.message);
  }
}

async function init() {
  setBadge(t('Conectando…'));
  render();
  collectAllSources();
  log('Listo', 'La app web está cargada.');
  checkHealth();
  if (!isSourceLanguage(state.language)) applyLanguage(state.language);
}

init();
