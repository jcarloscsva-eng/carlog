import { TABLES, parteFromAirtable, parteToAirtable } from '../../../shared/airtable-mappers'
import { makeListCreateHandlers } from '../../../shared/entity-routes'
import type { Parte } from '../../../shared/types'

export const { onRequestGet, onRequestPost } = makeListCreateHandlers<Parte>({
  table: TABLES.Partes,
  fromAirtable: parteFromAirtable,
  toAirtable: parteToAirtable,
})
