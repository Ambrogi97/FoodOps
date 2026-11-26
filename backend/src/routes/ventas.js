const express = require('express')
const router  = express.Router()
const { responderError } = require('../utils/security')
const auth    = require('../middleware/auth')
const Venta   = require('../models/Venta')
const ConfigTienda = require('../models/ConfigTienda')

// Próximo número de venta del restaurante, atómico: dos ventas cerradas a la vez nunca
// reciben el mismo número (antes se calculaba como "la última + 1" y se repetían).
async function siguienteNumeroVenta(uid) {
  const conf = await ConfigTienda.findOne({ usuario: uid }).select('ventaCounter').lean()
  if (conf?.ventaCounter == null) {
    // Primera vez: el contador arranca desde la última venta existente. El filtro
    // "$exists: false" hace que, si llegan dos ventas juntas, lo inicialice una sola.
    const ultima = await Venta.findOne({ usuario: uid }).sort('-numero').select('numero').lean()
    try {
      await ConfigTienda.updateOne(
        { usuario: uid, ventaCounter: { $exists: false } },
        { $set: { ventaCounter: ultima?.numero || 0 } },
        { upsert: true },
      )
    } catch (e) {
      if (e?.code !== 11000) throw e   // otra petición ya lo inicializó o creó la configuración
    }
  }
  const c = await ConfigTienda.findOneAndUpdate(
    { usuario: uid },
    { $inc: { ventaCounter: 1 } },
    { returnDocument: 'after', projection: { ventaCounter: 1 } },
  )
  return c.ventaCounter
}

router.get('/', auth, async (req, res) => {
  try {
    const ventas = await Venta.find({ usuario: req.propietarioId }).sort('-createdAt')
    res.json(ventas)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { mesa, inicio, cierre, items, personas, metodoPago, tipo } = req.body
    if (!mesa || !inicio) return res.status(400).json({ message: 'Faltan campos requeridos' })

    const numero = await siguienteNumeroVenta(req.propietarioId)

    const venta = await Venta.create({
      numero,
      mesa,
      inicio,
      cierre:     cierre || null,
      items:      items || [],
      personas:   personas || 1,
      metodoPago: metodoPago || 'Efectivo',
      tipo:       tipo || 'salon',
      usuario:    req.propietarioId,
    })
    res.status(201).json(venta)
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
