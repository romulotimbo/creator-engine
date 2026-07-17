import "server-only"

import { Pool, type QueryResultRow } from "pg"

const globalForN8n = globalThis as unknown as {
  n8nPool: Pool | undefined
}

export function isN8nPostgresConfigured(): boolean {
  return Boolean(process.env.N8N_POSTGRES_URL?.trim())
}

function getPool(): Pool {
  const url = process.env.N8N_POSTGRES_URL?.trim()
  if (!url) {
    throw new Error("N8N_POSTGRES_URL não configurada")
  }

  if (!globalForN8n.n8nPool) {
    globalForN8n.n8nPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
    })
  }

  return globalForN8n.n8nPool
}

export async function queryN8n<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getPool()
  const result = await pool.query<T>(text, params)
  return result.rows
}

export async function queryN8nOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await queryN8n<T>(text, params)
  return rows[0] ?? null
}
