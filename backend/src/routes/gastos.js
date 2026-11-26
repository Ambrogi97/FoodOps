const express = require('express')
const router  = express.Router()
const { responderError } = require('../utils/security')
const auth    = require('../middleware/auth')
const { referenciaAjena } = require('../utils/pertenencia')
const Gasto   = require('../models/Gasto')
const CategoriaGasto = require('../models/CategoriaGasto')

router.get('/', auth, async (req, res) => {
  try {
    const gastos = await Gasto.find({ usuario: req.propietarioId }).sort('-createdAt')
    res.json(gastos)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { descripcion, monto, categoria, fecha, comentario, importe, proveedor, categoriaId, estadoPago, medioPago, fechaVencimiento } = req.body
    const ajena = await referenciaAjena(req.propietarioId, [{ modelo: CategoriaGasto, ids: categoriaId, nombre: 'La categoría' }])
    if (ajena) return res.status(400).json({ message: ajena })
    if (!fecha) return res.status(400).json({ message: 'La fecha es requerida' })
    const efectivo = importe ?? monto ?? 0
    const texto    = comentario || descripcion || ''
    const gasto = await Gasto.create({
      descripcion: texto, monto: efectivo, categoria: categoria || '',
      comentario: texto, importe: efectivo, proveedor: proveedor || '',
      categoriaId: categoriaId || null, estadoPago: estadoPago || 'pagado',
      medioPago: medioPago || '', fecha,
      fechaVencimiento: fechaVencimiento || null,
      usuario: req.propietarioId,
    })
    res.status(201).json(gasto)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { descripcion, monto, categoria, fecha, comentario, importe, proveedor, categoriaId, estadoPago, medioPago, fechaVencimiento } = req.body
    const ajena = await referenciaAjena(req.propietarioId, [{ modelo: CategoriaGasto, ids: categoriaId, nombre: 'La categoría' }])
    if (ajena) return res.status(400).json({ message: ajena })
    const efectivo = importe ?? monto ?? 0
    const texto    = comentario || descripcion || ''
    const gasto = await Gasto.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      {
        descripcion: texto, monto: efectivo, categoria: categoria || '',
        comentario: texto, importe: efectivo, proveedor: proveedor || '',
        categoriaId: categoriaId || null, estadoPago: estadoPago || 'pagado',
        medioPago: medioPago || '', fecha,
        fechaVencimiento: fechaVencimiento || null,
      },
      { returnDocument: 'after' }
    )
    if (!gasto) return res.status(404).json({ message: 'No encontrado' })
    res.json(gasto)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const borrado = await Gasto.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    if (!borrado) return res.status(404).json({ message: 'No encontrado' })
    res.json({ ok: true })
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
