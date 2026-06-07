const express = require('express')
const multer  = require('multer')
const path    = require('path')
const router  = express.Router()
const auth    = require('../middleware/auth')
const AWS     = require('aws-sdk')

const s3 = new AWS.S3({
  endpoint:         new AWS.Endpoint(process.env.S3_ENDPOINT),
  accessKeyId:      process.env.S3_ACCESS_KEY,
  secretAccessKey:  process.env.S3_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
})

const BUCKET = process.env.S3_BUCKET || 'foodops'

s3.createBucket({ Bucket: BUCKET }, () => {})

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'))
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.post('/producto', auth, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se recibió imagen' })

  const ext = path.extname(req.file.originalname).toLowerCase()
  const key = `productos/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  s3.upload({
    Bucket:      BUCKET,
    Key:         key,
    Body:        req.file.buffer,
    ContentType: req.file.mimetype,
  }, (err) => {
    if (err) {
      console.error('S3 upload error:', err.message)
      return res.status(500).json({ message: 'Error al subir imagen' })
    }
    const url = `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`
    res.json({ url })
  })
})

module.exports = router
