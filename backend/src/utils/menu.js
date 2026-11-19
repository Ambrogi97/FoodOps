// Ingeniería de menú (método de Kasavana y Smith, 1982).
//
// Para cada categoría de la carta (se comparan pizzas con pizzas, bebidas con bebidas):
//   • Margen de contribución de un plato = precio actual − costo actual.
//     El costo se calcula desde la receta (cantidad ÷ (1 − merma) × costo del ingrediente),
//     así refleja los precios de hoy; si no hay receta se usa el costo cargado a mano.
//   • Popular   ⇔ unidades vendidas ≥ 70% del promedio de la categoría (1/N × 70%).
//   • Rentable  ⇔ margen ≥ margen promedio de la categoría ponderado por unidades vendidas.
//   Estrella = popular y rentable · Caballo = popular, poco rentable
//   Enigma   = poco popular, rentable · Perro = poco popular, poco rentable
//
// Los consejos son reglas fijas (no usan IA) con los números de cada plato.

const { convertir } = require('./listaCompras')

const CLASES = {
  estrella: { nombre: 'Estrella' },
  caballo:  { nombre: 'Caballo de batalla' },
  enigma:   { nombre: 'Enigma' },
  perro:    { nombre: 'Perro' },
}

const fmt = n => '$' + Math.round(n).toLocaleString('es-AR')
const redondearPrecio = n => Math.ceil(n / 100) * 100

// Costo de una unidad del plato según su receta. Devuelve también el ingrediente que más pesa.
function costoReceta(producto, ingPorId) {
  let total = 0, principal = null, completa = true
  for (const r of producto.receta || []) {
    const ing = ingPorId.get(String(r.ingredienteId))
    if (!ing || !(r.cantNeta > 0)) continue
    const neta = convertir(r.cantNeta, r.unidad, ing.unidad)
    if (neta == null || !(ing.costo > 0)) { completa = false; continue }
    const merma = Math.min(90, Math.max(0, ing.merma || 0)) / 100
    const c = neta / (1 - merma) * ing.costo
    total += c
    if (!principal || c > principal.costo) principal = { nombre: ing.nombre, costo: c }
  }
  return { total, principal, completa }
}

function consejo(p, cat) {
  const margenProm = cat.margenPromedio
  switch (p.clase) {
    case 'estrella':
      return `Se vende bien (${p.cantidad} en el período; para ser popular en ${cat.nombre.toLowerCase()} alcanza con ${Math.ceil(cat.umbralPopularidad)}) ` +
        `y deja más margen que el promedio (${fmt(p.margen)} contra ${fmt(margenProm)}). ` +
        'Mantené la receta y la porción, dejalo bien visible en la carta y en la carta online. ' +
        'Como se vende mucho, aguanta un aumento chico: probá subirlo un 3–5% y mirá si las ventas se mantienen.'
    case 'caballo': {
      const subir = redondearPrecio(margenProm - p.margen)
      const ing = p.ingredientePrincipal
      return `Se vende mucho (${p.cantidad} en el período) pero deja ${fmt(p.margen)} por unidad, menos que el promedio de ${fmt(margenProm)}. ` +
        `Para llevarlo al margen promedio habría que subirlo unos ${fmt(subir)} (a ${fmt(redondearPrecio(p.precio + subir))}). ` +
        (ing ? `Otra opción es bajar el costo: ${ing.nombre.toLowerCase()} es el ${ing.pct}% de lo que cuesta hacerlo; revisá la porción o el proveedor. ` : '') +
        'También sirve venderlo en combo con algo de buen margen (una bebida o un postre).'
    }
    case 'enigma':
      return `Deja buen margen (${fmt(p.margen)}, más que el promedio de ${fmt(margenProm)}) pero se pide poco: ${p.cantidad} en el período, ` +
        `cuando un plato "popular" de esta categoría vende al menos ${Math.ceil(cat.umbralPopularidad)}. ` +
        'Hacelo más visible: ponelo arriba en la carta online con una buena foto, que el mozo lo sugiera o armá una promo de un día. ' +
        'Si con eso no despega, puede que el precio asuste: probá bajarlo un poco.'
    default:
      return `Se vende poco (${p.cantidad}) y deja menos margen que el promedio (${fmt(p.margen)} contra ${fmt(margenProm)}). ` +
        `Aporta solo el ${p.participacionVentas}% de lo que factura ${cat.nombre.toLowerCase()}. ` +
        'Conviene reformularlo (otra receta, otro precio) o sacarlo de la carta; si lo dejás, que sea porque tiene clientes fieles.'
  }
}

