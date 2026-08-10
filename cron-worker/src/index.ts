import { WebPushError } from 'web-push'
import { airtableCreate, airtableDelete, airtableList, type AirtableEnv } from '../../shared/airtable'
import {
  TABLES,
  alertaEnviadaToAirtable,
  elementoFromAirtable,
  itvFromAirtable,
  pushSubscriptionFromAirtable,
  vehiculoFromAirtable,
} from '../../shared/airtable-mappers'
import { calcularAlertasPendientes } from '../../shared/alerts'
import { intervaloSugerido } from '../../shared/elementos-catalogo'
import { escapeHtml } from '../../shared/email'
import { sendAlertEmail, sendWebPush, type NotificationsEnv } from '../../shared/notifications'
import type { Elemento, Itv, Vehiculo } from '../../shared/types'

export interface Env extends AirtableEnv, NotificationsEnv {
  APP_URL: string
  /** Token para poder disparar /__run manualmente (ver más abajo). Sin él, la ruta queda deshabilitada. */
  CRON_DEBUG_TOKEN?: string
}

/** Último elemento de cada tipo, por vehículo, entre los que tienen intervalo (propio o sugerido por su catálogo). */
function ultimosElementosPorTipo(elementos: Elemento[]): Map<string, Elemento[]> {
  const map = new Map<string, Map<string, Elemento>>()

  for (const e of elementos) {
    const tieneIntervalo = e.intervaloKm || e.intervaloMeses || intervaloSugerido(e.tipo).km || intervaloSugerido(e.tipo).meses
    if (!tieneIntervalo) continue
    const porVehiculo = map.get(e.vehiculoId) ?? new Map<string, Elemento>()
    const existente = porVehiculo.get(e.tipo)
    if (!existente || new Date(e.fecha) > new Date(existente.fecha)) {
      porVehiculo.set(e.tipo, e)
    }
    map.set(e.vehiculoId, porVehiculo)
  }

  const resultado = new Map<string, Elemento[]>()
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
  const [vehiculosRaw, elementosRaw, itvRaw, alertasEnviadasRaw, suscripcionesRaw] =
    await Promise.all([
      airtableList<Record<string, unknown>>(env, TABLES.Vehiculos),
      airtableList<Record<string, unknown>>(env, TABLES.Elementos),
      airtableList<Record<string, unknown>>(env, TABLES.Itv),
      airtableList<Record<string, unknown>>(env, TABLES.AlertasEnviadas),
      airtableList<Record<string, unknown>>(env, TABLES.PushSubscriptions),
    ])

  const vehiculos: Vehiculo[] = vehiculosRaw.map((r) => vehiculoFromAirtable(r.id, r.fields))
  const elementos = elementosRaw.map((r) => elementoFromAirtable(r.id, r.fields))
  const itvs = itvRaw.map((r) => itvFromAirtable(r.id, r.fields))
  const suscripciones = suscripcionesRaw.map((r) => pushSubscriptionFromAirtable(r.id, r.fields))

  const yaEnviadas = new Set(
    alertasEnviadasRaw.map((r) => `${r.fields.Tipo}:${r.fields.Referencia_Id}`),
  )

  const alertas = calcularAlertasPendientes(
    new Date(),
    vehiculos,
    ultimosElementosPorTipo(elementos),
    ultimaItvPorVehiculo(itvs),
  ).filter((a) => !yaEnviadas.has(`${a.tipo}:${a.referenciaId}`))

  for (const alerta of alertas) {
    const email = alerta.vehiculo.propietarioEmail
    const suscripcionesDelUsuario = suscripciones.filter((s) => s.email === email)

    await sendAlertEmail(
      env,
      email,
      `Carlog — ${alerta.titulo}`,
      `<p><strong>${escapeHtml(alerta.titulo)}</strong></p><p>${escapeHtml(alerta.detalle)}</p><p><a href="${env.APP_URL}">Abrir Carlog</a></p>`,
    ).catch((err) => console.error('Error enviando email de alerta', err))

    await Promise.all(
      suscripcionesDelUsuario.map((s) =>
        sendWebPush(env, s, alerta.titulo, alerta.detalle).catch(async (err) => {
          console.error('Error enviando push de alerta', err)
          // 404/410 = el endpoint ya no existe (dispositivo desinstalado o
          // permiso revocado): borramos la suscripción para no seguir
          // reintentando contra un destino muerto en cada revisión diaria.
          if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
            await airtableDelete(env, TABLES.PushSubscriptions, s.id).catch((delErr) =>
              console.error('Error borrando suscripción caducada', delErr),
            )
          }
        }),
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

  // Permite disparar la revisión manualmente con `GET /__run?token=...`.
  // Sin CRON_DEBUG_TOKEN configurado, la ruta queda deshabilitada — el
  // worker responde en una URL pública y sin este freno cualquiera podría
  // forzar revisiones repetidas (gasto innecesario de Airtable/Resend/push,
  // y una ventana para envíos duplicados si coincide con el cron real).
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/__run') {
      if (!env.CRON_DEBUG_TOKEN || url.searchParams.get('token') !== env.CRON_DEBUG_TOKEN) {
        return new Response('Not found', { status: 404 })
      }
      await ejecutarRevisionDeAlertas(env)
      return new Response('OK')
    }
    return new Response('Carlog cron worker', { status: 200 })
  },
}
