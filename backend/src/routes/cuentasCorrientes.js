const express          = require('express')
const router           = express.Router()
const auth             = require('../middleware/auth')
const CuentaCorriente  = require('../models/CuentaCorriente')

router.get('/', auth, async (req, res) => {
  try {
    const txs = await CuentaCorriente.find({ usuario: req.usuario.id }).sort('-createdAt').populate('clienteId', 'nombre')
    res.json(txs)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/cliente/:clienteId', auth, async (req, res) => {
  try {
    const txs = await CuentaCorriente.find({ clienteId: req.params.clienteId, usuario: req.usuario.id }).sort('-createdAt')
    res.json(txs)
  } catch (e) { res.status(500).json({ message: e.message }) }
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
      usuario: req.usuario.id,
    })
    res.status(201).json(tx)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const tx = await CuentaCorriente.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' })
    res.json({ message: 'Transacción eliminada' })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = router
