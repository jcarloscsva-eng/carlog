import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { Modal } from '../components/Modal'
import { MarcaModeloFields } from '../components/MarcaModeloFields'
import { AgendaFila, resumenCorto } from '../components/AgendaFila'
import { calcularAntiguedad } from '@shared/vehiculo'
import { listarAgenda, type AgendaItem } from '@shared/avisos'
import type { Vehiculo, VehiculoTipo } from '@shared/types'

const TIPOS: VehiculoTipo[] = ['Turismo', 'Moto', 'Furgoneta']

const PALABRAS = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']

/** "Dos cosas piden atención" se lee mejor que "2 cosas". A partir de diez, cifra. */
function enPalabras(n: number): string {
  return n < PALABRAS.length ? PALABRAS[n] : String(n)
}

function diasDesde(iso: string, hoy: Date): number | null {
  if (!iso) return null
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  return Math.floor((hoy.getTime() - fecha.getTime()) / 86_400_000)
}

function textoUltimaLectura(dias: number | null): string {
  if (dias === null) return 'sin kilometraje anotado'
  if (dias <= 0) return 'último kilometraje anotado hoy'
  if (dias === 1) return 'último kilometraje anotado ayer'
  return `último kilometraje anotado hace ${dias} días`
}

/**
 * La cabecera responde a una sola pregunta: ¿tengo que hacer algo? Antes
 * repetía los mismos números en tres chips (vehículos, km totales,
 * próximas) — y la suma de kilómetros de todo el garaje no es un dato con
 * el que nadie decida nada.
 */
function ResumenHero({
  totalVehiculos,
  pendientes,
  diasUltimaLectura,
  hrefAnotarKm,
  onAñadir,
  añadiendo,
}: {
  totalVehiculos: number
  pendientes: number
  diasUltimaLectura: number | null
  hrefAnotarKm: string
  onAñadir: () => void
  añadiendo: boolean
}) {
  const titular =
    pendientes === 0
      ? 'Todo al día'
      : `${enPalabras(pendientes).replace(/^./, (c) => c.toUpperCase())} ${
          pendientes === 1 ? 'cosa pide' : 'cosas piden'
        } atención`

  return (
    <div className="dark-hero mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <svg className="dark-hero-ghost" viewBox="0 0 57 64" aria-hidden="true">
        <path
          d="M 48.1 45.5 A 21 21 0 1 1 48.1 18.5"
          fill="none"
          stroke="#f4eee1"
          strokeWidth={9}
          strokeLinecap="round"
        />
      </svg>
      <div className="relative flex items-center gap-3">
        <svg viewBox="0 0 57 64" className="h-10 w-10 shrink-0" aria-hidden="true">
          <path d="M 48.1 45.5 A 21 21 0 1 1 48.1 18.5" fill="none" stroke="#f4eee1" strokeWidth={9} strokeLinecap="round" />
          <g transform="translate(48.1,45.5)">
            <path d="M -9 3 L -7 -1 L -3 -3 L 3 -3 L 6 0 L 9 3 L 9 5 L -9 5 Z" fill="#a13328" />
            <circle cx="-4.5" cy="5" r="2.2" fill="#f4eee1" />
            <circle cx="4.5" cy="5" r="2.2" fill="#f4eee1" />
          </g>
        </svg>
        <p className="font-display text-lg font-semibold">
          {titular}
          <span className="mt-0.5 block font-sans text-xs font-normal text-[#b6a98f]">
            {totalVehiculos} vehículo{totalVehiculos !== 1 ? 's' : ''} · {textoUltimaLectura(diasUltimaLectura)}
          </span>
        </p>
      </div>
      <div className="relative flex shrink-0 gap-2">
        <Link
          to={hrefAnotarKm}
          className="rounded-md border border-[#423a2c] px-3 py-2 text-sm font-medium text-[#f4eee1] transition hover:border-[#e2624f] hover:text-[#e2624f]"
        >
          Anotar km
        </Link>
        <button
          onClick={onAñadir}
          className="rounded-md bg-[#a13328] px-3 py-2 text-sm font-medium text-[#f4eee1] transition hover:brightness-125"
        >
          {añadiendo ? 'Cancelar' : '+ Añadir vehículo'}
        </button>
      </div>
    </div>
  )
}

