import { useState, type FormEvent } from 'react'
import type { Repuesto, TipoRepuesto } from '@shared/types'
import { api } from '../../lib/api'
import { Modal } from '../Modal'

const TIPOS: TipoRepuesto[] = [
  'Neumáticos',
  'Batería',
  'Frenos',
  'Correa de distribución',
  'Filtros',
  'Otro',
]

interface RepuestoFormValues {
  tipoRepuesto: TipoRepuesto
  fecha: string
  km: number
  precio: number
  tienda: string
  vidaUtilKm?: number
  vidaUtilAnios?: number
}

function RepuestoForm({
  initialValues,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialValues?: RepuestoFormValues
  submitting: boolean
  error: string | null
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <select
        name="tipoRepuesto"
        required
        className="input"
        defaultValue={initialValues?.tipoRepuesto ?? 'Neumáticos'}
      >
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
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
      <input name="tienda" required placeholder="Tienda" defaultValue={initialValues?.tienda} className="input" />
      <div />
      <input
        name="vidaUtilKm"
        type="number"
        placeholder="Vida útil en km (opcional)"
        defaultValue={initialValues?.vidaUtilKm}
        className="input"
      />
      <input
        name="vidaUtilAnios"
        type="number"
        placeholder="Vida útil en años (opcional)"
        defaultValue={initialValues?.vidaUtilAnios}
        className="input"
      />
      {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}

function readFormValues(form: FormData): Omit<Repuesto, 'id' | 'vehiculoId'> {
  return {
    tipoRepuesto: form.get('tipoRepuesto') as TipoRepuesto,
    fecha: String(form.get('fecha')),
    km: Number(form.get('km')),
    precio: Number(form.get('precio')),
    tienda: String(form.get('tienda')),
    vidaUtilKm: form.get('vidaUtilKm') ? Number(form.get('vidaUtilKm')) : undefined,
    vidaUtilAnios: form.get('vidaUtilAnios') ? Number(form.get('vidaUtilAnios')) : undefined,
  }
}

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

  const [editing, setEditing] = useState<Repuesto | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    setSubmitting(true)
    setError(null)
    try {
      await api.repuestos.create({ vehiculoId, ...readFormValues(form) })
      formEl.reset()
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
      await api.repuestos.update(editing.id, readFormValues(form))
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(r: Repuesto) {
    if (!confirm('¿Borrar este repuesto?')) return
    await api.repuestos.remove(r.id)
    reload()
  }

  return (
    <div>
      <div className="panel mb-4 p-4">
        <RepuestoForm
          submitting={submitting}
          error={error}
          submitLabel="Añadir repuesto"
          onSubmit={handleSubmit}
        />
      </div>

      <ul className="space-y-2">
        {repuestos.map((r) => (
          <li key={r.id} className="entry flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">{r.tipoRepuesto}</p>
              <p className="text-xs text-ink-dim">
                {r.fecha} · {r.km.toLocaleString('es-ES')} km ·{' '}
                <span className="text-stamp">{r.precio.toFixed(2)} €</span> · {r.tienda}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(r)} className="btn-ghost px-2 py-1 text-xs">
                Editar
              </button>
              <button onClick={() => handleDelete(r)} className="btn-ghost px-2 py-1 text-xs">
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {repuestos.length === 0 && <p className="text-sm text-ink-dim">Sin repuestos registrados.</p>}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar repuesto">
        {editing && (
          <RepuestoForm
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
