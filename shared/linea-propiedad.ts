import type { Averia, Elemento, Itv, Parte, Seguro, Vehiculo } from './types'

export type TipoEventoLinea = 'elemento' | 'itv' | 'averia-pendiente' | 'averia-resuelta'

export interface EventoLinea {
  /** Mes dentro del año de propiedad, 0–11.9 (posición horizontal del punto). */
  mes: number
  tipo: TipoEventoLinea
  label: string
  coste?: number
}

export interface AnioPropiedad {
  /** Año de propiedad: 1 es el primer año desde la compra, no un año natural. */
  n: number
  /** "2021–22", para dar contexto de calendario sin ser el criterio de agrupación. */
  rango: string
  gasto: number
  acumulado: number
  /** true si "hoy" cae dentro de este año — el último de la lista, casi siempre. */
  parcial: boolean
  /** Solo si parcial: dónde cae "hoy" dentro del año, para el marcador. */
  hoyMes?: number
  eventos: EventoLinea[]
  /** Tramo de cobertura de seguro dentro de este año (no es un punto: es continua). */
  seguroDesde?: number
  seguroHasta?: number
}

const DIAS_POR_MES = 30.437

function origenPropiedad(vehiculo: Vehiculo): Date {
  // Mismo criterio de respaldo que ya usa el Pasaporte cuando no hay fecha
  // de compra: anclar al año de matriculación.
  return new Date(vehiculo.fechaCompra ?? `${vehiculo.anio}-01-01`)
}

function mesesDesde(inicio: Date, fecha: Date): number {
  return (fecha.getTime() - inicio.getTime()) / 86_400_000 / DIAS_POR_MES
}

/**
 * Agrupa el historial del vehículo por año de propiedad (Año 1, Año 2…,
 * contados desde la fecha de compra) en vez de por año natural: un coche
 * comprado en octubre tendría un "2019" de tres meses y un "2020" de doce,
 * y la comparación entre años dejaría de ser justa. Anclado a la fecha de
 * compra, cada año pesa lo mismo.
 *
 * No pide nada nuevo: trabaja sobre los mismos datos que ya carga la
 * ficha del vehículo (el mismo conjunto que usa PasaporteTab).
 */
export function calcularAniosPropiedad(
  hoy: Date,
  vehiculo: Vehiculo,
  averias: Averia[],
  elementos: Elemento[],
  itvs: Itv[],
  seguros: Seguro[],
  partes: Parte[],
): AnioPropiedad[] {
  const origen = origenPropiedad(vehiculo)
  const mesesTotales = Math.max(0, mesesDesde(origen, hoy))
  const numAnios = Math.max(1, Math.floor(mesesTotales / 12) + 1)

  const anios: AnioPropiedad[] = []
  for (let n = 1; n <= numAnios; n++) {
    const inicio = new Date(origen)
    inicio.setFullYear(inicio.getFullYear() + (n - 1))
    const fin = new Date(origen)
    fin.setFullYear(fin.getFullYear() + n)
    const parcial = hoy < fin
    anios.push({
      n,
      rango: `${inicio.getFullYear()}–${String(fin.getFullYear()).slice(2)}`,
      gasto: 0,
      acumulado: 0,
      parcial,
      hoyMes: parcial ? Math.max(0, Math.min(11.9, mesesDesde(inicio, hoy))) : undefined,
      eventos: [],
    })
  }

  function bucketDe(fecha: Date): { anio: AnioPropiedad; mes: number } | null {
    if (Number.isNaN(fecha.getTime()) || fecha < origen) return null
    const meses = mesesDesde(origen, fecha)
    const n = Math.floor(meses / 12) + 1
    const anio = anios[n - 1]
    if (!anio) return null
    return { anio, mes: Math.max(0, Math.min(11.9, meses - (n - 1) * 12)) }
  }

  for (const a of averias) {
    const b = bucketDe(new Date(a.fecha))
    if (!b) continue
    b.anio.eventos.push({
      mes: b.mes,
      tipo: a.estado === 'Pendiente' ? 'averia-pendiente' : 'averia-resuelta',
      label: a.descripcion,
    })
  }
  for (const e of elementos) {
    const b = bucketDe(new Date(e.fecha))
    if (!b) continue
    b.anio.eventos.push({ mes: b.mes, tipo: 'elemento', label: e.tipo, coste: e.precio })
    b.anio.gasto += e.precio
  }
  for (const i of itvs) {
    const b = bucketDe(new Date(i.fechaRealizada))
    if (!b) continue
    b.anio.eventos.push({ mes: b.mes, tipo: 'itv', label: `ITV — ${i.resultado}` })
  }
  // Los partes de seguro cuentan en el gasto (igual que en el Pasaporte),
  // pero no llevan punto propio en esta vista: sería un quinto color más
  // para un evento poco frecuente, y ya aparecen dentro de la avería o el
  // tramo de seguro conceptualmente relacionados.
  for (const p of partes) {
    if (!p.coste) continue
    const b = bucketDe(new Date(p.fecha))
    if (b) b.anio.gasto += p.coste
  }
  // El seguro es cobertura continua, no un instante: se dibuja como un
  // tramo desde el inicio de la póliza. Si la renovación cae en el año
  // siguiente, el tramo continúa ahí; si cae más allá de "hoy", se deja
  // abierto (sigue hasta el final de la banda).
  for (const s of seguros) {
    const bIni = bucketDe(new Date(s.fechaInicio))
    if (!bIni) continue
    bIni.anio.gasto += s.precio
    bIni.anio.seguroDesde = bIni.mes
    const bFin = bucketDe(new Date(s.fechaRenovacion))
    if (bFin && bFin.anio === bIni.anio) {
      bIni.anio.seguroHasta = bFin.mes
    } else if (bFin) {
      const idxIni = anios.indexOf(bIni.anio)
      const idxFin = anios.indexOf(bFin.anio)
      if (idxFin === idxIni + 1) {
        bFin.anio.seguroDesde = 0
        bFin.anio.seguroHasta = bFin.mes
      }
    }
  }

  let acumulado = 0
  for (const anio of anios) {
    acumulado += anio.gasto
    anio.acumulado = acumulado
  }

  return anios
}
