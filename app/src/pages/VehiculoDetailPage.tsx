import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { AveriasTab } from '../components/tabs/AveriasTab'
import { MantenimientosTab } from '../components/tabs/MantenimientosTab'
import { RepuestosTab } from '../components/tabs/RepuestosTab'
import { ItvTab } from '../components/tabs/ItvTab'
import { SeguroTab } from '../components/tabs/SeguroTab'
import { Modal } from '../components/Modal'
import { MarcaModeloFields } from '../components/MarcaModeloFields'
import { SaludBadge } from '../components/SaludBadge'
import { IconAveria, IconItv, IconMantenimiento, IconRepuesto, IconSeguro } from '../components/Icons'
import { calcularProximasTareas } from '@shared/alerts'
import { calcularAntiguedad } from '@shared/vehiculo'
import { calcularSaludVehiculo } from '@shared/salud'
import type { VehiculoTipo } from '@shared/types'

const TABS = ['Averías', 'Mantenimientos', 'Repuestos', 'ITV', 'Seguro'] as const
type Tab = (typeof TABS)[number]

const TAB_ICONS: Record<Tab, typeof IconAveria> = {
  Averías: IconAveria,
  Mantenimientos: IconMantenimiento,
  Repuestos: IconRepuesto,
  ITV: IconItv,
  Seguro: IconSeguro,
}

const TIPOS: VehiculoTipo[] = ['Turismo', 'Moto', 'Furgoneta']

