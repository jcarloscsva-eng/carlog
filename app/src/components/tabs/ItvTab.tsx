import { useState, type FormEvent } from 'react'
import type { Itv, ItvResultado } from '@shared/types'
import { api } from '../../lib/api'

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

  const ordenadas = [...itvs].sort((a, b) => b.fechaRealizada.localeCompare(a.fechaRealizada))

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <input name="fechaRealizada" type="date" required className="input" />
        <select name="resultado" required className="input" defaultValue="Favorable">
          <option value="Favorable">Favorable</option>
          <option value="Desfavorable">Desfavorable</option>
          <option value="Negativo">Negativo</option>
        </select>
        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="sm:col-span-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Registrar ITV pasada'}
        </button>
      </form>

      <ul className="space-y-2">
        {ordenadas.map((i) => (
          <li key={i.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm text-slate-900">
              Resultado: <span className="font-medium">{i.resultado}</span>
            </p>
            <p className="text-xs text-slate-500">
              Realizada el {i.fechaRealizada} · Próxima el{' '}
              <span className="font-medium text-slate-700">
                {new Date(i.fechaProxima).toLocaleDateString('es-ES')}
              </span>
            </p>
          </li>
        ))}
        {ordenadas.length === 0 && (
          <p className="text-sm text-slate-500">
            Aún no hay ITV registrada — se calculará la primera fecha según la
            antigüedad del vehículo.
          </p>
        )}
      </ul>
    </div>
  )
}
