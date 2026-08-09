export interface AirtableEnv {
  AIRTABLE_API_KEY: string
  AIRTABLE_BASE_ID: string
}

interface AirtableRecord<F> {
  id: string
  fields: F
}

interface AirtableListResponse<F> {
  records: AirtableRecord<F>[]
  offset?: string
}

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'

async function airtableFetch<T>(
  env: AirtableEnv,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${AIRTABLE_API_URL}/${env.AIRTABLE_BASE_ID}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    // El nombre de la tabla en el mensaje: un 403
    // INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND normalmente significa que esa
    // tabla no existe en la base, y sin saber cuál es no hay forma de
    // arreglarlo.
    const tabla = decodeURIComponent(path.split('?')[0].split('/')[0])
    throw new Error(`Airtable falló (${res.status}) en la tabla "${tabla}": ${body}`)
  }

  return res.json() as Promise<T>
}

/** Lists all records in a table, following pagination, with an optional filterByFormula. */
export async function airtableList<F>(
  env: AirtableEnv,
  table: string,
  filterByFormula?: string,
): Promise<AirtableRecord<F>[]> {
  const records: AirtableRecord<F>[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams()
    if (filterByFormula) params.set('filterByFormula', filterByFormula)
    if (offset) params.set('offset', offset)

    const page = await airtableFetch<AirtableListResponse<F>>(
      env,
      `${encodeURIComponent(table)}?${params.toString()}`,
    )
    records.push(...page.records)
    offset = page.offset
  } while (offset)

  return records
}

export async function airtableGet<F>(
  env: AirtableEnv,
  table: string,
  id: string,
): Promise<AirtableRecord<F>> {
  return airtableFetch<AirtableRecord<F>>(env, `${encodeURIComponent(table)}/${id}`)
}

export async function airtableCreate<F>(
  env: AirtableEnv,
  table: string,
  fields: F,
): Promise<AirtableRecord<F>> {
  return airtableFetch<AirtableRecord<F>>(env, encodeURIComponent(table), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })
}

export async function airtableUpdate<F>(
  env: AirtableEnv,
  table: string,
  id: string,
  fields: Partial<F>,
): Promise<AirtableRecord<F>> {
  return airtableFetch<AirtableRecord<F>>(env, `${encodeURIComponent(table)}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
}

export async function airtableDelete(
  env: AirtableEnv,
  table: string,
  id: string,
): Promise<void> {
  await airtableFetch(env, `${encodeURIComponent(table)}/${id}`, { method: 'DELETE' })
}

/**
 * Borra varios registros de una tabla. Airtable admite hasta 10 por
 * petición y limita a 5 peticiones por segundo y base, así que los lotes
 * van en serie y con una pausa: un borrado en cascada puede encadenar
 * muchas peticiones seguidas.
 */
export async function airtableDeleteMany(
  env: AirtableEnv,
  table: string,
  ids: string[],
): Promise<number> {
  let borrados = 0
  for (let i = 0; i < ids.length; i += 10) {
    const lote = ids.slice(i, i + 10)
    const params = new URLSearchParams()
    for (const id of lote) params.append('records[]', id)
    await airtableFetch(env, `${encodeURIComponent(table)}?${params.toString()}`, {
      method: 'DELETE',
    })
    borrados += lote.length
    if (i + 10 < ids.length) await new Promise((r) => setTimeout(r, 220))
  }
  return borrados
}

/** Escapes a value for safe interpolation inside an Airtable filterByFormula string literal. */
export function airtableFormulaString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}
