// Impresión de comandas (cocina/barra) y tickets (cliente/cadete) para comanderas de 58/80 mm.
// Se imprime desde el navegador con un iframe oculto. Con Chrome en modo
// --kiosk-printing sale directo por la impresora predeterminada, sin diálogo.
import { configService, getSession } from '../services/api'

export const CONFIG_IMPRESION_DEFAULT = {
  anchoPapel: 80, encabezado: '', datosLocal: '',
  pie: '¡Gracias por su compra!', leyenda: 'Documento no válido como factura',
  comandaPorArea: true, comandaAlGuardar: false, copiasComanda: 1, copiasTicket: 1,
}

let cache = null
export async function obtenerConfigImpresion() {
  if (cache) return cache
  try { cache = { ...CONFIG_IMPRESION_DEFAULT, ...(await configService.getImpresion()) } }
  catch { return { ...CONFIG_IMPRESION_DEFAULT } }
  return cache
}
export const actualizarCacheImpresion = (cfg) => { cache = { ...CONFIG_IMPRESION_DEFAULT, ...cfg } }

// Todo texto que entra al ticket se escapa (nombres de clientes, notas, productos)
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const precio = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fechaCorta = (d = new Date()) => {
  const f = d instanceof Date ? d : new Date(d)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(f.getDate())}/${p(f.getMonth() + 1)}/${String(f.getFullYear()).slice(-2)} ${p(f.getHours())}:${p(f.getMinutes())}`
}

// Área de impresión de un ítem: la del producto, si no la de su categoría, si no Cocina.
// Los ítems pueden traer el nombre con la opción elegida: "Muzzarella (Grande …)".
export function areaDeItem(item, productos = [], categorias = []) {
  const prod = productos.find(p => (item.productId && String(p.id) === String(item.productId)))
    || productos.find(p => p.nombre === item.nombre)
    || productos.find(p => item.nombre?.startsWith(p.nombre + ' ('))
  if (prod?.areaImpresion) return prod.areaImpresion
  const cat = prod && categorias.find(c => String(c.id) === String(prod.categoriaId))
  return cat?.areaImpresion || 'Cocina'
}

function documento(cfg, cuerpo) {
  const ancho = cfg.anchoPapel === 58 ? 48 : 72   // ancho imprimible en mm
  const base  = cfg.anchoPapel === 58 ? 11 : 12.5
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Impresión</title><style>
    @page { size: ${cfg.anchoPapel}mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: ${ancho}mm; margin: 0 auto; padding: 3mm 0; font-family: 'Courier New', Courier, monospace; font-size: ${base}px; color: #000; }
    .hoja + .hoja { page-break-before: always; break-before: page; }
    .c { text-align: center; } .b { font-weight: 700; } .r { text-align: right; }
    .titulo { font-size: ${base * 1.6}px; font-weight: 700; letter-spacing: 1px; text-align: center; margin-bottom: 2mm; }
    .area { font-size: ${base * 1.25}px; font-weight: 700; border: 1.5px solid #000; text-align: center; padding: 1mm 0; margin: 2mm 0; }
    .sep { border-top: 1px dashed #000; margin: 2mm 0; }
    .meta div { margin: 0.4mm 0; }
    .item-com { display: flex; gap: 3mm; font-size: ${base * 1.45}px; font-weight: 700; margin: 1.6mm 0; line-height: 1.15; }
    .item-com .cant { min-width: 7mm; }
    .nota-item { font-size: ${base}px; font-weight: 400; margin: -1mm 0 1.5mm 10mm; }
    .fila { display: flex; justify-content: space-between; gap: 2mm; margin: 0.6mm 0; }
    .item-tk { margin: 1mm 0; }
    .item-tk .precio { text-align: right; }
    .total { font-size: ${base * 1.5}px; font-weight: 700; }
    .notas { border: 1px solid #000; padding: 1.5mm; margin-top: 2mm; font-weight: 700; }
    .pie { text-align: center; font-size: ${base * 0.9}px; margin-top: 1mm; }
  </style></head><body>${cuerpo}</body></html>`
}

function imprimirHtml(html) {
  // Si quedó un documento de una impresión anterior, se descarta
  document.querySelectorAll('iframe[data-foodops-print]').forEach(f => f.remove())
  const iframe = document.createElement('iframe')
  iframe.setAttribute('data-foodops-print', '')
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html); doc.close()
  const quitar = () => setTimeout(() => iframe.remove(), 500)
  iframe.contentWindow.addEventListener('afterprint', quitar)
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print() }, 150)
  setTimeout(() => iframe.isConnected && iframe.remove(), 120_000)
}

