const jwt  = require('jsonwebtoken')
const User = require('../models/User')

// Acceso al panel de administración de la plataforma FoodOps.
// No alcanza con role === 'admin' (todo dueño de restaurante lo es):
// se exige el flag superadmin, leído siempre de la base de datos.
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
    const user = await User.findById(payload.id).select('superadmin').lean()
    if (!user?.superadmin) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }
    req.usuario = payload
    next()
  } catch {
    res.status(500).json({ message: 'Error de autenticación' })
  }
}
