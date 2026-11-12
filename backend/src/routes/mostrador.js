const express = require('express')
const router  = express.Router()
const { responderError } = require('../utils/security')

// Solo se aceptan estos campos desde el cliente (nunca usuario ni numero)
const CAMPOS = ["etiqueta", "items", "total", "estado", "cliente", "metodoPago"]
const pick = (body) => Object.fromEntries(CAMPOS.filter(k => body?.[k] !== undefined).map(k => [k, body[k]]))
const auth    = require('../middleware/auth')
const PedidoMostrador = require('../models/PedidoMostrador')

router.get('/', auth, async (req, res) => {
  try {
    const enCurso  = await PedidoMostrador.find({ usuario: req.propietarioId, estado: 'en_curso' }).sort('createdAt')
    const cerradas = await PedidoMostrador.find({ usuario: req.propietarioId, estado: 'cerrada' }).sort('-createdAt').limit(5)
    res.json({ enCurso, cerradas })
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const count  = await PedidoMostrador.countDocuments({ usuario: req.propietarioId })
    const pedido = await PedidoMostrador.create({ ...pick(req.body), numero: count + 1, usuario: req.propietarioId })
    res.status(201).json(pedido)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const pedido = await PedidoMostrador.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      { $set: pick(req.body) },
      { new: true, runValidators: true }
    )
    if (!pedido) return res.status(404).json({ message: 'No encontrado' })
    res.json(pedido)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await PedidoMostrador.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    res.json({ ok: true })
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
