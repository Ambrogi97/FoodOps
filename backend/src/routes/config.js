const express    = require('express')
const router     = express.Router()
const multer     = require('multer')
const auth       = require('../middleware/auth')
const ConfigTienda = require('../models/ConfigTienda')
const { uploadBuffer, deleteByUrl } = require('../utils/cloudinary')

const DIAS_DEFAULT = ['dom','lun','mar','mie','jue','vie','sab'].map(dia => ({
  dia,
  habilitado: true,
  franjas: [{ desde: '00:00', hasta: '23:59' }],
}))

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ── Config tienda ─────────────────────────────────────────────────────────────

router.get('/tienda', auth, async (req, res) => {
  try {
    let config = await ConfigTienda.findOne({ usuario: req.propietarioId })
    if (!config) {
      config = await ConfigTienda.create({ usuario: req.propietarioId, habilitado: false, horarios: DIAS_DEFAULT })
    }
    res.json(config)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/tienda', auth, async (req, res) => {
  try {
    const { habilitado, delivery, retiro, colorFondo } = req.body
    const update = {}
    if (habilitado  !== undefined) update.habilitado  = habilitado
    if (delivery    !== undefined) update.delivery    = delivery
    if (retiro      !== undefined) update.retiro      = retiro
    if (colorFondo  !== undefined) update.colorFondo  = colorFondo
    const config = await ConfigTienda.findOneAndUpdate(
      { usuario: req.propietarioId },
      { $set: update },
      { new: true, upsert: true }
    )
    res.json(config)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ── Logo ──────────────────────────────────────────────────────────────────────

router.post('/tienda/logo', auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió archivo' })
    const config = await ConfigTienda.findOne({ usuario: req.propietarioId })
    if (config?.logo) await deleteByUrl(config.logo)
    const url = await uploadBuffer(req.file.buffer, 'logo')
    const updated = await ConfigTienda.findOneAndUpdate(
      { usuario: req.propietarioId },
      { $set: { logo: url } },
      { new: true, upsert: true }
    )
    res.json({ url: updated.logo })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/tienda/logo', auth, async (req, res) => {
  try {
    const config = await ConfigTienda.findOne({ usuario: req.propietarioId })
    if (config?.logo) await deleteByUrl(config.logo)
    await ConfigTienda.findOneAndUpdate({ usuario: req.propietarioId }, { $set: { logo: null } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ── Portada ───────────────────────────────────────────────────────────────────

router.post('/tienda/portada', auth, upload.single('portada'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió archivo' })
    const config = await ConfigTienda.findOne({ usuario: req.propietarioId })
    if (config?.portada) await deleteByUrl(config.portada)
    const url = await uploadBuffer(req.file.buffer, 'portada')
    const updated = await ConfigTienda.findOneAndUpdate(
      { usuario: req.propietarioId },
      { $set: { portada: url } },
      { new: true, upsert: true }
    )
    res.json({ url: updated.portada })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/tienda/portada', auth, async (req, res) => {
  try {
    const config = await ConfigTienda.findOne({ usuario: req.propietarioId })
    if (config?.portada) await deleteByUrl(config.portada)
    await ConfigTienda.findOneAndUpdate({ usuario: req.propietarioId }, { $set: { portada: null } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ── Formas de pago ───────────────────────────────────────────────────────────

router.put('/tienda/formas-pago', auth, async (req, res) => {
  try {
    const { formasPago } = req.body
    if (!Array.isArray(formasPago)) return res.status(400).json({ message: 'formasPago debe ser un array' })
    const config = await ConfigTienda.findOneAndUpdate(
      { usuario: req.propietarioId },
      { $set: { formasPago } },
      { new: true, upsert: true }
    )
    res.json(config.formasPago)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
