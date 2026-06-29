import { useState, useEffect, useCallback } from 'react'
import { pedidosOnlineService, configService } from '../../services/api'
import { Armchair, ShoppingBag, User, FileText, RefreshCw, Bike, MapPin, Printer, Mail, Phone, CreditCard, Plus, Trash2, GripVertical } from 'lucide-react'
import './CartaOnline.css'

const ESTADOS = ['pendiente', 'preparando', 'listo', 'entregado']

const ESTADO_LABEL = {
  pendiente:  'Pendiente',
  preparando: 'Preparando',
  listo:      'Listo',
  entregado:  'Entregado',
}

const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

const relTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)  return 'Ahora'
  if (m < 60) return `Hace ${m} min`
  const h = Math.floor(m / 60)
  return `Hace ${h}h`
}

export default function CartaOnline() {
  const user     = JSON.parse(localStorage.getItem('user') || '{}')
  const userId   = user.id || ''
  const cartaUrl = `${window.location.origin}/carta/${userId}`

  const [pedidos, setPedidos]     = useState([])
  const [cargando, setCargando]   = useState(true)
  const [filtro, setFiltro]       = useState('pendiente')
  const [copiado, setCopiado]     = useState(false)
  const [actualizando, setActualizando] = useState(null)

  // Formas de pago
  const [formasPago, setFormasPago]       = useState([])
  const [guardandoFP, setGuardandoFP]     = useState(false)
  const [nuevaForma, setNuevaForma]       = useState({ nombre: '', descuento: 0 })
  const [mostrarFormFP, setMostrarFormFP] = useState(false)

  const cargar = useCallback(async (mostrarCarga = true) => {
    if (mostrarCarga) setCargando(true)
    try {
      const data = await pedidosOnlineService.listar()
      setPedidos(data)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    const iv = setInterval(() => cargar(false), 15_000)
    return () => clearInterval(iv)
  }, [cargar])

  useEffect(() => {
    configService.getTienda().then(d => setFormasPago(d.formasPago || [])).catch(() => {})
  }, [])

  const toggleForma = (idx) => {
    setFormasPago(prev => prev.map((f, i) => i === idx ? { ...f, habilitado: !f.habilitado } : f))
  }

  const eliminarForma = (idx) => {
    setFormasPago(prev => prev.filter((_, i) => i !== idx))
  }

  const agregarForma = () => {
    if (!nuevaForma.nombre.trim()) return
    setFormasPago(prev => [...prev, { nombre: nuevaForma.nombre.trim(), descuento: Number(nuevaForma.descuento) || 0, habilitado: true }])
    setNuevaForma({ nombre: '', descuento: 0 })
    setMostrarFormFP(false)
  }

  const guardarFormasPago = async () => {
    setGuardandoFP(true)
    try {
      await configService.saveFormasPago(formasPago)
    } finally {
      setGuardandoFP(false)
    }
  }

  const copiarUrl = () => {
    navigator.clipboard.writeText(cartaUrl)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const cambiarEstado = async (id, nuevoEstado) => {
    setActualizando(id)
    try {
      const actualizado = await pedidosOnlineService.actualizarEstado(id, nuevoEstado)
      setPedidos(prev => prev.map(p => p._id === id ? actualizado : p))
    } finally {
      setActualizando(null)
    }
  }

  const qrUrl      = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(cartaUrl)}`
  const qrPrintUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cartaUrl)}`

  const imprimirQR = () => {
    const nombre = user.restaurante || 'Carta Online'
    const ventana = window.open('', '_blank', 'width=520,height=700')
    ventana.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>QR - ${nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; padding: 32px;
    }
    .card {
      border: 2px solid #111; border-radius: 20px;
      padding: 36px 44px; text-align: center; max-width: 360px; width: 100%;
    }
    h1 { font-size: 28px; font-weight: 800; color: #111; margin-bottom: 4px; }
    .sub { font-size: 14px; color: #777; margin-bottom: 28px; }
    img { width: 240px; height: 240px; display: block; margin: 0 auto 24px; }
    .cta { font-size: 17px; font-weight: 700; color: #111; margin-bottom: 10px; }
    .url { font-size: 10px; color: #aaa; word-break: break-all; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>${nombre}</h1>
    <p class="sub">Menú digital</p>
    <img src="${qrPrintUrl}" alt="QR" onload="window.print()" onerror="window.print()" />
    <p class="cta">Escaneá para ver el menú</p>
    <p class="url">${cartaUrl}</p>
  </div>
</body>
</html>`)
    ventana.document.close()
  }

  const pedidosFiltrados = filtro === 'todos'
    ? pedidos
    : pedidos.filter(p => p.estado === filtro)

  const cantPend = pedidos.filter(p => p.estado === 'pendiente').length

  return (
    <div className="co-wrap">

      {/* Sección URL / QR */}
      <div className="co-link-card">
        <div className="co-link-left">
          <h2 className="co-link-title">Tu carta online</h2>
          <p className="co-link-desc">Compartí este link o código QR con tus clientes</p>
          <div className="co-url-row">
            <span className="co-url-text">{cartaUrl}</span>
            <button className="co-copy-btn" onClick={copiarUrl}>
              {copiado ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="co-link-actions">
            <a className="co-open-btn" href={cartaUrl} target="_blank" rel="noopener noreferrer">
              Abrir carta →
            </a>
          </div>
        </div>
        <div className="co-qr-wrap">
          <img src={qrUrl} alt="QR carta" className="co-qr" />
          <span className="co-qr-label">Escanear para ver la carta</span>
          <button className="co-print-btn" onClick={imprimirQR}>
            <Printer size={13} /> Imprimir QR
          </button>
        </div>
      </div>

      {/* Formas de pago */}
      <div className="co-fp-card">
        <div className="co-fp-header">
          <div>
            <h3 className="co-fp-title">Formas de pago</h3>
            <p className="co-fp-desc">Configurá los métodos disponibles en tu carta y sus descuentos opcionales.</p>
          </div>
          <button className="co-fp-save-btn" onClick={guardarFormasPago} disabled={guardandoFP}>
            {guardandoFP ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        <div className="co-fp-list">
          {formasPago.map((fp, idx) => (
            <div key={idx} className={`co-fp-item ${!fp.habilitado ? 'co-fp-item--off' : ''}`}>
              <GripVertical size={16} color="#d1d5db" className="co-fp-drag" />
              <span className="co-fp-nombre">{fp.nombre}</span>
              {fp.descuento > 0 && <span className="co-fp-desc-badge">-{fp.descuento}%</span>}
              <label className="co-fp-toggle">
                <input type="checkbox" checked={fp.habilitado} onChange={() => toggleForma(idx)} />
                <span className="co-fp-toggle-track" />
              </label>
              <button className="co-fp-del-btn" onClick={() => eliminarForma(idx)} title="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {formasPago.length === 0 && (
            <p className="co-fp-empty">No hay formas de pago configuradas.</p>
          )}
        </div>

        {mostrarFormFP ? (
          <div className="co-fp-form">
            <input
              className="co-fp-input"
              type="text"
              placeholder="Nombre (ej: Mercado Pago)"
              value={nuevaForma.nombre}
              onChange={e => setNuevaForma(f => ({ ...f, nombre: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && agregarForma()}
              autoFocus
            />
            <div className="co-fp-form-row">
              <label className="co-fp-form-label">Descuento</label>
              <div className="co-fp-desc-input-wrap">
                <input
                  className="co-fp-input co-fp-input--sm"
                  type="number"
                  min="0" max="100"
                  placeholder="0"
                  value={nuevaForma.descuento}
                  onChange={e => setNuevaForma(f => ({ ...f, descuento: e.target.value }))}
                />
                <span className="co-fp-pct">%</span>
              </div>
            </div>
            <div className="co-fp-form-btns">
              <button className="co-fp-add-confirm" onClick={agregarForma}>Agregar</button>
              <button className="co-fp-cancel" onClick={() => setMostrarFormFP(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="co-fp-add-btn" onClick={() => setMostrarFormFP(true)}>
            <Plus size={15} /> Agregar forma de pago
          </button>
        )}
      </div>

      {/* Pedidos entrantes */}
      <div className="co-pedidos-header">
        <h3 className="co-pedidos-title">
          Pedidos online
          {cantPend > 0 && <span className="co-badge">{cantPend}</span>}
        </h3>
        <button className="co-refresh-btn" onClick={() => cargar(true)}><RefreshCw size={14} /> Actualizar</button>
      </div>

      {/* Filtros */}
      <div className="co-filtros">
        {['pendiente', 'preparando', 'listo', 'entregado', 'todos'].map(f => {
          const cant = f === 'todos' ? null : pedidos.filter(p => p.estado === f).length
          return (
            <button
              key={f}
              className={`co-filtro-btn ${filtro === f ? 'co-filtro-btn--active' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'todos' ? 'Todos' : ESTADO_LABEL[f]}
              {cant > 0 && <span className="co-filtro-count">{cant}</span>}
            </button>
          )
        })}
      </div>

      {cargando ? (
        <div className="co-loading">Cargando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="co-empty">
          {filtro === 'pendiente' ? 'No hay pedidos pendientes' : 'No hay pedidos en este estado'}
        </div>
      ) : (
        <div className="co-lista">
          {pedidosFiltrados.map(p => {
            const sigEstado = ESTADOS[ESTADOS.indexOf(p.estado) + 1]
            return (
              <div key={p._id} className={`co-card co-card--${p.estado}`}>
                <div className="co-card-top">
                  <div className="co-card-meta">
                    <span className={`co-estado-chip co-estado-chip--${p.estado}`}>
                      {ESTADO_LABEL[p.estado]}
                    </span>
                    <span className="co-tipo-chip">
                      {p.tipo === 'mesa'
                        ? <><Armchair size={13} color="#f97316" /> Mesa {p.mesaNumero}</>
                        : p.tipo === 'delivery'
                          ? <><Bike size={13} color="#10b981" /> Delivery</>
                          : <><ShoppingBag size={13} color="#6366f1" /> Retiro</>
                      }
                    </span>
                    {p.tipo === 'delivery' && p.direccion && (
                      <span className="co-cliente-chip"><MapPin size={12} color="#10b981" /> {p.direccion}</span>
                    )}
                    {p.clienteNombre && (
                      <span className="co-cliente-chip"><User size={12} color="#6b7280" /> {p.clienteNombre}</span>
                    )}
                    {p.clienteEmail && (
                      <span className="co-cliente-chip"><Mail size={12} color="#6b7280" /> {p.clienteEmail}</span>
                    )}
                    {p.clienteTelefono && (
                      <span className="co-cliente-chip"><Phone size={12} color="#6b7280" /> {p.clienteTelefono}</span>
                    )}
                    {p.formaPago && (
                      <span className="co-cliente-chip"><CreditCard size={12} color="#6b7280" /> {p.formaPago}{p.descuento > 0 ? ` (-${p.descuento}%)` : ''}</span>
                    )}
                  </div>
                  <span className="co-card-time">{relTime(p.createdAt)}</span>
                </div>

                <div className="co-items-list">
                  {p.items.map((item, i) => (
                    <div key={i} className="co-item-row">
                      <span className="co-item-cant">{item.cantidad}×</span>
                      <span className="co-item-nombre">{item.nombre}</span>
                      <span className="co-item-precio">{fmt(item.precio * item.cantidad)}</span>
                    </div>
                  ))}
                </div>

                {p.notas && (
                  <div className="co-notas"><FileText size={13} color="#94a3b8" /> {p.notas}</div>
                )}

                <div className="co-card-footer">
                  <span className="co-total">
                    Total: <strong>{fmt(p.totalFinal || p.total)}</strong>
                    {p.descuento > 0 && <span className="co-descuento-chip">-{p.descuento}%</span>}
                  </span>
                  {sigEstado && (
                    <button
                      className="co-avanzar-btn"
                      onClick={() => cambiarEstado(p._id, sigEstado)}
                      disabled={actualizando === p._id}
                    >
                      {actualizando === p._id ? '...' : `Marcar ${ESTADO_LABEL[sigEstado]} →`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
