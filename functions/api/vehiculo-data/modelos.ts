import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'

interface NhtsaModelsResponse {
  Results?: { Model_Name?: string }[]
}

/**
 * Modelos de una marca dada, consultados en vivo en la NHTSA (ver
 * marcas.ts para el porqué de hacerlo desde el backend).
 */
export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) =>
  withAuth(request, env, async () => {
    const marca = new URL(request.url).searchParams.get('marca')?.trim()
    if (!marca) return json([])

    try {
      const res = await fetch(
        `${NHTSA_BASE}/GetModelsForMake/${encodeURIComponent(marca)}?format=json`,
      )
      const data = (await res.json()) as NhtsaModelsResponse
      const nombres = new Set<string>()
      for (const item of data.Results ?? []) {
        if (item.Model_Name) nombres.add(item.Model_Name.trim())
      }
      return json([...nombres].sort((a, b) => a.localeCompare(b, 'es')))
    } catch (err) {
      console.error('Error consultando modelos en NHTSA', err)
      return json([])
    }
  })
