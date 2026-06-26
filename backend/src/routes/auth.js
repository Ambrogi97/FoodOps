const express      = require('express')
const bcrypt       = require('bcryptjs')
const crypto       = require('crypto')
const rateLimit    = require('express-rate-limit')
const { register, login } = require('../controllers/authController')
const auth         = require('../middleware/auth')
const User         = require('../models/User')

const router = express.Router()

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Esperá 15 minutos e intentá de nuevo.' },
})

async function enviarEmail({ to, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'api-key':      process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender:      { name: 'FoodOps', email: process.env.SMTP_USER },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Brevo error: ${err}`)
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// POST /auth/recuperar — solicita reseteo de contraseña
router.post('/recuperar', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'El email es obligatorio' })

    const user = await User.findOne({ email: email.toLowerCase() })
    // Siempre responder OK para no revelar si el email existe
    if (!user) return res.json({ message: 'Si el email existe, recibirás un correo.' })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const expiry   = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    user.resetToken       = hashToken(rawToken)
    user.resetTokenExpiry = expiry
    await user.save({ validateBeforeSave: false })

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`

    await enviarEmail({
      to:      user.email,
      subject: 'Recuperar contraseña — FoodOps',
      html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header naranja -->
        <tr>
          <td style="background:#e85d2b;padding:28px 0;text-align:center;">
            <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Food<span style="font-weight:400">Ops</span></span>
            <br><span style="font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;">SOFTWARE GASTRONÓMICO</span>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td style="padding:40px 48px 32px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;background:#fff5f0;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">🔑</div>
            </div>

            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a1a1a;text-align:center;">
              Recuperá tu contraseña
            </h1>

            <p style="margin:16px 0 8px;font-size:15px;color:#444;text-align:center;">
              Hola <strong>${user.nombre}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.
            </p>

            <p style="margin:0 0 28px;font-size:13px;color:#888;text-align:center;">
              Si no fuiste vos, podés ignorar este correo con total seguridad.
            </p>

            <div style="text-align:center;">
              <a href="${resetUrl}"
                style="display:inline-block;background:#e85d2b;color:#ffffff;font-size:15px;font-weight:700;
                       text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.5px;">
                Restablecer contraseña
              </a>
            </div>

            <p style="margin:28px 0 0;font-size:12px;color:#aaa;text-align:center;">
              Este enlace expira en <strong>1 hora</strong>.<br>
              Si el botón no funciona, copiá y pegá este link en tu navegador:<br>
              <a href="${resetUrl}" style="color:#e85d2b;word-break:break-all;font-size:11px;">${resetUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 48px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.6;">
              ¿Necesitás ayuda? Escribinos a
              <a href="mailto:soporte@foodops.app" style="color:#e85d2b;text-decoration:none;">soporte@foodops.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    res.json({ message: 'Si el email existe, recibirás un correo.' })
  } catch (e) {
    console.error('Error al enviar email de recuperación:', e)
    res.status(500).json({ message: 'Error al enviar el correo. Intentá más tarde.' })
  }
})

// POST /auth/reset — restablece la contraseña con el token
router.post('/reset', resetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ message: 'Datos incompletos' })
    if (password.length < 6)  return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })

    const user = await User.findOne({
      resetToken:       hashToken(token),
      resetTokenExpiry: { $gt: new Date() },
    })
    if (!user) return res.status(400).json({ message: 'El enlace es inválido o ya expiró' })

    user.password         = password
    user.resetToken       = null
    user.resetTokenExpiry = null
    await user.save({ validateBeforeSave: false })

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
    const user = await User.findById(req.usuario.id, '-password -resetToken -resetTokenExpiry')
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
    const { password: _, resetToken: __, resetTokenExpiry: ___, ...data } = user.toObject()
    res.json(data)
  } catch {
    res.status(500).json({ message: 'Error al actualizar perfil' })
  }
})

module.exports = router
