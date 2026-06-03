import { useState } from 'react'
import './Mesas.css'

const SALONES = {
  salon: {
    label: 'Salón',
    mesas: [
      { id: 1, estado: 'libre' },
      { id: 2, estado: 'ocupada', cliente: 'Mesa 2', hora: '20:15', total: '$13.500' },
      { id: 3, estado: 'libre' },
      { id: 4, estado: 'ocupada', cliente: 'Belgrano 1373', hora: '19:50', total: '$33.000' },
      { id: 5, estado: 'libre' },
      { id: 6, estado: 'ocupada', cliente: 'Mesa 6', hora: '20:30', total: '$8.000' },
      { id: 7, estado: 'libre' },
    ],
  },
  terraza: {
    label: 'Terraza',
    mesas: [
      { id: 8,  estado: 'libre' },
      { id: 9,  estado: 'libre' },
      { id: 10, estado: 'ocupada', cliente: 'Mesa 10', hora: '20:00', total: '$21.000' },
      { id: 11, estado: 'libre' },
      { id: 12, estado: 'libre' },
    ],
  },
}

const ESTADO_CONFIG = {
  libre:   { label: 'Libre',   color: '#22C55E' },
  ocupada: { label: 'Ocupada', color: '#EF4444' },
}

export default function Mesas() {
  const [salon, setSalon]         = useState('salon')
  const [selected, setSelected]   = useState(null)

  const mesas = SALONES[salon].mesas
  const mesa  = mesas.find(m => m.id === selected)

  return (
    <div className="mesas-layout">

      {/* Izquierda: grid de mesas */}
      <div className="mesas-left">

        {/* Tabs salón */}
        <div className="mesas-tabs">
          {Object.entries(SALONES).map(([key, val]) => (
            <button
              key={key}
              className={`mesas-tab ${salon === key ? 'mesas-tab--active' : ''}`}
              onClick={() => { setSalon(key); setSelected(null) }}
            >
              {val.label}
            </button>
          ))}
        </div>

        {/* Leyenda */}
        <div className="mesas-leyenda">
          {Object.entries(ESTADO_CONFIG).map(([key, val]) => (
            <span key={key} className="mesas-leyenda-item">
              <span className="mesas-leyenda-dot" style={{ background: val.color }} />
              {val.label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="mesas-grid">
          {mesas.map(m => (
            <button
              key={m.id}
              className={`mesa-card mesa-card--${m.estado} ${selected === m.id ? 'mesa-card--selected' : ''}`}
              onClick={() => setSelected(selected === m.id ? null : m.id)}
            >
              <span className="mesa-numero">{m.id}</span>
              <span className="mesa-estado-dot" style={{ background: ESTADO_CONFIG[m.estado].color }} />
            </button>
          ))}
        </div>
      </div>

      {/* Derecha: detalle */}
      <div className="mesas-right">
        {!mesa ? (
          <div className="mesas-empty">
            <span className="mesas-empty-icon">🪑</span>
            <p>Seleccioná una mesa</p>
            <span>para ver su estado</span>
          </div>
        ) : (
          <div className="mesa-detalle">
            <div className="mesa-detalle-header">
              <div
                className="mesa-detalle-badge"
                style={{ background: ESTADO_CONFIG[mesa.estado].color + '20', color: ESTADO_CONFIG[mesa.estado].color }}
              >
                {ESTADO_CONFIG[mesa.estado].label}
              </div>
              <h2 className="mesa-detalle-title">Mesa {mesa.id}</h2>
              <p className="mesa-detalle-salon">{SALONES[salon].label}</p>
            </div>

            {mesa.estado === 'ocupada' && (
              <div className="mesa-detalle-info">
                <div className="mesa-detalle-row">
                  <span>Cliente</span>
                  <strong>{mesa.cliente}</strong>
                </div>
                <div className="mesa-detalle-row">
                  <span>Hora inicio</span>
                  <strong>{mesa.hora}</strong>
                </div>
                <div className="mesa-detalle-row">
                  <span>Total actual</span>
                  <strong>{mesa.total}</strong>
                </div>
              </div>
            )}

            <div className="mesa-detalle-actions">
              {mesa.estado === 'libre' ? (
                <button className="mesa-btn mesa-btn--primary">+ Nuevo pedido</button>
              ) : (
                <>
                  <button className="mesa-btn mesa-btn--primary">Ver pedido</button>
                  <button className="mesa-btn mesa-btn--secondary">Cerrar mesa</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
