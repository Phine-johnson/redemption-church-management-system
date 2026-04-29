import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const usePostgres = process.env.DATABASE_URL !== undefined;

let db;
let pool;

// Dynamic imports based on environment
if (usePostgres) {
  const { Pool } = await import('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // SQLite fallback for local development
  const Database = (await import('better-sqlite3')).default;
  db = new Database(join(__dirname, 'church.db'));
}

// Run PostgreSQL migrations from schema.sql
async function runMigrations() {
  if (!usePostgres) return;

  try {
    const { readFileSync } = await import('fs');
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');

    // Execute entire schema (PostgreSQL handles IF NOT EXISTS)
    await pool.query(schemaSql);
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
    // Don't throw - schema may already be applied
  }
}

// Initialize SQLite with tables and seed data
function initializeSQLite() {
  if (usePostgres) return;

  try {
    // Create members table
    db.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        ministry TEXT,
        membership_status TEXT DEFAULT 'Visitor',
        last_seen TEXT,
        household TEXT,
        date_of_birth DATE,
        gender TEXT,
        address TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        emergency_contact_relation TEXT,
        spouse_name TEXT,
        spouse_email TEXT,
        spouse_phone TEXT,
        children_names TEXT,
        occupation TEXT,
        employer TEXT,
        education_level TEXT,
        how_did_you_hear TEXT,
        referral_source TEXT,
        notes TEXT,
        baptism_date DATE,
        baptism_location TEXT,
        is_sunday_school BOOLEAN DEFAULT FALSE,
        is_youth_ministry BOOLEAN DEFAULT FALSE,
        is_worship_team BOOLEAN DEFAULT FALSE,
        is_volunteer BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed initial data if empty
    const count = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
    if (count === 0) {
      const insert = db.prepare(`
        INSERT INTO members (
          first_name, last_name, email, ministry, membership_status, last_seen, household
        ) VALUES (@firstName, @lastName, @email, @ministry, @status, @lastSeen, @household)
      `);

      const initialMembers = [
        { firstName: 'Esther', lastName: 'Coleman', email: 'esther.coleman@gracefellowship.org', ministry: 'Children Ministry', status: 'Active', lastSeen: 'Sunday Service', household: 'Coleman Family' },
        { firstName: 'Kwame', lastName: 'Asante', email: 'kwame.asante@gracefellowship.org', ministry: 'Ushering', status: 'Pending', lastSeen: 'Bible Study', household: 'Asante Household' },
        { firstName: 'Rachel', lastName: 'Thompson', email: 'rachel.thompson@gracefellowship.org', ministry: 'Choir', status: 'Active', lastSeen: 'Volunteer Rehearsal', household: 'Thompson Family' },
        { firstName: 'David', lastName: 'Nartey', email: 'david.nartey@gracefellowship.org', ministry: "Men's Fellowship", status: 'Active', lastSeen: 'Community Outreach', household: 'Nartey Family' }
      ];

      for (const member of initialMembers) {
        insert.run(member);
      }
      console.log('Seeded 4 initial members (SQLite)');
    }

    console.log('SQLite database initialized');
  } catch (error) {
    console.error('SQLite initialization error:', error);
    throw error;
  }
}

// Main database initialization
async function initializeDatabase() {
  try {
    if (usePostgres) {
      await runMigrations();
    } else {
      initializeSQLite();
    }
    console.log(`Database ready (${usePostgres ? 'PostgreSQL' : 'SQLite'})`);
  } catch (error) {
    console.error('Database init failed:', error);
    throw error;
  }
}

// Generic query executor (works with both drivers)
async function query(sql, params = []) {
  if (usePostgres) {
    return pool.query(sql, params);
  } else {
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

// Get all members (used by bootstrap)
async function queryMembers() {
  if (usePostgres) {
    const result = await pool.query('SELECT * FROM members ORDER BY last_name, first_name LIMIT 100');
    return result.rows;
  } else {
    return db.prepare('SELECT * FROM members ORDER BY last_name LIMIT 100').all();
  }
}

export { db, pool, initializeDatabase, query, execute, queryMembers };
