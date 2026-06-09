import { useState, useEffect } from 'react'
import { ventasService } from '../../services/api'
import { DollarSign } from 'lucide-react'
import './Ventas.css'

const PERIODOS = ['Hoy', 'Esta semana', 'Este mes']

const totalVenta = (v) => v.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

const fechaHoy = () => {
  const d = new Date()
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

const filtrarPorPeriodo = (ventas, periodo) => {
  const hoy = fechaHoy()
  return ventas.filter(v => {
    const [dia, mes, anio]       = v.cierre.split(' ')[0].split('/')
    const [diaH, mesH, anioH]   = hoy.split('/')
    if (periodo === 'Hoy') return dia === diaH && mes === mesH && anio === anioH
    if (periodo === 'Esta semana') {
      const fechaV = new Date(anio, mes - 1, dia)
      const diff   = (new Date() - fechaV) / (1000 * 60 * 60 * 24)
      return diff < 7
    }
    if (periodo === 'Este mes') return mes === mesH && anio === anioH
    return true
  })
}

const fmt = (n) => `$${n.toLocaleString('es-AR')}`

export default function Ventas() {
  const [ventas, setVentas]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo]   = useState('Esta semana')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    ventasService.listar()
      .then(data => { setVentas(data); setCargando(false) })
      .catch(e => { console.error(e); setCargando(false) })
  }, [])

  const ventasFiltradas = filtrarPorPeriodo(ventas, periodo)
  const venta           = ventas.find(v => v.id === selected)

  const totalPeriodo   = ventasFiltradas.reduce((acc, v) => acc + totalVenta(v), 0)
  const ticketPromedio = ventasFiltradas.length > 0 ? Math.round(totalPeriodo / ventasFiltradas.length) : 0

  return (
    <div className="ventas-layout">

      {/* Izquierda */}
      <div className="ventas-main">

        {/* Filtro período */}
        <div className="ventas-filtros">
          <div className="ventas-periodo">
            {PERIODOS.map(p => (
              <button
                key={p}
                className={`ventas-periodo-btn ${periodo === p ? 'ventas-periodo-btn--active' : ''}`}
                onClick={() => { setPeriodo(p); setSelected(null) }}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* Resumen */}
        <div className="ventas-resumen">
          <div className="ventas-stat">
            <span>Ventas</span>
            <strong>{ventasFiltradas.length}</strong>
          </div>
          <div className="ventas-stat-sep" />
          <div className="ventas-stat">
            <span>Ticket promedio</span>
            <strong>{fmt(ticketPromedio)}</strong>
          </div>
          <div className="ventas-stat-sep" />
          <div className="ventas-stat ventas-stat--total">
            <span>Total</span>
            <strong>{fmt(totalPeriodo)}</strong>
          </div>
        </div>

        {/* Tabla */}
        <div className="ventas-table-wrap">
          {cargando ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Cargando...</p>
          ) : (
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Inicio</th>
                  <th>Cierre</th>
                  <th>Productos</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.length === 0 ? (
                  <tr><td colSpan={5} className="ventas-table-empty">No hay ventas en este período</td></tr>
                ) : ventasFiltradas.map(v => (
                  <tr
                    key={v.id}
                    className={selected === v.id ? 'ventas-row--active' : ''}
                    onClick={() => setSelected(selected === v.id ? null : v.id)}
                  >
                    <td className="ventas-mesa">{v.mesa}</td>
                    <td className="ventas-hora">{v.inicio.split(' ')[1]}</td>
                    <td className="ventas-hora">{v.cierre.split(' ')[1]}</td>
                    <td>{v.items.length} item{v.items.length !== 1 ? 's' : ''}</td>
                    <td className="ventas-total">{fmt(totalVenta(v))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel detalle */}
      <div className="ventas-detalle">
        {!venta ? (
          <div className="ventas-detalle-empty">
            <span><DollarSign size={36} /></span>
            <p>Seleccioná una venta</p>
            <span>para ver el detalle</span>
          </div>
        ) : (
          <div className="ventas-detalle-content">
            <div className="ventas-detalle-header">
              <h3 className="ventas-detalle-mesa">{venta.mesa}</h3>
              <p className="ventas-detalle-fecha">{venta.inicio.split(' ')[0]}</p>
              <p className="ventas-detalle-hora">{venta.inicio.split(' ')[1]} → {venta.cierre.split(' ')[1]}</p>
            </div>

            <div className="ventas-detalle-items">
              {venta.items.map((item, i) => (
                <div key={i} className="ventas-detalle-item">
                  <span className="ventas-item-cant">{item.cantidad}×</span>
                  <span className="ventas-item-nombre">{item.nombre}</span>
                  <span className="ventas-item-precio">{fmt(item.precio * item.cantidad)}</span>
                </div>
              ))}
            </div>

            <div className="ventas-detalle-total">
              <span>Total</span>
              <strong>{fmt(totalVenta(venta))}</strong>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
