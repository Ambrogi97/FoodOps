const jwt        = require('jsonwebtoken')
const nodemailer  = require('nodemailer')
const User        = require('../models/User')

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function enviarEmailBienvenida(user) {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
  await transporter.sendMail({
    from:    `"FoodOps" <${process.env.SMTP_USER}>`,
    to:      user.email,
    subject: '¡Bienvenido a FoodOps!',
    html: `
<!DOCTYPE html>
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
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#e85d2b;text-align:center;line-height:1.2;">
              ¡Te damos la bienvenida<br>a FoodOps!
            </h1>

            <p style="margin:24px 0 8px;font-size:15px;color:#444;text-align:center;">
              Hola <strong>${user.nombre}</strong>, tu cuenta fue creada con éxito.<br>
              Iniciá sesión con tu email:
            </p>

            <div style="background:#f8f8f8;border-radius:8px;padding:14px 20px;text-align:center;margin:16px 0 24px;">
              <span style="font-size:16px;font-weight:700;color:#222;">${user.email}</span>
            </div>

            <p style="margin:0 0 24px;font-size:14px;color:#666;text-align:center;">
              Tu restaurante registrado es <strong>${user.restaurante}</strong>.<br>
              Plan activo: <strong>${user.plan}</strong>.
            </p>

            <div style="text-align:center;">
              <a href="${loginUrl}"
                style="display:inline-block;background:#e85d2b;color:#ffffff;font-size:15px;font-weight:700;
                       text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.5px;
                       text-transform:uppercase;">
                Ir al panel
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 48px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.6;">
              Si no creaste esta cuenta, ignorá este correo.<br>
              ¿Necesitás ayuda? Escribinos a
              <a href="mailto:soporte@foodops.app" style="color:#e85d2b;text-decoration:none;">soporte@foodops.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  })
}

const generateToken = (userId, role, cuentaPadreId = null) => {
  return jwt.sign({ id: userId, role, cuentaPadreId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const register = async (req, res) => {
  try {
    const { nombre, email, password, restaurante, plan } = req.body

    if (!nombre || !email || !password || !restaurante) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }

    const user = await User.create({ nombre, email, password, restaurante, plan, role: 'admin' })
    const token = generateToken(user._id, user.role, null)

    // Enviar email de bienvenida (no bloqueante — si falla no interrumpe el registro)
    enviarEmailBienvenida(user).catch(e => console.error('Email bienvenida error:', e))

    res.status(201).json({
      token,
      user: { id: user._id, nombre: user.nombre, email: user.email, restaurante: user.restaurante, plan: user.plan, role: user.role }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: error.message })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const token = generateToken(user._id, user.role, user.cuentaPadreId ?? null)

    res.json({
      token,
      user: { id: user._id, nombre: user.nombre, email: user.email, restaurante: user.restaurante, plan: user.plan, role: user.role }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
}

module.exports = { register, login }
