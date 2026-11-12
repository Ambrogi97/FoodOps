const jwt  = require('jsonwebtoken')
const User = require('../models/User')
const Role = require('../models/Role')
const { permisosRequeridos } = require('./permisos')

// Rutas que siguen funcionando con el plan vencido (perfil, pagar, permisos, panel admin)
const RUTAS_SIN_PLAN = ['/auth', '/api/pagos', '/api/admin']
const RUTAS_SIN_PLAN_EXACTAS = new Set(['/api/roles/mis-permisos'])

function planVencido(trialEndsAt) {
  return !!trialEndsAt && new Date(trialEndsAt) < new Date()
}

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  let payload
  try {
    payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: 'Token inválido' })
  }

  try {
    // Datos actuales desde la base: el token puede tener rol/plan desactualizados
    const user = await User.findById(payload.id)
      .select('role cuentaPadreId plan trialEndsAt passwordChangedAt superadmin').lean()
    if (!user) return res.status(401).json({ message: 'Sesión inválida' })

    // Si cambió la contraseña después de emitir el token, la sesión ya no vale
    if (user.passwordChangedAt && payload.iat * 1000 < new Date(user.passwordChangedAt).getTime() - 1000) {
      return res.status(401).json({ message: 'La sesión expiró. Iniciá sesión de nuevo.' })
    }

    // Plan y vencimiento son los del dueño de la cuenta
    let owner = user
    if (user.cuentaPadreId) {
      owner = await User.findById(user.cuentaPadreId).select('plan trialEndsAt').lean()
      if (!owner) return res.status(401).json({ message: 'Sesión inválida' })
    }

    req.usuario = {
      id:            String(user._id),
      role:          user.role,
      cuentaPadreId: user.cuentaPadreId ? String(user.cuentaPadreId) : null,
      plan:          owner.plan,
      superadmin:    !!user.superadmin,
      iat:           payload.iat,
    }
    // propietarioId: si es sub-usuario apunta al dueño, si es el dueño apunta a sí mismo
    req.propietarioId = req.usuario.cuentaPadreId || req.usuario.id

    const ruta = req.baseUrl + req.path
    const exentaDePlan = RUTAS_SIN_PLAN.some(p => req.baseUrl === p || req.baseUrl.startsWith(p + '/')) ||
                         RUTAS_SIN_PLAN_EXACTAS.has(ruta)
    if (!exentaDePlan && planVencido(owner.trialEndsAt)) {
      return res.status(402).json({ code: 'PLAN_VENCIDO', message: 'Tu plan venció. Elegí un plan para seguir usando FoodOps.' })
    }

    // Permisos por módulo para sub-usuarios
    if (user.cuentaPadreId) {
      const requeridos = permisosRequeridos(req)
      if (requeridos) {
        const role = await Role.findOne({ propietarioId: user.cuentaPadreId, key: user.role }).select('permisos').lean()
        const permisos = role?.permisos || []
        if (!requeridos.some(p => permisos.includes(p))) {
          return res.status(403).json({ message: 'Tu rol no tiene permiso para esta acción' })
        }
      }
    }

    next()
  } catch (e) {
    console.error('[auth]', e.message)
    res.status(500).json({ message: 'Error de autenticación' })
  }
}
