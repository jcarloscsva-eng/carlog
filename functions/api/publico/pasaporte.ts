import { airtableGet, airtableList, type AirtableEnv } from '../../../shared/airtable'
import {
  TABLES,
  averiaFromAirtable,
  itvFromAirtable,
  mantenimientoFromAirtable,
  parteFromAirtable,
  repuestoFromAirtable,
  seguroFromAirtable,
  vehiculoFromAirtable,
} from '../../../shared/airtable-mappers'
import { verificarTokenCompartir } from '../../../shared/enlace-compartido'
import { json } from '../../../shared/http'

type Env = AirtableEnv & { SESSION_SECRET: string }

/**
 * Pasaporte de un vehículo para quien recibe un enlace compartido. Es la
 * ÚNICA ruta de la API sin sesión, así que solo devuelve el historial del
 * vehículo del testigo: nunca el email del propietario ni ningún otro
 * vehículo suyo.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return json({ error: 'Enlace no válido' }, 400)

  const vehiculoId = await verificarTokenCompartir(token, env.SESSION_SECRET)
  if (!vehiculoId) return json({ error: 'Este enlace no es válido o ha caducado' }, 404)

  let registro
  try {
    registro = await airtableGet<Record<string, unknown>>(env, TABLES.Vehiculos, vehiculoId)
  } catch {
    return json({ error: 'Este enlace no es válido o ha caducado' }, 404)
  }

  const completo = vehiculoFromAirtable(registro.id, registro.fields)
  const matricula = completo.matricula

  const [averiasRaw, mantenimientosRaw, repuestosRaw, itvRaw, segurosRaw, partesRaw] =
    await Promise.all([
      airtableList<Record<string, unknown>>(env, TABLES.Averias),
      airtableList<Record<string, unknown>>(env, TABLES.Mantenimientos),
      airtableList<Record<string, unknown>>(env, TABLES.Repuestos),
      airtableList<Record<string, unknown>>(env, TABLES.Itv),
      airtableList<Record<string, unknown>>(env, TABLES.Seguros),
      airtableList<Record<string, unknown>>(env, TABLES.Partes),
    ])

  const mio = <T extends { vehiculoId: string }>(items: T[]) =>
    items.filter((i) => i.vehiculoId === matricula)

  return json({
    // Se omite deliberadamente propietarioEmail: quien recibe el enlace no
    // tiene por qué saber de quién es el coche.
    vehiculo: {
      marca: completo.marca,
      modelo: completo.modelo,
      matricula: completo.matricula,
      anio: completo.anio,
      tipo: completo.tipo,
      kmActual: completo.kmActual,
      kmActualFecha: completo.kmActualFecha,
      fechaCompra: completo.fechaCompra,
    },
    averias: mio(averiasRaw.map((r) => averiaFromAirtable(r.id, r.fields))),
    mantenimientos: mio(mantenimientosRaw.map((r) => mantenimientoFromAirtable(r.id, r.fields))),
    repuestos: mio(repuestosRaw.map((r) => repuestoFromAirtable(r.id, r.fields))),
    itvs: mio(itvRaw.map((r) => itvFromAirtable(r.id, r.fields))),
    // De los seguros solo interesa que hubo cobertura y de qué tipo; el
    // número de póliza y el teléfono de asistencia no se comparten.
    seguros: mio(segurosRaw.map((r) => seguroFromAirtable(r.id, r.fields))).map((s) => ({
      id: s.id,
      vehiculoId: s.vehiculoId,
      compania: s.compania,
      tipoCobertura: s.tipoCobertura,
      fechaInicio: s.fechaInicio,
      fechaRenovacion: s.fechaRenovacion,
      precio: s.precio,
      numeroPoliza: '',
    })),
    partes: mio(partesRaw.map((r) => parteFromAirtable(r.id, r.fields))).map((p) => ({
      ...p,
      numeroParte: undefined,
    })),
  })
}
