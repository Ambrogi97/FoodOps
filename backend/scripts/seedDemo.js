/*
 * Genera un restaurante de demostración completo (pizzería) para una cuenta existente.
 *
 *   node scripts/seedDemo.js <email-del-dueño> --confirmar          → borra los datos del restaurante y genera todo
 *   node scripts/seedDemo.js <email-del-dueño> --borrar --confirmar → solo borra los datos del restaurante
 *
 * No toca el usuario, sus sub-usuarios ni los roles. Los datos son reproducibles
 * (generador aleatorio con semilla fija): correrlo dos veces el mismo día da lo mismo.
 */
require('dotenv').config()
require('../src/config/validacion')
const dns      = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])
const crypto   = require('crypto')
const mongoose = require('mongoose')

const M = {
  User:                     require('../src/models/User'),
  Categoria:                require('../src/models/Categoria'),
  Producto:                 require('../src/models/Producto'),
  Ingrediente:              require('../src/models/Ingrediente'),
  MovimientoStock:          require('../src/models/MovimientoStock'),
  Zona:                     require('../src/models/Zona'),
  Mesa:                     require('../src/models/Mesa'),
  Venta:                    require('../src/models/Venta'),
  Gasto:                    require('../src/models/Gasto'),
  CategoriaGasto:           require('../src/models/CategoriaGasto'),
  Proveedor:                require('../src/models/Proveedor'),
  CuentaCorrienteProveedor: require('../src/models/CuentaCorrienteProveedor'),
  Cliente:                  require('../src/models/Cliente'),
  CuentaCorriente:          require('../src/models/CuentaCorriente'),
  ClienteHistorial:         require('../src/models/ClienteHistorial'),
  Descuento:                require('../src/models/Descuento'),
  PedidoOnline:             require('../src/models/PedidoOnline'),
  PedidoDelivery:           require('../src/models/PedidoDelivery'),
  PedidoMostrador:          require('../src/models/PedidoMostrador'),
  Resena:                   require('../src/models/Resena'),
  ConfigTienda:             require('../src/models/ConfigTienda'),
}
const MODELOS_DEL_RESTAURANTE = [
  'Categoria', 'Producto', 'Ingrediente', 'MovimientoStock', 'Zona', 'Mesa', 'Venta', 'Gasto',
  'CategoriaGasto', 'Proveedor', 'CuentaCorrienteProveedor', 'Cliente', 'CuentaCorriente',
  'ClienteHistorial', 'Descuento', 'PedidoOnline', 'PedidoDelivery', 'PedidoMostrador', 'Resena', 'ConfigTienda',
]

// ── Aleatorio reproducible ───────────────────────────────────────────────────
let semilla = 20261113
const rnd = () => { semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const entre  = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const elegir = (arr) => arr[Math.floor(rnd() * arr.length)]
const chance = (p) => rnd() < p
const ponderado = (pares) => { const t = pares.reduce((s, [, w]) => s + w, 0); let r = rnd() * t; for (const [v, w] of pares) { if ((r -= w) <= 0) return v } return pares[pares.length - 1][0] }
const poisson = (l) => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= rnd() } while (p > L); return k - 1 }
const redondear = (n, a = 100) => Math.round(n / a) * a

// ── Fechas (hora de Argentina, UTC-3) ────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0')
const ahoraAR = () => new Date(Date.now() - 3 * 3600_000)                 // "reloj" argentino en campos UTC
const fechaAR = (y, m, d, h = 0, min = 0) => new Date(Date.UTC(y, m, d, h + 3, min)) // instante real
const partes = (inst) => { const a = new Date(inst.getTime() - 3 * 3600_000); return { y: a.getUTCFullYear(), m: a.getUTCMonth(), d: a.getUTCDate(), h: a.getUTCHours(), min: a.getUTCMinutes(), dow: a.getUTCDay() } }
const ddmmyyyy = (inst) => { const p = partes(inst); return `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` }
const ddmmyyyyHHMM = (inst) => { const p = partes(inst); return `${pad(p.d)}/${pad(p.m + 1)}/${p.y} ${pad(p.h)}:${pad(p.min)}` }
const isoDia = (inst) => { const p = partes(inst); return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}` }
const sumarMin = (inst, min) => new Date(inst.getTime() + min * 60_000)

const FERIADOS = new Set(['2026-05-25', '2026-06-15', '2026-06-20', '2026-07-09', '2026-07-10', '2026-08-17', '2026-10-12', '2026-11-20', '2026-11-23'])

const foto = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=70`

// ── Catálogo ─────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { nombre: 'Pizzas',     areaImpresion: 'Cocina', tiempoPrepDefecto: 18 },
  { nombre: 'Empanadas',  areaImpresion: 'Cocina', tiempoPrepDefecto: 12 },
  { nombre: 'Entradas',   areaImpresion: 'Cocina', tiempoPrepDefecto: 10 },
  { nombre: 'Bebidas',    areaImpresion: 'Barra',  tiempoPrepDefecto: 2 },
  { nombre: 'Postres',    areaImpresion: 'Cocina', tiempoPrepDefecto: 5 },
]

// [nombre, unidad, costo por unidad, stock, mínimo, merma %, categoría]
const INGREDIENTES = [
  ['Harina 000',          'kg',    1150, 48,  20, 2,  'Almacén'],
  ['Levadura fresca',     'kg',    5200, 1.8, 1,  5,  'Almacén'],
  ['Aceite de oliva',     'L',     9800, 6,   3,  0,  'Almacén'],
  ['Salsa de tomate',     'kg',    2400, 14,  8,  3,  'Almacén'],
  ['Muzzarella',          'kg',    8900, 22,  15, 4,  'Lácteos'],
  ['Queso roquefort',     'kg',    16500, 2.1, 1.5, 3, 'Lácteos'],
  ['Queso provolone',     'kg',    13800, 3.5, 2,  3,  'Lácteos'],
  ['Parmesano',           'kg',    18200, 1.6, 1,  2,  'Lácteos'],
  ['Jamón cocido',        'kg',    11500, 4.2, 3,  4,  'Fiambres'],
  ['Jamón crudo',         'kg',    24500, 1.4, 1,  5,  'Fiambres'],
  ['Longaniza calabresa', 'kg',    13200, 2.6, 1.5, 3, 'Fiambres'],
  ['Pepperoni',           'kg',    16800, 1.2, 1,  3,  'Fiambres'],
  ['Carne picada',        'kg',    9400, 5,   4,  6,  'Carnes'],
  ['Pollo',               'kg',    6200, 4.5, 3,  8,  'Carnes'],
  ['Cebolla',             'kg',    900,  12,  6,  12, 'Verdulería'],
  ['Tomate',              'kg',    1900, 7,   5,  10, 'Verdulería'],
  ['Morrón',              'kg',    3600, 2.5, 2,  10, 'Verdulería'],
  ['Champiñones',         'kg',    9800, 1.1, 1,  8,  'Verdulería'],
  ['Rúcula',              'kg',    6500, 0.6, 0.8, 20, 'Verdulería'],
  ['Albahaca',            'kg',    12000, 0.3, 0.2, 25, 'Verdulería'],
  ['Papa',                'kg',    850,  18,  10, 15, 'Verdulería'],
  ['Lechuga',             'kg',    2600, 2,   1.5, 18, 'Verdulería'],
  ['Aceitunas verdes',    'kg',    7400, 2.2, 1,  0,  'Almacén'],
  ['Huevo',               'unid.', 210,  90,  60, 2,  'Almacén'],
  ['Tapas de empanada',   'unid.', 95,   260, 150, 2, 'Almacén'],
  ['Ajo',                 'kg',    5200, 1,   0.5, 10, 'Verdulería'],
  ['Coca-Cola lata',      'unid.', 650,  96,  48, 0,  'Bebidas'],
  ['Agua mineral 500 ml', 'unid.', 420,  70,  48, 0,  'Bebidas'],
  ['Cerveza tirada (L)',  'L',     2300, 60,  40, 3,  'Bebidas'],
  ['Vino tinto (botella)', 'unid.', 5400, 22,  12, 0,  'Bebidas'],
  ['Naranja',             'kg',    1300, 14,  8,  20, 'Verdulería'],
  ['Limón',               'kg',    1600, 4,   3,  15, 'Verdulería'],
  ['Helado (kg)',         'kg',    9500, 7,   4,  3,  'Lácteos'],
  ['Chocolate cobertura', 'kg',    12500, 1.8, 1, 2,  'Almacén'],
  ['Queso mascarpone',    'kg',    19500, 0.9, 1,  4,  'Lácteos'],
]

