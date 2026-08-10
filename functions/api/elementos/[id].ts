import { TABLES, elementoFromAirtable, elementoToAirtable } from '../../../shared/airtable-mappers'
import { makeItemHandlers } from '../../../shared/entity-routes'
import type { Elemento } from '../../../shared/types'

export const { onRequestPatch, onRequestDelete } = makeItemHandlers<Elemento>({
  table: TABLES.Elementos,
  fromAirtable: elementoFromAirtable,
  toAirtable: elementoToAirtable,
})
