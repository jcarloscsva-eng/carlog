import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '../lib/api'
import { useCollection } from '../hooks/useCollection'

type Periodo = 'anio-actual' | '3m' | '6m' | '12m' | 'personalizado'
type Tipo = 'Mantenimiento' | 'Repuesto'

interface GastoItem {
  id: string
  vehiculoId: string
  fecha: string
  precio: number
  tipo: Tipo
  categoria: string
}

function rangoPorPeriodo(periodo: Periodo, desde: string, hasta: string): [Date, Date] {
  const hoy = new Date()
  if (periodo === 'anio-actual') {
    return [new Date(hoy.getFullYear(), 0, 1), hoy]
  }
  if (periodo === 'personalizado') {
    return [new Date(desde || '1970-01-01'), new Date(hasta || hoy)]
  }
  const meses = { '3m': 3, '6m': 6, '12m': 12 }[periodo]
  const inicio = new Date(hoy)
  inicio.setMonth(inicio.getMonth() - meses)
  return [inicio, hoy]
}

export function ReportesPage() {
  const { data: vehiculos } = useCollection(api.vehiculos.list)
  const { data: mantenimientos } = useCollection(api.mantenimientos.list)
  const { data: repuestos } = useCollection(api.repuestos.list)

  const [periodo, setPeriodo] = useState<Periodo>('anio-actual')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tiposActivos, setTiposActivos] = useState<Set<Tipo>>(new Set(['Mantenimiento', 'Repuesto']))
  const [vehiculoId, setVehiculoId] = useState<string>('todos')

  const items: GastoItem[] = useMemo(
    () => [
      ...mantenimientos.map((m) => ({
        id: m.id,
        vehiculoId: m.vehiculoId,
        fecha: m.fecha,
        precio: m.precio,
        tipo: 'Mantenimiento' as const,
        categoria: m.elementos,
      })),
      ...repuestos.map((r) => ({
        id: r.id,
        vehiculoId: r.vehiculoId,
        fecha: r.fecha,
        precio: r.precio,
        tipo: 'Repuesto' as const,
        categoria: r.tipoRepuesto,
      })),
    ],
    [mantenimientos, repuestos],
  )

  const [rangoInicio, rangoFin] = rangoPorPeriodo(periodo, desde, hasta)

  const filtrados = items.filter((item) => {
    const fecha = new Date(item.fecha)
    if (fecha < rangoInicio || fecha > rangoFin) return false
    if (!tiposActivos.has(item.tipo)) return false
    if (vehiculoId !== 'todos' && item.vehiculoId !== vehiculoId) return false
    return true
  })

  const total = filtrados.reduce((sum, i) => sum + i.precio, 0)

  const porMes = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of filtrados) {
      const clave = item.fecha.slice(0, 7)
      map.set(clave, (map.get(clave) ?? 0) + item.precio)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes, total: Number(total.toFixed(2)) }))
  }, [filtrados])

  function toggleTipo(tipo: Tipo) {
    setTiposActivos((prev) => {
      const next = new Set(prev)
      if (next.has(tipo)) next.delete(tipo)
      else next.add(tipo)
      return next
    })
  }

  function exportarPdf() {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Carlog — Informe de gastos', 14, 16)
    doc.setFontSize(10)
    doc.text(
      `Periodo: ${rangoInicio.toLocaleDateString('es-ES')} – ${rangoFin.toLocaleDateString('es-ES')}`,
      14,
      23,
    )
    doc.text(`Total: ${total.toFixed(2)} €`, 14, 29)

    autoTable(doc, {
      startY: 35,
      head: [['Fecha', 'Tipo', 'Categoría', 'Precio (€)']],
      body: filtrados
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((i) => [i.fecha, i.tipo, i.categoria, i.precio.toFixed(2)]),
    })

    doc.save('carlog-informe.pdf')
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Reportes</h1>

      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as Periodo)}
          className="input"
        >
          <option value="anio-actual">Este año</option>
          <option value="3m">Últimos 3 meses</option>
          <option value="6m">Últimos 6 meses</option>
          <option value="12m">Últimos 12 meses</option>
          <option value="personalizado">Periodo personalizado</option>
        </select>

        {periodo === 'personalizado' && (
          <>
            <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} />
            <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </>
        )}

        <select value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)} className="input">
          <option value="todos">Todos los vehículos</option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.marca} {v.modelo}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3 text-sm text-slate-600">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={tiposActivos.has('Mantenimiento')}
              onChange={() => toggleTipo('Mantenimiento')}
            />
            Mantenimientos
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={tiposActivos.has('Repuesto')}
              onChange={() => toggleTipo('Repuesto')}
            />
            Repuestos
          </label>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-lg font-semibold text-slate-900">Total: {total.toFixed(2)} €</p>
        <button
          onClick={exportarPdf}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Exportar PDF
        </button>
      </div>

      <div className="mb-4 h-72 rounded-xl border border-slate-200 bg-white p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={porMes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(value) => `${Number(value).toFixed(2)} €`} />
            <Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2">
        {filtrados
          .sort((a, b) => b.fecha.localeCompare(a.fecha))
          .map((i) => (
            <li
              key={`${i.tipo}-${i.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm"
            >
              <span>
                {i.fecha} · {i.tipo} · {i.categoria}
              </span>
              <span className="font-medium">{i.precio.toFixed(2)} €</span>
            </li>
          ))}
        {filtrados.length === 0 && <p className="text-sm text-slate-500">Sin registros en este periodo.</p>}
      </ul>
    </div>
  )
}
