// Herramientas de solo lectura que el chat del Asistente le ofrece a Gemini.
// Cada una devuelve datos agregados del restaurante (nunca datos personales de clientes).

const Venta        = require('../models/Venta')
const Gasto        = require('../models/Gasto')
const Ingrediente  = require('../models/Ingrediente')
const Mesa         = require('../models/Mesa')
const CategoriaGasto = require('../models/CategoriaGasto')
const P = require('./prediccion')

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const r0 = n => Math.round(n || 0)

const DEFINICIONES = [
  {
    name: 'resumen_ventas',
    description: 'Totales de ventas en un rango de fechas: facturación, cantidad de ventas, ticket promedio, personas, ventas por día de la semana, por hora, por medio de pago y por origen (salón, mostrador, delivery). Usala para preguntas sobre cuánto se vendió.',
    parameters: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'Fecha inicial AAAA-MM-DD (inclusive)' },
        hasta: { type: 'string', description: 'Fecha final AAAA-MM-DD (inclusive)' },
      },
      required: ['desde', 'hasta'],
    },
  },
  {
    name: 'ventas_por_producto',
    description: 'Unidades vendidas y facturación de cada producto en un rango de fechas, ordenado de mayor a menor. Se puede filtrar por parte del nombre.',
    parameters: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'Fecha inicial AAAA-MM-DD' },
        hasta: { type: 'string', description: 'Fecha final AAAA-MM-DD' },
        buscar: { type: 'string', description: 'Opcional: texto a buscar en el nombre del producto' },
      },
      required: ['desde', 'hasta'],
    },
  },
  {
    name: 'prediccion_demanda',
    description: 'Predicción de FoodOps para los próximos 7 días: facturación esperada con rango, cantidad de ventas, platos más pedidos por día, feriados, días cerrados y la precisión medida del modelo.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'lista_compras',
    description: 'Qué ingredientes hay que comprar para los próximos días según la predicción, las recetas, la merma y el stock actual, con costo estimado y qué día se termina cada uno.',
    parameters: {
      type: 'object',
      properties: {
        dias: { type: 'integer', description: 'Para cuántos días comprar (1 a 7). Por defecto 4.' },
        margen: { type: 'integer', description: 'Margen de seguridad en % (0 a 50). Por defecto 10.' },
      },
    },
  },
  {
    name: 'analisis_menu',
    description: 'Ingeniería de menú (Kasavana y Smith) por categoría: precio, costo, margen, unidades vendidas, grupo (estrella, caballo de batalla, enigma, perro) y un consejo para cada plato.',
    parameters: {
      type: 'object',
      properties: {
        dias: { type: 'integer', description: 'Período a analizar: 30, 60 o 90 días. Por defecto 30.' },
        categoria: { type: 'string', description: 'Opcional: nombre de la categoría (p. ej. Pizzas)' },
      },
    },
  },
  {
    name: 'stock_ingredientes',
    description: 'Stock actual, stock mínimo, unidad, costo y merma de cada ingrediente.',
    parameters: {
      type: 'object',
      properties: { solo_bajos: { type: 'boolean', description: 'true para ver solo los que están en o debajo del mínimo' } },
    },
  },
  {
    name: 'resumen_gastos',
    description: 'Gastos en un rango de fechas: total y por categoría, y cuánto queda por pagar.',
    parameters: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'Fecha inicial AAAA-MM-DD' },
        hasta: { type: 'string', description: 'Fecha final AAAA-MM-DD' },
      },
      required: ['desde', 'hasta'],
    },
  },
  {
    name: 'estado_salon',
    description: 'Estado actual de las mesas: cuántas están libres, ocupadas o pidieron la cuenta, y cuánto llevan consumido.',
    parameters: { type: 'object', properties: {} },
  },
]

// "AAAA-MM-DD" → día absoluto; acota el rango a 400 días
function rango(args, hoy) {
  const dia = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? P.diaAbs(+m[1], +m[2], +m[3]) : null }
  let desde = dia(args.desde), hasta = dia(args.hasta)
  if (hasta == null) hasta = hoy
  if (desde == null) desde = hasta - 29
  if (desde > hasta) [desde, hasta] = [hasta, desde]
  if (hasta - desde > 400) desde = hasta - 400
  return { desde, hasta }
}

