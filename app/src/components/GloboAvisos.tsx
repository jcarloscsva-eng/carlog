import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AvisoDetalle, AvisosVehiculo } from '@shared/avisos'

/**
 * Globo con el número de cosas a revisar, al estilo del contador de
 * notificaciones de iOS: amarillo si solo hay avisos próximos, rojo si
 * algo ya ha vencido. Cuando no hay nada pendiente muestra un tick verde
 * en vez de desaparecer — así "todo al día" no se confunde con "no ha
 * cargado".
 *
 * Al pulsarlo (si se pasa `detalle`), despliega el motivo de cada aviso —
 * antes solo se veía el número, y había que entrar en la ficha y mirar
 * pestaña por pestaña para saber qué era. El desplegable se monta en un
 * portal sobre `document.body`, con posición calculada a partir del
 * botón: algunos sitios donde vive el globo (la cabecera oscura de la
 * ficha) tienen `overflow: hidden` para recortar el logo de fondo, y eso
 * cortaría el desplegable si fuera un simple `position: absolute` normal.
 *
 * `esquina` lo superpone sobre la esquina de la tarjeta (el contenedor
 * debe ser `relative`); sin ella se coloca en línea.
 */
export function GloboAvisos({
  avisos,
  detalle,
  esquina = false,
  enOscuro = false,
}: {
  avisos: AvisosVehiculo
  detalle?: AvisoDetalle[]
  esquina?: boolean
  enOscuro?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const ANCHO_POPOVER = 256 // w-64

  useEffect(() => {
    if (!abierto) return

    function ubicar() {
      const rect = btnRef.current?.getBoundingClientRect()
      if (!rect) return
      // Por defecto alineado por la derecha con el botón (el caso habitual:
      // globo en la esquina superior derecha de algo). Si eso lo saca por
      // el borde izquierdo de la pantalla — el globo de la cabecera de la
      // ficha vive pegado a la izquierda —, se alinea por la izquierda en
      // su lugar, siempre dentro del viewport con un margen de 8px.
      let left = rect.right - ANCHO_POPOVER
      if (left < 8) left = rect.left
      left = Math.min(Math.max(left, 8), window.innerWidth - ANCHO_POPOVER - 8)
      setPos({ top: rect.bottom + 6, left })
    }
    ubicar()

    function onOutside(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setAbierto(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    // Cerrar en vez de perseguir el scroll: es un desplegable de un vistazo, no necesita seguir al botón.
    window.addEventListener('scroll', () => setAbierto(false), { capture: true, once: true })
    window.addEventListener('resize', ubicar)
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('resize', ubicar)
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [abierto])

  const alDia = !avisos.nivel || avisos.total === 0
  // Nivel/color del globo en sí, sin el posicionamiento de esquina: cuando
  // hay `detalle`, la esquina la coloca el div envolvente (ver abajo) para
  // no acumular dos posicionamientos absolutos (envolvente + globo).
  const claseNivel = ['globo-aviso', alDia ? 'is-ok' : `is-${avisos.nivel}`, enOscuro ? 'on-dark' : '']
    .filter(Boolean)
    .join(' ')
  const clases = [claseNivel, esquina ? 'is-esquina' : ''].filter(Boolean).join(' ')

  const descripcion = alDia
    ? 'Todo al día'
    : avisos.nivel === 'grave'
      ? `${avisos.total} ${avisos.total === 1 ? 'aviso' : 'avisos'}, alguno vencido`
      : `${avisos.total} ${avisos.total === 1 ? 'aviso próximo' : 'avisos próximos'}`

  const contenido = alDia ? (
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
  )

  if (!detalle) {
    return (
      <span className={clases} title={descripcion} aria-label={descripcion} role="status">
        {contenido}
      </span>
    )
  }

  return (
    <div className={esquina ? 'absolute -top-2 -right-2 z-10' : 'relative inline-block'}>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setAbierto((v) => !v)
        }}
        className={`${claseNivel} cursor-pointer${esquina ? ' border-2 border-paper' : ''}`}
        title={descripcion}
        aria-label={`${descripcion} — pulsa para ver el detalle`}
        aria-expanded={abierto}
      >
        {contenido}
      </button>

      {abierto &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: ANCHO_POPOVER }}
            className="z-50 rounded-lg border border-line bg-paper-2 p-2 text-left shadow-lg"
          >
            {detalle.length === 0 ? (
              <p className="px-1.5 py-1 text-xs text-ink-dim">Todo al día. Nada pendiente.</p>
            ) : (
              <ul className="space-y-1">
                {detalle.map((a, i) => (
                  <li
                    key={`${a.titulo}-${i}`}
                    className={`entry px-2 py-1.5 ${a.nivel === 'grave' ? '' : 'border-l-gold'}`}
                  >
                    <p className="text-xs font-medium text-ink-bright">{a.titulo}</p>
                    <p className="text-xs text-ink-dim">{a.detalle}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
