import fs from 'fs';
import path from 'path';
import { pool } from '../backend/src/config/database';

/**
 * Automated Database Migration Runner
 * Executes incremental SQL migrations in lexicographical order and tracks applied migrations.
 */
async function runMigrations() {
  console.log('============================================================');
  console.log('Smart ATS - Database Migration Runner');
  console.log('============================================================');

  const migrationsDir = path.resolve(__dirname, '../database/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error(`[Error] Migrations directory not found at: ${migrationsDir}`);
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Read already applied migrations
    const { rows: appliedRows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC;'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.version));

    // 3. Scan migration files
    const allFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const pendingFiles = allFiles.filter((file) => !appliedSet.has(file));

    if (pendingFiles.length === 0) {
      console.log('Database is up to date. Zero pending migrations.');
      return;
    }

    console.log(`Found ${pendingFiles.length} pending migration(s):`);
    pendingFiles.forEach((file) => console.log(`  -> ${file}`));

    // 4. Execute pending migrations inside a transaction per file
    for (const file of pendingFiles) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      console.log(`\nExecuting migration: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [file]);
        await client.query('COMMIT');
        console.log(`  [Success] Migration ${file} applied cleanly.`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`  [Failed] Migration ${file} failed: ${err.message}`);
        throw err;
      }
    }

    console.log('\nAll pending migrations applied successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('[Migration Runner Error]', err.message);
    process.exit(1);
  });
}
