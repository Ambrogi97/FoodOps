// Pantalla de Inicio: un resumen del local calculado en el servidor, en una sola consulta.
// GET /api/inicio?fecha=AAAA-MM-DD&periodo=hoy|semana|mes
//   fecha: el día del navegador (las ventas guardan la hora local del restaurante,
//          así se evita depender de la zona horaria del servidor).
const express      = require('express')
const router       = express.Router()
const auth         = require('../middleware/auth')
const Venta        = require('../models/Venta')
const Gasto        = require('../models/Gasto')
const Mesa         = require('../models/Mesa')
const PedidoOnline = require('../models/PedidoOnline')
const ConfigTienda = require('../models/ConfigTienda')
const Role         = require('../models/Role')
const { responderError } = require('../utils/security')

const DIA_MS = 86_400_000

// "dd/mm/aaaa hh:mm" → { dia (n° de día absoluto), y, m, d, hora }
function leerFecha(str) {
  const x = String(str || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):\d{2})?/)
  if (!x) return null
  const y = +x[3], m = +x[2], d = +x[1]
  return { y, m, d, dia: Math.round(Date.UTC(y, m - 1, d) / DIA_MS), hora: x[4] != null ? +x[4] : null }
}
const diaDe   = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DIA_MS)
const ymdDe   = dia => { const f = new Date(dia * DIA_MS); return { y: f.getUTCFullYear(), m: f.getUTCMonth() + 1, d: f.getUTCDate() } }
const mesIdx  = (y, m) => y * 12 + (m - 1)              // n° de mes absoluto
const diasMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const totalV  = v => (v.items || []).reduce((s, i) => s + (i.precio || 0) * (i.cantidad || 0), 0)
const importe = g => Number(g.importe || g.monto || 0)

