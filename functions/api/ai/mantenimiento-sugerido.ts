import type { AiEnv } from '../../../shared/ai'
import { sugerirMantenimiento } from '../../../shared/ai'
import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'

type Env = AiEnv & AuthEnv

interface Body {
  marca: string
  modelo: string
  anio: number
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  withAuth(request, env, async () => {
    const body = (await request.json()) as Partial<Body>
    if (!body.marca || !body.modelo) {
      return json({ error: 'Faltan marca o modelo' }, 400)
    }
    const sugerencias = await sugerirMantenimiento(env, {
      marca: body.marca,
      modelo: body.modelo,
      anio: body.anio ?? 0,
    })
    return json({ sugerencias })
  })
