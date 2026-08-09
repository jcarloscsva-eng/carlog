import { airtableFormulaString, airtableGet, airtableList, type AirtableEnv } from '../../../shared/airtable'
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
/**
 * Cuánto se guarda la respuesta en la caché del borde. Un historial no
 * cambia de un minuto para otro, y sin esto cada visita al enlace serían
 * siete peticiones a Airtable: como el enlace es público, cualquiera (o
 * un robot) podría repetirlas sin límite y agotar la cuota de la base,
 * que es compartida con el resto de la aplicación.
 */
const CACHE_SEGUNDOS = 300

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const cache = typeof caches !== 'undefined' ? caches.default : undefined
  const claveCache = new Request(new URL(request.url).toString(), { method: 'GET' })

  if (cache) {
    const guardada = await cache.match(claveCache)
    if (guardada) return guardada
  }

  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) return json({ error: 'Enlace no válido', codigo: 'sin-token' }, 400)

    if (!env.SESSION_SECRET) {
      // Si faltara el secreto, la firma nunca validaría y el mensaje
      // "enlace caducado" despistaría: mejor decir la verdad.
      return json({ error: 'La aplicación no está bien configurada', codigo: 'sin-secreto' }, 500)
    }

    const vehiculoId = await verificarTokenCompartir(token, env.SESSION_SECRET)
    if (!vehiculoId) {
      return json({ error: 'Este enlace no es válido o ha caducado', codigo: 'firma' }, 404)
    }

    let registro
    try {
      registro = await airtableGet<Record<string, unknown>>(env, TABLES.Vehiculos, vehiculoId)
    } catch (err) {
      console.error('No se pudo leer el vehículo compartido', err)
      return json({ error: 'Este enlace no es válido o ha caducado', codigo: 'vehiculo' }, 404)
    }

    const completo = vehiculoFromAirtable(registro.id, registro.fields)
    const matricula = completo.matricula
    const soloDeEsteVehiculo = `{Vehiculo} = '${airtableFormulaString(matricula)}'`

    // En serie y filtrando en origen, a propósito: Airtable admite 5
    // peticiones por segundo y base. Lanzar las seis tablas en paralelo
    // (más la del vehículo) se pasaba del límite, Airtable devolvía 429 y
    // la función caía con una página de error HTML que el navegador no
    // podía interpretar como JSON.
    // Si una tabla no es accesible (p. ej. aún no creada en la base), se
    // sirve el resto del historial en vez de dejar al visitante sin nada.
    const traer = async <T>(
      tabla: string,
      mapear: (id: string, f: Record<string, unknown>) => T,
    ): Promise<T[]> => {
      try {
        const rs = await airtableList<Record<string, unknown>>(env, tabla, soloDeEsteVehiculo)
        return rs.map((r) => mapear(r.id, r.fields))
      } catch (err) {
        console.error(`No se pudo leer la tabla ${tabla} para el pasaporte público`, err)
        return []
      }
    }

    const averias = await traer(TABLES.Averias, averiaFromAirtable)
    const mantenimientos = await traer(TABLES.Mantenimientos, mantenimientoFromAirtable)
    const repuestos = await traer(TABLES.Repuestos, repuestoFromAirtable)
    const itvs = await traer(TABLES.Itv, itvFromAirtable)
    const seguros = await traer(TABLES.Seguros, seguroFromAirtable)
    const partes = await traer(TABLES.Partes, parteFromAirtable)

    const respuesta = json({
      // Se omite deliberadamente propietarioEmail: quien recibe el enlace
      // no tiene por qué saber de quién es el coche.
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
      averias,
      mantenimientos,
      repuestos,
      itvs,
      // De los seguros solo interesa que hubo cobertura y de qué tipo; el
      // número de póliza y el teléfono de asistencia no se comparten.
      seguros: seguros.map((s) => ({
        id: s.id,
        vehiculoId: s.vehiculoId,
        compania: s.compania,
        tipoCobertura: s.tipoCobertura,
        fechaInicio: s.fechaInicio,
        fechaRenovacion: s.fechaRenovacion,
        precio: s.precio,
        numeroPoliza: '',
      })),
      partes: partes.map((p) => ({ ...p, numeroParte: undefined })),
    })

    // Solo se cachea la respuesta buena: un enlace caducado o un fallo no
    // deben quedarse pegados en el borde.
    respuesta.headers.set('Cache-Control', `public, max-age=${CACHE_SEGUNDOS}`)
    if (cache) waitUntil(cache.put(claveCache, respuesta.clone()))
    return respuesta
  } catch (err) {
    // Pase lo que pase, el cliente debe recibir JSON: si dejamos escapar la
    // excepción, Cloudflare responde una página HTML y el navegador falla
    // con "Unexpected token '<'".
    console.error('Error sirviendo el pasaporte público', err)
    return json(
      {
        error: 'No se pudo cargar el historial. Inténtalo de nuevo en un momento.',
        codigo: 'historial',
      },
      500,
    )
  }
}
