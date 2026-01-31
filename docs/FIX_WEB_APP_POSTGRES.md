# URGENT FIX: Web App Cannot Use pg Package

## The Problem

**ERROR:** `global is not defined`

**CAUSE:** The AI is trying to use the `pg` (Postgres) package directly in a **web app** (React/Vite), which runs in the **browser**. The `pg` package is Node.js-only and cannot run in browsers.

## The Solution

Web apps need to access Postgres through **API routes**, not directly.

### Option 1: Simple Solution - Use JSON Storage (Recommended for Quick Fix)

Since the app already has `app_data` table with JSONB storage, use that instead:

```typescript
// src/lib/storage.ts
const API_URL = '/api/storage'; // You'll need to create this API endpoint

export async function saveData(key: string, value: any) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  });
  return response.json();
}

export async function getData(key: string) {
  const response = await fetch(`${API_URL}?key=${key}`);
  return response.json();
}
```

### Option 2: Create Backend API Routes

For proper Postgres access, you need server-side API routes:

1. **Backend creates tables** (one-time setup)
2. **Backend exposes API endpoints** (e.g., `/api/todos`)
3. **Frontend calls APIs** using `fetch()`

## Immediate Fix for Current App

1. **Stop trying to use `pg` in the browser**
2. **Remove polyfills** (they won't work)
3. **Use one of these approaches:**

   **A. LocalStorage (Simplest - No backend needed):**
   ```typescript
   const todos = JSON.parse(localStorage.getItem('todos') || '[]');
   ```

   **B. API Routes (Proper - Needs backend setup):**
   ```typescript
   const response = await fetch('/api/todos');
   const todos = await response.json();
   ```

## Why This Happened

The Postgres prompt told the AI to "use `pg` package" without checking if it's a web app. Web apps cannot use Node.js packages in the browser.

## The Fix I'm Making

I'm updating the Postgres prompt to:
1. Detect if it's a web app (React/Vite)
2. If web app: Tell AI to create API routes
3. If Node.js app: Then use `pg` directly

## What You Should Do Now

### Quick Fix (5 minutes):
1. **In your current app**: Ask AI to "use LocalStorage instead of Postgres for now"
2. **Or**: Ask AI to "create a simple API route for data storage"

### Proper Fix (after I restart Electron):
1. Wait for Electron to restart (building now...)
2. Create a NEW app
3. Ask AI to create database features
4. It will now create proper API routes instead of using `pg` directly

## Commands to Check

```bash
# Check if Electron is running
ps aux | grep -i electron | grep -v grep

# When ready, create new app and test
```

The error will be fixed in new apps after the restart completes!

