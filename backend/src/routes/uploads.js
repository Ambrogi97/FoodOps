const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const router   = express.Router()
const auth     = require('../middleware/auth')

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/productos'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'))
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.post('/producto', auth, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se recibió imagen' })
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const url  = `${base}/uploads/productos/${req.file.filename}`
  res.json({ url })
})

module.exports = router
