import { useMemo } from 'react'
import type { Averia, Itv, Mantenimiento, Parte, Repuesto, Seguro, Vehiculo } from '@shared/types'
import type { ProximaTarea } from '@shared/alerts'
import { IconAveria, IconItv, IconMantenimiento, IconRepuesto, IconSeguro, IconVehiculo } from '../Icons'

type TipoEvento = 'origen' | 'mantenimiento' | 'repuesto' | 'itv' | 'averia' | 'seguro' | 'parte' | 'futuro'

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
  mantenimiento: IconMantenimiento,
  repuesto: IconRepuesto,
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
  mantenimientos,
  repuestos,
  itvs,
  seguros,
  partes,
  proximasTareas,
}: {
  vehiculo: Vehiculo
  averias: Averia[]
  mantenimientos: Mantenimiento[]
  repuestos: Repuesto[]
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

    for (const m of mantenimientos) {
      lista.push({
        fecha: m.fecha,
        tipo: 'mantenimiento',
        titulo: m.elementos,
        detalle: m.tienda,
        importe: m.precio,
        km: m.km,
      })
    }
    for (const r of repuestos) {
      lista.push({
        fecha: r.fecha,
        tipo: 'repuesto',
        titulo: r.tipoRepuesto,
        detalle: r.tienda,
        importe: r.precio,
        km: r.km,
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
  }, [vehiculo, averias, mantenimientos, repuestos, itvs, seguros, partes])

  const costeTotal = useMemo(
    () => eventos.reduce((suma, e) => suma + (e.importe ?? 0), 0),
    [eventos],
  )

  const intervenciones = mantenimientos.length + repuestos.length

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

  // Agrupamos por año: es como se lee la vida de un coche.
  const porAnio = useMemo(() => {
    const mapa = new Map<string, Evento[]>()
    for (const e of eventos) {
      const anio = e.fecha.slice(0, 4)
      mapa.set(anio, [...(mapa.get(anio) ?? []), e])
    }
    return [...mapa.entries()]
  }, [eventos])

  return (
    <div>
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

      <p className="mb-5 text-xs text-ink-dim">
        El gasto suma mantenimientos, repuestos, partes y pólizas registradas. Solo refleja lo
        que has ido apuntando aquí.
      </p>

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
