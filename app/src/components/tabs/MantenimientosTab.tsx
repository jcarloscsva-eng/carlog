import { useState, type FormEvent } from 'react'
import type { Mantenimiento } from '@shared/types'
import { api } from '../../lib/api'
import { Modal } from '../Modal'

interface MantenimientoFormValues {
  fecha: string
  km: number
  precio: number
  tienda: string
  elementos: string
  intervaloKm?: number
  intervaloMeses?: number
}

function MantenimientoForm({
  initialValues,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialValues?: MantenimientoFormValues
  submitting: boolean
  error: string | null
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <input name="fecha" type="date" required defaultValue={initialValues?.fecha} className="input" />
      <input
        name="km"
        type="number"
        required
        placeholder="Km"
        defaultValue={initialValues?.km}
        className="input"
      />
      <input
        name="precio"
        type="number"
        step="0.01"
        required
        placeholder="Precio (€)"
        defaultValue={initialValues?.precio}
        className="input"
      />
      <input
        name="tienda"
        required
        placeholder="Tienda / taller"
        defaultValue={initialValues?.tienda}
        className="input"
      />
      <input
        name="elementos"
        required
        placeholder="Elementos abordados"
        defaultValue={initialValues?.elementos}
        className="input sm:col-span-2"
      />
      <input
        name="intervaloKm"
        type="number"
        placeholder="Recordar cada X km (opcional)"
        defaultValue={initialValues?.intervaloKm}
        className="input"
      />
      <input
        name="intervaloMeses"
        type="number"
        placeholder="Recordar cada X meses (opcional)"
        defaultValue={initialValues?.intervaloMeses}
        className="input"
      />
      {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}

function readFormValues(form: FormData): Omit<Mantenimiento, 'id' | 'vehiculoId'> {
  return {
    fecha: String(form.get('fecha')),
    km: Number(form.get('km')),
    precio: Number(form.get('precio')),
    tienda: String(form.get('tienda')),
    elementos: String(form.get('elementos')),
    intervaloKm: form.get('intervaloKm') ? Number(form.get('intervaloKm')) : undefined,
    intervaloMeses: form.get('intervaloMeses') ? Number(form.get('intervaloMeses')) : undefined,
  }
}

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

  const [editing, setEditing] = useState<Mantenimiento | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.mantenimientos.create({ vehiculoId, ...readFormValues(form) })
      e.currentTarget.reset()
      reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const form = new FormData(e.currentTarget)
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.mantenimientos.update(editing.id, readFormValues(form))
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(m: Mantenimiento) {
    if (!confirm('¿Borrar este mantenimiento?')) return
    await api.mantenimientos.remove(m.id)
    reload()
  }

  return (
    <div>
      <div className="panel mb-4 p-4">
        <MantenimientoForm
          submitting={submitting}
          error={error}
          submitLabel="Añadir mantenimiento"
          onSubmit={handleSubmit}
        />
      </div>

      <ul className="space-y-2">
        {mantenimientos.map((m) => (
          <li key={m.id} className="entry flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">{m.elementos}</p>
              <p className="text-xs text-ink-dim">
                {m.fecha} · {m.km.toLocaleString('es-ES')} km ·{' '}
                <span className="text-stamp">{m.precio.toFixed(2)} €</span> · {m.tienda}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(m)} className="btn-ghost px-2 py-1 text-xs">
                Editar
              </button>
              <button onClick={() => handleDelete(m)} className="btn-ghost px-2 py-1 text-xs">
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {mantenimientos.length === 0 && (
          <p className="text-sm text-ink-dim">Sin mantenimientos registrados.</p>
        )}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar mantenimiento">
        {editing && (
          <MantenimientoForm
            initialValues={editing}
            submitting={editSubmitting}
            error={editError}
            submitLabel="Guardar cambios"
            onSubmit={handleEditSubmit}
          />
        )}
      </Modal>
    </div>
  )
}
