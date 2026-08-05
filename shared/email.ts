/**
 * Envío de email vía Resend usando fetch puro (sin dependencias de Node),
 * para poder importarse tanto desde Cloudflare Pages Functions como desde
 * el cron-worker sin arrastrar 'web-push' (que sí necesita Node compat).
 */
export interface EmailEnv {
  RESEND_API_KEY: string
}

export async function sendEmail(
  env: EmailEnv,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Carlog <alertas@jcastillo.es>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    throw new Error(`Resend request failed (${res.status}): ${await res.text()}`)
  }
}
