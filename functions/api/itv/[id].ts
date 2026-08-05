import { TABLES, itvFromAirtable, itvToAirtable } from '../../../shared/airtable-mappers'
import { makeItemHandlers } from '../../../shared/entity-routes'
import type { Itv } from '../../../shared/types'

export const { onRequestPatch, onRequestDelete } = makeItemHandlers<Itv>({
  table: TABLES.Itv,
  fromAirtable: itvFromAirtable,
  toAirtable: itvToAirtable,
})
