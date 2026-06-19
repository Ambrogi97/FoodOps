import { useState, useEffect } from 'react'
import { ShoppingBag, ShieldCheck, Users } from 'lucide-react'
import TiendaOnline from './TiendaOnline'
import ConfigSalasYMesas from './ConfigSalasYMesas'
import './Configuracion.css'

const SECCIONES = [
  { id: 'tienda',   label: 'Tienda Online',    Icon: ShoppingBag,  desc: 'Configurá tu carta y pedidos online' },
  { id: 'roles',    label: 'Roles de usuario',  Icon: ShieldCheck,  desc: 'Definí permisos para tu equipo' },
  { id: 'usuarios', label: 'Usuarios',           Icon: Users,        desc: 'Gestioná los usuarios de tu local' },
]

const TOP_TABS = [
  { id: 'general', label: 'Configuración general' },
  { id: 'salas',   label: 'Salas y mesas' },
]

function SeccionVacia({ label, desc, Icon }) {
  return (
    <div className="config-seccion-empty">
      <Icon size={36} color="#94a3b8" />
      <p>{label}</p>
      <span>{desc}</span>
    </div>
  )
}

export default function Configuracion({ tabInicial = 'general' }) {
  const [topTab, setTopTab] = useState(tabInicial)
  const [activa, setActiva] = useState('tienda')

  useEffect(() => { setTopTab(tabInicial) }, [tabInicial])

  const seccion = SECCIONES.find(s => s.id === activa)

  return (
    <div className="config-wrap">

      {/* Tabs superiores */}
      <div className="config-top-tabs">
        {TOP_TABS.map(t => (
          <button
            key={t.id}
            className={`config-top-tab${topTab === t.id ? ' config-top-tab--active' : ''}`}
            onClick={() => setTopTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {topTab === 'general' && (
        <div className="config-layout">
          <nav className="config-nav">
            <p className="config-nav-title">Configuración</p>
            {SECCIONES.map(s => (
              <button
                key={s.id}
                className={`config-nav-item ${activa === s.id ? 'config-nav-item--active' : ''}`}
                onClick={() => setActiva(s.id)}
              >
                <s.Icon size={16} />
                {s.label}
              </button>
            ))}
          </nav>
          <div className="config-content">
            {activa === 'tienda'   && <TiendaOnline />}
            {activa === 'roles'    && <SeccionVacia label={seccion.label} desc={seccion.desc} Icon={seccion.Icon} />}
            {activa === 'usuarios' && <SeccionVacia label={seccion.label} desc={seccion.desc} Icon={seccion.Icon} />}
          </div>
        </div>
      )}

      {topTab === 'salas' && <ConfigSalasYMesas />}

    </div>
  )
}
