import {
  TABLES,
  mantenimientoFromAirtable,
  mantenimientoToAirtable,
} from '../../../shared/airtable-mappers'
import { makeItemHandlers } from '../../../shared/entity-routes'
import type { Mantenimiento } from '../../../shared/types'

export const { onRequestPatch, onRequestDelete } = makeItemHandlers<Mantenimiento>({
  table: TABLES.Mantenimientos,
  fromAirtable: mantenimientoFromAirtable,
  toAirtable: mantenimientoToAirtable,
})
