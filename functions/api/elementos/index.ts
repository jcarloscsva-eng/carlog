import { TABLES, elementoFromAirtable, elementoToAirtable } from '../../../shared/airtable-mappers'
import { makeListCreateHandlers } from '../../../shared/entity-routes'
import type { Elemento } from '../../../shared/types'

export const { onRequestGet, onRequestPost } = makeListCreateHandlers<Elemento>({
  table: TABLES.Elementos,
  fromAirtable: elementoFromAirtable,
  toAirtable: elementoToAirtable,
})
