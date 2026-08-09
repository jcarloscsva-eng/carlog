import { useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Averia, Itv, Mantenimiento, Parte, Repuesto, Seguro, Vehiculo } from '@shared/types'
import type { ProximaTarea } from '@shared/alerts'
import { IconAveria, IconItv, IconMantenimiento, IconRepuesto, IconSeguro, IconVehiculo } from '../Icons'
import { Modal } from '../Modal'
import { api } from '../../lib/api'

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

  // En la vista pública el vehículo llega sin id: ahí no se comparte.
  const puedeCompartir = Boolean(vehiculo.id)
  const [compartiendo, setCompartiendo] = useState(false)
  const [dias, setDias] = useState(30)
  const [enlace, setEnlace] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [errorEnlace, setErrorEnlace] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function generarEnlace() {
    setGenerando(true)
    setErrorEnlace(null)
    try {
      const res = await api.compartir.crear(vehiculo.id, dias)
      setEnlace(res.url)
    } catch (err) {
      setErrorEnlace((err as Error).message)
    } finally {
      setGenerando(false)
    }
  }

  async function copiarEnlace() {
    if (!enlace) return
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErrorEnlace('No se pudo copiar; selecciona el enlace y cópialo a mano.')
    }
  }

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
        <div className="flex shrink-0 gap-2">
          {puedeCompartir && (
            <button onClick={() => setCompartiendo(true)} className="btn-ghost text-sm">
              Compartir
            </button>
          )}
          <button onClick={exportarPdf} className="btn-ghost text-sm">
            Exportar PDF
          </button>
        </div>
      </div>

      <Modal
        open={compartiendo}
        onClose={() => {
          setCompartiendo(false)
          setEnlace(null)
          setErrorEnlace(null)
        }}
        title="Compartir historial"
      >
        <p className="mb-4 text-sm text-ink-dim">
          Genera un enlace de solo lectura con el historial de este vehículo — útil al venderlo.
          Quien lo reciba no necesita cuenta y no verá tus datos ni tus otros vehículos.
        </p>

        {!enlace && (
          <>
            <label className="mb-1 block text-xs text-ink-dim">Válido durante</label>
            <select
              className="input mb-4"
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
            <button onClick={generarEnlace} disabled={generando} className="btn-primary w-full">
              {generando ? 'Generando…' : 'Generar enlace'}
            </button>
          </>
        )}

        {enlace && (
          <>
            <p className="mb-1 text-xs text-ink-dim">Enlace generado</p>
            <input readOnly value={enlace} className="input mb-3 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <button onClick={copiarEnlace} className="btn-primary w-full">
              {copiado ? 'Copiado' : 'Copiar enlace'}
            </button>
            <p className="mt-3 text-xs text-ink-dim">
              Caduca a los {dias} días. No se puede anular antes de tiempo, así que comparte solo
              con quien quieras.
            </p>
          </>
        )}

        {errorEnlace && <p className="mt-3 text-sm text-red-700">{errorEnlace}</p>}
      </Modal>

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
