import type { AiEnv } from '../../../shared/ai'
import { diagnosticarAveria } from '../../../shared/ai'
import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'

type Env = AiEnv & AuthEnv

interface Body {
  marca: string
  modelo: string
  anio: number
  descripcion: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async () => {
    const body = (await request.json()) as Partial<Body>
    if (!body.marca || !body.modelo || !body.descripcion) {
      return json({ error: 'Faltan marca, modelo o descripción' }, 400)
    }
    const diagnostico = await diagnosticarAveria(env, {
      marca: body.marca,
      modelo: body.modelo,
      anio: body.anio ?? 0,
      descripcion: body.descripcion,
    })
    return json({ diagnostico })
  })
