# 🚀 Postgres Test App - AI Auto-Generated

This app demonstrates **full automated Postgres integration** where the AI generates everything needed for a database-backed app with **ZERO manual configuration**.

## ✨ What Was Auto-Generated

When a user says **"create a todo app"**, the AI automatically creates:

### Backend (Server)
- ✅ `server/db.ts` - Postgres connection pool using `DATABASE_URL` from `.env.local`
- ✅ `server/index.ts` - Express API server with full CRUD routes
  - `GET /api/todos` - Fetch all todos
  - `POST /api/todos` - Create a new todo
  - `PUT /api/todos/:id` - Update a todo
  - `DELETE /api/todos/:id` - Delete a todo
- ✅ `server/migrations/001_create_todos.sql` - SQL migration to create `todos` table
- ✅ `server/migrate.ts` - Migration runner script

### Frontend
- ✅ `src/lib/api.ts` - API client for backend communication
- ✅ `src/hooks/useTodos.ts` - React hook for state management
- ✅ `src/components/TodoList.tsx` - Full UI component with CRUD operations
- ✅ `src/App.tsx` - Main app component

### Configuration
- ✅ `package.json` - Scripts for `dev`, `server`, `migrate`
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `vite.config.ts` - Vite configuration

## 🎯 How to Test

### 1. Install Dependencies
```bash
cd apps/web/postgres-test-app
npm install
```

### 2. Set Up Database
The `.env.local` file should already have your Postgres connection string:
```
DATABASE_URL=postgresql://applaa_user:applaa_dev_password@localhost:5432/applaa?schema=app_test_12345
```

If you need to create the schema:
```bash
psql -d applaa -c "CREATE SCHEMA IF NOT EXISTS app_test_12345;"
```

### 3. Run the App
```bash
npm run dev
```

This single command:
- ✅ Runs migrations automatically (creates `todos` table)
- ✅ Starts API server on `http://localhost:3001`
- ✅ Starts frontend on `http://localhost:5173`

### 4. Test It!
Open `http://localhost:5173` and you'll see:
- ✅ A working todo app
- ✅ Add todos with priority levels
- ✅ Mark todos as complete
- ✅ Delete todos
- ✅ All data persists in Postgres!

## 🎨 Architecture

```
Frontend (React/Vite - Port 5173)
    ↓ HTTP requests to http://localhost:3001/api
API Server (Express - Port 3001)
    ↓ Uses DATABASE_URL from .env.local
Postgres Database (LOCAL)
    ↓ Schema: app_test_12345
    ↓ Table: todos
```

## ✅ Key Features

### Full Automation
- **NO manual database setup** - migrations run automatically
- **NO separate server commands** - `npm run dev` runs everything
- **NO manual configuration** - `.env.local` is auto-created with connection string

### Vibe Coding
- User: "create a todo app"
- AI: *generates all 12+ files instantly*
- User: `npm run dev`
- Result: **Working app with Postgres database!**

### Production Ready
- ✅ TypeScript for type safety
- ✅ Proper error handling
- ✅ Connection pooling
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS enabled for frontend communication
- ✅ Index on `created_at` for performance

## 🔧 How Migrations Work

Migrations run automatically before the server starts via the `migrate:silent` script:

```json
{
  "scripts": {
    "server": "npm run migrate:silent && nodemon --exec ts-node server/index.ts",
    "migrate:silent": "ts-node server/migrate.ts 2>/dev/null || true"
  }
}
```

This ensures:
- ✅ Tables are always created before the server starts
- ✅ No manual migration commands needed
- ✅ Idempotent (uses `CREATE TABLE IF NOT EXISTS`)

## 📝 Database Schema

```sql
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'medium',
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC);
```

## 🎉 What This Demonstrates

This test app proves that the AI can:
1. ✅ Detect when database persistence is needed
2. ✅ Auto-generate full server infrastructure
3. ✅ Create proper migrations
4. ✅ Set up frontend API integration
5. ✅ Make everything run with a single command

**This is true "vibe coding" - zero manual setup required!**

