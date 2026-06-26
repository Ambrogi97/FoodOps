import { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import { Users, ShieldCheck, Crown, Trash2, Clock } from 'lucide-react'
import './Admin.css'

const PLANES = ['gratuito', 'basico', 'premium']

const PLAN_COLOR = {
  gratuito:     'adm-plan--gratuito',
  basico:       'adm-plan--basico',
  profesional:  'adm-plan--profesional',
  premium:      'adm-plan--premium',
}

const fmt = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const diasRestantes = (trialEndsAt) => {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt) - new Date()
  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (dias <= 0) return 'Expirado'
  return `${dias}d`
}

export default function Admin() {
  const [usuarios, setUsuarios]           = useState([])
  const [cargando, setCargando]           = useState(true)
  const [busqueda, setBusqueda]           = useState('')
  const [cambiando, setCambiando]         = useState(null)
  const [confirmarElim, setConfirmarElim] = useState(null)
  const [error, setError]                 = useState('')

  useEffect(() => {
    adminService.listarUsuarios()
      .then(setUsuarios)
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const cambiarPlan = async (id, plan) => {
    setCambiando(id)
    try {
      const actualizado = await adminService.cambiarPlan(id, plan)
      setUsuarios(prev => prev.map(u => u._id === id ? { ...u, plan: actualizado.plan } : u))
    } catch (e) {
      console.error(e)
    } finally {
      setCambiando(null)
    }
  }

  const toggleAdmin = async (u) => {
    const nuevoRol = u.role === 'admin' ? 'user' : 'admin'
    setCambiando(u._id)
    try {
      const actualizado = await adminService.cambiarRol(u._id, nuevoRol)
      setUsuarios(prev => prev.map(x => x._id === u._id ? { ...x, role: actualizado.role } : x))
    } catch (e) {
      console.error(e)
    } finally {
      setCambiando(null)
    }
  }

  const eliminar = async () => {
    if (!confirmarElim) return
    const target = confirmarElim
    setCambiando(target._id)
    setConfirmarElim(null)
    setError('')
    try {
      await adminService.eliminarUsuario(target._id)
      setUsuarios(prev => prev.filter(u => u._id !== target._id))
    } catch (e) {
      setError(e.message || 'No se pudo eliminar el usuario')
    } finally {
      setCambiando(null)
    }
  }

  const filtrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.restaurante.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalPorPlan = (plan) => usuarios.filter(u => u.plan === plan).length

  return (
    <div className="adm-wrap">

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat">
          <Users size={20} color="#6366f1" />
          <div>
            <span className="adm-stat-num">{usuarios.length}</span>
            <span className="adm-stat-label">Usuarios totales</span>
          </div>
        </div>
        <div className="adm-stat-sep" />
        <div className="adm-stat">
          <span className="adm-plan-dot adm-plan-dot--basico" />
          <div>
            <span className="adm-stat-num">{totalPorPlan('basico')}</span>
            <span className="adm-stat-label">Básico</span>
          </div>
        </div>
        <div className="adm-stat-sep" />
        <div className="adm-stat">
          <Clock size={18} color="#10b981" />
          <div>
            <span className="adm-stat-num">{totalPorPlan('gratuito')}</span>
            <span className="adm-stat-label">En prueba</span>
          </div>
        </div>
        <div className="adm-stat-sep" />
        <div className="adm-stat">
          <Crown size={18} color="#f59e0b" />
          <div>
            <span className="adm-stat-num">{totalPorPlan('premium')}</span>
            <span className="adm-stat-label">Premium</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="adm-error" onClick={() => setError('')}>{error} ✕</div>
      )}

      {/* Búsqueda */}
      <input
        className="adm-search"
        placeholder="Buscar por nombre, email o restaurante..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />

      {/* Tabla */}
      {cargando ? (
        <div className="adm-loading">Cargando usuarios...</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Restaurante</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Trial</th>
                <th>Registro</th>
                <th>Admin</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u => {
                const trial = u.plan === 'gratuito' ? diasRestantes(u.trialEndsAt) : null
                return (
                <tr key={u._id} className={cambiando === u._id ? 'adm-row--loading' : ''}>
                  <td className="adm-td-restaurante">{u.restaurante}</td>
                  <td>{u.nombre}</td>
                  <td className="adm-td-email">{u.email}</td>
                  <td>
                    <select
                      className={`adm-plan-select ${PLAN_COLOR[u.plan] ?? ''}`}
                      value={u.plan}
                      disabled={cambiando === u._id}
                      onChange={e => cambiarPlan(u._id, e.target.value)}
                    >
                      {PLANES.map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="adm-td-trial">
                    {trial ? (
                      <span className={`adm-trial-badge ${trial === 'Expirado' ? 'adm-trial-badge--exp' : ''}`}>
                        {trial === 'Expirado' ? '⚠ Expirado' : `⏱ ${trial}`}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td className="adm-td-fecha">{fmt(u.createdAt)}</td>
                  <td>
                    <button
                      className={`adm-role-btn ${u.role === 'admin' ? 'adm-role-btn--active' : ''}`}
                      onClick={() => toggleAdmin(u)}
                      disabled={cambiando === u._id}
                      title={u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    >
                      <ShieldCheck size={15} />
                    </button>
                  </td>
                  <td>
                    <button
                      className="adm-delete-btn"
                      onClick={() => setConfirmarElim(u)}
                      disabled={cambiando === u._id}
                      title="Eliminar cuenta"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={8} className="adm-empty-row">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmarElim && (
        <div className="adm-modal-overlay" onClick={() => setConfirmarElim(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-icon"><Trash2 size={28} color="#ef4444" /></div>
            <h3 className="adm-modal-title">¿Eliminar cuenta?</h3>
            <p className="adm-modal-text">
              Vas a eliminar a <strong>{confirmarElim.nombre}</strong> ({confirmarElim.restaurante}).<br />
              Se borrarán todos sus datos permanentemente.
            </p>
            <div className="adm-modal-actions">
              <button className="adm-modal-btn adm-modal-btn--cancel" onClick={() => setConfirmarElim(null)}>Cancelar</button>
              <button className="adm-modal-btn adm-modal-btn--confirm" onClick={eliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
