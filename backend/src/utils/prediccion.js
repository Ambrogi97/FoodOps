// Predicción de demanda por plato (módulo "Asistente").
//
// Método (explicable, sin librerías externas):
//   Para cada plato y para cada día a predecir se miran los mismos días de la semana
//   de las últimas semanas (p. ej. los últimos 8 sábados):
//     1. Cada observación se proyecta al día objetivo con el crecimiento semanal del
//        negocio (ventas de las últimas 4 semanas vs. las 4 anteriores).
//     2. Se promedian dando más peso a las semanas recientes (decaimiento exponencial).
//     3. Los feriados se corrigen con un factor aprendido del propio historial
//        (cuánto se vendió en feriados pasados respecto de lo esperado).
//     4. Un día de la semana sin ventas en las últimas semanas se considera cerrado.
//   La facturación esperada es Σ (unidades previstas × precio actual de cada plato).
//   El rango (mín–máx) sale del error real de las predicciones de las últimas 8
//   semanas (backtesting): el 80% de los días cayó dentro de ese rango.
//
// Todo trabaja con "días absolutos" (n° de día desde 1970) para no depender de zonas horarias.

const DIA_MS = 86_400_000

// Feriados nacionales de Argentina (inamovibles + trasladables ya fijados).
// Se pueden ampliar; más adelante el dueño podrá cargar "días especiales".
const FERIADOS = new Set([
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-03-24', '2026-04-02', '2026-04-03',
  '2026-05-01', '2026-05-25', '2026-06-15', '2026-06-20', '2026-07-09', '2026-07-10',
  '2026-08-17', '2026-10-12', '2026-11-20', '2026-11-23', '2026-12-08', '2026-12-25',
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-24', '2027-03-25', '2027-04-02',
  '2027-05-01', '2027-05-25', '2027-06-17', '2027-06-20', '2027-07-09', '2027-08-17',
  '2027-10-12', '2027-11-20', '2027-12-08', '2027-12-25',
])

const SEMANAS     = 8      // cuántos mismos-días-de-la-semana se miran
const DECAIMIENTO = 0.8    // peso de cada semana respecto de la siguiente más reciente
const DIAS_EVAL   = 56     // ventana de backtesting (8 semanas)

const diaAbs  = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DIA_MS)
const isoDe   = dia => new Date(dia * DIA_MS).toISOString().slice(0, 10)
const dowDe   = dia => new Date(dia * DIA_MS).getUTCDay()        // 0 = domingo
const esFeriado = dia => FERIADOS.has(isoDe(dia))

