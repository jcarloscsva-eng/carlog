import { useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Averia, Elemento, Itv, Parte, Seguro, Vehiculo } from '@shared/types'
import type { ProximaTarea } from '@shared/alerts'
import { calcularAniosPropiedad } from '@shared/linea-propiedad'
import { IconAveria, IconItv, IconMantenimiento, IconSeguro, IconVehiculo } from '../Icons'
import { LineaPropiedad } from '../LineaPropiedad'

type TipoEvento = 'origen' | 'elemento' | 'itv' | 'averia' | 'seguro' | 'parte' | 'futuro'

interface Evento {
  fecha: string
  tipo: TipoEvento
  titulo: string
  detalle?: string
  importe?: number
  km?: number
}

const ICONOS: Record<TipoEvento, typeof IconVehiculo> = {
  origen: IconVehiculo,
  elemento: IconMantenimiento,
  itv: IconItv,
  averia: IconAveria,
  seguro: IconSeguro,
  parte: IconSeguro,
  futuro: IconItv,
}

const euros = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

function formateaFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

/**
 * El historial completo del vehículo en una única línea de tiempo, de la
 * compra a lo que viene: mantenimientos, repuestos, ITV, averías y seguro
 * mezclados y ordenados por fecha. No pide nada nuevo al servidor —
 * reutiliza lo que la ficha ya tiene cargado.
 */
