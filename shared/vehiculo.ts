/** Años transcurridos desde la fecha de compra, redondeados al entero más cercano. */
export function calcularAntiguedad(fechaCompra: string, hoy: Date): number {
  const compra = new Date(fechaCompra)
  const dias = (hoy.getTime() - compra.getTime()) / 86_400_000
  return Math.round(dias / 365.25)
}

export interface LecturaKm {
  fecha: string // ISO yyyy-mm-dd
  km: number
}

export interface EstimacionKm {
  km: number
  /** 'historial' = calculado del ritmo real de uso; 'anual' = del km/año estimado dado de alta, sin historial suficiente todavía. */
  origen: 'historial' | 'anual'
}

const DIAS_MIN_LECTURA_VIEJA = 10
const DIAS_MIN_SPAN_HISTORIAL = 21
const KM_MIN_SUGERENCIA = 50

function diasEntre(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
}

/** Redondea a la decena más cercana: una sugerencia con precisión de km individual suena a inventada. */
function redondear(km: number): number {
  return Math.round(km / 10) * 10
}

/**
 * Sugiere el kilometraje de hoy a partir del ritmo de uso real del
 * vehículo — nunca sobrescribe nada, es solo una propuesta que el usuario
 * confirma con un clic o ignora.
 *
 * Prioriza el historial real: con dos o más lecturas conocidas (los `km`
 * de los elementos registrados, más la propia lectura actual del
 * vehículo) que abarquen al menos tres semanas, calcula el ritmo entre la
 * más antigua y la más reciente y lo proyecta hasta hoy. Si no hay
 * historial suficiente (vehículo recién dado de alta, o todo apuntado el
 * mismo día), recurre al km/año estimado a mano al crear el vehículo. Sin
 * ninguno de los dos, no hay nada que sugerir.
 */
export function estimarKmActual(
  hoy: Date,
  vehiculo: { kmActual: number; kmActualFecha: string; kmAnualesEstimados?: number },
  lecturas: LecturaKm[],
): EstimacionKm | null {
  if (!vehiculo.kmActualFecha) return null
  const hoyIso = hoy.toISOString().slice(0, 10)
  const diasDesdeLectura = diasEntre(vehiculo.kmActualFecha, hoyIso)
  if (diasDesdeLectura < DIAS_MIN_LECTURA_VIEJA) return null

  const puntos = [...lecturas, { fecha: vehiculo.kmActualFecha, km: vehiculo.kmActual }]
    .filter((p) => p.fecha && p.km > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]
  const spanDias = primero && ultimo ? diasEntre(primero.fecha, ultimo.fecha) : 0

  let ritmoDiario: number | null = null
  let origen: EstimacionKm['origen'] = 'anual'
  if (primero && ultimo && spanDias >= DIAS_MIN_SPAN_HISTORIAL && ultimo.km > primero.km) {
    ritmoDiario = (ultimo.km - primero.km) / spanDias
    origen = 'historial'
  } else if (vehiculo.kmAnualesEstimados && vehiculo.kmAnualesEstimados > 0) {
    ritmoDiario = vehiculo.kmAnualesEstimados / 365.25
    origen = 'anual'
  }
  if (ritmoDiario === null) return null

  const estimado = redondear(vehiculo.kmActual + ritmoDiario * diasDesdeLectura)
  if (estimado - vehiculo.kmActual < KM_MIN_SUGERENCIA) return null

  return { km: estimado, origen }
}
