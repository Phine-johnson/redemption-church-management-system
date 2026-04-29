import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const usePostgres = process.env.DATABASE_URL !== undefined;

let db;
let pool;

if (usePostgres) {
  const { Pool } = await import('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // Fallback to SQLite for local development
  const Database = (await import('better-sqlite3')).default;
  db = new Database(join(__dirname, 'church.db'));
}

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    if (!usePostgres) return;

    const { readFileSync } = await import('fs');
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');

    // Execute entire schema (PostgreSQL handles IF NOT EXISTS)
    try {
      await pool.query(schemaSql);
      console.log('Schema migration completed');
    } catch (error) {
      console.warn('Migration note:', error.message);
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}

async function createSQLiteTables() {
  if (usePostgres) return;

  try {
    // Create members table (existing)
    db.exec(`CREATE TABLE IF NOT EXISTS members (...)`) // simplified for brevity
    console.log('SQLite tables ensured');
  } catch (error) {
    console.error('SQLite init error:', error);
  }
}
}

async function initializeDatabase() {
  try {
    await runMigrations();
    console.log(`Database initialized (${usePostgres ? 'PostgreSQL' : 'SQLite'})`);
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Unified query function for members
async function queryMembers() {
  if (usePostgres) {
    const result = await pool.query('SELECT * FROM members ORDER BY id');
    return result.rows;
  } else {
    return db.prepare('SELECT * FROM members').all();
  }
}

// Generic query executor
async function query(sql, params = []) {
  if (usePostgres) {
    return pool.query(sql, params);
  } else {
    // Simplified for SQLite - convert ? to named params
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }
}

// Generic execute (INSERT/UPDATE/DELETE)
async function execute(sql, params = []) {
  if (usePostgres) {
    return pool.query(sql, params);
  } else {
    const stmt = db.prepare(sql);
    return { rows: stmt.run(...params) };
  }
}

export { db, pool, initializeDatabase, query, execute, queryMembers };
