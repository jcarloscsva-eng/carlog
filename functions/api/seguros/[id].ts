import { TABLES, seguroFromAirtable, seguroToAirtable } from '../../../shared/airtable-mappers'
import { makeItemHandlers } from '../../../shared/entity-routes'
import type { Seguro } from '../../../shared/types'

export const { onRequestPatch, onRequestDelete } = makeItemHandlers<Seguro>({
  table: TABLES.Seguros,
  fromAirtable: seguroFromAirtable,
  toAirtable: seguroToAirtable,
})