/**
 * Todo lo que pide atención en el garaje entero, ordenado por urgencia.
 * Antes esto era un número dentro de un globo en la esquina de cada
 * tarjeta: obligaba a entrar en el vehículo para saber qué pasaba. La
 * portada debe decir la tarea, no contarla.
 */
function AgendaGaraje({
  filas,
}: {
  filas: { item: AgendaItem; vehiculo: Vehiculo }[]
}) {
  if (filas.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="eyebrow">Agenda del garaje</span>
        <span className="text-xs text-ink-dim">Próximos 90 días</span>
      </div>
      <ul className="space-y-2">
        {filas.map(({ item, vehiculo }) => (
          <AgendaFila
            key={`${vehiculo.id}-${item.categoria}-${item.titulo}`}
            item={item}
            vehiculoId={vehiculo.id}
            vehiculoNombre={`${vehiculo.marca} ${vehiculo.modelo}`}
            matricula={vehiculo.matricula}
          />
        ))}
      </ul>
    </section>
  )
}

/**
 * La matrícula como placa: es el identificador con el que uno reconoce su
 * coche, no un dato más de la lista separado por puntos. La banda azul de
 * la izquierda imita la franja europea.
 */
function Placa({ matricula }: { matricula: string }) {
  return (
    <span className="flex shrink-0 items-stretch overflow-hidden rounded border border-line bg-paper whitespace-nowrap">
      <i className="w-[3px] shrink-0" style={{ background: 'var(--color-itv)' }} aria-hidden="true" />
      <span className="px-1.5 py-0.5 font-display text-xs font-bold tracking-[0.08em] text-ink-bright">
        {matricula}
      </span>
    </span>
  )
}

const PUNTO_URGENCIA = {
  vencida: 'var(--color-stamp)',
  pronto: 'var(--color-gold)',
  programada: 'var(--color-itv)',
} as const

function TarjetaVehiculo({
  vehiculo,
  proximo,
  avisosListos,
}: {
  vehiculo: Vehiculo
  proximo: AgendaItem | null
  avisosListos: boolean
}) {
  const dias = diasDesde(vehiculo.kmActualFecha, new Date())
  const lectura =
    dias === null ? null : dias <= 0 ? 'leído hoy' : dias === 1 ? 'leído ayer' : `leído hace ${dias} días`

  return (
    <Link to={`/vehiculos/${vehiculo.id}`} className="panel block p-4 transition hover:border-stamp/30">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[1.0625rem] font-semibold text-ink-bright">
            {vehiculo.marca} {vehiculo.modelo}
          </p>
          <p className="truncate text-xs text-ink-dim">
            {vehiculo.tipo} · {vehiculo.anio}
            {vehiculo.fechaCompra && ` · ${calcularAntiguedad(vehiculo.fechaCompra, new Date())} años contigo`}
          </p>
        </div>
        <Placa matricula={vehiculo.matricula} />
      </div>

      <p className="flex items-baseline gap-1.5">
        <span
          className="font-display text-2xl font-bold text-ink-bright"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {vehiculo.kmActual.toLocaleString('es-ES')}
        </span>
        <span className="text-xs text-ink-dim">km{lectura && ` · ${lectura}`}</span>
      </p>

      {avisosListos && (
        <p className="mt-3 flex items-center gap-2 border-t border-line pt-2.5 text-xs">
          <i
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: proximo ? PUNTO_URGENCIA[proximo.urgencia] : 'var(--color-olive)' }}
            aria-hidden="true"
          />
          <span className={proximo?.urgencia === 'vencida' ? 'text-stamp' : 'text-ink-dim'}>
            {proximo ? resumenCorto(proximo) : 'Todo al día'}
          </span>
        </p>
      )}
    </Link>
  )
}

