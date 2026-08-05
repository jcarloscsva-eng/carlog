import { airtableCreate, type AirtableEnv } from '../../../shared/airtable'
import { TABLES, loginCodeToAirtable } from '../../../shared/airtable-mappers'
import { sendEmail, type EmailEnv } from '../../../shared/email'
import { json } from '../../../shared/http'

type Env = AirtableEnv &
  EmailEnv & {
    /** Lista de emails permitidos separados por coma. Si no se define, cualquiera puede pedir código. */
    ALLOWED_EMAILS?: string
  }

const CODE_TTL_SECONDS = 10 * 60

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(1))
  return String(100000 + (bytes[0] % 900000))
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => ({}))) as { email?: string }
  const email = body.email?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Email no válido' }, 400)
  }

  const allowed = env.ALLOWED_EMAILS?.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const isAllowed = !allowed || allowed.includes(email)

  // Siempre respondemos igual, permitido o no, para no revelar qué emails están en la lista.
  if (isAllowed) {
    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString()

    try {
      await airtableCreate(
        env,
        TABLES.LoginCodes,
        loginCodeToAirtable({ email, code, expiresAt, used: false, attempts: 0 }),
      )
    } catch (err) {
      console.error('Error creando LoginCode en Airtable', err)
      return json({ error: `Fallo guardando el código: ${(err as Error).message}` }, 500)
    }

    try {
      await sendEmail(
        env,
        email,
        'Tu código de acceso a Carlog',
        `<p>Tu código de acceso es:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>Caduca en 10 minutos.</p>`,
      )
    } catch (err) {
      console.error('Error enviando código de login', err)
      // TODO: una vez confirmado el envío en producción, volver a silenciar
      // este fallo (devolver siempre ok:true) para no filtrar qué emails
      // están en ALLOWED_EMAILS.
      return json({ error: `Fallo enviando el email: ${(err as Error).message}` }, 500)
    }
  }

  return json({ ok: true })
}
