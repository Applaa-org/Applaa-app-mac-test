import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  database: process.env.POSTGRES_DB || "applaa",
  user: process.env.POSTGRES_USER || "applaa_user",
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  // eslint-disable-next-line no-console
  console.log("✅ [backend] Connected to PostgreSQL");
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("❌ [backend] Unexpected error on idle client", err);
});