export function VehiculoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const routeId = id!
  const [tab, setTab] = useState<Tab>('Averías')
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: vehiculos, reload: reloadVehiculos } = useCollection(api.vehiculos.list)
  const { data: averias, reload: reloadAverias } = useCollection(api.averias.list)
  const { data: mantenimientos, reload: reloadMantenimientos } = useCollection(api.mantenimientos.list)
  const { data: repuestos, reload: reloadRepuestos } = useCollection(api.repuestos.list)
  const { data: itvs, reload: reloadItv } = useCollection(api.itv.list)
  const { data: seguros, reload: reloadSeguros } = useCollection(api.seguros.list)
  const { data: partes, reload: reloadPartes } = useCollection(api.partes.list)

  const vehiculo = vehiculos.find((v) => v.id === routeId)
  // Averias/Mantenimientos/Repuestos/ITV enlazan por matrícula (texto), no
  // por el id de registro de Airtable — ver shared/types.ts.
  const matricula = vehiculo?.matricula ?? ''

  const [editing, setEditing] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [focusKm, setFocusKm] = useState(false)

  // Al llegar con ?editarKm=1 (p. ej. desde el aviso de kilometraje
  // desactualizado), abre directamente el formulario de edición con el
  // foco en el campo de km, en vez de obligar a buscar el botón.
  useEffect(() => {
    if (vehiculo && searchParams.get('editarKm') === '1') {
      setEditing(true)
      setFocusKm(true)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('editarKm')
        return next
      }, { replace: true })
    }
  }, [vehiculo, searchParams, setSearchParams])

  const misMantenimientos = useMemo(
    () => mantenimientos.filter((m) => m.vehiculoId === matricula),
    [mantenimientos, matricula],
  )
  const misItvs = useMemo(() => itvs.filter((i) => i.vehiculoId === matricula), [itvs, matricula])

  const proximasTareas = useMemo(
    () => (vehiculo ? calcularProximasTareas(new Date(), vehiculo, misMantenimientos, misItvs) : []),
    [vehiculo, misMantenimientos, misItvs],
  )

  const misAverias = useMemo(() => averias.filter((a) => a.vehiculoId === matricula), [averias, matricula])
  const misSeguros = useMemo(() => seguros.filter((s) => s.vehiculoId === matricula), [seguros, matricula])

  const salud = useMemo(
    () =>
      vehiculo
        ? calcularSaludVehiculo(new Date(), vehiculo, misAverias, misMantenimientos, misItvs, misSeguros)
        : null,
    [vehiculo, misAverias, misMantenimientos, misItvs, misSeguros],
  )

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!vehiculo) return
    const form = new FormData(e.currentTarget)
    setEditSubmitting(true)
    setEditError(null)
    try {
      await api.vehiculos.update(vehiculo.id, {
        marca: String(form.get('marca')),
        modelo: String(form.get('modelo')),
        matricula: String(form.get('matricula')),
        anio: Number(form.get('anio')),
        tipo: form.get('tipo') as VehiculoTipo,
        kmActual: Number(form.get('kmActual')),
        fechaCompra: form.get('fechaCompra') ? String(form.get('fechaCompra')) : undefined,
      })
      setEditing(false)
      reloadVehiculos()
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setEditSubmitting(false)
    }
  }

  return (
    <div>
      <Link to="/" className="mb-3 inline-block text-sm text-ink-dim hover:text-stamp">
        ← Volver a vehículos
      </Link>

      {vehiculo && (
        <div className="dark-hero mb-6 flex items-start justify-between gap-3 px-5 py-4">
          <svg className="dark-hero-ghost" viewBox="0 0 57 64" aria-hidden="true">
            <path
              d="M 48.1 45.5 A 21 21 0 1 1 48.1 18.5"
              fill="none"
              stroke="#f4eee1"
              strokeWidth={9}
              strokeLinecap="round"
            />
          </svg>
          <div className="relative">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">
                {vehiculo.marca} {vehiculo.modelo}
              </h1>
              {salud && <SaludBadge salud={salud} dark />}
            </div>
            <p className="text-sm text-[#b6a98f]">
              {vehiculo.matricula} · {vehiculo.anio} · {vehiculo.tipo} ·{' '}
              <span className="font-medium text-[#e2624f]">{vehiculo.kmActual.toLocaleString('es-ES')} km</span>
              {vehiculo.fechaCompra && (
                <>
                  {' '}
                  · {calcularAntiguedad(vehiculo.fechaCompra, new Date())} años contigo
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="relative shrink-0 rounded-md border border-[#423a2c] px-3 py-2 text-sm font-medium text-[#f4eee1] transition hover:border-[#e2624f] hover:text-[#e2624f]"
          >
            Editar vehículo
          </button>
        </div>
      )}

      {vehiculo && (
        <div className="mb-6">
          <span className="eyebrow">Próximas tareas</span>
          <ul className="mt-2 space-y-2">
            {proximasTareas.map((t) => (
              <li key={`${t.tipo}-${t.titulo}`} className="entry flex items-center justify-between p-3">
                <span className="text-sm text-ink">
                  {t.tipo === 'ITV' ? 'ITV' : t.titulo}
                </span>
                <span className={`text-xs ${t.urgente ? 'font-medium text-amber-700' : 'text-ink-dim'}`}>
                  {t.fechaObjetivo && t.fechaObjetivo.toLocaleDateString('es-ES')}
                  {t.fechaObjetivo && t.kmObjetivo ? ' · ' : ''}
                  {t.kmObjetivo && `${t.kmObjetivo.toLocaleString('es-ES')} km`}
                </span>
              </li>
            ))}
          </ul>
          {proximasTareas.length <= 1 && (
            <p className="mt-2 text-xs text-ink-dim">
              Añade un intervalo (km o meses) a un mantenimiento para que también aparezca aquí.
            </p>
          )}
        </div>
      )}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const Icon = TAB_ICONS[t]
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                tab === t
                  ? 'border-b-2 border-stamp text-stamp'
                  : 'text-ink-dim hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t}
            </button>
          )
        })}
      </div>

      {tab === 'Averías' && (
        <AveriasTab
          vehiculoId={matricula}
          marca={vehiculo?.marca ?? ''}
          modelo={vehiculo?.modelo ?? ''}
          averias={averias.filter((a) => a.vehiculoId === matricula)}
          reload={reloadAverias}
        />
      )}
      {tab === 'Mantenimientos' && (
        <MantenimientosTab
          vehiculoId={matricula}
          mantenimientos={misMantenimientos}
          reload={reloadMantenimientos}
        />
      )}
      {tab === 'Repuestos' && (
        <RepuestosTab
          vehiculoId={matricula}
          repuestos={repuestos.filter((r) => r.vehiculoId === matricula)}
          reload={reloadRepuestos}
        />
      )}
      {tab === 'ITV' && (
        <ItvTab vehiculoId={matricula} itvs={misItvs} reload={reloadItv} />
      )}
      {tab === 'Seguro' && (
        <SeguroTab
          vehiculoId={matricula}
          seguros={seguros.filter((s) => s.vehiculoId === matricula)}
          partes={partes.filter((p) => p.vehiculoId === matricula)}
          reloadSeguros={reloadSeguros}
          reloadPartes={reloadPartes}
        />
      )}

      <Modal
        open={editing}
        onClose={() => {
          setEditing(false)
          setFocusKm(false)
        }}
        title="Editar vehículo"
      >
        {vehiculo && (
          <form onSubmit={handleEditSubmit} className="grid gap-2 sm:grid-cols-2">
            <MarcaModeloFields defaultMarca={vehiculo.marca} defaultModelo={vehiculo.modelo} />
            <input
              name="matricula"
              required
              defaultValue={vehiculo.matricula}
              placeholder="Matrícula"
              className="input"
            />
            <input
              name="anio"
              required
              type="number"
              defaultValue={vehiculo.anio}
              placeholder="Año"
              className="input"
            />
            <select name="tipo" required defaultValue={vehiculo.tipo} className="input">
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="kmActual"
              required
              type="number"
              autoFocus={focusKm}
              defaultValue={vehiculo.kmActual}
              placeholder="Km actual"
              className="input"
            />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-ink-dim">Fecha de compra (opcional)</label>
              <input
                name="fechaCompra"
                type="date"
                defaultValue={vehiculo.fechaCompra}
                className="input w-full"
              />
            </div>
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
