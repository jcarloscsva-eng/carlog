import { airtableFormulaString, airtableList, type AirtableEnv } from './airtable'
import { TABLES } from './airtable-mappers'

/** ¿Este email está invitado vía la tabla UsuariosPermitidos (además de ALLOWED_EMAILS)? */
export async function estaInvitado(env: AirtableEnv, email: string): Promise<boolean> {
  const records = await airtableList<Record<string, unknown>>(
    env,
    TABLES.UsuariosPermitidos,
    `{Email} = '${airtableFormulaString(email)}'`,
  )
  return records.length > 0
}