// Qué partes puede ver el usuario (el dueño ve todo)
async function permisosInicio(req) {
  const todo = { ventas: true, gastos: true, salon: true, online: true }
  if (!req.usuario.cuentaPadreId) return todo
  const role = await Role.findOne({ propietarioId: req.usuario.cuentaPadreId, key: req.usuario.role }).select('permisos').lean()
  const p = new Set(role?.permisos || [])
  const alguno = (...xs) => xs.some(x => p.has(x))
  return {
    ventas: alguno('Ver Ventas', 'Ver Finanzas', 'Ver Reportes'),
    gastos: alguno('Ver Gastos', 'Ver Finanzas', 'Ver Reportes'),
    salon:  alguno('Ver Restaurante'),
    online: alguno('Ver Carta Online'),
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const periodo = ['hoy', 'semana', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'hoy'
    const f = String(req.query.fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const ahora = new Date()
    const H = f ? { y: +f[1], m: +f[2], d: +f[3] } : { y: ahora.getFullYear(), m: ahora.getMonth() + 1, d: ahora.getDate() }
    const hoy = diaDe(H.y, H.m, H.d)
    if (!Number.isFinite(hoy)) return res.status(400).json({ message: 'Fecha inválida' })
    const mesHoy = mesIdx(H.y, H.m)

    const uid = req.propietarioId
    const ver = await permisosInicio(req)

    // Rango actual y anterior de cada período (en días absolutos, ambos inclusive)
    //   hoy    → hoy        vs. el mismo día de la semana pasada
    //   semana → últimos 7  vs. los 7 anteriores
    //   mes    → 1..hoy     vs. 1..mismo día del mes pasado
    let actual, anterior
    if (periodo === 'hoy') { actual = [hoy, hoy]; anterior = [hoy - 7, hoy - 7] }
    else if (periodo === 'semana') { actual = [hoy - 6, hoy]; anterior = [hoy - 13, hoy - 7] }
    else {
      const pm = H.m === 1 ? { y: H.y - 1, m: 12 } : { y: H.y, m: H.m - 1 }
      actual   = [diaDe(H.y, H.m, 1), hoy]
      anterior = [diaDe(pm.y, pm.m, 1), diaDe(pm.y, pm.m, Math.min(H.d, diasMes(pm.y, pm.m)))]
    }
    const en = (dia, [a, b]) => dia >= a && dia <= b

    // Mini gráficos: 7 barras (días, semanas o meses) que terminan en el período actual
    const barraDe = dia => {
      if (periodo === 'hoy')    return 6 - (hoy - dia)
      if (periodo === 'semana') return 6 - Math.floor((hoy - dia) / 7)
      const { y, m } = ymdDe(dia); return 6 - (mesHoy - mesIdx(y, m))
    }

    // Se leen solo los registros de los últimos ~8 meses
    const desde = new Date(Date.UTC(H.y, H.m - 9, 1))
    const respuesta = { periodo, permisos: ver }

    const [ventas, gastos, mesas, pedidos, config] = await Promise.all([
      ver.ventas ? Venta.find({ usuario: uid, estado: { $ne: 'en_curso' }, createdAt: { $gte: desde } }).select('inicio cierre items personas').lean() : [],
      ver.gastos ? Gasto.find({ usuario: uid, createdAt: { $gte: desde } }).select('fecha importe monto').lean() : [],
      ver.salon  ? Mesa.find({ usuario: uid }).select('numero estado personas hora items zona').populate('zona', 'label').sort('numero').lean() : [],
      ver.online ? PedidoOnline.find({ usuario: uid, estado: { $ne: 'entregado' } }).sort('-createdAt').limit(30).lean() : [],
      ver.ventas ? ConfigTienda.findOne({ usuario: uid }).select('metaVentasMensual').lean() : null,
    ])

    if (ver.ventas) {
      const k = { ventas: [0, 0], pedidos: [0, 0], personas: [0, 0] }
      const sparkV = Array(7).fill(0), sparkN = Array(7).fill(0)
      const horaAct = {}, horaAnt = {}
      const top = {}
      let vendidoMes = 0
      for (const v of ventas) {
        const fe = leerFecha(v.cierre || v.inicio)
        if (!fe) continue
        const t = totalV(v)
        const enAct = en(fe.dia, actual), enAnt = en(fe.dia, anterior)
        if (enAct || enAnt) {
          const i = enAct ? 0 : 1
          k.ventas[i] += t; k.pedidos[i]++; k.personas[i] += v.personas || 1
          // Ventas por hora: se usa la hora de inicio (cuando se atendió)
          const hi = leerFecha(v.inicio)?.hora ?? fe.hora
          if (hi != null) { const dest = enAct ? horaAct : horaAnt; dest[hi] = (dest[hi] || 0) + t }
          if (enAct) for (const it of v.items || []) top[it.nombre] = (top[it.nombre] || 0) + (it.cantidad || 0)
        }
        const b = barraDe(fe.dia)
        if (b >= 0 && b <= 6 && fe.dia <= hoy) { sparkV[b] += t; sparkN[b]++ }
        if (mesIdx(fe.y, fe.m) === mesHoy && fe.dia <= hoy) vendidoMes += t
      }
      const ticket = i => k.pedidos[i] ? k.ventas[i] / k.pedidos[i] : 0
      respuesta.kpis = {
        ventas:   { actual: k.ventas[0],   anterior: k.ventas[1],   serie: sparkV },
        ticket:   { actual: ticket(0),     anterior: ticket(1),     serie: sparkV.map((s, i) => sparkN[i] ? s / sparkN[i] : 0) },
        pedidos:  { actual: k.pedidos[0],  anterior: k.pedidos[1],  serie: sparkN, personas: k.personas[0] },
      }

      // Horas con movimiento en cualquiera de los dos períodos, ordenadas a partir de las 6 a. m.
      const horas = [...new Set([...Object.keys(horaAct), ...Object.keys(horaAnt)].map(Number))]
        .sort((a, b) => ((a + 18) % 24) - ((b + 18) % 24))
      respuesta.porHora = horas.map(h => ({ hora: h, actual: Math.round(horaAct[h] || 0), anterior: Math.round(horaAnt[h] || 0) }))

      respuesta.top = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, cantidad]) => ({ nombre, cantidad }))

      // Objetivo del mes (siempre sobre el mes en curso)
      const totalDias = diasMes(H.y, H.m)
      const restantes = totalDias - H.d            // sin contar hoy
      const meta      = Number(config?.metaVentasMensual || 0)
      respuesta.objetivo = {
        meta, vendido: Math.round(vendidoMes),
        diasRestantes: restantes,
        promedioDiario: Math.round(vendidoMes / H.d),
        necesarioPorDia: meta > vendidoMes ? Math.round((meta - vendidoMes) / Math.max(restantes + 1, 1)) : 0,
      }
    }

    if (ver.gastos) {
      const g = [0, 0], serie = Array(7).fill(0)
      for (const x of gastos) {
        const fe = leerFecha(x.fecha)
        if (!fe) continue
        if (en(fe.dia, actual)) g[0] += importe(x)
        else if (en(fe.dia, anterior)) g[1] += importe(x)
        const b = barraDe(fe.dia)
        if (b >= 0 && b <= 6 && fe.dia <= hoy) serie[b] += importe(x)
      }
      respuesta.kpis = { ...(respuesta.kpis || {}), gastos: { actual: g[0], anterior: g[1], serie } }
    }

    if (ver.salon) {
      respuesta.salon = mesas.map(m => ({
        id: String(m._id), numero: m.numero, estado: m.estado, zona: m.zona?.label || '',
        personas: m.personas || null, hora: m.hora || null,
        total: (m.items || []).reduce((s, i) => s + (i.precio || 0) * (i.cantidad || 0), 0),
      }))
    }

    if (ver.online) {
      respuesta.online = {
        pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
        lista: pedidos.slice(0, 5).map(p => ({
          id: String(p._id), numero: p.numero, estado: p.estado, tipo: p.tipo,
          cliente: p.clienteNombre || (p.tipo === 'mesa' ? `Mesa ${p.mesaNumero}` : 'Cliente'),
          items: (p.items || []).reduce((s, i) => s + (i.cantidad || 0), 0),
          total: p.totalFinal || p.total || 0,
        })),
      }
    }

    res.json(respuesta)
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