// "dd/mm/aaaa hh:mm" → día absoluto
function diaDeTexto(str) {
  const x = String(str || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return x ? diaAbs(+x[3], +x[2], +x[1]) : null
}

// "Muzzarella (Grande …)" → "Muzzarella": las variantes cuentan como el mismo plato
const nombreBase = n => String(n || '').replace(/\s*\(.*\)\s*$/, '').trim()

/**
 * Arma las series diarias a partir de las ventas.
 * @returns {{ porPlato: Map<string, Map<number, number>>, tickets: Map<number, number>,
 *            ultimoPrecio: Map<string, number>, primerDia: number|null }}
 */
function armarSeries(ventas) {
  const porPlato = new Map(), tickets = new Map(), ultimoPrecio = new Map(), fechaPrecio = new Map()
  let primerDia = null
  for (const v of ventas) {
    // Día "comercial": el de inicio. Una mesa del domingo que cierra a la 1 a. m.
    // es venta del domingo (si no, los lunes cerrados parecerían abiertos).
    const dia = diaDeTexto(v.inicio || v.cierre)
    if (dia == null) continue
    if (primerDia == null || dia < primerDia) primerDia = dia
    tickets.set(dia, (tickets.get(dia) || 0) + 1)
    for (const it of v.items || []) {
      const nombre = nombreBase(it.nombre)
      if (!nombre || !(it.cantidad > 0)) continue
      if (!porPlato.has(nombre)) porPlato.set(nombre, new Map())
      const serie = porPlato.get(nombre)
      serie.set(dia, (serie.get(dia) || 0) + it.cantidad)
      // Precio unitario: el más reciente visto (las variantes "Grande" no lo pisan si ya hay uno base)
      if (!fechaPrecio.has(nombre) || dia >= fechaPrecio.get(nombre)) {
        if (it.nombre === nombre || !ultimoPrecio.has(nombre)) { ultimoPrecio.set(nombre, it.precio || 0); fechaPrecio.set(nombre, dia) }
      }
    }
  }
  return { porPlato, tickets, ultimoPrecio, primerDia }
}

const suma = (serie, desde, hasta) => { let s = 0; for (let d = desde; d <= hasta; d++) s += serie.get(d) || 0; return s }

// Crecimiento semanal del negocio visto desde "corte" (datos < corte)
function crecimientoSemanal(totalDiario, corte) {
  const ult = suma(totalDiario, corte - 28, corte - 1)
  const ant = suma(totalDiario, corte - 56, corte - 29)
  if (ult <= 0 || ant <= 0) return 1
  return Math.min(1.08, Math.max(0.93, Math.pow(ult / ant, 1 / 4)))
}

// Días de la semana cerrados: sin ninguna venta en las últimas 6 semanas
function diasCerrados(totalDiario, corte) {
  const cerrados = new Set()
  for (let dow = 0; dow < 7; dow++) {
    let vistos = 0, conVentas = 0
    for (let d = corte - 1; d >= corte - 42; d--) if (dowDe(d) === dow) { vistos++; if ((totalDiario.get(d) || 0) > 0) conVentas++ }
    if (vistos >= 3 && conVentas === 0) cerrados.add(dow)
  }
  return cerrados
}

// Predicción "base" de una serie para el día objetivo, usando solo datos < corte
function predecirSerie(serie, objetivo, corte, g, factorFeriado, primerDia) {
  let num = 0, den = 0, w = 1
  for (let d = objetivo - 7, k = 0; k < SEMANAS; d -= 7) {
    if (d >= corte) continue
    if (primerDia != null && d < primerDia) break
    let x = serie.get(d) || 0
    if (esFeriado(d)) x /= factorFeriado                     // un feriado pasado no infla la base
    const semanas = (objetivo - d) / 7
    num += w * x * Math.pow(g, semanas)
    den += w
    w *= DECAIMIENTO
    k++
  }
  if (!den) return 0
  return (num / den) * (esFeriado(objetivo) ? factorFeriado : 1)
}

/**
 * Predice todos los platos para los días indicados, con información solo anterior a "corte".
 * @returns {{ dias: Array<{dia, cerrado, feriado, platos: Map<string, number>, tickets, facturacion}>, g, factorFeriado, cerrados }}
 */
function predecir(series, corte, diasObjetivo, factorFeriado = 1.25) {
  const { porPlato, tickets, ultimoPrecio, primerDia } = series
  const g = crecimientoSemanal(tickets, corte)
  const cerrados = diasCerrados(tickets, corte)
  const dias = diasObjetivo.map(dia => {
    const cerrado = cerrados.has(dowDe(dia))
    const platos = new Map()
    let facturacion = 0
    if (!cerrado) {
      for (const [nombre, serie] of porPlato) {
        const q = predecirSerie(serie, dia, corte, g, factorFeriado, primerDia)
        if (q > 0.05) { platos.set(nombre, q); facturacion += q * (ultimoPrecio.get(nombre) || 0) }
      }
    }
    return {
      dia, cerrado, feriado: esFeriado(dia), platos, facturacion,
      tickets: cerrado ? 0 : predecirSerie(tickets, dia, corte, g, factorFeriado, primerDia),
    }
  })
  return { dias, g, factorFeriado, cerrados }
}

// Unidades reales vendidas en un día (todos los platos) — no depende de la inflación
function unidadesReales(series, dia) {
  let s = 0
  for (const serie of series.porPlato.values()) s += serie.get(dia) || 0
  return s
}
const totalUnidades = platos => { let s = 0; for (const q of platos.values()) s += q; return s }

/**
 * Aprende cuánto suben (o bajan) las ventas en feriado: unidades reales del feriado
 * dividido lo que el modelo esperaba sin feriado. Devuelve 1.25 si no hay historial.
 */
function aprenderFactorFeriado(series, hasta) {
  const ratios = []
  for (const iso of FERIADOS) {
    const [y, m, d] = iso.split('-').map(Number)
    const dia = diaAbs(y, m, d)
    if (dia >= hasta || series.primerDia == null || dia < series.primerDia + 28) continue
    const real = unidadesReales(series, dia)
    if (!real) continue                                       // feriado en día cerrado
    const esperado = totalUnidades(predecir(series, dia, [dia], 1).dias[0].platos)
    if (esperado > 0) ratios.push(real / esperado)
  }
  // Con pocos feriados el promedio es ruidoso: se lo "tira" hacia 1.25 como si
  // hubiera 3 feriados más con ese valor (promedio con prior).
  const PRIOR = 1.25, PESO_PRIOR = 3
  const factor = (ratios.reduce((a, b) => a + b, 0) + PRIOR * PESO_PRIOR) / (ratios.length + PESO_PRIOR)
  return { factor: Math.min(1.6, Math.max(0.8, factor)), muestras: ratios.length }
}

/**
 * Backtesting: para cada día de las últimas 8 semanas se predice con los datos de
 * hasta el día anterior y se compara con lo que realmente se vendió, plato por plato.
 * Métrica: WAPE = Σ|real − predicho| / Σ real, en unidades de cada plato.
 * Se compara contra el método simple "igual que el mismo día de la semana pasada".
 */
function evaluar(series, hoy, factorFeriado) {
  const filas = []
  let errModelo = 0, errSimple = 0, totalReal = 0
  for (let dia = hoy - DIAS_EVAL; dia < hoy; dia++) {
    if (series.primerDia == null || dia < series.primerDia + 28) continue
    const p = predecir(series, dia, [dia], factorFeriado).dias[0]
    if (p.cerrado) continue
    const real = unidadesReales(series, dia)
    if (!real) continue
    for (const [nombre, serie] of series.porPlato) {
      const r = serie.get(dia) || 0
      errModelo += Math.abs(r - (p.platos.get(nombre) || 0))
      errSimple += Math.abs(r - (serie.get(dia - 7) || 0))
      totalReal += r
    }
    filas.push({ dia, real, pred: totalUnidades(p.platos), simple: unidadesReales(series, dia - 7) })
  }
  if (!filas.length || !totalReal) return null
  const sumReal = filas.reduce((a, f) => a + f.real, 0)

  // Error por plato en bloques de 7 días: es el que importa para la lista de compras
  // (se compra para varios días, no para uno solo).
  let errSem = 0, errSemSimple = 0, realSem = 0
  for (let i = 0; i + 7 <= filas.length; i += 7) {
    const bloque = filas.slice(i, i + 7).map(f => f.dia)
    const predBloque = new Map()
    for (const dia of bloque) {
      const p = predecir(series, dia, [dia], factorFeriado).dias[0]
      for (const [n, q] of p.platos) predBloque.set(n, (predBloque.get(n) || 0) + q)
    }
    for (const [nombre, serie] of series.porPlato) {
      let r = 0, s = 0
      for (const dia of bloque) { r += serie.get(dia) || 0; s += serie.get(dia - 7) || 0 }
      errSem += Math.abs(r - (predBloque.get(nombre) || 0)); errSemSimple += Math.abs(r - s); realSem += r
    }
  }
  // Rango 80%: percentiles 10 y 90 del cociente real / predicción del total del día
  const ratios = filas.filter(f => f.pred > 0).map(f => f.real / f.pred).sort((a, b) => a - b)
  const q = p => ratios[Math.min(ratios.length - 1, Math.max(0, Math.round(p * (ratios.length - 1))))]
  return {
    dias: filas.length,
    wapePlatos: errModelo / totalReal,                 // error por plato (lo que importa para comprar)
    wapePlatosSimple: errSimple / totalReal,
    wapeSemana: realSem ? errSem / realSem : null,          // error por plato sumando 7 días
    wapeSemanaSimple: realSem ? errSemSimple / realSem : null,
    wapeDia: filas.reduce((a, f) => a + Math.abs(f.real - f.pred), 0) / sumReal,      // error del total del día
    wapeDiaSimple: filas.reduce((a, f) => a + Math.abs(f.real - f.simple), 0) / sumReal,
    rangoBajo: q(0.1), rangoAlto: q(0.9), filas,
  }
}

module.exports = {
  FERIADOS, DIA_MS, diaAbs, isoDe, dowDe, esFeriado, diaDeTexto, nombreBase,
  armarSeries, predecir, aprenderFactorFeriado, evaluar,
}
