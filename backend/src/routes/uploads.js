const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const router   = express.Router()
const auth     = require('../middleware/auth')
const { S3Client, PutObjectCommand, CreateBucketCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client({
  endpoint:   process.env.S3_ENDPOINT,
  region:     'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

const BUCKET = process.env.S3_BUCKET || 'foodops'

s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
  .catch(() => {})

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
    const ext = path.extname(req.file.originalname).toLowerCase()
    const key = `productos/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        req.file.buffer,
      ContentType: req.file.mimetype,
    }))

    const url = `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`
    res.json({ url })
  } catch (e) {
    console.error('Error subiendo a S3:', e.message)
    res.status(500).json({ message: 'Error al subir imagen' })
  }
})

module.exports = router
