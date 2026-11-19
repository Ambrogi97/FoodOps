// Asistente inteligente: predicción de demanda (y más adelante lista de compras, menú y chat).
// GET /api/asistente/prediccion?fecha=AAAA-MM-DD
//   fecha: el día local del navegador; se predicen los 7 días siguientes.
const express  = require('express')
const router   = express.Router()
const auth     = require('../middleware/auth')
const Venta    = require('../models/Venta')
const Producto = require('../models/Producto')
const Ingrediente = require('../models/Ingrediente')
const { responderError } = require('../utils/security')
const P = require('../utils/prediccion')
const { calcularListaCompras } = require('../utils/listaCompras')
const { analizarMenu } = require('../utils/menu')
const Categoria = require('../models/Categoria')

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const HORIZONTE   = 7
const TTL_MS      = 10 * 60_000

// El cálculo recorre todo el historial: se guarda 10 minutos por restaurante y día
const cache = new Map()
function deCache(clave) {
  const c = cache.get(clave)
  if (c && Date.now() - c.t < TTL_MS) return c.datos
  cache.delete(clave)
  return null
}
function aCache(clave, datos) {
  if (cache.size > 500) cache.delete(cache.keys().next().value)
  cache.set(clave, { t: Date.now(), datos })
}

const etiqueta = dia => { const iso = P.isoDe(dia); return `${DIAS_SEMANA[P.dowDe(dia)]} ${+iso.slice(8, 10)}` }

async function calcularPrediccion(uid, hoy) {
  const desde = new Date((hoy - 400) * P.DIA_MS)   // ~13 meses de historia alcanzan
  const [ventas, productos] = await Promise.all([
    Venta.find({ usuario: uid, estado: { $ne: 'en_curso' }, createdAt: { $gte: desde } }).select('inicio cierre items').lean(),
    Producto.find({ usuario: uid }).select('nombre precio').lean(),
  ])
  const conocidos = new Set(productos.map(p => p.nombre.trim()))
  const series = P.armarSeries(ventas, conocidos)
  // Precio actual del producto si existe; si no, el último precio vendido
  for (const p of productos) if (p.precio > 0) series.ultimoPrecio.set(p.nombre.trim(), p.precio)

  const historialDias = series.primerDia == null ? 0 : hoy - series.primerDia
  if (historialDias < 21) {
    return { suficiente: false, historialDias, minimoDias: 21 }
  }

  const feriado = P.aprenderFactorFeriado(series, hoy)
  const ev = P.evaluar(series, hoy, feriado.factor)
  const rangoBajo = ev?.rangoBajo ?? 0.75
  const rangoAlto = ev?.rangoAlto ?? 1.25
  const objetivos = Array.from({ length: HORIZONTE }, (_, i) => hoy + 1 + i)
  const pred = P.predecir(series, hoy, objetivos, feriado.factor)

  // Últimos 7 días reales (incluye hoy, que puede estar incompleto)
  const facturacionDia = new Map(), ticketsDia = new Map()
  for (const v of ventas) {
    const dia = P.diaDeTexto(v.inicio || v.cierre)
    if (dia == null || dia < hoy - 6 || dia > hoy) continue
    facturacionDia.set(dia, (facturacionDia.get(dia) || 0) + (v.items || []).reduce((s, i) => s + (i.precio || 0) * (i.cantidad || 0), 0))
    ticketsDia.set(dia, (ticketsDia.get(dia) || 0) + 1)
  }
  const historico = Array.from({ length: 7 }, (_, i) => hoy - 6 + i).map(dia => ({
    fecha: P.isoDe(dia), label: dia === hoy ? 'Hoy' : etiqueta(dia), hoy: dia === hoy,
    ventas: Math.round(facturacionDia.get(dia) || 0), tickets: ticketsDia.get(dia) || 0,
  }))

  const dias = pred.dias.map(d => {
    // Redondeado a miles: una predicción con centavos aparenta una precisión que no tiene
    const mil = x => Math.round(x / 1000) * 1000
    const esperado = mil(d.facturacion)
    return {
      fecha: P.isoDe(d.dia), label: d.dia === hoy + 1 ? 'Mañana' : etiqueta(d.dia), diaSemana: DIAS_SEMANA[P.dowDe(d.dia)],
      cerrado: d.cerrado, feriado: d.feriado,
      ventas: { esperado, min: mil(d.facturacion * rangoBajo), max: mil(d.facturacion * rangoAlto) },
      tickets: Math.round(d.tickets),
    }
  })

  // Tabla por plato: los más vendidos de la semana, con la cantidad de cada día
  const totalPlato = new Map()
  for (const d of pred.dias) for (const [n, q] of d.platos) totalPlato.set(n, (totalPlato.get(n) || 0) + q)
  const platos = [...totalPlato.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, total]) => ({
    nombre,
    total: Math.round(total),
    precio: series.ultimoPrecio.get(nombre) || 0,
    porDia: pred.dias.map(d => {
      const q = d.platos.get(nombre) || 0
      return { cantidad: Math.round(q), q, min: Math.max(0, Math.floor(q - 1.28 * Math.sqrt(q))), max: Math.ceil(q + 1.28 * Math.sqrt(q)) }
    }),
  }))

  // Proporción de porciones "Grande" por plato (últimas 8 semanas), para la lista de compras
  const grandes = new Map()
  for (const v of ventas) {
    const dia = P.diaDeTexto(v.inicio || v.cierre)
    if (dia == null || dia < hoy - 56) continue
    for (const it of v.items || []) {
      const base = P.nombreBase(it.nombre, conocidos)
      const g = grandes.get(base) || { total: 0, grande: 0 }
      g.total += it.cantidad || 0
      if (/\bgrande\b/i.test(it.nombre)) g.grande += it.cantidad || 0
      grandes.set(base, g)
    }
  }
  const proporcionGrande = Object.fromEntries([...grandes].filter(([, g]) => g.grande > 0).map(([n, g]) => [n, g.grande / g.total]))

  const pct = x => (x == null ? null : Math.round(x * 1000) / 10)
  return {
    suficiente: true,
    proporcionGrande,
    hoy: P.isoDe(hoy),
    historico, dias, platos,
    precision: ev && {
      diasEvaluados: ev.dias,
      errorPorPlatoDia: pct(ev.wapePlatos), errorPorPlatoDiaSimple: pct(ev.wapePlatosSimple),
      errorPorPlatoSemana: pct(ev.wapeSemana), errorPorPlatoSemanaSimple: pct(ev.wapeSemanaSimple),
      errorTotalDia: pct(ev.wapeDia), errorTotalDiaSimple: pct(ev.wapeDiaSimple),
      rango: [Math.round(rangoBajo * 100) / 100, Math.round(rangoAlto * 100) / 100],
    },
    factores: {
      crecimientoSemanal: Math.round((pred.g - 1) * 1000) / 10,       // % por semana
      feriado: Math.round((feriado.factor - 1) * 100),               // % extra en feriados
      feriadosObservados: feriado.muestras,
      diasCerrados: [...pred.cerrados].map(d => DIAS_SEMANA[d]),
      historialDias,
    },
  }
}