// Masa + salsa + muzza: base de casi todas las pizzas (por pizza mediana de 6 porciones)
const BASE = [['Harina 000', 0.22], ['Levadura fresca', 0.006], ['Aceite de oliva', 0.015], ['Salsa de tomate', 0.12], ['Muzzarella', 0.25]]
const TAMANIOS = [{ grupo: 'Tamaño', items: [{ label: 'Mediana (6 porciones)', precio: 0 }, { label: 'Grande (8 porciones)', precio: 4500 }] }]

// nombre, categoría, precio, peso de popularidad, receta, foto, descripción, extra
const PRODUCTOS = [
  ['Muzzarella', 'Pizzas', 13900, 30, [...BASE, ['Aceitunas verdes', 0.02]], '1541745537411-b8046dc6d66c', 'Salsa de tomate, abundante muzzarella, orégano y aceitunas.'],
  ['Fugazzeta', 'Pizzas', 15400, 20, [['Harina 000', 0.22], ['Levadura fresca', 0.006], ['Muzzarella', 0.3], ['Cebolla', 0.25], ['Aceite de oliva', 0.02]], '1588315029754-2dd089d39a1a', 'Doble masa rellena de muzzarella, cubierta de cebolla y orégano.'],
  ['Napolitana', 'Pizzas', 15200, 16, [...BASE, ['Tomate', 0.18], ['Ajo', 0.01]], '1576458088443-04a19bb13da6', 'Muzzarella, rodajas de tomate fresco, ajo y perejil.'],
  ['Jamón y morrones', 'Pizzas', 16400, 12, [...BASE, ['Jamón cocido', 0.12], ['Morrón', 0.1]], '1604382354936-07c5d9983bd3', 'Muzzarella, jamón cocido y morrones asados.'],
  ['Calabresa', 'Pizzas', 16800, 11, [...BASE, ['Longaniza calabresa', 0.12]], '1534308983496-4fabb1a015ee', 'Muzzarella y rodajas de longaniza calabresa.'],
  ['Pepperoni', 'Pizzas', 17500, 9, [...BASE, ['Pepperoni', 0.1]], '1628840042765-356cda07504e', 'Muzzarella y pepperoni crocante.'],
  ['Margherita', 'Pizzas', 15800, 8, [...BASE, ['Tomate', 0.12], ['Albahaca', 0.01]], '1600028068383-ea11a7a101f3', 'Muzzarella, tomate fresco, albahaca y aceite de oliva.'],
  ['Rúcula y crudo', 'Pizzas', 19200, 7, [...BASE, ['Jamón crudo', 0.08], ['Rúcula', 0.05], ['Parmesano', 0.02]], '1593560708920-61dd98c46a4e', 'Muzzarella, jamón crudo, rúcula fresca y lascas de parmesano.'],
  ['Champiñones', 'Pizzas', 17200, 6, [...BASE, ['Champiñones', 0.12], ['Ajo', 0.008]], '1590947132387-155cc02f3212', 'Muzzarella, champiñones salteados al ajo y tomates.'],
  ['Roquefort', 'Pizzas', 17800, 5, [...BASE, ['Queso roquefort', 0.09]], '1594007654729-407eedc4be65', 'Muzzarella y queso roquefort.'],
  ['Caprese', 'Pizzas', 16900, 5, [...BASE, ['Tomate', 0.15], ['Albahaca', 0.012]], '1595854341625-f33ee10dbf94', 'Muzzarella, tomates, albahaca y oliva.'],
  ['Especial Ambrogis', 'Pizzas', 19900, 9, [...BASE, ['Longaniza calabresa', 0.06], ['Morrón', 0.06], ['Tomate', 0.08], ['Albahaca', 0.008]], '1585238342024-78d387f4a707', 'La de la casa: calabresa, morrón asado, tomate y albahaca.'],
  ['Cuatro quesos', 'Pizzas', 18900, 6, [...BASE, ['Queso roquefort', 0.05], ['Queso provolone', 0.05], ['Parmesano', 0.03]], '1513104890138-7c749659a591', 'Muzzarella, roquefort, provolone y parmesano.'],
  ['Empanada de carne', 'Empanadas', 1900, 16, [['Tapas de empanada', 1], ['Carne picada', 0.06], ['Cebolla', 0.03], ['Huevo', 0.2]], '/img/empanadas.jpg', 'Carne cortada a cuchillo, cebolla, huevo y aceitunas. Al horno.'],
  ['Empanada de jamón y queso', 'Empanadas', 1900, 13, [['Tapas de empanada', 1], ['Jamón cocido', 0.03], ['Muzzarella', 0.04]], '/img/empanadas.jpg', 'Jamón cocido y muzzarella. Al horno.'],
  ['Empanada de pollo', 'Empanadas', 1900, 9, [['Tapas de empanada', 1], ['Pollo', 0.06], ['Cebolla', 0.03], ['Morrón', 0.01]], '/img/empanadas.jpg', 'Pollo desmenuzado con cebolla y morrón.'],
  ['Empanada de humita', 'Empanadas', 1900, 5, [['Tapas de empanada', 1], ['Muzzarella', 0.02], ['Cebolla', 0.02]], '/img/empanadas.jpg', 'Choclo cremoso con salsa blanca y queso.'],
  ['Empanada de cebolla y queso', 'Empanadas', 1900, 6, [['Tapas de empanada', 1], ['Cebolla', 0.05], ['Muzzarella', 0.04]], '/img/empanadas.jpg', 'Cebolla caramelizada y muzzarella.'],
  ['Papas fritas', 'Entradas', 6800, 9, [['Papa', 0.4], ['Aceite de oliva', 0.02]], '1573080496219-bb080dd4f877', 'Porción abundante de papas fritas caseras.'],
  ['Pan de ajo', 'Entradas', 4900, 6, [['Harina 000', 0.1], ['Ajo', 0.015], ['Aceite de oliva', 0.015]], '1619535860434-ba1d8fa12536', 'Pan casero al horno con manteca de ajo y perejil.'],
  ['Provoleta', 'Entradas', 8900, 5, [['Queso provolone', 0.2]], null, 'Provolone a la plancha con orégano y oliva.'],
  ['Ensalada mixta', 'Entradas', 6200, 4, [['Lechuga', 0.15], ['Tomate', 0.15], ['Cebolla', 0.05]], '1625944230945-1b7dd3b949ab', 'Lechuga, tomate y cebolla.'],
  ['Coca-Cola lata', 'Bebidas', 2600, 20, [['Coca-Cola lata', 1]], '1554866585-cd94860890b7', 'Lata de 354 ml.'],
  ['Agua mineral', 'Bebidas', 2000, 12, [['Agua mineral 500 ml', 1]], '1548839140-29a749e1cf4d', 'Con o sin gas, 500 ml.'],
  ['Cerveza tirada (pinta)', 'Bebidas', 4800, 18, [['Cerveza tirada (L)', 0.5]], '1535958636474-b021ee887b13', 'Rubia artesanal, pinta de 500 ml.'],
  ['Jarra de cerveza', 'Bebidas', 11500, 7, [['Cerveza tirada (L)', 1.5]], '1608270586620-248524c67de9', 'Jarra de 1,5 L para compartir.'],
  ['Copa de vino tinto', 'Bebidas', 4200, 6, [['Vino tinto (botella)', 0.2]], '1510812431401-41d2bd2722f3', 'Malbec de la casa.'],
  ['Limonada con menta', 'Bebidas', 3900, 8, [['Limón', 0.15]], '1621263764928-df1444c5e859', 'Limonada casera con menta y jengibre.'],
  ['Jugo de naranja exprimido', 'Bebidas', 4100, 5, [['Naranja', 0.5]], '1600271886742-f049cd451bba', 'Recién exprimido, 400 ml.'],
  ['Licuado de frutas', 'Bebidas', 4500, 3, [['Naranja', 0.2]], '1622597467836-f3285f2131b8', 'Banana, frutilla o durazno, con agua o leche.'],
  ['Tiramisú', 'Postres', 6900, 5, [['Queso mascarpone', 0.08], ['Huevo', 1]], '1571877227200-a0d98ea607e9', 'Receta clásica italiana con mascarpone y café.'],
  ['Brownie con helado', 'Postres', 6500, 6, [['Chocolate cobertura', 0.05], ['Helado (kg)', 0.08], ['Huevo', 1]], '1624353365286-3f8d62daad51', 'Brownie tibio con una bocha de helado de crema americana.'],
  ['Copa Ambrogis', 'Postres', 7400, 3, [['Helado (kg)', 0.15], ['Chocolate cobertura', 0.03]], '1563805042-7684c019e1cb', 'Helado de chocolate, crema, galletitas y salsa de chocolate.'],
  ['Helado (2 bochas)', 'Postres', 4600, 4, [['Helado (kg)', 0.12]], '1580915411954-282cb1b0d780', 'Elegí dos gustos.'],
  ['Flan casero', 'Postres', 4800, 4, [['Huevo', 1.5]], null, 'Con dulce de leche o crema.'],
]

