const express                  = require('express')
const router                   = express.Router()
const { responderError } = require('../utils/security')
const auth                     = require('../middleware/auth')
const { referenciaAjena } = require('../utils/pertenencia')
const Proveedor                = require('../models/Proveedor')
const CuentaCorrienteProveedor = require('../models/CuentaCorrienteProveedor')

router.get('/', auth, async (req, res) => {
  try {
    const txs = await CuentaCorrienteProveedor
      .find({ usuario: req.propietarioId })
      .sort('-createdAt')
      .populate({ path: 'proveedorId', select: 'nombre', match: { usuario: req.propietarioId } })
    res.json(txs)
  } catch (e) { return responderError(req, res, e) }
})

router.get('/proveedor/:proveedorId', auth, async (req, res) => {
  try {
    const txs = await CuentaCorrienteProveedor
      .find({ proveedorId: req.params.proveedorId, usuario: req.propietarioId })
      .sort('-createdAt')
    res.json(txs)
  } catch (e) { return responderError(req, res, e) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { proveedorId, tipo, monto, medioPago, fechaPago, comentario } = req.body
    if (!proveedorId || !monto) return res.status(400).json({ message: 'Faltan campos requeridos' })
    const ajena = await referenciaAjena(req.propietarioId, [{ modelo: Proveedor, ids: proveedorId, nombre: 'El proveedor' }])
    if (ajena) return res.status(400).json({ message: ajena })
    const tx = await CuentaCorrienteProveedor.create({
      proveedorId,
      tipo:       tipo       || 'cargo',
      monto:      Number(monto),
      medioPago:  medioPago  || '',
      fechaPago:  fechaPago  || null,
      comentario: comentario || '',
      usuario: req.propietarioId,
    })
    res.status(201).json(tx)
  } catch (e) { return responderError(req, res, e) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const tx = await CuentaCorrienteProveedor.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' })
    res.json({ message: 'Transacción eliminada' })
  } catch (e) { return responderError(req, res, e) }
})

module.exports = router
