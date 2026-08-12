import { Link } from 'react-router-dom'
import type { AgendaItem, CategoriaAviso, UrgenciaAgenda } from '@shared/avisos'
import { IconAveria, IconItv, IconMantenimiento, IconSeguro } from './Icons'

/**
 * Una fila de la agenda: qué toca, por qué, cuánto falta y cómo
 * resolverlo. Se usa igual en el garaje (con el nombre del vehículo) y en
 * el Pasaporte de una ficha concreta (sin él, porque ya está en la
 * cabecera).
 *
 * El borde izquierdo codifica la urgencia con los mismos tokens del resto
 * de la app: stamp lo vencido, gold lo próximo, itv lo programado.
 */

const BORDE: Record<UrgenciaAgenda, string> = {
  vencida: 'var(--color-stamp)',
  pronto: 'var(--color-gold)',
  programada: 'var(--color-itv)',
}

const TEXTO_URGENCIA: Record<UrgenciaAgenda, string> = {
  vencida: 'text-stamp',
  pronto: 'text-gold',
  programada: 'text-itv',
}

const FONDO_PILDORA: Record<UrgenciaAgenda, string> = {
  vencida: 'bg-stamp-soft',
  pronto: 'bg-gold-soft',
  programada: 'bg-itv-soft',
}

const ICONOS: Record<CategoriaAviso, typeof IconItv> = {
  itv: IconItv,
  seguro: IconSeguro,
  averia: IconAveria,
  elemento: IconMantenimiento,
}

/** A qué pestaña de la ficha lleva resolver cada tipo de aviso, y con qué verbo. */
const ACCION: Record<CategoriaAviso, { tab: string; etiqueta: string }> = {
  itv: { tab: 'ITV', etiqueta: 'Registrar ITV' },
  seguro: { tab: 'Seguro', etiqueta: 'Renovar póliza' },
  averia: { tab: 'Averías', etiqueta: 'Ver avería' },
  elemento: { tab: 'Mantenimiento', etiqueta: 'Anotar cambio' },
}

/** "Vencida" / "Pronto" / "En 64 días" — o en km cuando no hay fecha. */
export function textoPildora(item: AgendaItem): string {
  if (item.urgencia === 'vencida') return 'Vencida'
  if (item.dias !== null) {
    if (item.dias <= 0) return 'Hoy'
    if (item.dias === 1) return 'Mañana'
    return `En ${item.dias} días`
  }
  if (item.kmRestantes !== null && item.kmRestantes > 0) {
    return `En ${item.kmRestantes.toLocaleString('es-ES')} km`
  }
  return 'Pronto'
}

/**
 * El aviso más urgente resumido en una línea, para el pie de la tarjeta de
 * vehículo. Se usa forma verbal ("venció") y no adjetivo ("vencida") a
 * propósito: el título es el nombre del elemento y puede ser masculino o
 * femenino ("Aceite", "ITV"), así que un adjetivo concordaría mal la mitad
 * de las veces.
 */
export function resumenCorto(item: AgendaItem): string {
  if (item.urgencia === 'vencida') {
    if (item.dias !== null && item.dias < 0) {
      const dias = Math.abs(item.dias)
      return `${item.titulo}: venció hace ${dias} ${dias === 1 ? 'día' : 'días'}`
    }
    if (item.kmRestantes !== null && item.kmRestantes <= 0) {
      return `${item.titulo}: ya pasados ${Math.abs(item.kmRestantes).toLocaleString('es-ES')} km`
    }
    return `${item.titulo}: pendiente`
  }
  return `${item.titulo}: ${textoPildora(item).toLowerCase()}`
}

export function AgendaFila({
  item,
  vehiculoId,
  vehiculoNombre,
  matricula,
}: {
  item: AgendaItem
  /** Sin id no se pinta la acción: no hay adónde llevar al usuario. */
  vehiculoId?: string
  /** Solo en el garaje: en la ficha el vehículo ya se sabe cuál es. */
  vehiculoNombre?: string
  matricula?: string
}) {
  const Icon = ICONOS[item.categoria]
  const accion = ACCION[item.categoria]
  const subtitulo = [item.detalle, matricula].filter(Boolean).join(' · ')

  return (
    <li
      className="flex items-center gap-3 rounded-md border border-line bg-paper-2 p-3"
      style={{ borderLeftWidth: '3px', borderLeftColor: BORDE[item.urgencia] }}
    >
      <Icon className={`h-4 w-4 shrink-0 ${TEXTO_URGENCIA[item.urgencia]}`} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink-bright">
          {item.titulo}
          {vehiculoNombre && <span className="text-ink-dim"> — {vehiculoNombre}</span>}
        </p>
        <p className="truncate text-xs text-ink-dim">{subtitulo}</p>
      </div>

      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-medium whitespace-nowrap ${FONDO_PILDORA[item.urgencia]} ${TEXTO_URGENCIA[item.urgencia]}`}
      >
        {textoPildora(item)}
      </span>

      {vehiculoId && (
        <Link
          to={`/vehiculos/${vehiculoId}?tab=${encodeURIComponent(accion.tab)}`}
          className="hidden shrink-0 text-xs font-medium text-ink-dim whitespace-nowrap transition hover:text-stamp sm:inline"
        >
          {accion.etiqueta} →
        </Link>
      )}
    </li>
  )
}
