import { useState, type FormEvent } from 'react'
import type { Itv, ItvResultado } from '@shared/types'
import { api } from '../../lib/api'
import { Modal } from '../Modal'

interface ItvFormValues {
  fechaRealizada: string
  resultado: ItvResultado
}

function ItvForm({
  initialValues,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialValues?: ItvFormValues
  submitting: boolean
  error: string | null
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <input
        name="fechaRealizada"
        type="date"
        required
        defaultValue={initialValues?.fechaRealizada}
        className="input"
      />
      <select
        name="resultado"
        required
        className="input"
        defaultValue={initialValues?.resultado ?? 'Favorable'}
      >
        <option value="Favorable">Favorable</option>
        <option value="Desfavorable">Desfavorable</option>
        <option value="Negativo">Negativo</option>
      </select>
      {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}

export function ItvTab({
  vehiculoId,
  itvs,
  reload,
}: {
  vehiculoId: string
  itvs: Itv[]
  reload: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Itv | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.itv.create({
        vehiculoId,
        fechaRealizada: String(form.get('fechaRealizada')),
        resultado: form.get('resultado') as ItvResultado,
      })
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
      await api.itv.update(editing.id, {
        fechaRealizada: String(form.get('fechaRealizada')),
        resultado: form.get('resultado') as ItvResultado,
      })
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(i: Itv) {
    if (!confirm('¿Borrar esta ITV?')) return
    await api.itv.remove(i.id)
    reload()
  }

  const ordenadas = [...itvs].sort((a, b) => b.fechaRealizada.localeCompare(a.fechaRealizada))

  return (
    <div>
      <div className="panel mb-4 p-4">
        <ItvForm
          submitting={submitting}
          error={error}
          submitLabel="Registrar ITV pasada"
          onSubmit={handleSubmit}
        />
      </div>

      <ul className="space-y-2">
        {ordenadas.map((i) => (
          <li key={i.id} className="entry flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">
                Resultado: <span className="font-medium text-ink-bright">{i.resultado}</span>
              </p>
              <p className="text-xs text-ink-dim">
                Realizada el {i.fechaRealizada} · Próxima el{' '}
                <span className="font-medium text-stamp">
                  {new Date(i.fechaProxima).toLocaleDateString('es-ES')}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(i)} className="btn-ghost px-2 py-1 text-xs">
                Editar
              </button>
              <button onClick={() => handleDelete(i)} className="btn-ghost px-2 py-1 text-xs">
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {ordenadas.length === 0 && (
          <p className="text-sm text-ink-dim">
            Aún no hay ITV registrada — se calculará la primera fecha según la
            antigüedad del vehículo.
          </p>
        )}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar ITV">
        {editing && (
          <ItvForm
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
