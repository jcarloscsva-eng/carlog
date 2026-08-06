import { useState, type FormEvent } from 'react'
import type { Repuesto, TipoRepuesto } from '@shared/types'
import { api } from '../../lib/api'

const TIPOS: TipoRepuesto[] = [
  'Neumáticos',
  'Batería',
  'Frenos',
  'Correa de distribución',
  'Filtros',
  'Otro',
]

export function RepuestosTab({
  vehiculoId,
  repuestos,
  reload,
}: {
  vehiculoId: string
  repuestos: Repuesto[]
  reload: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.repuestos.create({
        vehiculoId,
        tipoRepuesto: form.get('tipoRepuesto') as TipoRepuesto,
        fecha: String(form.get('fecha')),
        km: Number(form.get('km')),
        precio: Number(form.get('precio')),
        tienda: String(form.get('tienda')),
        vidaUtilKm: form.get('vidaUtilKm') ? Number(form.get('vidaUtilKm')) : undefined,
        vidaUtilAnios: form.get('vidaUtilAnios') ? Number(form.get('vidaUtilAnios')) : undefined,
      })
      e.currentTarget.reset()
      reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="panel mb-4 grid gap-2 p-4 sm:grid-cols-3">
        <select name="tipoRepuesto" required className="input" defaultValue="Neumáticos">
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input name="fecha" type="date" required className="input" />
        <input name="km" type="number" required placeholder="Km" className="input" />
        <input name="precio" type="number" step="0.01" required placeholder="Precio (€)" className="input" />
        <input name="tienda" required placeholder="Tienda" className="input" />
        <div />
        <input name="vidaUtilKm" type="number" placeholder="Vida útil en km (opcional)" className="input" />
        <input name="vidaUtilAnios" type="number" placeholder="Vida útil en años (opcional)" className="input" />
        {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
          {submitting ? 'Guardando…' : 'Añadir repuesto'}
        </button>
      </form>

      <ul className="space-y-2">
        {repuestos.map((r) => (
          <li key={r.id} className="entry p-3">
            <p className="text-sm text-ink">{r.tipoRepuesto}</p>
            <p className="text-xs text-ink-dim">
              {r.fecha} · {r.km.toLocaleString('es-ES')} km ·{' '}
              <span className="text-stamp">{r.precio.toFixed(2)} €</span> · {r.tienda}
            </p>
          </li>
        ))}
        {repuestos.length === 0 && <p className="text-sm text-ink-dim">Sin repuestos registrados.</p>}
      </ul>
    </div>
  )
}
