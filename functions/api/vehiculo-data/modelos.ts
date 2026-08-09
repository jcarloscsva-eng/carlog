import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'
import { modelosDeMarca } from '../../../shared/vehiculo-catalogo'

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'

interface NhtsaModelsResponse {
  Results?: { Model_Name?: string }[]
}

function clave(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Modelos de una marca. Se sirve primero nuestro catálogo del mercado
 * español y, además, se añade lo que aporte la NHTSA para no perder la
 * cola larga (versiones de importación, marcas que no tenemos fichadas).
 * Ver marcas.ts para el porqué de consultarlo desde el backend.
 */
export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) =>
  withAuth(request, env, async () => {
    const marca = new URL(request.url).searchParams.get('marca')?.trim()
    if (!marca) return json([])

    const nombres = modelosDeMarca(marca)
    const vistos = new Set(nombres.map(clave))

    try {
      const res = await fetch(
        `${NHTSA_BASE}/GetModelsForMake/${encodeURIComponent(marca)}?format=json`,
      )
      const data = (await res.json()) as NhtsaModelsResponse
      for (const item of data.Results ?? []) {
        const nombre = item.Model_Name?.trim()
        if (nombre && !vistos.has(clave(nombre))) {
          vistos.add(clave(nombre))
          nombres.push(nombre)
        }
      }
    } catch (err) {
      // El catálogo propio ya cubre el caso normal; sin NHTSA solo se
      // pierde la cola larga.
      console.error('Error consultando modelos en NHTSA', err)
    }

    return json(nombres.sort((a, b) => a.localeCompare(b, 'es')))
  })
