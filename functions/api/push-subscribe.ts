import { airtableCreate, airtableFormulaString, airtableList, type AirtableEnv } from '../../shared/airtable'
import { TABLES, pushSubscriptionToAirtable } from '../../shared/airtable-mappers'
import { json, withAuth } from '../../shared/http'

type Env = AirtableEnv

interface SubscribeBody {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, async (email) => {
    const body = (await request.json()) as SubscribeBody

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
