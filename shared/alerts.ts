import { intervaloSugerido } from './elementos-catalogo'
import { calcularProximaItv } from './itv-rules'
import type { AlertaTipo, Elemento, Itv, Vehiculo } from './types'

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

/** Intervalo a usar para un elemento: el suyo propio si lo tiene, si no el sugerido por el catálogo para su tipo. */
function intervaloDe(e: Elemento): { km?: number; meses?: number } {
  if (e.intervaloKm || e.intervaloMeses) return { km: e.intervaloKm, meses: e.intervaloMeses }
  return intervaloSugerido(e.tipo)
}

function addMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha)
  resultado.setMonth(resultado.getMonth() + meses)
  return resultado
}

function objetivosDe(e: Elemento): { fechaObjetivo?: Date; kmObjetivo?: number } {
  const intervalo = intervaloDe(e)
  return {
    fechaObjetivo: intervalo.meses ? addMeses(new Date(e.fecha), intervalo.meses) : undefined,
    kmObjetivo: intervalo.km ? e.km + intervalo.km : undefined,
  }
}

/**
 * A partir del último elemento de cada tipo (agrupados fuera de esta
 * función) y de la ITV vigente, calcula qué alertas deben dispararse hoy.
 * No consulta Airtable ni dedupe — eso lo hace el cron-worker.
 */
export function calcularAlertasPendientes(
  hoy: Date,
  vehiculos: Vehiculo[],
  ultimoElementoPorTipo: Map<string, Elemento[]>, // vehiculoId -> último elemento de cada tipo con intervalo (propio o sugerido)
  ultimaItvPorVehiculo: Map<string, Itv | undefined>,
): AlertaPendiente[] {
  const alertas: AlertaPendiente[] = []

  for (const vehiculo of vehiculos) {
    const kmActual = vehiculo.kmActual

    for (const e of ultimoElementoPorTipo.get(vehiculo.matricula) ?? []) {
      const { fechaObjetivo, kmObjetivo } = objetivosDe(e)

      if (estaProxima(hoy, kmActual, fechaObjetivo, kmObjetivo)) {
        alertas.push({
          tipo: 'Elemento',
          referenciaId: e.id,
          vehiculo,
          titulo: `Próximo cambio: ${e.tipo}`,
          detalle: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.matricula})`,
        })
      }
    }

    const ultimaItv = ultimaItvPorVehiculo.get(vehiculo.matricula)
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

export interface ProximaTarea {
  tipo: 'Elemento' | 'ITV'
  titulo: string
  fechaObjetivo?: Date
  kmObjetivo?: number
  urgente: boolean
}

/**
 * Próximas tareas (elementos con intervalo, e ITV) de un único vehículo,
 * para mostrar en su ficha — mismo cálculo que `calcularAlertasPendientes`,
 * pero sin filtrar por "está a punto de vencer": aquí se devuelven todas,
 * marcando `urgente` cuando entran en la ventana de aviso (30 días o
 * 1.000 km).
 */
export function calcularProximasTareas(
  hoy: Date,
  vehiculo: Vehiculo,
  elementos: Elemento[],
  itvs: Itv[],
): ProximaTarea[] {
  const kmActual = vehiculo.kmActual
  const tareas: ProximaTarea[] = []

  const ultimoPorTipo = new Map<string, Elemento>()
  for (const e of elementos) {
    const existente = ultimoPorTipo.get(e.tipo)
    if (!existente || new Date(e.fecha) > new Date(existente.fecha)) {
      ultimoPorTipo.set(e.tipo, e)
    }
  }
  for (const e of ultimoPorTipo.values()) {
    const { fechaObjetivo, kmObjetivo } = objetivosDe(e)
    if (!fechaObjetivo && !kmObjetivo) continue
    tareas.push({
      tipo: 'Elemento',
      titulo: e.tipo,
      fechaObjetivo,
      kmObjetivo,
      urgente: estaProxima(hoy, kmActual, fechaObjetivo, kmObjetivo),
    })
  }

  const ultimaItv = [...itvs].sort((a, b) => b.fechaRealizada.localeCompare(a.fechaRealizada))[0]
  const fechaProximaItv = ultimaItv ? new Date(ultimaItv.fechaProxima) : calcularProximaItv(vehiculo)
  tareas.push({
    tipo: 'ITV',
    titulo: 'ITV',
    fechaObjetivo: fechaProximaItv,
    urgente: estaProxima(hoy, kmActual, fechaProximaItv, undefined),
  })

  return tareas.sort((a, b) => {
    if (!a.fechaObjetivo || !b.fechaObjetivo) return 0
    return a.fechaObjetivo.getTime() - b.fechaObjetivo.getTime()
  })
}

export interface SaludElemento {
  tipo: string
  ultimaFecha: string
  ultimoKm: number
  intervaloKm?: number
  intervaloMeses?: number
  /** 0–1: 1 justo tras el cambio, 0 al llegar (o pasar) el intervalo. null si no hay intervalo (propio ni sugerido) para calcularlo. */
  salud: number | null
}

/**
 * Salud (0–100%) de cada tipo de elemento que el vehículo tiene registrado
 * al menos una vez: 100% recién cambiado, bajando según se acerca (o ya
 * pasó) su intervalo — el que antes cumpla de los dos ejes, km o meses.
 * Usa el intervalo propio del último registro si lo tiene, si no el
 * sugerido por el catálogo para ese tipo.
 */
export function calcularSaludElementos(
  hoy: Date,
  kmActual: number,
  elementos: Elemento[],
): SaludElemento[] {
  const ultimoPorTipo = new Map<string, Elemento>()
  for (const e of elementos) {
    const existente = ultimoPorTipo.get(e.tipo)
    if (!existente || new Date(e.fecha) > new Date(existente.fecha)) {
      ultimoPorTipo.set(e.tipo, e)
    }
  }

  return [...ultimoPorTipo.values()]
    .map((e): SaludElemento => {
      const intervalo = intervaloDe(e)
      const porcentajes: number[] = []

      if (intervalo.km) {
        porcentajes.push(1 - (kmActual - e.km) / intervalo.km)
      }
      if (intervalo.meses) {
        const mesesTranscurridos =
          (hoy.getTime() - new Date(e.fecha).getTime()) / 86_400_000 / 30.437
        porcentajes.push(1 - mesesTranscurridos / intervalo.meses)
      }

      return {
        tipo: e.tipo,
        ultimaFecha: e.fecha,
        ultimoKm: e.km,
        intervaloKm: intervalo.km,
        intervaloMeses: intervalo.meses,
        salud: porcentajes.length > 0 ? Math.max(0, Math.min(1, Math.min(...porcentajes))) : null,
      }
    })
    .sort((a, b) => a.tipo.localeCompare(b.tipo, 'es'))
}
