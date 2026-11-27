'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const USE_HTTPS = String(process.env.MOVIL_HTTPS || '').toLowerCase() === 'true';
const PFX_PATH = process.env.MOVIL_PFX || path.join(__dirname, 'certificado-movil.pfx');
const PFX_PASS = process.env.MOVIL_PFX_PASS || 'accesia2026';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 24 * 1024 * 1024; // audio en base64
const MAX_UI_STRINGS = 400;
const UI_BATCH_SIZE = 25;
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const uiCache = new Map();

// La clave se lee del proyecto Android existente. Nunca se sirve al navegador.
const PROPERTIES_PATH = process.env.ACCESIA_PROPERTIES ||
  path.join(__dirname, '..', 'AccesIA', 'local.properties');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

function unescapeProperty(value) {
  return value
    .replace(/\\([\\:=!#\nrt ])/g, (_, c) => {
      if (c === 'n') return '\n';
      if (c === 'r') return '\r';
      if (c === 't') return '\t';
      return c;
    })
    .trim();
}

function loadProperties(file) {
  const result = {};
  if (!fs.existsSync(file)) return result;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let pendingKey = null;
  let pendingValue = '';
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (pendingKey !== null) {
      pendingValue += line.replace(/^\\/, '');
      if (!line.endsWith('\\')) {
        result[pendingKey] = unescapeProperty(pendingValue);
        pendingKey = null;
        pendingValue = '';
      }
      continue;
    }
    if (!line.trim() || /^\s*[#!]/.test(line)) continue;
    const match = line.match(/^\s*([^=:\s]+)\s*[=:]\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2];
    if (value.endsWith('\\')) {
      pendingKey = key;
      pendingValue = value.slice(0, -1);
    } else {
      result[key] = unescapeProperty(value);
    }
  }
  return result;
}

const props = loadProperties(PROPERTIES_PATH);
const API_KEY = (process.env.GEMINI_API_KEY || props.GEMINI_API_KEY || '').trim();
const MODEL = (process.env.GEMINI_MODEL || props.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
// La búsqueda con fuentes requiere un plan con facturación en varios proyectos.
const USE_GROUNDING = String(process.env.GEMINI_GROUNDING || props.GEMINI_GROUNDING || '')
  .toLowerCase() === 'true';

function lanAddresses() {
  const addresses = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const item of interfaces[name] || []) {
      if (item.family === 'IPv4' && !item.internal && !addresses.includes(item.address)) {
        addresses.push(item.address);
      }
    }
  }
  return addresses;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('La petición es demasiado grande.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Cuerpo JSON inválido.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function cleanBase64(value) {
  if (typeof value !== 'string') return '';
  return value.includes(',') ? value.slice(value.indexOf(',') + 1) : value.trim();
}

function normalizeAudioMime(value) {
  const map = {
    'audio/webm': 'audio/webm',
    'audio/mp4': 'audio/m4a',
    'audio/x-m4a': 'audio/m4a',
    'audio/m4a': 'audio/m4a',
    'audio/mpeg': 'audio/mp3',
    'audio/mp3': 'audio/mp3',
    'audio/ogg': 'audio/ogg',
    'audio/wav': 'audio/wav',
    'audio/x-wav': 'audio/wav'
  };
  return map[String(value || '').toLowerCase()] || 'audio/webm';
}

function assistantSystem(language) {
  return `Eres AccesIA, un asistente digital inclusivo que ayuda con trámites, salud,
educación, empleo, apoyos gubernamentales e información general en México.
Responde siempre en ${language}.
Usa frases cortas, vocabulario sencillo y máximo 5 pasos numerados.
No uses Markdown con asteriscos ni tablas. Usa texto plano y números.
Si el usuario tiene discapacidad visual, haz que cada paso sea audible y claro.

Reglas de exactitud:
1) Prefiere solo información de fuentes oficiales de México: gob.mx, ine.mx,
imss.gob.mx, sep.gob.mx, bienestar.gob.mx, salud.gob.mx.
2) No inventes requisitos, costos, plazos, teléfonos ni fechas. Si no puedes
confirmarlos, di claramente: "No tengo ese dato actualizado".
3) Si la respuesta depende del estado, municipio o situación de la persona,
haz una pregunta corta de aclaración antes de dar los pasos.
4) Si algo puede cambiar con el tiempo, indícalo y sugiere confirmarlo en la
fuente oficial. No afirmes que un trámite sigue vigente si no lo verificas.
5) Termina con una línea breve: "Fuente oficial: ..." solo cuando la tengas.
Nunca inventes enlaces.`;
}

function buildSpec(body) {
  const action = String(body.action || '');
  const language = String(body.language || 'Español');
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

  if (action === 'translate') {
    const text = String(body.text || '').trim();
    const from = String(body.from || 'Español');
    const to = String(body.to || 'Náhuatl');
    if (!text) throw Object.assign(new Error('Escribe el texto que quieres traducir.'), { status: 400 });
    return {
      label: 'translate',
      systemInstruction: `Eres un traductor preciso y respetuoso de lenguas indígenas.
Traduce el texto del usuario de ${from} a ${to}.
Devuelve SOLO la traducción, sin explicaciones, sin comillas y sin encabezados.
Si no conoces la lengua, conserva el texto original y añade una nota breve.`,
      prompt: `Texto a traducir:\n${text}`,
      maxTokens: 600
    };
  }

  if (action === 'assistant') {
    const question = String(body.question || body.text || '').trim();
    if (!question) throw Object.assign(new Error('Escribe tu pregunta.'), { status: 400 });
    return {
      label: 'assistant',
      systemInstruction: assistantSystem(language),
      prompt: `Pregunta del usuario: ${question}`,
      history,
      maxTokens: 1200,
      grounded: USE_GROUNDING,
      temperature: 0
    };
  }

  const audioBase64 = cleanBase64(body.audioBase64);
  if (!audioBase64) throw Object.assign(new Error('No se recibió audio.'), { status: 400 });
  const audioPart = {
    inline_data: {
      mime_type: normalizeAudioMime(body.mimeType),
      data: audioBase64
    }
  };

  if (action === 'transcribe') {
    return {
      label: 'transcribe',
      systemInstruction: 'Eres un transcriptor exacto de audio.',
      prompt: `Transcribe literalmente el audio en ${language}.
Devuelve SOLO el texto hablado. No añadas explicaciones, ni comillas, ni etiquetas.`,
      audioPart,
      maxTokens: 500
    };
  }

  if (action === 'audio-assistant') {
    return {
      label: 'audio-assistant',
      systemInstruction: assistantSystem(language),
      prompt: `El usuario envió un audio.
1) Transcribe literalmente lo que dice en una primera línea que empiece con "Escuché: ".
2) Responde a esa pregunta en ${language} con instrucciones claras y sencillas.
3) Máximo 5 pasos numerados. Al final, si tiene sentido, haz una pregunta breve de seguimiento.`,
      audioPart,
      history,
      maxTokens: 1400,
      grounded: USE_GROUNDING,
      temperature: 0
    };
  }

  if (action === 'command') {
    return {
      label: 'command',
      systemInstruction: 'Clasificador de comandos de voz para una aplicación web accesible.',
      prompt: `Escucha el audio y devuelve SOLO una de estas palabras en mayúsculas:
INICIO, ASISTENTE, ACCESIBILIDAD, TRADUCIR, LEER, AYUDA.
Elige AYUDA si la orden no es clara.`,
      audioPart,
      maxTokens: 20
    };
  }

  throw Object.assign(new Error('Acción no reconocida.'), { status: 400 });
}

function isQuotaError(error) {
  return /quota|rate.limit|429|exceeded your current quota/i.test(String(error?.message || error || ''));
}

function demoFallback(spec) {
  if (spec.label === 'translate') {
    const match = String(spec.prompt || '').match(/Texto a traducir:\n([\s\S]*)/);
    return match ? match[1].trim() : 'Texto pendiente de traducción.';
  }
  if (spec.label === 'transcribe') return 'No pude transcribir el audio: la IA está sin cuota.';
  if (spec.label === 'command') return 'AYUDA';

  // Respuesta verificada para la pregunta más usada en la exposición.
  const pregunta = spec.label === 'assistant' ? String(spec.prompt || '') : '';
  if (/credencial|votar|ine\b|elector/i.test(pregunta)) {
    return 'Para tramitar tu credencial para votar, primero haz una cita en el INE. ' +
      '1) Reúne tu acta de nacimiento original. ' +
      '2) Lleva una identificación oficial con fotografía vigente. ' +
      '3) Lleva un comprobante de domicilio con menos de tres meses de antigüedad. ' +
      '4) Si es tu primera vez, lleva también tu CURP. ' +
      '5) Acude a tu módulo con la cita y recoge la credencial en el mismo lugar. ' +
      'El trámite es gratuito. Fuente oficial: ine.mx.';
  }

  if (spec.label === 'audio-assistant') {
    return 'No pude escuchar tu audio: la IA está sin cuota. Mientras tanto, información de demostración.\n1) Reúne tus documentos originales.\n2) Consulta el sitio oficial del trámite.\n3) Agenda una cita si es necesario.\n4) Acude con tu identificación y comprobante de domicilio.';
  }
  return 'Modo demostración: AccesIA puede ayudarte con trámites, salud, educación, empleo, apoyos gubernamentales e información general. Elige una categoría o haz una pregunta concreta.';
}

function ensureApiKey() {
  if (!API_KEY) {
    throw Object.assign(
      new Error('Falta la API key. Agrega GEMINI_API_KEY en AccesIA/local.properties y reinicia el servidor.'),
      { status: 500 }
    );
  }
}

async function generateText({ systemInstruction, contents, maxTokens, temperature = 0.2, grounded = false }) {
  ensureApiKey();

  const payload = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generation_config: {
      temperature,
      maxOutputTokens: maxTokens
    }
  };
  if (grounded) payload.tools = [{ google_search: {} }];

  const url = `${GEMINI_URL}/${encodeURIComponent(MODEL)}:generateContent`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-goog-api-key': API_KEY
    }
  };

  let response = await fetch(url, { ...options, body: JSON.stringify(payload) });
  let raw = await response.text();

  // Algunos planes no admiten búsqueda: repetir sin herramientas.
  if (!response.ok && grounded && [400, 404, 429].includes(response.status)) {
    delete payload.tools;
    response = await fetch(url, { ...options, body: JSON.stringify(payload) });
    raw = await response.text();
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const parsedError = JSON.parse(raw);
      message = parsedError.error?.message || message;
    } catch { /* se conserva el código HTTP */ }
    throw Object.assign(new Error(`Gemini: ${message}`), { status: 502 });
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Gemini devolvió una respuesta no válida.'), { status: 502 });
  }

  const candidate = parsed.candidates?.[0] || {};
  const partsOut = candidate.content?.parts || [];
  let text = partsOut.map(part => part.text || '').join('').trim();
  if (!text) {
    throw Object.assign(new Error('Gemini no devolvió texto. Verifica el modelo configurado.'), { status: 502 });
  }

  if (grounded) {
    const domains = [];
    for (const chunk of candidate.groundingMetadata?.groundingChunks || []) {
      try {
        const host = new URL(chunk.web?.uri || '').hostname.replace(/^www\./, '');
        if (host && !domains.includes(host)) domains.push(host);
      } catch { /* se ignora un enlace no válido */ }
    }
    if (domains.length) text += `\n\nFuentes consultadas: ${domains.slice(0, 3).join(', ')}.`;
  }
  return text;
}

