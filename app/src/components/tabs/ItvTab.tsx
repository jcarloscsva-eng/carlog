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
      <form onSubmit={handleSubmit} className="panel mb-4 grid gap-2 p-4 sm:grid-cols-3">
        <input name="fechaRealizada" type="date" required className="input" />
        <select name="resultado" required className="input" defaultValue="Favorable">
          <option value="Favorable">Favorable</option>
          <option value="Desfavorable">Desfavorable</option>
          <option value="Negativo">Negativo</option>
        </select>
        {error && <p className="text-sm text-red-400 sm:col-span-3">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
          {submitting ? 'Guardando…' : 'Registrar ITV pasada'}
        </button>
      </form>

      <ul className="space-y-2">
        {ordenadas.map((i) => (
          <li key={i.id} className="panel p-3">
            <p className="text-sm text-ink">
              Resultado: <span className="font-medium text-ink-bright">{i.resultado}</span>
            </p>
            <p className="text-xs text-ink-dim">
              Realizada el {i.fechaRealizada} · Próxima el{' '}
              <span className="font-medium text-gold">
                {new Date(i.fechaProxima).toLocaleDateString('es-ES')}
              </span>
            </p>
          </li>
        ))}
        {ordenadas.length === 0 && (
          <p className="text-sm text-ink-dim">
            Aún no hay ITV registrada — se calculará la primera fecha según la
            antigüedad del vehículo.
          </p>
        )}
      </ul>
    </div>
  )
}
