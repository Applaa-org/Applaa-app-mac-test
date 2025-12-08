# Test Database Creation Flow

## Current Status
✅ Backend server is running on port 3000
✅ Enhanced logging is now active
✅ Electron app is restarting with debug logs

## How to Test Database Provisioning

### Step 1: Verify Backend is Running
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","database":"connected"}
```

### Step 2: Create a New App in Applaa UI

1. **Open Applaa** (should be running now)
2. **Click "Create New App"**
3. **Enter app name**: `test_db_provisioning`
4. **Select type**: Web App
5. **Click Create**

### Step 3: Monitor the Logs

**Terminal 1 - Backend logs:**
```bash
cd /Users/macbook/Applaa-updated/backend
# Watch the backend console for incoming requests
```

**Terminal 2 - Electron logs:**
```bash
# Watch Electron console logs
tail -f ~/.electron-logs/applaa/main.log | grep -i "database\|provision\|backend"
```

**OR check the test log:**
```bash
tail -f /tmp/applaa-db-test.log | grep -A5 -B5 "Provisioning\|BackendAPI"
```

### Step 4: Check for Success/Failure

#### Success Indicators:
You should see logs like:
```
[BackendAPI] Requesting: POST http://localhost:3000/api/apps
[BackendAPI] Response status: 200
[BackendAPI] Success: { id: 6, name: "test_db_provisioning", ... }
✅ Database provisioned: app_6_test_db_provisioning
🔗 Connection string: postgresql://applaa_user:applaa_dev_password@localhost...
💾 Database info stored in local app record
✅ Created .env.local file with DATABASE_URL
```

#### Failure Indicators:
If you see:
```
❌ Failed to provision database for app X: <error message>
```

Common errors and solutions:

**1. "fetch is not defined"**
- Node.js version issue
- Solution: Upgrade Node.js or use node-fetch

**2. "ECONNREFUSED"**
- Backend not running
- Solution: `cd backend && npm run dev`

**3. "Network request failed"**
- CORS issue
- Check backend/.env has `CORS_ORIGIN=*`

### Step 5: Verify Database Was Created

```bash
# Check if schema exists
psql -U applaa_user -d applaa -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'app_%' ORDER BY schema_name;"

# Check if .env.local was created
cat apps/web/test_db_provisioning/.env.local

# Check tables in the new schema
psql -U applaa_user -d applaa -c "\dt app_*_test_db_provisioning.*"
```

**Expected:**
- Schema: `app_6_test_db_provisioning` (or similar)
- Tables: `users`, `app_data`, `schema_migrations`
- .env.local file with `DATABASE_URL` and `POSTGRES_SCHEMA`

### Step 6: Test AI Can Use Database

1. **Open the test app** in Applaa
2. **Start a chat**
3. **Ask AI**: "Create a todos table with id, title, and completed columns"
4. **AI should**:
   - Detect DATABASE_URL from .env.local
   - Use `pg` package (not Supabase)
   - Create the table using SQL

**Verify table was created:**
```bash
psql -U applaa_user -d applaa -c "\dt app_*_test_db_provisioning.*"
# Should now show: users, app_data, schema_migrations, todos
```

## Debugging Tips

### If Database Not Provisioning:

1. **Check backend logs for requests:**
   ```bash
   cd /Users/macbook/Applaa-updated/backend
   # You should see: POST /api/apps requests
   ```

2. **Check Electron logs for errors:**
   ```bash
   tail -100 ~/.electron-logs/applaa/main.log | grep -i "failed to provision"
   ```

3. **Test backend directly:**
   ```bash
   curl -X POST http://localhost:3000/api/apps \
     -H "Content-Type: application/json" \
     -d '{"name":"manual_test","appType":"web"}'
   ```

4. **Check if fetch is available:**
   ```bash
   node -e "console.log(typeof fetch)"
   # Should print: function
   ```

### If AI Not Detecting Database:

1. **Check .env.local exists:**
   ```bash
   ls -la apps/web/your_app/.env.local
   ```

2. **Check DATABASE_URL is in file:**
   ```bash
   cat apps/web/your_app/.env.local | grep DATABASE_URL
   ```

3. **Check AI logs:**
   Look for:
   ```
   🔍 Checking for Postgres in app: your_app
   ✅ Postgres detected in .env.local for app: your_app
   ✅ Using Postgres database for app: your_app
   ```

## Summary

With the enhanced logging, you can now:
1. See exactly when database provisioning is triggered
2. See the API request/response
3. See any errors that occur
4. Verify the .env.local file creation
5. Track AI's detection of the database

**Create a new app now and watch the logs!** 🚀

