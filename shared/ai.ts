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

// @cf/meta/llama-3.1-8b-instruct se descatalogó (30 may 2026). Sucesor
// vigente en el catálogo de Workers AI a fecha de este comentario.
// Si vuelve a quedar obsoleto, la lista actual está en
// https://developers.cloudflare.com/workers-ai/models/
const MODELO = '@cf/meta/llama-4-scout-17b-16e-instruct'

export class IaNoDisponibleError extends Error {
  constructor() {
    super(
      'La IA no está activada en este despliegue. Actívala en el dashboard de Cloudflare (Pages → Settings → Functions → AI Bindings) — ver README.',
    )
    this.name = 'IaNoDisponibleError'
  }
}

/**
 * El binding de Workers AI no devuelve siempre la misma forma: según el
 * modelo, `response` puede venir como string directo, como array de
 * bloques `{ text }` (estilo multimodal/tool-calling), o anidado en
 * `{ content }`/`{ text }`. En vez de asumir una forma fija — que es
 * justo lo que rompió al cambiar de modelo (ver #25) —, se busca el
 * primer texto usable en las formas conocidas.
 */
function extraerTexto(respuesta: unknown): string {
  if (typeof respuesta === 'string') return respuesta
  if (respuesta === null || typeof respuesta !== 'object') return ''

  const obj = respuesta as Record<string, unknown>
  if (typeof obj.response === 'string') return obj.response
  if (typeof obj.text === 'string') return obj.text
  if (typeof obj.content === 'string') return obj.content

  if (Array.isArray(obj.response)) {
    return obj.response
      .map((parte) => extraerTexto(parte))
      .filter(Boolean)
      .join('')
  }
  if (obj.response && typeof obj.response === 'object') return extraerTexto(obj.response)

  return ''
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

  return extraerTexto(respuesta).trim()
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
  const array = extraerArrayJson(texto)
  if (!array) {
    throw new Error(
      `La IA no devolvió una lista reconocible. Empieza así: "${texto.slice(0, 160)}${texto.length > 160 ? '…' : ''}"`,
    )
  }

  const sugerencias = array
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      tipo: String(item.tipo ?? '').trim(),
      intervaloKm: typeof item.intervaloKm === 'number' ? item.intervaloKm : undefined,
      intervaloMeses: typeof item.intervaloMeses === 'number' ? item.intervaloMeses : undefined,
    }))
    .filter((item) => item.tipo.length > 0)

  if (sugerencias.length === 0) {
    throw new Error(
      `La IA devolvió una lista vacía o sin el formato esperado: "${texto.slice(0, 160)}${texto.length > 160 ? '…' : ''}"`,
    )
  }
  return sugerencias
}

/**
 * Busca un array JSON en el texto del modelo, tolerando lo que suelen
 * añadir aunque se les pida "solo JSON": vallas de código ```json ... ```,
 * una frase antes/después, o el array envuelto en un objeto
 * (`{"elementos": [...]}`) en vez de suelto.
 */
function extraerArrayJson(texto: string): unknown[] | null {
  const limpio = texto.replace(/```json|```/gi, '').trim()

  // Intento directo: el texto entero es el JSON (con o sin las vallas).
  const directo = intentarParsearArray(limpio)
  if (directo) return directo

  // Si no, el primer '[' ... último ']' del texto.
  const inicio = limpio.indexOf('[')
  const fin = limpio.lastIndexOf(']')
  if (inicio === -1 || fin === -1 || fin <= inicio) return null
  return intentarParsearArray(limpio.slice(inicio, fin + 1))
}

function intentarParsearArray(fragmento: string): unknown[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(fragmento)
  } catch {
    return null
  }
  if (Array.isArray(parsed)) return parsed
  // El modelo envolvió el array en un objeto — usa la primera propiedad que sea un array.
  if (parsed && typeof parsed === 'object') {
    const arrayProp = Object.values(parsed as Record<string, unknown>).find((v) => Array.isArray(v))
    if (Array.isArray(arrayProp)) return arrayProp
  }
  return null
}
