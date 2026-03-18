import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.warn('[DB] DATABASE_URL no definida en las variables de entorno.');
}

// Configuración del Pool
const poolConfig = {
  connectionString: dbUrl ? dbUrl.trim() : undefined,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Singleton para el Pool (evita múltiples conexiones en desarrollo)
let pool;
if (process.env.NODE_ENV === 'production') {
  pool = new Pool(poolConfig);
} else {
  if (!global.pool) {
    global.pool = new Pool(poolConfig);
  }
  pool = global.pool;
}

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool:', err);
});

export { pool };

/**
 * Executes a query against the PostgreSQL database
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error: error.message });
    throw error;
  }
}

/**
 * Helper to generate a standardized API response
 */
/**
 * Helper to ensure data is JSON serializable (handles BigInt)
 */
export function serializeJSON(data) {
  if (!data) return data;
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export function handleError(error) {
  console.error("API Error:", error);
  return NextResponse.json(
    serializeJSON({ error: error.message || 'Internal Server Error' }), 
    { status: error.status || 500 }
  );
}
