import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool";

async function migrateCore() {
  const client = await pool.connect();

  try {
    const migrationsDir = path.join(__dirname, "..", "migrations", "core");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Ensure 001, 002, ... order

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, "utf-8");
      console.log(`[backend] Running migration: ${file}`);
      await client.query(sql);
      console.log(`✅ [backend] Migration ${file} completed`);
    }

    console.log("✅ [backend] All core schema migrations completed");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ [backend] Core schema migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

void migrateCore();


