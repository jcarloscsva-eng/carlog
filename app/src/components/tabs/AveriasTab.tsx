import { useState, type FormEvent } from 'react'
import type { Averia } from '@shared/types'
import { api } from '../../lib/api'
import { EstadoStamp } from '../EstadoStamp'
import { IconEdit, IconTrash } from '../Icons'
import { Modal } from '../Modal'
import { OrdenFechaButton, type OrdenFecha } from '../OrdenFechaButton'

export function AveriasTab({
  vehiculoId,
  marca,
  modelo,
  averias,
  reload,
}: {
  vehiculoId: string
  marca: string
  modelo: string
  averias: Averia[]
  reload: () => void
}) {
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<Averia | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [orden, setOrden] = useState<OrdenFecha>('desc')

  const ordenadas = [...averias].sort((a, b) =>
    orden === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha),
  )

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.averias.create({
        vehiculoId,
        fecha: new Date().toISOString().slice(0, 10),
        descripcion,
        estado: 'Pendiente',
      })
      setDescripcion('')
      reload()
    } finally {
      setSubmitting(false)
    }
  }

  async function marcarResuelta(a: Averia) {
    await api.averias.update(a.id, { estado: a.estado === 'Pendiente' ? 'Resuelta' : 'Pendiente' })
    reload()
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const form = new FormData(e.currentTarget)
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.averias.update(editing.id, {
        fecha: String(form.get('fecha')),
        descripcion: String(form.get('descripcion')),
      })
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(a: Averia) {
    if (!confirm('¿Borrar esta avería?')) return
    await api.averias.remove(a.id)
    reload()
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <textarea
          required
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Describe la avería…"
          className="input"
          rows={2}
        />
        <button type="submit" disabled={submitting} className="btn-primary shrink-0">
          Añadir
        </button>
      </form>

      {averias.length > 0 && (
        <OrdenFechaButton orden={orden} onToggle={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))} />
      )}

      <ul className="space-y-2">
        {ordenadas.map((a) => (
          <li key={a.id} className="entry flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">{a.descripcion}</p>
              <p className="mb-1 text-xs text-ink-dim">{a.fecha}</p>
              <EstadoStamp estado={a.estado} />
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${marca} ${modelo} ${a.descripcion}`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost px-2 py-1 text-xs"
              >
                Buscar info
              </a>
              <button onClick={() => marcarResuelta(a)} className="btn-ghost px-2 py-1 text-xs">
                {a.estado === 'Pendiente' ? 'Marcar resuelta' : 'Reabrir'}
              </button>
              <button onClick={() => setEditing(a)} className="icon-btn" aria-label="Editar avería" title="Editar">
                <IconEdit className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(a)} className="icon-btn" aria-label="Eliminar avería" title="Eliminar">
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {averias.length === 0 && <p className="text-sm text-ink-dim">Sin averías registradas.</p>}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar avería">
        {editing && (
          <form onSubmit={handleEditSubmit} className="grid gap-2">
            <input name="fecha" type="date" required defaultValue={editing.fecha} className="input" />
            <textarea
              name="descripcion"
              required
              defaultValue={editing.descripcion}
              className="input"
              rows={3}
            />
            {editError && <p className="text-sm text-red-700">{editError}</p>}
            <button type="submit" disabled={editSubmitting} className="btn-primary">
              {editSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}
