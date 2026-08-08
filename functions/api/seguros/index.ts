import { TABLES, seguroFromAirtable, seguroToAirtable } from '../../../shared/airtable-mappers'
import { makeListCreateHandlers } from '../../../shared/entity-routes'
import type { Seguro } from '../../../shared/types'

export const { onRequestGet, onRequestPost } = makeListCreateHandlers<Seguro>({
  table: TABLES.Seguros,
  fromAirtable: seguroFromAirtable,
  toAirtable: seguroToAirtable,
})