/**
 * @param ventas      [{ inicio, cierre, items }] del período a analizar
 * @param productos   [{ _id, nombre, precio, costo, categoria, receta, activo }]
 * @param categorias  [{ _id, nombre }]
 * @param ingredientes [{ _id, nombre, unidad, costo, merma }]
 * @param nombreBase  función para unificar variantes ("Muzzarella (Grande)" → "Muzzarella")
 */
function analizarMenu(ventas, productos, categorias, ingredientes, nombreBase) {
  const ingPorId = new Map(ingredientes.map(i => [String(i._id), i]))
  const conocidos = new Set(productos.map(p => p.nombre.trim()))
  const vendidos = new Map()                       // nombre → { cantidad, facturado }
  for (const v of ventas) {
    for (const it of v.items || []) {
      const n = nombreBase(it.nombre, conocidos)
      if (!conocidos.has(n) || !(it.cantidad > 0)) continue
      const x = vendidos.get(n) || { cantidad: 0, facturado: 0 }
      x.cantidad += it.cantidad
      x.facturado += (it.precio || 0) * it.cantidad
      vendidos.set(n, x)
    }
  }

  const resultado = []
  for (const cat of categorias) {
    const prods = productos.filter(p => String(p.categoria) === String(cat._id) && p.activo !== false && p.precio > 0)
    if (prods.length < 2) continue                 // con un solo plato no hay con qué comparar
    const filas = prods.map(p => {
      const rec = costoReceta(p, ingPorId)
      const desdeReceta = rec.total > 0
      const costo = desdeReceta ? rec.total : (p.costo || 0)
      const v = vendidos.get(p.nombre.trim()) || { cantidad: 0, facturado: 0 }
      return {
        id: String(p._id), nombre: p.nombre, precio: p.precio,
        costo: Math.round(costo), margen: Math.round(p.precio - costo),
        margenPct: Math.round((1 - costo / p.precio) * 100),
        costoConocido: costo > 0, costoDesdeReceta: desdeReceta, recetaIncompleta: desdeReceta && !rec.completa,
        ingredientePrincipal: rec.principal && rec.total > 0 ? { nombre: rec.principal.nombre, pct: Math.round(rec.principal.costo / rec.total * 100) } : null,
        cantidad: v.cantidad, facturado: Math.round(v.facturado),
      }
    })
    const totalUnidades = filas.reduce((a, f) => a + f.cantidad, 0)
    if (!totalUnidades) continue
    const totalFacturado = filas.reduce((a, f) => a + f.facturado, 0)
    const umbralPopularidad = (totalUnidades / filas.length) * 0.7
    const margenPromedio = filas.reduce((a, f) => a + f.margen * f.cantidad, 0) / totalUnidades
    const info = { nombre: cat.nombre, umbralPopularidad, margenPromedio }
    for (const f of filas) {
      const popular = f.cantidad >= umbralPopularidad
      const rentable = f.margen >= margenPromedio
      f.clase = popular ? (rentable ? 'estrella' : 'caballo') : (rentable ? 'enigma' : 'perro')
      f.claseNombre = CLASES[f.clase].nombre
      f.participacionUnidades = Math.round(f.cantidad / totalUnidades * 1000) / 10
      f.participacionVentas = totalFacturado ? Math.round(f.facturado / totalFacturado * 1000) / 10 : 0
      f.consejo = f.costoConocido ? consejo(f, info) : 'No hay costo cargado para este plato (ni receta con costos), así que no se puede calcular el margen. Cargá la receta en Productos.'
    }
    const orden = { estrella: 0, caballo: 1, enigma: 2, perro: 3 }
    filas.sort((a, b) => orden[a.clase] - orden[b.clase] || b.cantidad - a.cantidad)
    resultado.push({
      id: String(cat._id), nombre: cat.nombre,
      umbralPopularidad: Math.round(umbralPopularidad * 10) / 10,
      margenPromedio: Math.round(margenPromedio),
      totalUnidades, totalFacturado,
      resumen: Object.fromEntries(Object.keys(CLASES).map(k => [k, filas.filter(f => f.clase === k).length])),
      productos: filas,
    })
  }
  resultado.sort((a, b) => b.totalFacturado - a.totalFacturado)
  return resultado
}

module.exports = { analizarMenu, costoReceta }
