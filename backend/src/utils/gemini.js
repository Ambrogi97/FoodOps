// Cliente mínimo de la API de Gemini (Google) para el chat del Asistente.
// Usa models.generateContent con "function calling": Gemini no accede a la base de datos,
// solo pide herramientas de lectura que FoodOps ejecuta y le devuelve el resultado.
//
// Variables de entorno:
//   GEMINI_API_KEY   (obligatoria)  clave de aistudio.google.com
//   GEMINI_MODEL     (opcional)     fuerza un modelo; si no, se elige el Flash más nuevo disponible
//   GEMINI_BASE_URL  (opcional)     solo para pruebas

const BASE = () => (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
const TIMEOUT_MS   = 20_000   // por llamada
const PRESUPUESTO_MS = 55_000 // por pregunta, sumando herramientas y reintentos con otros modelos
const sinPensamientoBajo = new Set()   // modelos que rechazaron thinkingLevel

class ErrorGemini extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code }
}

async function llamar(path, { method = 'GET', body, timeoutMs = TIMEOUT_MS } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), Math.max(1000, timeoutMs))
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
    if (e.name === 'AbortError') throw new ErrorGemini(`Gemini no respondió en ${Math.round(timeoutMs / 1000)} s`, 504, 'TIMEOUT')
    if (e instanceof ErrorGemini) throw e
    throw new ErrorGemini(`No se pudo conectar con Gemini (${e.cause?.code || e.message})`, 502, 'RED')
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
  const res = await llamar('/v1beta/models?pageSize=200', { timeoutMs: 10_000 })
  const lista = (res?.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => /flash/i.test(n) && !EXCLUIR.test(n))
  // Orden: el Lite más nuevo primero (rápido y con poca demanda en el plan gratis), después los
  // Flash más nuevos y al final otro Lite. Los Flash grandes suelen estar saturados o tardar.
  const porVersion = (a, b) => (version(b) - version(a)) || a.length - b.length
  const lites   = lista.filter(n => /lite/i.test(n)).sort(porVersion)
  const flashes = lista.filter(n => !/lite/i.test(n)).sort(porVersion)
  const orden = [lites[0], flashes[0], flashes[1], lites[1], flashes[2]].filter(Boolean)
  candidatos = orden.length ? [...new Set(orden)] : ['gemini-2.5-flash-lite', 'gemini-2.5-flash']
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
  const inicio = Date.now()
  const restante = () => PRESUPUESTO_MS - (Date.now() - inicio)
  const modelos = await modelosCandidatos()
  let ultimoError = null
  const intentos = []

  for (const modelo of modelos) {
    if (restante() < 5000) { intentos.push(`(sin tiempo para probar ${modelo})`); break }
    const t0 = Date.now()
    try {
      const conv = [...contents]
      for (let paso = 0; paso < maxPasos; paso++) {
        // Los modelos nuevos "piensan" antes de responder: para consultar datos alcanza con poco
        // (más rápido y menos expuesto a la saturación). El pensamiento cuenta en maxOutputTokens,
        // por eso el margen es amplio (con poco, la respuesta llegaba vacía).
        const generationConfig = { maxOutputTokens: 8192 }
        if (!sinPensamientoBajo.has(modelo)) generationConfig.thinkingConfig = { thinkingLevel: 'low' }
        let res
        try {
          res = await llamar(`/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
            method: 'POST',
            timeoutMs: Math.min(TIMEOUT_MS, restante()),
            body: {
              systemInstruction: { parts: [{ text: sistema }] },
              contents: conv,
              tools: [{ functionDeclarations: herramientas }],
              generationConfig,
            },
          })
        } catch (e) {
          // Modelo que no acepta thinkingLevel: se repite el mismo paso sin ese ajuste
          if (e instanceof ErrorGemini && e.status === 400 && /thinking/i.test(e.message) && !sinPensamientoBajo.has(modelo)) {
            sinPensamientoBajo.add(modelo); paso--; continue
          }
          throw e
        }
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
      intentos.push(`${modelo} → ${e.status} ${e.message} (${((Date.now() - t0) / 1000).toFixed(1)} s)`.slice(0, 300))
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
