const express                  = require('express')
const router                   = express.Router()
const auth                     = require('../middleware/auth')
const CuentaCorrienteProveedor = require('../models/CuentaCorrienteProveedor')

router.get('/', auth, async (req, res) => {
  try {
    const txs = await CuentaCorrienteProveedor
      .find({ usuario: req.usuario.id })
      .sort('-createdAt')
      .populate('proveedorId', 'nombre')
    res.json(txs)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/proveedor/:proveedorId', auth, async (req, res) => {
  try {
    const txs = await CuentaCorrienteProveedor
      .find({ proveedorId: req.params.proveedorId, usuario: req.usuario.id })
      .sort('-createdAt')
    res.json(txs)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { proveedorId, tipo, monto, medioPago, fechaPago, comentario } = req.body
    if (!proveedorId || !monto) return res.status(400).json({ message: 'Faltan campos requeridos' })
    const tx = await CuentaCorrienteProveedor.create({
      proveedorId,
      tipo:       tipo       || 'cargo',
      monto:      Number(monto),
      medioPago:  medioPago  || '',
      fechaPago:  fechaPago  || null,
      comentario: comentario || '',
      usuario: req.usuario.id,
    })
    res.status(201).json(tx)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const tx = await CuentaCorrienteProveedor.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' })
    res.json({ message: 'Transacción eliminada' })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = router
