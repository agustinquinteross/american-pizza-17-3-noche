import { Pool } from 'pg';

// Helper to determine if we're in a serverless environment like Vercel
let pool;

if (!pool) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    console.log('[DB] Intentando inicializar Pool...');
    console.log('[DB] DATABASE_URL presente:', !!dbUrl);
    
    if (dbUrl) {
      console.log('[DB] Protocolo:', dbUrl.split(':')[0]);
      // Verificar si la URL contiene caracteres extraños al final
      if (dbUrl.includes('\r') || dbUrl.includes('\n')) {
        console.warn('[DB] ¡ADVERTENCIA! La URL contiene saltos de línea.');
      }
    }

    pool = new Pool({
      connectionString: dbUrl ? dbUrl.trim() : undefined,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10, // Bajado un poco para mayor estabilidad
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Error inesperado en el pool:', err);
    });

    console.log('[DB] Pool creado exitosamente.');
  } catch (err) {
    console.error('[DB] ERROR FATAL al crear el Pool:', err);
  }
}

// Global process listeners for debugging
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

/**
 * Execute a query against the PostgreSQL database
 * @param {string} text - SQL Query string
 * @param {Array} params - Array of parameters to prevent SQL injection
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Log in development for debugging
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
export function handleError(error) {
  console.error("API Error:", error);
  return Response.json(
    { error: error.message || 'Internal Server Error' }, 
    { status: error.status || 500 }
  );
}
