import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { Modal } from '../components/Modal'
import { calcularProximasTareas } from '@shared/alerts'
import { calcularAntiguedad } from '@shared/vehiculo'
import type { Vehiculo, VehiculoTipo } from '@shared/types'

const TIPOS: VehiculoTipo[] = ['Turismo', 'Moto', 'Furgoneta']

function ResumenHero({
  totalVehiculos,
  kmTotal,
  tareasUrgentes,
}: {
  totalVehiculos: number
  kmTotal: number
  tareasUrgentes: number
}) {
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
        <p className="font-display text-base font-semibold">
          {tareasUrgentes > 0
            ? `${tareasUrgentes} tarea${tareasUrgentes > 1 ? 's' : ''} próxima${tareasUrgentes > 1 ? 's' : ''}`
            : 'Todo al día'}
          <span className="mt-0.5 block text-xs font-normal text-[#b6a98f]">
            {totalVehiculos} vehículo{totalVehiculos !== 1 ? 's' : ''} en tu garaje
          </span>
        </p>
      </div>
      <div className="relative flex gap-5">
        <div className="dark-hero-chip text-center">
          <div className="v text-xl">{totalVehiculos}</div>
          <div className="l">Vehículo{totalVehiculos !== 1 ? 's' : ''}</div>
        </div>
        <div className="dark-hero-chip text-center">
          <div className="v text-xl">{kmTotal.toLocaleString('es-ES')}</div>
          <div className="l">Km</div>
        </div>
        <div className="dark-hero-chip text-center">
          <div className="v text-xl">{tareasUrgentes}</div>
          <div className="l">Próximas</div>
        </div>
      </div>
    </div>
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
      titulo: 'Mantenimiento recomendado por el fabricante',
      detalle: 'Intervalos de revisión, aceite y correa de distribución según la marca.',
      query: `mantenimiento recomendado ${nombre} intervalos kilometraje`,
    },
    {
      titulo: 'Problemas y fallos más comunes',
      detalle: 'Lo que suelen reportar otros propietarios en foros y redes.',
      query: `problemas comunes fallos ${nombre} foro opiniones`,
    },
  ]

  return (
    <Modal open onClose={onClose} title={`${vehiculo.marca} ${vehiculo.modelo} — información útil`}>
      <p className="mb-4 text-sm text-ink-dim">
        Antes de empezar a llevar su historial, esto te puede ayudar a conocer mejor tu vehículo:
      </p>
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
        Cada enlace abre una búsqueda en Google — contrasta siempre la información antes de darla por buena.
      </p>
      <button onClick={onClose} className="btn-ghost mt-4 w-full">
        Cerrar
      </button>
    </Modal>
  )
}

export function VehiculosPage() {
  const { data: vehiculos, loading, error, reload } = useCollection(api.vehiculos.list)
  const { data: mantenimientos } = useCollection(api.mantenimientos.list)
  const { data: itvs } = useCollection(api.itv.list)
  const [showForm, setShowForm] = useState(false)
  const [infoVehiculo, setInfoVehiculo] = useState<Vehiculo | null>(null)

  const tareasUrgentes = useMemo(() => {
    const hoy = new Date()
    return vehiculos.reduce((total, v) => {
      const propios = calcularProximasTareas(
        hoy,
        v,
        mantenimientos.filter((m) => m.vehiculoId === v.matricula),
        itvs.filter((i) => i.vehiculoId === v.matricula),
      )
      return total + propios.filter((t) => t.urgente).length
    }, 0)
  }, [vehiculos, mantenimientos, itvs])

  const kmTotal = useMemo(() => vehiculos.reduce((sum, v) => sum + v.kmActual, 0), [vehiculos])

  return (
    <div>
      {!loading && vehiculos.length > 0 && (
        <ResumenHero totalVehiculos={vehiculos.length} kmTotal={kmTotal} tareasUrgentes={tareasUrgentes} />
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="eyebrow">Tu garaje</span>
          <h1 className="heading mt-1 text-2xl">Vehículos</h1>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Añadir vehículo'}
        </button>
      </div>

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
      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {vehiculos.map((v) => (
          <Link
            key={v.id}
            to={`/vehiculos/${v.id}`}
            className="panel p-4 transition hover:border-stamp/30"
          >
            <p className="font-display text-lg font-medium text-ink-bright">
              {v.marca} {v.modelo}
            </p>
            <p className="text-sm text-ink-dim">
              {v.matricula} · {v.anio} · {v.tipo}
              {v.fechaCompra && ` · ${calcularAntiguedad(v.fechaCompra, new Date())} años contigo`}
            </p>
            <p className="mt-1 text-sm text-stamp">{v.kmActual.toLocaleString('es-ES')} km</p>
          </Link>
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
      <input name="marca" required placeholder="Marca" className="input" />
      <input name="modelo" required placeholder="Modelo" className="input" />
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
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Fecha de compra (opcional)</label>
        <input name="fechaCompra" type="date" className="input w-full" />
      </div>
      {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">
        {submitting ? 'Guardando…' : 'Guardar vehículo'}
      </button>
    </form>
  )
}
