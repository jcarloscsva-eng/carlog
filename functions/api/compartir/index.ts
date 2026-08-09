import type { AirtableEnv } from '../../../shared/airtable'
import type { AuthEnv } from '../../../shared/auth'
import { crearTokenCompartir } from '../../../shared/enlace-compartido'
import { json, withAuth } from '../../../shared/http'
import { assertVehiculoDelUsuario } from '../../../shared/ownership'

type Env = AirtableEnv & AuthEnv

const DIAS_VALIDOS = { 7: true, 30: true, 90: true } as const
const DIA_EN_SEGUNDOS = 24 * 60 * 60

/** Genera un enlace público de solo lectura para el pasaporte de un vehículo. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async (email) => {
    const body = (await request.json().catch(() => ({}))) as { vehiculoId?: string; dias?: number }
    if (!body.vehiculoId) return json({ error: 'Falta el vehículo' }, 400)

    // Solo puedes compartir un vehículo tuyo.
    await assertVehiculoDelUsuario(env, email, body.vehiculoId)

    const dias = body.dias && body.dias in DIAS_VALIDOS ? body.dias : 30
    const token = await crearTokenCompartir(body.vehiculoId, env.SESSION_SECRET, dias * DIA_EN_SEGUNDOS)

    const caducidad = new Date(Date.now() + dias * DIA_EN_SEGUNDOS * 1000).toISOString()
    return json({ url: `${new URL(request.url).origin}/p/${token}`, caducidad, dias })
  })
