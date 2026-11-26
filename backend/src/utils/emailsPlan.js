// Correos sobre el plan: fin de la prueba gratuita / plan vencido, y cambio de plan.
const User = require('../models/User')
const { enviarEmail } = require('./email')
const { escapeHtml } = require('./security')

const NOMBRE_PLAN = { gratuito: 'Prueba gratuita', basico: 'Básico', profesional: 'Profesional', premium: 'Premium' }
const PRECIOS = { basico: 20000, premium: 35000 }

const frontend = () => process.env.FRONTEND_URL || 'http://localhost:5173'
const pesos = n => '$' + Number(n).toLocaleString('es-AR')
const fecha = d => new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })

// Mismo diseño que los demás correos de FoodOps (bienvenida, recuperar contraseña)
function plantilla({ titulo, cuerpo, boton, urlBoton }) {
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
            <br><span style="font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;">SOFTWARE GASTRONÓMICO</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px 32px;">
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#1a1a1a;text-align:center;line-height:1.3;">${titulo}</h1>
            ${cuerpo}
            ${boton ? `<div style="text-align:center;margin-top:28px;">
              <a href="${urlBoton}" style="display:inline-block;background:#e85d2b;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.5px;">${boton}</a>
            </div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.6;">
              ¿Tenés dudas sobre los planes? Escribinos a
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

const parrafo = html => `<p style="margin:0 0 14px;font-size:15px;color:#444;line-height:1.6;text-align:center;">${html}</p>`

const tarjetaPlan = (nombre, precio, detalle, destacado) => `
  <td width="50%" valign="top" style="padding:6px;">
    <div style="border:${destacado ? '2px solid #e85d2b' : '1px solid #e5e5e5'};border-radius:10px;padding:18px 14px;text-align:center;">
      <div style="font-size:16px;font-weight:800;color:#1a1a1a;">${nombre}</div>
      <div style="font-size:20px;font-weight:800;color:#e85d2b;margin:6px 0;">${precio}<span style="font-size:12px;color:#888;font-weight:400;">/mes</span></div>
      <div style="font-size:12px;color:#666;line-height:1.5;">${detalle}</div>
    </div>
  </td>`

const tablaPlanes = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr>
    ${tarjetaPlan('Básico', pesos(PRECIOS.basico), 'Restaurante y mesas, productos, carta online y monitor de cocina', false)}
    ${tarjetaPlan('Premium ⭐', pesos(PRECIOS.premium), 'Todo lo del Básico + Asistente con IA, ventas, finanzas, stock y reportes', true)}
  </tr></table>`

// ── Fin de la prueba gratuita / plan vencido ────────────────────────────────

function correoVencimiento(user) {
  const nombre = escapeHtml(user.nombre), resto = escapeHtml(user.restaurante)
  const url = `${frontend()}/login`
  if (user.plan === 'gratuito') {
    return {
      subject: 'Terminó tu prueba gratuita de FoodOps',
      html: plantilla({
        titulo: 'Terminó tu prueba gratuita',
        cuerpo:
          parrafo(`Hola <strong>${nombre}</strong>, se cumplieron los 7 días de prueba de <strong>${resto}</strong>. Esperamos que FoodOps te haya ayudado a ordenar el día a día del local.`) +
          parrafo('<strong>Tus datos siguen guardados</strong>: productos, mesas, ventas y clientes. Elegí un plan y seguís exactamente donde lo dejaste.') +
          tablaPlanes() +
          `<p style="margin:14px 0 0;font-size:13px;color:#888;text-align:center;">Pagás con Mercado Pago y el plan se activa en el momento.</p>`,
        boton: 'Elegir mi plan', urlBoton: url,
      }),
    }
  }
  const plan = NOMBRE_PLAN[user.plan] || user.plan
  return {
    subject: `Tu plan ${plan} de FoodOps venció`,
    html: plantilla({
      titulo: `Tu plan ${escapeHtml(plan)} venció`,
      cuerpo:
        parrafo(`Hola <strong>${nombre}</strong>, el plan <strong>${escapeHtml(plan)}</strong> de <strong>${resto}</strong> venció el ${fecha(user.trialEndsAt)}.`) +
        parrafo('<strong>Tus datos siguen guardados.</strong> Renová el plan para que vos y tu equipo puedan seguir usando el panel.') +
        tablaPlanes(),
      boton: 'Renovar mi plan', urlBoton: url,
    }),
  }
}

// Busca dueños cuyo plan venció hace poco y les manda el aviso una sola vez por vencimiento.
// Solo los vencidos en los últimos 3 días: así al poner esto en marcha no se les escribe a
// cuentas que vencieron hace meses.
async function revisarVencimientos(ahora = new Date()) {
  const desde = new Date(ahora.getTime() - 3 * 24 * 60 * 60 * 1000)
  const candidatos = await User.find({
    cuentaPadreId: null,
    emailVerificado: { $ne: false },
    trialEndsAt: { $lte: ahora, $gte: desde },
    $expr: { $ne: ['$avisoVencimientoDe', '$trialEndsAt'] },
  }).select('nombre email restaurante plan trialEndsAt').lean()

  let enviados = 0
  for (const u of candidatos) {
    // Se marca primero (y solo si nadie lo marcó antes): dos revisiones a la vez no duplican el correo
    const marca = await User.updateOne(
      { _id: u._id, trialEndsAt: u.trialEndsAt, avisoVencimientoDe: { $ne: u.trialEndsAt } },
      { $set: { avisoVencimientoDe: u.trialEndsAt } },
    )
    if (!marca.modifiedCount) continue
    try {
      await enviarEmail({ to: u.email, ...correoVencimiento(u) })
      enviados++
    } catch (e) {
      // Se desmarca para reintentarlo en la próxima revisión
      await User.updateOne({ _id: u._id }, { $set: { avisoVencimientoDe: null } }).catch(() => {})
      console.error('[vencimientos] no se pudo avisar a', u._id, e.message)
    }
  }
  if (enviados) console.log(`[vencimientos] avisos enviados: ${enviados}`)
  return enviados
}

// ── Cambio de plan ───────────────────────────────────────────────────────────

// origen: 'pago' (Mercado Pago) o 'admin' (cambio manual desde el panel)
function correoCambioPlan({ user, planAnterior, plan, vence, monto, origen }) {
  const nombre = escapeHtml(user.nombre), resto = escapeHtml(user.restaurante)
  const nuevo = escapeHtml(NOMBRE_PLAN[plan] || plan)
  const renovacion = origen === 'pago' && planAnterior === plan
  const titulo = renovacion ? `Renovaste tu plan ${nuevo}` : `Tu plan ahora es ${nuevo}`
  const filas = [
    ['Restaurante', resto],
    ...(planAnterior && planAnterior !== plan ? [['Plan anterior', escapeHtml(NOMBRE_PLAN[planAnterior] || planAnterior)]] : []),
    ['Plan actual', `<strong>${nuevo}</strong>`],
    ...(monto ? [['Pagaste', pesos(monto)]] : []),
    ['Vigente hasta', vence ? fecha(vence) : 'sin vencimiento'],
  ]
  const tabla = `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:#f8f8f8;border-radius:8px;">
    ${filas.map(([k, v]) => `<tr><td style="padding:10px 16px;font-size:14px;color:#888;">${k}</td><td style="padding:10px 16px;font-size:14px;color:#222;text-align:right;">${v}</td></tr>`).join('')}
  </table>`
  const intro = origen === 'pago'
    ? (renovacion ? `Hola <strong>${nombre}</strong>, recibimos tu pago. ¡Gracias por seguir con FoodOps!`
                  : `Hola <strong>${nombre}</strong>, recibimos tu pago y el cambio ya está activo.`)
    : `Hola <strong>${nombre}</strong>, actualizamos el plan de tu cuenta.`
  const extra = origen === 'pago' && planAnterior && planAnterior !== 'gratuito'
    ? `<p style="margin:14px 0 0;font-size:13px;color:#888;text-align:center;">Si te quedaban días del plan anterior, ya están sumados al vencimiento.</p>` : ''
  const asistente = plan === 'premium' && planAnterior !== 'premium'
    ? parrafo('Ya tenés disponible el <strong>Asistente con IA</strong>, ventas, finanzas y stock.') : ''
  return {
    subject: `${renovacion ? 'Renovaste' : 'Cambiaste'} tu plan de FoodOps: ${NOMBRE_PLAN[plan] || plan}`,
    html: plantilla({ titulo, cuerpo: parrafo(intro) + tabla + asistente + extra, boton: 'Ir al panel', urlBoton: `${frontend()}/login` }),
  }
}

// No bloquea: si el correo falla, el cambio de plan ya quedó hecho igual
function avisarCambioPlan(datos) {
  if (!datos?.user?.email) return
  enviarEmail({ to: datos.user.email, ...correoCambioPlan(datos) })
    .catch(e => console.error('[plan] no se pudo enviar el aviso de cambio:', e.message))
}

module.exports = { revisarVencimientos, avisarCambioPlan, correoVencimiento, correoCambioPlan }
