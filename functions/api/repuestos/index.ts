import { TABLES, repuestoFromAirtable, repuestoToAirtable } from '../../../shared/airtable-mappers'
import { makeListCreateHandlers } from '../../../shared/entity-routes'
import type { Repuesto } from '../../../shared/types'

export const { onRequestGet, onRequestPost } = makeListCreateHandlers<Repuesto>({
  table: TABLES.Repuestos,
  fromAirtable: repuestoFromAirtable,
  toAirtable: repuestoToAirtable,
})
