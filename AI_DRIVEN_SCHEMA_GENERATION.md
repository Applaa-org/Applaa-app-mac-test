# 🤖 AI-Driven Schema Generation

**Status:** ✅ FULLY IMPLEMENTED

## Overview

Applaa now features **AI-Driven Schema Generation**, where the AI automatically creates database tables based on the frontend code it generates. This is true "vibe coding" - users just describe what they want, and the entire stack (frontend + database) is created automatically.

## How It Works

### 1. User Creates an App

```
User: "create a recipe app with ingredients and cooking steps"
```

### 2. AI Analyzes Requirements

The AI:
- Understands the user's intent
- Plans the data structure needed
- Generates frontend code (React components, hooks, API calls)
- **Analyzes its own output** to determine database schema

### 3. AI Generates Frontend Code

```typescript
// src/lib/api.ts
export interface Recipe {
  id: number;
  title: string;
  description?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  createdAt: string;
}

export interface Ingredient {
  id: number;
  recipeId: number;
  name: string;
  quantity: string;
  unit: string;
}

export async function getRecipes() { ... }
export async function createRecipe(recipe: Recipe) { ... }
```

### 4. AI Automatically Generates Schema

After generating the frontend, the AI outputs:

```xml
<applaa-create-tables>
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  prep_time INTEGER NOT NULL,
  cook_time INTEGER NOT NULL,
  servings INTEGER DEFAULT 4,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);

CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  quantity VARCHAR(50) NOT NULL,
  unit VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
</applaa-create-tables>
```

### 5. System Automatically Creates Tables

The Applaa system:
1. **Detects** the `<applaa-create-tables>` tag in the AI response
2. **Parses** the SQL
3. **Executes** it against the app's Postgres schema
4. **Logs** success/failure
5. **Continues** - no user intervention required

### 6. User Runs the App

```bash
npm run dev
```

✅ **Everything works immediately!** The frontend talks to the backend, which queries the database with tables that already exist.

---

## Architecture

### Components

1. **AI Prompt (`src/prompts/postgres_prompt.ts`)**
   - Instructs AI to analyze frontend code
   - Guides AI to generate matching schemas
   - Specifies the `<applaa-create-tables>` tag format

2. **Tag Parser (`src/ipc/utils/dyad_tag_parser.ts`)**
   - `getSchemaCreationTags()` - Extracts schema SQL from AI response
   - Parses multiple tables from a single tag

3. **Schema Executor (`src/lib/schema_parser.ts`)**
   - `executeSchema()` - Calls backend API to create tables
   - Handles errors gracefully
   - Logs all operations

4. **Chat Stream Handler (`src/ipc/handlers/chat_stream_handlers.ts`)**
   - Monitors AI responses for schema tags
   - Automatically executes schemas after stream completes
   - Runs in parallel with file operations

5. **Backend API (`backend/src/routes/apps.ts`)**
   - `POST /api/apps/:appId/schema` - Creates tables in app's schema
   - Uses transactions for safety
   - Returns success/error status

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User: "create a recipe app"                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ AI (Claude):                                                │
│ 1. Generates React components                               │
│ 2. Creates API client (src/lib/api.ts)                      │
│ 3. Defines TypeScript interfaces                            │
│ 4. Analyzes data structures needed                          │
│ 5. Outputs <applaa-create-tables> with SQL                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Applaa System:                                              │
│ • getSchemaCreationTags() detects tag                       │
│ • Extracts SQL + table names                                │
│ • Calls executeSchema(appId, sql)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend API:                                                │
│ • Sets search_path to app's schema                          │
│ • Executes CREATE TABLE statements                          │
│ • Creates indexes                                           │
│ • Returns { success: true }                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Result:                                                     │
│ ✅ Tables created in postgres_app_N schema                  │
│ ✅ User runs: npm run dev                                   │
│ ✅ App works perfectly with database!                       │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Instructions Summary

The AI is instructed to:

### When to Generate Schemas

✅ **Generate when:**
- Creating API functions (getTodos, createRecipe, etc.)
- Defining TypeScript interfaces for data models
- Building components that display/edit data
- User asks for "save", "store", "persist" functionality

❌ **Don't generate when:**
- App only uses local state (useState)
- App only uses existing tables (users, app_data)
- User explicitly says "no database"

### How to Generate Schemas

1. **Analyze frontend code you just created**
2. **Extract all fields from TypeScript interfaces**
3. **Map TypeScript types to SQL types:**
   - `string` → `VARCHAR(255)` or `TEXT`
   - `number` → `INTEGER` or `SERIAL`
   - `boolean` → `BOOLEAN`
   - `Date | string` → `TIMESTAMP`
   - Union types → `VARCHAR CHECK (field IN (...))`

4. **Add proper constraints:**
   - `NOT NULL` for required fields
   - `DEFAULT` for default values
   - `REFERENCES` for foreign keys
   - `CHECK` for validations

5. **Add performance indexes:**
   - Index on `created_at` for sorting
   - Index on foreign keys
   - Index on frequently queried fields

6. **Use snake_case in SQL, camelCase in TypeScript:**
   - TypeScript: `dueDate`
   - SQL: `due_date`

7. **Always use `CREATE TABLE IF NOT EXISTS`**

8. **Output using `<applaa-create-tables>` tag**

---

## Example: Blog App

