import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

// cwd와 무관하게 backend/.env → 프로젝트 루트 .env 순으로 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('[DB] DATABASE_URL 또는 POSTGRES_URL이 설정되지 않았습니다. backend/.env를 확인하세요.');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: process.env.VERCEL ? 2 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PG Pool Error] Unexpected error on idle client', err);
});
