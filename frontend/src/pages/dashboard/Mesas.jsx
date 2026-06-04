import { useState } from 'react'
import './Mesas.css'

const ESTADO_CONFIG = {
  libre:   { label: 'Libre',   color: '#22C55E' },
  ocupada: { label: 'Ocupada', color: '#EF4444' },
}

const ZONAS_INICIALES = [
  {
    id: 'salon',
    label: 'Salón',
    removible: false,
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
]

export default function Mesas() {
  const [zonas, setZonas]           = useState(ZONAS_INICIALES)
  const [zonaActiva, setZonaActiva] = useState('salon')
  const [selected, setSelected]     = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [nombreZona, setNombreZona] = useState('')
  const [nextMesaId, setNextMesaId] = useState(8)

  const zona = zonas.find(z => z.id === zonaActiva)
  const mesa = zona?.mesas.find(m => m.id === selected)

  const agregarZona = () => {
    const nombre = nombreZona.trim()
    if (!nombre) return
    const id = nombre.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    setZonas([...zonas, { id, label: nombre, removible: true, mesas: [] }])
    setZonaActiva(id)
    setSelected(null)
    setNombreZona('')
    setShowModal(false)
  }

  const eliminarZona = (id) => {
    setZonas(zonas.filter(z => z.id !== id))
    if (zonaActiva === id) {
      setZonaActiva('salon')
      setSelected(null)
    }
  }

  return (
    <div className="mesas-layout">

      {/* Izquierda */}
      <div className="mesas-left">

        {/* Tabs */}
        <div className="mesas-tabs-row">
          <div className="mesas-tabs">
            {zonas.map(z => (
              <div
                key={z.id}
                className={`mesas-tab-wrap ${zonaActiva === z.id ? 'mesas-tab-wrap--active' : ''}`}
              >
                <button
                  className="mesas-tab"
                  onClick={() => { setZonaActiva(z.id); setSelected(null) }}
                >
                  {z.label}
                </button>
                {z.removible && (
                  <button
                    className="mesas-tab-remove"
                    onClick={() => eliminarZona(z.id)}
                    title={`Eliminar ${z.label}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="mesas-add-zona" onClick={() => setShowModal(true)} title="Agregar zona">
            +
          </button>
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
        {zona?.mesas.length === 0 ? (
          <div className="mesas-zona-empty">
            <p>No hay mesas en esta zona</p>
          </div>
        ) : (
          <div className="mesas-grid">
            {zona.mesas.map(m => (
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
        )}
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
              <p className="mesa-detalle-salon">{zona.label}</p>
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

      {/* Modal agregar zona */}
      {showModal && (
        <div className="mesas-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="mesas-modal" onClick={e => e.stopPropagation()}>
            <h3 className="mesas-modal-title">Nueva zona</h3>
            <p className="mesas-modal-sub">Podés agregar sectores como Terraza, VIP, Jardín, etc.</p>
            <input
              className="mesas-modal-input"
              type="text"
              placeholder="Ej: Terraza"
              value={nombreZona}
              onChange={e => setNombreZona(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarZona()}
              autoFocus
            />
            <div className="mesas-modal-actions">
              <button className="mesa-btn mesa-btn--secondary" onClick={() => { setShowModal(false); setNombreZona('') }}>
                Cancelar
              </button>
              <button className="mesa-btn mesa-btn--primary" onClick={agregarZona} disabled={!nombreZona.trim()}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
