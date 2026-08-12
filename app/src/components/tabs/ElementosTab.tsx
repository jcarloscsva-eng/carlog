import { useMemo, useState, type FormEvent } from 'react'
import type { Elemento } from '@shared/types'
import { calcularSaludElementos, type SaludElemento } from '@shared/alerts'
import { ELEMENTOS_COMUNES } from '@shared/elementos-catalogo'
import { api } from '../../lib/api'
import { IconChispa, IconEdit, IconTrash } from '../Icons'
import { Modal } from '../Modal'
import { OrdenFechaButton, type OrdenFecha } from '../OrdenFechaButton'

function colorSalud(salud: number | null): string {
  if (salud === null) return 'var(--color-ink-dim)'
  if (salud >= 0.5) return 'var(--color-olive)'
  if (salud >= 0.2) return 'var(--color-gold)'
  return 'var(--color-stamp)'
}

function etiquetaSalud(s: SaludElemento): string {
  if (s.salud === null) return 'Sin seguimiento'
  if (s.salud <= 0) return 'Toca cambiarlo'
  return `${Math.round(s.salud * 100)}%`
}

function SaludGauge({ s, activo, onClick }: { s: SaludElemento; activo: boolean; onClick: () => void }) {
  const pct = s.salud ?? 0
  const circunferencia = 2 * Math.PI * 15.5
  const color = colorSalud(s.salud)
  return (
    <button
      onClick={onClick}
      className={`entry flex flex-col items-center gap-1.5 p-3 text-center transition ${
        activo ? 'ring-2 ring-stamp' : ''
      }`}
      style={{ borderLeftColor: color }}
    >
      <svg viewBox="0 0 36 36" className="h-11 w-11">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-line)" strokeWidth="3.5" />
        {s.salud !== null && (
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={circunferencia * (1 - pct)}
            transform="rotate(-90 18 18)"
          />
        )}
        <text
          x="18"
          y="21"
          textAnchor="middle"
          fontSize={s.salud === null ? 7 : 9}
          fontWeight={700}
          fill={color}
          fontFamily="var(--font-sans)"
        >
          {s.salud === null ? '—' : `${Math.round(pct * 100)}`}
        </text>
      </svg>
      <span className="text-xs font-medium text-ink-bright">{s.tipo}</span>
      <span className="text-[0.68rem] text-ink-dim">{etiquetaSalud(s)}</span>
    </button>
  )
}

