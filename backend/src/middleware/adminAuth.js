const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' })
  }
  try {
    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' })
    }
    req.usuario = payload
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}
