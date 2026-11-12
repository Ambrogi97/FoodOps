require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/database')
const authRoutes        = require('./routes/auth')
const categoriasRoutes  = require('./routes/categorias')
const productosRoutes   = require('./routes/productos')
const ingredientesRoutes = require('./routes/ingredientes')
const zonasRoutes       = require('./routes/zonas')
const mesasRoutes       = require('./routes/mesas')
const ventasRoutes      = require('./routes/ventas')
const gastosRoutes      = require('./routes/gastos')
const stockRoutes       = require('./routes/stock')
const proveedoresRoutes    = require('./routes/proveedores')
const uploadsRoutes        = require('./routes/uploads')
const cartaRoutes          = require('./routes/carta')
const pedidosOnlineRoutes  = require('./routes/pedidosOnline')
const adminRoutes          = require('./routes/admin')
const configRoutes         = require('./routes/config')
const mostradorRoutes      = require('./routes/mostrador')
const deliveryRoutes       = require('./routes/delivery')
const descuentosRoutes        = require('./routes/descuentos')
const categoriasGastoRoutes   = require('./routes/categoriasGasto')
const clientesRoutes                      = require('./routes/clientes')
const cuentasCorrientesRoutes             = require('./routes/cuentasCorrientes')
const cuentasCorrientesProveedoresRoutes  = require('./routes/cuentasCorrientesProveedores')
const usuariosRoutes                       = require('./routes/usuarios')
const rolesRoutes                          = require('./routes/roles')
const pagosRoutes                          = require('./routes/pagos')
const { router: pushRoutes }               = require('./routes/push')
const resenasRoutes                        = require('./routes/resenas')

const mongoSanitize = require('express-mongo-sanitize')
const User = require('./models/User')

const app = express()
const PORT = process.env.PORT || 3000

app.set('trust proxy', 1)

connectDB().then(async () => {
  const deleted = await User.deleteMany({ email: /@seed\.local$/i })
  if (deleted.deletedCount > 0) {
    console.log(`[startup] Eliminados ${deleted.deletedCount} usuarios de prueba (@seed.local)`)
  }
})

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())
// express-mongo-sanitize reasigna req.query, que en Express 5 es solo getter.
// Sanitizamos body/params in-place y redefinimos query como propiedad propia.
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body)
  if (req.params) mongoSanitize.sanitize(req.params)
  const query = mongoSanitize.sanitize({ ...req.query })
  Object.defineProperty(req, 'query', { value: query, writable: true, configurable: true, enumerable: true })
  next()
})

app.use('/auth', authRoutes)
app.use('/api/categorias',   categoriasRoutes)
app.use('/api/productos',    productosRoutes)
app.use('/api/ingredientes', ingredientesRoutes)
app.use('/api/zonas',        zonasRoutes)
app.use('/api/mesas',        mesasRoutes)
app.use('/api/ventas',       ventasRoutes)
app.use('/api/gastos',       gastosRoutes)
app.use('/api/stock',        stockRoutes)
app.use('/api/proveedores',    proveedoresRoutes)
app.use('/api/uploads',       uploadsRoutes)
app.use('/uploads',           express.static(require('path').join(__dirname, '../uploads')))
app.use('/api/carta',          cartaRoutes)
app.use('/api/pedidos-online', pedidosOnlineRoutes)
app.use('/api/admin',          adminRoutes)
app.use('/api/config',         configRoutes)
app.use('/api/mostrador',      mostradorRoutes)
app.use('/api/delivery',       deliveryRoutes)
app.use('/api/descuentos',         descuentosRoutes)
app.use('/api/categorias-gasto',   categoriasGastoRoutes)
app.use('/api/clientes',                        clientesRoutes)
app.use('/api/cuentas-corrientes',              cuentasCorrientesRoutes)
app.use('/api/cuentas-corrientes-proveedores',  cuentasCorrientesProveedoresRoutes)
app.use('/api/usuarios',                        usuariosRoutes)
app.use('/api/roles',                           rolesRoutes)
app.use('/api/pagos',                           pagosRoutes)
app.use('/api/push',                            pushRoutes)
app.use('/api/resenas',                         resenasRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'FoodOps API running' })
})

// Error handler global — siempre devuelve JSON (nunca HTML)
app.use((err, req, res, _next) => {
  console.error('[error]', err.message)
  const status = err.status || err.statusCode || 500
  res.status(status).json({ message: err.message || 'Error interno del servidor' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
