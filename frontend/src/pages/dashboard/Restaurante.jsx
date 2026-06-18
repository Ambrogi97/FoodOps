import { useState } from 'react'
import Mesas from './Mesas'
import Mostrador from './Mostrador'
import './Restaurante.css'

const TABS = [
  { id: 'mesas',            label: 'Mesas' },
  { id: 'mostrador',        label: 'Mostrador' },
  { id: 'delivery',         label: 'Delivery' },
  { id: 'mostrador-rapido', label: 'Mostrador rápido' },
]

export default function Restaurante({ productos = [], categorias = [] }) {
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
        {tab === 'mesas'     && <Mesas productos={productos} categorias={categorias} />}
        {tab === 'mostrador' && <Mostrador productos={productos} />}
        {(tab === 'delivery' || tab === 'mostrador-rapido') && <p className="restaurante-placeholder">Próximamente</p>}
      </div>
    </div>
  )
}
