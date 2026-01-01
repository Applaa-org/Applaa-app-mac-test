-- Migration to support dedicated databases per app (not just schemas)
-- This allows users to connect externally with their own credentials

-- Add new columns to app_databases table
ALTER TABLE core.app_databases 
ADD COLUMN IF NOT EXISTS database_name TEXT,
ADD COLUMN IF NOT EXISTS db_user TEXT,
ADD COLUMN IF NOT EXISTS db_password TEXT,
ADD COLUMN IF NOT EXISTS can_connect_externally BOOLEAN DEFAULT FALSE;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_app_databases_database_name ON core.app_databases(database_name);
CREATE INDEX IF NOT EXISTS idx_app_databases_db_user ON core.app_databases(db_user);

-- Add comments for documentation
COMMENT ON COLUMN core.app_databases.database_name IS 'Dedicated database name (e.g., applaa_user_1_app_5)';
COMMENT ON COLUMN core.app_databases.db_user IS 'Dedicated database user (e.g., user_1_app_5)';
COMMENT ON COLUMN core.app_databases.db_password IS 'Database user password (encrypted in production)';
COMMENT ON COLUMN core.app_databases.can_connect_externally IS 'Whether this database can be accessed from external tools';
COMMENT ON COLUMN core.app_databases.schema_name IS 'Legacy: Schema name for schema-based isolation (deprecated for dedicated DBs)';