// ── Comanda (cocina / barra): sin precios, letra grande ─────────────────────
// datos: { origen: 'MOSTRADOR' | 'MESA 4' | 'DELIVERY' | 'CARTA ONLINE', numero, cliente, detalle, personas, items, notas, fecha }
export async function imprimirComanda(datos, { productos = [], categorias = [] } = {}) {
  const cfg = await obtenerConfigImpresion()
  const items = (datos.items || []).filter(i => i.cantidad > 0)
  if (!items.length) return false

  const grupos = {}
  for (const it of items) {
    const area = cfg.comandaPorArea ? areaDeItem(it, productos, categorias) : 'Cocina'
    ;(grupos[area] ||= []).push(it)
  }

  const hojas = []
  for (const [area, lista] of Object.entries(grupos)) {
    const hoja = `<div class="hoja">
      <div class="titulo">${esc(datos.origen)}</div>
      <div class="meta">
        ${datos.numero != null ? `<div>Venta: #${esc(datos.numero)}</div>` : ''}
        <div>${esc(fechaCorta(datos.fecha))}</div>
        ${datos.cliente ? `<div>Cliente: ${esc(datos.cliente)}</div>` : ''}
        ${datos.personas ? `<div>Personas: ${esc(datos.personas)}</div>` : ''}
        ${datos.detalle ? `<div>${esc(datos.detalle)}</div>` : ''}
      </div>
      <div class="area">${esc(area.toUpperCase())}</div>
      ${lista.map(i => `<div class="item-com"><span class="cant">${esc(i.cantidad)}</span><span>${esc(i.nombre)}</span></div>
        ${i.notas ? `<div class="nota-item">→ ${esc(i.notas)}</div>` : ''}`).join('')}
      ${datos.notas ? `<div class="notas">NOTA: ${esc(datos.notas)}</div>` : ''}
    </div>`
    for (let c = 0; c < (cfg.copiasComanda || 1); c++) hojas.push(hoja)
  }
  imprimirHtml(documento(cfg, hojas.join('')))
  return true
}

// ── Ticket (cliente / cadete): con precios y total ──────────────────────────
// datos: { numero, fecha, tipo, cliente, telefono, direccion, items, descuentoLabel, descuentoMonto, envio, total, formaPago, notas }
export async function imprimirTicket(datos) {
  const cfg = await obtenerConfigImpresion()
  const items = (datos.items || []).filter(i => i.cantidad > 0)
  const subtotal = items.reduce((s, i) => s + (i.precio || 0) * i.cantidad, 0)
  const envio = Number(datos.envio || 0)
  const desc = Number(datos.descuentoMonto || 0)
  const total = datos.total != null ? Number(datos.total) : subtotal + envio - desc
  const encabezado = cfg.encabezado || getSession()?.user?.restaurante || 'Restaurante'

  const hoja = `<div class="hoja">
    <div class="titulo">${esc(encabezado.toUpperCase())}</div>
    ${cfg.datosLocal ? `<div class="c">${esc(cfg.datosLocal).replace(/\n/g, '<br>')}</div>` : ''}
    <div class="sep"></div>
    <div class="meta">
      ${datos.numero != null ? `<div>Pedido: #${esc(datos.numero)}</div>` : ''}
      <div>Fecha: ${esc(fechaCorta(datos.fecha))}</div>
      ${datos.tipo ? `<div>${esc(datos.tipo)}</div>` : ''}
      ${datos.cliente ? `<div>Cliente: ${esc(datos.cliente)}</div>` : ''}
      ${datos.telefono ? `<div>Tel: ${esc(datos.telefono)}</div>` : ''}
      ${datos.direccion ? `<div>Dirección: ${esc(datos.direccion)}</div>` : ''}
    </div>
    <div class="sep"></div>
    ${items.map(i => `<div class="item-tk"><div>${esc(i.cantidad)}  ${esc(i.nombre)}</div><div class="precio">${precio((i.precio || 0) * i.cantidad)}</div></div>`).join('')}
    <div class="sep"></div>
    <div class="fila"><span>Subtotal</span><span>${precio(subtotal)}</span></div>
    ${desc > 0 ? `<div class="fila"><span>${esc(datos.descuentoLabel || 'Descuento')}</span><span>-${precio(desc)}</span></div>` : ''}
    ${envio > 0 ? `<div class="fila"><span>Envío</span><span>${precio(envio)}</span></div>` : ''}
    <div class="fila total"><span>TOTAL</span><span>${precio(total)}</span></div>
    ${datos.formaPago ? `<div>Forma de pago: ${esc(datos.formaPago)}</div>` : ''}
    ${datos.notas ? `<div class="notas">Nota: ${esc(datos.notas)}</div>` : ''}
    <div class="sep"></div>
    ${cfg.leyenda ? `<div class="pie b">${esc(cfg.leyenda)}</div>` : ''}
    ${cfg.pie ? `<div class="pie">${esc(cfg.pie)}</div>` : ''}
  </div>`
  imprimirHtml(documento(cfg, Array(cfg.copiasTicket || 1).fill(hoja).join('')))
  return true
}

// Ejemplos para probar la impresora desde Configuración
export const imprimirPruebaComanda = () => imprimirComanda({
  origen: 'MOSTRADOR', numero: 8734, cliente: 'Esteban', fecha: new Date(),
  items: [{ nombre: 'Funghi', cantidad: 1 }, { nombre: 'Cipolla', cantidad: 1 }, { nombre: 'Cerveza tirada (pinta)', cantidad: 2, area: 'Barra' }],
  notas: 'Prueba de impresión',
}, { productos: [{ id: 'x', nombre: 'Cerveza tirada (pinta)', areaImpresion: 'Barra' }] })

export const imprimirPruebaTicket = () => imprimirTicket({
  numero: 8734, fecha: new Date(), tipo: 'Retiro en el local', cliente: 'Esteban',
  items: [{ nombre: 'Funghi', cantidad: 1, precio: 16000 }, { nombre: 'Cipolla', cantidad: 1, precio: 14500 }, { nombre: 'Bacon', cantidad: 1, precio: 17000 }],
  formaPago: 'Efectivo',
})
