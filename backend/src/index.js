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

const app = express()
const PORT = process.env.PORT || 3000

connectDB()

app.use(cors())
app.use(express.json())

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

app.get('/', (req, res) => {
  res.json({ message: 'FoodOps API running' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
