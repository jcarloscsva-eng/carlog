import { calcularProximaItv } from './itv-rules'
import type { AlertaTipo, Itv, Mantenimiento, Repuesto, Vehiculo } from './types'

export const DIAS_ANTELACION = 30
export const KM_ANTELACION = 1000

export interface AlertaPendiente {
  tipo: AlertaTipo
  referenciaId: string
  vehiculo: Vehiculo
  titulo: string
  detalle: string
}

function estaProxima(
  hoy: Date,
  kmActual: number,
  fechaObjetivo?: Date,
  kmObjetivo?: number,
): boolean {
  const dueByFecha =
    fechaObjetivo !== undefined &&
    (fechaObjetivo.getTime() - hoy.getTime()) / 86_400_000 <= DIAS_ANTELACION

  const dueByKm = kmObjetivo !== undefined && kmObjetivo - kmActual <= KM_ANTELACION

  return dueByFecha || dueByKm
}

/**
 * A partir del último mantenimiento/repuesto de cada tipo (agrupados fuera
 * de esta función) y de la ITV vigente, calcula qué alertas deben dispararse
 * hoy. No consulta Airtable ni dedupe — eso lo hace el cron-worker.
 */
export function calcularAlertasPendientes(
  hoy: Date,
  vehiculos: Vehiculo[],
  ultimoMantenimientoConIntervalo: Map<string, Mantenimiento[]>, // vehiculoId -> mantenimientos con intervalo, uno por "tipo" (elementos)
  ultimoRepuestoPorTipo: Map<string, Repuesto[]>, // vehiculoId -> último repuesto de cada tipo con vida útil
  ultimaItvPorVehiculo: Map<string, Itv | undefined>,
): AlertaPendiente[] {
  const alertas: AlertaPendiente[] = []

  for (const vehiculo of vehiculos) {
    const kmActual = vehiculo.kmActual

    for (const m of ultimoMantenimientoConIntervalo.get(vehiculo.id) ?? []) {
      const fechaObjetivo = m.intervaloMeses
        ? addMeses(new Date(m.fecha), m.intervaloMeses)
        : undefined
      const kmObjetivo = m.intervaloKm ? m.km + m.intervaloKm : undefined

      if (estaProxima(hoy, kmActual, fechaObjetivo, kmObjetivo)) {
        alertas.push({
          tipo: 'Mantenimiento',
          referenciaId: m.id,
          vehiculo,
          titulo: `Próximo mantenimiento: ${m.elementos}`,
          detalle: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.matricula})`,
        })
      }
    }

    for (const r of ultimoRepuestoPorTipo.get(vehiculo.id) ?? []) {
      const fechaObjetivo = r.vidaUtilAnios
        ? addMeses(new Date(r.fecha), r.vidaUtilAnios * 12)
        : undefined
      const kmObjetivo = r.vidaUtilKm ? r.km + r.vidaUtilKm : undefined

      if (estaProxima(hoy, kmActual, fechaObjetivo, kmObjetivo)) {
        alertas.push({
          tipo: 'Repuesto',
          referenciaId: r.id,
          vehiculo,
          titulo: `Repuesto próximo a caducar: ${r.tipoRepuesto}`,
          detalle: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.matricula})`,
        })
      }
    }

    const ultimaItv = ultimaItvPorVehiculo.get(vehiculo.id)
    const fechaProximaItv = ultimaItv
      ? new Date(ultimaItv.fechaProxima)
      : calcularProximaItv(vehiculo)

    if (estaProxima(hoy, kmActual, fechaProximaItv, undefined)) {
      alertas.push({
        tipo: 'ITV',
        referenciaId: ultimaItv?.id ?? `${vehiculo.id}-primera-itv`,
        vehiculo,
        titulo: 'Próxima ITV',
        detalle: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.matricula}) — ${fechaProximaItv.toLocaleDateString('es-ES')}`,
      })
    }
  }

  return alertas
}

function addMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha)
  resultado.setMonth(resultado.getMonth() + meses)
  return resultado
}
