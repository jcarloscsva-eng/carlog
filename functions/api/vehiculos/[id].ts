import {
  airtableDelete,
  airtableDeleteMany,
  airtableFormulaString,
  airtableList,
  airtableUpdate,
  type AirtableEnv,
} from '../../../shared/airtable'
import { TABLES, vehiculoFromAirtable } from '../../../shared/airtable-mappers'
import type { AuthEnv } from '../../../shared/auth'
import { json, withAuth } from '../../../shared/http'
import { assertVehiculoDelUsuario, getVehiculosDelUsuario } from '../../../shared/ownership'
import type { Vehiculo } from '../../../shared/types'

type Env = AirtableEnv & AuthEnv

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) =>
  withAuth(request, env, async (email) => {
    const id = String(params.id)
    await assertVehiculoDelUsuario(env, email, id)
    const body = (await request.json()) as Partial<Omit<Vehiculo, 'id' | 'propietarioEmail'>>

    if (body.matricula) {
      const propios = await getVehiculosDelUsuario(env, email)
      const matriculaNueva = body.matricula.trim().toUpperCase()
      if (propios.some((v) => v.id !== id && v.matricula.trim().toUpperCase() === matriculaNueva)) {
        return json({ error: 'Ya tienes un vehículo con esa matrícula' }, 400)
      }
    }

    const record = await airtableUpdate(env, TABLES.Vehiculos, id, {
      Marca: body.marca,
      Modelo: body.modelo,
      Matricula: body.matricula,
      Año: body.anio,
      Tipo: body.tipo,
      Km_Actual: body.kmActual,
      Km_Actual_Fecha: body.kmActualFecha,
      Fecha_Compra: body.fechaCompra || null,
    })
    return json(vehiculoFromAirtable(record.id, record.fields))
  })

/**
 * Tablas cuyo historial cuelga del vehículo. Todas enlazan por matrícula
 * (campo `Vehiculo`), no por id de registro — ver shared/types.ts.
 */
const TABLAS_HISTORIAL = [
  TABLES.Averias,
  TABLES.Elementos,
  TABLES.Itv,
  TABLES.Seguros,
  TABLES.Partes,
]

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) =>
  withAuth(request, env, async (email) => {
    const id = String(params.id)
    await assertVehiculoDelUsuario(env, email, id)

    const propios = await getVehiculosDelUsuario(env, email)
    const vehiculo = propios.find((v) => v.id === id)
    if (!vehiculo) return json({ error: 'Vehículo no encontrado' }, 404)

    // Borrado en cascada: como el historial enlaza por matrícula, dejar
    // los registros huérfanos no solo consumiría cuota de Airtable, sino
    // que reaparecerían pegados a un vehículo nuevo que reutilizara esa
    // misma matrícula.
    const suyo = `{Vehiculo} = '${airtableFormulaString(vehiculo.matricula)}'`
    let borrados = 0
    for (const tabla of TABLAS_HISTORIAL) {
      let registros
      try {
        registros = await airtableList<Record<string, unknown>>(env, tabla, suyo)
      } catch (err) {
        // Si no podemos leer una tabla no sabemos qué habría que borrar en
        // ella, así que abortamos ANTES de tocar el vehículo: dejarlo a
        // medias crearía justo los huérfanos que este borrado evita.
        console.error(`No se pudo leer la tabla ${tabla} al eliminar el vehículo`, err)
        return json(
          {
            error: `No se pudo acceder a la tabla "${tabla}" en Airtable, así que no se ha borrado nada. Comprueba que existe y vuelve a intentarlo.`,
          },
          502,
        )
      }
      if (registros.length > 0) {
        borrados += await airtableDeleteMany(env, tabla, registros.map((r) => r.id))
      }
    }

    await airtableDelete(env, TABLES.Vehiculos, id)
    return json({ ok: true, registrosBorrados: borrados })
  })
