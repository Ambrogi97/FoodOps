import { useState, useEffect, useCallback } from 'react'
import { pedidosOnlineService } from '../../services/api'
import { Armchair, ShoppingBag, User, FileText, RefreshCw } from 'lucide-react'
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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(cartaUrl)}`

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
        </div>
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
                      {p.tipo === 'mesa' ? <><Armchair size={13} color="#f97316" /> Mesa {p.mesaNumero}</> : <><ShoppingBag size={13} color="#6366f1" /> Para llevar</>}
                    </span>
                    {p.clienteNombre && (
                      <span className="co-cliente-chip"><User size={12} color="#6b7280" /> {p.clienteNombre}</span>
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
                  <span className="co-total">Total: <strong>{fmt(p.total)}</strong></span>
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
