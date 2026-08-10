import { airtableCreate, airtableFormulaString, airtableList, type AirtableEnv } from './airtable'
import { TABLES } from './airtable-mappers'

/**
 * Límite de usos de los endpoints /api/ai/* por usuario y hora. Sin esto,
 * cualquier usuario invitado podría agotar la cuota diaria gratuita de
 * Workers AI para todos con peticiones repetidas. Se guarda un registro
 * por uso en la tabla `IaUsos` y se cuentan los de la última hora — mismo
 * patrón que el límite de códigos de login en request-code.ts.
 */
const MAX_USOS_POR_HORA = 20

export async function demasiadosUsosIA(env: AirtableEnv, email: string): Promise<boolean> {
  const ultimaHora = await airtableList<Record<string, unknown>>(
    env,
    TABLES.IaUsos,
    `AND({Email} = '${airtableFormulaString(email)}', IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -60, 'minutes')))`,
  )
  return ultimaHora.length >= MAX_USOS_POR_HORA
}

/** Registra un uso ANTES de llamar a la IA, para que también cuenten los intentos fallidos. */
export async function registrarUsoIA(env: AirtableEnv, email: string): Promise<void> {
  await airtableCreate(env, TABLES.IaUsos, { Email: email })
}
