import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from 'pg';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const usePostgres = process.env.DATABASE_URL !== undefined;

let db;
let pool;

if (usePostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // Fallback to SQLite for local development
  db = new Database(join(__dirname, 'church.db'));
}

async function initializeDatabase() {
  try {
    if (usePostgres) {
      // Create members table in PostgreSQL
      await pool.query(`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          ministry TEXT,
          status TEXT,
          lastSeen TEXT,
          household TEXT
        )
      `);

      // Check if table is empty
      const countResult = await pool.query('SELECT COUNT(*) as count FROM members');
      const count = parseInt(countResult.rows[0].count, 10);

      if (count === 0) {
        const initialMembers = [
          {
            name: "Esther Coleman",
            email: "esther.coleman@gracefellowship.org",
            ministry: "Children Ministry",
            status: "Active",
            lastSeen: "Sunday Service",
            household: "Coleman Family"
          },
          {
            name: "Kwame Asante",
            email: "kwame.asante@gracefellowship.org",
            ministry: "Ushering",
            status: "Pending",
            lastSeen: "Bible Study",
            household: "Asante Household"
          },
          {
            name: "Rachel Thompson",
            email: "rachel.thompson@gracefellowship.org",
            ministry: "Choir",
            status: "Active",
            lastSeen: "Volunteer Rehearsal",
            household: "Thompson Family"
          },
          {
            name: "David Nartey",
            email: "david.nartey@gracefellowship.org",
            ministry: "Men's Fellowship",
            status: "Active",
            lastSeen: "Community Outreach",
            household: "Nartey Family"
          }
        ];

        for (const member of initialMembers) {
          await pool.query(
            'INSERT INTO members (name, email, ministry, status, lastSeen, household) VALUES ($1, $2, $3, $4, $5, $6)',
            [member.name, member.email, member.ministry, member.status, member.lastSeen, member.household]
          );
        }
      }
    } else {
      // SQLite initialization
      db.exec(`
        CREATE TABLE IF NOT EXISTS members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          ministry TEXT,
          status TEXT,
          lastSeen TEXT,
          household TEXT
        )
      `);

      const count = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
      if (count === 0) {
        const insert = db.prepare(`
          INSERT INTO members (name, email, ministry, status, lastSeen, household)
          VALUES (@name, @email, @ministry, @status, @lastSeen, @household)
        `);

        const initialMembers = [
          {
            name: "Esther Coleman",
            email: "esther.coleman@gracefellowship.org",
            ministry: "Children Ministry",
            status: "Active",
            lastSeen: "Sunday Service",
            household: "Coleman Family"
          },
          {
            name: "Kwame Asante",
            email: "kwame.asante@gracefellowship.org",
            ministry: "Ushering",
            status: "Pending",
            lastSeen: "Bible Study",
            household: "Asante Household"
          },
          {
            name: "Rachel Thompson",
            email: "rachel.thompson@gracefellowship.org",
            ministry: "Choir",
            status: "Active",
            lastSeen: "Volunteer Rehearsal",
            household: "Thompson Family"
          },
          {
            name: "David Nartey",
            email: "david.nartey@gracefellowship.org",
            ministry: "Men's Fellowship",
            status: "Active",
            lastSeen: "Community Outreach",
            household: "Nartey Family"
          }
        ];

        for (const member of initialMembers) {
          insert.run(member);
        }
      }
    }

    console.log(`Database initialized successfully (${usePostgres ? 'PostgreSQL' : 'SQLite'})`);
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Unified query function for both drivers
async function queryMembers() {
  if (usePostgres) {
    const result = await pool.query('SELECT * FROM members ORDER BY id');
    return result.rows;
  } else {
    return db.prepare('SELECT * FROM members').all();
  }
}

export { db, pool, initializeDatabase, queryMembers };