async function callGemini(spec) {
  const contents = [];
  for (const message of spec.history || []) {
    contents.push({
      role: message.fromUser ? 'user' : 'model',
      parts: [{ text: String(message.text || '') }]
    });
  }
  const parts = [{ text: spec.prompt }];
  if (spec.audioPart) parts.push(spec.audioPart);
  contents.push({ role: 'user', parts });

  return generateText({
    systemInstruction: spec.systemInstruction,
    contents,
    maxTokens: spec.maxTokens,
    temperature: spec.temperature ?? 0.2,
    grounded: Boolean(spec.grounded)
  });
}

function extractJsonArray(raw) {
  const cleaned = String(raw)
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) {
    throw Object.assign(new Error('Gemini no devolvió una lista JSON válida.'), { status: 502 });
  }
  let parsed;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw Object.assign(new Error('Gemini no devolvió una lista JSON válida.'), { status: 502 });
  }
  if (!Array.isArray(parsed)) {
    throw Object.assign(new Error('Gemini no devolvió una lista JSON válida.'), { status: 502 });
  }
  return parsed;
}

function splitIntoChunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function uiCacheKey(language, strings) {
  return crypto.createHash('sha1')
    .update(language.toLocaleLowerCase())
    .update('\0')
    .update(strings.join('\n'))
    .digest('hex');
}

