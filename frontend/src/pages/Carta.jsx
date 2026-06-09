import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { UtensilsCrossed, Frown, CheckCircle, Armchair, ShoppingBag } from 'lucide-react'
import './Carta.css'

const API = 'http://localhost:3000'
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
          : null
        }
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
  const [vistaCarrito, setVistaCarrito] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [enviando, setEnviando]         = useState(false)
  const [pedidoOk, setPedidoOk]         = useState(false)
  const [error, setError]               = useState('')
  const [form, setForm] = useState({ tipo: 'mesa', mesaNumero: '', clienteNombre: '', notas: '' })

  useEffect(() => {
    if (!userId) { setError('Enlace inválido'); return }
    fetch(`${API}/api/carta/${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setDatos(data))
      .catch(() => setError('No se pudo cargar el menú'))
  }, [userId])

  if (error) return (
    <div className="carta-error"><span><Frown size={40} /></span><p>{error}</p></div>
  )
  if (!datos) return (
    <div className="carta-loading"><div className="carta-spinner" /></div>
  )

  const { restaurante, categorias = [], productos: todosProductos = [] } = datos
  const productos = todosProductos.filter(p => p.activo !== false)

  const totalCarrito  = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const cantCarrito   = carrito.reduce((acc, i) => acc + i.cantidad, 0)
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

  const enviarPedido = async () => {
    if (form.tipo === 'mesa' && !form.mesaNumero.trim()) return
    setEnviando(true)
    try {
      const res = await fetch(`${API}/api/carta/${userId}/pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: carrito.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
          tipo: form.tipo, mesaNumero: form.mesaNumero,
          clienteNombre: form.clienteNombre, notas: form.notas,
        }),
      })
      if (!res.ok) throw new Error()
      setPedidoOk(true)
      setCarrito([])
      setVistaCarrito(false)
      setShowCheckout(false)
    } catch {
      setError('No se pudo enviar el pedido. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // ── Pedido OK ───────────────────────────────────────────────────────────────
  if (pedidoOk) return (
    <div className="carta-ok">
      <span className="carta-ok-icon"><CheckCircle size={56} /></span>
      <h2>¡Pedido enviado!</h2>
      <p>Tu pedido fue recibido. En breve lo estamos preparando.</p>
      <button className="carta-ok-btn" onClick={() => setPedidoOk(false)}>Volver al menú</button>
    </div>
  )

  // ── Vista carrito ───────────────────────────────────────────────────────────
  if (vistaCarrito) return (
    <div className="carta-layout">
      <header className="carta-cart-header">
        <button className="carta-back-btn" onClick={() => setVistaCarrito(false)}>‹</button>
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
          <span>{fmt(totalCarrito)}</span>
        </div>
        <div className="carta-cart-resumen-row carta-cart-total-row">
          <strong>Total</strong>
          <strong>{fmt(totalCarrito)}</strong>
        </div>
      </div>

      <div className="carta-cart-footer">
        <button className="carta-confirmar-btn" onClick={() => setShowCheckout(true)}>
          Continuar →
        </button>
      </div>

      {/* Checkout */}
      {showCheckout && (
        <div className="carta-checkout-overlay">
          <div className="carta-checkout">
            <div className="carta-checkout-header">
              <h3>Completá tu pedido</h3>
              <button className="carta-carrito-close" onClick={() => setShowCheckout(false)}>×</button>
            </div>
            <div className="carta-checkout-form">
              <div className="carta-checkout-field">
                <label>¿Cómo es tu pedido?</label>
                <div className="carta-tipo-row">
                  <button className={`carta-tipo-btn ${form.tipo === 'mesa' ? 'carta-tipo-btn--active' : ''}`} onClick={() => setForm(f => ({ ...f, tipo: 'mesa' }))}><Armchair size={15} /> En mesa</button>
                  <button className={`carta-tipo-btn ${form.tipo === 'takeaway' ? 'carta-tipo-btn--active' : ''}`} onClick={() => setForm(f => ({ ...f, tipo: 'takeaway' }))}><ShoppingBag size={15} /> Para llevar</button>
                </div>
              </div>
              {form.tipo === 'mesa' && (
                <div className="carta-checkout-field">
                  <label>Número de mesa *</label>
                  <input type="text" placeholder="Ej: 5" value={form.mesaNumero} onChange={e => setForm(f => ({ ...f, mesaNumero: e.target.value }))} />
                </div>
              )}
              <div className="carta-checkout-field">
                <label>Tu nombre (opcional)</label>
                <input type="text" placeholder="Ej: Juan" value={form.clienteNombre} onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))} />
              </div>
              <div className="carta-checkout-field">
                <label>Notas (opcional)</label>
                <textarea placeholder="Sin cebolla, extra salsa..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>
            <div className="carta-checkout-resumen">
              <span>{cantCarrito} producto{cantCarrito !== 1 ? 's' : ''}</span>
              <strong>{fmt(totalCarrito)}</strong>
            </div>
            <button
              className="carta-confirmar-btn"
              onClick={enviarPedido}
              disabled={enviando || (form.tipo === 'mesa' && !form.mesaNumero.trim())}
            >
              {enviando ? 'Enviando...' : 'Enviar pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Menú principal ──────────────────────────────────────────────────────────
  const catsSinProductos = new Set(
    categorias.filter(c => !productos.some(p => p.categoria === c._id)).map(c => c._id)
  )

  return (
    <div className="carta-layout">

      {/* Header */}
      <header className="carta-header">
        <div className="carta-header-avatar">{restaurante?.[0]?.toUpperCase()}</div>
        <h1 className="carta-header-nombre">{restaurante}</h1>
      </header>

      {/* Categorías */}
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

      {/* Lista de productos */}
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

      {/* Botón flotante carrito */}
      {cantCarrito > 0 && (
        <button className="carta-float-btn" onClick={() => setVistaCarrito(true)}>
          <span className="carta-float-cant">{cantCarrito}</span>
          Mi pedido
          <span className="carta-float-total">{fmt(totalCarrito)}</span>
        </button>
      )}

      {/* Modal detalle producto */}
      {productoOpen && (
        <div className="carta-prod-modal-overlay" onClick={() => setProductoOpen(null)}>
          <div className="carta-prod-modal" onClick={e => e.stopPropagation()}>
            <button className="carta-prod-modal-close" onClick={() => setProductoOpen(null)}>×</button>
            {productoOpen.imagen
              ? <img src={productoOpen.imagen} alt={productoOpen.nombre} className="carta-prod-modal-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
              : null
            }
            <div className="carta-prod-modal-img-placeholder" style={{ display: productoOpen.imagen ? 'none' : 'flex' }}><UtensilsCrossed size={40} /></div>
            <div className="carta-prod-modal-body">
              <h2 className="carta-prod-modal-nombre">{productoOpen.nombre}</h2>
              {productoOpen.descripcion && (
                <p className="carta-prod-modal-desc">{productoOpen.descripcion}</p>
              )}
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
