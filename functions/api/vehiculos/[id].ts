import { airtableDelete, airtableUpdate, type AirtableEnv } from '../../../shared/airtable'
import { TABLES, vehiculoFromAirtable } from '../../../shared/airtable-mappers'
import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'
import { assertVehiculoDelUsuario, getVehiculosDelUsuario } from '../../../shared/ownership'
import type { Vehiculo } from '../../../shared/types'

type Env = AirtableEnv & AuthEnv

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) =>
  withAuth(request, env, async (email) => {
    const id = String(params.id)
    await assertVehiculoDelUsuario(env, email, id)
    const body = (await request.json()) as Partial<Omit<Vehiculo, 'id' | 'propietarioEmail'>>

    if (body.matricula) {
      const propios = await getVehiculosDelUsuario(env, email)
      const matriculaNueva = body.matricula.trim().toUpperCase()
      if (propios.some((v) => v.id !== id && v.matricula.trim().toUpperCase() === matriculaNueva)) {
        return json({ error: 'Ya tienes un vehículo con esa matrícula' }, 400)
      }
    }

    const record = await airtableUpdate(env, TABLES.Vehiculos, id, {
      Marca: body.marca,
      Modelo: body.modelo,
      Matricula: body.matricula,
      Año: body.anio,
      Tipo: body.tipo,
      Km_Actual: body.kmActual,
      Km_Actual_Fecha: body.kmActualFecha,
      Fecha_Compra: body.fechaCompra || null,
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
