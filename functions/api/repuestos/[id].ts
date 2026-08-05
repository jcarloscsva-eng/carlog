import { TABLES, repuestoFromAirtable, repuestoToAirtable } from '../../../shared/airtable-mappers'
import { makeItemHandlers } from '../../../shared/entity-routes'
import type { Repuesto } from '../../../shared/types'

export const { onRequestPatch, onRequestDelete } = makeItemHandlers<Repuesto>({
  table: TABLES.Repuestos,
  fromAirtable: repuestoFromAirtable,
  toAirtable: repuestoToAirtable,
})
