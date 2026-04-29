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

    // Split into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await pool.query(stmt);
      } catch (error) {
        if (!error.message.toLowerCase().includes('already exists') &&
            !error.message.toLowerCase().includes('duplicate') &&
            !error.message.toLowerCase().includes('permission')) {
          console.warn(`Statement ${i + 1} failed:`, stmt.substring(0, 80), '|', error.message);
        }
      }
    }

    // Ensure household column exists on members (for existing installations)
    try {
      const columnCheck = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'household'"
      );
      if (columnCheck.rows.length === 0) {
        await pool.query('ALTER TABLE members ADD COLUMN household TEXT');
        console.log('Added household column to members table');
      }
    } catch (err) {
      console.warn('Could not verify household column:', err.message);
    }

    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
    console.error(error.stack);
  }
}
      }
    }
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
    // Don't throw - schema may already be applied
  }
}

// Seed initial data (admin user, members, etc.)
async function seedInitialData() {
  if (!usePostgres) return;

  try {
    const bcrypt = (await import('bcryptjs')).default;

    // Check existing users
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(usersCount.rows[0].count, 10);

    if (count === 0) {
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);

      await pool.query(
        `INSERT INTO users (uuid, email, password_hash, first_name, last_name, role, phone)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)`,
        ['admin@redemptionpresby.org', passwordHash, 'Administrator', 'System', 'Super Admin', '+233123456789']
      );

      console.log('✅ Admin user created');
      console.log(`   Password: ${defaultPassword}`);
      console.log('   ⚠️  Change this password immediately after first login!');
    } else if (count === 1) {
      // Check for placeholder hash and replace
      const existing = await pool.query('SELECT id, password_hash FROM users LIMIT 1');
      const user = existing.rows[0];
      if (user.password_hash === '$2b$10$YourHashedPasswordHere') {
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
        const newHash = await bcrypt.hash(defaultPassword, 12);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
        console.log('✅ Admin password updated from placeholder');
        console.log(`   New password: ${defaultPassword}`);
      }
    }

    // Seed sample members if none exist
    const membersCount = await pool.query('SELECT COUNT(*) as count FROM members');
    const memberCount = parseInt(membersCount.rows[0].count, 10);

    if (memberCount === 0) {
      const initialMembers = [
        { firstName: 'Esther', lastName: 'Coleman', email: 'esther.coleman@gracefellowship.org', ministry: 'Children Ministry', status: 'Active', lastSeen: 'Sunday Service', household: 'Coleman Family' },
        { firstName: 'Kwame', lastName: 'Asante', email: 'kwame.asante@gracefellowship.org', ministry: 'Ushering', status: 'Pending', lastSeen: 'Bible Study', household: 'Asante Household' },
        { firstName: 'Rachel', lastName: 'Thompson', email: 'rachel.thompson@gracefellowship.org', ministry: 'Choir', status: 'Active', lastSeen: 'Volunteer Rehearsal', household: 'Thompson Family' },
        { firstName: 'David', lastName: 'Nartey', email: 'david.nartey@gracefellowship.org', ministry: "Men's Fellowship", status: 'Active', lastSeen: 'Community Outreach', household: 'Nartey Family' }
      ];

      for (const m of initialMembers) {
        await pool.query(
          `INSERT INTO members (uuid, first_name, last_name, email, ministry, membership_status, last_seen, household)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)`,
          [m.firstName, m.lastName, m.email, m.ministry, m.status, m.lastSeen, m.household]
        );
      }
      console.log('✅ Seeded 4 sample members');
    }
  } catch (error) {
    console.error('Seed error:', error.message);
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed if empty
    const count = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
    if (count === 0) {
      const insert = db.prepare(`
        INSERT INTO members (first_name, last_name, email, ministry, membership_status, last_seen, household)
        VALUES (@firstName, @lastName, @email, @ministry, @status, @lastSeen, @household)
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
      await seedInitialData();
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
