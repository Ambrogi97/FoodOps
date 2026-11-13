// Verificación de email al registrarse: código de 6 dígitos por email.
const crypto = require('crypto')
const { enviarEmail } = require('./email')
const { escapeHtml } = require('./security')

const MINUTOS_VALIDEZ   = 15   // el código vence a los 15 minutos
const SEGUNDOS_REENVIO  = 60   // espera mínima entre reenvíos
const MAX_INTENTOS      = 5    // intentos por código antes de pedir uno nuevo
const HORAS_SIN_VERIFICAR = 24 // las cuentas sin verificar se borran después de esto

const hashCodigo = (userId, codigo) =>
  crypto.createHash('sha256').update(`${userId}:${codigo}`).digest('hex')

// Dominios de emails descartables/temporales más usados por bots
const DOMINIOS_DESCARTABLES = new Set([
  'mailinator.com', 'mailinator.net', 'mailinator.org', 'guerrillamail.com', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamail.biz', 'guerrillamail.de', 'sharklasers.com', 'grr.la',
  'guerrillamailblock.com', 'pokemail.net', 'spam4.me', '10minutemail.com', '10minutemail.net',
  '10minutemail.co.uk', '10minemail.com', '20minutemail.com', 'tempmail.com', 'temp-mail.org',
  'temp-mail.io', 'tempmail.net', 'tempmailo.com', 'tempmail.dev', 'tempmail.plus', 'tmpmail.org',
  'tmpmail.net', 'tmails.net', 'throwawaymail.com', 'yopmail.com', 'yopmail.net', 'yopmail.fr',
  'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
  'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'getnada.com',
  'nada.email', 'dispostable.com', 'maildrop.cc', 'mailnesia.com', 'mailcatch.com', 'mintemail.com',
  'trashmail.com', 'trashmail.net', 'trashmail.de', 'trashmail.me', 'wegwerfmail.de', 'wegwerfmail.net',
  'emailondeck.com', 'fakeinbox.com', 'fakemail.net', 'mohmal.com', 'mytemp.email', 'spambox.us',
  'spamgourmet.com', 'mailpoof.com', 'burnermail.io', 'inboxkitten.com', 'emailfake.com',
  'email-fake.com', 'fakemailgenerator.com', 'armyspy.com', 'cuvox.de', 'dayrep.com', 'einrot.com',
  'fleckens.hu', 'gustr.com', 'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us',
  'mailnull.com', 'tempinbox.com', 'discard.email', 'discardmail.com', 'discardmail.de',
  'spamdecoy.net', 'mail-temp.com', 'tempr.email', 'harakirimail.com', 'linshiyouxiang.net',
  'byom.de', 'trbvm.com', 'emltmp.com', 'mailto.plus', 'fexpost.com', 'fexbox.org', 'rover.info',
  'mailbox.in.ua', 'chacuo.net', 'moakt.com', 'moakt.cc', 'tmail.ws', 'tempail.com', 'luxusmail.org',
  'mailforspam.com', 'incognitomail.org', 'anonbox.net', 'mvrht.com', 'zetmail.com', 'kurzepost.de',
])

function esEmailDescartable(email) {
  const dominio = String(email).split('@')[1]?.toLowerCase().trim()
  if (!dominio) return true
  // También subdominios (ej: algo.mailinator.com)
  return [...DOMINIOS_DESCARTABLES].some(d => dominio === d || dominio.endsWith('.' + d))
}

function emailCodigoHtml(nombre, codigo) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#e85d2b;padding:28px 0;text-align:center;">
            <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Food<span style="font-weight:400">Ops</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px 32px;text-align:center;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#1a1a1a;">Confirmá tu email</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#444;">
              Hola <strong>${escapeHtml(nombre)}</strong>, usá este código para activar tu cuenta de FoodOps:
            </p>
            <div style="display:inline-block;background:#fff5f0;border:2px dashed #e85d2b;border-radius:10px;padding:16px 28px;
                        font-size:34px;font-weight:800;letter-spacing:10px;color:#e85d2b;">${codigo}</div>
            <p style="margin:24px 0 0;font-size:13px;color:#888;">
              El código vence en ${MINUTOS_VALIDEZ} minutos.<br>
              Si no creaste una cuenta en FoodOps, ignorá este correo.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
              ¿Necesitás ayuda? Escribinos a
              <a href="mailto:soporte@foodops.app" style="color:#e85d2b;text-decoration:none;">soporte@foodops.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Genera un código nuevo, lo guarda (hasheado) y lo manda por email
async function enviarCodigo(user) {
  const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  user.codigoVerificacion = hashCodigo(user._id, codigo)
  user.codigoExpira       = new Date(Date.now() + MINUTOS_VALIDEZ * 60_000)
  user.codigoEnviadoAt    = new Date()
  user.codigoIntentos     = 0
  await user.save({ validateBeforeSave: false })
  await enviarEmail({
    to:      user.email,
    subject: `${codigo} es tu código de FoodOps`,
    html:    emailCodigoHtml(user.nombre, codigo),
  })
}

// ¿Pasó el tiempo mínimo desde el último envío?
function puedeReenviar(user) {
  return !user.codigoEnviadoAt || Date.now() - new Date(user.codigoEnviadoAt).getTime() >= SEGUNDOS_REENVIO * 1000
}

// Compara el código ingresado. Devuelve 'ok' | 'vencido' | 'invalido' | 'bloqueado'
async function comprobarCodigo(user, codigo) {
  if (!user.codigoVerificacion || !user.codigoExpira) return 'vencido'
  if (new Date(user.codigoExpira) < new Date())     return 'vencido'
  if ((user.codigoIntentos || 0) >= MAX_INTENTOS)    return 'bloqueado'

  const esperado = Buffer.from(user.codigoVerificacion, 'hex')
  const recibido = Buffer.from(hashCodigo(user._id, String(codigo).trim()), 'hex')
  if (esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido)) return 'ok'

  user.codigoIntentos = (user.codigoIntentos || 0) + 1
  await user.save({ validateBeforeSave: false })
  return user.codigoIntentos >= MAX_INTENTOS ? 'bloqueado' : 'invalido'
}

module.exports = {
  enviarCodigo, puedeReenviar, comprobarCodigo, esEmailDescartable,
  SEGUNDOS_REENVIO, HORAS_SIN_VERIFICAR,
}
