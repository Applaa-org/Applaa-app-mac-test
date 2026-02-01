---
name: database-schema
description: Modify Applaa's SQLite database schema using Drizzle ORM. Use when adding new tables, columns, or relationships, creating migrations, or fixing database-related errors like missing columns or tables.
---

# Database Schema

Drizzle ORM schema patterns for Applaa's SQLite database.

## Architecture

- **Schema**: `src/db/schema.ts` - Drizzle table definitions
- **Migrations**: `drizzle/` folder - SQL migration files
- **Index**: `src/db/index.ts` - Database initialization and fallback schema
- **Config**: `drizzle.config.ts` - Drizzle Kit configuration

## Adding a New Table

### Step 1: Define Schema

Add to `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/better-sqlite3";
import { apps } from "./schema";  // For foreign keys

export const features = sqliteTable("features", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

### Step 2: Generate Migration

```bash
npx drizzle-kit generate
```

Creates file like `drizzle/0016_add_features_table.sql`.

### Step 3: Add Fallback Schema

Add to `src/db/index.ts` in `ensureCoreTables()`:

```typescript
// Check if features table exists
const featuresTableExists = sqlite.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='features'
`).get();

if (!featuresTableExists) {
  logger.log("Creating features table...");
  sqlite.prepare(`
    CREATE TABLE features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (app_id) REFERENCES apps (id) ON DELETE CASCADE
    )
  `).run();
  logger.log("Successfully created features table");
}
```

## Adding a Column to Existing Table

### Step 1: Update Schema

```typescript
// src/db/schema.ts
export const apps = sqliteTable("apps", {
  // ...existing columns
  newColumn: text("new_column").default("default_value"),
});
```

### Step 2: Generate Migration

```bash
npx drizzle-kit generate
```

### Step 3: Add Fallback Column Check

Add to `src/db/index.ts` in `ensureCriticalColumns()`:

```typescript
// Check for new_column in apps table
const hasNewColumn = sqlite.prepare(`
  SELECT COUNT(*) as count FROM pragma_table_info('apps') WHERE name='new_column'
`).get() as { count: number };

if (hasNewColumn.count === 0) {
  logger.log("Adding new_column to apps table...");
  sqlite.prepare(`ALTER TABLE apps ADD COLUMN new_column TEXT DEFAULT 'default_value'`).run();
  logger.log("Successfully added new_column to apps table");
}
```

## Common Column Types

```typescript
// Integer with auto-increment primary key
id: integer("id").primaryKey({ autoIncrement: true }),

// Foreign key with cascade delete
appId: integer("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),

// Text with default
status: text("status").default("active"),

// Nullable text
description: text("description"),

// Boolean as integer
isActive: integer("is_active", { mode: "boolean" }).default(true),

// Timestamp as integer (Unix epoch)
createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),

// JSON stored as text
metadata: text("metadata", { mode: "json" }),

// Blob for binary data (e.g., embeddings)
embedding: blob("embedding"),
```

## Query Examples

```typescript
import { db } from "@/db";
import { features } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Select all
const allFeatures = await db.select().from(features);

// Select with where
const appFeatures = await db.select()
  .from(features)
  .where(eq(features.appId, appId));

// Insert
const [newFeature] = await db.insert(features)
  .values({ appId, name: "New Feature" })
  .returning();

// Update
await db.update(features)
  .set({ status: "inactive", updatedAt: new Date() })
  .where(eq(features.id, id));

// Delete
await db.delete(features)
  .where(eq(features.id, id));

// Join
const withApp = await db.select()
  .from(features)
  .innerJoin(apps, eq(features.appId, apps.id))
  .where(eq(features.id, id));
```

## Migration Best Practices

1. **Always generate migration** - Don't manually write SQL unless necessary
2. **Add fallback schema** - For critical tables/columns that must exist
3. **Test migration** - Run `npx drizzle-kit push` to test locally
4. **Handle NULL** - Use `.default()` for new columns on existing tables

## Debugging

```bash
# View current schema
npx drizzle-kit studio

# Push changes without migration (dev only)
npx drizzle-kit push

# Generate migration
npx drizzle-kit generate
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "no such table" | Table not created | Add to `ensureCoreTables()` |
| "no such column" | Column missing | Add to `ensureCriticalColumns()` |
| "FOREIGN KEY constraint failed" | Deleting parent with children | Use `onDelete: "cascade"` |
| "UNIQUE constraint failed" | Duplicate value | Check uniqueness before insert |
