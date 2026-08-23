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

// Neon PostgreSQL은 SSL 필수. node-pg는 connectionString의 sslmode만으로는
// 인증서 검증을 건너뛰지 않으므로 ssl 객체를 명시한다.
const ssl = process.env.DATABASE_SSL === 'false'
  ? false
  : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl,
  max: process.env.VERCEL ? 2 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PG Pool Error] Unexpected error on idle client', err);
});
