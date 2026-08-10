import {
  airtableCreate,
  airtableDelete,
  airtableFormulaString,
  airtableGet,
  airtableList,
  airtableUpdate,
  type AirtableEnv,
} from './airtable'
import type { AuthEnv } from './auth'
import { json, withAuth } from './http'
import { assertMatriculaDelUsuario, getVehiculosDelUsuario } from './ownership'

type Env = AirtableEnv & AuthEnv

interface ConVehiculo {
  id: string
  vehiculoId: string
}

interface EntityConfig<T extends ConVehiculo> {
  table: string
  fromAirtable: (id: string, fields: Record<string, unknown>) => T
  toAirtable: (item: Omit<T, 'id'>) => Record<string, unknown>
}

/** GET (lista, filtrada por vehículos del usuario) y POST (crear) para una entidad ligada a un vehículo. */
export function makeListCreateHandlers<T extends ConVehiculo>(config: EntityConfig<T>) {
  const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
    withAuth(request, env, async (email) => {
      const vehiculos = await getVehiculosDelUsuario(env, email)
      if (vehiculos.length === 0) return json([])
      // Se acota la consulta a Airtable a las matrículas del propio usuario
      // (en vez de traer la tabla entera y filtrar aquí) para no tener en
      // memoria, aunque sea de paso, historial de otros usuarios.
      const formula = `OR(${vehiculos.map((v) => `{Vehiculo} = '${airtableFormulaString(v.matricula)}'`).join(',')})`
      const records = await airtableList<Record<string, unknown>>(env, config.table, formula)
      const mine = records.map((r) => config.fromAirtable(r.id, r.fields))
      return json(mine)
    })

  const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
    withAuth(request, env, async (email) => {
      const body = (await request.json()) as Omit<T, 'id'>
      await assertMatriculaDelUsuario(env, email, body.vehiculoId)
      const record = await airtableCreate(env, config.table, config.toAirtable(body))
      return json(config.fromAirtable(record.id, record.fields), 201)
    })

  return { onRequestGet, onRequestPost }
}

/** PATCH (actualizar parcialmente) y DELETE para un registro concreto de una entidad ligada a un vehículo. */
export function makeItemHandlers<T extends ConVehiculo>(config: EntityConfig<T>) {
  async function loadOwned(env: AirtableEnv, email: string, id: string): Promise<T> {
    const existing = await airtableGet<Record<string, unknown>>(env, config.table, id)
    const item = config.fromAirtable(existing.id, existing.fields)
    await assertMatriculaDelUsuario(env, email, item.vehiculoId)
    return item
  }

  const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) =>
    withAuth(request, env, async (email) => {
      const id = String(params.id)
      const current = await loadOwned(env, email, id)
      const body = (await request.json()) as Partial<T>
      // id y vehiculoId nunca son editables vía PATCH: se fijan a los valores
      // ya verificados de `current`, ignorando lo que venga en el body, para
      // que no se pueda reasignar el registro a otra matrícula/vehículo.
      const merged = { ...current, ...body, id: current.id, vehiculoId: current.vehiculoId } as T
      const { id: _omit, ...fields } = merged
      const record = await airtableUpdate(env, config.table, id, config.toAirtable(fields as Omit<T, 'id'>))
      return json(config.fromAirtable(record.id, record.fields))
    })

  const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) =>
    withAuth(request, env, async (email) => {
      const id = String(params.id)
      await loadOwned(env, email, id)
      await airtableDelete(env, config.table, id)
      return json({ ok: true })
    })

  return { onRequestPatch, onRequestDelete }
}
