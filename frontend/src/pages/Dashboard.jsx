import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, clearSession, categoriasService, productosService } from '../services/api'
import Mesas from './dashboard/Mesas'
import Productos from './dashboard/Productos'
import Ingredientes from './dashboard/Ingredientes'
import Ventas from './dashboard/Ventas'
import Gastos from './dashboard/Gastos'
import Stock from './dashboard/Stock'
import './Dashboard.css'

const NAV_ITEMS = [
  { id: 'mesas',        label: 'Mesas',        icon: '🪑' },
  { id: 'pedidos',      label: 'Pedidos',       icon: '🧾' },
  { id: 'productos',    label: 'Productos',     icon: '🍽️' },
  { id: 'ingredientes', label: 'Ingredientes',  icon: '🧂' },
  { id: 'stock',        label: 'Stock',         icon: '📦' },
  { id: 'clientes',     label: 'Clientes',      icon: '👥' },
  { id: 'proveedores',  label: 'Proveedores',   icon: '🚚' },
  { id: 'ventas',       label: 'Ventas',        icon: '💰' },
  { id: 'reportes',     label: 'Reportes',      icon: '📊' },
  { id: 'gastos',       label: 'Gastos',        icon: '🧮' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = getSession()
  const [active, setActive]                   = useState('mesas')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [productos, setProductos]             = useState([])
  const [categorias, setCategorias]           = useState([])

  useEffect(() => {
    const cargar = async () => {
      try {
        const [cats, prods] = await Promise.all([
          categoriasService.listar(),
          productosService.listar(),
        ])
        setCategorias(cats)
        setProductos(prods)
      } catch (e) {
        console.error('Error cargando datos:', e)
      }
    }
    cargar()
  }, [])

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

          {active === 'mesas'        && <Mesas productos={productos} categorias={categorias} />}
          {active === 'productos'    && (
            <Productos
              productos={productos} setProductos={setProductos}
              categorias={categorias} setCategorias={setCategorias}
            />
          )}
          {active === 'ingredientes' && <Ingredientes />}
          {active === 'stock'        && <Stock />}
          {active === 'ventas'       && <Ventas />}
          {active === 'gastos'       && <Gastos />}

          {!['mesas','productos','ingredientes','stock','ventas','gastos'].includes(active) && (
            <div className="dash-panel">
              <div className="dash-panel-header">
                <h2 className="dash-panel-title">{NAV_ITEMS.find(i => i.id === active)?.label}</h2>
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