export function PasaporteTab({
  vehiculo,
  averias,
  elementos,
  itvs,
  seguros,
  partes,
  proximasTareas,
}: {
  vehiculo: Vehiculo
  averias: Averia[]
  elementos: Elemento[]
  itvs: Itv[]
  seguros: Seguro[]
  partes: Parte[]
  proximasTareas: ProximaTarea[]
}) {
  const eventos = useMemo<Evento[]>(() => {
    const lista: Evento[] = []

    lista.push(
      vehiculo.fechaCompra
        ? { fecha: vehiculo.fechaCompra, tipo: 'origen', titulo: 'Lo compraste', detalle: `${vehiculo.marca} ${vehiculo.modelo} · ${vehiculo.matricula}` }
        : { fecha: `${vehiculo.anio}-01-01`, tipo: 'origen', titulo: `Matriculado en ${vehiculo.anio}`, detalle: `${vehiculo.marca} ${vehiculo.modelo} · ${vehiculo.matricula}` },
    )

    for (const e of elementos) {
      lista.push({
        fecha: e.fecha,
        tipo: 'elemento',
        titulo: e.tipo,
        detalle: e.tienda,
        importe: e.precio,
        km: e.km,
      })
    }
    for (const i of itvs) {
      lista.push({ fecha: i.fechaRealizada, tipo: 'itv', titulo: 'ITV', detalle: i.resultado })
    }
    for (const a of averias) {
      lista.push({ fecha: a.fecha, tipo: 'averia', titulo: a.descripcion, detalle: `Avería · ${a.estado}` })
    }
    for (const s of seguros) {
      lista.push({
        fecha: s.fechaInicio,
        tipo: 'seguro',
        titulo: `Póliza con ${s.compania}`,
        detalle: s.tipoCobertura,
        importe: s.precio,
      })
    }
    for (const p of partes) {
      lista.push({
        fecha: p.fecha,
        tipo: 'parte',
        titulo: `Parte: ${p.tipo}`,
        detalle: `${p.descripcion} · ${p.estado}`,
        importe: p.coste,
      })
    }

    return lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [vehiculo, averias, elementos, itvs, seguros, partes])

  const costeTotal = useMemo(
    () => eventos.reduce((suma, e) => suma + (e.importe ?? 0), 0),
    [eventos],
  )

  // Varios elementos cambiados en la misma visita comparten visitaId y
  // cuentan como una sola intervención en el taller, no una por elemento.
  const intervenciones = new Set(elementos.map((e) => e.visitaId || e.id)).size

  const futuros = useMemo(
    () =>
      proximasTareas
        .filter((t) => t.fechaObjetivo || t.kmObjetivo)
        .map((t) => ({
          clave: `${t.tipo}-${t.titulo}`,
          titulo: t.tipo === 'ITV' ? 'Próxima ITV' : `Próximo: ${t.titulo}`,
          detalle: [
            t.fechaObjetivo?.toLocaleDateString('es-ES'),
            t.kmObjetivo ? `${t.kmObjetivo.toLocaleString('es-ES')} km` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          urgente: t.urgente,
        })),
    [proximasTareas],
  )

  const aniosPropiedad = useMemo(
    () => calcularAniosPropiedad(new Date(), vehiculo, averias, elementos, itvs, seguros, partes),
    [vehiculo, averias, elementos, itvs, seguros, partes],
  )

  // Agrupamos por año: es como se lee la vida de un coche.
  const porAnio = useMemo(() => {
    const mapa = new Map<string, Evento[]>()
    for (const e of eventos) {
      const anio = e.fecha.slice(0, 4)
      mapa.set(anio, [...(mapa.get(anio) ?? []), e])
    }
    return [...mapa.entries()]
  }, [eventos])

  function exportarPdf() {
    const doc = new jsPDF()
    // Colores de Carlog: el PDF se enseña a terceros (p. ej. al vender el
    // coche), así que no debería salir con el azul por defecto de jspdf.
    const estiloTabla = {
      headStyles: { fillColor: [161, 51, 40] as [number, number, number], textColor: 255 },
      alternateRowStyles: { fillColor: [251, 247, 238] as [number, number, number] },
      styles: {
        textColor: [58, 53, 46] as [number, number, number],
        lineColor: [222, 210, 184] as [number, number, number],
      },
    }
    const titulo = `${vehiculo.marca} ${vehiculo.modelo}`

    doc.setFontSize(14)
    doc.setTextColor(161, 51, 40)
    doc.text(`Carlog — Pasaporte de ${titulo}`, 14, 16)
    doc.setTextColor(58, 53, 46)
    doc.setFontSize(10)
    doc.text(
      `${vehiculo.matricula} · ${vehiculo.anio} · ${vehiculo.tipo} · ${vehiculo.kmActual.toLocaleString('es-ES')} km`,
      14,
      23,
    )
    doc.text(
      `Gasto registrado: ${euros(costeTotal)} · ${intervenciones} ${intervenciones === 1 ? 'intervención' : 'intervenciones'} en taller`,
      14,
      29,
    )

    autoTable(doc, {
      ...estiloTabla,
      startY: 36,
      head: [['Fecha', 'Concepto', 'Detalle', 'Km', 'Importe (€)']],
      body: eventos.map((e) => [
        e.fecha,
        e.titulo,
        e.detalle ?? '',
        e.km !== undefined ? e.km.toLocaleString('es-ES') : '',
        e.importe !== undefined && e.importe > 0 ? e.importe.toFixed(2) : '',
      ]),
    })

    if (futuros.length > 0) {
      autoTable(doc, {
        ...estiloTabla,
        head: [['Lo que viene', 'Previsto']],
        body: futuros.map((f) => [f.titulo, f.detalle]),
      })
    }

    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-ES')} — refleja lo registrado en Carlog.`,
      14,
      doc.internal.pageSize.getHeight() - 10,
    )

    doc.save(`carlog-pasaporte-${vehiculo.matricula.replace(/\s+/g, '')}.pdf`)
  }

  return (
    <div>
      <LineaPropiedad anios={aniosPropiedad} />
      <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-dim">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-olive)' }} />
          Elemento
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-stamp)' }} />
          Avería
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-itv)' }} />
          ITV
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-4 rounded-full opacity-55" style={{ background: 'var(--color-ink-dim)' }} />
          Cobertura de seguro
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-4" style={{ background: 'var(--color-stamp)' }} />
          Gasto acumulado
        </span>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="font-display text-2xl font-semibold text-ink-bright">{euros(costeTotal)}</p>
          <p className="text-xs text-ink-dim">Gasto registrado</p>
        </div>
        <div className="panel p-4">
          <p className="font-display text-2xl font-semibold text-ink-bright">{intervenciones}</p>
          <p className="text-xs text-ink-dim">
            {intervenciones === 1 ? 'Intervención' : 'Intervenciones'} en taller
          </p>
        </div>
        <div className="panel p-4">
          <p className="font-display text-2xl font-semibold text-ink-bright">
            {vehiculo.kmActual.toLocaleString('es-ES')}
          </p>
          <p className="text-xs text-ink-dim">Kilómetros actuales</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-xs text-ink-dim">
          El gasto suma mantenimientos, repuestos, partes y pólizas registradas. Solo refleja lo
          que has ido apuntando aquí.
        </p>
        <button onClick={exportarPdf} className="btn-ghost shrink-0 text-sm">
          Exportar PDF
        </button>
      </div>

      {porAnio.map(([anio, delAnio]) => (
        <div key={anio} className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-display text-lg font-semibold text-stamp">{anio}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <ul className="space-y-2">
            {delAnio.map((e, i) => {
              const Icon = ICONOS[e.tipo]
              return (
                <li key={`${e.fecha}-${e.titulo}-${i}`} className="entry flex items-start gap-3 p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-bright">{e.titulo}</p>
                    <p className="text-xs text-ink-dim">
                      {formateaFecha(e.fecha)}
                      {e.km !== undefined && ` · ${e.km.toLocaleString('es-ES')} km`}
                      {e.detalle && ` · ${e.detalle}`}
                    </p>
                  </div>
                  {e.importe !== undefined && e.importe > 0 && (
                    <span className="shrink-0 text-sm font-medium text-stamp">{euros(e.importe)}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {futuros.length > 0 && (
        <div className="mb-2">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-display text-lg font-semibold text-ink-dim">Lo que viene</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <ul className="space-y-2">
            {futuros.map((f) => (
              <li
                key={f.clave}
                className="flex items-start gap-3 rounded-md border border-dashed border-line p-3"
              >
                <IconItv className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{f.titulo}</p>
                  <p className={`text-xs ${f.urgente ? 'font-medium text-amber-700' : 'text-ink-dim'}`}>
                    {f.detalle}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
