const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const Gasto   = require('../models/Gasto')

router.get('/', auth, async (req, res) => {
  try {
    const gastos = await Gasto.find({ usuario: req.usuario.id }).sort('-createdAt')
    res.json(gastos)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { descripcion, monto, categoria, fecha, comentario, importe, proveedor, categoriaId, estadoPago, medioPago, fechaVencimiento } = req.body
    if (!fecha) return res.status(400).json({ message: 'La fecha es requerida' })
    const efectivo = importe ?? monto ?? 0
    const texto    = comentario || descripcion || ''
    const gasto = await Gasto.create({
      descripcion: texto, monto: efectivo, categoria: categoria || '',
      comentario: texto, importe: efectivo, proveedor: proveedor || '',
      categoriaId: categoriaId || null, estadoPago: estadoPago || 'pagado',
      medioPago: medioPago || '', fecha,
      fechaVencimiento: fechaVencimiento || null,
      usuario: req.usuario.id,
    })
    res.status(201).json(gasto)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { descripcion, monto, categoria, fecha, comentario, importe, proveedor, categoriaId, estadoPago, medioPago, fechaVencimiento } = req.body
    const efectivo = importe ?? monto ?? 0
    const texto    = comentario || descripcion || ''
    const gasto = await Gasto.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario.id },
      {
        descripcion: texto, monto: efectivo, categoria: categoria || '',
        comentario: texto, importe: efectivo, proveedor: proveedor || '',
        categoriaId: categoriaId || null, estadoPago: estadoPago || 'pagado',
        medioPago: medioPago || '', fecha,
        fechaVencimiento: fechaVencimiento || null,
      },
      { new: true }
    )
    if (!gasto) return res.status(404).json({ message: 'No encontrado' })
    res.json(gasto)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await Gasto.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
