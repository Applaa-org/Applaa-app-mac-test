import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool";

async function migrateCore() {
  const client = await pool.connect();

  try {
    const migrationPath = path.join(
      __dirname,
      "..",
      "migrations",
      "core",
      "001_core_schema.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");
    await client.query(sql);
    // eslint-disable-next-line no-console
    console.log("✅ [backend] Core schema migration completed");
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


