const express    = require('express')
const router     = express.Router()
const multer     = require('multer')
const path       = require('path')
const fs         = require('fs')
const auth       = require('../middleware/auth')
const ConfigTienda = require('../models/ConfigTienda')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const DIAS_DEFAULT = ['dom','lun','mar','mie','jue','vie','sab'].map(dia => ({
  dia,
  habilitado: true,
  franjas: [{ desde: '00:00', hasta: '23:59' }],
}))

const makeStorage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/tienda', subfolder)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const uploadLogo    = multer({ storage: makeStorage('logo') })
const uploadPortada = multer({ storage: makeStorage('portada') })

// ── Horarios ─────────────────────────────────────────────────────────────────

router.get('/tienda', auth, async (req, res) => {
  try {
    let config = await ConfigTienda.findOne({ usuario: req.usuario.id })
    if (!config) {
      config = await ConfigTienda.create({ usuario: req.usuario.id, habilitado: false, horarios: DIAS_DEFAULT })
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
      { usuario: req.usuario.id },
      { $set: update },
      { new: true, upsert: true }
    )
    res.json(config)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ── Logo ──────────────────────────────────────────────────────────────────────

router.post('/tienda/logo', auth, uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió archivo' })
    const url = `${BASE_URL}/uploads/tienda/logo/${req.file.filename}`
    const config = await ConfigTienda.findOneAndUpdate(
      { usuario: req.usuario.id },
      { logo: url },
      { new: true, upsert: true }
    )
    res.json({ url: config.logo })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/tienda/logo', auth, async (req, res) => {
  try {
    await ConfigTienda.findOneAndUpdate({ usuario: req.usuario.id }, { logo: null })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ── Portada ───────────────────────────────────────────────────────────────────

router.post('/tienda/portada', auth, uploadPortada.single('portada'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió archivo' })
    const url = `${BASE_URL}/uploads/tienda/portada/${req.file.filename}`
    const config = await ConfigTienda.findOneAndUpdate(
      { usuario: req.usuario.id },
      { portada: url },
      { new: true, upsert: true }
    )
    res.json({ url: config.portada })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/tienda/portada', auth, async (req, res) => {
  try {
    await ConfigTienda.findOneAndUpdate({ usuario: req.usuario.id }, { portada: null })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
