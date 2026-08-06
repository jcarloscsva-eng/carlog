import { useState, type FormEvent } from 'react'
import type { Mantenimiento } from '@shared/types'
import { api } from '../../lib/api'

export function MantenimientosTab({
  vehiculoId,
  mantenimientos,
  reload,
}: {
  vehiculoId: string
  mantenimientos: Mantenimiento[]
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
      await api.mantenimientos.create({
        vehiculoId,
        fecha: String(form.get('fecha')),
        km: Number(form.get('km')),
        precio: Number(form.get('precio')),
        tienda: String(form.get('tienda')),
        elementos: String(form.get('elementos')),
        intervaloKm: form.get('intervaloKm') ? Number(form.get('intervaloKm')) : undefined,
        intervaloMeses: form.get('intervaloMeses') ? Number(form.get('intervaloMeses')) : undefined,
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
        <input name="fecha" type="date" required className="input" />
        <input name="km" type="number" required placeholder="Km" className="input" />
        <input name="precio" type="number" step="0.01" required placeholder="Precio (€)" className="input" />
        <input name="tienda" required placeholder="Tienda / taller" className="input" />
        <input name="elementos" required placeholder="Elementos abordados" className="input sm:col-span-2" />
        <input name="intervaloKm" type="number" placeholder="Recordar cada X km (opcional)" className="input" />
        <input name="intervaloMeses" type="number" placeholder="Recordar cada X meses (opcional)" className="input" />
        {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
          {submitting ? 'Guardando…' : 'Añadir mantenimiento'}
        </button>
      </form>

      <ul className="space-y-2">
        {mantenimientos.map((m) => (
          <li key={m.id} className="entry p-3">
            <p className="text-sm text-ink">{m.elementos}</p>
            <p className="text-xs text-ink-dim">
              {m.fecha} · {m.km.toLocaleString('es-ES')} km ·{' '}
              <span className="text-stamp">{m.precio.toFixed(2)} €</span> · {m.tienda}
            </p>
          </li>
        ))}
        {mantenimientos.length === 0 && (
          <p className="text-sm text-ink-dim">Sin mantenimientos registrados.</p>
        )}
      </ul>
    </div>
  )
}
