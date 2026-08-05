import { airtableDelete, airtableUpdate, type AirtableEnv } from '../../../shared/airtable'
import { TABLES, vehiculoFromAirtable } from '../../../shared/airtable-mappers'
import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'
import { assertVehiculoDelUsuario } from '../../../shared/ownership'
import type { Vehiculo } from '../../../shared/types'

type Env = AirtableEnv & AuthEnv

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) =>
  withAuth(request, env, async (email) => {
    const id = String(params.id)
    await assertVehiculoDelUsuario(env, email, id)
    const body = (await request.json()) as Partial<Omit<Vehiculo, 'id' | 'propietarioEmail'>>
    const record = await airtableUpdate(env, TABLES.Vehiculos, id, {
      Marca: body.marca,
      Modelo: body.modelo,
      Matricula: body.matricula,
      Año: body.anio,
      Tipo: body.tipo,
      Km_Actual: body.kmActual,
      Km_Actual_Fecha: body.kmActualFecha,
    })
    return json(vehiculoFromAirtable(record.id, record.fields))
  })

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) =>
  withAuth(request, env, async (email) => {
    const id = String(params.id)
    await assertVehiculoDelUsuario(env, email, id)
    await airtableDelete(env, TABLES.Vehiculos, id)
    return json({ ok: true })
  })
