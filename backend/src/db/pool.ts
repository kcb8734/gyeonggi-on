import { Pool } from 'pg';

// Supabase PostgreSQL Connection Pooler (Transaction 모드) 사용 권장
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: process.env.VERCEL ? 2 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PG Pool Error] Unexpected error on idle client', err);
});
