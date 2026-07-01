import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, clearSession, saveSession, categoriasService, productosService, pedidosOnlineService, rolesService, pagosService, perfilService } from '../services/api'
import {
  UtensilsCrossed, Package, Truck, Users, DollarSign, TrendingUp, BarChart2, Calculator,
  Smartphone, LogOut, ShieldCheck, Settings, Monitor, Lock, Crown, Clock,
} from 'lucide-react'
import Logo from '../components/Logo'
import Mesas from './dashboard/Mesas'
import Restaurante from './dashboard/Restaurante'
import MonitorCocina from './dashboard/MonitorCocina'
import Productos from './dashboard/Productos'
import Clientes from './dashboard/Clientes'
import Ventas from './dashboard/Ventas'
import Finanzas from './dashboard/Finanzas'
import Gastos from './dashboard/Gastos'
import Proveedores from './dashboard/Proveedores'
import Reportes from './dashboard/Reportes'
import CartaOnline from './dashboard/CartaOnline'
import Admin from './dashboard/Admin'
import Configuracion from './dashboard/Configuracion'
import './Dashboard.css'

const BASIC_IDS = new Set(['restaurante', 'monitor-cocina', 'productos', 'carta'])

const NAV_ITEMS = [
  { id: 'restaurante',    label: 'Restaurante',       Icon: UtensilsCrossed },
  { id: 'monitor-cocina', label: 'Monitor de Cocina', Icon: Monitor },
  { id: 'productos',      label: 'Productos',         Icon: Package },
  { id: 'proveedores',    label: 'Proveedores',       Icon: Truck },
  { id: 'clientes',       label: 'Clientes',          Icon: Users },
  { id: 'ventas',         label: 'Ventas',            Icon: DollarSign },
  { id: 'finanzas',       label: 'Finanzas',          Icon: TrendingUp },
  { id: 'reportes',       label: 'Reportes',          Icon: BarChart2 },
  { id: 'gastos',         label: 'Gastos',            Icon: Calculator },
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
  const [permisosData, setPermisosData]       = useState(null) // null = cargando
  const [productos, setProductos]             = useState([])
  const [categorias, setCategorias]           = useState([])
  const [pedidosCounts, setPedidosCounts]     = useState({ pendiente: 0, preparando: 0, listo: 0 })
  const [configTab, setConfigTab]             = useState('general')
  const [pagando, setPagando]                 = useState(false)
  const [pagoOk, setPagoOk]                  = useState(false)
  const [pagoError, setPagoError]             = useState('')

  const irAConfiguracion = (tab = 'general') => {
    setConfigTab(tab)
    setActive('configuracion')
  }

  // Refrescar plan/trial al abrir el dashboard (bugs 8 y 9: JWT puede ser stale)
  useEffect(() => {
    perfilService.getMe()
      .then(data => saveSession(localStorage.getItem('token'), data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    rolesService.misPermisos()
      .then(data => {
        setPermisosData(data)
        // Si la sección activa no está permitida, ir a la primera disponible
        if (!data.esOwner) {
          const visible = NAV_ITEMS.filter(i => data.permisos.includes(`Ver ${i.label}`))
          if (visible.length > 0 && !visible.find(i => i.id === 'restaurante')) {
            setActive(visible[0].id)
          }
        }
      })
      .catch(() => setPermisosData({ esOwner: false, permisos: [] }))
  }, [])

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

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  // Detectar retorno desde Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('pago') !== 'ok') return
    setPagoOk(true)
    window.history.replaceState({}, '', '/dashboard')
    // Refrescar sesión para obtener plan actualizado
    perfilService.getMe().then(data => {
      saveSession(localStorage.getItem('token'), data)
      window.location.reload()
    }).catch(() => {})
  }, [])

  const suscribir = async (plan) => {
    setPagando(plan)
    setPagoError('')
    try {
      const { init_point } = await pagosService.suscribir(plan)
      if (!init_point) throw new Error('No se recibió el link de pago')
      window.location.href = init_point
    } catch (e) {
      console.error(e)
      setPagoError(e.message || 'Error al conectar con Mercado Pago')
      setPagando(false)
    }
  }

  if (!user) return null

  const trialActivo   = user.plan === 'gratuito' && user.trialEndsAt
  const trialExpirado = trialActivo && new Date(user.trialEndsAt) < new Date()
  const diasTrial     = trialActivo && !trialExpirado
    ? Math.ceil((new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
    : 0

  const esPlanBasico = user.plan !== 'premium'
  const bloqueadoPorPlan = (id) => esPlanBasico && !BASIC_IDS.has(id)

  const puedeVer = (label) => {
    if (!permisosData) return false
    if (permisosData.esOwner) return true
    return permisosData.permisos.includes(`Ver ${label}`)
  }

  const navVisible = permisosData
    ? NAV_ITEMS.filter(item => puedeVer(item.label))
    : []

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
          {navVisible.map(item => {
            const totalActivos = item.id === 'carta'
              ? pedidosCounts.pendiente + pedidosCounts.preparando + pedidosCounts.listo
              : 0
            const locked = bloqueadoPorPlan(item.id)
            return (
              <button
                key={item.id}
                className={`dash-nav-item ${active === item.id ? 'dash-nav-item--active' : ''} ${locked ? 'dash-nav-item--locked' : ''}`}
                onClick={() => { setActive(item.id); setMenuOpen(false) }}
              >
                <span className="dash-nav-icon"><item.Icon size={18} /></span>
                <span className="dash-nav-label">{item.label}</span>
                {locked
                  ? <Lock size={12} className="dash-nav-lock" />
                  : totalActivos > 0 && <span className="dash-nav-badge">{totalActivos}</span>
                }
              </button>
            )
          })}
        </nav>

        <div className="dash-sidebar-footer">
          <div className="dash-user-info">
            <div className="dash-user-avatar">{(user.nombre?.[0] ?? '?').toUpperCase()}</div>
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
              <h1 className="dash-header-title">{active === 'admin' ? 'Admin' : (NAV_ITEMS.find(i => i.id === active)?.label ?? '')}</h1>
              <p className="dash-header-sub">{user.restaurante}</p>
            </div>
          </div>
          <div className="dash-header-actions">
            <span className="dash-badge">{user.plan}</span>
          </div>
        </header>

        {/* Banner trial activo */}
        {trialActivo && !trialExpirado && (
          <div className="dash-trial-banner">
            <Clock size={15} />
            <span>Tu período de prueba gratuita vence en <strong>{diasTrial} {diasTrial === 1 ? 'día' : 'días'}</strong>.</span>
            <a href="mailto:soporte@foodops.app?subject=Quiero activar mi plan" className="dash-trial-banner-cta">
              Activar plan
            </a>
          </div>
        )}

        {/* Content */}
        <main className="dash-content">
          {trialExpirado ? (
            <div className="dash-upgrade">
              <div className="dash-upgrade-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
                <Lock size={36} />
              </div>
              <h2 className="dash-upgrade-title">Tu prueba gratuita terminó</h2>
              <p className="dash-upgrade-desc">
                Elegí un plan para seguir usando FoodOps con <strong>{user.restaurante}</strong>.
              </p>
              <div className="dash-plan-selector">
                <button
                  className="dash-plan-btn"
                  onClick={() => suscribir('basico')}
                  disabled={!!pagando}
                >
                  {pagando === 'basico' ? 'Redirigiendo...' : (
                    <>
                      <span className="dash-plan-btn-nombre">Básico</span>
                      <span className="dash-plan-btn-precio">$20.000/mes</span>
                      <span className="dash-plan-btn-features">Restaurante · Productos · Carta · Monitor</span>
                    </>
                  )}
                </button>
                <button
                  className="dash-plan-btn dash-plan-btn--premium"
                  onClick={() => suscribir('premium')}
                  disabled={!!pagando}
                >
                  {pagando === 'premium' ? 'Redirigiendo...' : (
                    <>
                      <span className="dash-plan-btn-nombre">Premium ⭐</span>
                      <span className="dash-plan-btn-precio">$35.000/mes</span>
                      <span className="dash-plan-btn-features">Todo Básico + Ventas · Finanzas · Stock</span>
                    </>
                  )}
                </button>
              </div>
              {pagoError && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{pagoError}</p>}
              <button className="dash-trial-logout" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          ) : !permisosData ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Cargando...
            </div>
          ) : bloqueadoPorPlan(active) ? (
            <div className="dash-upgrade">
              <div className="dash-upgrade-icon"><Crown size={40} /></div>
              <h2 className="dash-upgrade-title">Módulo Premium</h2>
              <p className="dash-upgrade-desc">
                Este módulo está disponible en el plan <strong>Premium</strong>.<br />
                Actualizá tu plan para acceder a {NAV_ITEMS.find(i => i.id === active)?.label}.
              </p>
              <button
                className="dash-plan-btn dash-plan-btn--premium"
                onClick={() => suscribir('premium')}
                disabled={!!pagando}
                style={{ marginTop: 8 }}
              >
                {pagando === 'premium' ? 'Redirigiendo...' : (
                  <>
                    <span className="dash-plan-btn-nombre">Upgrade a Premium ⭐</span>
                    <span className="dash-plan-btn-precio">$35.000/mes</span>
                    <span className="dash-plan-btn-features">Ventas · Finanzas · Stock · Reportes y más</span>
                  </>
                )}
              </button>
              {pagoError && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{pagoError}</p>}
            </div>
          ) : !puedeVer(NAV_ITEMS.find(i => i.id === active)?.label ?? '') && active !== 'admin' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-muted)' }}>
              <ShieldCheck size={36} color="#94a3b8" />
              <p style={{ margin: 0, fontWeight: 600 }}>Sin acceso</p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Tu rol no tiene permiso para ver esta sección.</p>
            </div>
          ) : (
            <>
              {active === 'restaurante'    && <Restaurante productos={productos} categorias={categorias} onIrAConfiguracion={irAConfiguracion} />}
              {active === 'monitor-cocina' && <MonitorCocina />}
              {active === 'productos'      && <Productos />}
              {active === 'proveedores'    && <Proveedores />}
              {active === 'clientes'       && <Clientes />}
              {active === 'ventas'         && <Ventas />}
              {active === 'finanzas'       && <Finanzas />}
              {active === 'gastos'         && <Gastos />}
              {active === 'reportes'       && <Reportes />}
              {active === 'carta'          && <CartaOnline />}
              {active === 'configuracion'  && <Configuracion tabInicial={configTab} />}
              {active === 'admin'          && isAdmin && <Admin />}
            </>
          )}
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
