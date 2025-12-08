-- Core schema for Applaa backend (global metadata, not per-app data)

CREATE SCHEMA IF NOT EXISTS core;

-- Platform users (optional for now – can be wired to Supabase/WordPress later)
CREATE TABLE IF NOT EXISTS core.users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Apps created in Applaa (metadata only)
CREATE TABLE IF NOT EXISTS core.apps (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id INTEGER REFERENCES core.users(id) ON DELETE SET NULL,
  app_type TEXT DEFAULT 'web' CHECK (app_type IN ('web', 'mobile', 'godot')),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mapping from app -> Postgres schema & connection info
CREATE TABLE IF NOT EXISTS core.app_databases (
  id SERIAL PRIMARY KEY,
  app_id INTEGER UNIQUE NOT NULL REFERENCES core.apps(id) ON DELETE CASCADE,
  schema_name TEXT NOT NULL UNIQUE,
  connection_string TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_owner_user_id ON core.apps(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_app_databases_app_id ON core.app_databases(app_id);
CREATE INDEX IF NOT EXISTS idx_app_databases_schema_name ON core.app_databases(schema_name);


