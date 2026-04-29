/**
 * desktop.ts
 *
 * Tauri sidecar entry point for the iHIMS desktop app.
 *
 * Boot order:
 *  1. Start embedded PostgreSQL (sets process.env.DATABASE_URL)
 *  2. Dynamically import server.ts  ← Prisma client is created here,
 *                                      AFTER DATABASE_URL is set
 */

// Load .env first (if present – ignored in bundled binary)
try { require('dotenv/config'); } catch { /* not critical */ }

async function boot() {
  const useEmbedded =
    process.env.EMBEDDED_DB === 'true' ||
    !process.env.DATABASE_URL;

  if (useEmbedded) {
    console.log('[PIBS] Starting in embedded database mode...');
    const { startEmbeddedPostgres } = await import('./db/embedded');

    try {
      const dbUrl = await startEmbeddedPostgres();
      process.env.DATABASE_URL = dbUrl;
      console.log('[PIBS] DATABASE_URL set to embedded PostgreSQL');
    } catch (err) {
      console.error('[PIBS] Embedded PostgreSQL failed to start:', err);
      console.error('[PIBS] Set DATABASE_URL manually to use an external PostgreSQL instance.');
      process.exit(1);
    }
  } else {
    console.log('[PIBS] Using external PostgreSQL:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'));
  }

  // Now import the Express server – Prisma client is created here
  // using the DATABASE_URL we just established
  await import('./server');
}

boot().catch((err) => {
  console.error('[PIBS] Fatal startup error:', err);
  process.exit(1);
});
