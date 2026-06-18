import { useState } from 'react'
import './Restaurante.css'

const TABS = [
  { id: 'mesas',            label: 'Mesas' },
  { id: 'mostrador',        label: 'Mostrador' },
  { id: 'delivery',         label: 'Delivery' },
  { id: 'mostrador-rapido', label: 'Mostrador rápido' },
]

export default function Restaurante() {
  const [tab, setTab] = useState('mesas')

  return (
    <div className="restaurante-layout">
      <div className="restaurante-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`restaurante-tab${tab === t.id ? ' restaurante-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="restaurante-content">
        <p className="restaurante-placeholder">Próximamente</p>
      </div>
    </div>
  )
}