async function ventasEnRango(uid, desde, hasta) {
  const ventas = await Venta.find({
    usuario: uid, estado: { $ne: 'en_curso' },
    createdAt: { $gte: new Date((desde - 2) * P.DIA_MS), $lte: new Date((hasta + 3) * P.DIA_MS) },
  }).select('inicio cierre items personas tipo metodoPago').lean()
  return ventas.filter(v => { const d = P.diaDeTexto(v.inicio || v.cierre); return d != null && d >= desde && d <= hasta })
}
const totalVenta = v => (v.items || []).reduce((s, i) => s + (i.precio || 0) * (i.cantidad || 0), 0)

/**
 * @param ctx { uid, hoy, prediccion: () => Promise, listaCompras: (dias, margen) => Promise, menu: (dias) => Promise }
 */
function crearEjecutor(ctx) {
  const { uid, hoy } = ctx
  return async function ejecutar(nombre, args) {
    switch (nombre) {
      case 'resumen_ventas': {
        const { desde, hasta } = rango(args, hoy)
        const ventas = await ventasEnRango(uid, desde, hasta)
        const total = ventas.reduce((s, v) => s + totalVenta(v), 0)
        const personas = ventas.reduce((s, v) => s + (v.personas || 1), 0)
        const porDia = {}, porHora = {}, porPago = {}, porOrigen = {}
        for (const v of ventas) {
          const t = totalVenta(v)
          const d = P.diaDeTexto(v.inicio || v.cierre)
          const dn = DIAS_SEMANA[P.dowDe(d)]
          porDia[dn] = (porDia[dn] || 0) + t
          const h = String(v.inicio || '').match(/\s(\d{1,2}):/)?.[1]
          if (h) porHora[`${h}h`] = (porHora[`${h}h`] || 0) + t
          porPago[v.metodoPago || 'Efectivo'] = (porPago[v.metodoPago || 'Efectivo'] || 0) + t
          porOrigen[v.tipo || 'salon'] = (porOrigen[v.tipo || 'salon'] || 0) + t
        }
        const redondearObj = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r0(v)]))
        return {
          periodo: { desde: P.isoDe(desde), hasta: P.isoDe(hasta), dias: hasta - desde + 1 },
          facturacion: r0(total), cantidad_ventas: ventas.length,
          ticket_promedio: ventas.length ? r0(total / ventas.length) : 0,
          personas, promedio_por_persona: personas ? r0(total / personas) : 0,
          por_dia_semana: redondearObj(porDia), por_hora: redondearObj(porHora),
          por_medio_de_pago: redondearObj(porPago), por_origen: redondearObj(porOrigen),
          nota: 'Montos en pesos. El día es el de inicio de la venta.',
        }
      }
      case 'ventas_por_producto': {
        const { desde, hasta } = rango(args, hoy)
        const ventas = await ventasEnRango(uid, desde, hasta)
        const m = new Map()
        for (const v of ventas) for (const it of v.items || []) {
          const x = m.get(it.nombre) || { unidades: 0, facturacion: 0 }
          x.unidades += it.cantidad || 0; x.facturacion += (it.precio || 0) * (it.cantidad || 0)
          m.set(it.nombre, x)
        }
        const buscar = String(args.buscar || '').toLowerCase().trim()
        const lista = [...m].filter(([n]) => !buscar || n.toLowerCase().includes(buscar))
          .sort((a, b) => b[1].unidades - a[1].unidades).slice(0, 40)
          .map(([producto, x]) => ({ producto, unidades: x.unidades, facturacion: r0(x.facturacion) }))
        return { periodo: { desde: P.isoDe(desde), hasta: P.isoDe(hasta) }, productos: lista, total_productos_distintos: m.size }
      }
      case 'prediccion_demanda': {
        const pred = await ctx.prediccion()
        if (!pred.suficiente) return { aviso: `Todavía no hay suficientes ventas para predecir (hay ${pred.historialDias} días, hacen falta ${pred.minimoDias}).` }
        return {
          hoy: pred.hoy,
          dias: pred.dias.map((d, i) => ({
            fecha: d.fecha, dia: d.label, feriado: d.feriado, cerrado: d.cerrado,
            facturacion_esperada: d.ventas.esperado, minimo: d.ventas.min, maximo: d.ventas.max, ventas_esperadas: d.tickets,
            platos_mas_pedidos: pred.platos.map(p => ({ plato: p.nombre, unidades: p.porDia[i].cantidad })).filter(p => p.unidades > 0)
              .sort((a, b) => b.unidades - a.unidades).slice(0, 6),
          })),
          precision: pred.precision && {
            error_por_plato_semana_pct: pred.precision.errorPorPlatoSemana,
            error_metodo_simple_pct: pred.precision.errorPorPlatoSemanaSimple,
            dias_evaluados: pred.precision.diasEvaluados,
          },
          factores: pred.factores,
        }
      }
      case 'lista_compras': {
        const dias = Math.min(7, Math.max(1, parseInt(args.dias, 10) || 4))
        const margen = Math.min(50, Math.max(0, parseInt(args.margen ?? 10, 10) || 0))
        const l = await ctx.listaCompras(dias, margen / 100)
        if (!l.suficiente) return { aviso: 'Todavía no hay suficientes ventas para calcular la lista de compras.' }
        return {
          para: l.dias.filter(d => !d.cerrado).map(d => d.label), margen_pct: margen,
          comprar: l.items.filter(i => i.comprar > 0).map(i => ({ ingrediente: i.nombre, comprar: i.comprar, unidad: i.unidad, stock: i.stock, se_usara: i.necesidad, costo_estimado: i.costoEstimado, se_termina: i.agota?.label || null })),
          justos: l.items.filter(i => i.justo).map(i => ({ ingrediente: i.nombre, stock: i.stock, se_usara: i.necesidad, unidad: i.unidad })),
          costo_total: l.costoTotal,
          platos_sin_receta: l.sinReceta.map(s => s.nombre),
        }
      }
      case 'analisis_menu': {
        const dias = [30, 60, 90].includes(Number(args.dias)) ? Number(args.dias) : 30
        const cats = await ctx.menu(dias)
        const buscar = String(args.categoria || '').toLowerCase().trim()
        const elegidas = cats.filter(c => !buscar || c.nombre.toLowerCase().includes(buscar))
        return {
          periodo_dias: dias,
          categorias: (elegidas.length ? elegidas : cats).map(c => ({
            categoria: c.nombre, margen_promedio: c.margenPromedio, minimo_para_ser_popular: Math.ceil(c.umbralPopularidad),
            platos: c.productos.map(p => ({ plato: p.nombre, grupo: p.claseNombre, vendidos: p.cantidad, precio: p.precio, costo: p.costo, margen: p.margen, margen_pct: p.margenPct, consejo: p.consejo })),
          })),
        }
      }
      case 'stock_ingredientes': {
        const ings = await Ingrediente.find({ usuario: uid }).select('nombre unidad stockActual stockMinimo costo merma categoria').lean()
        const lista = ings.filter(i => !args.solo_bajos || (i.stockActual || 0) <= (i.stockMinimo || 0))
          .map(i => ({ ingrediente: i.nombre, categoria: i.categoria, stock: i.stockActual, minimo: i.stockMinimo, unidad: i.unidad, costo_unitario: i.costo, merma_pct: i.merma }))
        return { ingredientes: lista.slice(0, 80) }
      }
      case 'resumen_gastos': {
        const { desde, hasta } = rango(args, hoy)
        const [gastos, cats] = await Promise.all([
          Gasto.find({ usuario: uid }).select('fecha importe monto categoriaId categoria estadoPago').lean(),
          CategoriaGasto.find({ usuario: uid }).select('nombre categoriaFinanciera').lean(),
        ])
        const nombreCat = new Map(cats.map(c => [String(c._id), c.nombre]))
        let total = 0, porPagar = 0
        const porCat = {}
        for (const g of gastos) {
          const d = P.diaDeTexto(g.fecha)
          if (d == null || d < desde || d > hasta) continue
          const imp = Number(g.importe || g.monto || 0)
          total += imp
          if (g.estadoPago && g.estadoPago !== 'pagado') porPagar += imp
          const c = nombreCat.get(String(g.categoriaId)) || g.categoria || 'Sin categoría'
          porCat[c] = (porCat[c] || 0) + imp
        }
        return {
          periodo: { desde: P.isoDe(desde), hasta: P.isoDe(hasta) }, total: r0(total), pendiente_de_pago: r0(porPagar),
          por_categoria: Object.fromEntries(Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r0(v)])),
        }
      }
      case 'estado_salon': {
        const mesas = await Mesa.find({ usuario: uid }).select('numero estado personas items').lean()
        const cuenta = e => mesas.filter(m => m.estado === e).length
        return {
          total_mesas: mesas.length, libres: cuenta('libre'), ocupadas: cuenta('ocupada'), pidieron_la_cuenta: cuenta('cuenta'),
          personas_sentadas: mesas.filter(m => m.estado !== 'libre').reduce((s, m) => s + (m.personas || 0), 0),
          consumo_abierto: r0(mesas.filter(m => m.estado !== 'libre').reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.precio || 0) * (i.cantidad || 0), 0), 0)),
        }
      }
      default:
        return { error: `Herramienta desconocida: ${nombre}` }
    }
  }
}

module.exports = { DEFINICIONES, crearEjecutor }
