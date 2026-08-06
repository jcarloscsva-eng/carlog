export type OrdenFecha = 'desc' | 'asc'

export function OrdenFechaButton({
  orden,
  onToggle,
}: {
  orden: OrdenFecha
  onToggle: () => void
}) {
  return (
    <button onClick={onToggle} className="btn-ghost mb-2 px-2 py-1 text-xs">
      Fecha: {orden === 'desc' ? 'más reciente primero ↓' : 'más antigua primero ↑'}
    </button>
  )
}
