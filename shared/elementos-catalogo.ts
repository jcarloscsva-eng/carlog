/**
 * Catálogo de elementos habituales del vehículo, con un intervalo sugerido
 * por defecto (km y/o meses) para cada uno. El campo `tipo` de un Elemento
 * es texto libre — este catálogo solo alimenta el autocompletado del
 * formulario y da un valor de partida al medidor de salud cuando el
 * elemento no tiene su propio intervalo configurado a mano.
 *
 * Las cifras son orientativas (mantenimiento habitual en gasolina/diésel de
 * uso normal), no una recomendación de fabricante: sirven para que el
 * medidor muestre algo razonable desde el primer día, no como sustituto
 * del manual del vehículo.
 */
export interface IntervaloSugerido {
  km?: number
  meses?: number
}

export const ELEMENTOS_CATALOGO: Record<string, IntervaloSugerido> = {
  Aceite: { km: 10_000, meses: 12 },
  'Filtro de aceite': { km: 10_000, meses: 12 },
  'Filtro de aire': { km: 15_000, meses: 24 },
  'Filtro de combustible': { km: 30_000, meses: 24 },
  'Filtro de polen': { km: 15_000, meses: 12 },
  'Pastillas de freno delanteras': { km: 30_000 },
  'Pastillas de freno traseras': { km: 40_000 },
  'Discos de freno': { km: 60_000 },
  'Correa de distribución': { km: 90_000, meses: 60 },
  Bujías: { km: 30_000 },
  Batería: { meses: 48 },
  Neumáticos: { km: 45_000 },
  'Descarbonización de motor': {},
}

export const ELEMENTOS_COMUNES: string[] = Object.keys(ELEMENTOS_CATALOGO)

/** Intervalo sugerido para un tipo del catálogo; `{}` si no está o no tiene uno definido. */
export function intervaloSugerido(tipo: string): IntervaloSugerido {
  return ELEMENTOS_CATALOGO[tipo] ?? {}
}
