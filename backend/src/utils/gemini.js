// Cliente mínimo de la API de Gemini (Google) para el chat del Asistente.
// Usa models.generateContent con "function calling": Gemini no accede a la base de datos,
// solo pide herramientas de lectura que FoodOps ejecuta y le devuelve el resultado.
//
// Variables de entorno:
//   GEMINI_API_KEY   (obligatoria)  clave de aistudio.google.com
//   GEMINI_MODEL     (opcional)     fuerza un modelo; si no, se elige el Flash más nuevo disponible
//   GEMINI_BASE_URL  (opcional)     solo para pruebas

const BASE = () => (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
const TIMEOUT_MS = 45_000

class ErrorGemini extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code }
}

async function llamar(path, { method = 'GET', body } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(BASE() + path, {
      method, signal: ctrl.signal,
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const txt = await r.text()
    let json = null
    try { json = txt ? JSON.parse(txt) : null } catch { /* respuesta no JSON */ }
    if (!r.ok) {
      const msg = json?.error?.message || `HTTP ${r.status}`
      throw new ErrorGemini(msg, r.status, json?.error?.status)
    }
    return json
  } catch (e) {
    if (e.name === 'AbortError') throw new ErrorGemini('Gemini tardó demasiado en responder', 504, 'TIMEOUT')
    if (e instanceof ErrorGemini) throw e
    throw new ErrorGemini('No se pudo conectar con Gemini', 502, 'RED')
  } finally {
    clearTimeout(t)
  }
}

// ── Elección del modelo ───────────────────────────────────────────────────────
// Los nombres cambian seguido (gemini-2.5-flash, gemini-3.6-flash, ...): se listan los
// modelos de la clave y se prefieren los "flash" estables más nuevos (no lite, no preview).
let candidatos = null, candidatosHasta = 0
const EXCLUIR = /(image|tts|audio|live|transcribe|embedding|preview|exp|thinking|robotics|computer)/i
const version = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0 }

async function modelosCandidatos() {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL.replace(/^models\//, '')]
  if (candidatos && Date.now() < candidatosHasta) return candidatos
  const res = await llamar('/v1beta/models?pageSize=200')
  const lista = (res?.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => /flash/i.test(n) && !EXCLUIR.test(n))
  lista.sort((a, b) => (/lite/i.test(a) - /lite/i.test(b)) || (version(b) - version(a)) || a.length - b.length)
  candidatos = lista.length ? lista.slice(0, 4) : ['gemini-2.5-flash']
  candidatosHasta = Date.now() + 6 * 3600_000
  return candidatos
}

/**
 * Conversación con herramientas.
 * @param {object}   p
 * @param {string}   p.sistema       instrucciones de sistema
 * @param {Array}    p.historial     [{ rol: 'usuario'|'asistente', texto }]
 * @param {Array}    p.herramientas  [{ name, description, parameters }]
 * @param {Function} p.ejecutar      async (nombre, args) => objeto con el resultado
 * @returns {{ texto: string, herramientasUsadas: string[], modelo: string }}
 */
async function conversar({ sistema, historial, herramientas, ejecutar, maxPasos = 5 }) {
  if (!process.env.GEMINI_API_KEY) throw new ErrorGemini('El chat no está configurado (falta GEMINI_API_KEY)', 503, 'SIN_CLAVE')
  if (/\s/.test(process.env.GEMINI_API_KEY.trim()) || process.env.GEMINI_API_KEY !== process.env.GEMINI_API_KEY.trim()) {
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY.trim()   // espacios o saltos de línea al pegarla en Render
  }
  const contents = historial.map(m => ({ role: m.rol === 'asistente' ? 'model' : 'user', parts: [{ text: m.texto }] }))
  const usadas = []
  const modelos = await modelosCandidatos()
  let ultimoError = null
  const intentos = []

  for (const modelo of modelos) {
    try {
      const conv = [...contents]
      for (let paso = 0; paso < maxPasos; paso++) {
        const res = await llamar(`/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
          method: 'POST',
          body: {
            systemInstruction: { parts: [{ text: sistema }] },
            contents: conv,
            tools: [{ functionDeclarations: herramientas }],
            // Los modelos nuevos "piensan" antes de responder y ese pensamiento cuenta en este
            // límite: con poco margen la respuesta llega vacía (finishReason MAX_TOKENS).
            generationConfig: { maxOutputTokens: 8192 },
          },
        })
        const cand = res?.candidates?.[0]
        const partes = cand?.content?.parts || []
        const llamadas = partes.filter(p => p.functionCall)
        if (!llamadas.length) {
          const texto = partes.map(p => p.text || '').join('').trim()
          if (!texto) {
            if (cand?.finishReason === 'SAFETY' || res?.promptFeedback?.blockReason) return { texto: 'No puedo responder eso. Probá preguntarme sobre las ventas, el stock o la carta de tu local.', herramientasUsadas: usadas, modelo }
            throw new ErrorGemini(`Gemini no devolvió texto (finishReason: ${cand?.finishReason || 'sin candidatos'})`, 502, 'VACIA')
          }
          return { texto, herramientasUsadas: usadas, modelo }
        }
        // Se devuelve el turno del modelo tal cual (incluye firmas de pensamiento si las hay)
        conv.push({ role: 'model', parts: partes })
        const respuestas = []
        for (const p of llamadas) {
          const { name, args, id } = p.functionCall
          usadas.push(name)
          let resultado
          try { resultado = await ejecutar(name, args || {}) }
          catch (e) { resultado = { error: e.message || 'No se pudo obtener el dato' } }
          respuestas.push({ functionResponse: { ...(id ? { id } : {}), name, response: { resultado } } })
        }
        conv.push({ role: 'user', parts: respuestas })
      }
      return { texto: 'La consulta necesitó demasiados pasos. Probá preguntarlo de forma más concreta.', herramientasUsadas: usadas, modelo }
    } catch (e) {
      if (!(e instanceof ErrorGemini)) throw e
      intentos.push(`${modelo} → ${e.status} ${e.message}`.slice(0, 300))
      ultimoError = e
      // Clave inválida o sin permiso: no tiene sentido probar otro modelo
      if (e.status === 401 || e.status === 403) break
      // Modelo inexistente, parámetro no soportado, sin cupo, saturado, vacío o lento: se prueba el siguiente
      if (e.status === 404) candidatos = null
      continue
    }
  }
  const err = ultimoError || new ErrorGemini('No hay modelos de Gemini disponibles para esta clave', 502, 'SIN_MODELO')
  err.intentos = intentos
  throw err
}

module.exports = { conversar, ErrorGemini }
