import { useState } from 'react'
import './Ventas.css'

const PERIODOS = ['Hoy', 'Esta semana', 'Este mes']

const hoy = new Date()
const fecha = (diasAtras, hora) => {
  const d = new Date(hoy)
  d.setDate(d.getDate() - diasAtras)
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${hora}`
}

const VENTAS_MOCK = [
  { id: 1,  mesa: 'Mesa 2',  inicio: fecha(0, '20:15'), cierre: fecha(0, '21:45'), estado: 'cerrada', items: [{ nombre: 'Margarita', cantidad: 2, precio: 13000 }, { nombre: 'Coca Cola 500ml', cantidad: 2, precio: 3500 }] },
  { id: 2,  mesa: 'Mesa 4',  inicio: fecha(0, '19:50'), cierre: fecha(0, '21:10'), estado: 'cerrada', items: [{ nombre: 'Panuzzo Crudo', cantidad: 2, precio: 13500 }, { nombre: 'Cerveza Heineken', cantidad: 3, precio: 5000 }] },
  { id: 3,  mesa: 'Mesa 6',  inicio: fecha(0, '20:30'), cierre: fecha(0, '22:00'), estado: 'cerrada', items: [{ nombre: 'Fugazzeta', cantidad: 1, precio: 15000 }, { nombre: 'Agua mineral', cantidad: 2, precio: 2000 }] },
  { id: 4,  mesa: 'Mesa 1',  inicio: fecha(1, '13:00'), cierre: fecha(1, '14:30'), estado: 'cerrada', items: [{ nombre: 'Calzone Clásico', cantidad: 2, precio: 14000 }, { nombre: 'Coca Cola 500ml', cantidad: 2, precio: 3500 }] },
  { id: 5,  mesa: 'Mesa 3',  inicio: fecha(1, '20:00'), cierre: fecha(1, '21:30'), estado: 'cerrada', items: [{ nombre: 'Napolitana', cantidad: 3, precio: 14500 }, { nombre: 'Cerveza Heineken', cantidad: 3, precio: 5000 }] },
  { id: 6,  mesa: 'Mesa 5',  inicio: fecha(2, '21:00'), cierre: fecha(2, '22:45'), estado: 'cerrada', items: [{ nombre: 'Margarita', cantidad: 1, precio: 13000 }, { nombre: 'Tiramisú', cantidad: 2, precio: 7000 }] },
  { id: 7,  mesa: 'Mesa 2',  inicio: fecha(3, '12:30'), cierre: fecha(3, '13:45'), estado: 'cerrada', items: [{ nombre: 'Panuzzo Speciale', cantidad: 2, precio: 13500 }, { nombre: 'Agua mineral', cantidad: 2, precio: 2000 }] },
  { id: 8,  mesa: 'Mesa 7',  inicio: fecha(4, '20:15'), cierre: fecha(4, '22:00'), estado: 'cerrada', items: [{ nombre: 'Fugazzeta', cantidad: 2, precio: 15000 }, { nombre: 'Cerveza Heineken', cantidad: 4, precio: 5000 }] },
  { id: 9,  mesa: 'Mesa 1',  inicio: fecha(5, '19:30'), cierre: fecha(5, '21:00'), estado: 'cerrada', items: [{ nombre: 'Margarita', cantidad: 2, precio: 13000 }, { nombre: 'Tiramisú', cantidad: 1, precio: 7000 }] },
  { id: 10, mesa: 'Mesa 4',  inicio: fecha(6, '13:00'), cierre: fecha(6, '14:30'), estado: 'cerrada', items: [{ nombre: 'Calzone Clásico', cantidad: 1, precio: 14000 }, { nombre: 'Coca Cola 500ml', cantidad: 1, precio: 3500 }] },
]

const totalVenta = (v) => v.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

const fechaHoy = () => {
  const d = new Date()
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
}

const filtrarPorPeriodo = (ventas, periodo) => {
  const hoy = fechaHoy()
  return ventas.filter(v => {
    const [dia, mes, anio] = v.cierre.split(' ')[0].split('/')
    const [diaH, mesH, anioH] = hoy.split('/')
    if (periodo === 'Hoy') return dia === diaH && mes === mesH && anio === anioH
    if (periodo === 'Esta semana') {
      const fechaV = new Date(anio, mes - 1, dia)
      const diff   = (new Date() - fechaV) / (1000 * 60 * 60 * 24)
      return diff < 7
    }
    if (periodo === 'Este mes') {
      return mes === mesH && anio === anioH
    }
    return true
  })
}

const fmt = (n) => `$${n.toLocaleString('es-AR')}`

export default function Ventas() {
  const [periodo, setPeriodo]   = useState('Esta semana')
  const [selected, setSelected] = useState(null)

  const ventasFiltradas = filtrarPorPeriodo(VENTAS_MOCK, periodo)
  const venta           = VENTAS_MOCK.find(v => v.id === selected)

  const totalPeriodo  = ventasFiltradas.reduce((acc, v) => acc + totalVenta(v), 0)
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
        </div>
      </div>

      {/* Panel detalle */}
      <div className="ventas-detalle">
        {!venta ? (
          <div className="ventas-detalle-empty">
            <span>💰</span>
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
