import fs from 'fs';
import path from 'path';
import { pool } from './pool';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

export async function applyMigrations(): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const applied: string[] = [];

  for (const filename of files) {
    const already = await pool.query(
      `SELECT 1 FROM schema_migrations WHERE filename = $1`,
      [filename],
    );
    if (already.rowCount) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    await pool.query(sql);
    await pool.query(
      `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
      [filename],
    );
    applied.push(filename);
    console.log(`[db] applied ${filename}`);
  }
  return applied;
}

export async function ensureCoreSchema(): Promise<void> {
  const applied = await applyMigrations();
  const count = await pool.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM municipalities`);
  if (Number(count.rows[0]?.n ?? 0) === 0) {
    await pool.query(`
      INSERT INTO municipalities (name, region_code, budget_balance, metro_region)
      VALUES
        ('수원시', 'GG_수원시', 0, 'GYEONGGI'),
        ('용인시', 'GG_용인시', 0, 'GYEONGGI'),
        ('경기도', 'GG_경기도', 0, 'GYEONGGI')
      ON CONFLICT (region_code) DO NOTHING
    `);
    console.log('[db] seeded default Gyeonggi municipalities');
  }
  if (applied.length) {
    console.log(`[db] migrations ready (${applied.length} new)`);
  }
}