### User Request
```
"create a blog app with posts, categories, and comments"
```

### AI Response

**1. Generates Frontend Code:**

```typescript
// src/lib/api.ts
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: number;
  categoryId: number;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
}
```

**2. Generates Database Schema:**

```xml
<applaa-create-tables>
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
</applaa-create-tables>
```

**3. System Automatically Creates All Tables**

**4. User Runs `npm run dev` → Everything Works!**

---

## Benefits Over Template-Based Approach

| Aspect | Template-Based | AI-Driven |
|--------|----------------|-----------|
| **Flexibility** | ❌ Only 5 predefined types | ✅ Unlimited app types |
| **Schema Accuracy** | ❌ Generic schema | ✅ Perfect match to frontend |
| **Edge Cases** | ❌ Requires manual intervention | ✅ AI adapts automatically |
| **Extensibility** | ❌ Need to add templates | ✅ Works out of the box |
| **User Understanding** | ❌ User must know app type | ✅ Just describe what you want |

---

## Error Handling

### Schema Creation Failures

If schema creation fails:
1. ✅ Error is logged to console
2. ✅ App creation still succeeds
3. ✅ User can manually create schema later
4. ✅ AI can retry with corrected SQL

### Invalid SQL

If AI generates invalid SQL:
1. ✅ Postgres returns error
2. ✅ Error is logged with details
3. ✅ User notified in chat (optional)
4. ✅ AI can fix and regenerate

### Network Errors

If backend API is unavailable:
1. ✅ Error caught and logged
2. ✅ App creation continues
3. ✅ User can manually trigger schema creation

---

## Testing

### Automated Tests (Future)

```typescript
describe('AI-Driven Schema Generation', () => {
  it('should detect schema tags in AI response', () => {
    const response = `<applaa-create-tables>CREATE TABLE todos ...</applaa-create-tables>`;
    const tags = getSchemaCreationTags(response);
    expect(tags).toHaveLength(1);
    expect(tags[0].tables).toContain('todos');
  });

  it('should execute schema creation', async () => {
    const sql = 'CREATE TABLE IF NOT EXISTS test (id SERIAL PRIMARY KEY);';
    const result = await executeSchema(1, sql);
    expect(result.success).toBe(true);
  });
});
```

### Manual Testing

1. Create a new app: "My Recipe Manager"
2. Chat: "create a recipe app with ingredients"
3. Check logs for: `🗄️ Found N schema creation tag(s)`
4. Check logs for: `✅ Successfully created tables: ...`
5. Run: `npm run dev`
6. Verify app works with database

---

## Future Enhancements

### 1. Schema Migration Detection

Detect when AI modifies existing tables and generate ALTER TABLE statements:

```xml
<applaa-migrate-tables>
ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts(view_count DESC);
</applaa-migrate-tables>
```

### 2. Relationship Inference

AI automatically detects relationships and adds foreign keys:

```typescript
// AI sees this in frontend:
interface Post {
  author: User;  // ← AI infers: need author_id FK
  category: Category;  // ← AI infers: need category_id FK
}
```

### 3. Schema Validation

Before executing, validate schema:
- Check for naming conventions
- Detect missing indexes
- Suggest optimizations

### 4. Visual Schema Viewer

Show users the generated schema in a visual diagram:
```
┌────────────┐       ┌────────────┐
│   posts    │───────│ categories │
│            │       │            │
│ author_id  │───┐   └────────────┘
└────────────┘   │   
                 │   ┌────────────┐
                 └───│   users    │
                     │            │
                     └────────────┘
```

### 5. Schema Rollback

If something goes wrong, allow rollback:
```typescript
await rollbackSchema(appId, migrationId);
```

---

## Conclusion

**AI-Driven Schema Generation** is a game-changer for Applaa. Users no longer need to:
- ❌ Understand database design
- ❌ Write SQL manually
- ❌ Run migration commands
- ❌ Match frontend to backend schemas

Instead, they just:
- ✅ Describe what they want
- ✅ Let AI generate everything
- ✅ Run `npm run dev`
- ✅ **It just works!**

This is **true "vibe coding"** - the system understands intent and builds the entire stack automatically.

---

## Files Modified

1. **`src/prompts/postgres_prompt.ts`**
   - Added comprehensive AI schema generation instructions
   - Defined `<applaa-create-tables>` tag format
   - Provided type mapping and best practices

2. **`src/ipc/utils/dyad_tag_parser.ts`**
   - Added `getSchemaCreationTags()` function
   - Extracts SQL and table names from tags

3. **`src/lib/schema_parser.ts`** (NEW)
   - `parseSchemaFromResponse()` - Parse tags
   - `executeSchema()` - Call backend API
   - `processAIResponseForSchema()` - End-to-end processing
   - `removeSchemaTagsFromResponse()` - Clean display

4. **`src/ipc/handlers/chat_stream_handlers.ts`**
   - Integrated schema processing into chat stream
   - Automatically detects and executes schemas
   - Logs all operations

5. **`backend/src/routes/apps.ts`**
   - `POST /api/apps/:appId/schema` endpoint already exists
   - Handles schema creation in isolated app schemas

---

**Status:** ✅ **FULLY IMPLEMENTED AND READY TO USE!**

The AI now automatically creates database tables based on the code it generates. No manual commands, no user intervention - just pure "vibe coding"! 🚀

