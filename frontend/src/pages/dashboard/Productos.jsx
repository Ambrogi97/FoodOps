import { useState } from 'react'
import './Productos.css'

const fmt = (n) => n.toLocaleString('es-AR')
const pct = (n) => n.toFixed(1) + '%'
const margenPct  = (p, c) => ((p - c) / p) * 100
const markupPct  = (p, c) => ((p - c) / c) * 100

export default function Productos({ productos, setProductos, categorias, setCategorias }) {
  const [catActiva, setCatActiva]   = useState(null) // null = todas
  const [selected, setSelected]     = useState(null)
  const [busqueda, setBusqueda]     = useState('')
  const [nextProdId, setNextProdId]               = useState(11)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [editando, setEditando]                   = useState(null)
  const [creando, setCreando]                     = useState(false)
  const [nuevoProducto, setNuevoProducto]         = useState({ nombre: '', categoriaId: 1, precio: '' })
  const [creandoCat, setCreandoCat]               = useState(false)
  const [nombreCat, setNombreCat]                 = useState('')
  const [nextCatId, setNextCatId]                 = useState(6)
  const [confirmarEliminarCat, setConfirmarEliminarCat] = useState(null)

  const productosFiltrados = productos.filter(p => {
    const matchCat = catActiva === null || p.categoriaId === catActiva
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  const producto = productos.find(p => p.id === selected)
  const catNombre = (id) => categorias.find(c => c.id === id)?.nombre ?? '—'

  const confirmarNuevaCategoria = () => {
    const nombre = nombreCat.trim()
    if (!nombre) return
    setCategorias([...categorias, { id: nextCatId, nombre }])
    setNextCatId(nextCatId + 1)
    setCreandoCat(false)
    setNombreCat('')
  }

  const eliminarCategoria = (id) => {
    setCategorias(categorias.filter(c => c.id !== id))
    setProductos(productos.filter(p => p.categoriaId !== id))
    if (catActiva === id) { setCatActiva(null); setSelected(null) }
    setConfirmarEliminarCat(null)
  }

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
          <div className="prod-sidebar-header">
            <p className="prod-sidebar-title">Categorías</p>
            <button className="prod-cat-add" onClick={() => setCreandoCat(true)} title="Nueva categoría">+</button>
          </div>
          <button
            className={`prod-cat-item ${catActiva === null ? 'prod-cat-item--active' : ''}`}
            onClick={() => { setCatActiva(null); setSelected(null) }}
          >
            Todas
            <span className="prod-cat-count">{productos.length}</span>
          </button>
          {categorias.map(c => (
            <div key={c.id} className={`prod-cat-row ${catActiva === c.id ? 'prod-cat-row--active' : ''}`}>
              <button
                className="prod-cat-item prod-cat-item--fill"
                onClick={() => { setCatActiva(c.id); setSelected(null) }}
              >
                {c.nombre}
                <span className="prod-cat-count">{productos.filter(p => p.categoriaId === c.id).length}</span>
              </button>
              <button
                className="prod-cat-remove"
                onClick={() => setConfirmarEliminarCat(c.id)}
                title="Eliminar categoría"
              >×</button>
            </div>
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

      {/* Modal confirmar eliminar categoría */}
      {confirmarEliminarCat !== null && (() => {
        const cat = categorias.find(c => c.id === confirmarEliminarCat)
        const cantProds = productos.filter(p => p.categoriaId === confirmarEliminarCat).length
        return (
          <div className="prod-modal-overlay" onClick={() => setConfirmarEliminarCat(null)}>
            <div className="prod-modal" onClick={e => e.stopPropagation()}>
              <h3 className="prod-modal-title">¿Eliminar categoría?</h3>
              <p className="prod-modal-sub">
                Vas a eliminar <strong>{cat?.nombre}</strong>.
                {cantProds > 0 && <span className="prod-modal-warning"> Esta categoría tiene <strong>{cantProds} producto{cantProds > 1 ? 's' : ''}</strong> que también serán eliminados.</span>}
              </p>
              <div className="prod-modal-actions">
                <button className="prod-btn-secondary" onClick={() => setConfirmarEliminarCat(null)}>Cancelar</button>
                <button className="prod-btn-confirm-danger" onClick={() => eliminarCategoria(confirmarEliminarCat)}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal nueva categoría */}
      {creandoCat && (
        <div className="prod-modal-overlay" onClick={() => { setCreandoCat(false); setNombreCat('') }}>
          <div className="prod-modal" onClick={e => e.stopPropagation()}>
            <h3 className="prod-modal-title">Nueva categoría</h3>
            <div className="prod-form">
              <div className="prod-field">
                <label>Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Ensaladas"
                  value={nombreCat}
                  onChange={e => setNombreCat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmarNuevaCategoria()}
                  autoFocus
                />
              </div>
            </div>
            <div className="prod-modal-actions">
              <button className="prod-btn-secondary" onClick={() => { setCreandoCat(false); setNombreCat('') }}>Cancelar</button>
              <button className="prod-btn-primary" onClick={confirmarNuevaCategoria} disabled={!nombreCat.trim()}>Crear</button>
            </div>
          </div>
        </div>
      )}

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
