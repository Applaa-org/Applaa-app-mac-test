/**
 * Get the backend base URL from environment variable
 */
function getBackendBaseUrl(): string {
  // Prefer env; fall back to production API instead of localhost to avoid
  // generating prompts that point to a non-running local backend.
  const apiUrl = process.env.BACKEND_API_URL || 'https://haix.ai/api';
  // Remove /api suffix if present, we'll add it back in the prompt
  return apiUrl.replace('/api', '');
}

/**
 * Generate Postgres system prompt with dynamic backend URL
 */
export function getPostgresAvailablePrompt(): string {
  const backendUrl = getBackendBaseUrl();
  const apiUrl = `${backendUrl}/api`;
  
  // Debug logging to verify env var is loaded
  
  return `
# Postgres Database Integration

## 🚨 **TYPESCRIPT ENFORCEMENT (MANDATORY)**
- **ALL files MUST use TypeScript extensions**: .tsx for components with JSX, .ts for utilities without JSX
- **NEVER use JSX extensions**: .jsx or .js files are FORBIDDEN
- **CRITICAL: Files with JSX/React components MUST use .tsx extension**
- **CRITICAL: Files with only TypeScript utilities MUST use .ts extension**

## 🚨 **CRITICAL: DO NOT USE SUPABASE**
- **This app has Postgres database available - DO NOT suggest Supabase**
- **DO NOT create Supabase client files**
- **DO NOT ask user to set up Supabase**
- **DO NOT use @supabase/supabase-js package**

## 🚨 **CRITICAL: WEB APPS NEED API ROUTES FOR POSTGRES**
- **If this is a React/Vite web app, it runs in the BROWSER**
- **The \`pg\` package ONLY works in Node.js, NOT in browsers**
- **SOLUTION: Create API routes (server-side) that use Postgres**
- **Frontend calls API routes, API routes access Postgres**
- **DO NOT install pg in frontend - install it only for API routes**

## 🗄️ **Postgres Database Available (Provisioned by Main Backend)**

This app has a Postgres database automatically provisioned. The connection string is available in the \`.env.local\` file as \`DATABASE_URL\`.

**The database is ALREADY running. Just connect to it using the DATABASE_URL.**

## 🚨 **CRITICAL: UNIQUE TABLE NAMES (MANDATORY)**

**ALWAYS generate unique table names to avoid conflicts between apps:**

When creating database tables, you MUST append a unique random string to the table name:
- ✅ GOOD: \`todos_a3f9k2m1\`, \`posts_x7b4n8p2\`, \`products_q5w9e3r1\`
- ❌ BAD: \`todos\`, \`posts\`, \`products\` (will cause conflicts when multiple apps use the same database)

**How to generate unique table names:**
1. Generate a random alphanumeric string (8-12 characters): e.g., \`a3f9k2m1\`, \`x7b4n8p2\`, \`q5w9e3r1\`
2. Append it to your base table name: \`todos_a3f9k2m1\`
3. Use this unique name consistently in:
   - CREATE TABLE statements
   - API endpoint paths (\`/api/todos_a3f9k2m1\`)
   - All SQL queries and indexes
   - TypeScript interfaces can keep generic names (e.g., \`Todo\`), but API calls must use the unique table name

**Example pattern:**
\\\`\\\`\\\`typescript
// Generate unique table name
const randomString = Math.random().toString(36).substring(2, 10); // 8 characters
const tableName = \`todos_\${randomString}\`; // e.g., "todos_a3f9k2m1"
\\\`\\\`\\\`

**CRITICAL RULES:**
- Each app MUST have its own unique table names
- The random string should be generated once per app and reused consistently throughout the codebase
- Use lowercase alphanumeric characters only (a-z, 0-9)
- Keep the random string length between 8-12 characters for uniqueness
- Store the table name in a constant at the top of your API file for consistency

### **How to Detect Database Availability**

1. **Check for DATABASE_URL in .env.local file:**
   - If \`DATABASE_URL\` exists in \`.env.local\`, Postgres is available
   - The connection string format: \`postgresql://user:password@host:port/database?schema=schema_name\`
   - **This means Postgres is ready - use it, NOT Supabase**

2. **Database Schema Already Created:**
   - The database schema is ALREADY created and ready to use
   - DO NOT ask user to create the database
   - DO NOT ask user to run database setup commands
   - Each app automatically gets a schema with these base tables:
     - \`users\` - For app-specific user data (already exists)
     - \`app_data\` - Flexible JSONB storage for any data (already exists)
     - \`schema_migrations\` - Tracks applied migrations (already exists)
   - Just create your app-specific tables (e.g., todos, posts, etc.)

### **FOR WEB APPS (React/Vite): USE THE MAIN BACKEND API**

**🚨 CRITICAL ARCHITECTURE:**
- **DO NOT create a local server** (no \`server/\` directory, no Express, no \`npm run server\`)
- **The main backend is ALREADY RUNNING** at \`${backendUrl}\`
- **Just create frontend code** that calls the main backend API
- **The backend automatically handles** database operations for all apps

**IMPORTANT**:
- The backend provisions the database automatically when the app is created. Do NOT try to create databases or schemas from the frontend.
- When the user asks for any database feature (todos, posts, etc.), IMMEDIATELY create the frontend integration WITHOUT asking. Do these steps AUTOMATICALLY:

#### **Step 1: Install Dependencies (ONLY if needed)**

You typically don't need any special dependencies - just use native \`fetch\` API.

If you need type definitions:
<applaa-add-dependency packages="@types/node"></applaa-add-dependency>

#### **Step 2: Create Frontend API Client**

**CRITICAL**: The API calls go to the MAIN BACKEND at \`${apiUrl}\`

**🚀 AUTOMATIC ENDPOINT GENERATION:**
The backend **automatically creates CRUD endpoints** for ANY table you create!

**Endpoint Pattern (handled by backend automatically):**
- \`GET ${apiUrl}/{tableName}\` - Get all rows
- \`POST ${apiUrl}/{tableName}\` - Create a row
- \`PUT ${apiUrl}/{tableName}/:id\` - Update a row
- \`DELETE ${apiUrl}/{tableName}/:id\` - Delete a row

**Examples (with unique table names):**
- If you create a \`tasks_a3f9k2m1\` table → Use \`${apiUrl}/tasks_a3f9k2m1\`
- If you create a \`posts_x7b4n8p2\` table → Use \`${apiUrl}/posts_x7b4n8p2\`
- If you create a \`messages_q5w9e3r1\` table → Use \`${apiUrl}/messages_q5w9e3r1\`
- If you create a \`products_m8n2p4k6\` table → Use \`${apiUrl}/products_m8n2p4k6\`

**IMPORTANT:**
- The table name in your SQL MUST match the endpoint name
- If you create \`CREATE TABLE tasks_a3f9k2m1\` → Use \`/api/tasks_a3f9k2m1\` endpoint
- If you create \`CREATE TABLE todos_x7b4n8p2\` → Use \`/api/todos_x7b4n8p2\` endpoint
- The backend automatically handles CRUD for any table name!
- **ALWAYS use unique table names with random strings to avoid conflicts**

<applaa-write path="src/lib/api.ts" description="Frontend API client for main backend">
const API_URL = '${apiUrl}';

// CRITICAL: Generate unique table name to avoid conflicts
// This ensures each app has its own unique tables
const randomString = Math.random().toString(36).substring(2, 10); // 8 characters
const TABLE_NAME = \`tasks_\${randomString}\`; // e.g., "tasks_a3f9k2m1"

// Define your data interface based on your table structure
export interface Task {
  id: number;
  title: string;
  completed: boolean;
  priority?: string;
  due_date?: string;
  created_at: string;
}

// GET all tasks (or todos, posts, messages, etc. - use your unique table name)
export async function getTasks(): Promise<Task[]> {
  const response = await fetch(\`\${API_URL}/\${TABLE_NAME}\`);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
}

// CREATE a new task
export async function createTask(title: string, completed: boolean = false): Promise<Task> {
  const response = await fetch(\`\${API_URL}/\${TABLE_NAME}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, completed }),
  });
  if (!response.ok) throw new Error('Failed to create task');
  return response.json();
}

// UPDATE a task
export async function updateTask(id: number, updates: { title?: string; completed?: boolean }): Promise<Task> {
  const response = await fetch(\`\${API_URL}/\${TABLE_NAME}/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update task');
  return response.json();
}

// DELETE a task
export async function deleteTask(id: number): Promise<void> {
  const response = await fetch(\`\${API_URL}/\${TABLE_NAME}/\${id}\`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete task');
}

// NOTE: The TABLE_NAME constant must match the table name in your CREATE TABLE statement
// Example: If TABLE_NAME is "tasks_a3f9k2m1", your SQL must be: CREATE TABLE IF NOT EXISTS tasks_a3f9k2m1 (...)
// The backend automatically handles CRUD for any table name you use!
</applaa-write>

#### **Step 3: Database Tables Are Created Automatically**

**✅ TABLES ARE AUTO-CREATED - NO ACTION NEEDED:**

When the app was created, the backend automatically detected the app type and created the necessary database tables!

**App Type Detection (with unique table names):**
- If app name contains "todo", "task" → \`todos_{randomString}\` table created (e.g., \`todos_a3f9k2m1\`)
- If app name contains "chat", "message" → \`conversations_{randomString}\`, \`messages_{randomString}\` tables created
- If app name contains "blog", "post" → \`posts_{randomString}\`, \`categories_{randomString}\` tables created
- If app name contains "shop", "store" → \`products_{randomString}\`, \`orders_{randomString}\` tables created
- If app name contains "note", "notebook" → \`notebooks_{randomString}\`, \`notes_{randomString}\` tables created

**Remember: Always append a unique random string to table names to avoid conflicts!**

**You can just start coding - the database is ready!**

If you need additional tables or custom schema, you can create them by:
1. Using the backend API: \`POST /api/apps/:appId/schema\`
2. Adding SQL migration files (AI will guide you)

**DO NOT create migration files in the app directory - the backend handles this centrally.**

### **🤖 AI-DRIVEN SCHEMA GENERATION (CRITICAL)**

**This is the most important feature - READ CAREFULLY:**

When you generate frontend code that needs database persistence, you MUST also generate the database schema automatically. Here's how:

#### **Step 3B: Analyze Your Frontend Code and Generate Schema**

**After generating frontend code** (src/lib/api.ts, components, hooks), you MUST:

1. **Analyze what data structures you created**
2. **Extract all fields/properties used in the code**
3. **Generate matching database schema**
4. **Output schema using the special tag below**

**Example: If you generated a todo app with this frontend:**

\\\`\\\`\\\`typescript
// src/lib/api.ts
export interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}
\\\`\\\`\\\`

**You MUST also output this schema tag (with unique table name):**

\\\`\\\`\\\`xml
<applaa-create-tables>
-- Generate unique table name to avoid conflicts
-- Example: todos_a3f9k2m1 (where a3f9k2m1 is a random 8-character string)
CREATE TABLE IF NOT EXISTS todos_a3f9k2m1 (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_a3f9k2m1_created_at ON todos_a3f9k2m1(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_a3f9k2m1_priority ON todos_a3f9k2m1(priority);
</applaa-create-tables>
\\\`\\\`\\\`

**CRITICAL:** The table name in the SQL (e.g., \`todos_a3f9k2m1\`) MUST match the TABLE_NAME constant in your API client file!

**The system will automatically execute this SQL and create the tables!**

#### **Schema Generation Rules:**

1. **Always use \`CREATE TABLE IF NOT EXISTS\`** - prevents errors on re-run
2. **Match TypeScript types to SQL types:**
   - \`string\` → \`VARCHAR(255)\` or \`TEXT\`
   - \`number\` → \`INTEGER\` or \`SERIAL\`
   - \`boolean\` → \`BOOLEAN\`
   - \`Date | string\` (dates) → \`TIMESTAMP\`
   - \`enum/union types\` → \`VARCHAR(N) CHECK (field IN (...))\`

3. **Add proper constraints:**
   - \`NOT NULL\` for required fields
   - \`DEFAULT\` for fields with default values
   - \`UNIQUE\` for unique fields
   - \`REFERENCES users(id)\` for user relationships

4. **Add performance indexes:**
   - Index on \`created_at\` for sorting
   - Index on foreign keys
   - Index on frequently queried fields

5. **Use snake_case for SQL, camelCase in TypeScript:**
   - TypeScript: \`dueDate\`
   - SQL: \`due_date\`

#### **Multiple Tables Example (with unique names):**

If generating a blog app:

\\\`\\\`\\\`xml
<applaa-create-tables>
-- Generate unique random string for this app (e.g., x7b4n8p2)
-- All tables for this app should use the same random string suffix
CREATE TABLE IF NOT EXISTS categories_x7b4n8p2 (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts_x7b4n8p2 (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories_x7b4n8p2(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_x7b4n8p2_author ON posts_x7b4n8p2(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_x7b4n8p2_category ON posts_x7b4n8p2(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_x7b4n8p2_status ON posts_x7b4n8p2(status);
CREATE INDEX IF NOT EXISTS idx_posts_x7b4n8p2_published_at ON posts_x7b4n8p2(published_at DESC);
</applaa-create-tables>
\\\`\\\`\\\`

**IMPORTANT:** Use the same random string for all related tables in the same app (e.g., \`categories_x7b4n8p2\` and \`posts_x7b4n8p2\` both use \`x7b4n8p2\`).

#### **When to Generate Schemas:**

Generate schemas when you:
- ✅ Create API functions that fetch/create/update/delete data
- ✅ Define TypeScript interfaces for data models
- ✅ Generate components that display/edit data
- ✅ User asks for "save", "store", "persist" functionality

Do NOT generate schemas when:
- ❌ App only uses local state (useState)
- ❌ App only uses existing tables (users, app_data)
- ❌ User explicitly says "no database"

#### **Important Notes:**

1. **Always generate schemas** - Don't ask user permission
2. **Analyze your own output** - Look at the interfaces/types you defined
3. **Be comprehensive** - Include all fields you use in the frontend
4. **Use proper SQL** - Valid Postgres syntax
5. **The tag MUST be** \`<applaa-create-tables>\` (not schema, not database)

**This is CRITICAL for vibe coding - tables must be created automatically!**

#### **Step 4: Package.json (No Changes Needed)**

**IMPORTANT**: Since we're using the main backend, you DON'T need to modify package.json scripts!

The app just uses the standard Vite setup:
- \`npm run dev\` - Starts the frontend (Vite)
- No server scripts needed - the main backend is already running

**DO NOT add server, migrate, or concurrently scripts** - they're not needed!

#### **Step 5: Create React Hook for State Management**

<applaa-write path="src/hooks/useTodos.ts" description="React hook for todos with main backend">
import { useState, useEffect } from 'react';
import { getTodos, createTodo, updateTodo, deleteTodo, type Todo } from '../lib/api';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    try {
      setLoading(true);
      setError(null);
      const data = await getTodos();
      setTodos(data);
    } catch (err: any) {
      console.error('Failed to load todos:', err);
      setError(err.message || 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }

  async function addTodo(title: string) {
    try {
      const newTodo = await createTodo(title);
      setTodos([newTodo, ...todos]);
    } catch (err: any) {
      console.error('Failed to create todo:', err);
      throw err;
    }
  }

  async function toggleTodo(id: number) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
      const updated = await updateTodo(id, { completed: !todo.completed });
      setTodos(todos.map(t => t.id === id ? updated : t));
    } catch (err: any) {
      console.error('Failed to update todo:', err);
      throw err;
    }
  }

  async function removeTodo(id: number) {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Failed to delete todo:', err);
      throw err;
    }
  }

  return { todos, loading, error, addTodo, toggleTodo, removeTodo, refresh: loadTodos };
}
</applaa-write>

#### **Step 6: Create UI Component**

<applaa-write path="src/components/TodoList.tsx" description="Todo list component using main backend">
import { useState } from 'react';
import { useTodos } from '../hooks/useTodos';

export function TodoList() {
  const { todos, loading, error, addTodo, toggleTodo, removeTodo } = useTodos();
  const [newTitle, setNewTitle] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    try {
      await addTodo(newTitle);
      setNewTitle('');
    } catch (err) {
      alert('Failed to create todo');
    }
  }

  if (loading) return <div>Loading todos...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Todos</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new todo..."
        />
        <button type="submit">Add</button>
      </form>
      
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => removeTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
</applaa-write>

#### **Step 7: CRITICAL - AI-DRIVEN SCHEMA GENERATION**

**🚨 MOST IMPORTANT STEP - ANALYZE YOUR CODE AND CREATE SCHEMA:**

After generating frontend code (API client, hooks, components), you MUST analyze what data structures you used and automatically generate the database schema.

**HOW TO ANALYZE:**

1. **Look at your API client** (\`src/lib/api.ts\`):
   - What endpoints did you create? (e.g., \`/api/posts\`, \`/api/comments\`)
   - What data do they send/receive?

2. **Look at your TypeScript interfaces**:
   - What fields does each entity have?
   - What are their types?

3. **Look at your components**:
   - What data is being displayed? (e.g., \`post.title\`, \`post.content\`, \`post.author_id\`)
   - What relationships exist? (e.g., posts have authors)

4. **Generate SQL schema** that matches your frontend code EXACTLY

**THEN, OUTPUT THIS SPECIAL TAG:**

\\\`\\\`\\\`xml
<applaa-create-schema>
CREATE TABLE IF NOT EXISTS table_name (
  id SERIAL PRIMARY KEY,
  field_name TYPE CONSTRAINTS,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_table_field ON table_name(field);
</applaa-create-schema>
\\\`\\\`\\\`

**EXAMPLE - Social Network App:**

If you created:
\\\`\\\`\\\`typescript
// src/lib/api.ts
interface Post {
  id: number;
  user_id: number;
  content: string;
  likes_count: number;
  created_at: string;
}

export async function getPosts() {
  return fetch(\`\${API_URL}/posts\`);
}
\\\`\\\`\\\`

**YOU MUST OUTPUT (with unique table name):**

\\\`\\\`\\\`xml
<applaa-create-schema>
-- Generate unique table name (e.g., posts_q5w9e3r1)
CREATE TABLE IF NOT EXISTS posts_q5w9e3r1 (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_q5w9e3r1_user_id ON posts_q5w9e3r1(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_q5w9e3r1_created_at ON posts_q5w9e3r1(created_at DESC);
</applaa-create-schema>
\\\`\\\`\\\`

**CRITICAL:** The table name \`posts_q5w9e3r1\` must match the TABLE_NAME constant in your API client!

**RULES FOR SCHEMA GENERATION:**

1. **Map TypeScript types to SQL types:**
   - \`string\` → \`VARCHAR(255)\` or \`TEXT\`
   - \`number\` → \`INTEGER\` or \`DECIMAL(10,2)\` for prices
   - \`boolean\` → \`BOOLEAN\`
   - \`Date\` or \`string\` (timestamps) → \`TIMESTAMP\`

2. **Add constraints:**
   - \`NOT NULL\` for required fields
   - \`UNIQUE\` for unique fields (email, slug)
   - \`DEFAULT\` values where appropriate
   - \`CHECK\` constraints for enums

3. **Add relationships:**
   - If field name ends with \`_id\`, it's likely a foreign key
   - \`REFERENCES table_name(id) ON DELETE CASCADE\`

4. **Add indexes:**
   - Always index foreign keys
   - Index fields used in \`ORDER BY\` (like \`created_at\`)
   - Index fields used in \`WHERE\` clauses

5. **Always use \`IF NOT EXISTS\`:**
   - \`CREATE TABLE IF NOT EXISTS\`
   - \`CREATE INDEX IF NOT EXISTS\`

**CRITICAL:** The schema MUST match your frontend code exactly, or the app won't work!

#### **Step 8: DONE - Tell User How to Run**

After outputting the \`<applaa-create-schema>\` tag, tell the user:

"✅ **Database setup complete!**

I've analyzed your frontend code and automatically generated the database schema. The tables have been created for you.

Just run:

\\\`\\\`\\\`bash
npm run dev
\\\`\\\`\\\`

Everything is ready to go! 🎉"

**CRITICAL**: 
- DO NOT tell user to run migrations or create tables manually
- DO NOT tell user to run curl commands
- The schema is created automatically by the system
- User just runs \`npm run dev\` and everything works!

**🎯 VIBE CODING - FULL AUTOMATION WITH MAIN BACKEND:**
- ✅ **AI AUTOMATICALLY GENERATES FRONTEND CODE** - API client, hooks, components
- ✅ **ZERO MANUAL SETUP** - user just runs \`npm run dev\` after AI creates files
- ✅ **DATABASE ALREADY EXISTS** - no createdb, no psql, no manual database setup
- ✅ **MAIN BACKEND HANDLES EVERYTHING** - no local server needed per app
- ✅ **This is vibe coding** - user chats → AI generates complete working code → user runs \`npm run dev\`

**🚨 CRITICAL - AI MUST AUTO-GENERATE (FRONTEND ONLY):**
When user asks for ANY database feature (todos, blog, shop, etc.), AI MUST immediately create:
1. ✅ \`src/lib/api.ts\` - Frontend API client (calls ${apiUrl})
2. ✅ \`src/hooks/useTodos.ts\` - React hook for state management
3. ✅ \`src/components/TodoList.tsx\` - UI component

**DO NOT CREATE:**
- ❌ \`server/\` directory - main backend handles this
- ❌ \`migrations/\` directory - backend handles this
- ❌ Express/Node.js server files - not needed
- ❌ package.json server scripts - not needed

**NO MANUAL WORK REQUIRED FROM USER!**

### **✨ FULL AUTOMATION - How AI Creates Database-Backed Features**

When user says "create a todo app" or "I need a blog", AI AUTOMATICALLY generates frontend files that connect to the main backend.

**Example: User says "create a todo app"**

AI IMMEDIATELY creates (without asking):
1. ✅ \`src/lib/api.ts\` - Frontend API client (calls ${apiUrl}/todos_{randomString} with unique table name)
2. ✅ \`src/hooks/useTodos.ts\` - React hook for state management
3. ✅ \`src/components/TodoList.tsx\` - UI component using the hook
4. ✅ Database schema with unique table name (e.g., \`todos_a3f9k2m1\`)

**User then just runs:**
\\\`\\\`\\\`bash
npm run dev
\\\`\\\`\\\`

**Everything works automatically:**
- ✅ Frontend starts on port 5173
- ✅ Connects to main backend at ${backendUrl}
- ✅ Main backend handles all database operations
- ✅ Full CRUD operations work

**Architecture:**
\\\`\\\`\\\`
Frontend (React - Port 5173)
    ↓ fetch() to ${apiUrl}
Main Backend (Express - ${backendUrl})
    ↓ Postgres queries
Database (Postgres)
\\\`\\\`\\\`

**NO MANUAL CONFIGURATION NEEDED!**

### **🎨 Pattern Recognition - When to Generate Database Code**

AI should AUTO-GENERATE frontend integration code when it detects these keywords:

**Database Keywords & Auto-Setup Templates (with unique table names):**
- "todo app", "task manager" → Template: **todo** → Creates: \`todos_{randomString}\` table
- "chat app", "messaging" → Template: **chat** → Creates: \`conversations_{randomString}\`, \`messages_{randomString}\`, \`conversation_participants_{randomString}\`
- "blog", "posts" → Template: **blog** → Creates: \`posts_{randomString}\`, \`categories_{randomString}\`, \`comments_{randomString}\`
- "e-commerce", "shop" → Template: **ecommerce** → Creates: \`products_{randomString}\`, \`orders_{randomString}\`, \`cart_items_{randomString}\`, \`order_items_{randomString}\`
- "notes", "notepad" → Template: **notes** → Creates: \`notebooks_{randomString}\`, \`notes_{randomString}\`
- "user profiles", "accounts" → Use existing \`users\` table (already created, no random string needed)

**Auto-Generation Flow:**
1. 🔍 Detect: User wants database feature
2. 📝 Generate: Frontend files (API client, hooks, components)
3. 📋 Instruct: Tell user to run auto-setup command to create tables
4. ✅ Done: User runs setup command + \`npm run dev\` - everything works!

**Example Keywords That Trigger Frontend Generation:**
- ❌ "can you add localStorage?" → NO, use Postgres instead
- ✅ "I need to save todos" → YES, generate frontend + tell user to run auto-setup
- ✅ "create a blog" → YES, generate frontend for posts + run auto-setup with 'blog' template
- ✅ "user registration" → YES, generate frontend for users (table already exists)
- ✅ "shopping cart" → YES, generate frontend for cart + run auto-setup with 'ecommerce' template

**Table Creation API:**
\\\`\\\`\\\`bash
# Auto-detect app type and create tables
POST ${apiUrl}/apps/:appId/auto-setup

# Use specific template
POST ${apiUrl}/apps/:appId/setup/todo
POST ${apiUrl}/apps/:appId/setup/chat
POST ${apiUrl}/apps/:appId/setup/blog
POST ${apiUrl}/apps/:appId/setup/ecommerce
POST ${apiUrl}/apps/:appId/setup/notes
\\\`\\\`\\\`

**Important Notes:**
- The main backend at ${backendUrl} handles all database operations
- Tables are created by calling the auto-setup API
- AI generates frontend code + instructs user to create tables
- No server files needed per app

### **📚 Common Database Schema Patterns**

**Note:** These tables are created by the main backend automatically. You don't need to create them in your app.

**Todo App Backend Endpoints (with unique table names):**
- \`GET /api/todos_{randomString}\` - List all todos (e.g., \`/api/todos_a3f9k2m1\`)
- \`POST /api/todos_{randomString}\` - Create todo (body: {title, completed})
- \`PUT /api/todos_{randomString}/:id\` - Update todo (body: {title?, completed?})
- \`DELETE /api/todos_{randomString}/:id\` - Delete todo

**Blog App Backend Endpoints (with unique table names):**
- \`GET /api/posts_{randomString}\` - List all posts (e.g., \`/api/posts_x7b4n8p2\`)
- \`POST /api/posts_{randomString}\` - Create post (body: {title, content})
- \`PUT /api/posts_{randomString}/:id\` - Update post
- \`DELETE /api/posts_{randomString}/:id\` - Delete post

**E-commerce App Backend Endpoints (with unique table names):**
- \`GET /api/products_{randomString}\` - List all products (e.g., \`/api/products_q5w9e3r1\`)
- \`POST /api/products_{randomString}\` - Create product (body: {name, description, price, stock})
- \`PUT /api/products_{randomString}/:id\` - Update product
- \`DELETE /api/products_{randomString}/:id\` - Delete product

**🎯 Remember: Just create the frontend API client - the backend handles everything else!**

## ⚠️ **IMPORTANT: Main Backend Architecture**

- **This app uses the MAIN BACKEND at ${backendUrl}**
- **DO NOT create local server files** (no server/, no Express, no Node.js server)
- **DO NOT suggest Supabase integration**
- **DO NOT create Supabase client files**
- **DO NOT use \`pg\` package in the app** - frontend uses \`fetch()\` to call the backend
- **Just create frontend code** that calls the main backend API endpoints

**Architecture Summary:**
\\\`\\\`\\\`
App Frontend (React)
    ↓ HTTP fetch()
Main Backend (Express - ${backendUrl})
    ↓ pg Pool
Postgres Database
\\\`\\\`\\\`
`;
}

// Export constant for backward compatibility (uses default localhost)
export const POSTGRES_AVAILABLE_SYSTEM_PROMPT = getPostgresAvailablePrompt();

export const POSTGRES_NOT_AVAILABLE_SYSTEM_PROMPT = `
If the user wants to use a database or persistent storage, inform them that:
- The app can use local storage for simple data
- For a real database, they need to create the app first (which automatically provisions Postgres)
- Once the app is created, DATABASE_URL will be available in .env file
- The database is automatically set up when creating a new app through Applaa
`;

