import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSession, clearSession } from '../services/api'
import './Dashboard.css'

const NAV_ITEMS = [
  { id: 'mesas',       label: 'Mesas',       icon: '🪑' },
  { id: 'pedidos',     label: 'Pedidos',      icon: '🧾' },
  { id: 'productos',   label: 'Productos',    icon: '🍽️' },
  { id: 'ingredientes',label: 'Ingredientes', icon: '🧂' },
  { id: 'stock',       label: 'Stock',        icon: '📦' },
  { id: 'clientes',    label: 'Clientes',     icon: '👥' },
  { id: 'proveedores', label: 'Proveedores',  icon: '🚚' },
  { id: 'ventas',      label: 'Ventas',       icon: '💰' },
  { id: 'reportes',    label: 'Reportes',     icon: '📊' },
  { id: 'gastos',      label: 'Gastos',       icon: '🧮' },
]

const STAT_CARDS = [
  { label: 'Ventas hoy',       value: '$0',  sub: 'vs ayer',         color: 'orange' },
  { label: 'Pedidos activos',  value: '0',   sub: 'en curso',        color: 'blue'   },
  { label: 'Mesas ocupadas',   value: '0/0', sub: 'del salón',       color: 'green'  },
  { label: 'Gasto del mes',    value: '$0',  sub: 'registrado',      color: 'red'    },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = getSession()
  const [active, setActive] = useState('mesas')

  if (!user) {
    navigate('/login')
    return null
  }

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  return (
    <div className="dash-layout">

      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-logo">
          <span className="dash-logo-icon">🍽️</span>
          <span className="dash-logo-text">Food<strong>Ops</strong></span>
        </div>

        <nav className="dash-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`dash-nav-item ${active === item.id ? 'dash-nav-item--active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <div className="dash-user-info">
            <div className="dash-user-avatar">{user.nombre[0].toUpperCase()}</div>
            <div className="dash-user-details">
              <span className="dash-user-name">{user.nombre}</span>
              <span className="dash-user-plan">{user.plan}</span>
            </div>
          </div>
          <button className="dash-logout" onClick={handleLogout} title="Cerrar sesión">
            ↩
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">

        {/* Header */}
        <header className="dash-header">
          <div>
            <h1 className="dash-header-title">{NAV_ITEMS.find(i => i.id === active)?.label}</h1>
            <p className="dash-header-sub">{user.restaurante}</p>
          </div>
          <div className="dash-header-actions">
            <span className="dash-badge">{user.plan}</span>
          </div>
        </header>

        {/* Content */}
        <main className="dash-content">

          {/* Stat cards */}
          <div className="dash-stats">
            {STAT_CARDS.map((card) => (
              <div key={card.label} className={`dash-stat-card dash-stat-card--${card.color}`}>
                <span className="dash-stat-value">{card.value}</span>
                <span className="dash-stat-label">{card.label}</span>
                <span className="dash-stat-sub">{card.sub}</span>
              </div>
            ))}
          </div>

          {/* Placeholder content */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h2 className="dash-panel-title">{NAV_ITEMS.find(i => i.id === active)?.label}</h2>
              <button className="dash-btn-primary">+ Nuevo</button>
            </div>
            <div className="dash-empty">
              <div className="dash-empty-icon">{NAV_ITEMS.find(i => i.id === active)?.icon}</div>
              <p>Esta sección está en construcción</p>
              <span>Pronto vas a poder gestionar {NAV_ITEMS.find(i => i.id === active)?.label.toLowerCase()} desde acá</span>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
