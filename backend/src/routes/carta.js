const express        = require('express')
const router         = express.Router()
const User           = require('../models/User')
const Categoria      = require('../models/Categoria')
const Producto       = require('../models/Producto')
const PedidoOnline   = require('../models/PedidoOnline')
const ConfigTienda   = require('../models/ConfigTienda')

// Menú público del restaurante
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('restaurante')
    if (!user) return res.status(404).json({ message: 'Restaurante no encontrado' })

    const config = await ConfigTienda.findOne({ usuario: req.params.userId })
    if (!config?.habilitado) {
      return res.json({ habilitado: false, restaurante: user.restaurante })
    }

    const [categorias, productos] = await Promise.all([
      Categoria.find({ usuario: req.params.userId }).sort('nombre'),
      Producto.find({ usuario: req.params.userId }).sort('nombre'),
    ])

    res.json({
      habilitado:         true,
      restaurante:        user.restaurante,
      logo:               config.logo               || null,
      portada:            config.portada             || null,
      colorFondo:         config.colorFondo          || null,
      deliveryHabilitado: config.delivery?.habilitado || false,
      retiroHabilitado:   config.retiro?.habilitado   || false,
      categorias,
      productos,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// Enviar pedido desde la carta
router.post('/:userId/pedido', async (req, res) => {
  try {
    const { items, tipo, mesaNumero, direccion, clienteNombre, notas } = req.body
    if (!items?.length)  return res.status(400).json({ message: 'El pedido está vacío' })
    if (!tipo)           return res.status(400).json({ message: 'Indicá el tipo de pedido' })
    if (tipo === 'mesa'     && !mesaNumero?.trim()) return res.status(400).json({ message: 'Indicá el número de mesa' })
    if (tipo === 'delivery' && !direccion?.trim())  return res.status(400).json({ message: 'Indicá la dirección de entrega' })

    const total  = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
    const pedido = await PedidoOnline.create({
      usuario: req.params.userId,
      items,
      tipo,
      mesaNumero:    mesaNumero?.trim()    || '',
      direccion:     direccion?.trim()     || '',
      clienteNombre: clienteNombre?.trim() || '',
      notas:         notas?.trim()         || '',
      total,
    })

    res.status(201).json({ id: pedido._id, message: '¡Pedido enviado con éxito!' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