function VisitaForm({
  submitting,
  error,
  onSubmit,
}: {
  submitting: boolean
  error: string | null
  onSubmit: (e: FormEvent<HTMLFormElement>, seleccionados: string[], otros: string) => void
}) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [otros, setOtros] = useState('')

  function toggle(item: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  return (
    <form
      onSubmit={(e) => onSubmit(e, [...seleccionados], otros)}
      className="grid gap-2 sm:grid-cols-3"
    >
      <div className="min-w-0">
        <label className="mb-1 block text-xs text-ink-dim">Fecha</label>
        <input name="fecha" type="date" required className="input w-full" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Km</label>
        <input name="km" type="number" required className="input w-full" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Precio total (€)</label>
        <input name="precio" type="number" step="0.01" required className="input w-full" />
      </div>
      <div className="sm:col-span-3">
        <label className="mb-1 block text-xs text-ink-dim">Tienda / taller</label>
        <input name="tienda" required className="input w-full" />
      </div>
      <div className="sm:col-span-3">
        <label className="mb-1 block text-xs text-ink-dim">
          ¿Qué has tocado en esta visita? Cada uno guarda su propio historial y su propia alerta.
        </label>
        <div className="flex flex-wrap gap-2">
          {ELEMENTOS_COMUNES.map((item) => (
            <label
              key={item}
              className="flex items-center gap-1.5 rounded border border-line bg-paper-2 px-2 py-1 text-xs text-ink"
            >
              <input
                type="checkbox"
                checked={seleccionados.has(item)}
                onChange={() => toggle(item)}
              />
              {item}
            </label>
          ))}
        </div>
        <input
          value={otros}
          onChange={(e) => setOtros(e.target.value)}
          placeholder="Otro elemento (opcional, separa varios con comas)"
          className="input mt-2 w-full"
        />
      </div>
      {error && <p className="text-sm text-stamp sm:col-span-3">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary sm:col-span-3">
        {submitting ? 'Guardando…' : 'Añadir visita'}
      </button>
    </form>
  )
}

interface Visita {
  visitaId: string
  fecha: string
  km: number
  tienda: string
  precioTotal: number
  elementos: Elemento[]
}

export function ElementosTab({
  vehiculoId,
  kmActual,
  marca,
  modelo,
  anio,
  elementos,
  reload,
}: {
  vehiculoId: string
  kmActual: number
  marca: string
  modelo: string
  anio: number
  elementos: Elemento[]
  reload: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [orden, setOrden] = useState<OrdenFecha>('desc')

  const [editing, setEditing] = useState<Elemento | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [sugerencias, setSugerencias] = useState<{ tipo: string; intervaloKm?: number; intervaloMeses?: number }[] | null>(null)
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false)
  const [errorSugerencias, setErrorSugerencias] = useState<string | null>(null)

  async function handleSugerencias() {
    setCargandoSugerencias(true)
    setErrorSugerencias(null)
    try {
      const { sugerencias } = await api.ai.mantenimientoSugerido({ marca, modelo, anio })
      if (sugerencias.length === 0) setErrorSugerencias('La IA no ha devuelto ninguna sugerencia. Inténtalo de nuevo.')
      setSugerencias(sugerencias)
    } catch (err) {
      setErrorSugerencias((err as Error).message)
    } finally {
      setCargandoSugerencias(false)
    }
  }

  const salud = useMemo(
    () => calcularSaludElementos(new Date(), kmActual, elementos),
    [kmActual, elementos],
  )

  const visitas = useMemo<Visita[]>(() => {
    const mapa = new Map<string, Visita>()
    for (const e of elementos) {
      const clave = e.visitaId || e.id
      const existente = mapa.get(clave)
      if (existente) {
        existente.elementos.push(e)
        existente.precioTotal += e.precio
      } else {
        mapa.set(clave, {
          visitaId: clave,
          fecha: e.fecha,
          km: e.km,
          tienda: e.tienda,
          precioTotal: e.precio,
          elementos: [e],
        })
      }
    }
    const lista = [...mapa.values()]
    lista.sort((a, b) => (orden === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha)))
    return filtroTipo ? lista.filter((v) => v.elementos.some((e) => e.tipo === filtroTipo)) : lista
  }, [elementos, orden, filtroTipo])

  async function handleSubmit(e: FormEvent<HTMLFormElement>, seleccionados: string[], otros: string) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const tipos = [
      ...seleccionados,
      ...otros.split(',').map((s) => s.trim()).filter(Boolean),
    ]
    if (tipos.length === 0) {
      setError('Selecciona o escribe al menos un elemento')
      return
    }
    const fecha = String(form.get('fecha'))
    const km = Number(form.get('km'))
    const precio = Number(form.get('precio'))
    const tienda = String(form.get('tienda'))
    const visitaId = crypto.randomUUID()

    setSubmitting(true)
    setError(null)
    try {
      await Promise.all(
        tipos.map((tipo, i) =>
          api.elementos.create({
            vehiculoId,
            tipo,
            fecha,
            km,
            tienda,
            precio: i === 0 ? precio : 0,
            visitaId,
          }),
        ),
      )
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
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.elementos.update(editing.id, {
        tipo: String(form.get('tipo')),
        fecha: String(form.get('fecha')),
        km: Number(form.get('km')),
        precio: Number(form.get('precio')),
        tienda: String(form.get('tienda')),
        intervaloKm: form.get('intervaloKm') ? Number(form.get('intervaloKm')) : undefined,
        intervaloMeses: form.get('intervaloMeses') ? Number(form.get('intervaloMeses')) : undefined,
      })
      setEditing(null)
      reload()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(e: Elemento) {
    if (!confirm(`¿Borrar "${e.tipo}" del ${e.fecha}? No se puede deshacer.`)) return
    await api.elementos.remove(e.id)
    reload()
  }

  return (
    <div>
      {salud.length > 0 && (
        <div className="mb-5">
          <span className="eyebrow">Salud de cada elemento</span>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {salud.map((s) => (
              <SaludGauge
                key={s.tipo}
                s={s}
                activo={filtroTipo === s.tipo}
                onClick={() => setFiltroTipo((t) => (t === s.tipo ? null : s.tipo))}
              />
            ))}
          </div>
          {filtroTipo && (
            <button onClick={() => setFiltroTipo(null)} className="btn-ghost mt-2 text-xs">
              Quitar filtro «{filtroTipo}»
            </button>
          )}
        </div>
      )}

      <div className="mb-5">
        {sugerencias === null ? (
          <button
            onClick={handleSugerencias}
            disabled={cargandoSugerencias}
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <IconChispa className="h-4 w-4" aria-hidden="true" />
            {cargandoSugerencias
              ? 'Consultando…'
              : `Plan de mantenimiento sugerido para tu ${marca} ${modelo} (IA)`}
          </button>
        ) : (
          <div className="panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow">Sugerido por IA para {marca} {modelo}</span>
              <button onClick={() => setSugerencias(null)} className="text-xs text-ink-dim hover:text-stamp">
                Ocultar
              </button>
            </div>
            {sugerencias.length > 0 ? (
              <ul className="space-y-1.5">
                {sugerencias.map((s) => (
                  <li key={s.tipo} className="flex items-center justify-between gap-2 rounded bg-paper-2 px-2 py-1.5 text-sm">
                    <span className="text-ink">{s.tipo}</span>
                    <span className="text-xs text-ink-dim">
                      {[s.intervaloKm ? `${s.intervaloKm.toLocaleString('es-ES')} km` : null, s.intervaloMeses ? `${s.intervaloMeses} meses` : null]
                        .filter(Boolean)
                        .join(' / ') || 'sin intervalo'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-dim">Sin sugerencias.</p>
            )}
            <p className="mt-2 text-xs text-ink-dim">
              Orientativo, generado por IA — no es el manual oficial del fabricante. Úsalo como referencia al rellenar la visita de abajo.
            </p>
          </div>
        )}
        {errorSugerencias && <p className="mt-2 text-sm text-stamp">{errorSugerencias}</p>}
      </div>

      <div className="panel mb-4 p-4">
        <VisitaForm key={formKey} submitting={submitting} error={error} onSubmit={handleSubmit} />
      </div>

      {visitas.length > 0 && (
        <OrdenFechaButton orden={orden} onToggle={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))} />
      )}

      <ul className="space-y-2">
        {visitas.map((v) => (
          <li key={v.visitaId} className="entry p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-ink-dim">
                {v.fecha} · {v.km.toLocaleString('es-ES')} km · {v.tienda}
              </p>
              {v.precioTotal > 0 && <span className="text-sm font-medium text-stamp">{v.precioTotal.toFixed(2)} €</span>}
            </div>
            <ul className="space-y-1.5">
              {v.elementos.map((el) => (
                <li key={el.id} className="flex items-center justify-between gap-2 rounded bg-paper px-2 py-1.5">
                  <span className="text-sm text-ink">{el.tipo}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {(el.intervaloKm || el.intervaloMeses) && (
                      <span className="text-[0.68rem] text-ink-dim">
                        cada {el.intervaloKm ? `${el.intervaloKm.toLocaleString('es-ES')} km` : ''}
                        {el.intervaloKm && el.intervaloMeses ? ' / ' : ''}
                        {el.intervaloMeses ? `${el.intervaloMeses} meses` : ''}
                      </span>
                    )}
                    <button onClick={() => setEditing(el)} className="icon-btn h-6 w-6" aria-label={`Editar ${el.tipo}`} title="Editar">
                      <IconEdit className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(el)} className="icon-btn h-6 w-6" aria-label={`Eliminar ${el.tipo}`} title="Eliminar">
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {visitas.length === 0 && <p className="text-sm text-ink-dim">Sin elementos registrados.</p>}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar elemento">
        {editing && (
          <form onSubmit={handleEditSubmit} className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-ink-dim">Elemento</label>
              <input name="tipo" required defaultValue={editing.tipo} className="input w-full" list="elementos-catalogo" />
              <datalist id="elementos-catalogo">
                {ELEMENTOS_COMUNES.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-dim">Fecha</label>
              <input name="fecha" type="date" required defaultValue={editing.fecha} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-dim">Km</label>
              <input name="km" type="number" required defaultValue={editing.km} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-dim">Precio (€)</label>
              <input name="precio" type="number" step="0.01" required defaultValue={editing.precio} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-dim">Tienda / taller</label>
              <input name="tienda" required defaultValue={editing.tienda} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-dim">Avisar cada X km (opcional)</label>
              <input name="intervaloKm" type="number" defaultValue={editing.intervaloKm} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-dim">Avisar cada X meses (opcional)</label>
              <input name="intervaloMeses" type="number" defaultValue={editing.intervaloMeses} className="input w-full" />
            </div>
            {editError && <p className="text-sm text-stamp sm:col-span-2">{editError}</p>}
            <button type="submit" disabled={editSubmitting} className="btn-primary sm:col-span-2">
              {editSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}
