import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { AveriasTab } from '../components/tabs/AveriasTab'
import { MantenimientosTab } from '../components/tabs/MantenimientosTab'
import { RepuestosTab } from '../components/tabs/RepuestosTab'
import { ItvTab } from '../components/tabs/ItvTab'
import { SeguroTab } from '../components/tabs/SeguroTab'
import { Modal } from '../components/Modal'
import { calcularProximasTareas } from '@shared/alerts'
import { calcularAntiguedad } from '@shared/vehiculo'
import type { VehiculoTipo } from '@shared/types'

const TABS = ['Averías', 'Mantenimientos', 'Repuestos', 'ITV', 'Seguro'] as const
type Tab = (typeof TABS)[number]

const TIPOS: VehiculoTipo[] = ['Turismo', 'Moto', 'Furgoneta']

export function VehiculoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const routeId = id!
  const [tab, setTab] = useState<Tab>('Averías')

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

  const misMantenimientos = useMemo(
    () => mantenimientos.filter((m) => m.vehiculoId === matricula),
    [mantenimientos, matricula],
  )
  const misItvs = useMemo(() => itvs.filter((i) => i.vehiculoId === matricula), [itvs, matricula])

  const proximasTareas = useMemo(
    () => (vehiculo ? calcularProximasTareas(new Date(), vehiculo, misMantenimientos, misItvs) : []),
    [vehiculo, misMantenimientos, misItvs],
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
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="heading mb-1 text-2xl">
              {vehiculo.marca} {vehiculo.modelo}
            </h1>
            <p className="text-sm text-ink-dim">
              {vehiculo.matricula} · {vehiculo.anio} · {vehiculo.tipo} ·{' '}
              <span className="text-stamp">{vehiculo.kmActual.toLocaleString('es-ES')} km</span>
              {vehiculo.fechaCompra && (
                <>
                  {' '}
                  · {calcularAntiguedad(vehiculo.fechaCompra, new Date())} años contigo
                </>
              )}
            </p>
          </div>
          <button onClick={() => setEditing(true)} className="btn-ghost shrink-0">
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

      <div className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-b-2 border-stamp text-stamp'
                : 'text-ink-dim hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
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

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar vehículo">
        {vehiculo && (
          <form onSubmit={handleEditSubmit} className="grid gap-2 sm:grid-cols-2">
            <input name="marca" required defaultValue={vehiculo.marca} placeholder="Marca" className="input" />
            <input name="modelo" required defaultValue={vehiculo.modelo} placeholder="Modelo" className="input" />
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
