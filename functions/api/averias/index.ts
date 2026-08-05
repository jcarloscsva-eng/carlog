import { TABLES, averiaFromAirtable, averiaToAirtable } from '../../../shared/airtable-mappers'
import { makeListCreateHandlers } from '../../../shared/entity-routes'
import type { Averia } from '../../../shared/types'

export const { onRequestGet, onRequestPost } = makeListCreateHandlers<Averia>({
  table: TABLES.Averias,
  fromAirtable: averiaFromAirtable,
  toAirtable: averiaToAirtable,
})
