import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { calcularAntiguedad } from '@shared/vehiculo'
import type { VehiculoTipo } from '@shared/types'

const TIPOS: VehiculoTipo[] = ['Turismo', 'Moto', 'Furgoneta']

export function VehiculosPage() {
  const { data: vehiculos, loading, error, reload } = useCollection(api.vehiculos.list)
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
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
          onCreated={() => {
            setShowForm(false)
            reload()
          }}
        />
      )}

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
        fechaCompra: form.get('fechaCompra') ? String(form.get('fechaCompra')) : undefined,
      })
      onCreated()
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
