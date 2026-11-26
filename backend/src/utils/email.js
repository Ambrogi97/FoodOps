// Los correos ya están en castellano: se marcan para que Gmail o el traductor del navegador
// no los "traduzcan" creyendo que están en inglés (pasaba: "Premium" → "de primera calidad",
// "Plan actual" → "plan real").
function sinTraduccion(html) {
  if (typeof html !== 'string') return html
  let out = html
  if (!/<html[^>]*\btranslate=/i.test(out)) out = out.replace(/<html\b([^>]*)>/i, '<html$1 translate="no">')
  if (!/name="google"\s+content="notranslate"/i.test(out)) {
    out = /<head[^>]*>/i.test(out)
      ? out.replace(/<head([^>]*)>/i, '<head$1><meta name="google" content="notranslate"><meta http-equiv="Content-Language" content="es">')
      : out
  }
  if (!/<body[^>]*class="[^"]*notranslate/i.test(out)) out = out.replace(/<body\b([^>]*)>/i, '<body$1 class="notranslate" translate="no">')
  return out
}

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
      htmlContent: sinTraduccion(html),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Brevo error: ${err}`)
  }
}

module.exports = { enviarEmail, sinTraduccion }
