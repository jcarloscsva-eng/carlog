import { airtableCreate, airtableList, type AirtableEnv } from '../../shared/airtable'
import {
  TABLES,
  alertaEnviadaToAirtable,
  itvFromAirtable,
  mantenimientoFromAirtable,
  pushSubscriptionFromAirtable,
  repuestoFromAirtable,
  vehiculoFromAirtable,
} from '../../shared/airtable-mappers'
import { calcularAlertasPendientes } from '../../shared/alerts'
import { sendAlertEmail, sendWebPush, type NotificationsEnv } from '../../shared/notifications'
import type { Itv, Mantenimiento, Repuesto, Vehiculo } from '../../shared/types'

export interface Env extends AirtableEnv, NotificationsEnv {
  APP_URL: string
}

function ultimosPorVehiculoConIntervalo(mantenimientos: Mantenimiento[]): Map<string, Mantenimiento[]> {
  const map = new Map<string, Map<string, Mantenimiento>>()

  for (const m of mantenimientos) {
    if (!m.intervaloKm && !m.intervaloMeses) continue
    const porVehiculo = map.get(m.vehiculoId) ?? new Map<string, Mantenimiento>()
    const existente = porVehiculo.get(m.elementos)
    if (!existente || new Date(m.fecha) > new Date(existente.fecha)) {
      porVehiculo.set(m.elementos, m)
    }
    map.set(m.vehiculoId, porVehiculo)
  }

  const resultado = new Map<string, Mantenimiento[]>()
  for (const [vehiculoId, porTipo] of map) {
    resultado.set(vehiculoId, [...porTipo.values()])
  }
  return resultado
}

function ultimosRepuestoPorTipo(repuestos: Repuesto[]): Map<string, Repuesto[]> {
  const map = new Map<string, Map<string, Repuesto>>()

  for (const r of repuestos) {
    if (!r.vidaUtilKm && !r.vidaUtilAnios) continue
    const porVehiculo = map.get(r.vehiculoId) ?? new Map<string, Repuesto>()
    const existente = porVehiculo.get(r.tipoRepuesto)
    if (!existente || new Date(r.fecha) > new Date(existente.fecha)) {
      porVehiculo.set(r.tipoRepuesto, r)
    }
    map.set(r.vehiculoId, porVehiculo)
  }

  const resultado = new Map<string, Repuesto[]>()
  for (const [vehiculoId, porTipo] of map) {
    resultado.set(vehiculoId, [...porTipo.values()])
  }
  return resultado
}

function ultimaItvPorVehiculo(itvs: Itv[]): Map<string, Itv | undefined> {
  const map = new Map<string, Itv>()
  for (const i of itvs) {
    const existente = map.get(i.vehiculoId)
    if (!existente || new Date(i.fechaRealizada) > new Date(existente.fechaRealizada)) {
      map.set(i.vehiculoId, i)
    }
  }
  return map
}

async function ejecutarRevisionDeAlertas(env: Env): Promise<void> {
  const [vehiculosRaw, mantenimientosRaw, repuestosRaw, itvRaw, alertasEnviadasRaw, suscripcionesRaw] =
    await Promise.all([
      airtableList<Record<string, unknown>>(env, TABLES.Vehiculos),
      airtableList<Record<string, unknown>>(env, TABLES.Mantenimientos),
      airtableList<Record<string, unknown>>(env, TABLES.Repuestos),
      airtableList<Record<string, unknown>>(env, TABLES.Itv),
      airtableList<Record<string, unknown>>(env, TABLES.AlertasEnviadas),
      airtableList<Record<string, unknown>>(env, TABLES.PushSubscriptions),
    ])

  const vehiculos: Vehiculo[] = vehiculosRaw.map((r) => vehiculoFromAirtable(r.id, r.fields))
  const mantenimientos = mantenimientosRaw.map((r) => mantenimientoFromAirtable(r.id, r.fields))
  const repuestos = repuestosRaw.map((r) => repuestoFromAirtable(r.id, r.fields))
  const itvs = itvRaw.map((r) => itvFromAirtable(r.id, r.fields))
  const suscripciones = suscripcionesRaw.map((r) => pushSubscriptionFromAirtable(r.id, r.fields))

  const yaEnviadas = new Set(
    alertasEnviadasRaw.map((r) => `${r.fields.Tipo}:${r.fields.Referencia_Id}`),
  )

  const alertas = calcularAlertasPendientes(
    new Date(),
    vehiculos,
    ultimosPorVehiculoConIntervalo(mantenimientos),
    ultimosRepuestoPorTipo(repuestos),
    ultimaItvPorVehiculo(itvs),
  ).filter((a) => !yaEnviadas.has(`${a.tipo}:${a.referenciaId}`))

  for (const alerta of alertas) {
    const email = alerta.vehiculo.propietarioEmail
    const suscripcionesDelUsuario = suscripciones.filter((s) => s.email === email)

    await sendAlertEmail(
      env,
      email,
      `Carlog — ${alerta.titulo}`,
      `<p><strong>${alerta.titulo}</strong></p><p>${alerta.detalle}</p><p><a href="${env.APP_URL}">Abrir Carlog</a></p>`,
    ).catch((err) => console.error('Error enviando email de alerta', err))

    await Promise.all(
      suscripcionesDelUsuario.map((s) =>
        sendWebPush(env, s, alerta.titulo, alerta.detalle).catch((err) =>
          console.error('Error enviando push de alerta', err),
        ),
      ),
    )

    await airtableCreate(env, TABLES.AlertasEnviadas, alertaEnviadaToAirtable({
      tipo: alerta.tipo,
      referenciaId: alerta.referenciaId,
      fechaEnviada: new Date().toISOString(),
    }))
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(ejecutarRevisionDeAlertas(env))
  },

  // Permite disparar la revisión manualmente en local con `wrangler dev` (GET /__run).
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/__run') {
      await ejecutarRevisionDeAlertas(env)
      return new Response('OK')
    }
    return new Response('Carlog cron worker', { status: 200 })
  },
}
