import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import './Carta.css'

const API = 'http://localhost:3000'

const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

export default function Carta() {
  const { userId }    = useParams()
  const [datos, setDatos]         = useState(null)
  const [catActiva, setCatActiva] = useState(null)
  const [carrito, setCarrito]     = useState([])
  const [showCarrito, setShowCarrito] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [enviando, setEnviando]   = useState(false)
  const [pedidoOk, setPedidoOk]   = useState(false)
  const [error, setError]         = useState('')
  const [form, setForm] = useState({ tipo: 'mesa', mesaNumero: '', clienteNombre: '', notas: '' })

  useEffect(() => {
    fetch(`${API}/api/carta/${userId}`)
      .then(r => r.json())
      .then(data => { setDatos(data); setCatActiva(null) })
      .catch(() => setError('No se pudo cargar el menú'))
  }, [userId])

  if (error) return (
    <div className="carta-error">
      <span>😕</span>
      <p>{error}</p>
    </div>
  )

  if (!datos) return (
    <div className="carta-loading">
      <div className="carta-spinner" />
    </div>
  )

  const { restaurante, categorias, productos } = datos

  const productosFiltrados = catActiva
    ? productos.filter(p => p.categoria === catActiva)
    : productos

  const totalCarrito = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const cantCarrito  = carrito.reduce((acc, i) => acc + i.cantidad, 0)

  const agregar = (prod) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === prod._id)
      return existe
        ? prev.map(i => i.id === prod._id ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...prev, { id: prod._id, nombre: prod.nombre, precio: prod.precio, cantidad: 1 }]
    })
  }

  const quitar = (id) => {
    setCarrito(prev => prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i).filter(i => i.cantidad > 0))
  }

  const cantEnCarrito = (id) => carrito.find(i => i.id === id)?.cantidad || 0

  const enviarPedido = async () => {
    if (form.tipo === 'mesa' && !form.mesaNumero.trim()) return
    setEnviando(true)
    try {
      const res = await fetch(`${API}/api/carta/${userId}/pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: carrito.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
          tipo:          form.tipo,
          mesaNumero:    form.mesaNumero,
          clienteNombre: form.clienteNombre,
          notas:         form.notas,
        }),
      })
      if (!res.ok) throw new Error()
      setPedidoOk(true)
      setCarrito([])
      setShowCheckout(false)
      setShowCarrito(false)
    } catch {
      setError('No se pudo enviar el pedido. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (pedidoOk) return (
    <div className="carta-ok">
      <span className="carta-ok-icon">✅</span>
      <h2>¡Pedido enviado!</h2>
      <p>Tu pedido fue recibido. En breve lo estamos preparando.</p>
      <button className="carta-ok-btn" onClick={() => setPedidoOk(false)}>Volver al menú</button>
    </div>
  )

  return (
    <div className="carta-layout">

      {/* Header */}
      <header className="carta-header">
        <span className="carta-header-icon">🍽️</span>
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
            {categorias.map(c => (
              <button
                key={c._id}
                className={`carta-cat-btn ${catActiva === c._id ? 'carta-cat-btn--active' : ''}`}
                onClick={() => setCatActiva(c._id)}
              >{c.nombre}</button>
            ))}
          </div>
        </div>
      )}

      {/* Productos */}
      <div className="carta-productos">
        {productosFiltrados.length === 0 ? (
          <div className="carta-empty">No hay productos en esta categoría</div>
        ) : (
          productosFiltrados.map(p => {
            const cant = cantEnCarrito(p._id)
            return (
              <div key={p._id} className="carta-prod">
                {p.imagen && (
                  <img src={p.imagen} alt={p.nombre} className="carta-prod-img" />
                )}
                <div className="carta-prod-body">
                  <div className="carta-prod-info">
                    <span className="carta-prod-nombre">{p.nombre}</span>
                    <span className="carta-prod-precio">{fmt(p.precio)}</span>
                  </div>
                  <div className="carta-prod-ctrl">
                    {cant > 0 ? (
                      <>
                        <button className="carta-ctrl-btn" onClick={() => quitar(p._id)}>−</button>
                        <span className="carta-ctrl-cant">{cant}</span>
                        <button className="carta-ctrl-btn carta-ctrl-btn--add" onClick={() => agregar(p)}>+</button>
                      </>
                    ) : (
                      <button className="carta-add-btn" onClick={() => agregar(p)}>Agregar</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Botón carrito flotante */}
      {cantCarrito > 0 && !showCarrito && (
        <button className="carta-float-btn" onClick={() => setShowCarrito(true)}>
          <span className="carta-float-cant">{cantCarrito}</span>
          Ver pedido
          <span className="carta-float-total">{fmt(totalCarrito)}</span>
        </button>
      )}

      {/* Panel carrito */}
      {showCarrito && (
        <div className="carta-carrito-overlay" onClick={() => setShowCarrito(false)}>
          <div className="carta-carrito" onClick={e => e.stopPropagation()}>
            <div className="carta-carrito-header">
              <h3>Tu pedido</h3>
              <button className="carta-carrito-close" onClick={() => setShowCarrito(false)}>×</button>
            </div>

            <div className="carta-carrito-items">
              {carrito.map(item => (
                <div key={item.id} className="carta-carrito-item">
                  <div className="carta-carrito-item-info">
                    <span className="carta-carrito-item-nombre">{item.nombre}</span>
                    <span className="carta-carrito-item-precio">{fmt(item.precio * item.cantidad)}</span>
                  </div>
                  <div className="carta-ctrl-row">
                    <button className="carta-ctrl-btn" onClick={() => quitar(item.id)}>−</button>
                    <span className="carta-ctrl-cant">{item.cantidad}</span>
                    <button className="carta-ctrl-btn carta-ctrl-btn--add" onClick={() => agregar({ _id: item.id, nombre: item.nombre, precio: item.precio })}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="carta-carrito-total">
              <span>Total</span>
              <strong>{fmt(totalCarrito)}</strong>
            </div>

            <button className="carta-confirmar-btn" onClick={() => { setShowCarrito(false); setShowCheckout(true) }}>
              Confirmar pedido →
            </button>
          </div>
        </div>
      )}

      {/* Modal checkout */}
      {showCheckout && (
        <div className="carta-checkout-overlay">
          <div className="carta-checkout">
            <div className="carta-checkout-header">
              <h3>Completá tu pedido</h3>
              <button className="carta-carrito-close" onClick={() => { setShowCheckout(false); setShowCarrito(true) }}>×</button>
            </div>

            <div className="carta-checkout-form">
              <div className="carta-checkout-field">
                <label>¿Cómo es tu pedido?</label>
                <div className="carta-tipo-row">
                  <button
                    className={`carta-tipo-btn ${form.tipo === 'mesa' ? 'carta-tipo-btn--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, tipo: 'mesa' }))}
                  >🪑 En mesa</button>
                  <button
                    className={`carta-tipo-btn ${form.tipo === 'takeaway' ? 'carta-tipo-btn--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, tipo: 'takeaway' }))}
                  >🥡 Para llevar</button>
                </div>
              </div>

              {form.tipo === 'mesa' && (
                <div className="carta-checkout-field">
                  <label>Número de mesa *</label>
                  <input
                    type="text"
                    placeholder="Ej: 5"
                    value={form.mesaNumero}
                    onChange={e => setForm(f => ({ ...f, mesaNumero: e.target.value }))}
                  />
                </div>
              )}

              <div className="carta-checkout-field">
                <label>Tu nombre (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Juan"
                  value={form.clienteNombre}
                  onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))}
                />
              </div>

              <div className="carta-checkout-field">
                <label>Notas (opcional)</label>
                <textarea
                  placeholder="Sin cebolla, extra salsa, etc."
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                />
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
}
