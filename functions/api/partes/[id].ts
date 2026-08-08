import { TABLES, parteFromAirtable, parteToAirtable } from '../../../shared/airtable-mappers'
import { makeItemHandlers } from '../../../shared/entity-routes'
import type { Parte } from '../../../shared/types'

export const { onRequestPatch, onRequestDelete } = makeItemHandlers<Parte>({
  table: TABLES.Partes,
  fromAirtable: parteFromAirtable,
  toAirtable: parteToAirtable,
})
