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
    throw new Error(`Airtable request failed (${res.status}): ${body}`)
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

/** Escapes a value for safe interpolation inside an Airtable filterByFormula string literal. */
export function airtableFormulaString(value: string): string {
  return value.replace(/'/g, "\\'")
}
