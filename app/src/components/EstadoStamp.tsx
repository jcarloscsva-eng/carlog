type Tono = 'is-positive' | 'is-negative' | 'is-neutral'

const TONOS: Record<string, Tono> = {
  // Averías
  Pendiente: 'is-negative',
  Resuelta: 'is-positive',
  // ITV
  Favorable: 'is-positive',
  Desfavorable: 'is-negative',
  Negativo: 'is-negative',
  // Partes de seguro
  Abierto: 'is-negative',
  'En trámite': 'is-neutral',
  Cerrado: 'is-positive',
  // Póliza
  Vigente: 'is-positive',
}

/**
 * Estado mostrado como una píldora plana (para listas: averías, ITV,
 * partes) o, con `destacado`, como el sello de tinta girado — reservado a
 * un único elemento por pantalla para que no se convierta en ruido.
 */
export function EstadoStamp({ estado, destacado = false }: { estado: string; destacado?: boolean }) {
  const tono = TONOS[estado] ?? 'is-neutral'
  return <span className={`${destacado ? 'stamp-badge' : 'badge-pill'} ${tono}`}>{estado}</span>
}
