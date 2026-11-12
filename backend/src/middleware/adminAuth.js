const auth = require('./auth')

// Acceso al panel de administración de la plataforma FoodOps.
// No alcanza con role === 'admin' (todo dueño de restaurante lo es):
// se exige el flag superadmin, que auth lee siempre de la base de datos.
const soloSuperadmin = (req, res, next) => {
  if (!req.usuario?.superadmin) {
    return res.status(403).json({ message: 'Acceso denegado' })
  }
  next()
}

module.exports = [auth, soloSuperadmin]
