const jwt  = require('jsonwebtoken')
const User = require('../models/User')
const { enviarEmail } = require('../utils/email')
const { escapeHtml, validarPassword } = require('../utils/security')
const { enviarCodigo, puedeReenviar, comprobarCodigo, esEmailDescartable, SEGUNDOS_REENVIO } = require('../utils/verificacion')

async function enviarEmailBienvenida(user) {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
  await enviarEmail({
    to:      user.email,
    subject: '¡Bienvenido a FoodOps!',
    html: /* html */`
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
              Hola <strong>${escapeHtml(user.nombre)}</strong>, tu cuenta fue creada con éxito.<br>
              Iniciá sesión con tu email:
            </p>

            <div style="background:#f8f8f8;border-radius:8px;padding:14px 20px;text-align:center;margin:16px 0 24px;">
              <span style="font-size:16px;font-weight:700;color:#222;">${escapeHtml(user.email)}</span>
            </div>

            <p style="margin:0 0 24px;font-size:14px;color:#666;text-align:center;">
              Tu restaurante registrado es <strong>${escapeHtml(user.restaurante)}</strong>.<br>
              Tenés <strong>7 días de prueba gratuita</strong> con acceso completo a todas las funciones <strong>Premium</strong>.
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

const generateToken = (userId, role, cuentaPadreId = null, plan = 'basico') => {
  return jwt.sign({ id: userId, role, cuentaPadreId, plan }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const register = async (req, res) => {
  try {
    const nombre      = typeof req.body.nombre      === 'string' ? req.body.nombre.trim()      : null
    const email       = typeof req.body.email       === 'string' ? req.body.email.trim()       : null
    const password    = typeof req.body.password    === 'string' ? req.body.password           : null
    const restaurante = typeof req.body.restaurante === 'string' ? req.body.restaurante.trim() : null

    if (!nombre || !email || !password || !restaurante) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' })
    }
    const errPass = validarPassword(password)
    if (errPass) return res.status(400).json({ message: errPass })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'El email no es válido' })
    }
    if (esEmailDescartable(email)) {
      return res.status(400).json({ message: 'No se aceptan emails temporales o descartables. Usá tu email real.' })
    }
    if (nombre.length > 80 || restaurante.length > 80) {
      return res.status(400).json({ message: 'El nombre y el restaurante pueden tener hasta 80 caracteres' })
    }

    let user = await User.findOne({ email: email.toLowerCase() })
    if (user && user.emailVerificado !== false) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }

    if (user) {
      // Registro previo sin verificar: se reemplazan los datos (quien verifique el email se queda con la cuenta)
      if (!puedeReenviar(user)) {
        return res.status(429).json({ message: 'Ya te enviamos un código hace un momento. Esperá un minuto e intentá de nuevo.' })
      }
      Object.assign(user, { nombre, password, restaurante })
      await user.save()
    } else {
      user = await User.create({ nombre, email, password, restaurante, plan: 'gratuito', role: 'admin', emailVerificado: false })
    }

    try {
      await enviarCodigo(user)
    } catch (e) {
      console.error('Error enviando código de verificación:', e)
      return res.status(502).json({ message: 'No pudimos enviarte el email de verificación. Intentá de nuevo en unos minutos.' })
    }

    // Sin token: la cuenta se activa recién al confirmar el código
    res.status(201).json({ pendienteVerificacion: true, email: user.email })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Error al crear la cuenta. Intentá de nuevo.' })
  }
}

// Datos de sesión que recibe el frontend
async function respuestaSesion(user) {
  let plan = user.plan
  let trialEndsAt = user.trialEndsAt ?? null
  if (user.cuentaPadreId) {
    const owner = await User.findById(user.cuentaPadreId, 'plan trialEndsAt')
    plan        = owner?.plan        ?? 'basico'
    trialEndsAt = owner?.trialEndsAt ?? null
  }
  return {
    token: generateToken(user._id, user.role, user.cuentaPadreId ?? null, plan),
    user: { id: user._id, nombre: user.nombre, email: user.email, restaurante: user.restaurante, plan, role: user.role, trialEndsAt, superadmin: !!user.superadmin, cuentaPadreId: user.cuentaPadreId ?? null },
  }
}

// POST /auth/verificar — confirma el código y activa la cuenta (inicia sesión)
const verificarEmail = async (req, res) => {
  try {
    const email  = typeof req.body.email  === 'string' ? req.body.email.trim().toLowerCase() : ''
    const codigo = typeof req.body.codigo === 'string' ? req.body.codigo.replace(/\D/g, '') : ''
    if (!email || codigo.length !== 6) return res.status(400).json({ message: 'Ingresá el código de 6 dígitos' })

    const user = await User.findOne({ email })
    if (!user || user.emailVerificado !== false) {
      return res.status(400).json({ message: 'El código es incorrecto o venció' })
    }

    const resultado = await comprobarCodigo(user, codigo)
    if (resultado === 'vencido')   return res.status(400).json({ code: 'CODIGO_VENCIDO', message: 'El código venció. Pedí uno nuevo.' })
    if (resultado === 'bloqueado') return res.status(400).json({ code: 'CODIGO_BLOQUEADO', message: 'Demasiados intentos con este código. Pedí uno nuevo.' })
    if (resultado === 'invalido')  return res.status(400).json({ message: 'El código es incorrecto' })

    user.emailVerificado    = true
    user.codigoVerificacion = null
    user.codigoExpira       = null
    user.codigoIntentos     = 0
    // La prueba gratis empieza al activar la cuenta
    user.trialEndsAt        = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await user.save({ validateBeforeSave: false })

    enviarEmailBienvenida(user).catch(e => console.error('Email bienvenida error:', e))
    res.json(await respuestaSesion(user))
  } catch (error) {
    console.error('Verificar email error:', error)
    res.status(500).json({ message: 'Error al verificar el código' })
  }
}

// POST /auth/reenviar-codigo — respuesta genérica para no revelar qué emails existen
const reenviarCodigo = async (req, res) => {
  const generico = { message: 'Si hay una cuenta pendiente con ese email, te enviamos un código nuevo.' }
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!email) return res.status(400).json({ message: 'El email es obligatorio' })

    const user = await User.findOne({ email })
    if (!user || user.emailVerificado !== false) return res.json(generico)
    if (!puedeReenviar(user)) {
      return res.status(429).json({ message: `Esperá ${SEGUNDOS_REENVIO} segundos entre cada envío.` })
    }
    await enviarCodigo(user)
    res.json(generico)
  } catch (error) {
    console.error('Reenviar código error:', error)
    res.status(502).json({ message: 'No pudimos enviar el email. Intentá de nuevo en unos minutos.' })
  }
}

const login = async (req, res) => {
  try {
    const email    = typeof req.body.email    === 'string' ? req.body.email.trim()    : null
    const password = typeof req.body.password === 'string' ? req.body.password        : null

    if (!email || !password) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    // Cuenta registrada pero sin confirmar el email: no entra (se le reenvía el código si corresponde)
    if (user.emailVerificado === false) {
      if (puedeReenviar(user)) enviarCodigo(user).catch(e => console.error('Reenvío de código en login:', e))
      return res.status(403).json({
        code:    'EMAIL_NO_VERIFICADO',
        email:   user.email,
        message: 'Tenés que confirmar tu email antes de entrar. Te enviamos un código.',
      })
    }

    // Sub-usuarios no tienen plan propio — heredan el del dueño
    res.json(await respuestaSesion(user))
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
}

module.exports = { register, login, verificarEmail, reenviarCodigo, generateToken }
