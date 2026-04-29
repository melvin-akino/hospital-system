/**
 * embedded.ts
 *
 * Self-contained PostgreSQL manager for the iHIMS desktop app.
 * Uses the `embedded-postgres` npm package which ships prebuilt
 * PostgreSQL binaries — no external installation required.
 *
 * On first launch:
 *  1. Initialises the data directory (initdb)
 *  2. Starts PostgreSQL on a private port
 *  3. Creates the `pibs_db` database
 *  4. Runs the full schema DDL to create all tables
 *
 * Subsequent launches reuse the persisted data directory.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { Client } from 'pg';
// @ts-ignore – types may not be bundled for this package
import EmbeddedPostgres from 'embedded-postgres';
// Schema SQL is embedded as a TS constant so ncc/pkg bundle it automatically
import { SCHEMA_SQL } from './schema-sql';

// ── Config ────────────────────────────────────────────────────────────────────

const DB_USER     = 'pibs';
const DB_PASSWORD = 'pibs_secret';
const DB_NAME     = 'pibs_db';
const DB_PORT     = 5433; // Private port – avoids clash with any system PG

let embeddedPg: any = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Starts embedded PostgreSQL and returns a DATABASE_URL string.
 * Safe to call multiple times – only the first call does real work.
 */
export async function startEmbeddedPostgres(): Promise<string> {
  const appDataDir = resolveAppDataDir();
  const pgDataDir  = path.join(appDataDir, 'pgdata');
  const isFirstRun = !fs.existsSync(path.join(pgDataDir, 'PG_VERSION'));

  console.log(`[PIBS DB] Data dir: ${pgDataDir}`);
  console.log(`[PIBS DB] First run: ${isFirstRun}`);

  fs.mkdirSync(pgDataDir, { recursive: true });

  embeddedPg = new EmbeddedPostgres({
    databaseDir: pgDataDir,
    user:        DB_USER,
    password:    DB_PASSWORD,
    port:        DB_PORT,
    persistent:  true,
  });

  console.log('[PIBS DB] Initialising PostgreSQL (this may take a moment on first run)...');
  await embeddedPg.initialise();

  console.log('[PIBS DB] Starting PostgreSQL...');
  await embeddedPg.start();

  const adminUrl = `postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/postgres`;
  const dbUrl    = `postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}`;

  if (isFirstRun) {
    await bootstrapDatabase(adminUrl, dbUrl);
  }

  console.log(`[PIBS DB] Ready on port ${DB_PORT}`);
  return dbUrl;
}

/** Stop the embedded PostgreSQL process (call on app shutdown). */
export async function stopEmbeddedPostgres(): Promise<void> {
  if (embeddedPg) {
    console.log('[PIBS DB] Stopping PostgreSQL...');
    await embeddedPg.stop();
    embeddedPg = null;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function resolveAppDataDir(): string {
  // Tauri passes APP_DATA_DIR when launching the sidecar
  if (process.env.APP_DATA_DIR) return process.env.APP_DATA_DIR;

  // Fallback for standalone / dev use
  const base =
    process.platform === 'win32'
      ? process.env.APPDATA || os.homedir()
      : process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.local', 'share');

  return path.join(base, 'com.pibs.ihims');
}

async function bootstrapDatabase(adminUrl: string, dbUrl: string): Promise<void> {
  console.log('[PIBS DB] First-run setup: creating database and schema...');

  // ── Create database ────────────────────────────────────────────────────────
  const adminClient = new Client({ connectionString: adminUrl });
  await adminClient.connect();

  const exists = await adminClient.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [DB_NAME],
  );
  if (exists.rowCount === 0) {
    await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`[PIBS DB] Database '${DB_NAME}' created`);
  }
  await adminClient.end();

  // ── Run schema DDL ─────────────────────────────────────────────────────────
  // SCHEMA_SQL is a bundled constant — always available, no file I/O needed
  const schemaSql = SCHEMA_SQL;
  const dbClient  = new Client({ connectionString: dbUrl });
  await dbClient.connect();

  console.log('[PIBS DB] Running schema migrations...');
  // Execute each statement individually (split on statement-ending semicolons)
  const statements = schemaSql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await dbClient.query(stmt);
    } catch (err: any) {
      // Ignore "already exists" errors – safe to re-run
      if (!err.message?.includes('already exists') && !err.message?.includes('duplicate')) {
        console.warn(`[PIBS DB] Migration warning: ${err.message}`);
      }
    }
  }

  await dbClient.end();
  console.log('[PIBS DB] Schema migration complete');

  // ── Mark setup done ────────────────────────────────────────────────────────
  const appDataDir   = resolveAppDataDir();
  const setupMarker  = path.join(appDataDir, '.setup-complete');
  fs.writeFileSync(setupMarker, new Date().toISOString());
}
