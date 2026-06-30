import { useState, useEffect, useCallback, useRef } from 'react'
import { pedidosOnlineService, configService, resenasService } from '../../services/api'
import { Armchair, ShoppingBag, User, FileText, RefreshCw, Bike, MapPin, Printer, Mail, Phone, CreditCard, Plus, Trash2, GripVertical, Bell, BellOff, Star, Clock, Navigation } from 'lucide-react'
import './CartaOnline.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
  const [soloHoy, setSoloHoy]     = useState(true)
  const [copiado, setCopiado]     = useState(false)
  const [actualizando, setActualizando] = useState(null)
  const [tab, setTab]             = useState('pedidos') // 'pedidos' | 'resenas' | 'config'

  // Formas de pago
  const [formasPago, setFormasPago]       = useState([])
  const [guardandoFP, setGuardandoFP]     = useState(false)
  const [nuevaForma, setNuevaForma]       = useState({ nombre: '', descuento: 0 })
  const [mostrarFormFP, setMostrarFormFP] = useState(false)

  // Tiempo estimado
  const [tiempoEstimadoMin, setTiempoEstimadoMin] = useState(30)
  const [guardandoTE, setGuardandoTE]              = useState(false)

  // Zona de delivery
  const [zonaDelivery, setZonaDelivery] = useState({ lat: '', lng: '', radioKm: '' })
  const [guardandoZD, setGuardandoZD]   = useState(false)
  const [geolocando, setGeolocando]     = useState(false)

  // Push
  const [pushActivo, setPushActivo]   = useState(false)
  const [pushCargando, setPushCargando] = useState(false)
  const [vapidKey, setVapidKey]       = useState(null)

  // Reseñas
  const [resenas, setResenas] = useState([])

  const prevPendientesRef = useRef(-1)

  const sonarNuevoPedido = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ;[880, 1100, 1320].forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + i * 0.12 + 0.3)
      })
    } catch {}
  }

  const cargar = useCallback(async (mostrarCarga = true) => {
    if (mostrarCarga) setCargando(true)
    try {
      const data = await pedidosOnlineService.listar()
      const nuevoPendientes = data.filter(p => p.estado === 'pendiente').length
      if (prevPendientesRef.current !== -1 && nuevoPendientes > prevPendientesRef.current) {
        sonarNuevoPedido()
      }
      prevPendientesRef.current = nuevoPendientes
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
    configService.getTienda().then(d => {
      setFormasPago(d.formasPago || [])
      setTiempoEstimadoMin(d.tiempoEstimadoMin || 30)
      if (d.zonaDelivery) {
        setZonaDelivery({
          lat:     d.zonaDelivery.lat    || '',
          lng:     d.zonaDelivery.lng    || '',
          radioKm: d.zonaDelivery.radioKm || '',
        })
      }
    }).catch(() => {})

    // Verificar si push está activado en este dispositivo
    fetch(`${API}/api/push/vapid-public-key`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(d => { if (d.key) setVapidKey(d.key) })
      .catch(() => {})

    navigator.serviceWorker?.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      if (sub) setPushActivo(true)
    }).catch(() => {})
  }, [])

  // Cargar reseñas al cambiar de tab
  useEffect(() => {
    if (tab === 'resenas') {
      resenasService.listar().then(setResenas).catch(() => {})
    }
  }, [tab])

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
    try { await configService.saveFormasPago(formasPago) }
    finally { setGuardandoFP(false) }
  }

  const guardarTiempoEstimado = async () => {
    setGuardandoTE(true)
    try { await configService.saveTiempoEstimado(tiempoEstimadoMin) }
    finally { setGuardandoTE(false) }
  }

  const obtenerUbicacion = () => {
    setGeolocando(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setZonaDelivery(z => ({ ...z, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }))
        setGeolocando(false)
      },
      () => { alert('No se pudo obtener la ubicación'); setGeolocando(false) }
    )
  }

  const guardarZonaDelivery = async () => {
    setGuardandoZD(true)
    try { await configService.saveZonaDelivery({ lat: Number(zonaDelivery.lat) || null, lng: Number(zonaDelivery.lng) || null, radioKm: Number(zonaDelivery.radioKm) || null }) }
    finally { setGuardandoZD(false) }
  }

  // Web Push
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw     = window.atob(base64)
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
  }

  const activarPush = async () => {
    if (!vapidKey) { alert('Push no configurado. Activá VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Render.'); return }
    setPushCargando(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      await fetch(`${API}/api/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body:    JSON.stringify({ subscription: sub }),
      })
      setPushActivo(true)
    } catch (e) {
      alert('Error al activar notificaciones: ' + e.message)
    } finally {
      setPushCargando(false)
    }
  }

  const desactivarPush = async () => {
    setPushCargando(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch(`${API}/api/push/unsubscribe`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setPushActivo(false)
    } finally {
      setPushCargando(false)
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

  // Impresión de ticket 80mm
  const imprimirTicket = (p) => {
    const nombre      = user.restaurante || 'Restaurante'
    const fecha       = new Date(p.createdAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    const tipoLabel   = p.tipo === 'mesa' ? `Mesa ${p.mesaNumero}` : p.tipo === 'delivery' ? `Delivery — ${p.direccion}` : 'Retiro en el local'
    const itemsHtml   = p.items.map(i => `
      <div class="row"><span>${i.cantidad}x ${i.nombre}</span><span>${fmt(i.precio * i.cantidad)}</span></div>`).join('')
    const ventana = window.open('', '_blank', 'width=360,height=600')
    ventana.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket #${p.numero || p._id.slice(-6)}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Courier New', monospace; font-size:13px; padding:12px; max-width:80mm; }
.center { text-align:center; }
.titulo { font-size:16px; font-weight:700; margin-bottom:2px; }
.sep { border-top:1px dashed #000; margin:8px 0; }
.row { display:flex; justify-content:space-between; padding:2px 0; }
.bold { font-weight:700; }
.total { font-size:15px; }
.pie { font-size:11px; color:#666; text-align:center; margin-top:8px; }
@media print { body { padding:0; } }
</style>
</head>
<body>
<div class="center">
  <div class="titulo">${nombre}</div>
  <div style="font-size:11px;">${fecha}</div>
</div>
<div class="sep"></div>
<div class="row"><span class="bold">Pedido</span><span class="bold">#${p.numero || p._id.slice(-6)}</span></div>
<div style="font-size:12px; margin:2px 0;">${tipoLabel}</div>
${p.clienteNombre ? `<div style="font-size:12px;">Cliente: ${p.clienteNombre}</div>` : ''}
${p.clienteTelefono ? `<div style="font-size:12px;">Tel: ${p.clienteTelefono}</div>` : ''}
<div class="sep"></div>
${itemsHtml}
<div class="sep"></div>
${p.notas ? `<div style="font-size:12px; margin-bottom:6px;">Notas: ${p.notas}</div>` : ''}
${p.descuento > 0 ? `<div class="row"><span>Descuento (${p.descuento}%)</span><span>-${fmt((p.total||0) - (p.totalFinal||p.total||0))}</span></div>` : ''}
<div class="row total"><span class="bold">TOTAL</span><span class="bold">${fmt(p.totalFinal || p.total)}</span></div>
${p.formaPago ? `<div style="font-size:12px; margin-top:4px;">Forma de pago: ${p.formaPago}</div>` : ''}
<div class="sep"></div>
<div class="pie">¡Gracias por tu pedido!</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`)
    ventana.document.close()
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
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 32px; }
    .card { border: 2px solid #111; border-radius: 20px; padding: 36px 44px; text-align: center; max-width: 360px; width: 100%; }
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

  const hoyAR = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
  const esDeHoy = (iso) =>
    new Date(iso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) === hoyAR

  const pedidosFiltrados = (() => {
    const base = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro)
    if (filtro === 'entregado' && soloHoy) return base.filter(p => esDeHoy(p.createdAt))
    return base
  })()

  const cantPend   = pedidos.filter(p => p.estado === 'pendiente').length
  const promedioResenas = resenas.length ? (resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length).toFixed(1) : null

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
            {/* Botón Web Push */}
            {'Notification' in window && (
              <button
                className={`co-push-btn ${pushActivo ? 'co-push-btn--active' : ''}`}
                onClick={pushActivo ? desactivarPush : activarPush}
                disabled={pushCargando}
                title={pushActivo ? 'Desactivar notificaciones push' : 'Activar notificaciones push cuando el tab esté cerrado'}
              >
                {pushActivo ? <BellOff size={14} /> : <Bell size={14} />}
                {pushCargando ? '...' : pushActivo ? 'Notificaciones activas' : 'Notificarme nuevos pedidos'}
              </button>
            )}
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

      {/* Tabs principales */}
      <div className="co-tabs">
        <button className={`co-tab ${tab === 'pedidos' ? 'co-tab--active' : ''}`} onClick={() => setTab('pedidos')}>
          Pedidos {cantPend > 0 && <span className="co-badge">{cantPend}</span>}
        </button>
        <button className={`co-tab ${tab === 'resenas' ? 'co-tab--active' : ''}`} onClick={() => setTab('resenas')}>
          Reseñas {promedioResenas && <span className="co-resena-avg">★ {promedioResenas}</span>}
        </button>
        <button className={`co-tab ${tab === 'config' ? 'co-tab--active' : ''}`} onClick={() => setTab('config')}>
          Configuración
        </button>
      </div>

      {/* ── TAB: PEDIDOS ─────────────────────────────────────────────────────── */}
      {tab === 'pedidos' && (
        <>
          <div className="co-pedidos-header">
            <h3 className="co-pedidos-title">
              Pedidos online
              {cantPend > 0 && <span className="co-badge">{cantPend}</span>}
            </h3>
            <button className="co-refresh-btn" onClick={() => cargar(true)}><RefreshCw size={14} /> Actualizar</button>
          </div>

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

          {filtro === 'entregado' && (
            <div className="co-hoy-row">
              <span className="co-hoy-label">
                {soloHoy ? 'Mostrando entregas de hoy' : 'Mostrando todos los entregados'}
              </span>
              <button className="co-hoy-toggle" onClick={() => setSoloHoy(v => !v)}>
                {soloHoy ? 'Ver anteriores' : 'Solo hoy'}
              </button>
            </div>
          )}

          {cargando ? (
            <div className="co-loading">Cargando pedidos...</div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="co-empty">
              {filtro === 'pendiente' ? 'No hay pedidos pendientes'
                : filtro === 'entregado' && soloHoy ? 'No hay pedidos entregados hoy'
                : 'No hay pedidos en este estado'}
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
                      <div className="co-card-actions">
                        <button
                          className="co-ticket-btn"
                          onClick={() => imprimirTicket(p)}
                          title="Imprimir ticket"
                        >
                          <Printer size={13} />
                        </button>
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
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB: RESEÑAS ─────────────────────────────────────────────────────── */}
      {tab === 'resenas' && (
        <div className="co-resenas-panel">
          <div className="co-resenas-header">
            <h3>Reseñas de clientes</h3>
            {promedioResenas && (
              <div className="co-resenas-promedio">
                <Star size={18} fill="#e85d2b" color="#e85d2b" />
                <span>{promedioResenas}</span>
                <span className="co-resenas-total">({resenas.length} reseñas)</span>
              </div>
            )}
          </div>
          {resenas.length === 0 ? (
            <div className="co-empty">Todavía no hay reseñas. Las reseñas se envían automáticamente después de marcar un pedido como entregado.</div>
          ) : (
            <div className="co-lista">
              {resenas.map(r => (
                <div key={r._id} className="co-resena-card">
                  <div className="co-resena-top">
                    <div className="co-resena-stars">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={16} fill={i <= r.estrellas ? '#e85d2b' : 'none'} color={i <= r.estrellas ? '#e85d2b' : '#d1d5db'} />
                      ))}
                    </div>
                    <div className="co-resena-meta">
                      <span>{r.pedido?.clienteNombre || 'Cliente'}</span>
                      <span>Pedido #{r.pedido?.numero}</span>
                    </div>
                    <span className="co-card-time">{relTime(r.createdAt)}</span>
                  </div>
                  {r.comentario && <p className="co-resena-comentario">"{r.comentario}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CONFIGURACIÓN ────────────────────────────────────────────────── */}
      {tab === 'config' && (
        <div className="co-config-panel">

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
              {formasPago.length === 0 && <p className="co-fp-empty">No hay formas de pago configuradas.</p>}
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
                      type="number" min="0" max="100"
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

          {/* Tiempo estimado */}
          <div className="co-config-card">
            <div className="co-config-card-header">
              <Clock size={18} color="#e85d2b" />
              <div>
                <h3 className="co-config-card-title">Tiempo estimado de entrega</h3>
                <p className="co-config-card-desc">Se muestra en la pantalla de seguimiento del cliente.</p>
              </div>
            </div>
            <div className="co-config-row">
              <div className="co-te-input-wrap">
                <input
                  type="number"
                  className="co-te-input"
                  min="5" max="180"
                  value={tiempoEstimadoMin}
                  onChange={e => setTiempoEstimadoMin(Number(e.target.value))}
                />
                <span className="co-te-label">minutos</span>
              </div>
              <button className="co-fp-save-btn" onClick={guardarTiempoEstimado} disabled={guardandoTE}>
                {guardandoTE ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {/* Zona de delivery */}
          <div className="co-config-card">
            <div className="co-config-card-header">
              <Navigation size={18} color="#e85d2b" />
              <div>
                <h3 className="co-config-card-title">Zona de cobertura de delivery</h3>
                <p className="co-config-card-desc">Si el cliente ingresa su dirección y está fuera de la zona, no podrá hacer el pedido.</p>
              </div>
            </div>
            <div className="co-zona-form">
              {zonaDelivery.lat && zonaDelivery.lng ? (
                <div className="co-zona-ubicacion-ok">
                  <MapPin size={15} color="#10b981" />
                  <span>Ubicación del local configurada</span>
                  <button className="co-zona-rehacer" onClick={obtenerUbicacion} disabled={geolocando}>
                    {geolocando ? 'Actualizando...' : 'Actualizar'}
                  </button>
                  <button className="co-zona-quitar" onClick={() => setZonaDelivery({ lat: '', lng: '', radioKm: zonaDelivery.radioKm })} title="Quitar ubicación">
                    ×
                  </button>
                </div>
              ) : (
                <button className="co-geo-btn" onClick={obtenerUbicacion} disabled={geolocando}>
                  <MapPin size={14} /> {geolocando ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
                </button>
              )}
              <div className="co-config-row" style={{ marginTop: 12 }}>
                <div className="co-te-input-wrap">
                  <input
                    type="number"
                    className="co-te-input"
                    min="1" max="100"
                    placeholder="5"
                    value={zonaDelivery.radioKm}
                    onChange={e => setZonaDelivery(z => ({ ...z, radioKm: e.target.value }))}
                  />
                  <span className="co-te-label">km de radio</span>
                </div>
                <button className="co-fp-save-btn" onClick={guardarZonaDelivery} disabled={guardandoZD}>
                  {guardandoZD ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {!zonaDelivery.lat && zonaDelivery.radioKm && <p className="co-config-hint">Falta configurar la ubicación del local para activar la zona.</p>}
              {!zonaDelivery.radioKm && <p className="co-config-hint">Sin radio configurado, no se valida la zona.</p>}
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
