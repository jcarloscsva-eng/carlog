import {
  airtableCreate,
  airtableDelete,
  airtableGet,
  airtableList,
  airtableUpdate,
  type AirtableEnv,
} from './airtable'
import type { AuthEnv } from './auth'
import { json, withAuth } from './http'
import { assertVehiculoDelUsuario, getVehiculosDelUsuario } from './ownership'

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
      const ownedIds = new Set(vehiculos.map((v) => v.id))
      const records = await airtableList<Record<string, unknown>>(env, config.table)
      const mine = records
        .map((r) => config.fromAirtable(r.id, r.fields))
        .filter((item) => ownedIds.has(item.vehiculoId))
      return json(mine)
    })

  const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
    withAuth(request, env, async (email) => {
      const body = (await request.json()) as Omit<T, 'id'>
      await assertVehiculoDelUsuario(env, email, body.vehiculoId)
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
    await assertVehiculoDelUsuario(env, email, item.vehiculoId)
    return item
  }

  const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) =>
    withAuth(request, env, async (email) => {
      const id = String(params.id)
      const current = await loadOwned(env, email, id)
      const body = (await request.json()) as Partial<T>
      const merged = { ...current, ...body } as T
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
