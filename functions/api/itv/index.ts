import { airtableCreate, airtableList, type AirtableEnv } from '../../../shared/airtable'
import { TABLES, itvFromAirtable, itvToAirtable, vehiculoFromAirtable } from '../../../shared/airtable-mappers'
import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'
import { calcularProximaItv } from '../../../shared/itv-rules'
import { assertVehiculoDelUsuario, getVehiculosDelUsuario } from '../../../shared/ownership'
import type { Itv } from '../../../shared/types'

type Env = AirtableEnv & AuthEnv

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async (email) => {
    const vehiculos = await getVehiculosDelUsuario(env, email)
    const ownedIds = new Set(vehiculos.map((v) => v.id))
    const records = await airtableList<Record<string, unknown>>(env, TABLES.Itv)
    const mine = records
      .map((r) => itvFromAirtable(r.id, r.fields))
      .filter((item) => ownedIds.has(item.vehiculoId))
    return json(mine)
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async (email) => {
    const body = (await request.json()) as Pick<Itv, 'vehiculoId' | 'fechaRealizada' | 'resultado'>
    await assertVehiculoDelUsuario(env, email, body.vehiculoId)

    const vehiculoRecord = await airtableList<Record<string, unknown>>(
      env,
      TABLES.Vehiculos,
      `RECORD_ID() = '${body.vehiculoId}'`,
    )
    const vehiculo = vehiculoFromAirtable(vehiculoRecord[0].id, vehiculoRecord[0].fields)

    const fechaProxima = calcularProximaItv(vehiculo, {
      id: '',
      vehiculoId: body.vehiculoId,
      fechaRealizada: body.fechaRealizada,
      resultado: body.resultado,
      fechaProxima: '',
    })

    const record = await airtableCreate(
      env,
      TABLES.Itv,
      itvToAirtable({ ...body, fechaProxima: fechaProxima.toISOString() }),
    )
    return json(itvFromAirtable(record.id, record.fields), 201)
  })
