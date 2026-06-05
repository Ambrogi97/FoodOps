import { useState } from 'react'
import './Productos.css'

const CATEGORIAS_INICIALES = [
  { id: 1, nombre: 'Pizzas' },
  { id: 2, nombre: 'Panuzzo' },
  { id: 3, nombre: 'Calzones' },
  { id: 4, nombre: 'Bebidas' },
  { id: 5, nombre: 'Postres' },
]

const PRODUCTOS_INICIALES = [
  { id: 1,  categoriaId: 1, nombre: 'Margarita',        precio: 13000, costo: 4610,  activo: true },
  { id: 2,  categoriaId: 1, nombre: 'Napolitana',        precio: 14500, costo: 5200,  activo: true },
  { id: 3,  categoriaId: 1, nombre: 'Fugazzeta',         precio: 15000, costo: 5800,  activo: true },
  { id: 4,  categoriaId: 2, nombre: 'Panuzzo Crudo',     precio: 13500, costo: 9526,  activo: true },
  { id: 5,  categoriaId: 2, nombre: 'Panuzzo Speciale',  precio: 13500, costo: 7776,  activo: true },
  { id: 6,  categoriaId: 3, nombre: 'Calzone Clásico',   precio: 14000, costo: 6100,  activo: true },
  { id: 7,  categoriaId: 4, nombre: 'Coca Cola 500ml',   precio: 3500,  costo: 1200,  activo: true },
  { id: 8,  categoriaId: 4, nombre: 'Agua mineral',      precio: 2000,  costo: 600,   activo: true },
  { id: 9,  categoriaId: 4, nombre: 'Cerveza Heineken',  precio: 5000,  costo: 2100,  activo: true },
  { id: 10, categoriaId: 5, nombre: 'Tiramisú',          precio: 7000,  costo: 2800,  activo: true },
]

const fmt = (n) => n.toLocaleString('es-AR')
const pct = (n) => n.toFixed(1) + '%'
const margenPct  = (p, c) => ((p - c) / p) * 100
const markupPct  = (p, c) => ((p - c) / c) * 100

