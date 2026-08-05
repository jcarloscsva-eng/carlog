import { airtableCreate, type AirtableEnv } from '../../../shared/airtable'
import { TABLES, vehiculoFromAirtable, vehiculoToAirtable } from '../../../shared/airtable-mappers'
import { json, withAuth } from '../../../shared/http'
import { getVehiculosDelUsuario } from '../../../shared/ownership'
import type { Vehiculo } from '../../../shared/types'

type Env = AirtableEnv

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, async (email) => {
    const vehiculos = await getVehiculosDelUsuario(env, email)
    return json(vehiculos)
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, async (email) => {
    const body = (await request.json()) as Omit<Vehiculo, 'id' | 'propietarioEmail'>
    const record = await airtableCreate(
      env,
      TABLES.Vehiculos,
      vehiculoToAirtable({ ...body, propietarioEmail: email }),
    )
    return json(vehiculoFromAirtable(record.id, record.fields), 201)
  })
