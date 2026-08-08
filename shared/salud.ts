import { calcularProximaItv } from './itv-rules'
import { KM_ANTELACION, DIAS_ANTELACION } from './alerts'
import type { Averia, Itv, Mantenimiento, Seguro, Vehiculo } from './types'

export type NivelSalud = 'bueno' | 'atencion' | 'urgente'

export interface SaludVehiculo {
  puntuacion: number // 0-100
  nivel: NivelSalud
}

function diasHasta(hoy: Date, fecha: Date): number {
  return (fecha.getTime() - hoy.getTime()) / 86_400_000
}

/**
 * Puntuación 0-100 con semáforo, agregando señales que Carlog ya calcula
 * en otras partes de la app (averías pendientes, ITV, mantenimientos con
 * intervalo, renovación del seguro) en un único número. No añade ninguna
 * llamada nueva a Airtable: es una síntesis de datos ya cargados.
 */
export function calcularSaludVehiculo(
  hoy: Date,
  vehiculo: Vehiculo,
  averias: Averia[],
  mantenimientos: Mantenimiento[],
  itvs: Itv[],
  seguros: Seguro[],
): SaludVehiculo {
  let puntuacion = 100
  const kmActual = vehiculo.kmActual

  const averiasPendientes = averias.filter((a) => a.estado === 'Pendiente').length
  puntuacion -= Math.min(averiasPendientes * 20, 40)

  const ultimaItv = [...itvs].sort((a, b) => b.fechaRealizada.localeCompare(a.fechaRealizada))[0]
  const fechaProximaItv = ultimaItv ? new Date(ultimaItv.fechaProxima) : calcularProximaItv(vehiculo)
  const diasItv = diasHasta(hoy, fechaProximaItv)
  if (diasItv < 0) puntuacion -= 30
  else if (diasItv <= DIAS_ANTELACION) puntuacion -= 12

  const ultimoMantPorTipo = new Map<string, Mantenimiento>()
  for (const m of mantenimientos) {
    if (!m.intervaloKm && !m.intervaloMeses) continue
    const existente = ultimoMantPorTipo.get(m.elementos)
    if (!existente || new Date(m.fecha) > new Date(existente.fecha)) {
      ultimoMantPorTipo.set(m.elementos, m)
    }
  }
  let mantVencidos = 0
  let mantProximos = 0
  for (const m of ultimoMantPorTipo.values()) {
    const fechaObjetivo = m.intervaloMeses
      ? addMeses(new Date(m.fecha), m.intervaloMeses)
      : undefined
    const kmObjetivo = m.intervaloKm ? m.km + m.intervaloKm : undefined

    const vencidoPorFecha = fechaObjetivo !== undefined && diasHasta(hoy, fechaObjetivo) < 0
    const vencidoPorKm = kmObjetivo !== undefined && kmActual >= kmObjetivo
    const proximoPorFecha =
      fechaObjetivo !== undefined && diasHasta(hoy, fechaObjetivo) <= DIAS_ANTELACION
    const proximoPorKm = kmObjetivo !== undefined && kmObjetivo - kmActual <= KM_ANTELACION

    if (vencidoPorFecha || vencidoPorKm) mantVencidos++
    else if (proximoPorFecha || proximoPorKm) mantProximos++
  }
  puntuacion -= Math.min(mantVencidos * 15, 30)
  puntuacion -= Math.min(mantProximos * 6, 12)

  const seguroVigente = [...seguros].sort((a, b) =>
    b.fechaRenovacion.localeCompare(a.fechaRenovacion),
  )[0]
  if (seguroVigente) {
    const diasSeguro = diasHasta(hoy, new Date(seguroVigente.fechaRenovacion))
    if (diasSeguro < 0) puntuacion -= 25
    else if (diasSeguro <= DIAS_ANTELACION) puntuacion -= 10
  }

  puntuacion = Math.max(0, Math.min(100, Math.round(puntuacion)))

  const nivel: NivelSalud = puntuacion >= 80 ? 'bueno' : puntuacion >= 50 ? 'atencion' : 'urgente'

  return { puntuacion, nivel }
}

function addMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha)
  resultado.setMonth(resultado.getMonth() + meses)
  return resultado
}
