/**
 * Integración con Cloudflare Workers AI: usa el binding `AI` del proyecto
 * Pages (gratuito, sin API key propia que gestionar — se activa en
 * Settings → Functions → AI Bindings del proyecto en el dashboard de
 * Cloudflare, ver README). No hay fallback a otro proveedor: si el
 * binding no está activado, los endpoints de IA devuelven un error claro
 * en vez de fallar silenciosamente.
 */

export interface AiEnv {
  AI: Ai
}

const MODELO = '@cf/meta/llama-3.1-8b-instruct'

export class IaNoDisponibleError extends Error {
  constructor() {
    super(
      'La IA no está activada en este despliegue. Actívala en el dashboard de Cloudflare (Pages → Settings → Functions → AI Bindings) — ver README.',
    )
    this.name = 'IaNoDisponibleError'
  }
}

async function preguntar(env: AiEnv, systemPrompt: string, userPrompt: string): Promise<string> {
  if (!env.AI) throw new IaNoDisponibleError()

  const respuesta = await env.AI.run(MODELO, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 400,
  })

  const texto = (respuesta as { response?: string }).response
  return (texto ?? '').trim()
}

/**
 * Diagnóstico orientativo de una avería descrita por el usuario, a partir
 * de la marca y modelo del vehículo. No sustituye a un mecánico — el
 * prompt se lo pide explícitamente al modelo para que el propio texto lo
 * recuerde.
 */
export async function diagnosticarAveria(
  env: AiEnv,
  datos: { marca: string; modelo: string; anio: number; descripcion: string },
): Promise<string> {
  const system =
    'Eres un mecánico de confianza explicando una avería a alguien sin conocimientos técnicos. ' +
    'Responde en español, en un máximo de 5 frases cortas: (1) la causa más probable, ' +
    '(2) si es seguro seguir conduciendo o hay que parar, (3) una estimación aproximada de ' +
    'coste de reparación si es razonable darla. Sé directo, sin rodeos ni disculpas. ' +
    'Termina siempre recordando que es orientativo y que un mecánico debe confirmarlo.'
  const user = `Vehículo: ${datos.marca} ${datos.modelo} (${datos.anio}). Avería descrita por el propietario: "${datos.descripcion}"`
  return preguntar(env, system, user)
}

export interface SugerenciaElemento {
  tipo: string
  intervaloKm?: number
  intervaloMeses?: number
}

/**
 * Plan de mantenimiento sugerido para un modelo concreto: qué elementos
 * habituales revisar y cada cuánto, según lo que suele recomendar el
 * fabricante para ese modelo (aproximado, generado por IA — no es el
 * manual oficial). Se le pide al modelo que devuelva JSON estricto para
 * poder parsearlo sin depender de que "suene bien" el texto.
 */
export async function sugerirMantenimiento(
  env: AiEnv,
  datos: { marca: string; modelo: string; anio: number },
): Promise<SugerenciaElemento[]> {
  const system =
    'Eres un asistente que conoce los planes de mantenimiento habituales de fabricantes de ' +
    'vehículos. Responde ÚNICAMENTE con un array JSON válido, sin texto antes ni después, con ' +
    'como máximo 8 elementos, cada uno con esta forma exacta: ' +
    '{"tipo": string en español (p. ej. "Aceite", "Filtro de aire", "Correa de distribución"), ' +
    '"intervaloKm": number opcional, "intervaloMeses": number opcional}. ' +
    'Usa cifras razonables y típicas para ese modelo si las conoces, o estimaciones generales de ' +
    'su categoría/motorización si no. No incluyas nada que no sea el array JSON.'
  const user = `Vehículo: ${datos.marca} ${datos.modelo}, año ${datos.anio}.`

  const texto = await preguntar(env, system, user)
  const inicio = texto.indexOf('[')
  const fin = texto.lastIndexOf(']')
  if (inicio === -1 || fin === -1) return []

  try {
    const parsed = JSON.parse(texto.slice(inicio, fin + 1)) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        tipo: String(item.tipo ?? '').trim(),
        intervaloKm: typeof item.intervaloKm === 'number' ? item.intervaloKm : undefined,
        intervaloMeses: typeof item.intervaloMeses === 'number' ? item.intervaloMeses : undefined,
      }))
      .filter((item) => item.tipo.length > 0)
  } catch {
    return []
  }
}
