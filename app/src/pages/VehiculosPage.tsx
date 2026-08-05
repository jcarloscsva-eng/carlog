import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import type { VehiculoTipo } from '@shared/types'

const TIPOS: VehiculoTipo[] = ['Turismo', 'Moto', 'Furgoneta']

export function VehiculosPage() {
  const { data: vehiculos, loading, error, reload } = useCollection(api.vehiculos.list)
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Tus vehículos</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          {showForm ? 'Cancelar' : '+ Añadir vehículo'}
        </button>
      </div>

      {showForm && (
        <NuevoVehiculoForm
          onCreated={() => {
            setShowForm(false)
            reload()
          }}
        />
      )}

      {loading && <p className="text-sm text-slate-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {vehiculos.map((v) => (
          <Link
            key={v.id}
            to={`/vehiculos/${v.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <p className="font-medium text-slate-900">
              {v.marca} {v.modelo}
            </p>
            <p className="text-sm text-slate-500">
              {v.matricula} · {v.anio} · {v.tipo}
            </p>
            <p className="mt-1 text-sm text-slate-500">{v.kmActual.toLocaleString('es-ES')} km</p>
          </Link>
        ))}
      </div>

      {!loading && vehiculos.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no has añadido ningún vehículo.</p>
      )}
    </div>
  )
}

function NuevoVehiculoForm({ onCreated }: { onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.vehiculos.create({
        marca: String(form.get('marca')),
        modelo: String(form.get('modelo')),
        matricula: String(form.get('matricula')),
        anio: Number(form.get('anio')),
        tipo: form.get('tipo') as VehiculoTipo,
        kmActual: Number(form.get('kmActual')),
        kmActualFecha: new Date().toISOString().slice(0, 10),
      })
      onCreated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
    >
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
      {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="sm:col-span-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Guardando…' : 'Guardar vehículo'}
      </button>
    </form>
  )
}
