import { airtableCreate, airtableFormulaString, airtableList, type AirtableEnv } from '../../shared/airtable'
import { TABLES, pushSubscriptionToAirtable } from '../../shared/airtable-mappers'
import type { AuthEnv } from '../../shared/auth'
import { json, withAuth } from '../../shared/http'

type Env = AirtableEnv & AuthEnv

interface SubscribeBody {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/**
 * Dominios de servicios push conocidos. El cron-worker hace una petición
 * HTTP saliente a `endpoint` en cada revisión de alertas, así que hay que
 * evitar que un cliente pueda registrar aquí una URL arbitraria (SSRF).
 */
const DOMINIOS_PUSH_PERMITIDOS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'notify.windows.com',
  'push.apple.com',
  'web.push.apple.com',
]

function endpointPushValido(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  return DOMINIOS_PUSH_PERMITIDOS.some(
    (dominio) => url.hostname === dominio || url.hostname.endsWith(`.${dominio}`),
  )
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async (email) => {
    const body = (await request.json()) as SubscribeBody

    if (!endpointPushValido(body.endpoint)) {
      return json({ error: 'Endpoint de notificaciones no válido' }, 400)
    }

    const existentes = await airtableList<Record<string, unknown>>(
      env,
      TABLES.PushSubscriptions,
      `AND({Email} = '${airtableFormulaString(email)}', {Endpoint} = '${airtableFormulaString(body.endpoint)}')`,
    )
    if (existentes.length > 0) {
      return json({ ok: true })
    }

    await airtableCreate(
      env,
      TABLES.PushSubscriptions,
      pushSubscriptionToAirtable({
        email,
        endpoint: body.endpoint,
        keysP256dh: body.keys.p256dh,
        keysAuth: body.keys.auth,
      }),
    )
    return json({ ok: true }, 201)
  })
