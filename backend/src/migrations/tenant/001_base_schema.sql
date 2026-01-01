-- Base per-app schema. This runs in each tenant schema created for an app.

-- Simple app-specific users table (optional for many apps)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generic key/value storage for app-specific configuration or data
CREATE TABLE IF NOT EXISTS app_data (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(key)
);

-- Track per-schema migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_data_key ON app_data(key);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


