import type { Itv, Vehiculo } from './types'

/**
 * Aproximación a la normativa española de periodicidad de ITV para
 * turismos, furgonetas ligeras y motocicletas: primera inspección a los 4
 * años de la matriculación, cada 2 años hasta los 10, y anual a partir de
 * ahí (las motos se mantienen cada 2 años). No cubre casos especiales
 * (taxis, autoescuelas, vehículos históricos, etc.) — el usuario puede
 * corregir manualmente la fecha si su caso difiere.
 */
export function calcularProximaItv(vehiculo: Vehiculo, ultimaItv?: Itv): Date {
  if (!ultimaItv) {
    return new Date(vehiculo.anio + 4, 0, 1)
  }

  const fechaBase = new Date(ultimaItv.fechaRealizada)
  const edadEnFechaBase = fechaBase.getFullYear() - vehiculo.anio

  const intervaloAnios =
    vehiculo.tipo === 'Moto' ? 2 : edadEnFechaBase < 10 ? 2 : 1

  const proxima = new Date(fechaBase)
  proxima.setFullYear(proxima.getFullYear() + intervaloAnios)
  return proxima
}
