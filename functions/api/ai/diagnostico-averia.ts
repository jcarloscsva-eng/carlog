import type { AiEnv } from '../../../shared/ai'
import { diagnosticarAveria } from '../../../shared/ai'
import { demasiadosUsosIA, registrarUsoIA } from '../../../shared/ai-rate-limit'
import type { AirtableEnv } from '../../../shared/airtable'
import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'

type Env = AiEnv & AuthEnv & AirtableEnv

interface Body {
  marca: string
  modelo: string
  anio: number
  descripcion: string
}

const MAX_LONGITUD_CAMPO = 100
const MAX_LONGITUD_DESCRIPCION = 600

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async (email) => {
    const body = (await request.json()) as Partial<Body>
    if (!body.marca || !body.modelo || !body.descripcion) {
      return json({ error: 'Faltan marca, modelo o descripción' }, 400)
    }
    if (
      body.marca.length > MAX_LONGITUD_CAMPO ||
      body.modelo.length > MAX_LONGITUD_CAMPO ||
      body.descripcion.length > MAX_LONGITUD_DESCRIPCION
    ) {
      return json({ error: 'Marca, modelo o descripción son demasiado largos' }, 400)
    }

    if (await demasiadosUsosIA(env, email)) {
      return json({ error: 'Has hecho demasiadas consultas a la IA en la última hora. Prueba más tarde.' }, 429)
    }
    await registrarUsoIA(env, email)

    const diagnostico = await diagnosticarAveria(env, {
      marca: body.marca,
      modelo: body.modelo,
      anio: body.anio ?? 0,
      descripcion: body.descripcion,
    })
    return json({ diagnostico })
  })
