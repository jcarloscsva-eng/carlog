import { airtableFormulaString, airtableList, type AirtableEnv } from './airtable'
import { TABLES, vehiculoFromAirtable } from './airtable-mappers'
import type { Vehiculo } from './types'

/** Devuelve los vehículos del usuario autenticado. */
export async function getVehiculosDelUsuario(
  env: AirtableEnv,
  email: string,
): Promise<Vehiculo[]> {
  const records = await airtableList<Record<string, unknown>>(
    env,
    TABLES.Vehiculos,
    `{Propietario_Email} = '${airtableFormulaString(email)}'`,
  )
  return records.map((r) => vehiculoFromAirtable(r.id, r.fields))
}

export class ForbiddenError extends Error {
  constructor() {
    super('No tienes acceso a este vehículo')
    this.name = 'ForbiddenError'
  }
}

/** Lanza ForbiddenError si `vehiculoId` no pertenece al usuario autenticado. */
export async function assertVehiculoDelUsuario(
  env: AirtableEnv,
  email: string,
  vehiculoId: string,
): Promise<void> {
  const propios = await getVehiculosDelUsuario(env, email)
  if (!propios.some((v) => v.id === vehiculoId)) {
    throw new ForbiddenError()
  }
}
