const express          = require('express')
const router           = express.Router()
const { responderError } = require('../utils/security')
const auth             = require('../middleware/auth')
const CuentaCorriente  = require('../models/CuentaCorriente')

router.get('/', auth, async (req, res) => {
  try {
    const txs = await CuentaCorriente.find({ usuario: req.propietarioId }).sort('-createdAt').populate('clienteId', 'nombre')
    res.json(txs)
  } catch (e) { return responderError(req, res, e) }
})

router.get('/cliente/:clienteId', auth, async (req, res) => {
  try {
    const txs = await CuentaCorriente.find({ clienteId: req.params.clienteId, usuario: req.propietarioId }).sort('-createdAt')
    res.json(txs)
  } catch (e) { return responderError(req, res, e) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { clienteId, tipo, monto, medioPago, caja, fechaPago, comentario } = req.body
    if (!clienteId || !monto) return res.status(400).json({ message: 'Faltan campos requeridos' })
    const tx = await CuentaCorriente.create({
      clienteId,
      tipo:       tipo      || 'cargo',
      monto:      Number(monto),
      medioPago:  medioPago || '',
      caja:       caja      || 'Principal',
      fechaPago:  fechaPago || null,
      comentario: comentario || '',
      usuario: req.propietarioId,
    })
    res.status(201).json(tx)
  } catch (e) { return responderError(req, res, e) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const tx = await CuentaCorriente.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' })
    res.json({ message: 'Transacción eliminada' })
  } catch (e) { return responderError(req, res, e) }
})

module.exports = router
