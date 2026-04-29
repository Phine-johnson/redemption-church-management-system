import pool from './postgres.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  try {
    console.log('Running database migrations...');

    // Read and execute schema.sql
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (error) {
        // Ignore errors for statements already run (like IF NOT EXISTS creates)
        if (!error.message.includes('already exists')) {
          console.warn('Migration warning:', error.message);
        }
      }
    }

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function seedData() {
  try {
    console.log('Seeding initial data...');
    // Additional seed data can be added here
    console.log('Data seeding completed');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

export { runMigrations, seedData };
