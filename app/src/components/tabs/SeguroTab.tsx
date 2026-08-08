import { useState, type FormEvent } from 'react'
import type { Parte, ParteEstado, ParteTipo, Seguro, SeguroTipoCobertura } from '@shared/types'
import { api } from '../../lib/api'
import { EstadoStamp } from '../EstadoStamp'
import { IconEdit, IconTrash } from '../Icons'
import { Modal } from '../Modal'
import { OrdenFechaButton, type OrdenFecha } from '../OrdenFechaButton'

const COBERTURAS: SeguroTipoCobertura[] = ['Terceros', 'Terceros Ampliado', 'Todo Riesgo']
const TIPOS_PARTE: ParteTipo[] = [
  'Colisión',
  'Robo',
  'Vandalismo',
  'Lunas',
  'Incendio',
  'Fenómenos atmosféricos',
  'Otro',
]
const ESTADOS_PARTE: ParteEstado[] = ['Abierto', 'En trámite', 'Cerrado']

function diasHastaRenovacion(fechaRenovacion: string): number {
  return Math.ceil((new Date(fechaRenovacion).getTime() - Date.now()) / 86_400_000)
}

function PolizaForm({
  initialValues,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Omit<Seguro, 'id' | 'vehiculoId'>
  submitting: boolean
  error: string | null
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-2">
      <input
        name="compania"
        required
        defaultValue={initialValues?.compania}
        placeholder="Compañía aseguradora"
        className="input"
      />
      <input
        name="numeroPoliza"
        required
        defaultValue={initialValues?.numeroPoliza}
        placeholder="Número de póliza"
        className="input"
      />
      <select name="tipoCobertura" required defaultValue={initialValues?.tipoCobertura ?? 'Terceros'} className="input">
        {COBERTURAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        name="precio"
        required
        type="number"
        step="0.01"
        min="0"
        defaultValue={initialValues?.precio}
        placeholder="Precio anual (€)"
        className="input"
      />
      <div className="min-w-0">
        <label className="mb-1 block text-xs text-ink-dim">Fecha de inicio</label>
        <input
          name="fechaInicio"
          type="date"
          required
          defaultValue={initialValues?.fechaInicio}
          className="input w-full"
        />
      </div>
      <div className="min-w-0">
        <label className="mb-1 block text-xs text-ink-dim">Fecha de renovación</label>
        <input
          name="fechaRenovacion"
          type="date"
          required
          defaultValue={initialValues?.fechaRenovacion}
          className="input w-full"
        />
      </div>
      <input
        name="telefonoAsistencia"
        defaultValue={initialValues?.telefonoAsistencia}
        placeholder="Teléfono de asistencia (opcional)"
        className="input sm:col-span-2"
      />
      {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}

function readPolizaForm(form: FormData) {
  return {
    compania: String(form.get('compania')),
    numeroPoliza: String(form.get('numeroPoliza')),
    tipoCobertura: form.get('tipoCobertura') as SeguroTipoCobertura,
    precio: Number(form.get('precio')),
    fechaInicio: String(form.get('fechaInicio')),
    fechaRenovacion: String(form.get('fechaRenovacion')),
    telefonoAsistencia: form.get('telefonoAsistencia') ? String(form.get('telefonoAsistencia')) : undefined,
  }
}

function PartesSection({
  vehiculoId,
  partes,
  reload,
}: {
  vehiculoId: string
  partes: Parte[]
  reload: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Parte | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [orden, setOrden] = useState<OrdenFecha>('desc')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    setSubmitting(true)
    setError(null)
    try {
      await api.partes.create({
        vehiculoId,
        fecha: String(form.get('fecha')),
        tipo: form.get('tipo') as ParteTipo,
        descripcion: String(form.get('descripcion')),
        numeroParte: form.get('numeroParte') ? String(form.get('numeroParte')) : undefined,
        estado: 'Abierto',
        coste: form.get('coste') ? Number(form.get('coste')) : undefined,
        terceroImplicado: form.get('terceroImplicado') === 'on',
      })
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
      await api.partes.update(editing.id, {
        fecha: String(form.get('fecha')),
        tipo: form.get('tipo') as ParteTipo,
        descripcion: String(form.get('descripcion')),
        numeroParte: form.get('numeroParte') ? String(form.get('numeroParte')) : undefined,
        estado: form.get('estado') as ParteEstado,
        coste: form.get('coste') ? Number(form.get('coste')) : undefined,
        terceroImplicado: form.get('terceroImplicado') === 'on',
      })
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(p: Parte) {
    if (!confirm('¿Borrar este parte?')) return
    await api.partes.remove(p.id)
    reload()
  }

  const ordenados = [...partes].sort((a, b) =>
    orden === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha),
  )

  return (
    <div>
      <div className="panel mb-4 p-4">
        <span className="eyebrow mb-2 block">Dar de alta un parte</span>
        <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-2">
          <input name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          <select name="tipo" required defaultValue="Otro" className="input">
            {TIPOS_PARTE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <textarea
            name="descripcion"
            required
            placeholder="Describe lo ocurrido…"
            className="input sm:col-span-2"
            rows={2}
          />
          <input name="numeroParte" placeholder="Número de expediente (opcional)" className="input" />
          <input name="coste" type="number" step="0.01" min="0" placeholder="Coste estimado (€, opcional)" className="input" />
          <label className="flex items-center gap-2 text-sm text-ink-dim sm:col-span-2">
            <input name="terceroImplicado" type="checkbox" />
            Hay un tercero implicado
          </label>
          {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">
            {submitting ? 'Guardando…' : 'Dar de alta parte'}
          </button>
        </form>
      </div>

      {partes.length > 0 && (
        <OrdenFechaButton orden={orden} onToggle={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))} />
      )}

      <ul className="space-y-2">
        {ordenados.map((p) => (
          <li key={p.id} className="entry flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-ink">
                {p.tipo} — {p.descripcion}
              </p>
              <p className="mb-1 text-xs text-ink-dim">
                {p.fecha}
                {p.numeroParte && <> · Expediente {p.numeroParte}</>}
                {p.coste !== undefined && <> · {p.coste.toLocaleString('es-ES')} €</>}
                {p.terceroImplicado && <> · Con tercero</>}
              </p>
              <EstadoStamp estado={p.estado} />
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(p)} className="icon-btn" aria-label="Editar parte" title="Editar">
                <IconEdit className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(p)} className="icon-btn" aria-label="Eliminar parte" title="Eliminar">
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {partes.length === 0 && <p className="text-sm text-ink-dim">Sin partes registrados.</p>}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar parte">
        {editing && (
          <form onSubmit={handleEditSubmit} className="grid gap-2 sm:grid-cols-2">
            <input name="fecha" type="date" required defaultValue={editing.fecha} className="input" />
            <select name="tipo" required defaultValue={editing.tipo} className="input">
              {TIPOS_PARTE.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <textarea
              name="descripcion"
              required
              defaultValue={editing.descripcion}
              className="input sm:col-span-2"
              rows={2}
            />
            <input name="numeroParte" defaultValue={editing.numeroParte} placeholder="Número de expediente" className="input" />
            <select name="estado" required defaultValue={editing.estado} className="input">
              {ESTADOS_PARTE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              name="coste"
              type="number"
              step="0.01"
              min="0"
              defaultValue={editing.coste}
              placeholder="Coste estimado (€)"
              className="input"
            />
            <label className="flex items-center gap-2 text-sm text-ink-dim sm:col-span-2">
              <input name="terceroImplicado" type="checkbox" defaultChecked={editing.terceroImplicado} />
              Hay un tercero implicado
            </label>
            {editError && <p className="text-sm text-red-700 sm:col-span-2">{editError}</p>}
            <button type="submit" disabled={editSubmitting} className="btn-primary sm:col-span-2">
              {editSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}

export function SeguroTab({
  vehiculoId,
  seguros,
  partes,
  reloadSeguros,
  reloadPartes,
}: {
  vehiculoId: string
  seguros: Seguro[]
  partes: Parte[]
  reloadSeguros: () => void
  reloadPartes: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Seguro | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const polizaVigente = [...seguros].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))[0]

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.seguros.create({ vehiculoId, ...readPolizaForm(form) })
      reloadSeguros()
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
      await api.seguros.update(editing.id, readPolizaForm(form))
      setEditing(null)
      reloadSeguros()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(s: Seguro) {
    if (!confirm('¿Borrar esta póliza?')) return
    await api.seguros.remove(s.id)
    reloadSeguros()
  }

  return (
    <div>
      <span className="eyebrow mb-2 block">Póliza del seguro</span>

      {polizaVigente ? (
        <div className="entry mb-6 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink">
                {polizaVigente.compania} — {polizaVigente.tipoCobertura}
              </p>
              <p className="text-xs text-ink-dim">
                Póliza {polizaVigente.numeroPoliza} · {polizaVigente.precio.toLocaleString('es-ES')} €/año
              </p>
              <p className="text-xs text-ink-dim">
                Renueva el {new Date(polizaVigente.fechaRenovacion).toLocaleDateString('es-ES')}
                {(() => {
                  const dias = diasHastaRenovacion(polizaVigente.fechaRenovacion)
                  if (dias < 0) return <span className="ml-1 font-medium text-red-700">(caducada)</span>
                  if (dias <= 30) return <span className="ml-1 font-medium text-amber-700">(en {dias} días)</span>
                  return null
                })()}
              </p>
              {polizaVigente.telefonoAsistencia && (
                <p className="text-xs text-ink-dim">Asistencia: {polizaVigente.telefonoAsistencia}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(polizaVigente)} className="icon-btn" aria-label="Editar póliza" title="Editar">
                <IconEdit className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(polizaVigente)} className="icon-btn" aria-label="Eliminar póliza" title="Eliminar">
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel mb-4 p-4">
          <PolizaForm submitting={submitting} error={error} submitLabel="Activar seguro" onSubmit={handleSubmit} />
        </div>
      )}

      <span className="eyebrow mb-2 mt-6 block">Partes</span>
      <PartesSection vehiculoId={vehiculoId} partes={partes} reload={reloadPartes} />

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar póliza">
        {editing && (
          <PolizaForm
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
