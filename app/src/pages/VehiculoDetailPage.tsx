import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'
import { AveriasTab } from '../components/tabs/AveriasTab'
import { MantenimientosTab } from '../components/tabs/MantenimientosTab'
import { RepuestosTab } from '../components/tabs/RepuestosTab'
import { ItvTab } from '../components/tabs/ItvTab'

const TABS = ['Averías', 'Mantenimientos', 'Repuestos', 'ITV'] as const
type Tab = (typeof TABS)[number]

export function VehiculoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const vehiculoId = id!
  const [tab, setTab] = useState<Tab>('Averías')

  const { data: vehiculos } = useCollection(api.vehiculos.list)
  const { data: averias, reload: reloadAverias } = useCollection(api.averias.list)
  const { data: mantenimientos, reload: reloadMantenimientos } = useCollection(api.mantenimientos.list)
  const { data: repuestos, reload: reloadRepuestos } = useCollection(api.repuestos.list)
  const { data: itvs, reload: reloadItv } = useCollection(api.itv.list)

  const vehiculo = vehiculos.find((v) => v.id === vehiculoId)

  return (
    <div>
      <Link to="/" className="mb-3 inline-block text-sm text-ink-dim hover:text-gold">
        ← Volver a vehículos
      </Link>

      {vehiculo && (
        <h1 className="heading mb-1 text-2xl">
          {vehiculo.marca} {vehiculo.modelo}
        </h1>
      )}
      {vehiculo && (
        <p className="mb-6 text-sm text-ink-dim">
          {vehiculo.matricula} · {vehiculo.anio} · {vehiculo.tipo} ·{' '}
          <span className="text-gold">{vehiculo.kmActual.toLocaleString('es-ES')} km</span>
        </p>
      )}

      <div className="mb-6 flex gap-1 border-b border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-b-2 border-gold text-gold'
                : 'text-ink-dim hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Averías' && (
        <AveriasTab
          vehiculoId={vehiculoId}
          averias={averias.filter((a) => a.vehiculoId === vehiculoId)}
          reload={reloadAverias}
        />
      )}
      {tab === 'Mantenimientos' && (
        <MantenimientosTab
          vehiculoId={vehiculoId}
          mantenimientos={mantenimientos.filter((m) => m.vehiculoId === vehiculoId)}
          reload={reloadMantenimientos}
        />
      )}
      {tab === 'Repuestos' && (
        <RepuestosTab
          vehiculoId={vehiculoId}
          repuestos={repuestos.filter((r) => r.vehiculoId === vehiculoId)}
          reload={reloadRepuestos}
        />
      )}
      {tab === 'ITV' && (
        <ItvTab
          vehiculoId={vehiculoId}
          itvs={itvs.filter((i) => i.vehiculoId === vehiculoId)}
          reload={reloadItv}
        />
      )}
    </div>
  )
}
