import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, Clock, ChefHat, PackageCheck, Bike, Frown } from 'lucide-react'
import './Tracking.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

const PASOS = [
  { estado: 'pendiente',  label: 'Pedido recibido',    icon: CheckCircle },
  { estado: 'preparando', label: 'En preparación',      icon: ChefHat     },
  { estado: 'listo',      label: 'Listo para retirar',  icon: PackageCheck },
  { estado: 'entregado',  label: 'Entregado',           icon: Bike        },
]

const ORDEN = ['pendiente', 'preparando', 'listo', 'entregado']

function pasoActual(estado) {
  return ORDEN.indexOf(estado)
}

export default function Tracking() {
  const { pedidoId } = useParams()
  const [datos, setDatos]   = useState(null)
  const [error, setError]   = useState('')
  const ivRef               = useRef(null)

  const cargar = async () => {
    try {
      const r = await fetch(`${API}/api/carta/tracking/${pedidoId}`)
      if (!r.ok) throw new Error()
      const d = await r.json()
      setDatos(d)
    } catch {
      setError('No se encontró el pedido.')
    }
  }

  useEffect(() => {
    cargar()
    ivRef.current = setInterval(cargar, 15_000)
    return () => clearInterval(ivRef.current)
  }, [pedidoId])

  useEffect(() => {
    if (datos?.estado === 'entregado') clearInterval(ivRef.current)
  }, [datos?.estado])

  if (error) return (
    <div className="trk-error">
      <Frown size={48} color="#94a3b8" />
      <p>{error}</p>
    </div>
  )

  if (!datos) return (
    <div className="trk-loading"><div className="trk-spinner" /></div>
  )

  const paso      = pasoActual(datos.estado)
  const entregado = datos.estado === 'entregado'
  const tipoLabel = datos.tipo === 'delivery'
    ? `Delivery — ${datos.direccion}`
    : datos.tipo === 'mesa'
      ? `Mesa ${datos.mesaNumero}`
      : 'Retiro en el local'

  return (
    <div className="trk-layout">

      <header className="trk-header">
        <div className="trk-header-nombre">{datos.restaurante}</div>
        <div className="trk-header-sub">Seguimiento de pedido</div>
      </header>

      <div className="trk-body">

        {/* Número y estado */}
        <div className="trk-card trk-card--top">
          <div className="trk-numero-row">
            <span className="trk-numero-label">Pedido</span>
            <span className="trk-numero">#{datos.numero}</span>
          </div>
          <span className={`trk-estado-badge trk-estado-badge--${datos.estado}`}>
            {datos.estado === 'pendiente'  && '⏳ Recibido'}
            {datos.estado === 'preparando' && '👨‍🍳 Preparando'}
            {datos.estado === 'listo'      && '✅ Listo'}
            {datos.estado === 'entregado'  && '🎉 Entregado'}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="trk-card">
          <div className="trk-pasos">
            {PASOS.map((p, idx) => {
              const hecho  = idx <= paso
              const activo = idx === paso
              const Icono  = p.icon
              return (
                <div key={p.estado} className="trk-paso-wrap">
                  <div className={`trk-paso ${hecho ? 'trk-paso--hecho' : ''} ${activo ? 'trk-paso--activo' : ''}`}>
                    <div className="trk-paso-circle">
                      <Icono size={18} />
                    </div>
                    <span className="trk-paso-label">{p.label}</span>
                  </div>
                  {idx < PASOS.length - 1 && (
                    <div className={`trk-paso-linea ${idx < paso ? 'trk-paso-linea--hecha' : ''}`} />
                  )}
                </div>
              )
            })}
          </div>

          {!entregado && (
            <p className="trk-refresh-hint">
              <Clock size={13} /> Actualizando automáticamente cada 15 segundos
            </p>
          )}
        </div>

        {/* Detalle */}
        <div className="trk-card">
          <p className="trk-section-title">Detalle del pedido</p>
          <p className="trk-tipo">{tipoLabel}</p>
          {datos.formaPago && <p className="trk-forma-pago">Pago: {datos.formaPago}</p>}

          <div className="trk-items">
            {datos.items.map((item, i) => (
              <div key={i} className="trk-item-row">
                <span className="trk-item-cant">{item.cantidad}×</span>
                <span className="trk-item-nombre">{item.nombre}</span>
                <span className="trk-item-precio">{fmt(item.precio * item.cantidad)}</span>
              </div>
            ))}
          </div>

          <div className="trk-total-row">
            {datos.descuento > 0 && (
              <div className="trk-subtotal-row">
                <span>Subtotal</span>
                <span>{fmt(datos.total)}</span>
              </div>
            )}
            {datos.descuento > 0 && (
              <div className="trk-desc-row">
                <span>Descuento ({datos.descuento}%)</span>
                <span>-{fmt(datos.total - datos.totalFinal)}</span>
              </div>
            )}
            <div className="trk-total">
              <strong>Total</strong>
              <strong>{fmt(datos.totalFinal || datos.total)}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
