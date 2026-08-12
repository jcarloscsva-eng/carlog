import { DIAS_ANTELACION, KM_ANTELACION } from './alerts'
import { intervaloSugerido } from './elementos-catalogo'
import { calcularProximaItv } from './itv-rules'
import type { Averia, Elemento, Itv, Seguro, Vehiculo } from './types'

/** Grave = algo ya vencido. Leve = algo por vencer. Uso interno de clasificarVencimiento. */
type NivelAviso = 'leve' | 'grave'

/**
 * Urgencia en la agenda: además de lo vencido y lo que está por vencer
 * (los dos niveles del globo), incluye lo que está simplemente programado
 * más adelante — útil para planificar, pero que no debe contar como aviso.
 */
export type UrgenciaAgenda = 'vencida' | 'pronto' | 'programada'

/** De qué parte de la ficha sale el aviso, para poder enlazar a su pestaña. */
export type CategoriaAviso = 'itv' | 'seguro' | 'averia' | 'elemento'

export interface AgendaItem {
  urgencia: UrgenciaAgenda
  categoria: CategoriaAviso
  titulo: string
  detalle: string
  /** Días hasta el objetivo, redondeados; negativo si ya pasó. null si solo vence por km. */
  dias: number | null
  /** Km que faltan para el objetivo; negativo si ya se pasaron. null si solo vence por fecha. */
  kmRestantes: number | null
}

/** Horizonte por defecto de la agenda: lo que cabe en un trimestre. */
export const DIAS_HORIZONTE_AGENDA = 90

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

function formateaFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-ES')
}

/** Métricas de "cuánto falta" comunes a cualquier vencimiento. */
function restantes(
  hoy: Date,
  kmActual: number,
  fechaObjetivo?: Date,
  kmObjetivo?: number,
): { dias: number | null; kmRestantes: number | null } {
  return {
    dias: fechaObjetivo !== undefined ? Math.round(diasHasta(hoy, fechaObjetivo)) : null,
    kmRestantes: kmObjetivo !== undefined ? kmObjetivo - kmActual : null,
  }
}

/**
 * ¿Entra en el horizonte de la agenda aunque todavía no sea un aviso?
 * Solo por fecha: un objetivo por km no tiene forma fiable de traducirse a
 * días sin conocer el uso real del vehículo.
 */
function dentroDelHorizonte(
  hoy: Date,
  diasHorizonte: number,
  fechaObjetivo?: Date,
): boolean {
  return fechaObjetivo !== undefined && diasHasta(hoy, fechaObjetivo) <= diasHorizonte
}

const ORDEN_URGENCIA: Record<UrgenciaAgenda, number> = { vencida: 0, pronto: 1, programada: 2 }

/**
 * Todo lo que este vehículo tiene por delante dentro del horizonte dado:
 * lo vencido, lo que está por vencer y lo simplemente programado, con su
 * motivo en texto y cuánto falta. Es la fuente única de la que sale tanto
 * la agenda del garaje como "Lo que viene" del Pasaporte.
 *
 * No consulta nada: trabaja sobre datos ya cargados en pantalla.
 */