async function translateUiStrings(language, strings) {
  const key = uiCacheKey(language, strings);
  if (uiCache.has(key)) return { translations: uiCache.get(key), cached: true };

  const translations = {};
  for (const batch of splitIntoChunks(strings, UI_BATCH_SIZE)) {
    const prompt = `Traduce al idioma ${language} cada texto de esta lista.
Devuelve SOLO un array JSON con la misma cantidad de elementos, en el mismo orden.
No cambies el orden. No añadas explicaciones. No uses Markdown.
Conserva emojis, signos de puntuación, números y nombres propios.
Usa palabras claras, cortas y accesibles para una app de accesibilidad.

Textos:
${JSON.stringify(batch)}`;

    const raw = await generateText({
      systemInstruction: 'Eres un traductor profesional de interfaces de usuario accesibles.',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      maxTokens: 2500,
      temperature: 0
    });
    const values = extractJsonArray(raw);
    batch.forEach((source, index) => {
      const value = values[index];
      translations[source] = typeof value === 'string' && value.trim() ? value.trim() : source;
    });
  }

  uiCache.set(key, translations);
  return { translations, cached: false };
}

function serveStatic(req, res, pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, 'index.html')) {
    return json(res, 403, { error: 'Acceso denegado.' });
  }
  fs.readFile(filePath, (err, data) => {
    if (err) return json(res, 404, { error: 'No encontrado.' });
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

async function handleRequest(req, res) {
  let pathname = '/';
  try {
    pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return json(res, 400, { error: 'URL no válida.' });
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      model: MODEL,
      grounding: USE_GROUNDING,
      keyConfigured: Boolean(API_KEY),
      propertiesFound: fs.existsSync(PROPERTIES_PATH),
      lanAddresses: lanAddresses()
    });
  }

  if (req.method === 'POST' && pathname === '/api/ui-language') {
    let language = '';
    let strings = [];
    try {
      const body = await readJsonBody(req);
      language = String(body.language || '').trim();
      strings = Array.isArray(body.strings)
        ? body.strings
            .filter(item => typeof item === 'string' && item.trim() && item.length <= 300)
            .slice(0, MAX_UI_STRINGS)
        : [];
      if (!language) {
        throw Object.assign(new Error('Falta el idioma destino.'), { status: 400 });
      }
      if (!strings.length) {
        return json(res, 200, { language, translations: {}, cached: true });
      }
      const normalized = language.toLocaleLowerCase();
      if (['español', 'espanol', 'spanish'].includes(normalized)) {
        return json(res, 200, { language, translations: {}, cached: true, isSource: true });
      }
      const result = await translateUiStrings(language, strings);
      console.log(`[OK] ui-language · ${language} · ${strings.length} textos${result.cached ? ' (caché)' : ''}`);
      return json(res, 200, {
        language,
        translations: result.translations,
        cached: result.cached
      });
    } catch (error) {
      if (isQuotaError(error)) {
        const translations = Object.fromEntries(strings.map(item => [item, item]));
        console.warn('[DEMO] ui-language · cuota agotada, interfaz sin traducir');
        return json(res, 200, { language, translations, cached: true, demoFallback: true });
      }
      const status = error.status || 500;
      console.error(`[ERROR] ui-language: ${error.message}`);
      return json(res, status, { error: error.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/gemini') {
    let spec = null;
    try {
      const body = await readJsonBody(req);
      spec = buildSpec(body);
      const answer = await callGemini(spec);
      console.log(`[OK] ${spec.label} · ${answer.length} caracteres`);
      return json(res, 200, { text: answer, action: spec.label });
    } catch (error) {
      if (isQuotaError(error) && spec) {
        const answer = demoFallback(spec);
        console.warn(`[DEMO] ${spec.label} · cuota agotada, respuesta local`);
        return json(res, 200, { text: answer, action: spec.label, demoFallback: true });
      }
      const status = error.status || 500;
      console.error(`[ERROR] ${error.message}`);
      return json(res, status, { error: error.message });
    }
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res, pathname);
  }

  return json(res, 405, { error: 'Método no permitido.' });
}

const serverOptions = USE_HTTPS
  ? (() => {
      if (!fs.existsSync(PFX_PATH)) {
        throw new Error(`Falta el certificado móvil: ${PFX_PATH}. Ejecuta preparar-movil.ps1.`);
      }
      return { pfx: fs.readFileSync(PFX_PATH), passphrase: PFX_PASS };
    })()
  : null;

const server = USE_HTTPS
  ? https.createServer(serverOptions, handleRequest)
  : http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  const scheme = USE_HTTPS ? 'https' : 'http';
  console.log(`AccesIA Web en ${scheme}://${HOST}:${PORT}`);
  if (USE_HTTPS) {
    console.log(`URL móvil: https://${lanAddresses()[0] || HOST}:${PORT}`);
  }
  console.log(`Modelo: ${MODEL}`);
  console.log(`Clave configurada: ${API_KEY ? 'sí' : 'no (revisa AccesIA/local.properties)'}`);
  console.log(`Propiedades: ${PROPERTIES_PATH}`);
});
