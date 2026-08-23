/**
 * Neon PostgreSQL 커넥션 풀.
 * Vercel /api 함수와 로컬 Express 백엔드가 동일한 DATABASE_URL을 사용한다.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const sslEnabled = process.env.DATABASE_SSL !== 'false';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  max: process.env.VERCEL ? 2 : 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PG Pool Error] Unexpected error on idle client', err);
});

export async function testDbConnection() {
  if (!process.env.DATABASE_URL) {
    console.warn('[DB] DATABASE_URL이 설정되지 않았습니다. 프로젝트 루트 .env를 확인하세요.');
    return false;
  }

  try {
    const result = await pool.query('SELECT NOW() AS now');
    console.log('[DB] Neon PostgreSQL 연결 성공:', result.rows[0] && result.rows[0].now);
    return true;
  } catch (err) {
    console.error('[DB] Neon PostgreSQL 연결 실패:', err);
    return false;
  }
}
