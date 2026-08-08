import type { SaludVehiculo } from '@shared/salud'

const TONOS: Record<SaludVehiculo['nivel'], string> = {
  bueno: 'is-positive',
  atencion: 'is-neutral',
  urgente: 'is-negative',
}

const ETIQUETAS: Record<SaludVehiculo['nivel'], string> = {
  bueno: 'Al día',
  atencion: 'Revisar',
  urgente: 'Urgente',
}

export function SaludBadge({ salud, dark = false }: { salud: SaludVehiculo; dark?: boolean }) {
  return (
    <span className={`stamp-badge ${TONOS[salud.nivel]} ${dark ? 'on-dark' : ''}`}>
      {salud.puntuacion} · {ETIQUETAS[salud.nivel]}
    </span>
  )
}
