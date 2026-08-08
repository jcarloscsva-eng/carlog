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
}

/** Estado mostrado como un sello de tinta, en vez de texto de color plano. */
export function EstadoStamp({ estado }: { estado: string }) {
  const tono = TONOS[estado] ?? 'is-neutral'
  return <span className={`stamp-badge ${tono}`}>{estado}</span>
}
