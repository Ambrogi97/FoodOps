import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, clearSession } from '../services/api'
import Mesas from './dashboard/Mesas'
import Productos from './dashboard/Productos'
import Ingredientes from './dashboard/Ingredientes'
import './Dashboard.css'

const CATEGORIAS_INICIALES = [
  { id: 1, nombre: 'Pizzas' },
  { id: 2, nombre: 'Panuzzo' },
  { id: 3, nombre: 'Calzones' },
  { id: 4, nombre: 'Bebidas' },
  { id: 5, nombre: 'Postres' },
]

const PRODUCTOS_INICIALES = [
  { id: 1,  categoriaId: 1, nombre: 'Margarita',       precio: 13000, costo: 4610,  activo: true },
  { id: 2,  categoriaId: 1, nombre: 'Napolitana',       precio: 14500, costo: 5200,  activo: true },
  { id: 3,  categoriaId: 1, nombre: 'Fugazzeta',        precio: 15000, costo: 5800,  activo: true },
  { id: 4,  categoriaId: 2, nombre: 'Panuzzo Crudo',    precio: 13500, costo: 9526,  activo: true },
  { id: 5,  categoriaId: 2, nombre: 'Panuzzo Speciale', precio: 13500, costo: 7776,  activo: true },
  { id: 6,  categoriaId: 3, nombre: 'Calzone Clásico',  precio: 14000, costo: 6100,  activo: true },
  { id: 7,  categoriaId: 4, nombre: 'Coca Cola 500ml',  precio: 3500,  costo: 1200,  activo: true },
  { id: 8,  categoriaId: 4, nombre: 'Agua mineral',     precio: 2000,  costo: 600,   activo: true },
  { id: 9,  categoriaId: 4, nombre: 'Cerveza Heineken', precio: 5000,  costo: 2100,  activo: true },
  { id: 10, categoriaId: 5, nombre: 'Tiramisú',         precio: 7000,  costo: 2800,  activo: true },
]

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


export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = getSession()
  const [active, setActive]                   = useState('mesas')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [productos, setProductos]             = useState(PRODUCTOS_INICIALES)
  const [categorias, setCategorias]           = useState(CATEGORIAS_INICIALES)

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
          <button className="dash-logout" onClick={() => setShowLogoutModal(true)} title="Cerrar sesión">
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

          {/* Contenido por sección */}
          {active === 'mesas' ? (
            <Mesas productos={productos} categorias={categorias} />
          ) : active === 'ingredientes' ? (
            <Ingredientes />
          ) : active === 'productos' ? (
            <Productos
              productos={productos} setProductos={setProductos}
              categorias={categorias} setCategorias={setCategorias}
            />
          ) : (
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
          )}

        </main>
      </div>
      {/* Modal cerrar sesión */}
      {showLogoutModal && (
        <div className="dash-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-icon">↩</div>
            <h3 className="dash-modal-title">¿Estás seguro?</h3>
            <p className="dash-modal-text">Vas a cerrar la sesión de <strong>{user.restaurante}</strong>.</p>
            <div className="dash-modal-actions">
              <button className="dash-modal-btn dash-modal-btn--cancel" onClick={() => setShowLogoutModal(false)}>
                No
              </button>
              <button className="dash-modal-btn dash-modal-btn--confirm" onClick={handleLogout}>
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
