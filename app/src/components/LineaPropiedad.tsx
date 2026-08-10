import type { AnioPropiedad, TipoEventoLinea } from '@shared/linea-propiedad'

const COLOR_EVENTO: Record<TipoEventoLinea, string> = {
  elemento: 'var(--color-olive)',
  itv: 'var(--color-itv)',
  'averia-resuelta': 'var(--color-stamp)',
  'averia-pendiente': 'var(--color-stamp)',
}

const euros = (n: number) =>
  `${n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} €`

const BAND_W = 118
const PAD_L = 34
const PAD_R = 20
const BAR_TOP = 22
const BAR_MAX_H = 92
const DOTS_Y = BAR_TOP + BAR_MAX_H + 26
const AXIS_Y = DOTS_Y + 22
const SEGURO_Y = DOTS_Y - 12
const H = AXIS_Y + 26

/**
 * Franja de gasto y eventos del vehículo por año de propiedad (Año 1, Año
 * 2… desde la fecha de compra, no año natural — ver shared/linea-propiedad).
 * Todo se dibuja a partir de los datos, nunca con coordenadas fijas, para
 * que se adapte a cualquier vehículo sin retocar el componente.
 */
export function LineaPropiedad({ anios }: { anios: AnioPropiedad[] }) {
  const maxGasto = Math.max(...anios.map((a) => a.gasto), 1)
  const maxAcumulado = anios[anios.length - 1]?.acumulado || 1
  const width = PAD_L + BAND_W * anios.length + PAD_R
  const enCurso = anios.find((a) => a.parcial)
  const idxEnCurso = enCurso ? anios.indexOf(enCurso) : -1

  const lineTop = 14
  const lineH = BAR_MAX_H - lineTop + BAR_TOP - 4
  const puntosAcumulado = anios.map((a, i) => {
    const x = PAD_L + i * BAND_W + BAND_W / 2
    const ratio = a.acumulado / maxAcumulado
    const y = BAR_TOP + BAR_MAX_H - 4 - ratio * lineH
    return { x, y, valor: a.acumulado }
  })
  const polilinea = puntosAcumulado.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="panel mb-6 overflow-x-auto p-3">
      <svg
        viewBox={`0 0 ${width} ${H}`}
        width={width}
        height={H}
        role="img"
        aria-label="Línea de tiempo de gasto y eventos por año de propiedad"
        className="block"
      >
        <line
          x1={PAD_L}
          y1={BAR_TOP + BAR_MAX_H}
          x2={width - PAD_R}
          y2={BAR_TOP + BAR_MAX_H}
          stroke="var(--color-line)"
          strokeWidth={1}
        />

        {anios.map((a, i) => {
          const x0 = PAD_L + i * BAND_W
          const xc = x0 + BAND_W / 2
          const h = (a.gasto / maxGasto) * BAR_MAX_H

          return (
            <g key={a.n}>
              <rect
                x={x0 + BAND_W * 0.22}
                y={BAR_TOP + BAR_MAX_H - h}
                width={BAND_W * 0.56}
                height={Math.max(h, a.gasto > 0 ? 3 : 0)}
                rx={3}
                fill={a.gasto > 0 ? 'var(--color-gold-soft)' : 'transparent'}
                stroke={a.gasto > 0 ? 'var(--color-gold)' : 'none'}
                strokeWidth={1}
              >
                <title>
                  {`Año ${a.n}${a.parcial ? ' (en curso)' : ''} — ${euros(a.gasto)} gastados`}
                </title>
              </rect>

              {a.gasto > 0 && (
                <text
                  x={xc}
                  y={BAR_TOP + BAR_MAX_H - h - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--color-ink-dim)"
                >
                  {Math.round(a.gasto)}€
                </text>
              )}

              {i > 0 && (
                <line
                  x1={x0}
                  y1={BAR_TOP - 4}
                  x2={x0}
                  y2={AXIS_Y - 8}
                  stroke="var(--color-line)"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
              )}

              <text
                x={xc}
                y={AXIS_Y}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--color-ink-bright)"
                fontFamily="var(--font-display)"
              >
                {`Año ${a.n}`}
              </text>
              <text x={xc} y={AXIS_Y + 12} textAnchor="middle" fontSize={8.5} fill="var(--color-ink-dim)">
                {a.rango}
              </text>

              {a.seguroDesde !== undefined && (
                <line
                  x1={x0 + (a.seguroDesde / 12) * BAND_W}
                  y1={SEGURO_Y}
                  x2={Math.min(x0 + ((a.seguroHasta ?? 12) / 12) * BAND_W, x0 + BAND_W)}
                  y2={SEGURO_Y}
                  stroke="var(--color-ink-dim)"
                  strokeWidth={3}
                  opacity={0.55}
                  strokeLinecap="round"
                />
              )}

              {a.eventos.map((ev, j) => {
                const ex = x0 + (ev.mes / 12) * BAND_W
                const pendiente = ev.tipo === 'averia-pendiente'
                return (
                  <circle
                    key={j}
                    cx={ex}
                    cy={DOTS_Y}
                    r={4.5}
                    fill={pendiente ? 'var(--color-paper)' : COLOR_EVENTO[ev.tipo]}
                    stroke={pendiente ? COLOR_EVENTO[ev.tipo] : 'none'}
                    strokeWidth={pendiente ? 2 : 0}
                  >
                    <title>{ev.label + (ev.coste ? ` — ${euros(ev.coste)}` : '')}</title>
                  </circle>
                )
              })}
            </g>
          )
        })}

        {enCurso && enCurso.hoyMes !== undefined && (
          <>
            <line
              x1={PAD_L + idxEnCurso * BAND_W + (enCurso.hoyMes / 12) * BAND_W}
              y1={BAR_TOP - 10}
              x2={PAD_L + idxEnCurso * BAND_W + (enCurso.hoyMes / 12) * BAND_W}
              y2={AXIS_Y - 8}
              stroke="var(--color-stamp)"
              strokeWidth={1.4}
              strokeDasharray="3 2"
            />
            <text
              x={PAD_L + idxEnCurso * BAND_W + (enCurso.hoyMes / 12) * BAND_W}
              y={BAR_TOP - 13}
              textAnchor="middle"
              fontSize={8.5}
              fontWeight={700}
              fill="var(--color-stamp)"
            >
              HOY
            </text>
          </>
        )}

        <polyline
          points={polilinea}
          fill="none"
          stroke="var(--color-stamp)"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {puntosAcumulado.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--color-paper-2)"
            stroke="var(--color-stamp)"
            strokeWidth={1.8}
          >
            <title>{`Acumulado a fin de Año ${anios[i].n}: ${euros(p.valor)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  )
}
