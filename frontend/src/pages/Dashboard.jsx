import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, clearSession, categoriasService, productosService, pedidosOnlineService } from '../services/api'
import {
  Armchair, Receipt, UtensilsCrossed, FlaskConical, Package,
  Truck, DollarSign, BarChart2, Calculator, Smartphone, LogOut, ShieldCheck, Settings,
} from 'lucide-react'
import Logo from '../components/Logo'
import Mesas from './dashboard/Mesas'
import Restaurante from './dashboard/Restaurante'
import Productos from './dashboard/Productos'
import Ingredientes from './dashboard/Ingredientes'
import Ventas from './dashboard/Ventas'
import Gastos from './dashboard/Gastos'
import Stock from './dashboard/Stock'
import Proveedores from './dashboard/Proveedores'
import Reportes from './dashboard/Reportes'
import CartaOnline from './dashboard/CartaOnline'
import Admin from './dashboard/Admin'
import Configuracion from './dashboard/Configuracion'
import './Dashboard.css'

const NAV_ITEMS = [
  { id: 'restaurante',  label: 'Restaurante',  Icon: UtensilsCrossed },
  { id: 'productos',    label: 'Productos',     Icon: UtensilsCrossed },
  { id: 'ingredientes', label: 'Ingredientes',  Icon: FlaskConical },
  { id: 'stock',        label: 'Stock',         Icon: Package },
  { id: 'proveedores',  label: 'Proveedores',   Icon: Truck },
  { id: 'ventas',       label: 'Ventas',        Icon: DollarSign },
  { id: 'reportes',     label: 'Reportes',      Icon: BarChart2 },
  { id: 'gastos',       label: 'Gastos',        Icon: Calculator },
  { id: 'carta',         label: 'Carta Online',   Icon: Smartphone },
  { id: 'configuracion', label: 'Configuración',  Icon: Settings },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = getSession()
  const [active, setActive]                   = useState('restaurante')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const isAdmin = user?.role === 'admin'
  const [menuOpen, setMenuOpen]               = useState(false)
  const [productos, setProductos]             = useState([])
  const [categorias, setCategorias]           = useState([])
  const [pedidosCounts, setPedidosCounts]     = useState({ pendiente: 0, preparando: 0, listo: 0 })

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

  const actualizarCounts = useCallback(async () => {
    try {
      const pedidos = await pedidosOnlineService.listar()
      setPedidosCounts({
        pendiente:  pedidos.filter(p => p.estado === 'pendiente').length,
        preparando: pedidos.filter(p => p.estado === 'preparando').length,
        listo:      pedidos.filter(p => p.estado === 'listo').length,
      })
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    actualizarCounts()
    const iv = setInterval(actualizarCounts, 15_000)
    return () => clearInterval(iv)
  }, [actualizarCounts])

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

      {/* Overlay mobile */}
      {menuOpen && <div className="dash-overlay" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`dash-sidebar${menuOpen ? ' dash-sidebar--open' : ''}`}>
        <div className="dash-logo">
          <Logo size={34} />
          <span className="dash-logo-text">Food<strong>Ops</strong></span>
        </div>

        <nav className="dash-nav">
          {isAdmin && (
            <button
              className={`dash-nav-item dash-nav-item--admin ${active === 'admin' ? 'dash-nav-item--active' : ''}`}
              onClick={() => { setActive('admin'); setMenuOpen(false) }}
            >
              <span className="dash-nav-icon"><ShieldCheck size={18} color="#6366f1" /></span>
              <span className="dash-nav-label">Admin</span>
            </button>
          )}
          {NAV_ITEMS.map(item => {
            const totalActivos = item.id === 'carta'
              ? pedidosCounts.pendiente + pedidosCounts.preparando + pedidosCounts.listo
              : 0
            return (
              <button
                key={item.id}
                className={`dash-nav-item ${active === item.id ? 'dash-nav-item--active' : ''}`}
                onClick={() => { setActive(item.id); setMenuOpen(false) }}
              >
                <span className="dash-nav-icon"><item.Icon size={18} /></span>
                <span className="dash-nav-label">{item.label}</span>
                {totalActivos > 0 && (
                  <span className="dash-nav-badge">{totalActivos}</span>
                )}
              </button>
            )
          })}
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
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">

        {/* Header */}
        <header className="dash-header">
          <div className="dash-header-left">
            <button className="dash-hamburger" onClick={() => setMenuOpen(true)}>
              <span /><span /><span />
            </button>
            <div>
              <h1 className="dash-header-title">{active === 'admin' ? 'Admin' : NAV_ITEMS.find(i => i.id === active)?.label}</h1>
              <p className="dash-header-sub">{user.restaurante}</p>
            </div>
          </div>
          <div className="dash-header-actions">
            <span className="dash-badge">{user.plan}</span>
          </div>
        </header>

        {/* Content */}
        <main className="dash-content">

          {active === 'restaurante' && <Restaurante productos={productos} categorias={categorias} />}
          {active === 'productos'   && (
            <Productos
              productos={productos} setProductos={setProductos}
              categorias={categorias} setCategorias={setCategorias}
            />
          )}
          {active === 'ingredientes' && <Ingredientes />}
          {active === 'stock'        && <Stock />}
          {active === 'proveedores'  && <Proveedores />}
          {active === 'ventas'       && <Ventas />}
          {active === 'gastos'       && <Gastos />}
          {active === 'reportes'     && <Reportes />}
          {active === 'carta'         && <CartaOnline />}
          {active === 'configuracion' && <Configuracion />}
          {active === 'admin'         && isAdmin && <Admin />}


        </main>
      </div>

      {/* Modal cerrar sesión */}
      {showLogoutModal && (
        <div className="dash-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-icon"><LogOut size={28} /></div>
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
