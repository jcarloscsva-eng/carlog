import {
  airtableFormulaString,
  airtableList,
  airtableUpdate,
  type AirtableEnv,
} from '../../../shared/airtable'
import { TABLES, loginCodeFromAirtable } from '../../../shared/airtable-mappers'
import { json } from '../../../shared/http'
import { buildSessionCookie, createSessionToken } from '../../../shared/session'

type Env = AirtableEnv & {
  SESSION_SECRET: string
}

const MAX_ATTEMPTS = 5
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 días

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string }
  const email = body.email?.trim().toLowerCase()
  const code = body.code?.trim()

  if (!email || !code) {
    return json({ error: 'Email y código son obligatorios' }, 400)
  }

  const records = await airtableList<Record<string, unknown>>(
    env,
    TABLES.LoginCodes,
    `AND({Email} = '${airtableFormulaString(email)}', {Used} = FALSE())`,
  )

  const candidatos = records
    .map((r) => loginCodeFromAirtable(r.id, r.fields))
    .filter((c) => new Date(c.expiresAt).getTime() > Date.now())
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))

  const match = candidatos.find((c) => c.code === code)

  if (!match) {
    // Límite de intentos por email, no por código: si no sumáramos los
    // intentos de todos los códigos activos, pedir varios códigos dentro
    // de la ventana de 10 minutos (hasta 5/hora) daría MAX_ATTEMPTS
    // intentos "gratis" por cada uno en vez de un único límite global.
    const totalIntentos = candidatos.reduce((suma, c) => suma + c.attempts, 0)
    if (candidatos.length > 0) {
      if (totalIntentos + 1 >= MAX_ATTEMPTS) {
        await Promise.all(
          candidatos.map((c) => airtableUpdate(env, TABLES.LoginCodes, c.id, { Used: true })),
        )
      } else {
        const ultimo = candidatos[0]
        await airtableUpdate(env, TABLES.LoginCodes, ultimo.id, { Attempts: ultimo.attempts + 1 })
      }
    }
    return json({ error: 'Código incorrecto o caducado' }, 401)
  }

  await airtableUpdate(env, TABLES.LoginCodes, match.id, { Used: true })

  const token = await createSessionToken(email, env.SESSION_SECRET, SESSION_TTL_SECONDS)

  return new Response(JSON.stringify({ ok: true, email }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(token, SESSION_TTL_SECONDS),
    },
  })
}
