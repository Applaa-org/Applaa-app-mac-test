# Database Creation Flow - Complete Automation Guide

## 🎯 Current Status: **100% AUTOMATED** ✅

The database creation process is **fully automated**. Here's how it works:

## 📋 Complete Flow

### 1. **User Creates App** (Electron App)
- User clicks "Create App" in the Electron app
- App name and type are provided (e.g., "My Chat App", "Todo List")

### 2. **Backend API Call** (`POST /api/apps`)
- Electron app calls: `POST ${BACKEND_API_URL}/apps`
- Request body: `{ name: "My Chat App", appType: "web" }`

### 3. **Database Provisioning** (Automatic)
- Backend creates app record in `core.apps` table
- Backend provisions database:
  - **Schema Mode** (default): Creates a new schema `app_{id}_{name}`
  - **Dedicated Mode** (optional): Creates a completely separate database
- Backend runs base migrations:
  - Creates `users` table
  - Creates `app_data` table
  - Creates `schema_migrations` table

### 4. **Auto-Table Creation** (Automatic)
- Backend auto-detects app type from name using keywords:
  - **Todo**: "todo", "task", "checklist" → Creates `todos` table
  - **Chat**: "chat", "message", "conversation" → Creates `conversations`, `messages`, `conversation_participants` tables
  - **Blog**: "blog", "post", "article" → Creates `posts`, `categories`, `comments` tables
  - **E-commerce**: "shop", "store", "product" → Creates `products`, `cart_items`, `orders`, `order_items` tables
  - **Notes**: "note", "notebook" → Creates `notebooks`, `notes` tables
- If no template matches, app gets base tables only (`users`, `app_data`)

### 5. **AI-Driven Schema Generation** (Optional, Automatic)
- When AI generates frontend code, it can include `<applaa-create-tables>` tags
- Schema parser automatically detects these tags
- SQL is executed automatically on the backend
- Tables are created immediately without manual intervention

### 6. **Auto-Deployment** (Automatic)
- After app creation, backend code is automatically deployed to VPS
- No manual deployment needed

### 7. **Generic API Endpoints** (Automatic)
- All tables automatically get CRUD endpoints:
  - `GET /api/{tableName}` - List all rows (with filtering & ordering)
  - `GET /api/{tableName}/:id` - Get single row
  - `POST /api/{tableName}` - Create row (auto-creates table if missing)
  - `PUT /api/{tableName}/:id` - Update row
  - `DELETE /api/{tableName}/:id` - Delete row

## 🔧 New Features: Supabase-Style Query Support

### Filtering Support
The generic endpoints now support Supabase-style query parameters:

```
GET /api/messages?conversation_id=eq.1&status=neq.completed
```

**Supported Operators:**
- `eq` - Equals: `column=eq.value`
- `neq` - Not equals: `column=neq.value`
- `gt` - Greater than: `column=gt.value`
- `gte` - Greater than or equal: `column=gte.value`
- `lt` - Less than: `column=lt.value`
- `lte` - Less than or equal: `column=lte.value`
- `like` - Pattern match (case-sensitive): `column=like.value`
- `ilike` - Pattern match (case-insensitive): `column=ilike.value`
- `in` - In array: `column=in.value1,value2,value3`
- `is` - Is null/not null: `column=is.null` or `column=is.value`
- `isnot` - Is not null: `column=isnot.null`

**Multiple Filters:**
```
GET /api/messages?conversation_id=eq.1&status=eq.active&created_at=gte.2024-01-01
```

### Ordering Support
```
GET /api/messages?order=created_at.asc
GET /api/messages?order=created_at.desc
```

### Combined Example
```
GET /api/messages?conversation_id=eq.1&order=created_at.asc
```

## 🚀 Auto-Table Creation

If a table doesn't exist when you try to POST to it, the system automatically:
1. Detects the table is missing
2. Creates the table with columns inferred from the POST data
3. Adds standard columns: `id`, `created_at`, `updated_at`
4. Inserts the data

**Example:**
```bash
POST /api/messages
{
  "conversation_id": 1,
  "sender_id": 2,
  "content": "Hello!"
}
```

If `messages` table doesn't exist, it's automatically created with:
- `id SERIAL PRIMARY KEY`
- `conversation_id INTEGER`
- `sender_id INTEGER`
- `content TEXT`
- `created_at TIMESTAMP DEFAULT NOW()`
- `updated_at TIMESTAMP DEFAULT NOW()`

## ✅ What's Automated

1. ✅ **Database Schema Creation** - Automatic
2. ✅ **Base Tables** - Automatic (users, app_data)
3. ✅ **Template Tables** - Automatic (based on app name)
4. ✅ **AI-Generated Tables** - Automatic (via schema tags)
5. ✅ **Generic API Endpoints** - Automatic (for all tables)
6. ✅ **Query Filtering** - Automatic (Supabase-style)
7. ✅ **Query Ordering** - Automatic
8. ✅ **Table Auto-Creation** - Automatic (on first POST)
9. ✅ **Backend Deployment** - Automatic (to VPS)

## 📝 Manual Steps Required

**NONE!** Everything is automated. Just create an app and start using it.

## 🔍 Verification

To verify your app's database was created:

```bash
# Check app database info
GET ${BACKEND_API_URL}/apps/{appId}/database

# List all tables in the schema (via psql)
psql -h your-vps-ip -U applaa_user -d applaa
\dn  # List schemas
\c applaa
SET search_path TO app_1_my_chat_app, public;
\dt  # List tables
```

## 🎯 Summary

**The database creation process is 100% automated.** When you create an app:
1. Database/schema is provisioned automatically
2. Base tables are created automatically
3. Template tables are created automatically (if app type is detected)
4. AI can create custom tables automatically (via schema tags)
5. Generic API endpoints work automatically for all tables
6. Tables are auto-created on first use if missing
7. Backend is automatically deployed to VPS

**No manual database setup required!** 🎉

