import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'
import { MARCAS_CATALOGO } from '../../../shared/vehiculo-catalogo'

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'
// Cubre turismos, motos y furgonetas — los tres "Tipo" que maneja Carlog.
const TIPOS_NHTSA = ['car', 'motorcycle', 'truck']

interface NhtsaMakesResponse {
  Results?: { MakeName?: string }[]
}

/** Igualdad de marcas ignorando tildes, mayúsculas y espacios sobrantes. */
function clave(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Marcas de vehículo. La fuente principal es nuestro catálogo del mercado
 * español (shared/vehiculo-catalogo.ts), porque la base pública de la
 * NHTSA es el registro de EE. UU. y escribe muchas marcas europeas de
 * forma distinta o directamente no las cubre. La NHTSA se conserva como
 * complemento para la cola larga (marcas raras o de importación).
 *
 * Se consulta desde el backend, no desde el navegador, para no tener que
 * abrir la Content-Security-Policy (connect-src 'self') a un dominio
 * externo.
 */
export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) =>
  withAuth(request, env, async () => {
    const nombres = [...MARCAS_CATALOGO]
    const vistas = new Set(nombres.map(clave))

    try {
      const respuestas = await Promise.all(
        TIPOS_NHTSA.map((tipo) =>
          fetch(`${NHTSA_BASE}/GetMakesForVehicleType/${tipo}?format=json`).then(
            (r) => r.json() as Promise<NhtsaMakesResponse>,
          ),
        ),
      )
      for (const r of respuestas) {
        for (const item of r.Results ?? []) {
          const nombre = item.MakeName?.trim()
          // La NHTSA devuelve las marcas en mayúsculas ("SEAT", "VOLVO"):
          // si ya está en el catálogo, se conserva nuestra grafía.
          if (nombre && !vistas.has(clave(nombre))) {
            vistas.add(clave(nombre))
            nombres.push(capitaliza(nombre))
          }
        }
      }
    } catch (err) {
      // Degrada con elegancia: el catálogo propio ya cubre el caso normal.
      console.error('Error consultando marcas en NHTSA', err)
    }

    return json(nombres.sort((a, b) => a.localeCompare(b, 'es')))
  })

/** "LAND ROVER" -> "Land Rover". Solo se aplica a lo que viene de la NHTSA. */
function capitaliza(valor: string): string {
  if (valor !== valor.toUpperCase()) return valor
  return valor
    .toLowerCase()
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}
