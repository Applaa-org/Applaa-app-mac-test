import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env.local');
  throw new Error('DATABASE_URL not found in environment');
}

console.log('🔗 Connecting to Postgres...');

export const pool = new Pool({
  connectionString,
  ssl: false, // Local development
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle Postgres client', err);
  process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Failed to connect to Postgres:', err);
  } else {
    console.log('✅ Postgres database connected successfully!');
  }
});

