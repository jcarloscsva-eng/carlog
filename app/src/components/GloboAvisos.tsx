import type { AvisosVehiculo } from '@shared/avisos'

/**
 * Globo con el número de cosas a revisar, al estilo del contador de
 * notificaciones de iOS: amarillo si solo hay avisos próximos, rojo si
 * algo ya ha vencido. Si no hay nada pendiente no se pinta nada.
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
  if (!avisos.nivel || avisos.total === 0) return null

  const texto = avisos.total > 99 ? '99+' : String(avisos.total)
  const descripcion =
    avisos.nivel === 'grave'
      ? `${avisos.total} ${avisos.total === 1 ? 'aviso' : 'avisos'}, alguno vencido`
      : `${avisos.total} ${avisos.total === 1 ? 'aviso próximo' : 'avisos próximos'}`

  return (
    <span
      className={`globo-aviso is-${avisos.nivel}${esquina ? ' is-esquina' : ''}${
        enOscuro ? ' on-dark' : ''
      }`}
      title={descripcion}
      aria-label={descripcion}
      role="status"
    >
      {texto}
    </span>
  )
}
