import Database from 'better-sqlite3';
import { resolve } from 'path';

const db = new Database(resolve(process.cwd(), 'src/database/church.db'));

function initializeDatabase() {
  // Create members table
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

  // Insert initial data if the table is empty
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

export { db, initializeDatabase };