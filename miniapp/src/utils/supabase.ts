import { auth, request } from './request'

export { request }

type QueryResult<T> = { data: T | null; error: any }

function formatScalar(value: any): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function formatInList(values: any[]): string {
  return `(${values.map(item => formatScalar(item)).join(',')})`
}

function buildQueryString(params: Record<string, string>) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, value)
  })
  return searchParams.toString()
}

class SelectBuilder<T = any> implements PromiseLike<QueryResult<T[]>> {
  private params: Record<string, string> = {}

  constructor(private table: string, columns?: string) {
    this.params.select = columns || '*'
  }

  eq(column: string, value: any) {
    this.params[column] = `eq.${formatScalar(value)}`
    return this
  }

  neq(column: string, value: any) {
    this.params[column] = `neq.${formatScalar(value)}`
    return this
  }

  in(column: string, values: any[]) {
    this.params[column] = `in.${formatInList(values)}`
    return this
  }

  not(column: string, operator: string, value: any) {
    const formattedValue = Array.isArray(value)
      ? formatInList(value)
      : String(value)
    this.params[column] = `not.${operator}.${formattedValue}`
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.params.order = `${column}.${options?.ascending === false ? 'desc' : 'asc'}`
    return this
  }

  limit(count: number) {
    this.params.limit = String(count)
    return this
  }

  async single(): Promise<QueryResult<T>> {
    this.params.limit = '1'
    const result = await this.execute()
    if (result.error) {
      return { data: null, error: result.error }
    }

    const rows = Array.isArray(result.data) ? result.data : []
    return { data: (rows[0] as T) || null, error: null }
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute(): Promise<QueryResult<T[]>> {
    return request<T[]>(`/rest/v1/${this.table}`, {
      method: 'GET',
      data: this.params
    })
  }
}

class UpdateBuilder<T = any> {
  private filters: Record<string, string> = {}

  constructor(private table: string, private payload: any) {}

  eq(column: string, value: any) {
    this.filters[column] = `eq.${formatScalar(value)}`
    return this.execute()
  }

  private async execute(): Promise<QueryResult<T>> {
    const queryString = buildQueryString(this.filters)
    const url = queryString ? `/rest/v1/${this.table}?${queryString}` : `/rest/v1/${this.table}`
    return request<T>(url, {
      method: 'PATCH',
      data: this.payload,
      headers: {
        Prefer: 'return=minimal'
      }
    })
  }
}

class InsertBuilder<T = any> implements PromiseLike<QueryResult<T>> {
  constructor(private table: string, private payload: any) {}

  select(columns = '*') {
    return {
      single: async () => {
        const result = await request<any[]>(`/rest/v1/${this.table}?select=${encodeURIComponent(columns)}`, {
          method: 'POST',
          data: this.payload,
          headers: {
            Prefer: 'return=representation'
          }
        })

        if (result.error) {
          return { data: null, error: result.error }
        }

        const rows = Array.isArray(result.data) ? result.data : []
        return { data: rows[0] || null, error: null }
      }
    }
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return request<T>(`/rest/v1/${this.table}`, {
      method: 'POST',
      data: this.payload,
      headers: {
        Prefer: 'return=minimal'
      }
    }).then(onfulfilled, onrejected)
  }
}

export const supabase = {
  auth,
  from: (table: string) => ({
    select: <T = any>(columns?: string) => new SelectBuilder<T>(table, columns),
    update: <T = any>(payload: any) => new UpdateBuilder<T>(table, payload),
    insert: <T = any>(payload: any) => new InsertBuilder<T>(table, payload)
  })
}
