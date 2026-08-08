import { airtableCreate, airtableFormulaString, airtableList, type AirtableEnv } from '../../../shared/airtable'
import { TABLES, loginCodeToAirtable } from '../../../shared/airtable-mappers'
import { sendEmail, type EmailEnv } from '../../../shared/email'
import { json } from '../../../shared/http'
import { estaInvitado } from '../../../shared/usuarios-permitidos'

type Env = AirtableEnv &
  EmailEnv & {
    /** Lista de emails permitidos separados por coma. Si no se define, cualquiera puede pedir código. */
    ALLOWED_EMAILS?: string
  }

const CODE_TTL_SECONDS = 10 * 60

const COOLDOWN_SECONDS = 60
const MAX_POR_HORA = 5

async function demasiadosIntentos(env: Env, email: string): Promise<string | null> {
  const emailEscapado = airtableFormulaString(email)

  const recientes = await airtableList<Record<string, unknown>>(
    env,
    TABLES.LoginCodes,
    `AND({Email} = '${emailEscapado}', IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -${COOLDOWN_SECONDS}, 'seconds')))`,
  )
  if (recientes.length > 0) {
    return 'Espera un momento antes de pedir otro código'
  }

  const ultimaHora = await airtableList<Record<string, unknown>>(
    env,
    TABLES.LoginCodes,
    `AND({Email} = '${emailEscapado}', IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -60, 'minutes')))`,
  )
  if (ultimaHora.length >= MAX_POR_HORA) {
    return 'Demasiados intentos, prueba más tarde'
  }

  return null
}

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(1))
  return String(100000 + (bytes[0] % 900000))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Tiempo mínimo de respuesta, igual esté o no el email en ALLOWED_EMAILS.
 * Sin esto, la rama "permitido" tarda notablemente más (consultas a
 * Airtable + envío de email) que la rama "no permitido", lo que permite
 * deducir por temporización qué direcciones están en la lista.
 */
const MIN_RESPONSE_MS = 500

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const inicio = Date.now()
  const body = (await request.json().catch(() => ({}))) as { email?: string }
  const email = body.email?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Email no válido' }, 400)
  }

  const allowed = env.ALLOWED_EMAILS?.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  // Además de ALLOWED_EMAILS (Cloudflare), se admite cualquier email dado
  // de alta en la tabla UsuariosPermitidos desde la pestaña Usuarios de
  // la app — así se pueden sumar accesos sin volver a tocar Cloudflare.
  const isAllowed = !allowed || allowed.includes(email) || (await estaInvitado(env, email))

  // Siempre respondemos igual, permitido o no, para no revelar qué emails están en la lista
  // (ni en el cuerpo de la respuesta ni, con el padding de abajo, en el tiempo que tarda).
  if (isAllowed) {
    const bloqueo = await demasiadosIntentos(env, email)
    if (bloqueo) {
      return json({ error: bloqueo }, 429)
    }

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

    await sendEmail(
      env,
      email,
      'Tu código de acceso a Carlog',
      `<p>Tu código de acceso es:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>Caduca en 10 minutos.</p>`,
    ).catch((err) => console.error('Error enviando código de login', err))
  }

  const transcurrido = Date.now() - inicio
  if (transcurrido < MIN_RESPONSE_MS) {
    await sleep(MIN_RESPONSE_MS - transcurrido)
  }

  return json({ ok: true })
}
