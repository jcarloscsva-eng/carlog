import { airtableCreate, airtableList, type AirtableEnv } from '../../../../shared/airtable'
import { TABLES, usuarioPermitidoFromAirtable, usuarioPermitidoToAirtable } from '../../../../shared/airtable-mappers'
import { assertEsAdministrador, type AuthEnv } from '../../../../shared/auth'
import { json, withAuth } from '../../../../shared/http'

type Env = AirtableEnv & AuthEnv & { ALLOWED_EMAILS?: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async (email) => {
    assertEsAdministrador(env.ALLOWED_EMAILS, email)
    const records = await airtableList<Record<string, unknown>>(env, TABLES.UsuariosPermitidos)
    const usuarios = records
      .map((r) => usuarioPermitidoFromAirtable(r.id, r.fields))
      .sort((a, b) => b.fechaAlta.localeCompare(a.fechaAlta))
    return json(usuarios)
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async (email) => {
    assertEsAdministrador(env.ALLOWED_EMAILS, email)

    const body = (await request.json().catch(() => ({}))) as { email?: string; nota?: string }
    const nuevoEmail = body.email?.trim().toLowerCase()
    if (!nuevoEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoEmail)) {
      return json({ error: 'Email no válido' }, 400)
    }

    const record = await airtableCreate(
      env,
      TABLES.UsuariosPermitidos,
      usuarioPermitidoToAirtable({
        email: nuevoEmail,
        nota: body.nota?.trim() || undefined,
        fechaAlta: new Date().toISOString().slice(0, 10),
      }),
    )
    return json(usuarioPermitidoFromAirtable(record.id, record.fields), 201)
  })
