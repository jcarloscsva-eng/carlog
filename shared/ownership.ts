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

/** Lanza ForbiddenError si el id de un registro de Vehiculos no pertenece al usuario. */
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

/**
 * Lanza ForbiddenError si la matrícula (el `vehiculoId` que usan
 * Averias/Elementos/ITV/Seguros/Partes) no pertenece al usuario autenticado.
 */
export async function assertMatriculaDelUsuario(
  env: AirtableEnv,
  email: string,
  matricula: string,
): Promise<void> {
  const propios = await getVehiculosDelUsuario(env, email)
  if (!propios.some((v) => v.matricula === matricula)) {
    throw new ForbiddenError()
  }
}

/**
 * ¿Ya existe algún vehículo (de cualquier usuario) con esta matrícula?
 * El historial (Averias/Elementos/ITV/Seguros/Partes) enlaza con su
 * vehículo por matrícula, no por id de registro — si dos usuarios
 * distintos pudieran tener la misma matrícula, cada uno vería (y podría
 * editar o borrar) el historial del otro, porque el filtro de "es mío" solo
 * compara ese texto. Por eso la matrícula tiene que ser única en toda la
 * base, no solo dentro de los vehículos de un usuario.
 */
export async function existeOtroVehiculoConMatricula(
  env: AirtableEnv,
  matricula: string,
  idAExcluir?: string,
): Promise<boolean> {
  const normalizada = matricula.trim().toUpperCase()
  if (!normalizada) return false
  const records = await airtableList<Record<string, unknown>>(
    env,
    TABLES.Vehiculos,
    `UPPER({Matricula}) = '${airtableFormulaString(normalizada)}'`,
  )
  return records.some((r) => r.id !== idAExcluir)
}
