import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { UtensilsCrossed, Frown, CheckCircle, Armchair, ShoppingBag, Store, Bike, MapPin, Phone, Mail, FileText } from 'lucide-react'
import './Carta.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`


function ProductoCard({ p, cant, onClick }) {
  return (
    <div className="carta-prod" onClick={onClick}>
      <div className="carta-prod-info">
        <span className="carta-prod-nombre">{p.nombre}</span>
        {p.descripcion && <span className="carta-prod-desc">{p.descripcion}</span>}
        <span className="carta-prod-precio">{fmt(p.precio)}</span>
      </div>
      <div className="carta-prod-thumb">
        {p.imagen
          ? <img src={p.imagen} alt={p.nombre} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
          : null}
        <div className="carta-prod-placeholder" style={{ display: p.imagen ? 'none' : 'flex' }}><UtensilsCrossed size={28} /></div>
        {cant > 0 && <span className="carta-prod-badge">{cant}</span>}
      </div>
    </div>
  )
}

export default function Carta() {
  const { userId } = useParams()
  const [datos, setDatos]               = useState(null)
  const [catActiva, setCatActiva]       = useState(null)
  const [carrito, setCarrito]           = useState([])
  const [productoOpen, setProductoOpen] = useState(null)
  const [cantModal, setCantModal]       = useState(1)
  const [step, setStep]                 = useState('menu') // menu | carrito | checkout | ok
  const [enviando, setEnviando]         = useState(false)
  const [errorEnvio, setErrorEnvio]     = useState('')
  const [error, setError]               = useState('')
  const [numeroPedido, setNumeroPedido] = useState('')
  const [trackingUrl, setTrackingUrl]   = useState('')

  const [form, setForm] = useState({
    tipo:            'takeaway',
    mesaNumero:      '',
    direccion:       '',
    clienteNombre:   '',
    clienteEmail:    '',
    clienteTelefono: '',
    formaPago:       '',
    notas:           '',
  })

  useEffect(() => {
    if (!userId) { setError('Enlace inválido'); return }
    fetch(`${API}/api/carta/${userId}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        if (data.habilitado === false) {
          setDatos({ cerrada: true, restaurante: data.restaurante })
        } else {
          setDatos(data)
          const primeraForma = data.formasPago?.[0]?.nombre || ''
          // Bug 10: tipo inicial según lo que esté habilitado ahora
          const tipoInicial = data.retiroAbierto ? 'takeaway'
            : data.deliveryAbierto ? 'delivery'
            : 'mesa'
          setForm(f => ({ ...f, formaPago: primeraForma, tipo: tipoInicial }))
        }
      })
      .catch(() => setError('No se pudo cargar el menú'))
  }, [userId])

  if (error) return (
    <div className="carta-error"><span><Frown size={40} color="#ef4444" /></span><p>{error}</p></div>
  )
  if (!datos) return (
    <div className="carta-loading"><div className="carta-spinner" /></div>
  )
  if (datos.cerrada) return (
    <div className="carta-cerrada">
      <Store size={48} color="#94a3b8" />
      <h2>{datos.restaurante}</h2>
      <p>En este momento no estamos recibiendo pedidos online.</p>
      <span>Volvé a intentarlo más tarde.</span>
    </div>
  )

  const {
    restaurante, logo, portada, colorFondo,
    deliveryAbierto, retiroAbierto, costoDelivery = 0,
    categorias = [], productos: todosProductos = [],
    formasPago = [],
  } = datos

  const deliveryHabilitado = !!deliveryAbierto
  const retiroHabilitado   = !!retiroAbierto
  const productos          = todosProductos.filter(p => p.activo !== false)

  const descuentoActual = formasPago.find(f => f.nombre === form.formaPago)?.descuento || 0
  const subtotalCarrito = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const costoEnvio      = form.tipo === 'delivery' ? costoDelivery : 0
  const baseTotal       = subtotalCarrito + costoEnvio
  const montoDescuento  = descuentoActual > 0 ? Math.round(baseTotal * descuentoActual / 100) : 0
  const totalCarrito    = baseTotal - montoDescuento
  const cantCarrito     = carrito.reduce((acc, i) => acc + i.cantidad, 0)

  const cantEnCarrito = (id) => carrito.find(i => i.id === id)?.cantidad || 0

  const abrirProducto = (p) => {
    setCantModal(cantEnCarrito(p._id) || 1)
    setProductoOpen(p)
  }

  const agregarDesdeModal = () => {
    const p = productoOpen
    if (cantModal === 0) {
      setCarrito(prev => prev.filter(i => i.id !== p._id))
    } else {
      setCarrito(prev => {
        const existe = prev.find(i => i.id === p._id)
        return existe
          ? prev.map(i => i.id === p._id ? { ...i, cantidad: cantModal } : i)
          : [...prev, { id: p._id, nombre: p.nombre, precio: p.precio, cantidad: cantModal }]
      })
    }
    setProductoOpen(null)
  }

  const cambiarCant = (id, delta) => {
    setCarrito(prev =>
      prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
         .filter(i => i.cantidad > 0)
    )
  }

  const setTipo = (tipo) => {
    setForm(f => ({ ...f, tipo }))
  }

  const canConfirm = () => {
    if (form.tipo === 'mesa') return !!form.mesaNumero.trim()
    if (!form.clienteEmail.trim() || !form.clienteNombre.trim() || !form.clienteTelefono.trim()) return false
    if (form.tipo === 'delivery' && !form.direccion.trim()) return false
    if (formasPago.length > 0 && !form.formaPago) return false
    return true
  }

  const enviarPedido = async () => {
    setErrorEnvio('')
    setEnviando(true)
    try {
      const res = await fetch(`${API}/api/carta/${userId}/pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items:           carrito.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
          tipo:            form.tipo,
          mesaNumero:      form.mesaNumero,
          direccion:       form.direccion,
          clienteNombre:   form.clienteNombre,
          clienteEmail:    form.clienteEmail,
          clienteTelefono: form.clienteTelefono,
          formaPago:       form.formaPago,
          descuento:       descuentoActual,
          notas:           form.notas,
          frontendOrigin:  window.location.origin,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error al enviar')
      setNumeroPedido(data.numero || '')
      setTrackingUrl(data.id ? `${window.location.origin}/tracking/${data.id}` : '')
      setCarrito([])
      setStep('ok')
    } catch (e) {
      setErrorEnvio(e.message)
    } finally {
      setEnviando(false)
    }
  }

  // ── Confirmado ───────────────────────────────────────────────────────────────
  if (step === 'ok') return (
    <div className="carta-ok">
      <div className="carta-ok-icon">
        <CheckCircle size={72} color="#e85d2b" />
      </div>
      <h2 className="carta-ok-titulo">¡Pedido confirmado!</h2>
      {numeroPedido && <p className="carta-ok-numero">#{numeroPedido}</p>}
      <p className="carta-ok-msg">Recibimos tu pedido. Te avisaremos cuando esté listo.</p>
      {trackingUrl && (
        <a className="carta-ok-tracking-btn" href={trackingUrl} target="_blank" rel="noopener noreferrer">
          Seguir mi pedido →
        </a>
      )}
      <button className="carta-ok-btn" onClick={() => { setStep('menu'); setForm(f => ({ ...f, tipo: 'takeaway', mesaNumero: '', direccion: '', clienteNombre: '', clienteEmail: '', clienteTelefono: '', notas: '' })) }}>
        Volver al menú
      </button>
    </div>
  )

  // ── Checkout ─────────────────────────────────────────────────────────────────
  if (step === 'checkout') return (
    <div className="carta-layout">
      <header className="carta-checkout-topbar">
        <button className="carta-back-btn" onClick={() => setStep('carrito')}>‹</button>
        <span className="carta-checkout-topbar-title">Confirmar pedido</span>
        <div style={{ width: 36 }} />
      </header>

      <div className="carta-checkout-page">

        {/* Selector tipo */}
        <div className="carta-co-section">
          <div className="carta-tipo-tabs">
            {retiroHabilitado && (
              <button
                className={`carta-tipo-tab ${form.tipo === 'takeaway' ? 'carta-tipo-tab--active' : ''}`}
                onClick={() => setTipo('takeaway')}
              >
                <ShoppingBag size={16} /> Para retirar
              </button>
            )}
            {deliveryHabilitado && (
              <button
                className={`carta-tipo-tab ${form.tipo === 'delivery' ? 'carta-tipo-tab--active' : ''}`}
                onClick={() => setTipo('delivery')}
              >
                <Bike size={16} /> Delivery
              </button>
            )}
            <button
              className={`carta-tipo-tab ${form.tipo === 'mesa' ? 'carta-tipo-tab--active' : ''}`}
              onClick={() => setTipo('mesa')}
            >
              <Armchair size={16} /> En mesa
            </button>
          </div>
          {!retiroHabilitado && !deliveryHabilitado && (
            <p className="carta-co-aviso">Solo pedidos en mesa disponibles ahora.</p>
          )}
        </div>

        {/* Campos de dirección / mesa */}
        {form.tipo === 'delivery' && (
          <div className="carta-co-section">
            <label className="carta-co-label"><MapPin size={14} /> Dirección de entrega *</label>
            <input
              className="carta-co-input"
              type="text"
              placeholder="Ej: Av. Corrientes 1234"
              value={form.direccion}
              onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
            />
          </div>
        )}
        {form.tipo === 'mesa' && (
          <div className="carta-co-section">
            <label className="carta-co-label"><Armchair size={14} /> Número de mesa *</label>
            <input
              className="carta-co-input"
              type="text"
              placeholder="Ej: 5"
              value={form.mesaNumero}
              onChange={e => setForm(f => ({ ...f, mesaNumero: e.target.value }))}
            />
          </div>
        )}

        {/* Contacto */}
        {form.tipo !== 'mesa' && (
          <div className="carta-co-section">
            <h3 className="carta-co-section-title"><Mail size={15} /> Contacto</h3>
            <div className="carta-co-fields">
              <div>
                <label className="carta-co-label">Correo electrónico *</label>
                <input
                  className="carta-co-input"
                  type="email"
                  placeholder="tu@email.com"
                  value={form.clienteEmail}
                  onChange={e => setForm(f => ({ ...f, clienteEmail: e.target.value }))}
                />
              </div>
              <div>
                <label className="carta-co-label">Nombre y apellido *</label>
                <input
                  className="carta-co-input"
                  type="text"
                  placeholder="Juan García"
                  value={form.clienteNombre}
                  onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))}
                />
              </div>
              <div>
                <label className="carta-co-label"><Phone size={13} /> Teléfono *</label>
                <input
                  className="carta-co-input"
                  type="tel"
                  placeholder="+54 341 000-0000"
                  value={form.clienteTelefono}
                  onChange={e => setForm(f => ({ ...f, clienteTelefono: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Forma de pago */}
        {formasPago.length > 0 && (
          <div className="carta-co-section">
            <h3 className="carta-co-section-title"><FileText size={15} /> Forma de pago *</h3>
            <div className="carta-co-pagos">
              {formasPago.map(fp => (
                <label key={fp.nombre} className={`carta-co-pago ${form.formaPago === fp.nombre ? 'carta-co-pago--active' : ''}`}>
                  <input
                    type="radio"
                    name="formaPago"
                    value={fp.nombre}
                    checked={form.formaPago === fp.nombre}
                    onChange={() => setForm(f => ({ ...f, formaPago: fp.nombre }))}
                  />
                  <span className="carta-co-pago-nombre">{fp.nombre}</span>
                  {fp.descuento > 0 && <span className="carta-co-pago-desc">-{fp.descuento}%</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="carta-co-section">
          <label className="carta-co-label">Notas (opcional)</label>
          <textarea
            className="carta-co-input carta-co-textarea"
            placeholder="Sin cebolla, extra salsa..."
            value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
          />
        </div>

        {/* Resumen */}
        <div className="carta-co-section carta-co-resumen">
          <div className="carta-co-resumen-row">
            <span>Subtotal</span>
            <span>{fmt(subtotalCarrito)}</span>
          </div>
          {costoEnvio > 0 && (
            <div className="carta-co-resumen-row">
              <span>Costo de envío</span>
              <span>{fmt(costoEnvio)}</span>
            </div>
          )}
          {montoDescuento > 0 && (
            <div className="carta-co-resumen-row carta-co-resumen-desc">
              <span>Descuento ({descuentoActual}%)</span>
              <span>-{fmt(montoDescuento)}</span>
            </div>
          )}
          <div className="carta-co-resumen-row carta-co-resumen-total">
            <strong>Total</strong>
            <strong>{fmt(totalCarrito)}</strong>
          </div>
        </div>

        {errorEnvio && <p className="carta-co-error">{errorEnvio}</p>}

        <div className="carta-co-btns">
          <button
            className="carta-confirmar-btn"
            onClick={enviarPedido}
            disabled={enviando || !canConfirm()}
          >
            {enviando ? 'Enviando...' : 'Confirmar pedido'}
          </button>
          <button className="carta-volver-btn" onClick={() => setStep('carrito')}>
            Volver
          </button>
        </div>
      </div>
    </div>
  )

  // ── Carrito ──────────────────────────────────────────────────────────────────
  if (step === 'carrito') return (
    <div className="carta-layout">
      <header className="carta-cart-header">
        <button className="carta-back-btn" onClick={() => setStep('menu')}>‹</button>
        <h2>Mi pedido</h2>
      </header>

      <div className="carta-cart-items">
        {carrito.map(item => (
          <div key={item.id} className="carta-cart-item">
            <div className="carta-cart-item-info">
              <span className="carta-cart-item-nombre">{item.nombre}</span>
              <span className="carta-cart-item-sub">{fmt(item.precio)} × {item.cantidad}</span>
            </div>
            <div className="carta-cart-item-right">
              <span className="carta-cart-item-precio">{fmt(item.precio * item.cantidad)}</span>
              <div className="carta-cart-ctrl">
                <button className="carta-ctrl-btn" onClick={() => cambiarCant(item.id, -1)}>−</button>
                <span className="carta-ctrl-cant">{item.cantidad}</span>
                <button className="carta-ctrl-btn carta-ctrl-btn--add" onClick={() => cambiarCant(item.id, 1)}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="carta-cart-resumen">
        <div className="carta-cart-resumen-row">
          <span>Subtotal</span>
          <span>{fmt(subtotalCarrito)}</span>
        </div>
        {costoDelivery > 0 && form.tipo === 'delivery' && (
          <div className="carta-cart-resumen-row">
            <span>Costo de envío</span>
            <span>{fmt(costoDelivery)}</span>
          </div>
        )}
        <div className="carta-cart-resumen-row carta-cart-total-row">
          <strong>Total</strong>
          <strong>{fmt(subtotalCarrito + (form.tipo === 'delivery' ? costoDelivery : 0))}</strong>
        </div>
      </div>

      <div className="carta-cart-footer">
        <button className="carta-confirmar-btn" onClick={() => setStep('checkout')}>
          Continuar →
        </button>
      </div>
    </div>
  )

  // ── Menú principal ──────────────────────────────────────────────────────────
  const catsSinProductos = new Set(
    categorias.filter(c => !productos.some(p => p.categoria === c._id)).map(c => c._id)
  )

  return (
    <div className="carta-layout" style={colorFondo ? { background: colorFondo } : {}}>

      <header
        className={`carta-header ${portada ? 'carta-header--con-portada' : ''}`}
        style={portada ? { backgroundImage: `url(${portada})` } : {}}
      >
        {portada && <div className="carta-header-overlay" />}
        <div className="carta-header-info">
          {logo
            ? <img src={logo} alt={restaurante} className="carta-header-logo" />
            : <div className="carta-header-avatar">{restaurante?.[0]?.toUpperCase()}</div>
          }
          <h1 className="carta-header-nombre">{restaurante}</h1>
        </div>
      </header>

      {categorias.length > 0 && (
        <div className="carta-cats-wrap">
          <div className="carta-cats">
            <button
              className={`carta-cat-btn ${catActiva === null ? 'carta-cat-btn--active' : ''}`}
              onClick={() => setCatActiva(null)}
            >Todo</button>
            {categorias.filter(c => !catsSinProductos.has(c._id)).map(c => (
              <button
                key={c._id}
                className={`carta-cat-btn ${catActiva === c._id ? 'carta-cat-btn--active' : ''}`}
                onClick={() => setCatActiva(c._id)}
              >{c.nombre}</button>
            ))}
          </div>
        </div>
      )}

      <div className="carta-productos">
        {productos.length === 0 ? (
          <div className="carta-empty">
            <UtensilsCrossed size={40} />
            <p>El menú aún no tiene productos disponibles</p>
          </div>
        ) : catActiva !== null ? (
          productos.filter(p => p.categoria === catActiva).map(p => (
            <ProductoCard key={p._id} p={p} cant={cantEnCarrito(p._id)} onClick={() => abrirProducto(p)} />
          ))
        ) : (
          categorias.filter(c => !catsSinProductos.has(c._id)).map(cat => (
            <div key={cat._id} className="carta-seccion">
              <h3 className="carta-seccion-titulo">{cat.nombre}</h3>
              {productos.filter(p => p.categoria === cat._id).map(p => (
                <ProductoCard key={p._id} p={p} cant={cantEnCarrito(p._id)} onClick={() => abrirProducto(p)} />
              ))}
            </div>
          ))
        )}
      </div>

      {cantCarrito > 0 && (
        <button className="carta-float-btn" onClick={() => setStep('carrito')}>
          <span className="carta-float-cant">{cantCarrito}</span>
          Mi pedido
          <span className="carta-float-total">{fmt(subtotalCarrito)}</span>
        </button>
      )}

      {productoOpen && (
        <div className="carta-prod-modal-overlay" onClick={() => setProductoOpen(null)}>
          <div className="carta-prod-modal" onClick={e => e.stopPropagation()}>
            <button className="carta-prod-modal-close" onClick={() => setProductoOpen(null)}>×</button>
            {productoOpen.imagen
              ? <img src={productoOpen.imagen} alt={productoOpen.nombre} className="carta-prod-modal-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
              : null}
            <div className="carta-prod-modal-img-placeholder" style={{ display: productoOpen.imagen ? 'none' : 'flex' }}><UtensilsCrossed size={40} /></div>
            <div className="carta-prod-modal-body">
              <h2 className="carta-prod-modal-nombre">{productoOpen.nombre}</h2>
              {productoOpen.descripcion && <p className="carta-prod-modal-desc">{productoOpen.descripcion}</p>}
              <p className="carta-prod-modal-precio">{fmt(productoOpen.precio)}</p>
              <div className="carta-prod-modal-ctrl">
                <button className="carta-modal-ctrl-btn" onClick={() => setCantModal(c => Math.max(0, c - 1))}>−</button>
                <span className="carta-modal-ctrl-cant">{cantModal}</span>
                <button className="carta-modal-ctrl-btn carta-modal-ctrl-btn--add" onClick={() => setCantModal(c => c + 1)}>+</button>
              </div>
              <button
                className="carta-confirmar-btn"
                onClick={agregarDesdeModal}
                disabled={cantModal === 0 && !carrito.find(i => i.id === productoOpen._id)}
              >
                {cantModal === 0
                  ? 'Quitar del pedido'
                  : carrito.find(i => i.id === productoOpen._id)
                    ? `Actualizar · ${fmt(productoOpen.precio * cantModal)}`
                    : `Agregar al pedido · ${fmt(productoOpen.precio * cantModal)}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