export function listarAgenda(
  hoy: Date,
  vehiculo: Vehiculo,
  averias: Averia[],
  elementos: Elemento[],
  itvs: Itv[],
  seguros: Seguro[],
  diasHorizonte: number = DIAS_HORIZONTE_AGENDA,
): AgendaItem[] {
  const kmActual = vehiculo.kmActual
  const items: AgendaItem[] = []

  // Una avería sin resolver es algo que ya está pasando, no algo que se acerca.
  for (const a of averias) {
    if (a.estado === 'Pendiente') {
      items.push({
        urgencia: 'vencida',
        categoria: 'averia',
        titulo: 'Avería pendiente',
        detalle: a.descripcion,
        dias: null,
        kmRestantes: null,
      })
    }
  }

  const ultimaItv = [...itvs].sort((a, b) => b.fechaRealizada.localeCompare(a.fechaRealizada))[0]
  const fechaProximaItv = ultimaItv ? new Date(ultimaItv.fechaProxima) : calcularProximaItv(vehiculo)
  const nivelItv = clasificarVencimiento(hoy, kmActual, fechaProximaItv, undefined)
  if (nivelItv || dentroDelHorizonte(hoy, diasHorizonte, fechaProximaItv)) {
    const vencida = nivelItv === 'grave'
    items.push({
      urgencia: nivelItv === 'grave' ? 'vencida' : nivelItv === 'leve' ? 'pronto' : 'programada',
      categoria: 'itv',
      titulo: 'ITV',
      detalle: `${vencida ? 'Caducó el' : 'Vence el'} ${formateaFecha(fechaProximaItv)}`,
      ...restantes(hoy, kmActual, fechaProximaItv, undefined),
    })
  }

  const seguroVigente = [...seguros].sort((a, b) =>
    b.fechaRenovacion.localeCompare(a.fechaRenovacion),
  )[0]
  if (seguroVigente) {
    const fechaRenovacion = new Date(seguroVigente.fechaRenovacion)
    const nivelSeguro = clasificarVencimiento(hoy, kmActual, fechaRenovacion, undefined)
    if (nivelSeguro || dentroDelHorizonte(hoy, diasHorizonte, fechaRenovacion)) {
      const vencido = nivelSeguro === 'grave'
      items.push({
        urgencia: nivelSeguro === 'grave' ? 'vencida' : nivelSeguro === 'leve' ? 'pronto' : 'programada',
        categoria: 'seguro',
        titulo: 'Seguro',
        detalle: `${vencido ? 'Caducó el' : 'Renueva el'} ${formateaFecha(fechaRenovacion)}`,
        ...restantes(hoy, kmActual, fechaRenovacion, undefined),
      })
    }
  }

  const elementosVigentes = ultimoPorTipo(elementos, (e) => e.tipo, (e) => e.fecha)
  for (const e of elementosVigentes) {
    const intervalo = e.intervaloKm || e.intervaloMeses
      ? { km: e.intervaloKm, meses: e.intervaloMeses }
      : intervaloSugerido(e.tipo)
    if (!intervalo.km && !intervalo.meses) continue

    const fechaObjetivo = intervalo.meses ? addMeses(new Date(e.fecha), intervalo.meses) : undefined
    const kmObjetivo = intervalo.km ? e.km + intervalo.km : undefined
    const nivel = clasificarVencimiento(hoy, kmActual, fechaObjetivo, kmObjetivo)
    if (!nivel && !dentroDelHorizonte(hoy, diasHorizonte, fechaObjetivo)) continue

    const vencidoPorKm = kmObjetivo !== undefined && kmActual >= kmObjetivo
    const partes = [
      fechaObjetivo ? `${nivel === 'grave' && diasHasta(hoy, fechaObjetivo) < 0 ? 'Caducó el' : 'Toca el'} ${formateaFecha(fechaObjetivo)}` : null,
      kmObjetivo ? `${vencidoPorKm ? 'ya pasados' : 'a'} ${kmObjetivo.toLocaleString('es-ES')} km` : null,
    ].filter(Boolean)

    items.push({
      urgencia: nivel === 'grave' ? 'vencida' : nivel === 'leve' ? 'pronto' : 'programada',
      categoria: 'elemento',
      titulo: e.tipo,
      detalle: partes.join(' · '),
      ...restantes(hoy, kmActual, fechaObjetivo, kmObjetivo),
    })
  }

  return items.sort((a, b) => {
    const porUrgencia = ORDEN_URGENCIA[a.urgencia] - ORDEN_URGENCIA[b.urgencia]
    if (porUrgencia !== 0) return porUrgencia
    // Dentro de la misma urgencia, primero lo que antes toca. Lo que solo
    // vence por km va al final del grupo: no se puede fechar.
    if (a.dias === null && b.dias === null) return 0
    if (a.dias === null) return 1
    if (b.dias === null) return -1
    return a.dias - b.dias
  })
}
