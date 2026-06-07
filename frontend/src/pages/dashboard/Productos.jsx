import { useState, useRef } from 'react'
import { categoriasService, productosService } from '../../services/api'
import './Productos.css'

const fmt = (n) => n.toLocaleString('es-AR')
const pct = (n) => n.toFixed(1) + '%'
const margenPct = (p, c) => ((p - c) / p) * 100
const markupPct = (p, c) => ((p - c) / c) * 100

export default function Productos({ productos, setProductos, categorias, setCategorias }) {
  const [catActiva, setCatActiva]   = useState(null)
  const [selected, setSelected]     = useState(null)
  const [busqueda, setBusqueda]     = useState('')
  const [confirmarEliminar, setConfirmarEliminar]       = useState(null)
  const [editando, setEditando]                         = useState(null)
  const [creando, setCreando]                           = useState(false)
  const [nuevoProducto, setNuevoProducto]               = useState({ nombre: '', categoriaId: '', precio: '', imagen: '', descripcion: '' })
  const [subiendoImagen, setSubiendoImagen]             = useState(false)
  const fileInputCrear  = useRef(null)
  const fileInputEditar = useRef(null)
  const [creandoCat, setCreandoCat]                     = useState(false)
  const [nombreCat, setNombreCat]                       = useState('')
  const [confirmarEliminarCat, setConfirmarEliminarCat] = useState(null)
  const [editandoCat, setEditandoCat]                   = useState(null)
  const [nombreCatEdit, setNombreCatEdit]               = useState('')

  const productosFiltrados = productos.filter(p => {
    const matchCat  = catActiva === null || p.categoriaId === catActiva
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  const producto   = productos.find(p => p.id === selected)
  const catNombre  = (id) => categorias.find(c => c.id === id)?.nombre ?? '—'

  const confirmarNuevaCategoria = async () => {
    const nombre = nombreCat.trim()
    if (!nombre) return
    try {
      const nueva = await categoriasService.crear({ nombre })
      setCategorias([...categorias, nueva])
      setCreandoCat(false)
      setNombreCat('')
    } catch (e) {
      console.error(e)
    }
  }

  const guardarEdicionCat = async () => {
    const nombre = nombreCatEdit.trim()
    if (!nombre) return
    if (nombre === editandoCat.nombre) { setEditandoCat(null); return }
    try {
      const actualizada = await categoriasService.actualizar(editandoCat.id, { nombre })
      setCategorias(categorias.map(c => c.id === actualizada.id ? actualizada : c))
      setEditandoCat(null)
    } catch (e) {
      console.error('Error al renombrar categoría:', e)
    }
  }

  const eliminarCategoria = async (id) => {
    try {
      await categoriasService.eliminar(id)
      setCategorias(categorias.filter(c => c.id !== id))
      setProductos(productos.filter(p => p.categoriaId !== id))
      if (catActiva === id) { setCatActiva(null); setSelected(null) }
      setConfirmarEliminarCat(null)
    } catch (e) {
      console.error(e)
    }
  }

  const subirImagen = async (file, setter) => {
    if (!file) return
    setSubiendoImagen(true)
    try {
      const url = await productosService.uploadImagen(file)
      setter(url)
    } catch (e) {
      console.error('Error al subir imagen:', e)
    } finally {
      setSubiendoImagen(false)
    }
  }

  const confirmarNuevoProducto = async () => {
    if (!nuevoProducto.nombre.trim() || !nuevoProducto.precio) return
    try {
      const nuevo = await productosService.crear({
        nombre:      nuevoProducto.nombre.trim(),
        categoria:   nuevoProducto.categoriaId,
        precio:      Number(nuevoProducto.precio),
        costo:       0,
        imagen:      nuevoProducto.imagen,
        descripcion: nuevoProducto.descripcion,
      })
      setProductos([...productos, nuevo])
      setCreando(false)
      setNuevoProducto({ nombre: '', categoriaId: '', precio: '', imagen: '', descripcion: '' })
    } catch (e) {
      console.error(e)
    }
  }

  const guardarEdicion = async () => {
    if (!editando.nombre.trim() || editando.precio === '' || editando.precio === null) return
    try {
      const actualizado = await productosService.actualizar(editando.id, {
        nombre:      editando.nombre.trim(),
        categoria:   editando.categoriaId,
        precio:      Number(editando.precio),
        imagen:      editando.imagen      || '',
        descripcion: editando.descripcion || '',
      })
      setProductos(productos.map(p => p.id === editando.id ? actualizado : p))
      setEditando(null)
    } catch (e) {
      console.error(e)
    }
  }

  const eliminarProducto = async (id) => {
    try {
      await productosService.eliminar(id)
      setProductos(productos.filter(p => p.id !== id))
      setSelected(null)
      setConfirmarEliminar(null)
    } catch (e) {
      console.error(e)
    }
  }

  const abrirNuevoProducto = () => {
    setNuevoProducto({ nombre: '', categoriaId: categorias[0]?.id || '', precio: '', imagen: '' })
    setCreando(true)
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
                className="prod-cat-edit"
                onClick={() => { setEditandoCat(c); setNombreCatEdit(c.nombre) }}
                title="Renombrar categoría"
              >✎</button>
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
            <button className="prod-btn-primary" onClick={abrirNuevoProducto}>+ Nuevo producto</button>
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
              {producto.imagen && (
                <img src={producto.imagen} alt={producto.nombre} className="prod-detalle-img" />
              )}
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
        const cat      = categorias.find(c => c.id === confirmarEliminarCat)
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

      {/* Modal editar categoría */}
      {editandoCat && (
        <div className="prod-modal-overlay">
          <div className="prod-modal">
            <h3 className="prod-modal-title">Renombrar categoría</h3>
            <div className="prod-form">
              <div className="prod-field">
                <label>Nombre</label>
                <input
                  type="text"
                  value={nombreCatEdit}
                  onChange={e => setNombreCatEdit(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarEdicionCat()}
                  autoFocus
                />
              </div>
            </div>
            <div className="prod-modal-actions">
              <button className="prod-btn-secondary" onClick={() => setEditandoCat(null)}>Cancelar</button>
              <button className="prod-btn-primary" onClick={guardarEdicionCat} disabled={!nombreCatEdit.trim()}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva categoría */}
      {creandoCat && (
        <div className="prod-modal-overlay">
          <div className="prod-modal">
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
        <div className="prod-modal-overlay">
          <div className="prod-modal prod-modal--edit">
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
                  onChange={e => setNuevoProducto({ ...nuevoProducto, categoriaId: e.target.value })}
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
              <div className="prod-field">
                <label>Descripción (opcional)</label>
                <textarea
                  placeholder="Ej: Con papas fritas y ensalada"
                  value={nuevoProducto.descripcion}
                  onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="prod-field">
                <label>Foto del plato (opcional)</label>
                <input
                  ref={fileInputCrear}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => subirImagen(e.target.files[0], url => setNuevoProducto(p => ({ ...p, imagen: url })))}
                />
                {nuevoProducto.imagen ? (
                  <div className="prod-img-preview">
                    <img src={nuevoProducto.imagen} alt="preview" />
                    <button className="prod-img-remove" onClick={() => setNuevoProducto(p => ({ ...p, imagen: '' }))}>× Quitar</button>
                  </div>
                ) : (
                  <button
                    className="prod-img-upload-btn"
                    onClick={() => fileInputCrear.current.click()}
                    disabled={subiendoImagen}
                  >
                    {subiendoImagen ? 'Subiendo...' : '📷 Subir foto'}
                  </button>
                )}
              </div>
            </div>
            <div className="prod-modal-actions">
              <button className="prod-btn-secondary" onClick={() => { setCreando(false); setNuevoProducto({ nombre: '', categoriaId: '', precio: '', imagen: '' }) }}>Cancelar</button>
              <button
                className="prod-btn-primary"
                onClick={confirmarNuevoProducto}
                disabled={!nuevoProducto.nombre.trim() || !nuevoProducto.precio || subiendoImagen}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar producto */}
      {editando && (
        <div className="prod-modal-overlay">
          <div className="prod-modal prod-modal--edit">
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
                  onChange={e => setEditando({ ...editando, categoriaId: e.target.value })}
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
                  value={editando.precio}
                  onChange={e => setEditando({ ...editando, precio: e.target.value })}
                />
              </div>
              <div className="prod-field">
                <label>Descripción (opcional)</label>
                <textarea
                  placeholder="Ej: Con papas fritas y ensalada"
                  value={editando.descripcion || ''}
                  onChange={e => setEditando({ ...editando, descripcion: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="prod-field">
                <label>Foto del plato (opcional)</label>
                <input
                  ref={fileInputEditar}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => subirImagen(e.target.files[0], url => setEditando(p => ({ ...p, imagen: url })))}
                />
                {editando.imagen ? (
                  <div className="prod-img-preview">
                    <img src={editando.imagen} alt="preview" />
                    <button className="prod-img-remove" onClick={() => setEditando(p => ({ ...p, imagen: '' }))}>× Quitar</button>
                  </div>
                ) : (
                  <button
                    className="prod-img-upload-btn"
                    onClick={() => fileInputEditar.current.click()}
                    disabled={subiendoImagen}
                  >
                    {subiendoImagen ? 'Subiendo...' : '📷 Subir foto'}
                  </button>
                )}
              </div>
            </div>

            <div className="prod-modal-actions">
              <button className="prod-btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="prod-btn-primary" onClick={guardarEdicion} disabled={subiendoImagen}>Guardar</button>
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
