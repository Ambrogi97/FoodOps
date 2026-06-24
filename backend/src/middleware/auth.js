const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' })
  }
  try {
    const token = authHeader.split(' ')[1]
    req.usuario = jwt.verify(token, process.env.JWT_SECRET)
    // propietarioId: si es sub-usuario apunta al dueño, si es el dueño apunta a sí mismo
    req.propietarioId = req.usuario.cuentaPadreId || req.usuario.id
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}
