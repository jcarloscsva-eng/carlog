import { TABLES, averiaFromAirtable, averiaToAirtable } from '../../../shared/airtable-mappers'
import { makeItemHandlers } from '../../../shared/entity-routes'
import type { Averia } from '../../../shared/types'

export const { onRequestPatch, onRequestDelete } = makeItemHandlers<Averia>({
  table: TABLES.Averias,
  fromAirtable: averiaFromAirtable,
  toAirtable: averiaToAirtable,
})
