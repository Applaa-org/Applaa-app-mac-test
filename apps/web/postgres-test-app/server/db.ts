import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL not found in environment');
}

export const pool = new Pool({
  connectionString,
  ssl: false, // Local development
});

pool.on('connect', () => {
  console.log('✅ Postgres database connected');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

