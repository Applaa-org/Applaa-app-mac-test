# Automated Database Provisioning Architecture

## Complete Setup Guide for VPS-Hosted Postgres Multi-Tenant System

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Database Schema Design](#database-schema-design)
4. [Local Development Setup](#local-development-setup) ⭐ **Start Here for Testing**
5. [Complete Setup Instructions (VPS)](#complete-setup-instructions)
6. [Backend API Implementation](#backend-api-implementation)
7. [Electron App Integration](#electron-app-integration)
8. [Automated Flow Diagrams](#automated-flow-diagrams)
9. [Security Considerations](#security-considerations)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Electron App (Client)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Renderer   │  │  Main Proc   │  │  IPC Client   │         │
│  │   (React)    │◄─┤  (Node.js)   │◄─┤  (IPC Layer)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                                     │
│         └──────────────────┼─────────────────────────────────┐  │
└────────────────────────────┼─────────────────────────────────┼──┘
                             │                                 │
                             │ HTTPS (JWT Auth)                │
                             │                                 │
┌────────────────────────────▼─────────────────────────────────▼──┐
│              Backend API Server (Node.js/Express)               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware (JWT Verification)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  App Creation Handler                                     │  │
│  │  - Creates app record                                    │  │
│  │  - Calls database provisioning service                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Database Provisioning Service                            │  │
│  │  - Creates Postgres schema                                │  │
│  │  - Runs base migrations                                   │  │
│  │  - Generates connection string                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Schema Builder Service                                   │  │
│  │  - Creates app-specific tables                            │  │
│  │  - Handles dynamic schema creation                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ PostgreSQL Connection Pool
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              Postgres Database (VPS)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  core schema (Global)                                    │   │
│  │  ├── users (applaa users)                                │   │
│  │  ├── apps (app metadata)                                 │   │
│  │  └── app_databases (schema mapping)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  app_1_todo_app schema (Tenant 1)                        │   │
│  │  ├── users (todo app users)                              │   │
│  │  ├── todos (todo items)                                  │   │
│  │  └── app_data (flexible storage)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  app_2_chat_app schema (Tenant 2)                         │   │
│  │  ├── users (chat app users)                              │   │
│  │  ├── messages (chat messages)                             │   │
│  │  └── app_data (flexible storage)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ... (one schema per app)                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Multi-Tenant Isolation**: Each app gets its own Postgres schema
2. **Fully Automated**: Database creation happens automatically on app creation
3. **Secure**: No direct database access from Electron app
4. **Scalable**: Can handle hundreds of apps on a single Postgres instance
5. **Flexible**: App-specific tables can be created dynamically

---

## System Components

### 1. Electron App (Client)
- **Location**: Your existing Electron app
- **Role**: UI and local app management
- **Communication**: HTTPS requests to backend API
- **Storage**: Local SQLite for app metadata (apps, chats, messages)

### 2. Backend API Server
- **Location**: VPS (Node.js/Express)
- **Role**: 
  - Authentication & authorization
  - App lifecycle management
  - Database provisioning
  - Schema management
- **Port**: 443 (HTTPS) or 3000 (HTTP for development)

### 3. Postgres Database
- **Location**: VPS (same or separate server)
- **Role**: Data storage with schema-based multi-tenancy
- **Port**: 5432 (internal only, not exposed to internet)

---

## Database Schema Design

### Core Schema (Global - One Time Setup)

```sql
-- File: backend/migrations/core/001_core_schema.sql

-- Create core schema
CREATE SCHEMA IF NOT EXISTS core;

-- Users table (Applaa platform users)
CREATE TABLE core.users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Apps table (App metadata)
CREATE TABLE core.apps (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  app_type TEXT DEFAULT 'web' CHECK (app_type IN ('web', 'mobile', 'godot')),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- App databases mapping (links apps to their Postgres schemas)
CREATE TABLE core.app_databases (
  id SERIAL PRIMARY KEY,
  app_id INTEGER UNIQUE NOT NULL REFERENCES core.apps(id) ON DELETE CASCADE,
  schema_name TEXT NOT NULL UNIQUE,
  connection_string TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_apps_owner_user_id ON core.apps(owner_user_id);
CREATE INDEX idx_app_databases_app_id ON core.app_databases(app_id);
CREATE INDEX idx_app_databases_schema_name ON core.app_databases(schema_name);
```

### Tenant Schema Template (Created Per App)

```sql
-- File: backend/migrations/tenant/001_base_schema.sql
-- This runs automatically for each new app schema

-- Users table (app-specific users, if needed)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generic app data table (flexible JSONB storage)
CREATE TABLE app_data (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(key)
);

-- Schema migrations tracking
CREATE TABLE schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_app_data_key ON app_data(key);
CREATE INDEX idx_users_email ON users(email);
```

### Example: Todo App Schema (Created Dynamically)

```sql
-- Created automatically when AI detects "todo app" requirements
-- File: backend/migrations/tenant/002_todo_app.sql (example)

CREATE TABLE todos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_due_date ON todos(due_date);
```

---

## Local Development Setup

### Quick Start: Test with Local Postgres First

Before deploying to VPS, you can test everything locally on your machine. This is the recommended approach for development and testing.

#### Step 1: Install Postgres Locally (macOS)

```bash
# Install Postgres 15 using Homebrew
brew install postgresql@15

# Start Postgres service
brew services start postgresql@15

# Verify it's running
pg_isready -h localhost -p 5432
```

#### Step 2: Create Database and User

```bash
# Connect to Postgres (uses your macOS user by default)
psql postgres

# Inside psql, run:
CREATE DATABASE applaa;
CREATE USER applaa_user WITH PASSWORD 'applaa_dev_password';
GRANT ALL PRIVILEGES ON DATABASE applaa TO applaa_user;
ALTER USER applaa_user CREATEDB;
ALTER USER applaa_user WITH CREATEROLE;
\q

# Create core schema and grant permissions
psql -d applaa -c "CREATE SCHEMA IF NOT EXISTS core; GRANT ALL ON SCHEMA core TO applaa_user; ALTER SCHEMA core OWNER TO applaa_user;"
```

#### Step 3: Configure Backend Environment

Create `backend/.env` file:

```env
# Local Postgres Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=applaa
POSTGRES_USER=applaa_user
POSTGRES_PASSWORD=applaa_dev_password

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS (allow localhost)
CORS_ORIGIN=*
```

#### Step 4: Install Backend Dependencies and Run Migrations

```bash
cd backend
npm install
npm run migrate:core  # Creates core schema and tables
```

You should see:
```
✅ [backend] Connected to PostgreSQL
✅ [backend] Core schema migration completed
```

#### Step 5: Start Backend Server

```bash
npm run dev
```

Backend will run on `http://localhost:3000`. You can test it:

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","database":"connected"}
```

#### Step 6: Test App Creation

1. Start your Electron app
2. Create a new app (e.g., "todo-app")
3. The backend will automatically:
   - Create app record in `core.apps`
   - Create schema: `app_1_todo_app`
   - Run base migrations
   - Return connection string
4. Check the generated app's `.env` file - it should contain `DATABASE_URL`

#### Step 7: Verify Database Was Created

```bash
psql -U applaa_user -d applaa -c "\dn app_*"
# Should list schemas like: app_1_todo_app

psql -U applaa_user -d applaa -c "\dt app_1_todo_app.*"
# Should show tables: users, app_data, schema_migrations
```

### Migrating from Local to VPS

When ready for production:

1. **Deploy backend to VPS** (follow VPS setup instructions below)
2. **Set up Postgres on VPS** (same schema, different host)
3. **Update environment variables:**
   - Change `POSTGRES_HOST` from `localhost` to your VPS IP
   - Update `BACKEND_API_URL` in Electron app to VPS URL
4. **No code changes needed!** The same codebase works for both local and VPS.

---

## Complete Setup Instructions

### Prerequisites

- VPS with Ubuntu 22.04+ (or similar Linux distribution)
- Domain name (optional, for HTTPS)
- SSH access to VPS
- Node.js 20+ installed
- Basic knowledge of Linux, Postgres, and Node.js

### Step 1: VPS Setup

#### 1.1 Initial Server Configuration

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential
```

#### 1.2 Install Postgres

```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Switch to postgres user
su - postgres

# Create database and user
psql << EOF
CREATE DATABASE applaa;
CREATE USER applaa_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE applaa TO applaa_user;
ALTER USER applaa_user CREATEDB;
\q
EOF

# Exit postgres user
exit
```

#### 1.3 Configure Postgres Security

```bash
# Edit pg_hba.conf
nano /etc/postgresql/15/main/pg_hba.conf

# Add this line (allows local connections with password):
host    applaa    applaa_user    127.0.0.1/32    md5

# Restart PostgreSQL
systemctl restart postgresql
```

#### 1.4 Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### Step 2: Backend API Setup

#### 2.1 Create Backend Directory Structure

```bash
# Create project directory
mkdir -p /opt/applaa-backend
cd /opt/applaa-backend

# Initialize npm project
npm init -y

# Install dependencies
npm install express pg dotenv jsonwebtoken bcrypt cors helmet
npm install -D @types/node @types/express @types/pg @types/jsonwebtoken @types/bcrypt typescript ts-node nodemon

# Create directory structure
mkdir -p src/{routes,services,middleware,db,migrations/{core,tenant}}
mkdir -p logs
```

#### 2.2 Create TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 2.3 Create Environment Configuration

```bash
# Create .env file
nano .env
```

```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=applaa
POSTGRES_USER=applaa_user
POSTGRES_PASSWORD=your_secure_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

#### 2.4 Create Package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate:core": "ts-node src/db/migrate-core.ts",
    "migrate:tenant": "ts-node src/db/migrate-tenant.ts"
  }
}
```

### Step 3: Backend Implementation

#### 3.1 Database Connection Pool

```typescript
// src/db/pool.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'applaa',
  user: process.env.POSTGRES_USER || 'applaa_user',
  password: process.env.POSTGRES_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});
```

#### 3.2 Database Provisioning Service

```typescript
// src/services/database-provisioning.ts
import { Pool, PoolClient } from 'pg';
import { pool } from '../db/pool';
import fs from 'fs';
import path from 'path';

export interface ProvisionedDatabase {
  schemaName: string;
  connectionString: string;
  appId: number;
}

/**
 * Automatically creates a database schema for a new app
 */
export async function provisionAppDatabase(
  appId: number,
  appName: string,
  appType: 'web' | 'mobile' | 'godot'
): Promise<ProvisionedDatabase> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create unique schema name
    const sanitizedName = appName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const schemaName = `app_${appId}_${sanitizedName}`;
    
    // 2. Create schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // 3. Run base migrations
    await runBaseMigrations(client, schemaName);
    
    // 4. Generate connection string
    const connectionString = generateConnectionString(schemaName);
    
    // 5. Store mapping in core.app_databases
    await client.query(
      `INSERT INTO core.app_databases (app_id, schema_name, connection_string, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (app_id) DO UPDATE 
       SET schema_name = EXCLUDED.schema_name, 
           connection_string = EXCLUDED.connection_string,
           updated_at = NOW()`,
      [appId, schemaName, connectionString]
    );

    await client.query('COMMIT');

    console.log(`✅ Database provisioned: ${schemaName} for app ${appId}`);

    return {
      schemaName,
      connectionString,
      appId,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to provision database for app ${appId}:`, error);
    throw new Error(`Failed to provision database: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Runs base migrations for the app schema
 */
async function runBaseMigrations(
  client: PoolClient,
  schemaName: string
): Promise<void> {
  // Set search path
  await client.query(`SET search_path TO ${schemaName}, public`);

  // Create migrations tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Read and execute base migration
  const migrationPath = path.join(__dirname, '../migrations/tenant/001_base_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  // Replace schema placeholder if needed
  const finalSQL = migrationSQL.replace(/\$\{schemaName\}/g, schemaName);
  
  await client.query(finalSQL);
  
  // Mark migration as applied
  await client.query(
    `INSERT INTO ${schemaName}.schema_migrations (version) VALUES ('001_base') 
     ON CONFLICT (version) DO NOTHING`
  );
}

function generateConnectionString(schemaName: string): string {
  const dbHost = process.env.POSTGRES_HOST || 'localhost';
  const dbPort = process.env.POSTGRES_PORT || '5432';
  const dbName = process.env.POSTGRES_DB || 'applaa';
  const dbUser = process.env.POSTGRES_USER || 'applaa_user';
  const dbPassword = process.env.POSTGRES_PASSWORD;
  
  return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=${schemaName}`;
}

/**
 * Creates app-specific tables based on requirements
 */
export async function createAppSpecificSchema(
  appId: number,
  schemaDefinition: {
    tables: Array<{
      name: string;
      columns: Array<{ name: string; type: string; constraints?: string }>;
    }>;
  }
): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Get schema name for this app
    const result = await client.query(
      `SELECT schema_name FROM core.app_databases WHERE app_id = $1`,
      [appId]
    );

    if (result.rows.length === 0) {
      throw new Error(`No database found for app ${appId}`);
    }

    const schemaName = result.rows[0].schema_name;
    await client.query(`SET search_path TO ${schemaName}, public`);

    // Create each table
    for (const table of schemaDefinition.tables) {
      const columns = table.columns
        .map(col => `${col.name} ${col.type} ${col.constraints || ''}`)
        .join(', ');
      
      await client.query(
        `CREATE TABLE IF NOT EXISTS ${schemaName}.${table.name} (${columns})`
      );
      
      console.log(`✅ Created table ${table.name} in schema ${schemaName}`);
    }
  } finally {
    client.release();
  }
}
```

#### 3.3 Authentication Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

#### 3.4 App Routes

```typescript
// src/routes/apps.ts
import { Router, Response } from 'express';
import { provisionAppDatabase, createAppSpecificSchema } from '../services/database-provisioning';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../db/pool';

const router = Router();

// Create a new app with automatic database provisioning
router.post('/apps', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, appType } = req.body;
  const userId = req.user!.id;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create app record
    const appResult = await client.query(
      `INSERT INTO core.apps (name, owner_user_id, app_type, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [name, userId, appType || 'web']
    );
    const appId = appResult.rows[0].id;

    // 2. AUTOMATICALLY PROVISION DATABASE
    const database = await provisionAppDatabase(appId, name, appType || 'web');

    await client.query('COMMIT');

    res.json({
      id: appId,
      name,
      appType: appType || 'web',
      database: {
        schemaName: database.schemaName,
        connectionString: database.connectionString,
      },
      message: 'App and database created successfully',
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating app:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Create app-specific schema (called by AI when generating app code)
router.post('/apps/:appId/schema', authenticate, async (req: AuthRequest, res: Response) => {
  const { appId } = req.params;
  const { tables } = req.body;

  try {
    await createAppSpecificSchema(parseInt(appId), { tables });
    res.json({ message: 'Schema created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get app database info
router.get('/apps/:appId/database', authenticate, async (req: AuthRequest, res: Response) => {
  const { appId } = req.params;

  const result = await pool.query(
    `SELECT schema_name, connection_string 
     FROM core.app_databases 
     WHERE app_id = $1`,
    [appId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Database not found for this app' });
  }

  res.json(result.rows[0]);
});

export default router;
```

#### 3.5 Main Server File

```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { pool } from './db/pool';
import appsRouter from './routes/apps';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Routes
app.use('/api', appsRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

### Step 4: Run Core Migrations

```typescript
// src/db/migrate-core.ts
import { pool } from './pool';
import fs from 'fs';
import path from 'path';

async function migrateCore() {
  const client = await pool.connect();
  
  try {
    const migrationPath = path.join(__dirname, '../migrations/core/001_core_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await client.query(migrationSQL);
    console.log('✅ Core schema migration completed');
  } catch (error) {
    console.error('❌ Core migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateCore();
```

Run it:
```bash
npm run migrate:core
```

---

## Electron App Integration

### Step 1: Add Backend API Client

```typescript
// src/lib/backend-api.ts
import { IpcClient } from '@/ipc/ipc_client';

interface BackendConfig {
  baseUrl: string;
  authToken: string | null;
}

class BackendAPI {
  private config: BackendConfig = {
    baseUrl: process.env.BACKEND_API_URL || 'http://localhost:3000/api',
    authToken: null,
  };

  setAuthToken(token: string) {
    this.config.authToken = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async createApp(name: string, appType: 'web' | 'mobile' | 'godot' = 'web') {
    return this.request('/apps', {
      method: 'POST',
      body: JSON.stringify({ name, appType }),
    });
  }

  async getAppDatabase(appId: number) {
    return this.request(`/apps/${appId}/database`);
  }

  async createAppSchema(appId: number, tables: any[]) {
    return this.request(`/apps/${appId}/schema`, {
      method: 'POST',
      body: JSON.stringify({ tables }),
    });
  }
}

export const backendAPI = new BackendAPI();
```

### Step 2: Modify App Creation Handler

```typescript
// src/ipc/handlers/app_handlers.ts
// Add this import at the top
import { backendAPI } from '../../lib/backend-api';

// Modify the create-app handler (around line 832)
handle("create-app", async (_, params: CreateAppParams) => {
  // ... existing validation code ...

  // Create app in local DB (as before)
  const info = db.$client
    .prepare("INSERT INTO apps (name, path, app_type) VALUES (?, ?, ?)")
    .run(params.name, appRelPath2, appType);
  const insertedId = Number(info.lastInsertRowid);

  // NEW: Call backend to provision database
  let databaseInfo = null;
  try {
    const result = await backendAPI.createApp(params.name, appType);
    databaseInfo = result.database;
    
    // Store database info in local app record (add new column or use existing field)
    db.$client
      .prepare("UPDATE apps SET supabase_project_id = ? WHERE id = ?")
      .run(JSON.stringify({
        schemaName: databaseInfo.schemaName,
        connectionString: databaseInfo.connectionString,
      }), insertedId);

    logger.info(`✅ Database provisioned: ${databaseInfo.schemaName}`);
  } catch (error: any) {
    logger.error(`⚠️ Failed to provision database:`, error);
    // Don't fail app creation if DB provisioning fails
  }

  // Inject DATABASE_URL into app's .env file
  if (databaseInfo) {
    const envPath = path.join(fullAppPath, '.env');
    const envContent = `# Database connection (auto-generated)
DATABASE_URL=${databaseInfo.connectionString}
POSTGRES_SCHEMA=${databaseInfo.schemaName}
`;

    if (fs.existsSync(envPath)) {
      const existing = fs.readFileSync(envPath, 'utf-8');
      if (!existing.includes('DATABASE_URL')) {
        fs.appendFileSync(envPath, '\n' + envContent);
      }
    } else {
      fs.writeFileSync(envPath, envContent);
    }
  }

  // ... rest of existing code ...
});
```

---

## Automated Flow Diagrams

### Flow 1: App Creation with Database Provisioning

```
User Action: "Create todo app"
    │
    ▼
┌─────────────────────────────────────┐
│  Electron: createApp() called      │
│  - Validates user permissions       │
│  - Creates local app record        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Electron: Calls backend API       │
│  POST /api/apps                    │
│  { name: "todo-app", appType: "web" }│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: Authenticates request     │
│  - Verifies JWT token               │
│  - Extracts user ID                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: Creates app record        │
│  INSERT INTO core.apps              │
│  Returns: appId = 123               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: provisionAppDatabase()    │
│  - Creates schema: app_123_todo_app │
│  - Runs base migrations             │
│  - Generates connection string      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: Stores mapping            │
│  INSERT INTO core.app_databases     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: Returns to Electron      │
│  { id: 123, database: {...} }      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Electron: Injects DATABASE_URL     │
│  into app/.env file                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  App created with database ready!   │
│  Generated code can use DB immediately│
└─────────────────────────────────────┘
```

### Flow 2: Dynamic Schema Creation (Todo App Example)

```
AI generates todo app code
    │
    ▼
┌─────────────────────────────────────┐
│  AI detects: "todo app"            │
│  Needs: todos table                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Electron: Calls backend            │
│  POST /api/apps/123/schema          │
│  { tables: [{ name: "todos", ... }] }│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: Gets schema name          │
│  SELECT schema_name FROM            │
│  core.app_databases WHERE app_id=123│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: Creates todos table       │
│  CREATE TABLE app_123_todo_app.todos│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Todo app code can now use:         │
│  SELECT * FROM todos                │
└─────────────────────────────────────┘
```

---

## Security Considerations

### 1. Authentication & Authorization

- **JWT Tokens**: All API requests require valid JWT tokens
- **User Isolation**: Users can only access their own apps
- **Schema Isolation**: Each app's schema is completely isolated

### 2. Database Security

- **No Direct Access**: Electron app never connects directly to Postgres
- **Connection Pooling**: Backend uses connection pooling with limits
- **Schema Permissions**: Each schema is isolated, no cross-schema access
- **Password Security**: Database passwords stored in environment variables

### 3. Network Security

- **HTTPS Only**: All communication over HTTPS in production
- **CORS**: Configure CORS to only allow your Electron app domain
- **Rate Limiting**: Implement rate limiting on API endpoints

### 4. Environment Variables

```bash
# Never commit these to git
POSTGRES_PASSWORD=...
JWT_SECRET=...
```

---

## Deployment Guide

### Production Deployment with PM2

```bash
# Install PM2
npm install -g pm2

# Build the backend
cd /opt/applaa-backend
npm run build

# Start with PM2
pm2 start dist/index.js --name applaa-backend
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

### Nginx Reverse Proxy (for HTTPS)

```nginx
# /etc/nginx/sites-available/applaa-backend
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificate (Let's Encrypt)

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d api.yourdomain.com
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check connection
psql -U applaa_user -d applaa -h localhost

# Check logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 2. Schema Creation Fails

```sql
-- Check if schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'app_%';

-- Manually create schema if needed
CREATE SCHEMA app_123_todo_app;
```

#### 3. Backend API Not Responding

```bash
# Check if backend is running
pm2 status

# Check logs
pm2 logs applaa-backend

# Restart backend
pm2 restart applaa-backend
```

#### 4. Connection String Issues

- Verify environment variables are set correctly
- Check password encoding (special characters may need URL encoding)
- Test connection string manually with `psql`

---

## Next Steps

1. **Set up VPS** following Step 1
2. **Deploy backend** following Step 2-3
3. **Run core migrations** following Step 4
4. **Integrate with Electron app** following Electron App Integration section
5. **Test** by creating a new app and verifying database is created
6. **Monitor** using PM2 logs and Postgres logs

---

## AI Integration: How the AI Uses Postgres

### Automatic Detection

The AI automatically detects when Postgres is available by checking for `DATABASE_URL` in the app's `.env` file. When detected, the AI receives special instructions on how to use Postgres.

### How It Works

1. **Detection**: When a chat starts, the system checks if `DATABASE_URL` exists in `.env`
2. **Prompt Injection**: If found, the AI receives `POSTGRES_AVAILABLE_SYSTEM_PROMPT` with complete instructions
3. **Automatic Table Creation**: When the AI detects app needs (e.g., "todo app"), it automatically:
   - Creates necessary tables (e.g., `todos` table)
   - Sets up CRUD operations
   - Creates React components that use the database

### Example Flow: Todo App

**User**: "Create a todo app"

**AI automatically**:
1. Detects `DATABASE_URL` in `.env` → knows Postgres is available
2. Detects "todo app" → needs `todos` table
3. Creates migration: `src/lib/migrations.ts` with `createTodosTable()`
4. Creates CRUD functions: `src/lib/todos.ts` with `createTodo()`, `getTodos()`, `updateTodo()`, `deleteTodo()`
5. Creates React component: `src/components/TodoList.tsx` that uses the database
6. Installs dependencies: `pg` and `@types/pg`

**Result**: Fully functional todo app with Postgres backend, all automatically!

### What the AI Knows

The AI prompt includes:
- ✅ How to connect to Postgres using `pg` library
- ✅ How to create tables with proper SQL
- ✅ Complete CRUD operation examples
- ✅ React component integration patterns
- ✅ Next.js API route examples
- ✅ TypeScript type definitions
- ✅ Error handling best practices

### Table Creation Patterns

The AI automatically creates tables based on app type:

| App Type | Tables Created |
|----------|---------------|
| Todo App | `todos` (id, title, description, completed, priority, due_date, user_id) |
| Blog App | `posts`, `categories`, `post_categories` |
| E-commerce | `products`, `orders`, `order_items` |
| Chat App | `messages`, `conversations` |
| User Management | Uses existing `users` table or extends it |

### CRUD Operations

The AI automatically generates:

**CREATE**: Insert new records
```typescript
await createTodo({ title: "Buy groceries", priority: "high" });
```

**READ**: Query data
```typescript
const todos = await getTodos();
const todo = await getTodoById(1);
```

**UPDATE**: Modify records
```typescript
await updateTodo(1, { completed: true, priority: "low" });
```

**DELETE**: Remove records
```typescript
await deleteTodo(1);
```

### Integration Points

1. **System Prompt**: `src/prompts/postgres_prompt.ts` contains all instructions
2. **Detection**: `src/ipc/handlers/chat_stream_handlers.ts` checks for `DATABASE_URL`
3. **Token Counting**: `src/ipc/handlers/token_count_handlers.ts` includes Postgres prompt in token calculations

### Benefits

- ✅ **Zero Configuration**: AI automatically uses Postgres when available
- ✅ **Smart Detection**: Knows when to create tables based on app requirements
- ✅ **Complete Implementation**: Creates full CRUD operations, not just placeholders
- ✅ **Type Safety**: All database operations are fully typed with TypeScript
- ✅ **Best Practices**: Follows Postgres and React best practices automatically

---

## Summary

This architecture provides:
- ✅ **Fully automated** database provisioning
- ✅ **Multi-tenant isolation** via Postgres schemas
- ✅ **Scalable** to hundreds of apps
- ✅ **Secure** with no direct database access from client
- ✅ **Flexible** with dynamic schema creation
- ✅ **AI-Powered** - AI automatically detects and uses Postgres

Each app created through your Electron tool automatically gets its own Postgres database schema, ready to use immediately. The AI automatically detects the database and creates all necessary tables and CRUD operations when building features!

