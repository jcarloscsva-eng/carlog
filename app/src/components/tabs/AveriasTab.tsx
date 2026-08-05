import { useState, type FormEvent } from 'react'
import type { Averia } from '@shared/types'
import { api } from '../../lib/api'

export function AveriasTab({
  vehiculoId,
  averias,
  reload,
}: {
  vehiculoId: string
  averias: Averia[]
  reload: () => void
}) {
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

      <ul className="space-y-2">
        {averias.map((a) => (
          <li key={a.id} className="panel flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">{a.descripcion}</p>
              <p className="text-xs text-ink-dim">
                {a.fecha} ·{' '}
                <span className={a.estado === 'Pendiente' ? 'text-amber-400' : 'text-emerald-400'}>
                  {a.estado}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(a.descripcion)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost px-2 py-1 text-xs"
              >
                Buscar info
              </a>
              <button onClick={() => marcarResuelta(a)} className="btn-ghost px-2 py-1 text-xs">
                {a.estado === 'Pendiente' ? 'Marcar resuelta' : 'Reabrir'}
              </button>
            </div>
          </li>
        ))}
        {averias.length === 0 && <p className="text-sm text-ink-dim">Sin averías registradas.</p>}
      </ul>
    </div>
  )
}
