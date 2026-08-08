import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'
// Cubre turismos, motos y furgonetas — los tres "Tipo" que maneja Carlog.
const TIPOS_NHTSA = ['car', 'motorcycle', 'truck']

interface NhtsaMakesResponse {
  Results?: { MakeName?: string }[]
}

/**
 * Lista de marcas de vehículo, siempre al día: se consulta en vivo la base
 * pública de la NHTSA (sin clave, sin coste) en vez de mantener una lista
 * fija a mano. Se pide desde el backend, no desde el navegador, para no
 * tener que abrir la Content-Security-Policy (connect-src 'self') a un
 * dominio externo.
 */
export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) =>
  withAuth(request, env, async () => {
    try {
      const respuestas = await Promise.all(
        TIPOS_NHTSA.map((tipo) =>
          fetch(`${NHTSA_BASE}/GetMakesForVehicleType/${tipo}?format=json`).then(
            (r) => r.json() as Promise<NhtsaMakesResponse>,
          ),
        ),
      )
      const nombres = new Set<string>()
      for (const r of respuestas) {
        for (const item of r.Results ?? []) {
          if (item.MakeName) nombres.add(item.MakeName.trim())
        }
      }
      return json([...nombres].sort((a, b) => a.localeCompare(b, 'es')))
    } catch (err) {
      // Degrada con elegancia: sin sugerencias, el campo sigue siendo texto libre.
      console.error('Error consultando marcas en NHTSA', err)
      return json([])
    }
  })
