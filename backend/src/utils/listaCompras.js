// Lista de compras del Asistente.
//
//   necesidad(ingrediente) = Σ platos Σ días  unidades previstas × cantidad de la receta
//                            ÷ (1 − merma)                      ← cantidad bruta
//                            × tamaño (las "Grande" llevan 8/6 de una mediana)
//   comprar = necesidad × (1 + margen de seguridad) − stock actual   (si es > 0)
//
// También calcula hasta qué día alcanza el stock actual, para ordenar por urgencia.

const FACTOR_GRANDE = 8 / 6     // pizza grande (8 porciones) vs mediana (6)

// Convierte una cantidad de la receta a la unidad en que se compra el ingrediente
const A_BASE = { kg: ['kg', 1], g: ['kg', 0.001], l: ['l', 1], ml: ['l', 0.001], cc: ['l', 0.001] }
const norm = u => String(u || '').trim().toLowerCase()
function convertir(cant, desde, hacia) {
  const d = norm(desde) || norm(hacia), h = norm(hacia)
  if (d === h) return cant
  const a = A_BASE[d], b = A_BASE[h]
  if (a && b && a[0] === b[0]) return cant * a[1] / b[1]
  return null                                              // unidades incompatibles
}

// Redondeo práctico para comprar: unidades enteras; kg/L de a 0,5 (o 0,1 si es poco)
function redondearCompra(x, unidad) {
  if (x <= 0) return 0
  const u = norm(unidad)
  if (u === 'kg' || u === 'l') return x < 1 ? Math.ceil(x * 10) / 10 : Math.ceil(x * 2) / 2
  if (u === 'g' || u === 'ml' || u === 'cc') return Math.ceil(x / 50) * 50
  return Math.ceil(x)
}

/**
 * @param pred   respuesta de calcularPrediccion (dias[], platos[{nombre, porDia[{q}]}], proporcionGrande)
 * @param productos  [{ nombre, receta: [{ ingredienteId, cantNeta, unidad }] }]
 * @param ingredientes [{ _id, nombre, unidad, stockActual, merma, costo, categoria }]
 * @param opciones { dias: 1..7, margen: 0..1 }
 */
function calcularListaCompras(pred, productos, ingredientes, { dias = 7, margen = 0.1 } = {}) {
  const n = Math.max(1, Math.min(pred.dias.length, dias))
  const ings = new Map(ingredientes.map(i => [String(i._id), i]))
  const prodPorNombre = new Map(productos.map(p => [p.nombre.trim(), p]))

  const necesidad = new Map()       // id → { porDia: number[], aportes: Map<plato, cant> }
  const sinReceta = []
  const unidadesIncompatibles = []

  for (const plato of pred.platos) {
    const unidades = plato.porDia.slice(0, n).map(d => d.q)
    if (!unidades.some(u => u > 0)) continue
    const prod = prodPorNombre.get(plato.nombre)
    if (!prod || !prod.receta?.length) { sinReceta.push({ nombre: plato.nombre, unidades: Math.round(unidades.reduce((a, b) => a + b, 0)) }); continue }
    const tamanio = 1 + (pred.proporcionGrande?.[plato.nombre] || 0) * (FACTOR_GRANDE - 1)
    for (const r of prod.receta) {
      const ing = ings.get(String(r.ingredienteId))
      if (!ing || !(r.cantNeta > 0)) continue
      const neta = convertir(r.cantNeta, r.unidad, ing.unidad)
      if (neta == null) { unidadesIncompatibles.push({ plato: plato.nombre, ingrediente: ing.nombre, receta: r.unidad, ingredienteUnidad: ing.unidad }); continue }
      const merma = Math.min(90, Math.max(0, ing.merma || 0)) / 100
      const bruta = neta / (1 - merma) * tamanio
      const id = String(ing._id)
      if (!necesidad.has(id)) necesidad.set(id, { porDia: Array(n).fill(0), aportes: new Map() })
      const nec = necesidad.get(id)
      unidades.forEach((u, i) => { nec.porDia[i] += u * bruta })
      nec.aportes.set(plato.nombre, (nec.aportes.get(plato.nombre) || 0) + unidades.reduce((a, b) => a + b, 0) * bruta)
    }
  }

  const items = []
  for (const [id, nec] of necesidad) {
    const ing = ings.get(id)
    const total = nec.porDia.reduce((a, b) => a + b, 0)
    if (total <= 0) continue
    const stock = Math.max(0, Number(ing.stockActual) || 0)
    const faltante = total * (1 + margen) - stock
    const comprar = redondearCompra(faltante, ing.unidad)
    // ¿Hasta qué día alcanza el stock? (el primer día en que el consumo acumulado lo supera)
    let acumulado = 0, agotaDia = null
    for (let i = 0; i < n; i++) { acumulado += nec.porDia[i]; if (acumulado > stock) { agotaDia = i; break } }
    const r1 = x => Math.round(x * 100) / 100
    items.push({
      id, nombre: ing.nombre, categoria: ing.categoria || 'Varios', unidad: ing.unidad,
      stock: r1(stock), necesidad: r1(total), comprar,
      // Alcanza, pero queda menos del 20% de lo que se va a usar
      justo: comprar === 0 && stock - total * (1 + margen) < total * 0.2,
      costoUnitario: ing.costo || 0, costoEstimado: Math.round(comprar * (ing.costo || 0)),
      agota: agotaDia == null ? null : { fecha: pred.dias[agotaDia].fecha, label: pred.dias[agotaDia].label, enDias: agotaDia + 1 },
      platos: [...nec.aportes].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nombre]) => nombre),
    })
  }
  // Primero lo que se termina antes; después lo que hay que comprar; al final lo que alcanza
  items.sort((a, b) =>
    (a.agota?.enDias ?? 99) - (b.agota?.enDias ?? 99) ||
    (b.comprar > 0) - (a.comprar > 0) ||
    b.costoEstimado - a.costoEstimado ||
    a.nombre.localeCompare(b.nombre))

  return {
    dias: pred.dias.slice(0, n).map(d => ({ fecha: d.fecha, label: d.label, cerrado: d.cerrado })),
    margen,
    items,
    costoTotal: items.reduce((a, i) => a + i.costoEstimado, 0),
    sinReceta: sinReceta.sort((a, b) => b.unidades - a.unidades),
    unidadesIncompatibles,
  }
}

module.exports = { calcularListaCompras, convertir, redondearCompra }
