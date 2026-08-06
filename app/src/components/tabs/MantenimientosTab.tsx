import { useState, type FormEvent } from 'react'
import type { Mantenimiento } from '@shared/types'
import { api } from '../../lib/api'
import { Modal } from '../Modal'
import { OrdenFechaButton, type OrdenFecha } from '../OrdenFechaButton'

interface MantenimientoFormValues {
  fecha: string
  km: number
  precio: number
  tienda: string
  elementos: string
  intervaloKm?: number
  intervaloMeses?: number
}

/** Elementos habituales, a partir de los que ya se repiten en tu historial. */
const ELEMENTOS_COMUNES = [
  'Aceite',
  'Filtro de aceite',
  'Filtro de aire',
  'Filtro de gasoil',
  'Filtro de polen',
  'Pastillas de freno delanteras',
  'Pastillas de freno traseras',
  'Discos de freno',
  'Correa de distribución',
  'Bujías',
  'Descarbonización de motor',
]

function parseElementos(value: string | undefined): { comunes: string[]; otros: string } {
  const partes = (value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const comunes = partes.filter((p) => ELEMENTOS_COMUNES.includes(p))
  const otros = partes.filter((p) => !ELEMENTOS_COMUNES.includes(p)).join(', ')
  return { comunes, otros }
}

function buildElementos(form: FormData): string {
  const seleccionados = form.getAll('elemento').map(String)
  const otros = String(form.get('elementosOtros') ?? '').trim()
  return [...seleccionados, ...(otros ? [otros] : [])].join(', ')
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
  const [alertaActiva, setAlertaActiva] = useState(
    Boolean(initialValues?.intervaloKm || initialValues?.intervaloMeses),
  )
  const { comunes: comunesIniciales, otros: otrosIniciales } = parseElementos(initialValues?.elementos)
  const [elementosSeleccionados, setElementosSeleccionados] = useState<Set<string>>(
    new Set(comunesIniciales),
  )

  function toggleElemento(item: string) {
    setElementosSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Fecha</label>
        <input name="fecha" type="date" required defaultValue={initialValues?.fecha} className="input w-full" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Km</label>
        <input
          name="km"
          type="number"
          required
          defaultValue={initialValues?.km}
          className="input w-full"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Precio (€)</label>
        <input
          name="precio"
          type="number"
          step="0.01"
          required
          defaultValue={initialValues?.precio}
          className="input w-full"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Tienda / taller</label>
        <input
          name="tienda"
          required
          defaultValue={initialValues?.tienda}
          className="input w-full"
        />
      </div>
      <div className="sm:col-span-3">
        <label className="mb-1 block text-xs text-ink-dim">Elementos abordados</label>
        <div className="flex flex-wrap gap-2">
          {ELEMENTOS_COMUNES.map((item) => (
            <label
              key={item}
              className="flex items-center gap-1.5 rounded border border-line bg-paper-2 px-2 py-1 text-xs text-ink"
            >
              <input
                type="checkbox"
                name="elemento"
                value={item}
                checked={elementosSeleccionados.has(item)}
                onChange={() => toggleElemento(item)}
              />
              {item}
            </label>
          ))}
        </div>
        <input
          name="elementosOtros"
          placeholder="Otros (opcional)"
          defaultValue={otrosIniciales}
          className="input mt-2 w-full"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink sm:col-span-3">
        <input
          type="checkbox"
          checked={alertaActiva}
          onChange={(e) => setAlertaActiva(e.target.checked)}
        />
        Configurar alerta de recordatorio
      </label>

      {alertaActiva && (
        <>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs text-ink-dim">Avisar cada X km</label>
            <input
              name="intervaloKm"
              type="number"
              placeholder="Ej. 15000"
              defaultValue={initialValues?.intervaloKm}
              className="input w-full"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs text-ink-dim">Avisar cada X meses</label>
            <input
              name="intervaloMeses"
              type="number"
              placeholder="Ej. 12"
              defaultValue={initialValues?.intervaloMeses}
              className="input w-full"
            />
          </div>
        </>
      )}

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
    elementos: buildElementos(form),
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
  const [formKey, setFormKey] = useState(0)

  const [editing, setEditing] = useState<Mantenimiento | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [orden, setOrden] = useState<OrdenFecha>('desc')

  const ordenados = [...mantenimientos].sort((a, b) =>
    orden === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha),
  )

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const values = readFormValues(form)
    if (!values.elementos) {
      setError('Selecciona al menos un elemento abordado')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.mantenimientos.create({ vehiculoId, ...values })
      formEl.reset()
      setFormKey((k) => k + 1)
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
    const values = readFormValues(form)
    if (!values.elementos) {
      setEditError('Selecciona al menos un elemento abordado')
      return
    }
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.mantenimientos.update(editing.id, values)
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
          key={formKey}
          submitting={submitting}
          error={error}
          submitLabel="Añadir mantenimiento"
          onSubmit={handleSubmit}
        />
      </div>

      {mantenimientos.length > 0 && (
        <OrdenFechaButton orden={orden} onToggle={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))} />
      )}

      <ul className="space-y-2">
        {ordenados.map((m) => (
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
