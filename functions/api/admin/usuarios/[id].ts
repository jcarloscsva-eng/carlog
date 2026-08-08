import { airtableDelete, type AirtableEnv } from '../../../../shared/airtable'
import { TABLES } from '../../../../shared/airtable-mappers'
import { assertEsAdministrador, type AuthEnv } from '../../../../shared/auth'
import { json, withAuth } from '../../../../shared/http'

type Env = AirtableEnv & AuthEnv & { ALLOWED_EMAILS?: string }

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) =>
  withAuth(request, env, async (email) => {
    assertEsAdministrador(env.ALLOWED_EMAILS, email)
    await airtableDelete(env, TABLES.UsuariosPermitidos, String(params.id))
    return json({ ok: true })
  })
