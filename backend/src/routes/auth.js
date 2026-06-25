const express      = require('express')
const bcrypt       = require('bcryptjs')
const crypto       = require('crypto')
const nodemailer   = require('nodemailer')
const { register, login } = require('../controllers/authController')
const auth         = require('../middleware/auth')
const User         = require('../models/User')

const router = express.Router()

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// POST /auth/recuperar — solicita reseteo de contraseña
router.post('/recuperar', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'El email es obligatorio' })

    const user = await User.findOne({ email: email.toLowerCase() })
    // Siempre responder OK para no revelar si el email existe
    if (!user) return res.json({ message: 'Si el email existe, recibirás un correo.' })

    const token   = crypto.randomBytes(32).toString('hex')
    const expiry  = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    user.resetToken       = token
    user.resetTokenExpiry = expiry
    await user.save({ validateBeforeSave: false })

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`

    await transporter.sendMail({
      from:    `"FoodOps" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: 'Recuperar contraseña — FoodOps',
      html: `
        <p>Hola <strong>${user.nombre}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p><a href="${resetUrl}" style="background:#e85d2b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Restablecer contraseña</a></p>
        <p>Este enlace expira en 1 hora. Si no lo solicitaste, ignorá este correo.</p>
      `,
    })

    res.json({ message: 'Si el email existe, recibirás un correo.' })
  } catch (e) {
    console.error('Error al enviar email de recuperación:', e)
    res.status(500).json({ message: 'Error al enviar el correo. Intentá más tarde.' })
  }
})

// POST /auth/reset — restablece la contraseña con el token
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ message: 'Datos incompletos' })
    if (password.length < 6)  return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })

    const user = await User.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: new Date() },
    })
    if (!user) return res.status(400).json({ message: 'El enlace es inválido o ya expiró' })

    user.password         = password
    user.resetToken       = null
    user.resetTokenExpiry = null
    await user.save()

    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al restablecer la contraseña' })
  }
})

router.post('/register', register)
router.post('/login', login)

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.usuario.id, '-password')
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Error al obtener perfil' })
  }
})

router.put('/me', auth, async (req, res) => {
  try {
    const { nombre, restaurante, password, newPassword } = req.body
    const user = await User.findById(req.usuario.id)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    if (nombre)      user.nombre      = nombre
    if (restaurante) user.restaurante = restaurante

    if (newPassword) {
      if (!password) return res.status(400).json({ message: 'Ingresá la contraseña actual' })
      const ok = await user.comparePassword(password)
      if (!ok) return res.status(400).json({ message: 'Contraseña actual incorrecta' })
      user.password = newPassword
    }

    await user.save()
    const { password: _, ...data } = user.toObject()
    res.json(data)
  } catch {
    res.status(500).json({ message: 'Error al actualizar perfil' })
  }
})

module.exports = router
