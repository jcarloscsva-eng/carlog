import { DIAS_ANTELACION, KM_ANTELACION } from './alerts'
import { intervaloSugerido } from './elementos-catalogo'
import { calcularProximaItv } from './itv-rules'
import type { Averia, Elemento, Itv, Seguro, Vehiculo } from './types'

/** Grave = algo ya vencido. Leve = algo por vencer. */
export type NivelAviso = 'leve' | 'grave'

export interface AvisosVehiculo {
  /** Número total de avisos, leves y graves juntos. */
  total: number
  /** El peor de los niveles presentes; null si no hay ningún aviso. */
  nivel: NivelAviso | null
}

function diasHasta(hoy: Date, fecha: Date): number {
  return (fecha.getTime() - hoy.getTime()) / 86_400_000
}

function addMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha)
  resultado.setMonth(resultado.getMonth() + meses)
  return resultado
}

/**
 * Clasifica un vencimiento por fecha y/o kilómetros:
 * 'grave' si ya pasó, 'leve' si entra en la ventana de aviso
 * (30 días o 1.000 km), null si aún queda margen.
 */
function clasificarVencimiento(
  hoy: Date,
  kmActual: number,
  fechaObjetivo?: Date,
  kmObjetivo?: number,
): NivelAviso | null {
  const vencidoPorFecha = fechaObjetivo !== undefined && diasHasta(hoy, fechaObjetivo) < 0
  const vencidoPorKm = kmObjetivo !== undefined && kmActual >= kmObjetivo
  if (vencidoPorFecha || vencidoPorKm) return 'grave'

  const proximoPorFecha =
    fechaObjetivo !== undefined && diasHasta(hoy, fechaObjetivo) <= DIAS_ANTELACION
  const proximoPorKm = kmObjetivo !== undefined && kmObjetivo - kmActual <= KM_ANTELACION
  if (proximoPorFecha || proximoPorKm) return 'leve'

  return null
}

/** Se queda con el registro más reciente de cada tipo. */
function ultimoPorTipo<T>(
  items: T[],
  tipo: (item: T) => string,
  fecha: (item: T) => string,
): T[] {
  const mapa = new Map<string, T>()
  for (const item of items) {
    const existente = mapa.get(tipo(item))
    if (!existente || new Date(fecha(item)) > new Date(fecha(existente))) {
      mapa.set(tipo(item), item)
    }
  }
  return [...mapa.values()]
}

/**
 * Cuenta cuántas cosas hay que revisar en un vehículo y con qué gravedad,
 * para el globo de avisos. Es un recuento, no una puntuación ponderada:
 * cada situación pendiente suma exactamente uno.
 *
 * No consulta nada: trabaja sobre datos ya cargados en pantalla.
 */
export function contarAvisos(
  hoy: Date,
  vehiculo: Vehiculo,
  averias: Averia[],
  elementos: Elemento[],
  itvs: Itv[],
  seguros: Seguro[],
): AvisosVehiculo {
  const kmActual = vehiculo.kmActual
  const niveles: NivelAviso[] = []

  // Una avería sin resolver es algo que ya está pasando, no algo que se acerca.
  for (const a of averias) {
    if (a.estado === 'Pendiente') niveles.push('grave')
  }

  const ultimaItv = [...itvs].sort((a, b) => b.fechaRealizada.localeCompare(a.fechaRealizada))[0]
  const fechaProximaItv = ultimaItv ? new Date(ultimaItv.fechaProxima) : calcularProximaItv(vehiculo)
  const nivelItv = clasificarVencimiento(hoy, kmActual, fechaProximaItv, undefined)
  if (nivelItv) niveles.push(nivelItv)

  const seguroVigente = [...seguros].sort((a, b) =>
    b.fechaRenovacion.localeCompare(a.fechaRenovacion),
  )[0]
  if (seguroVigente) {
    const nivelSeguro = clasificarVencimiento(
      hoy,
      kmActual,
      new Date(seguroVigente.fechaRenovacion),
      undefined,
    )
    if (nivelSeguro) niveles.push(nivelSeguro)
  }

  const elementosVigentes = ultimoPorTipo(elementos, (e) => e.tipo, (e) => e.fecha)
  for (const e of elementosVigentes) {
    const intervalo = e.intervaloKm || e.intervaloMeses
      ? { km: e.intervaloKm, meses: e.intervaloMeses }
      : intervaloSugerido(e.tipo)
    if (!intervalo.km && !intervalo.meses) continue
    const nivel = clasificarVencimiento(
      hoy,
      kmActual,
      intervalo.meses ? addMeses(new Date(e.fecha), intervalo.meses) : undefined,
      intervalo.km ? e.km + intervalo.km : undefined,
    )
    if (nivel) niveles.push(nivel)
  }

  return {
    total: niveles.length,
    nivel: niveles.includes('grave') ? 'grave' : niveles.length > 0 ? 'leve' : null,
  }
}
