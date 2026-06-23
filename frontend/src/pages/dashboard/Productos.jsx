import { useState, useEffect, useRef } from 'react'
import { categoriasService, productosService, ingredientesService, stockService } from '../../services/api'
import { ChevronLeft, Plus, Trash2, Edit2, X, Search, Star, Camera } from 'lucide-react'
import './Productos.css'

// ── Utils ──────────────────────────────────────────────────────────────────
const fmtPrecio = n => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct    = n => `${Number(n || 0).toFixed(1)}%`

const UNIDADES = ['kg', 'g', 'L', 'mL', 'unid.', 'porción', 'cc']

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const uploadImagen = async (file) => {
  const token = localStorage.getItem('token')
  const fd = new FormData()
  fd.append('imagen', file)
  const res = await fetch(`${API_URL}/api/uploads/producto`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || 'Error al subir imagen')
  return json.url
}

// ── FormProducto ──────────────────────────────────────────────────────────
function FormProducto({ producto, categorias, ingredientes, onGuardar, onCancelar, onEliminar }) {
  const esNuevo = !producto
  const [form, setForm] = useState({
    nombre:       producto?.nombre       || '',
    categoriaId:  producto?.categoriaId  || '',
    precio:       producto?.precio       || '',
    descripcion:  producto?.descripcion  || '',
    activo:       producto?.activo       !== false,
    controlStock: producto?.controlStock || false,
    tiempoPrepMin: producto?.tiempoPrepMin || '',
  })
  const [imagen, setImagen]           = useState(producto?.imagen || '')
  const [imgPreview, setImgPreview]   = useState(producto?.imagen || '')
  const [subiendo, setSubiendo]       = useState(false)
  const imgInputRef                   = useRef()
  const [receta, setReceta]           = useState(producto?.receta || [])
  const [guardando, setGuardando]     = useState(false)
  const [confirmElim, setConfirmElim] = useState(false)
  const [errores, setErrores]         = useState({})

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleImagen = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgPreview(URL.createObjectURL(file))
    setSubiendo(true)
    try {
      const url = await uploadImagen(file)
      setImagen(url)
    } catch (err) {
      console.error(err)
      setImgPreview(imagen)
    } finally { setSubiendo(false) }
  }

  // Costo calculado desde receta
  const costoReceta = receta.reduce((total, row) => {
    const ing = ingredientes.find(i => i.id === row.ingredienteId)
    if (!ing || !row.cantNeta) return total
    const cantBruta = ing.merma > 0 ? row.cantNeta / (1 - ing.merma / 100) : row.cantNeta
    return total + cantBruta * ing.costo
  }, 0)

  const agregarFila = () => setReceta(r => [...r, { ingredienteId: '', cantNeta: '', unidad: '' }])
  const quitarFila  = i  => setReceta(r => r.filter((_, idx) => idx !== i))
  const editarFila  = (i, k, v) => setReceta(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row))

  const validar = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = true
    if (!form.categoriaId)   e.categoriaId = true
    if (!form.precio)        e.precio = true
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const payload = {
        nombre:       form.nombre.trim(),
        categoria:    form.categoriaId,
        precio:       Number(form.precio),
        costo:        costoReceta > 0 ? costoReceta : (producto?.costo || 0),
        descripcion:  form.descripcion,
        imagen:       imagen,
        activo:       form.activo,
        controlStock: form.controlStock,
        tiempoPrepMin: form.tiempoPrepMin ? Number(form.tiempoPrepMin) : null,
        receta:       receta.filter(r => r.ingredienteId && r.cantNeta),
      }
      const prod = esNuevo
        ? await productosService.crear(payload)
        : await productosService.actualizar(producto.id, payload)
      onGuardar(prod)
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  return (
    <div className="pf-page">
      {/* Header */}
      <div className="pf-header">
        <button className="pf-back" onClick={onCancelar}><ChevronLeft size={18} /></button>
        <span className="pf-header-title">
          {esNuevo ? 'Nuevo producto' : `Producto: ${producto.nombre}`}
        </span>
        {!esNuevo && (
          confirmElim
            ? <>
                <span className="pf-confirm-txt">¿Eliminar?</span>
                <button className="pf-confirm-no"  onClick={() => setConfirmElim(false)}>Cancelar</button>
                <button className="pf-confirm-yes" onClick={onEliminar}>Eliminar</button>
              </>
            : <button className="pf-del-btn" onClick={() => setConfirmElim(true)}><Trash2 size={16} /></button>
        )}
      </div>

      {/* Body */}
      <div className="pf-body">
        {/* Columna izquierda — Detalles */}
        <div className="pf-left">

          <div className="pf-section-title">Detalles</div>

          {/* Imagen */}
          <div className="pf-img-wrap">
            <div className="pf-img-preview" onClick={() => imgInputRef.current?.click()}>
              {imgPreview
                ? <img src={imgPreview} alt="producto" className="pf-img-thumb" />
                : <span className="pf-img-placeholder"><Camera size={22} /><span>Agregar imagen</span></span>
              }
              {subiendo && <div className="pf-img-overlay">Subiendo...</div>}
            </div>
            {imgPreview && (
              <button className="pf-img-remove" onClick={() => { setImagen(''); setImgPreview('') }}>
                <X size={13} /> Quitar
              </button>
            )}
            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagen} />
          </div>

          <div className="pf-field">
            <label>Nombre *</label>
            <input className={`pf-input${errores.nombre ? ' pf-input--err' : ''}`}
              value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
            {errores.nombre && <span className="pf-err-msg">× Campo requerido</span>}
          </div>
          <div className="pf-row2">
            <div className="pf-field">
              <label>Categoría *</label>
              <select className={`pf-input${errores.categoriaId ? ' pf-input--err' : ''}`}
                value={form.categoriaId} onChange={e => setF('categoriaId', e.target.value)}>
                <option value="">Seleccionar</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {errores.categoriaId && <span className="pf-err-msg">× Campo requerido</span>}
            </div>
            <div className="pf-field">
              <label>Precio *</label>
              <div className="pf-prefix-wrap">
                <span className="pf-prefix">$</span>
                <input type="number" min="0" className={`pf-input pf-input--prefixed${errores.precio ? ' pf-input--err' : ''}`}
                  value={form.precio} onChange={e => setF('precio', e.target.value)} />
              </div>
              {errores.precio && <span className="pf-err-msg">× Campo requerido</span>}
            </div>
          </div>
          <div className="pf-field" style={{ maxWidth: 180 }}>
            <label>Costo</label>
            <div className="pf-prefix-wrap">
              <span className="pf-prefix">$</span>
              <input type="number" min="0" readOnly className="pf-input pf-input--prefixed pf-input--readonly"
                value={costoReceta > 0 ? costoReceta.toFixed(2) : (producto?.costo || '')}
                placeholder="0" />
            </div>
          </div>
          <div className="pf-field">
            <label>Descripción</label>
            <textarea className="pf-input pf-textarea" rows={2}
              value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} />
          </div>

          <div className="pf-check-row">
            <label>Activo</label>
            <input type="checkbox" checked={form.activo} onChange={e => setF('activo', e.target.checked)} />
          </div>

          <div className="pf-section-title" style={{ marginTop: 12 }}>Control de Stock</div>
          <div className="pf-check-row">
            <label>Controlar stock</label>
            <input type="checkbox" checked={form.controlStock} onChange={e => setF('controlStock', e.target.checked)} />
          </div>

          <div className="pf-section-title" style={{ marginTop: 12 }}>Monitor de cocina (KDS)</div>
          <div className="pf-field">
            <label>Tiempo de preparación (minutos)</label>
            <input type="number" min="0" className="pf-input" style={{ width: 120 }}
              value={form.tiempoPrepMin} onChange={e => setF('tiempoPrepMin', e.target.value)} />
          </div>
        </div>

        {/* Columna derecha — Receta */}
        <div className="pf-right">
          <div className="pf-section-title">Receta</div>
          <p className="pf-receta-hint">Añade los ingredientes que componen este producto.</p>

          {receta.length > 0 && (
            <div className="pf-receta-table">
              <div className="pf-receta-head">
                <span>Ingrediente</span>
                <span>Cant. neta</span>
                <span>Merma</span>
                <span>Cant. bruta</span>
                <span>Costo</span>
                <span></span>
              </div>
              {receta.map((row, i) => {
                const ing = ingredientes.find(x => x.id === row.ingredienteId)
                const cantBruta = ing?.merma > 0 ? (Number(row.cantNeta) / (1 - ing.merma / 100)) : Number(row.cantNeta)
                const costoFila = ing ? cantBruta * ing.costo : 0
                return (
                  <div key={i} className="pf-receta-row">
                    <select className="pf-input pf-receta-ing"
                      value={row.ingredienteId}
                      onChange={e => {
                        const ing2 = ingredientes.find(x => x.id === e.target.value)
                        editarFila(i, 'ingredienteId', e.target.value)
                        if (ing2) editarFila(i, 'unidad', ing2.unidad)
                      }}>
                      <option value="">Buscar ingrediente...</option>
                      {ingredientes.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                    </select>
                    <div className="pf-receta-cant">
                      <input type="number" min="0" className="pf-input" placeholder="0"
                        value={row.cantNeta} onChange={e => editarFila(i, 'cantNeta', e.target.value)} />
                      <select className="pf-input pf-unit-sel"
                        value={row.unidad} onChange={e => editarFila(i, 'unidad', e.target.value)}>
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <span className="pf-receta-cell pf-muted">{ing ? `${ing.merma}%` : '—'}</span>
                    <span className="pf-receta-cell pf-muted">{row.cantNeta && ing ? `${cantBruta.toFixed(2)} ${row.unidad}` : '—'}</span>
                    <span className="pf-receta-cell">{row.cantNeta && ing ? fmtPrecio(costoFila) : '$0,00'}</span>
                    <button className="pf-receta-del" onClick={() => quitarFila(i)}><X size={13} /></button>
                  </div>
                )
              })}
              {receta.length > 0 && (
                <div className="pf-receta-total">
                  <span>Total receta</span>
                  <span>{costoReceta > 0 ? fmtPrecio(costoReceta) : '—'}</span>
                </div>
              )}
            </div>
          )}

          <button className="pf-add-ing" onClick={agregarFila}>
            <Plus size={13} /> Ingrediente
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pf-footer">
        <button className="pf-btn-cancel" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="pf-btn-save"   onClick={guardar}    disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── FormIngrediente ───────────────────────────────────────────────────────
function FormIngrediente({ ingrediente, catOptions, onGuardar, onCancelar, onEliminar }) {
  const esNuevo = !ingrediente
  const [form, setForm] = useState({
    nombre:       ingrediente?.nombre       || '',
    categoria:    ingrediente?.categoria    || 'Varios',
    unidad:       ingrediente?.unidad       || '',
    costo:        ingrediente?.costo        || '',
    merma:        ingrediente?.merma        || '',
    controlStock: ingrediente?.controlStock || false,
  })
  const [guardando, setGuardando]     = useState(false)
  const [confirmElim, setConfirmElim] = useState(false)
  const [errores, setErrores]         = useState({})

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validar = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = true
    if (!form.unidad)        e.unidad = true
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const payload = {
        nombre:       form.nombre.trim(),
        categoria:    form.categoria || 'Varios',
        unidad:       form.unidad,
        costo:        Number(form.costo)  || 0,
        merma:        Number(form.merma)  || 0,
        controlStock: form.controlStock,
      }
      const ing = esNuevo
        ? await ingredientesService.crear(payload)
        : await ingredientesService.actualizar(ingrediente.id, payload)
      onGuardar(ing)
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  return (
    <div className="pf-page">
      <div className="pf-header">
        <button className="pf-back" onClick={onCancelar}><ChevronLeft size={18} /></button>
        <span className="pf-header-title">
          {esNuevo ? 'Nuevo ingrediente' : `Ingrediente: ${ingrediente.nombre}`}
        </span>
        {!esNuevo && (
          confirmElim
            ? <>
                <span className="pf-confirm-txt">¿Eliminar?</span>
                <button className="pf-confirm-no"  onClick={() => setConfirmElim(false)}>Cancelar</button>
                <button className="pf-confirm-yes" onClick={onEliminar}>Eliminar</button>
              </>
            : <button className="pf-del-btn" onClick={() => setConfirmElim(true)}><Trash2 size={16} /></button>
        )}
      </div>

      <div className="pf-body">
        <div className="pf-left">
          <div className="pf-section-title">Detalles</div>
          <div className="pf-field">
            <label>Nombre *</label>
            <input className={`pf-input${errores.nombre ? ' pf-input--err' : ''}`}
              value={form.nombre} onChange={e => setF('nombre', e.target.value)} autoFocus />
            {errores.nombre && <span className="pf-err-msg">× Campo requerido</span>}
          </div>
          <div className="pf-row2">
            <div className="pf-field">
              <label>Categoría</label>
              <input list="ing-cats" className="pf-input" value={form.categoria}
                onChange={e => setF('categoria', e.target.value)} />
              <datalist id="ing-cats">
                {catOptions.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="pf-field">
              <label>Unidad *</label>
              <select className={`pf-input${errores.unidad ? ' pf-input--err' : ''}`}
                value={form.unidad} onChange={e => setF('unidad', e.target.value)}>
                <option value="">Seleccionar</option>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {errores.unidad && <span className="pf-err-msg">× Campo requerido</span>}
            </div>
          </div>
          <div className="pf-row2">
            <div className="pf-field">
              <label>Costo</label>
              <div className="pf-prefix-wrap">
                <span className="pf-prefix">$</span>
                <input type="number" min="0" className="pf-input pf-input--prefixed"
                  value={form.costo} onChange={e => setF('costo', e.target.value)} />
              </div>
            </div>
            <div className="pf-field">
              <label>Merma %</label>
              <input type="number" min="0" max="100" className="pf-input"
                value={form.merma} onChange={e => setF('merma', e.target.value)} />
            </div>
          </div>
          <div className="pf-section-title" style={{ marginTop: 12 }}>Control de Stock</div>
          <div className="pf-check-row">
            <label>Controlar stock</label>
            <input type="checkbox" checked={form.controlStock} onChange={e => setF('controlStock', e.target.checked)} />
          </div>
        </div>

        <div className="pf-right">
          <div className="pf-section-title">Receta</div>
          <p className="pf-receta-hint">
            Añade los subingredientes que componen este ingrediente. Luego podrás crear una ficha técnica para estandarizar su elaboración.
          </p>
        </div>
      </div>

      <div className="pf-footer">
        <button className="pf-btn-cancel" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="pf-btn-save"   onClick={guardar}    disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── TabProductos ──────────────────────────────────────────────────────────
function TabProductos({ productos, setProductos, categorias, ingredientes }) {
  const [catActiva, setCatActiva] = useState(null)
  const [busqueda, setBusqueda]   = useState('')
  const [detalle, setDetalle]     = useState(null) // null | 'crear' | {product}

  const filtrados = productos.filter(p => {
    if (catActiva && p.categoriaId !== catActiva) return false
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const catNombre = id => categorias.find(c => c.id === id)?.nombre || '—'

  const handleGuardar = prod => {
    setProductos(prev =>
      detalle === 'crear' ? [...prev, prod] : prev.map(p => p.id === prod.id ? prod : p)
    )
    setDetalle(null)
  }

  const handleEliminar = async () => {
    try {
      await productosService.eliminar(detalle.id)
      setProductos(prev => prev.filter(p => p.id !== detalle.id))
      setDetalle(null)
    } catch (e) { console.error(e) }
  }

  if (detalle) {
    return (
      <FormProducto
        producto={detalle === 'crear' ? null : detalle}
        categorias={categorias}
        ingredientes={ingredientes}
        onGuardar={handleGuardar}
        onCancelar={() => setDetalle(null)}
        onEliminar={handleEliminar}
      />
    )
  }

  return (
    <div className="prod-body">
      <div className="prod-sidebar">
        <div className={`prod-cat-item${catActiva === null ? ' prod-cat-item--active' : ''}`}
          onClick={() => setCatActiva(null)}>Todos</div>
        {categorias.map(c => (
          <div key={c.id}
            className={`prod-cat-item${catActiva === c.id ? ' prod-cat-item--active' : ''}`}
            onClick={() => { setCatActiva(c.id); setBusqueda('') }}>
            {c.nombre}
          </div>
        ))}
      </div>

      <div className="prod-main">
        <div className="prod-toolbar">
          <div className="prod-search-wrap">
            <Search size={14} className="prod-search-icon" />
            <input className="prod-search" placeholder="Filtrar por producto..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <button className="prod-btn-nuevo" onClick={() => setDetalle('crear')}>
            <Plus size={14} /> Nuevo producto
          </button>
        </div>

        <div className="prod-table-wrap">
          <table className="prod-table">
            <thead>
              <tr>
                <th>Cód.</th>
                <th>Producto</th>
                <th>Costo</th>
                <th>Margen $</th>
                <th>Margen %</th>
                <th>Markup %</th>
                <th>Precio</th>
                <th style={{ textAlign: 'center' }}>★</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={8} className="prod-table-empty">No hay productos</td></tr>
              ) : filtrados.map(p => {
                const margenPeso = p.precio - p.costo
                const margenPct  = p.costo > 0 ? (margenPeso / p.precio) * 100 : null
                const markupPct  = p.costo > 0 ? (margenPeso / p.costo)  * 100 : null
                return (
                  <tr key={p.id} className="prod-row" onClick={() => setDetalle(p)}>
                    <td className="p-td-cod">{p.codigo || '—'}</td>
                    <td className="p-td-nombre">{p.nombre}</td>
                    <td className="p-td-num">{p.costo > 0 ? fmtPrecio(p.costo) : '—'}</td>
                    <td className="p-td-num">{margenPct !== null ? fmtPrecio(margenPeso) : '—'}</td>
                    <td className="p-td-num">{margenPct !== null ? fmtPct(margenPct) : '—'}</td>
                    <td className="p-td-num">{markupPct !== null ? fmtPct(markupPct) : '—'}</td>
                    <td className="p-td-precio">{fmtPrecio(p.precio)}</td>
                    <td className="p-td-star">
                      <Star size={14} className={p.activo ? 'star--activo' : 'star--inactivo'} fill={p.activo ? '#f97316' : 'none'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── TabIngredientes ───────────────────────────────────────────────────────
function TabIngredientes({ ingredientes, setIngredientes }) {
  const [catActiva, setCatActiva] = useState(null)
  const [busqueda, setBusqueda]   = useState('')
  const [detalle, setDetalle]     = useState(null)

  const cats = [...new Set(ingredientes.map(i => i.categoria).filter(Boolean))].sort()
  const catOptions = cats.length > 0 ? cats : ['Varios']

  const filtrados = ingredientes.filter(i => {
    if (catActiva && i.categoria !== catActiva) return false
    if (busqueda && !i.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const handleGuardar = ing => {
    setIngredientes(prev =>
      detalle === 'crear' ? [...prev, ing] : prev.map(i => i.id === ing.id ? ing : i)
    )
    setDetalle(null)
  }

  const handleEliminar = async () => {
    try {
      await ingredientesService.eliminar(detalle.id)
      setIngredientes(prev => prev.filter(i => i.id !== detalle.id))
      setDetalle(null)
    } catch (e) { console.error(e) }
  }

  if (detalle) {
    return (
      <FormIngrediente
        ingrediente={detalle === 'crear' ? null : detalle}
        catOptions={catOptions}
        onGuardar={handleGuardar}
        onCancelar={() => setDetalle(null)}
        onEliminar={handleEliminar}
      />
    )
  }

  return (
    <div className="prod-body">
      <div className="prod-sidebar">
        <div className={`prod-cat-item${catActiva === null ? ' prod-cat-item--active' : ''}`}
          onClick={() => setCatActiva(null)}>Todos</div>
        {catOptions.map(c => (
          <div key={c}
            className={`prod-cat-item${catActiva === c ? ' prod-cat-item--active' : ''}`}
            onClick={() => setCatActiva(c)}>{c}</div>
        ))}
      </div>

      <div className="prod-main">
        <div className="prod-toolbar">
          <div className="prod-search-wrap">
            <Search size={14} className="prod-search-icon" />
            <input className="prod-search" placeholder="Filtrar por ingrediente..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <button className="prod-btn-nuevo" onClick={() => setDetalle('crear')}>
            <Plus size={14} /> Nuevo ingrediente
          </button>
        </div>

        <div className="prod-table-wrap">
          <table className="prod-table">
            <thead>
              <tr><th>Nombre</th><th>Unidad</th><th>Merma</th><th style={{ textAlign: 'right' }}>Costo</th></tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={4} className="prod-table-empty">No hay ingredientes</td></tr>
              ) : filtrados.map(i => (
                <tr key={i.id} className="prod-row" onClick={() => setDetalle(i)}>
                  <td className="p-td-bold">{i.nombre}</td>
                  <td>{i.unidad}</td>
                  <td>{i.merma > 0 ? `${i.merma}%` : '—'}</td>
                  <td className="p-td-precio">{fmtPrecio(i.costo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── TabCategorias ─────────────────────────────────────────────────────────
function TabCategorias({ categorias, setCategorias, productos }) {
  const [selected, setSelected]       = useState(null)
  const [modo, setModo]               = useState(null) // null | 'crear' | 'editar'
  const [form, setForm]               = useState({ nombre: '', areaImpresion: '', tiempoPrepDefecto: '' })
  const [guardando, setGuardando]     = useState(false)
  const [confirmElim, setConfirmElim] = useState(false)

  const catSel   = selected ? categorias.find(c => c.id === selected) : null
  const prodCount = id => productos.filter(p => p.categoriaId === id).length
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const cerrar    = () => { setSelected(null); setModo(null); setConfirmElim(false) }
  const abrirCrear = () => {
    setSelected(null); setForm({ nombre: '', areaImpresion: '', tiempoPrepDefecto: '' })
    setModo('crear'); setConfirmElim(false)
  }
  const abrirEditar = c => {
    setForm({ nombre: c.nombre, areaImpresion: c.areaImpresion || '', tiempoPrepDefecto: c.tiempoPrepDefecto || '' })
    setModo('editar'); setConfirmElim(false)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return
    setGuardando(true)
    try {
      const payload = { nombre: form.nombre.trim(), areaImpresion: form.areaImpresion, tiempoPrepDefecto: Number(form.tiempoPrepDefecto) || 0 }
      if (modo === 'crear') {
        const nueva = await categoriasService.crear(payload)
        setCategorias(prev => [...prev, nueva]); setSelected(nueva.id); setModo(null)
      } else {
        const upd = await categoriasService.actualizar(selected, payload)
        setCategorias(prev => prev.map(c => c.id === upd.id ? upd : c)); setModo(null)
      }
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const eliminar = async () => {
    try {
      await categoriasService.eliminar(selected)
      setCategorias(prev => prev.filter(c => c.id !== selected)); cerrar()
    } catch (e) { console.error(e) }
  }

  const mostrarForm = modo === 'crear' || modo === 'editar'

  return (
    <div className="gastos-body">
      <div className="gastos-left">
        <div className="gastos-filtros" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.88rem', flex: 1 }}>CATEGORÍAS DE PRODUCTOS</span>
          <button className="prod-btn-nuevo" onClick={abrirCrear}><Plus size={14} /> Nueva Categoría</button>
        </div>

        <div className="prod-table-wrap">
          <table className="prod-table">
            <thead>
              <tr><th>Nombre</th><th>Área de impresión</th><th>Productos</th><th></th></tr>
            </thead>
            <tbody>
              {categorias.length === 0 ? (
                <tr><td colSpan={4} className="prod-table-empty">No hay categorías</td></tr>
              ) : categorias.map(c => (
                <tr key={c.id}
                  className={`prod-row${selected === c.id ? ' prod-row--active' : ''}`}
                  onClick={() => { setSelected(c.id === selected ? null : c.id); setModo(null); setConfirmElim(false) }}>
                  <td className="p-td-bold">{c.nombre}</td>
                  <td className="p-td-muted">{c.areaImpresion || '—'}</td>
                  <td>{prodCount(c.id)}</td>
                  <td><button className="prod-row-del" onClick={e => { e.stopPropagation(); setSelected(c.id); setConfirmElim(true) }}><X size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gastos-right">
        {mostrarForm ? (
          <div className="gastos-panel">
            <div className="gastos-panel-hdr">
              <button className="gastos-panel-back" onClick={cerrar}><X size={16} /></button>
              <span className="gastos-panel-title">{modo === 'editar' ? `Editar: ${catSel?.nombre}` : 'Nueva Categoría'}</span>
            </div>
            <div className="gastos-panel-body">
              <div className="gastos-form">
                <div className="gastos-field">
                  <label>Nombre *</label>
                  <input className="gastos-input" autoFocus value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
                </div>
                <div className="gastos-field">
                  <label>Área de impresión</label>
                  <select className="gastos-input" value={form.areaImpresion} onChange={e => setF('areaImpresion', e.target.value)}>
                    <option value="">Sin área</option>
                    <option value="Barra">Barra</option>
                    <option value="Cocina">Cocina</option>
                  </select>
                </div>
                <div className="gastos-field">
                  <label>Tiempo de preparación por defecto (minutos)</label>
                  <input type="number" min="0" className="gastos-input" value={form.tiempoPrepDefecto}
                    onChange={e => setF('tiempoPrepDefecto', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="gastos-panel-ftr">
              <button className="gastos-btn-cancel" onClick={cerrar} disabled={guardando}>Cancelar</button>
              <button className="gastos-btn-save" onClick={guardar} disabled={guardando || !form.nombre.trim()}>
                {guardando ? 'Guardando...' : modo === 'editar' ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        ) : !catSel ? (
          <div className="gastos-right-empty"><ChevronLeft size={16} /><span>Seleccioná una categoría</span></div>
        ) : (
          <div className="gastos-panel">
            {confirmElim ? (
              <div className="gastos-panel-hdr gastos-panel-hdr--confirm">
                <span className="g-confirm-text">¿Eliminar {catSel.nombre}?</span>
                <button className="g-confirm-btn g-confirm-btn--cancel" onClick={() => setConfirmElim(false)}>Cancelar</button>
                <button className="g-confirm-btn g-confirm-btn--danger" onClick={eliminar}>Eliminar</button>
              </div>
            ) : (
              <div className="gastos-panel-hdr">
                <button className="gastos-panel-back" onClick={cerrar}><ChevronLeft size={16} /></button>
                <span className="gastos-panel-title">{catSel.nombre.toUpperCase()}</span>
                <button className="pf-del-btn" style={{ marginLeft: 'auto' }} onClick={() => abrirEditar(catSel)}><Edit2 size={15} /></button>
              </div>
            )}
            <div className="gastos-panel-body">
              <div className="gastos-meta">
                <div className="gastos-meta-row"><span>Nombre</span><strong>{catSel.nombre}</strong></div>
                <div className="gastos-meta-row"><span>Área de impresión</span><strong>{catSel.areaImpresion || '—'}</strong></div>
                <div className="gastos-meta-row"><span>Tiempo prep. (min)</span><strong>{catSel.tiempoPrepDefecto || '—'}</strong></div>
                <div className="gastos-meta-row"><span>Productos</span><strong>{prodCount(catSel.id)}</strong></div>
              </div>
            </div>
            <div className="gastos-panel-ftr">
              <button className="gastos-btn-danger" onClick={() => setConfirmElim(true)}><Trash2 size={14} /> Eliminar</button>
              <button className="gastos-btn-edit" onClick={() => abrirEditar(catSel)}><Edit2 size={14} /> Editar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TabStock ──────────────────────────────────────────────────────────────
function getStockStatus(item) {
  if (item.stockActual <= 0) return 'agotado'
  if (!item.stockMinimo)     return 'sin_definir'
  if (item.stockActual <= item.stockMinimo) return 'poco'
  return 'disponible'
}

const STOCK_TAGS = [
  { key: 'disponible',  label: 'Disponibles',       cls: 'st--disponible' },
  { key: 'poco',        label: 'Poco stock',         cls: 'st--poco'       },
  { key: 'agotado',     label: 'Agotados',           cls: 'st--agotado'    },
  { key: 'sin_definir', label: 'Sin stock definido', cls: 'st--sin'        },
]

function TabStock({ productos, setProductos, ingredientes, setIngredientes }) {
  const [busqueda, setBusqueda]           = useState('')
  const [tags, setTags]                   = useState(new Set(['disponible', 'poco', 'agotado', 'sin_definir']))
  const [selectedId, setSelectedId]       = useState(null)
  const [selectedTipo, setSelectedTipo]   = useState(null) // 'producto' | 'ingrediente'
  const [stockForm, setStockForm]         = useState({ stockActual: '', stockMinimo: '' })
  const [guardando, setGuardando]         = useState(false)
  const [desperdicio, setDesperdicio]     = useState(false)
  const [cantDesperdicio, setCantDesp]    = useState('')

  const prodStock = productos.filter(p => p.controlStock)
  const ingStock  = ingredientes

  const toggleTag = key => setTags(prev => {
    const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s
  })

  const match = item => {
    if (!tags.has(getStockStatus(item))) return false
    if (busqueda && !item.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  }

  const prodFiltrados = prodStock.filter(match)
  const ingFiltrados  = ingStock.filter(match)

  const selectedItem = selectedTipo === 'producto'
    ? productos.find(p => p.id === selectedId)
    : ingredientes.find(i => i.id === selectedId)

  const seleccionar = (id, tipo) => {
    const item = tipo === 'producto'
      ? productos.find(p => p.id === id)
      : ingredientes.find(i => i.id === id)
    setSelectedId(id); setSelectedTipo(tipo)
    setStockForm({ stockActual: item?.stockActual ?? 0, stockMinimo: item?.stockMinimo ?? 0 })
    setDesperdicio(false); setCantDesp('')
  }

  const guardarStock = async () => {
    setGuardando(true)
    try {
      if (selectedTipo === 'ingrediente') {
        const upd = await stockService.actualizarIngrediente(selectedId, {
          stockActual: Number(stockForm.stockActual) || 0,
          stockMinimo: Number(stockForm.stockMinimo) || 0,
        })
        setIngredientes(prev => prev.map(i => i.id === upd.id ? upd : i))
        setStockForm({ stockActual: upd.stockActual, stockMinimo: upd.stockMinimo })
      } else {
        const upd = await stockService.actualizarProductoStock(selectedId, Number(stockForm.stockActual) || 0)
        setProductos(prev => prev.map(p => p.id === upd.id ? upd : p))
        setStockForm(f => ({ ...f, stockActual: upd.stockActual }))
      }
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const registrarDesperdicio = async () => {
    if (!cantDesperdicio) return
    setGuardando(true)
    try {
      const cant = Number(cantDesperdicio)
      if (selectedTipo === 'ingrediente') {
        const nuevo = Math.max(0, (selectedItem.stockActual || 0) - cant)
        const upd = await stockService.actualizarIngrediente(selectedId, { stockActual: nuevo })
        setIngredientes(prev => prev.map(i => i.id === upd.id ? upd : i))
        setStockForm(f => ({ ...f, stockActual: upd.stockActual }))
      } else {
        const nuevo = Math.max(0, (selectedItem.stockActual || 0) - cant)
        const upd = await stockService.actualizarProductoStock(selectedId, nuevo)
        setProductos(prev => prev.map(p => p.id === upd.id ? upd : p))
        setStockForm(f => ({ ...f, stockActual: upd.stockActual }))
      }
      setDesperdicio(false); setCantDesp('')
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const unidad = selectedTipo === 'ingrediente' ? (selectedItem?.unidad || 'unid.') : 'unid.'
  const status = selectedItem ? getStockStatus(selectedItem) : null
  const statusLabel = { disponible: 'Disponible', poco: 'Poco stock', agotado: 'Agotado', sin_definir: 'Sin definir' }

  const renderStockRow = (item, tipo) => {
    const st = getStockStatus(item)
    const un = tipo === 'ingrediente' ? item.unidad : 'unid.'
    return (
      <tr key={item.id}
        className={`prod-row${selectedId === item.id && selectedTipo === tipo ? ' prod-row--active' : ''}`}
        onClick={() => seleccionar(item.id, tipo)}>
        <td className="p-td-bold">{item.nombre}</td>
        <td><span className={`st-badge st-badge--${st}`}>{item.stockActual} {un}</span></td>
        <td className="p-td-muted">{item.stockActual} {un}</td>
        <td className="p-td-muted">{item.costo > 0 ? fmtPrecio(item.costo) : '—'}</td>
      </tr>
    )
  }

  const totalProds = prodStock.reduce((a, p) => a + (p.costo * p.stockActual || 0), 0)
  const totalIngs  = ingStock.reduce((a, i) => a + (i.costo * i.stockActual || 0), 0)

  return (
    <div className="prod-stock-layout">
      {/* Filters + tags */}
      <div className="prod-stock-header">
        <div className="prod-search-wrap" style={{ maxWidth: 280 }}>
          <Search size={14} className="prod-search-icon" />
          <input className="prod-search" placeholder="Producto o ingrediente..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="st-tags">
          {STOCK_TAGS.map(t => (
            <button key={t.key} className={`st-tag ${t.cls}${tags.has(t.key) ? ' st-tag--on' : ''}`}
              onClick={() => toggleTag(t.key)}>
              {tags.has(t.key) && '✓ '}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="prod-stock-stats">
        <span>{prodStock.length + ingStock.length} registros: {prodFiltrados.length} prods. y {ingFiltrados.length} ingredientes</span>
        <span>Costo productos: <strong>{fmtPrecio(totalProds)}</strong></span>
        <span>Costo ingredientes: <strong>{fmtPrecio(totalIngs)}</strong></span>
        <span>Total: <strong>{fmtPrecio(totalProds + totalIngs)}</strong></span>
      </div>

      <div className="prod-stock-body">
        {/* Tablas */}
        <div className="prod-stock-tables">
          <div className="prod-stock-section">
            <div className="prod-stock-section-title">PRODUCTOS</div>
            <table className="prod-table">
              <thead><tr><th>Producto</th><th>Stock</th><th>Disponibles</th><th>Costo</th></tr></thead>
              <tbody>
                {prodFiltrados.length === 0
                  ? <tr><td colSpan={4} className="prod-table-empty">—</td></tr>
                  : prodFiltrados.map(p => renderStockRow(p, 'producto'))}
              </tbody>
            </table>
          </div>
          <div className="prod-stock-section">
            <div className="prod-stock-section-title">INGREDIENTES</div>
            <table className="prod-table">
              <thead><tr><th>Ingrediente</th><th>Stock</th><th>Disponibles</th><th>Costo</th></tr></thead>
              <tbody>
                {ingFiltrados.length === 0
                  ? <tr><td colSpan={4} className="prod-table-empty">—</td></tr>
                  : ingFiltrados.map(i => renderStockRow(i, 'ingrediente'))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="gastos-right" style={{ minWidth: 300 }}>
          {!selectedItem ? (
            <div className="gastos-right-empty"><ChevronLeft size={16} /><span>Seleccioná un ítem del listado</span></div>
          ) : (
            <div className="gastos-panel">
              <div className="gastos-panel-hdr">
                <span className="gastos-panel-title">{selectedItem.nombre.toUpperCase()}</span>
              </div>
              <div className="gastos-panel-body">
                <div className="gastos-meta">
                  <div className="gastos-meta-row">
                    <span>Estado</span>
                    <span className={`st-badge st-badge--${status}`}>{statusLabel[status]}</span>
                  </div>
                  <div className="gastos-meta-row">
                    <span>Disponibles</span>
                    <strong>{selectedItem.stockActual} {unidad} (en stock)</strong>
                  </div>
                </div>

                {!desperdicio ? (
                  <div className="gastos-form" style={{ marginTop: 14 }}>
                    <div className="gastos-field">
                      <label>Stock</label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="number" min="0" className="gastos-input" style={{ flex: 1 }}
                          value={stockForm.stockActual}
                          onChange={e => setStockForm(f => ({ ...f, stockActual: e.target.value }))} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{unidad}</span>
                      </div>
                    </div>
                    {selectedTipo === 'ingrediente' && (
                      <div className="gastos-field">
                        <label>Stock Mínimo</label>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="number" min="0" className="gastos-input" style={{ flex: 1 }}
                            value={stockForm.stockMinimo}
                            onChange={e => setStockForm(f => ({ ...f, stockMinimo: e.target.value }))} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{unidad}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="gastos-form" style={{ marginTop: 14 }}>
                    <div className="gastos-field">
                      <label>Cantidad de desperdicio</label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="number" min="0" className="gastos-input" style={{ flex: 1 }} autoFocus
                          value={cantDesperdicio} onChange={e => setCantDesp(e.target.value)} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{unidad}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="gastos-panel-ftr" style={{ flexDirection: 'column', gap: 8 }}>
                {!desperdicio ? (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="gastos-btn-cancel" style={{ flex: 1 }} onClick={() => setSelectedId(null)}>Cancelar</button>
                      <button className="gastos-btn-save"   style={{ flex: 1 }} onClick={guardarStock} disabled={guardando}>
                        {guardando ? '...' : 'Guardar'}
                      </button>
                    </div>
                    <button className="gastos-btn-sub" onClick={() => setDesperdicio(true)}>
                      + Registrar desperdicio
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="gastos-btn-cancel" style={{ flex: 1 }} onClick={() => { setDesperdicio(false); setCantDesp('') }}>Cancelar</button>
                    <button className="gastos-btn-save" style={{ flex: 1, background: '#dc2626' }} onClick={registrarDesperdicio} disabled={guardando || !cantDesperdicio}>
                      {guardando ? '...' : 'Registrar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Productos() {
  const [tab, setTab]                   = useState('productos')
  const [categorias, setCategorias]     = useState([])
  const [productos, setProductos]       = useState([])
  const [ingredientes, setIngredientes] = useState([])
  const [cargando, setCargando]         = useState(true)

  useEffect(() => {
    Promise.all([
      categoriasService.listar().catch(() => []),
      productosService.listar().catch(() => []),
      ingredientesService.listar().catch(() => []),
    ]).then(([cats, prods, ings]) => {
      setCategorias(cats); setProductos(prods); setIngredientes(ings)
    }).finally(() => setCargando(false))
  }, [])

  if (cargando) return <div className="prod-loading">Cargando...</div>

  return (
    <div className="prod-page">
      <div className="prod-tabs-bar">
        {[['productos','Productos'],['ingredientes','Ingredientes'],['categorias','Cat. de Productos'],['stock','Control de Stock']].map(([v, l]) => (
          <button key={v} className={`prod-tab-btn${tab === v ? ' prod-tab-btn--active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      {tab === 'productos'    && <TabProductos    productos={productos} setProductos={setProductos} categorias={categorias} ingredientes={ingredientes} />}
      {tab === 'ingredientes' && <TabIngredientes ingredientes={ingredientes} setIngredientes={setIngredientes} />}
      {tab === 'categorias'   && <TabCategorias   categorias={categorias} setCategorias={setCategorias} productos={productos} />}
      {tab === 'stock'        && <TabStock         productos={productos} setProductos={setProductos} ingredientes={ingredientes} setIngredientes={setIngredientes} />}
    </div>
  )
}