function InfoVehiculoNuevo({ vehiculo, onClose }: { vehiculo: Vehiculo; onClose: () => void }) {
  const nombre = `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`
  const enlaces = [
    {
      titulo: 'Ficha técnica',
      detalle: 'Motorización, consumo, dimensiones y datos generales del modelo.',
      query: `${nombre} ficha técnica`,
    },
    {
      titulo: 'Problemas y fallos más comunes',
      detalle: 'Lo que suelen reportar otros propietarios en foros y redes.',
      query: `problemas comunes fallos ${nombre} foro opiniones`,
    },
  ]

  const [sugerencias, setSugerencias] = useState<{ tipo: string; intervaloKm?: number; intervaloMeses?: number }[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)

  async function pedirSugerencias() {
    setCargando(true)
    setErrorIA(null)
    try {
      const { sugerencias } = await api.ai.mantenimientoSugerido({
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
      })
      setSugerencias(sugerencias)
    } catch (err) {
      setErrorIA((err as Error).message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`${vehiculo.marca} ${vehiculo.modelo} — información útil`}>
      <p className="mb-4 text-sm text-ink-dim">
        Antes de empezar a llevar su historial, esto te puede ayudar a conocer mejor tu vehículo:
      </p>

      {sugerencias === null ? (
        <button onClick={pedirSugerencias} disabled={cargando} className="entry mb-2 block w-full p-3 text-left transition hover:border-stamp/40">
          <p className="text-sm font-medium text-ink-bright">
            {cargando ? 'Consultando…' : 'Mantenimiento recomendado por el fabricante'}
          </p>
          <p className="text-xs text-ink-dim">Plan orientativo generado por IA para este modelo exacto.</p>
        </button>
      ) : (
        <div className="entry mb-2 p-3">
          <p className="mb-1.5 text-sm font-medium text-ink-bright">Mantenimiento recomendado (IA)</p>
          {sugerencias.length > 0 ? (
            <ul className="space-y-1">
              {sugerencias.map((s) => (
                <li key={s.tipo} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink">{s.tipo}</span>
                  <span className="text-ink-dim">
                    {[s.intervaloKm ? `${s.intervaloKm.toLocaleString('es-ES')} km` : null, s.intervaloMeses ? `${s.intervaloMeses} meses` : null]
                      .filter(Boolean)
                      .join(' / ') || 'sin intervalo'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-dim">Sin sugerencias.</p>
          )}
        </div>
      )}
      {errorIA && <p className="mb-2 text-xs text-stamp">{errorIA}</p>}

      <ul className="space-y-2">
        {enlaces.map((e) => (
          <li key={e.titulo}>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(e.query)}`}
              target="_blank"
              rel="noreferrer"
              className="entry block p-3 transition hover:border-stamp/40"
            >
              <p className="text-sm font-medium text-ink-bright">{e.titulo}</p>
              <p className="text-xs text-ink-dim">{e.detalle}</p>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-dim">
        El plan de mantenimiento es orientativo, generado por IA. Los enlaces abren una búsqueda en
        Google — contrasta siempre la información antes de darla por buena.
      </p>
      <button onClick={onClose} className="btn-ghost mt-4 w-full">
        Cerrar
      </button>
    </Modal>
  )
}

export function VehiculosPage() {
  const { data: vehiculos, loading, error, reload } = useCollection(api.vehiculos.list)
  const { data: elementos, loading: cargandoElementos } = useCollection(api.elementos.list)
  const { data: itvs, loading: cargandoItvs } = useCollection(api.itv.list)
  const { data: averias, loading: cargandoAverias } = useCollection(api.averias.list)
  const { data: seguros, loading: cargandoSeguros } = useCollection(api.seguros.list)

  // El globo resume cuatro colecciones que cargan por separado. Hasta que
  // están todas, el recuento sería falso: sin las ITV cargadas, por
  // ejemplo, se recurre a la fecha estimada de primera ITV (que casi
  // siempre ya pasó) y saldría un globo rojo que desaparece solo.
  const avisosListos =
    !cargandoElementos &&
    !cargandoItvs &&
    !cargandoAverias &&
    !cargandoSeguros
  const [showForm, setShowForm] = useState(false)
  const [infoVehiculo, setInfoVehiculo] = useState<Vehiculo | null>(null)

  // Una sola pasada: la agenda de cada vehículo alimenta a la vez la
  // sección de arriba, el titular de la cabecera y el pie de su tarjeta.
  const agendaPorVehiculo = useMemo(() => {
    const hoy = new Date()
    return new Map(
      vehiculos.map((v) => [
        v.id,
        listarAgenda(
          hoy,
          v,
          averias.filter((a) => a.vehiculoId === v.matricula),
          elementos.filter((e) => e.vehiculoId === v.matricula),
          itvs.filter((i) => i.vehiculoId === v.matricula),
          seguros.filter((s) => s.vehiculoId === v.matricula),
        ),
      ]),
    )
  }, [vehiculos, averias, elementos, itvs, seguros])

  const filasAgenda = useMemo(
    () =>
      vehiculos
        .flatMap((v) => (agendaPorVehiculo.get(v.id) ?? []).map((item) => ({ item, vehiculo: v })))
        .sort((a, b) => {
          const orden = { vencida: 0, pronto: 1, programada: 2 }
          const porUrgencia = orden[a.item.urgencia] - orden[b.item.urgencia]
          if (porUrgencia !== 0) return porUrgencia
          if (a.item.dias === null) return 1
          if (b.item.dias === null) return -1
          return a.item.dias - b.item.dias
        }),
    [vehiculos, agendaPorVehiculo],
  )

  // El titular cuenta lo que reclama atención, no lo que solo está previsto.
  const pendientes = filasAgenda.filter((f) => f.item.urgencia !== 'programada').length

  const hoy = new Date()
  const diasUltimaLectura = useMemo(() => {
    const dias = vehiculos.map((v) => diasDesde(v.kmActualFecha, hoy)).filter((d): d is number => d !== null)
    return dias.length > 0 ? Math.min(...dias) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculos])

  // "Anotar km" lleva al vehículo con la lectura más vieja: es el que de
  // verdad la necesita, y con uno solo en el garaje es el único posible.
  const hrefAnotarKm = useMemo(() => {
    const conFecha = [...vehiculos].sort(
      (a, b) => (diasDesde(b.kmActualFecha, hoy) ?? 0) - (diasDesde(a.kmActualFecha, hoy) ?? 0),
    )
    return conFecha.length > 0 ? `/vehiculos/${conFecha[0].id}?editarKm=1` : '/'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculos])

  return (
    <div>
      {!loading && vehiculos.length > 0 && (
        <ResumenHero
          totalVehiculos={vehiculos.length}
          pendientes={avisosListos ? pendientes : 0}
          diasUltimaLectura={diasUltimaLectura}
          hrefAnotarKm={hrefAnotarKm}
          onAñadir={() => setShowForm((v) => !v)}
          añadiendo={showForm}
        />
      )}

      {showForm && (
        <NuevoVehiculoForm
          onCreated={(vehiculo) => {
            setShowForm(false)
            reload()
            setInfoVehiculo(vehiculo)
          }}
        />
      )}

      {infoVehiculo && <InfoVehiculoNuevo vehiculo={infoVehiculo} onClose={() => setInfoVehiculo(null)} />}

      {loading && <p className="text-sm text-ink-dim">Cargando…</p>}
      {error && <p className="text-sm text-stamp">{error}</p>}

      {avisosListos && <AgendaGaraje filas={filasAgenda} />}

      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">Tu garaje</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {vehiculos.map((v) => (
          <TarjetaVehiculo
            key={v.id}
            vehiculo={v}
            proximo={(agendaPorVehiculo.get(v.id) ?? []).find((i) => i.urgencia !== 'programada') ?? null}
            avisosListos={avisosListos}
          />
        ))}
      </div>

      {!loading && vehiculos.length === 0 && (
        <p className="text-sm text-ink-dim">Todavía no has añadido ningún vehículo.</p>
      )}
    </div>
  )
}

function NuevoVehiculoForm({ onCreated }: { onCreated: (vehiculo: Vehiculo) => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      const vehiculo = await api.vehiculos.create({
        marca: String(form.get('marca')),
        modelo: String(form.get('modelo')),
        matricula: String(form.get('matricula')),
        anio: Number(form.get('anio')),
        tipo: form.get('tipo') as VehiculoTipo,
        kmActual: Number(form.get('kmActual')),
        kmActualFecha: new Date().toISOString().slice(0, 10),
        fechaCompra: form.get('fechaCompra') ? String(form.get('fechaCompra')) : undefined,
      })
      onCreated(vehiculo)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel mb-6 grid gap-3 p-4 sm:grid-cols-2">
      <MarcaModeloFields />
      <input name="matricula" required placeholder="Matrícula" className="input" />
      <input name="anio" required type="number" placeholder="Año" className="input" />
      <select name="tipo" required className="input" defaultValue="Turismo">
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input name="kmActual" required type="number" placeholder="Km actual" className="input" />
      <div className="min-w-0">
        <label className="mb-1 block text-xs text-ink-dim">Fecha de compra (opcional)</label>
        <input name="fechaCompra" type="date" className="input w-full" />
      </div>
      {error && <p className="sm:col-span-2 text-sm text-stamp">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">
        {submitting ? 'Guardando…' : 'Guardar vehículo'}
      </button>
    </form>
  )
}
