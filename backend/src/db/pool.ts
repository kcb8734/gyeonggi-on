import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

// cwd와 무관하게 backend/.env → 프로젝트 루트 .env 순으로 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

if (!connectionString) {
  console.error('[DB] DATABASE_URL 또는 POSTGRES_URL이 설정되지 않았습니다. backend/.env를 확인하세요.');
}

export function databaseHost(url = connectionString): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    const matched = url.match(/@([^/?]+)/);
    return matched?.[1]?.split(':')[0] ?? '';
  }
}

export function isNeonHost(host = databaseHost()): boolean {
  return host.includes('neon.tech') || host.includes('neon.cloud');
}

export function shouldUseSsl(url = connectionString): boolean {
  if (!url) return false;
  if (/sslmode=disable/i.test(url)) return false;
  const host = databaseHost(url);
  if (host === 'localhost' || host === '127.0.0.1') return false;
  return isNeonHost(host) || /sslmode=require/i.test(url) || host.length > 0;
}

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  max: process.env.VERCEL ? 2 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PG Pool Error] Unexpected error on idle client', err);
});
