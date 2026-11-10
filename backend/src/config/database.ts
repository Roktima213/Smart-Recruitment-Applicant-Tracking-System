import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL Connection Pool Configuration
 */
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DB_POOL_MAX) || 10,
      min: Number(process.env.DB_POOL_MIN) || 2,
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 5000,
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'smart_ats_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: Number(process.env.DB_POOL_MAX) || 10,
      min: Number(process.env.DB_POOL_MIN) || 2,
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 5000,
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

export const pool = new Pool(poolConfig);

// Catch unexpected idle client errors
pool.on('error', (err: Error) => {
  console.error('[Database Pool Error] Unexpected idle client error:', err.message);
});

/**
 * Executes a parameterized SQL query through the pool.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SQL Query] duration=${duration}ms rows=${res.rowCount}`);
    }
    return res;
  } catch (error: any) {
    console.error(`[SQL Error] Query failed: ${text}`);
    console.error(`[SQL Error Message] ${error.message}`);
    throw error;
  }
}

/**
 * Checkout a dedicated client for multi-statement ACID transactions.
 */
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

/**
 * Healthcheck probe to verify active database connectivity.
 */
export async function checkDatabaseConnection(): Promise<{ connected: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1 AS healthcheck');
    return { connected: true, latencyMs: Date.now() - start };
  } catch (error: any) {
    return { connected: false, latencyMs: Date.now() - start };
  }
}

/**
 * Graceful shutdown for test runners and container stops.
 */
export async function closeDatabasePool(): Promise<void> {
  await pool.end();
}
