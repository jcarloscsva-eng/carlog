import {
  TABLES,
  mantenimientoFromAirtable,
  mantenimientoToAirtable,
} from '../../../shared/airtable-mappers'
import { makeListCreateHandlers } from '../../../shared/entity-routes'
import type { Mantenimiento } from '../../../shared/types'

export const { onRequestGet, onRequestPost } = makeListCreateHandlers<Mantenimiento>({
  table: TABLES.Mantenimientos,
  fromAirtable: mantenimientoFromAirtable,
  toAirtable: mantenimientoToAirtable,
})
