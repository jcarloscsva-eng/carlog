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
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Añadir
        </button>
      </form>

      <ul className="space-y-2">
        {averias.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="text-sm text-slate-900">{a.descripcion}</p>
              <p className="text-xs text-slate-500">
                {a.fecha} ·{' '}
                <span className={a.estado === 'Pendiente' ? 'text-amber-600' : 'text-emerald-600'}>
                  {a.estado}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(a.descripcion)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                Buscar info
              </a>
              <button
                onClick={() => marcarResuelta(a)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                {a.estado === 'Pendiente' ? 'Marcar resuelta' : 'Reabrir'}
              </button>
            </div>
          </li>
        ))}
        {averias.length === 0 && <p className="text-sm text-slate-500">Sin averías registradas.</p>}
      </ul>
    </div>
  )
}