export default function Productos() {
  const [categorias, setCategorias] = useState(CATEGORIAS_INICIALES)
  const [productos, setProductos]   = useState(PRODUCTOS_INICIALES)
  const [catActiva, setCatActiva]   = useState(null) // null = todas
  const [selected, setSelected]     = useState(null)
  const [busqueda, setBusqueda]     = useState('')
  const [nextProdId, setNextProdId]               = useState(11)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [editando, setEditando]                   = useState(null)
  const [creando, setCreando]                     = useState(false)
  const [nuevoProducto, setNuevoProducto]         = useState({ nombre: '', categoriaId: 1, precio: '' })

  const productosFiltrados = productos.filter(p => {
    const matchCat = catActiva === null || p.categoriaId === catActiva
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  const producto = productos.find(p => p.id === selected)
  const catNombre = (id) => categorias.find(c => c.id === id)?.nombre ?? '—'

  const confirmarNuevoProducto = () => {
    if (!nuevoProducto.nombre.trim() || !nuevoProducto.precio) return
    setProductos([...productos, {
      id: nextProdId,
      nombre: nuevoProducto.nombre.trim(),
      categoriaId: Number(nuevoProducto.categoriaId),
      precio: Number(nuevoProducto.precio),
      costo: 0,
      activo: true,
    }])
    setNextProdId(nextProdId + 1)
    setCreando(false)
    setNuevoProducto({ nombre: '', categoriaId: 1, precio: '' })
  }

  const guardarEdicion = () => {
    if (!editando.nombre.trim() || !editando.precio || !editando.costo) return
    setProductos(productos.map(p => p.id === editando.id ? { ...editando, precio: Number(editando.precio), costo: Number(editando.costo) } : p))
    setEditando(null)
  }

  const eliminarProducto = (id) => {
    setProductos(productos.filter(p => p.id !== id))
    setSelected(null)
    setConfirmarEliminar(null)
  }

  return (
    <div className="prod-layout">
      <div className="prod-body">

        {/* Sidebar categorías */}
        <aside className="prod-sidebar">
          <p className="prod-sidebar-title">Categorías</p>
          <button
            className={`prod-cat-item ${catActiva === null ? 'prod-cat-item--active' : ''}`}
            onClick={() => { setCatActiva(null); setSelected(null) }}
          >
            Todas
            <span className="prod-cat-count">{productos.length}</span>
          </button>
          {categorias.map(c => (
            <button
              key={c.id}
              className={`prod-cat-item ${catActiva === c.id ? 'prod-cat-item--active' : ''}`}
              onClick={() => { setCatActiva(c.id); setSelected(null) }}
            >
              {c.nombre}
              <span className="prod-cat-count">{productos.filter(p => p.categoriaId === c.id).length}</span>
            </button>
          ))}
        </aside>

        {/* Tabla */}
        <div className="prod-main">
          <div className="prod-toolbar">
            <input
              className="prod-search"
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <button className="prod-btn-primary" onClick={() => setCreando(true)}>+ Nuevo producto</button>
          </div>

          <div className="prod-table-wrap">
            <table className="prod-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: 'right' }}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="prod-table-empty">No hay productos en esta categoría</td>
                  </tr>
                ) : (
                  productosFiltrados.map(p => (
                    <tr
                      key={p.id}
                      className={selected === p.id ? 'prod-row--active' : ''}
                      onClick={() => setSelected(selected === p.id ? null : p.id)}
                    >
                      <td className="prod-nombre">{p.nombre}</td>
                      <td>{catNombre(p.categoriaId)}</td>
                      <td className="prod-precio"><strong>${fmt(p.precio)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel detalle */}
        <div className="prod-detalle">
          {!producto ? (
            <div className="prod-detalle-empty">
              <span>🍽️</span>
              <p>Seleccioná un producto</p>
              <span>para ver sus detalles</span>
            </div>
          ) : (
            <div className="prod-detalle-content">
              <div className="prod-detalle-header">
                <h3 className="prod-detalle-nombre">{producto.nombre}</h3>
                <span className="prod-detalle-cat">{catNombre(producto.categoriaId)}</span>
              </div>

              <div className="prod-detalle-metrics">
                <div className="prod-metric">
                  <span>Precio</span>
                  <strong>${fmt(producto.precio)}</strong>
                </div>
              </div>

              <div className="prod-detalle-actions">
                <button className="prod-btn-primary" style={{ width: '100%' }} onClick={() => setEditando({ ...producto })}>Editar producto</button>
                <button className="prod-btn-danger" onClick={() => setConfirmarEliminar(producto.id)}>Eliminar</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal nuevo producto */}
      {creando && (
        <div className="prod-modal-overlay" onClick={() => { setCreando(false); setNuevoProducto({ nombre: '', categoriaId: 1, precio: '' }) }}>
          <div className="prod-modal prod-modal--edit" onClick={e => e.stopPropagation()}>
            <h3 className="prod-modal-title">Nuevo producto</h3>
            <div className="prod-form">
              <div className="prod-field">
                <label>Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Pizza Napolitana"
                  value={nuevoProducto.nombre}
                  onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="prod-field">
                <label>Categoría</label>
                <select
                  value={nuevoProducto.categoriaId}
                  onChange={e => setNuevoProducto({ ...nuevoProducto, categoriaId: Number(e.target.value) })}
                >
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="prod-field">
                <label>Precio</label>
                <input
                  type="number"
                  placeholder="0"
                  value={nuevoProducto.precio}
                  onChange={e => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
                />
              </div>
            </div>
            <div className="prod-modal-actions">
              <button className="prod-btn-secondary" onClick={() => { setCreando(false); setNuevoProducto({ nombre: '', categoriaId: 1, precio: '' }) }}>Cancelar</button>
              <button
                className="prod-btn-primary"
                onClick={confirmarNuevoProducto}
                disabled={!nuevoProducto.nombre.trim() || !nuevoProducto.precio}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar producto */}
      {editando && (
        <div className="prod-modal-overlay" onClick={() => setEditando(null)}>
          <div className="prod-modal prod-modal--edit" onClick={e => e.stopPropagation()}>
            <h3 className="prod-modal-title">Editar producto</h3>

            <div className="prod-form">
              <div className="prod-field">
                <label>Nombre</label>
                <input
                  type="text"
                  value={editando.nombre}
                  onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                />
              </div>
              <div className="prod-field">
                <label>Categoría</label>
                <select
                  value={editando.categoriaId}
                  onChange={e => setEditando({ ...editando, categoriaId: Number(e.target.value) })}
                >
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="prod-form-row">
                <div className="prod-field">
                  <label>Precio</label>
                  <input
                    type="number"
                    value={editando.precio}
                    onChange={e => setEditando({ ...editando, precio: e.target.value })}
                  />
                </div>
                <div className="prod-field">
                  <label>Costo</label>
                  <input
                    type="number"
                    value={editando.costo}
                    onChange={e => setEditando({ ...editando, costo: e.target.value })}
                  />
                </div>
              </div>
              {editando.precio && editando.costo && (
                <div className="prod-form-preview">
                  <span>Margen: <strong className="prod-margen-pos">{pct(margenPct(Number(editando.precio), Number(editando.costo)))}</strong></span>
                  <span>Markup: <strong>{pct(markupPct(Number(editando.precio), Number(editando.costo)))}</strong></span>
                </div>
              )}
            </div>

            <div className="prod-modal-actions">
              <button className="prod-btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="prod-btn-primary" onClick={guardarEdicion}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar !== null && (() => {
        const p = productos.find(x => x.id === confirmarEliminar)
        return (
          <div className="prod-modal-overlay" onClick={() => setConfirmarEliminar(null)}>
            <div className="prod-modal" onClick={e => e.stopPropagation()}>
              <h3 className="prod-modal-title">¿Eliminar producto?</h3>
              <p className="prod-modal-sub">Vas a eliminar <strong>{p?.nombre}</strong>. Esta acción no se puede deshacer.</p>
              <div className="prod-modal-actions">
                <button className="prod-btn-secondary" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
                <button className="prod-btn-confirm-danger" onClick={() => eliminarProducto(confirmarEliminar)}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
