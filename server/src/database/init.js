import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const usePostgres = process.env.DATABASE_URL !== undefined;

let db;
let pool;
let isInitialized = false;

// Initialize PostgreSQL pool (called lazily)
async function initPostgres() {
  if (pool) return pool;

  const { Pool } = await import('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Test connection
  await pool.query('SELECT 1');
  console.log('✅ PostgreSQL connected');
  return pool;
}

// Initialize SQLite (called lazily)
async function initSQLite() {
  if (db) return db;

  const Database = (await import('better-sqlite3')).default;
  db = new Database(join(__dirname, 'church.db'));
  console.log('✅ SQLite database opened');
  return db;
}

// Run PostgreSQL migrations
async function runMigrations(pool) {
  try {
    const { readFileSync } = await import('fs');
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');

    // Split into statements
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (let i = 0; i < statements.length; i++) {
      try {
        await pool.query(statements[i]);
      } catch (error) {
        const msg = error.message.toLowerCase();
        if (!msg.includes('already exists') && !msg.includes('duplicate')) {
          console.warn(`Migration stmt ${i + 1} error:`, error.message);
        }
      }
    }

    // Ensure household column exists
    try {
      const res = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'household'"
      );
      if (res.rows.length === 0) {
        await pool.query('ALTER TABLE members ADD COLUMN household TEXT');
        console.log('✅ Added household column');
      }
    } catch (e) {
      console.warn('Column check failed:', e.message);
    }

    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  }
}

// Seed initial data
async function seedData(pool) {
  try {
    const bcrypt = (await import('bcryptjs')).default;

    // Admin user
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(usersCount.rows[0].count, 10) === 0) {
      const pwd = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
      const hash = await bcrypt.hash(pwd, 12);
      await pool.query(
        `INSERT INTO users (uuid, email, password_hash, first_name, last_name, role, phone)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)`,
        ['admin@redemptionpresby.org', hash, 'Administrator', 'System', 'Super Admin', '+233123456789']
      );
      console.log('✅ Admin created');
      console.log(`   Password: ${pwd}`);
    }

    // Members
    const membersCount = await pool.query('SELECT COUNT(*) as count FROM members');
    if (parseInt(membersCount.rows[0].count, 10) === 0) {
      const initialMembers = [
        { fn: 'Esther', ln: 'Coleman', email: 'esther.coleman@gracefellowship.org', ministry: 'Children Ministry', status: 'Active', seen: 'Sunday Service', household: 'Coleman Family' },
        { fn: 'Kwame', ln: 'Asante', email: 'kwame.asante@gracefellowship.org', ministry: 'Ushering', status: 'Pending', seen: 'Bible Study', household: 'Asante Household' },
        { fn: 'Rachel', ln: 'Thompson', email: 'rachel.thompson@gracefellowship.org', ministry: 'Choir', status: 'Active', seen: 'Volunteer Rehearsal', household: 'Thompson Family' },
        { fn: 'David', ln: 'Nartey', email: 'david.nartey@gracefellowship.org', ministry: "Men's Fellowship", status: 'Active', seen: 'Community Outreach', household: 'Nartey Family' }
      ];

      for (const m of initialMembers) {
        await pool.query(
          `INSERT INTO members (uuid, first_name, last_name, email, ministry, membership_status, last_seen, household)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)`,
          [m.fn, m.ln, m.email, m.ministry, m.status, m.seen, m.household]
        );
      }
      console.log('✅ Seeded 4 members');
    }
  } catch (error) {
    console.error('Seed error:', error.message);
  }
}

// Initialize database (called from server.js)
export async function initializeDatabase() {
  if (isInitialized) return;
  try {
    if (usePostgres) {
      pool = await initPostgres();
      await runMigrations(pool);
      await seedData(pool);
    } else {
      initSQLite();
    }
    isInitialized = true;
    console.log(`✅ Database ready (${usePostgres ? 'PostgreSQL' : 'SQLite'})`);
  } catch (error) {
    console.error('❌ Database init failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Query helper
export async function query(sql, params = []) {
  if (usePostgres) {
    if (!pool) throw new Error('PostgreSQL pool not initialized');
    return pool.query(sql, params);
  } else {
    if (!db) initSQLite();
    return db.prepare(sql).all(...params);
  }
}

// Execute helper
export async function execute(sql, params = []) {
  if (usePostgres) {
    if (!pool) throw new Error('PostgreSQL pool not initialized');
    return pool.query(sql, params);
  } else {
    if (!db) initSQLite();
    const stmt = db.prepare(sql);
    return { rows: stmt.run(...params) };
  }
}

// Member query shortcut
export async function queryMembers() {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM members ORDER BY last_name, first_name LIMIT 100');
    return res.rows;
  } else {
    if (!db) initSQLite();
    return db.prepare('SELECT * FROM members ORDER BY last_name LIMIT 100').all();
  }
}

// Export connections for debugging
export { db, pool };
