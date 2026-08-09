import type { AvisosVehiculo } from '@shared/avisos'

/**
 * Globo con el número de cosas a revisar, al estilo del contador de
 * notificaciones de iOS: amarillo si solo hay avisos próximos, rojo si
 * algo ya ha vencido. Cuando no hay nada pendiente muestra un tick verde
 * en vez de desaparecer — así "todo al día" no se confunde con "no ha
 * cargado".
 *
 * `esquina` lo superpone sobre la esquina de la tarjeta (el contenedor
 * debe ser `relative`); sin ella se coloca en línea.
 */
export function GloboAvisos({
  avisos,
  esquina = false,
  enOscuro = false,
}: {
  avisos: AvisosVehiculo
  esquina?: boolean
  enOscuro?: boolean
}) {
  const alDia = !avisos.nivel || avisos.total === 0
  const clases = [
    'globo-aviso',
    alDia ? 'is-ok' : `is-${avisos.nivel}`,
    esquina ? 'is-esquina' : '',
    enOscuro ? 'on-dark' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const descripcion = alDia
    ? 'Todo al día'
    : avisos.nivel === 'grave'
      ? `${avisos.total} ${avisos.total === 1 ? 'aviso' : 'avisos'}, alguno vencido`
      : `${avisos.total} ${avisos.total === 1 ? 'aviso próximo' : 'avisos próximos'}`

  return (
    <span className={clases} title={descripcion} aria-label={descripcion} role="status">
      {alDia ? (
        <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
          <path
            d="M4 12.5 L9.5 18 L20 6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : avisos.total > 99 ? (
        '99+'
      ) : (
        String(avisos.total)
      )}
    </span>
  )
}
