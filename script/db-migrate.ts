/**
 * @file: db-migrate.ts
 * @description: Применение SQL-миграций из папки migrations/ по порядку с фиксацией в таблице schema_migrations.
 * @dependencies: pg, fs/promises, path
 * @created: 2026-01-30
 */
import "dotenv/config";
import { readdir, readFile } from "fs/promises";
import * as path from "path";
import pg from "pg";

const { Client } = pg;

type MigrationRow = {
  filename: string;
  applied_at: Date;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

async function ensureMigrationsTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function getApplied(client: pg.Client): Promise<Set<string>> {
  const res = await client.query<MigrationRow>(`SELECT filename, applied_at FROM schema_migrations ORDER BY filename ASC;`);
  return new Set(res.rows.map((r) => r.filename));
}

async function listSqlMigrations(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

async function applyMigration(client: pg.Client, migrationsDir: string, filename: string) {
  const fullPath = path.join(migrationsDir, filename);
  const sql = await readFile(fullPath, "utf-8");
  const trimmed = sql.trim();
  if (!trimmed) {
    console.log(`[db:migrate] skip empty: ${filename}`);
    return;
  }

  console.log(`[db:migrate] applying: ${filename}`);
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [filename]);
    await client.query("COMMIT");
    console.log(`[db:migrate] applied: ${filename}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`[db:migrate] failed: ${filename}`);
    throw err;
  }
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const migrationsDir = path.join(process.cwd(), "migrations");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);
    const all = await listSqlMigrations(migrationsDir);
    const pending = all.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("[db:migrate] no pending migrations");
      return;
    }

    for (const filename of pending) {
      await applyMigration(client, migrationsDir, filename);
    }

    console.log(`[db:migrate] done. Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