const NOMBRES   = ['Martina', 'Lucas', 'Sofía', 'Mateo', 'Valentina', 'Benjamín', 'Camila', 'Joaquín', 'Lucía', 'Tomás', 'Julieta', 'Santiago', 'Florencia', 'Nicolás', 'Agustina', 'Facundo', 'Micaela', 'Franco', 'Paula', 'Ignacio', 'Carla', 'Gonzalo', 'Rocío', 'Matías', 'Antonella', 'Federico', 'Belén', 'Lautaro', 'Daniela', 'Ezequiel', 'Romina', 'Pablo', 'Natalia', 'Diego', 'Gabriela', 'Hernán', 'Victoria', 'Marcos', 'Celeste', 'Leandro']
const APELLIDOS = ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'García', 'Pérez', 'Sánchez', 'Romero', 'Díaz', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Giménez', 'Gutiérrez', 'Pereyra', 'Molina', 'Castro', 'Rojas', 'Ortiz', 'Silva', 'Sosa']
const CALLES    = ['Av. San Martín', 'Belgrano', 'Mitre', 'Sarmiento', 'Rivadavia', 'Moreno', '9 de Julio', 'Av. Libertador', 'Italia', 'España', 'Urquiza', 'Lavalle', 'Alvear', 'Pellegrini', 'Laprida']
const BARRIOS   = ['Centro', 'Norte', 'Villa Nueva', 'Los Álamos', 'Parque', 'Barrio Jardín', 'San Martín']
const COMENTARIOS_RESENA = {
  5: ['¡Espectacular! La mejor muzza de la zona.', 'Llegó calentita y rapidísimo. Volveremos a pedir.', 'Excelente atención y la fugazzeta es un 10.', 'Riquísima, masa finita y crocante.', 'Todo perfecto, como siempre.', ''],
  4: ['Muy rica, tardó un poco más de lo esperado.', 'Buena pizza, las empanadas un poco chicas.', 'Muy buena relación precio-calidad.', ''],
  3: ['Estaba bien, llegó algo tibia.', 'Correcta, nada del otro mundo.', ''],
  2: ['Tardó casi una hora y llegó fría.'],
  1: ['Se olvidaron de una parte del pedido.'],
}