router.get('/prediccion', auth, async (req, res) => {
  try {
    const f = String(req.query.fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const ahora = new Date()
    const hoy = f ? P.diaAbs(+f[1], +f[2], +f[3]) : P.diaAbs(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate())
    if (!Number.isFinite(hoy)) return res.status(400).json({ message: 'Fecha inválida' })
    const clave = `${req.propietarioId}|${hoy}`
    let datos = deCache(clave)
    if (!datos) { datos = await calcularPrediccion(req.propietarioId, hoy); aCache(clave, datos) }
    res.json(datos)
  } catch (e) {
    return responderError(req, res, e)
  }
})

// GET /api/asistente/lista-compras?fecha=AAAA-MM-DD&dias=1..7&margen=0..50 (porcentaje)
router.get('/lista-compras', auth, async (req, res) => {
  try {
    const f = String(req.query.fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const ahora = new Date()
    const hoy = f ? P.diaAbs(+f[1], +f[2], +f[3]) : P.diaAbs(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate())
    if (!Number.isFinite(hoy)) return res.status(400).json({ message: 'Fecha inválida' })
    const dias   = Math.min(7, Math.max(1, parseInt(req.query.dias, 10) || 7))
    const margen = Math.min(50, Math.max(0, Number(req.query.margen ?? 10) || 0)) / 100

    const clave = `${req.propietarioId}|${hoy}`
    let pred = deCache(clave)
    if (!pred) { pred = await calcularPrediccion(req.propietarioId, hoy); aCache(clave, pred) }
    if (!pred.suficiente) return res.json(pred)

    const [productos, ingredientes] = await Promise.all([
      Producto.find({ usuario: req.propietarioId }).select('nombre receta').lean(),
      Ingrediente.find({ usuario: req.propietarioId }).select('nombre unidad stockActual merma costo categoria').lean(),
    ])
    res.json({ suficiente: true, ...calcularListaCompras(pred, productos, ingredientes, { dias, margen }) })
  } catch (e) {
    return responderError(req, res, e)
  }
})

// GET /api/asistente/menu?fecha=AAAA-MM-DD&dias=30|60|90
router.get('/menu', auth, async (req, res) => {
  try {
    const f = String(req.query.fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const ahora = new Date()
    const hoy = f ? P.diaAbs(+f[1], +f[2], +f[3]) : P.diaAbs(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate())
    if (!Number.isFinite(hoy)) return res.status(400).json({ message: 'Fecha inválida' })
    const dias = [30, 60, 90].includes(Number(req.query.dias)) ? Number(req.query.dias) : 30
    const uid = req.propietarioId

    const [ventasRaw, productos, categorias, ingredientes] = await Promise.all([
      Venta.find({ usuario: uid, estado: { $ne: 'en_curso' }, createdAt: { $gte: new Date((hoy - dias - 2) * P.DIA_MS) } }).select('inicio cierre items').lean(),
      Producto.find({ usuario: uid }).select('nombre precio costo categoria receta activo').lean(),
      Categoria.find({ usuario: uid }).select('nombre').lean(),
      Ingrediente.find({ usuario: uid }).select('nombre unidad costo merma').lean(),
    ])
    // Período: los últimos "dias" días completos (sin hoy)
    const ventas = ventasRaw.filter(v => { const d = P.diaDeTexto(v.inicio || v.cierre); return d != null && d >= hoy - dias && d < hoy })
    res.json({
      desde: P.isoDe(hoy - dias), hasta: P.isoDe(hoy - 1), dias,
      ventasAnalizadas: ventas.length,
      categorias: analizarMenu(ventas, productos, categorias, ingredientes, P.nombreBase),
    })
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
module.exports.calcularPrediccion = calcularPrediccion
