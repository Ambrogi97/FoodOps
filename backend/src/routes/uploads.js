const express = require('express')
const multer  = require('multer')
const router  = express.Router()
const auth    = require('../middleware/auth')
const { uploadBuffer } = require('../utils/cloudinary')

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'))
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.post('/producto', auth, upload.single('imagen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se recibió imagen' })
  try {
    const url = await uploadBuffer(req.file.buffer, 'productos')
    res.json({ url })
  } catch (e) {
    res.status(500).json({ message: 'Error al subir imagen' })
  }
})

module.exports = router