async function main() {
  const [email, ...flags] = process.argv.slice(2)
  if (!email || !flags.includes('--confirmar')) {
    console.log('Uso: node scripts/seedDemo.js <email-del-dueño> [--borrar] --confirmar')
    process.exit(1)
  }
  await mongoose.connect(process.env.MONGODB_URI)
  const owner = await M.User.findOne({ email: email.toLowerCase() })
  if (!owner) throw new Error('No existe el usuario ' + email)
  if (owner.cuentaPadreId) throw new Error('El email es de un sub-usuario: usá el del dueño')
  const usuario = owner._id

  // Se conservan las suscripciones push (dispositivos del dueño)
  const configPrevia = await M.ConfigTienda.findOne({ usuario }).lean()

  // ── 0. Borrar todo lo del restaurante ──────────────────────────────────────
  for (const n of MODELOS_DEL_RESTAURANTE) await M[n].deleteMany({ usuario })
  console.log('✓ Datos anteriores del restaurante eliminados')
  if (flags.includes('--borrar')) { await mongoose.disconnect(); return }

  const conteo = {}
  // Valida cada documento con el modelo y lo inserta con las fechas que le pusimos
  async function insertar(nombre, docs) {
    const Model = M[nombre]
    const objs = []
    for (const d of docs) {
      const doc = new Model({ usuario, ...d })
      await doc.validate()
      const o = doc.toObject({ depopulate: true })
      o.createdAt = d.createdAt || o.createdAt || new Date()
      o.updatedAt = d.updatedAt || o.createdAt
      objs.push(o)
    }
    for (let i = 0; i < objs.length; i += 500) await Model.collection.insertMany(objs.slice(i, i + 500))
    conteo[nombre] = (conteo[nombre] || 0) + objs.length
    return objs
  }

  const hoy   = ahoraAR()
  const DIAS  = 183
  const inicioHistorial = fechaAR(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - DIAS)
  const alta  = sumarMin(inicioHistorial, -60 * 24 * 7) // el restaurante "se dio de alta" una semana antes

  // ── 1. Categorías, ingredientes y productos ────────────────────────────────
  const categorias = await insertar('Categoria', CATEGORIAS.map(c => ({ ...c, createdAt: alta })))
  const catId = Object.fromEntries(categorias.map(c => [c.nombre, c._id]))

  const ingredientes = await insertar('Ingrediente', INGREDIENTES.map(([nombre, unidad, costo, stockActual, stockMinimo, merma, categoria]) =>
    ({ nombre, unidad, costo, stockActual, stockMinimo, merma, categoria, controlStock: true, createdAt: alta })))
  const ing = Object.fromEntries(ingredientes.map(i => [i.nombre, i]))

  const productos = await insertar('Producto', PRODUCTOS.map(([nombre, cat, precio, , receta, img, descripcion], i) => {
    const recetaDoc = receta.map(([n, cant]) => ({ ingredienteId: ing[n]._id, cantNeta: cant, unidad: ing[n].unidad }))
    const costo = Math.round(receta.reduce((s, [n, cant]) => s + cant * ing[n].costo * (1 + ing[n].merma / 100), 0))
    return {
      nombre, categoria: catId[cat], precio, costo, descripcion, imagen: !img ? '' : img.startsWith('/') ? img : foto(img),
      codigo: i + 1, areaImpresion: cat === 'Bebidas' ? 'Barra' : 'Cocina', receta: recetaDoc,
      tiempoPrepMin: CATEGORIAS.find(c => c.nombre === cat).tiempoPrepDefecto,
      opciones: cat === 'Pizzas' ? TAMANIOS : [],
      controlStock: cat === 'Bebidas' && nombre === 'Coca-Cola lata',
      stockActual: nombre === 'Coca-Cola lata' ? 96 : 0,
      createdAt: alta,
    }
  }))
  const prod = Object.fromEntries(productos.map(p => [p.nombre, p]))
  const popularidad = Object.fromEntries(PRODUCTOS.map(p => [p[0], p[3]]))
  const deCategoria = (cat) => PRODUCTOS.filter(p => p[1] === cat).map(p => [p[0], p[3]])

  // Precio vigente en una fecha: aumentos mensuales del ~2,2%
  const factorPrecio = (inst) => { const meses = (hoy - inst) / (30.4 * 86400_000); return 1 / Math.pow(1.022, Math.max(0, Math.floor(meses))) }
  const precioEn = (nombre, inst) => redondear(prod[nombre].precio * factorPrecio(inst))

  // ── 2. Salón y mesas ───────────────────────────────────────────────────────
  const [salon, vereda] = await insertar('Zona', [
    { label: 'Salón', removible: false, createdAt: alta },
    { label: 'Vereda', removible: true, createdAt: alta },
  ])
  const mesasDocs = []
  const posSalon = [[1, 1], [3, 1], [5, 1], [7, 1], [9, 1], [1, 3], [3, 3], [5, 3], [7, 3], [9, 3], [2, 5], [5, 5], [8, 5], [10, 5]]
  posSalon.forEach(([col, row], i) => mesasDocs.push({ numero: i + 1, zona: salon._id, col, row, createdAt: alta }))
  ;[[1, 1], [3, 1], [5, 1], [7, 1], [9, 1], [11, 1]].forEach(([col, row], i) => mesasDocs.push({ numero: 15 + i, zona: vereda._id, col, row, createdAt: alta }))

  // ── 3. Clientes ────────────────────────────────────────────────────────────
  const clientes = []
  const usados = new Set()
  for (let i = 0; i < 42; i++) {
    let nombre, apellido
    do { nombre = elegir(NOMBRES); apellido = elegir(APELLIDOS) } while (usados.has(nombre + apellido))
    usados.add(nombre + apellido)
    const usuarioMail = `${nombre}.${apellido}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const origen = ponderado([['Local', 45], ['Online', 35], ['Delivery', 20]])
    clientes.push({
      nombre: `${nombre} ${apellido}`,
      email: `${usuarioMail}${entre(1, 99)}@example.com`,
      telefono: `+54 9 11 ${entre(2000, 6999)}-${entre(1000, 9999)}`,
      direccion: `${elegir(CALLES)} ${entre(100, 3800)}`,
      fechaNacimiento: `${entre(1965, 2004)}-${pad(entre(1, 12))}-${pad(entre(1, 28))}`,
      origen,
      grupo: i < 6 ? 'Cuenta corriente' : (chance(0.25) ? 'Frecuente' : ''),
      comentario: i < 6 ? 'Cliente con cuenta corriente (paga a fin de mes)' : (chance(0.1) ? 'Celíaco: avisar en cocina' : ''),
      createdAt: sumarMin(inicioHistorial, entre(0, DIAS - 10) * 1440),
    })
  }
  const clientesIns = await insertar('Cliente', clientes)

  // ── 4. Ventas del salón (6 meses) ──────────────────────────────────────────
  const ventas = []
  const mesasSalon = mesasDocs.filter(m => String(m.zona) === String(salon._id))
  const mesasVereda = mesasDocs.filter(m => String(m.zona) === String(vereda._id))
  const usoDescuentos = { 'Jubilados 10%': [0, 0, null], 'Martes de muzza': [0, 0, null], 'Cliente frecuente': [0, 0, null], 'Cortesía de la casa': [0, 0, null] }

  function armarItems(personas, turno, inst) {
    const items = {}
    const sumar = (nombre, cant = 1) => { items[nombre] = (items[nombre] || 0) + cant }
    if (turno === 'mediodia' && chance(0.45)) {
      const emp = Math.max(2, personas * entre(2, 3))
      for (let k = 0; k < emp; k++) sumar(ponderado(deCategoria('Empanadas')))
    } else {
      const pizzas = Math.max(1, Math.round(personas / 2.2 + (rnd() - 0.4)))
      for (let k = 0; k < pizzas; k++) sumar(ponderado(deCategoria('Pizzas')))
      if (chance(0.3)) for (let k = 0; k < entre(2, 4); k++) sumar(ponderado(deCategoria('Empanadas')))
    }
    if (chance(0.22)) sumar(ponderado(deCategoria('Entradas')))
    const bebidas = Math.max(1, Math.round(personas * (0.6 + rnd() * 0.5)))
    const pesosBebida = deCategoria('Bebidas').map(([n, w]) => [n, turno === 'noche' && /cerveza|vino/i.test(n) ? w * 1.6 : (turno === 'mediodia' && /cerveza|vino/i.test(n) ? w * 0.4 : w)])
    for (let k = 0; k < bebidas; k++) {
      const b = ponderado(pesosBebida)
      if (b === 'Jarra de cerveza' && personas < 3) sumar('Cerveza tirada (pinta)'); else sumar(b)
    }
    if (chance(turno === 'noche' ? 0.3 : 0.15)) for (let k = 0; k < entre(1, Math.max(1, Math.floor(personas / 2))); k++) sumar(ponderado(deCategoria('Postres')))
    return Object.entries(items).map(([nombre, cantidad]) => ({ nombre, cantidad, precio: precioEn(nombre, inst) }))
  }

  const lluvia = new Map()
  for (let d = 0; d <= DIAS; d++) {
    const dia = sumarMin(inicioHistorial, d * 1440)
    const p = partes(dia)
    if (p.dow === 1) continue                                    // lunes cerrado
    const clave = isoDia(dia)
    const llueve = chance(0.18)
    lluvia.set(clave, llueve)
    const feriado = FERIADOS.has(clave)
    const invierno = [5, 6, 7].includes(p.m)                      // junio-agosto
    const tendencia = 1 + 0.18 * (d / DIAS)                        // el restaurante crece
    const finde = p.dow === 5 || p.dow === 6
    const turnos = [
      ['mediodia', 12, 0, 15, 15, (p.dow === 0 ? 9 : finde ? 7 : 5.5)],
      ['noche',    20, 0, 23, 30, (p.dow === 6 ? 21 : p.dow === 5 ? 18 : p.dow === 0 ? 11 : 8.5)],
    ]
    for (const [turno, h0, m0, h1, m1, base] of turnos) {
      let lambda = base * tendencia * (feriado ? 1.35 : 1) * (llueve ? 0.72 : 1) * (invierno && turno === 'noche' ? 1.08 : 1)
      const n = poisson(lambda)
      for (let k = 0; k < n; k++) {
        const ini = fechaAR(p.y, p.m, p.d, h0, m0 + entre(0, (h1 - h0) * 60 + (m1 - m0)))
        const dur = entre(40, turno === 'noche' ? 110 : 75)
        const cierre = sumarMin(ini, dur)
        if (cierre > new Date()) continue
        const personas = ponderado([[1, 8], [2, 34], [3, 15], [4, 25], [5, 9], [6, 6], [8, 3]])
        const usaVereda = !llueve && !invierno && turno === 'noche' ? chance(0.35) : (!llueve && !invierno ? chance(0.2) : chance(0.03))
        const mesa = elegir(usaVereda ? mesasVereda : mesasSalon)
        const items = armarItems(personas, turno, ini)
        const metodoPago = ponderado([['Tarjeta', 42], ['Efectivo', 33], ['Transferencia', 25]])
        ventas.push({ mesa: `Mesa ${mesa.numero}`, inicio: ddmmyyyyHHMM(ini), cierre: ddmmyyyyHHMM(cierre), estado: 'cerrada', tipo: 'salon', metodoPago, personas, items, createdAt: cierre, _orden: cierre.getTime() })
        // Uso de descuentos (estadísticas)
        const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
        const desc = p.dow === 2 && chance(0.25) ? 'Martes de muzza' : chance(0.05) ? 'Jubilados 10%' : chance(0.03) ? 'Cliente frecuente' : chance(0.008) ? 'Cortesía de la casa' : null
        if (desc) {
          const u = usoDescuentos[desc]
          const monto = desc === 'Jubilados 10%' ? total * 0.1 : desc === 'Cliente frecuente' ? 2000 : desc === 'Martes de muzza' ? precioEn('Muzzarella', ini) * 0.3 : precioEn('Flan casero', ini)
          u[0]++; u[1] += Math.round(monto); u[2] = cierre
        }
      }
    }
  }
  ventas.sort((a, b) => a._orden - b._orden)
  ventas.forEach((v, i) => { v.numero = i + 1; delete v._orden })
  await insertar('Venta', ventas)

  // Mesas ocupadas ahora mismo (para que el salón se vea en uso)
  const ahora = new Date()
  const ocupadas = [[2, 4, 35], [5, 2, 20], [9, 6, 55], [12, 3, 10]]
  for (const [num, personas, haceMin] of ocupadas) {
    const m = mesasDocs.find(x => x.numero === num)
    const ini = sumarMin(ahora, -haceMin)
    const items = armarItems(personas, partes(ahora).h < 17 ? 'mediodia' : 'noche', ahora).map(it => ({ ...it, listo: haceMin > 25 ? true : chance(0.3) }))
    Object.assign(m, { estado: haceMin > 50 ? 'cuenta' : 'ocupada', hora: ddmmyyyyHHMM(ini), personas, items })
  }
  await insertar('Mesa', mesasDocs)

  // ── 5. Descuentos ──────────────────────────────────────────────────────────
  await insertar('Descuento', [
    ['Jubilados 10%', 'porcentaje', 10, 'activo'],
    ['Martes de muzza', 'porcentaje', 30, 'activo'],
    ['Cliente frecuente', 'fijo', 2000, 'activo'],
    ['Cortesía de la casa', 'sin_importe', null, 'activo'],
    ['Promo invierno (2x1 empanadas)', 'porcentaje', 50, 'inactivo'],
  ].map(([nombre, tipo, valor, estado]) => {
    const [veces, monto, ultima] = usoDescuentos[nombre] || [entre(20, 40), entre(20, 40) * 9500, fechaAR(2026, 7, 31, 22)]
    return { nombre, tipo, valor, estado, vecesUsado: veces, montoUsado: monto, ultimaVez: ultima, createdAt: alta }
  }))

  // ── 6. Configuración de la carta online ────────────────────────────────────
  const dias = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
  const horarios = (franjas) => dias.map(dia => ({ dia, habilitado: dia !== 'lun', franjas: dia === 'lun' ? [{ desde: '00:00', hasta: '23:59' }] : franjas }))
  const formasPago = [
    { nombre: 'Efectivo', descuento: 10, habilitado: true },
    { nombre: 'Transferencia', descuento: 5, habilitado: true },
    { nombre: 'Mercado Pago', descuento: 0, habilitado: true },
    { nombre: 'Tarjeta al recibir', descuento: 0, habilitado: true },
  ]
  const COSTO_ENVIO = 2500

  // ── 7. Pedidos de la carta online (últimas 7 semanas) y reseñas ────────────
  const clientesOnline = clientesIns.filter(c => c.origen !== 'Local')
  const pedidosOnline = []
  const DIAS_ONLINE = 49
  for (let d = DIAS_ONLINE; d >= 0; d--) {
    const dia = sumarMin(fechaAR(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()), -d * 1440)
    const p = partes(dia)
    if (p.dow === 1) continue
    const crecimiento = 1 + (DIAS_ONLINE - d) / DIAS_ONLINE           // la carta online va ganando clientes
    const base = (p.dow === 5 || p.dow === 6 ? 7 : p.dow === 0 ? 5 : 3) * crecimiento * (lluvia.get(isoDia(dia)) ? 1.4 : 1)
    const n = poisson(base)
    for (let k = 0; k < n; k++) {
      const noche = chance(0.8)
      const creado = fechaAR(p.y, p.m, p.d, noche ? 19 : 11, (noche ? 45 : 45) + entre(0, noche ? 230 : 200))
      if (creado > ahora) continue
      const tipo = ponderado([['delivery', 48], ['takeaway', 42], ['mesa', 10]])
      const cli = elegir(clientesOnline)
      const items = []
      const nPizzas = entre(1, 3)
      for (let j = 0; j < nPizzas; j++) {
        const nombre = ponderado(deCategoria('Pizzas'))
        const grande = chance(0.55)
        const label = grande ? 'Grande (8 porciones)' : 'Mediana (6 porciones)'
        items.push({ nombre: `${nombre} (${label})`, cantidad: 1, precio: precioEn(nombre, creado) + (grande ? redondear(4500 * factorPrecio(creado)) : 0) })
      }
      if (chance(0.35)) { const e = ponderado(deCategoria('Empanadas')); items.push({ nombre: e, cantidad: entre(3, 12), precio: precioEn(e, creado) }) }
      if (chance(0.6)) { const b = ponderado(deCategoria('Bebidas').filter(([n]) => !/tirada|Jarra|Copa/.test(n))); items.push({ nombre: b, cantidad: entre(1, 4), precio: precioEn(b, creado) }) }
      if (chance(0.15)) { const pos = ponderado(deCategoria('Postres')); items.push({ nombre: pos, cantidad: entre(1, 2), precio: precioEn(pos, creado) }) }
      const fp = ponderado([['Efectivo', 30], ['Transferencia', 25], ['Mercado Pago', 35], ['Tarjeta al recibir', 10]])
      const descuento = tipo === 'mesa' ? 0 : formasPago.find(f => f.nombre === fp).descuento
      const costoEnvio = tipo === 'delivery' ? redondear(COSTO_ENVIO * factorPrecio(creado)) : 0
      const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
      const total = subtotal + costoEnvio
      const esHoy = d === 0
      const minutos = (ahora - creado) / 60000
      const estado = !esHoy ? 'entregado' : minutos > 55 ? 'entregado' : minutos > 35 ? 'listo' : minutos > 12 ? 'preparando' : 'pendiente'
      pedidosOnline.push({
        items, tipo,
        mesaNumero: tipo === 'mesa' ? String(entre(1, 14)) : '',
        direccion: tipo === 'delivery' ? `${elegir(CALLES)} ${entre(100, 3800)}${chance(0.3) ? `, piso ${entre(1, 9)} ${elegir(['A', 'B', 'C'])}` : ''}` : '',
        clienteNombre: tipo === 'mesa' ? '' : cli.nombre,
        clienteEmail: tipo === 'mesa' ? '' : cli.email,
        clienteTelefono: tipo === 'mesa' ? '' : cli.telefono,
        formaPago: tipo === 'mesa' ? '' : fp,
        descuento, costoEnvio, notas: chance(0.12) ? elegir(['Sin aceitunas, por favor', 'Tocar timbre 2B', 'Cortar en 8', 'Bien cocida', 'Traer cambio de $20.000']) : '',
        total, totalFinal: descuento > 0 ? Math.round(total * (1 - descuento / 100)) : total,
        estado, createdAt: creado, updatedAt: sumarMin(creado, esHoy ? Math.min(minutos, 50) : entre(30, 55)),
      })
    }
  }
  pedidosOnline.sort((a, b) => a.createdAt - b.createdAt)
  pedidosOnline.forEach((p, i) => { p.numero = String(i + 1).padStart(4, '0') })
  const pedidosIns = await insertar('PedidoOnline', pedidosOnline)

  const resenas = []
  for (const p of pedidosIns.filter(x => x.estado === 'entregado' && x.clienteEmail)) {
    if (!chance(0.38)) continue
    const estrellas = ponderado([[5, 56], [4, 29], [3, 10], [2, 4], [1, 1]])
    resenas.push({ pedido: p._id, estrellas, comentario: elegir(COMENTARIOS_RESENA[estrellas]), token: crypto.randomBytes(8).toString('hex'), createdAt: sumarMin(p.createdAt, entre(70, 60 * 30)) })
  }
  await insertar('Resena', resenas.filter(r => r.createdAt < ahora))

  // Historial de clientes de la carta (autocompletado)
  const historial = new Map()
  for (const p of pedidosIns) if (p.clienteEmail) historial.set(p.clienteEmail, { email: p.clienteEmail, nombre: p.clienteNombre, telefono: p.clienteTelefono, direccion: p.direccion, createdAt: p.createdAt })
  await insertar('ClienteHistorial', [...historial.values()])

  await insertar('ConfigTienda', [{
    habilitado: true,
    delivery: { habilitado: true, costoEnvio: COSTO_ENVIO, horarios: horarios([{ desde: '19:30', hasta: '23:45' }]) },
    retiro:   { habilitado: true, costoEnvio: 0, horarios: horarios([{ desde: '11:30', hasta: '15:30' }, { desde: '19:30', hasta: '23:45' }]) },
    logo: null,
    portada: foto('1571407970349-bc81e7e96d47'),
    colorFondo: null,
    fondoImagen: null,
    formasPago,
    pedidoCounter: pedidosOnline.length,
    tiempoEstimadoMin: 35,
    zonaDelivery: { lat: null, lng: null, radioKm: null },
    pushSuscripciones: configPrevia?.pushSuscripciones || [],
    createdAt: alta,
  }])

  // ── 8. Delivery propio y mostrador (pantalla Restaurante) ──────────────────
  const REPARTIDORES = ['Kevin', 'Brian', 'Maxi']
  const deliveries = []
  for (let i = 0; i < 26; i++) {
    const haceMin = i < 4 ? [8, 22, 31, 44][i] : entre(60, 60 * 24 * 12)
    const creado = sumarMin(ahora, -haceMin)
    const cli = elegir(clientesIns)
    const items = [{ nombre: ponderado(deCategoria('Pizzas')), cantidad: entre(1, 2) }, ...(chance(0.5) ? [{ nombre: ponderado(deCategoria('Empanadas')), cantidad: entre(6, 12) }] : [])]
      .map(it => ({ ...it, precio: precioEn(it.nombre, creado) }))
    const costoEnvio = redondear(COSTO_ENVIO * factorPrecio(creado))
    const [calle] = cli.direccion.split(/ (?=\d)/)
    deliveries.push({
      nombre: cli.nombre, telefono: cli.telefono,
      direccion: { calle, numero: String(entre(100, 3800)), piso: chance(0.25) ? `${entre(1, 8)}° ${elegir(['A', 'B'])}` : '', barrio: elegir(BARRIOS) },
      repartidor: i === 0 ? '' : elegir(REPARTIDORES),
      tiempoEstimado: elegir(['30 min', '40 min', '45 min']),
      costoEnvio, comentario: chance(0.15) ? 'Pagan con $50.000' : '',
      items, total: items.reduce((s, it) => s + it.precio * it.cantidad, 0) + costoEnvio,
      estado: i === 0 || i === 1 ? 'en_preparacion' : i === 2 ? 'listo_para_entregar' : i === 3 ? 'enviado' : 'entregado',
      createdAt: creado,
    })
  }
  deliveries.sort((a, b) => a.createdAt - b.createdAt).forEach((d, i) => { d.numero = i + 1 })
  await insertar('PedidoDelivery', deliveries)

  const mostrador = []
  for (let i = 0; i < 9; i++) {
    const enCurso = i < 2
    const creado = sumarMin(ahora, enCurso ? -entre(3, 15) : -entre(60, 60 * 24 * 5))
    const items = [{ nombre: ponderado(deCategoria('Pizzas')), cantidad: 1 }, { nombre: ponderado(deCategoria('Bebidas').filter(([n]) => !/tirada|Jarra|Copa/.test(n))), cantidad: entre(1, 2) }]
      .map(it => ({ productId: String(prod[it.nombre]._id), ...it, precio: precioEn(it.nombre, creado) }))
    mostrador.push({
      etiqueta: enCurso ? elegir(['Para llevar', 'Retira Juan', 'Mostrador']) : 'Para llevar',
      items, total: items.reduce((s, it) => s + it.precio * it.cantidad, 0),
      estado: enCurso ? 'en_curso' : 'cerrada',
      cliente: chance(0.5) ? elegir(clientesIns).nombre : '',
      metodoPago: enCurso ? '' : ponderado([['Efectivo', 50], ['Tarjeta', 30], ['Transferencia', 20]]),
      createdAt: creado,
    })
  }
  mostrador.sort((a, b) => a.createdAt - b.createdAt).forEach((m, i) => { m.numero = i + 1 })
  await insertar('PedidoMostrador', mostrador)

  // ── 9. Proveedores, cuentas corrientes, gastos y stock ─────────────────────
  const proveedores = await insertar('Proveedor', [
    ['Molino Don Ernesto', 'Harinas y levaduras', 'pedidos@molinodonernesto.com.ar', 'Entrega martes y viernes'],
    ['Lácteos La Serenísima (distribuidor)', 'Lácteos y quesos', 'ventas@lacteosdist.com.ar', 'Pedido mínimo $150.000'],
    ['Fiambrería Los Hermanos', 'Fiambres y carnes', 'loshermanos.fiambres@gmail.com', ''],
    ['Verdulería El Tano', 'Frutas y verduras', '', 'Compra diaria, paga en efectivo'],
    ['Distribuidora Bebidas Sur', 'Bebidas', 'pedidos@bebidassur.com.ar', 'Cerveza tirada en barriles de 50 L'],
    ['Packaging Express', 'Cajas y descartables', 'hola@packagingexpress.com.ar', 'Cajas de pizza con logo'],
  ].map(([nombre, rubro, email, notas], i) => ({
    nombre, rubro, email, notas,
    telefono: `+54 9 11 ${entre(4000, 6999)}-${entre(1000, 9999)}`,
    calle: elegir(CALLES), numero: String(entre(100, 4500)), ciudad: 'Buenos Aires',
    createdAt: sumarMin(alta, i * 60),
  })))
  const prov = Object.fromEntries(proveedores.map(p => [p.nombre.split(' ')[0], p]))

  const catGasto = await insertar('CategoriaGasto', [
    ['Alquiler', 'Gastos administrativos'], ['Servicios', 'Gastos operacionales'], ['Sueldos y cargas', 'Gastos operacionales'],
    ['Mercadería', 'Compra de mercadería'], ['Impuestos', 'Gastos administrativos'], ['Mantenimiento', 'Gastos operacionales'],
    ['Packaging', 'Compra de mercadería'], ['Marketing', 'Gastos administrativos'],
  ].map(([nombre, categoriaFinanciera]) => ({ nombre, categoriaFinanciera, createdAt: alta })))
  const cg = Object.fromEntries(catGasto.map(c => [c.nombre, c]))

  const gastos = []
  const ccProv = []
  const gasto = (inst, cat, importe, comentario, extra = {}) => gastos.push({
    fecha: ddmmyyyy(inst), importe: Math.round(importe), monto: Math.round(importe), categoria: cat, categoriaId: cg[cat]._id,
    comentario, descripcion: comentario, medioPago: extra.medioPago || ponderado([['Transferencia', 60], ['Efectivo', 25], ['Débito', 15]]),
    proveedor: extra.proveedor || '', estadoPago: extra.estadoPago || 'pagado',
    fechaVencimiento: extra.vence ? ddmmyyyy(extra.vence) : null, createdAt: inst,
  })

  // Ventas por mes (para impuestos)
  const ventasPorMes = {}
  for (const v of ventas) { const [, mm, yy] = v.inicio.split(' ')[0].split('/'); const k = `${yy}-${mm}`; ventasPorMes[k] = (ventasPorMes[k] || 0) + v.items.reduce((s, i) => s + i.precio * i.cantidad, 0) }

  const pi = partes(inicioHistorial)
  for (let k = 0; k <= 6; k++) {
    const y = pi.y + Math.floor((pi.m + k) / 12), m = (pi.m + k) % 12
    const mesActual = y === hoy.getUTCFullYear() && m === hoy.getUTCMonth()
    const f = (d) => fechaAR(y, m, d, 10, entre(0, 50))
    const infl = factorPrecio(f(15))
    const pasado = (d) => f(d) <= ahora
    const estado = (d) => (mesActual && d >= hoy.getUTCDate() - 2) ? 'pendiente' : 'pagado'
    if (pasado(5) || mesActual) gasto(f(5), 'Alquiler', 1450000 * infl, `Alquiler del local - ${pad(m + 1)}/${y}`, { medioPago: 'Transferencia', estadoPago: pasado(5) ? 'pagado' : 'pendiente', vence: f(10) })
    for (const [d, nombre, monto] of [[1, 'Sueldo encargado', 1250000], [1, 'Sueldo cocinero', 1150000], [1, 'Sueldo ayudante de cocina', 880000], [1, 'Sueldo mozo', 820000], [1, 'Sueldo mozo (part-time)', 520000], [12, 'Cargas sociales (F.931)', 1050000]]) {
      if (pasado(d)) gasto(f(d), 'Sueldos y cargas', monto * infl, `${nombre} - ${pad((m || 12))}/${m ? y : y - 1}`, { medioPago: 'Transferencia' })
    }
    for (const [d, nombre, monto] of [[8, 'Edenor - luz', invierno(m) ? 230000 : 175000], [9, 'Metrogas - gas', invierno(m) ? 210000 : 95000], [10, 'AySA - agua', 38000], [14, 'Internet y teléfono', 42000], [20, 'Software de facturación', 25000]]) {
      if (pasado(d)) gasto(f(d), 'Servicios', monto * infl, nombre, { estadoPago: estado(d), vence: f(Math.min(d + 10, 28)) })
      // Facturas del mes en curso que todavía no vencen: llegaron pero no se pagaron
      else if (mesActual) gasto(sumarMin(ahora, -entre(1, 3) * 1440), 'Servicios', monto * infl, nombre, { estadoPago: 'pendiente', vence: f(Math.min(d + 10, 28)) })
    }
    const kMes = `${y}-${pad(m + 1)}`
    if (pasado(18) && ventasPorMes[kMes]) gasto(f(18), 'Impuestos', ventasPorMes[kMes] * 0.035, `Ingresos Brutos - ${pad(m + 1)}/${y}`, { estadoPago: estado(18) })
    if (pasado(22)) gasto(f(22), 'Packaging', 180000 * infl, 'Cajas de pizza y bolsas', { proveedor: prov.Packaging.nombre })
    if (chance(0.5) && pasado(16)) gasto(f(16), 'Mantenimiento', entre(60, 260) * 1000 * infl, elegir(['Service del horno pizzero', 'Arreglo de heladera', 'Limpieza de campana', 'Reparación de tirador de cerveza']))
    if (chance(0.6) && pasado(3)) gasto(f(3), 'Marketing', entre(40, 120) * 1000 * infl, elegir(['Publicidad en Instagram', 'Volantes para delivery', 'Promoción en Google']))

    // Facturas de proveedores: cuenta corriente (cargo) + compra registrada como gasto
    for (const [clave, montoBase, dias] of [['Molino', 280000, [3, 10, 17, 24]], ['Lácteos', 520000, [2, 9, 16, 23, 30]], ['Fiambrería', 240000, [4, 18]], ['Verdulería', 95000, [2, 6, 9, 13, 16, 20, 23, 27]], ['Distribuidora', 360000, [7, 21]]]) {
      for (const d of dias) {
        if (d > 28 || !pasado(d)) continue
        const monto = montoBase * infl * (0.85 + rnd() * 0.3)
        const p = prov[clave]
        if (clave === 'Verdulería') { gasto(f(d), 'Mercadería', monto, 'Compra de verdura', { proveedor: p.nombre, medioPago: 'Efectivo' }); continue }
        ccProv.push({ proveedorId: p._id, tipo: 'cargo', monto: Math.round(monto), comentario: `Factura A ${pad(entre(1, 9))}-${String(entre(1000, 99999)).padStart(8, '0')}`, fechaPago: isoDia(f(d)), createdAt: f(d) })
        gasto(f(d), 'Mercadería', monto, `Compra a ${p.nombre}`, { proveedor: p.nombre, medioPago: 'Cuenta corriente' })
      }
    }
  }
  // Pagos a proveedores: cancelan lo facturado hasta ~2 semanas atrás
  for (const p of proveedores) {
    const cargos = ccProv.filter(c => String(c.proveedorId) === String(p._id)).sort((a, b) => a.createdAt - b.createdAt)
    let acumulado = 0
    for (const c of cargos) {
      acumulado += c.monto
      if (c.createdAt < sumarMin(ahora, -14 * 1440) && chance(0.55)) {
        const fechaPago = sumarMin(c.createdAt, entre(5, 12) * 1440)
        ccProv.push({ proveedorId: p._id, tipo: 'pago', monto: acumulado, medioPago: 'Transferencia', comentario: 'Pago de facturas pendientes', fechaPago: isoDia(fechaPago), createdAt: fechaPago })
        acumulado = 0
      }
    }
  }
  // Un servicio vencido sin pagar (para ver la alerta)
  gasto(sumarMin(ahora, -20 * 1440), 'Servicios', 61000, 'Mantenimiento de matafuegos', { estadoPago: 'vencido', vence: sumarMin(ahora, -6 * 1440) })
  await insertar('Gasto', gastos)
  await insertar('CuentaCorrienteProveedor', ccProv)

  // Cuenta corriente de clientes (los 6 primeros "fían" y pagan a fin de mes)
  const ccCli = []
  for (const c of clientesIns.slice(0, 6)) {
    let deuda = 0
    for (let d = 120; d >= 1; d -= entre(4, 11)) {
      const inst = sumarMin(ahora, -d * 1440)
      const monto = redondear(entre(9000, 42000) * factorPrecio(inst))
      deuda += monto
      ccCli.push({ clienteId: c._id, tipo: 'cargo', monto, caja: 'Principal', comentario: elegir(['Consumo en salón', 'Pedido para llevar', 'Pizzas para el cumpleaños', 'Almuerzo de oficina']), fechaPago: isoDia(inst), createdAt: inst })
      if (partes(inst).d >= 26 && deuda > 0 && chance(0.8)) {
        const pago = chance(0.8) ? deuda : redondear(deuda * 0.5)
        ccCli.push({ clienteId: c._id, tipo: 'pago', monto: pago, medioPago: elegir(['Transferencia', 'Efectivo']), caja: 'Principal', comentario: 'Pago de cuenta', fechaPago: isoDia(sumarMin(inst, 1440)), createdAt: sumarMin(inst, 1440) })
        deuda -= pago
      }
    }
  }
  await insertar('CuentaCorriente', ccCli.filter(t => t.createdAt < ahora))

  // Movimientos de stock: compras semanales y mermas registradas
  const movs = []
  for (const i of ingredientes) {
    for (let d = 84; d >= 2; d -= entre(6, 8)) {
      const inst = sumarMin(ahora, -d * 1440)
      const cant = Math.max(1, Math.round(i.stockMinimo * (1.2 + rnd())))
      movs.push({ ingrediente: i._id, tipo: 'entrada', cantidad: cant, descripcion: 'Compra a proveedor', fecha: ddmmyyyy(inst), createdAt: inst })
      if (chance(0.25)) movs.push({ ingrediente: i._id, tipo: 'salida', cantidad: Math.max(0.1, Math.round(cant * 0.05 * 10) / 10), descripcion: elegir(['Merma: vencido', 'Merma: se rompió en el transporte', 'Ajuste de inventario']), fecha: ddmmyyyy(sumarMin(inst, 2880)), createdAt: sumarMin(inst, 2880) })
    }
  }
  await insertar('MovimientoStock', movs.filter(m => m.createdAt < ahora))

  console.log('\n✓ Restaurante de demostración generado para', owner.email)
  for (const [k, v] of Object.entries(conteo)) console.log('  ', k.padEnd(26), v)
  const facturacion = ventas.reduce((s, v) => s + v.items.reduce((a, i) => a + i.precio * i.cantidad, 0), 0)
  console.log('   Facturación del salón (6 meses): $' + Math.round(facturacion).toLocaleString('es-AR'))
  await mongoose.disconnect()
}

function invierno(m) { return [5, 6, 7].includes(m) }

main().catch(async (e) => { console.error('ERROR:', e.message); await mongoose.disconnect(); process.exit(1) })
