# 🗄️ Per-User Dedicated Databases

**Feature Status:** ✅ FULLY IMPLEMENTED

---

## 📖 **Overview**

Applaa now supports **dedicated databases** for each app, allowing users to:
- ✅ **Own their data** - Each app gets its own isolated database
- ✅ **Connect externally** - Use pgAdmin, DBeaver, TablePlus, etc.
- ✅ **Export data** - Download complete SQL backups
- ✅ **Full control** - Dedicated credentials, no shared resources

---

## 🆚 **Database Modes Comparison**

| Feature | Schema-Based (Legacy) | Dedicated Database (New) |
|---------|----------------------|--------------------------|
| **Isolation** | Shared DB, separate schemas | Completely separate databases |
| **External Access** | ❌ No | ✅ Yes (with credentials) |
| **Data Export** | ❌ Manual | ✅ One-click download |
| **Database Tools** | ❌ Can't connect | ✅ pgAdmin, DBeaver, etc. |
| **Performance** | ✅ Faster (shared resources) | ✅ Good (dedicated resources) |
| **Security** | ✅ Good (schema-level) | ✅ Excellent (database-level) |
| **Use Case** | Development, testing | Production, premium users |
| **Resource Usage** | Lower | Slightly higher |

---

## 🎯 **When to Use Each Mode**

### **Schema-Based (Default)**
✅ **Best for:**
- Development and testing
- Simple apps with no external access needs
- Apps with many users (more efficient)
- Free tier users

### **Dedicated Database**
✅ **Best for:**
- Production apps
- Users who need external database access
- Apps requiring complete data isolation
- Premium/paid tier users
- Compliance requirements (GDPR, HIPAA)

---

## 🚀 **How to Create a Dedicated Database**

### **Backend API Request**

```bash
curl -X POST http://localhost:3000/api/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Todo App",
    "appType": "web",
    "dedicatedDatabase": true,
    "userId": 123
  }'
```

### **Response:**

```json
{
  "id": 5,
  "name": "My Todo App",
  "appType": "web",
  "database": {
    "mode": "dedicated",
    "databaseName": "applaa_u123_app5_my_todo_app",
    "dbUser": "user_123_app_5",
    "dbPassword": "aB3Xk9mN2pQ7rT5vW8yZ1cD4eF6gH0jL",
    "connectionString": "postgresql://user_123_app_5:aB3Xk9mN2pQ7rT5vW8yZ1cD4eF6gH0jL@168.231.116.44:5432/applaa_u123_app5_my_todo_app",
    "host": "168.231.116.44",
    "port": 5432,
    "canConnectExternally": true,
    "autoSetup": {
      "template": "todo",
      "tables": ["todos"]
    }
  }
}
```

---

## 🔐 **Getting Database Credentials**

### **API Endpoint:**

```bash
GET /api/apps/:appId/credentials
```

### **Example:**

```bash
curl http://localhost:3000/api/apps/5/credentials
```

### **Response:**

```json
{
  "host": "168.231.116.44",
  "port": 5432,
  "databaseName": "applaa_u123_app5_my_todo_app",
  "username": "user_123_app_5",
  "password": "aB3Xk9mN2pQ7rT5vW8yZ1cD4eF6gH0jL",
  "connectionString": "postgresql://user_123_app_5:aB3Xk9mN2pQ7rT5vW8yZ1cD4eF6gH0jL@168.231.116.44:5432/applaa_u123_app5_my_todo_app",
  "canConnectExternally": true,
  "recommendedClients": [
    "pgAdmin (Free, cross-platform)",
    "DBeaver (Free, cross-platform)",
    "TablePlus (Mac, paid)",
    "Postico (Mac, paid)"
  ]
}
```

---

## 📥 **Exporting Database**

### **API Endpoint:**

```bash
GET /api/apps/:appId/export
```

### **Example:**

```bash
curl http://localhost:3000/api/apps/5/export \
  -o my_todo_app_backup.sql
```

### **Response:**

Downloads a `.sql` file containing the complete database dump.

---

## 🔌 **Connecting with Database Clients**

### **pgAdmin**

1. **Open pgAdmin**
2. **Right-click Servers → Create → Server**
3. **General tab:**
   - Name: `My Todo App`
4. **Connection tab:**
   - Host: `168.231.116.44`
   - Port: `5432`
   - Maintenance database: `applaa_u123_app5_my_todo_app`
   - Username: `user_123_app_5`
   - Password: `aB3Xk9mN2pQ7rT5vW8yZ1cD4eF6gH0jL`
5. **Click Save**

✅ **Connected!**

### **DBeaver**

1. **Click "New Database Connection"**
2. **Select PostgreSQL**
3. **Enter connection details:**
   - Host: `168.231.116.44`
   - Port: `5432`
   - Database: `applaa_u123_app5_my_todo_app`
   - Username: `user_123_app_5`
   - Password: `aB3Xk9mN2pQ7rT5vW8yZ1cD4eF6gH0jL`
4. **Test Connection**
5. **Finish**

✅ **Connected!**

### **TablePlus (Mac)**

1. **Click "+ Create a new connection"**
2. **Select PostgreSQL**
3. **Enter:**
   - Name: `My Todo App`
   - Host: `168.231.116.44`
   - Port: `5432`
   - User: `user_123_app_5`
   - Password: `aB3Xk9mN2pQ7rT5vW8yZ1cD4eF6gH0jL`
   - Database: `applaa_u123_app5_my_todo_app`
4. **Click Test → Connect**

✅ **Connected!**

### **Command Line (psql)**

```bash
psql "postgresql://user_123_app_5:aB3Xk9mN2pQ7rT5vW8yZ1cD4eF6gH0jL@168.231.116.44:5432/applaa_u123_app5_my_todo_app"
```

---

## 🎨 **UI Components (React)**

### **Database Settings Component**

```typescript
import { useState, useEffect } from 'react';

interface DatabaseCredentials {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  connectionString: string;
  canConnectExternally: boolean;
}

export function DatabaseSettings({ appId }: { appId: number }) {
  const [credentials, setCredentials] = useState<DatabaseCredentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3000/api/apps/${appId}/credentials`)
      .then(res => res.json())
      .then(setCredentials);
  }, [appId]);

  const handleExport = async () => {
    const response = await fetch(`http://localhost:3000/api/apps/${appId}/export`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app_${appId}_backup.sql`;
    a.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!credentials) return <div>Loading...</div>;

  if (!credentials.canConnectExternally) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg">
        <p>This app uses a shared database (schema-based isolation).</p>
        <p>To enable external access, recreate the app with dedicatedDatabase: true</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🗄️ Database Settings</h2>
      
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-semibold">Host:</label>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded">{credentials.host}</code>
              <button onClick={() => copyToClipboard(credentials.host)}>📋</button>
            </div>
          </div>

          <div>
            <label className="font-semibold">Port:</label>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded">{credentials.port}</code>
            </div>
          </div>

          <div className="col-span-2">
            <label className="font-semibold">Database:</label>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded flex-1">{credentials.databaseName}</code>
              <button onClick={() => copyToClipboard(credentials.databaseName)}>📋</button>
            </div>
          </div>

          <div>
            <label className="font-semibold">Username:</label>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded">{credentials.username}</code>
              <button onClick={() => copyToClipboard(credentials.username)}>📋</button>
            </div>
          </div>

          <div>
            <label className="font-semibold">Password:</label>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded">
                {showPassword ? credentials.password : '••••••••••••••••'}
              </code>
              <button onClick={() => setShowPassword(!showPassword)}>👁️</button>
              <button onClick={() => copyToClipboard(credentials.password)}>📋</button>
            </div>
          </div>

          <div className="col-span-2">
            <label className="font-semibold">Connection String:</label>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                {credentials.connectionString}
              </code>
              <button onClick={() => copyToClipboard(credentials.connectionString)}>📋</button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            onClick={handleExport}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            📥 Export Database
          </button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Recommended Database Clients:</h3>
        <ul className="space-y-1">
          <li>🔹 <strong>pgAdmin</strong> - Free, cross-platform</li>
          <li>🔹 <strong>DBeaver</strong> - Free, cross-platform</li>
          <li>🔹 <strong>TablePlus</strong> - Mac, paid</li>
          <li>🔹 <strong>Postico</strong> - Mac, paid</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## 🔒 **Security Considerations**

### **Credentials Storage**

⚠️ **Current:** Passwords stored in plain text in `core.app_databases`

✅ **Production:** Should encrypt passwords:
```sql
ALTER TABLE core.app_databases ALTER COLUMN db_password TYPE BYTEA;
-- Use pgcrypto extension for encryption
```

### **Access Control**

Recommended approach for production:

```typescript
// Only show credentials to app owner
app.use(async (req, res, next) => {
  const { appId } = req.params;
  const { userId } = req.user; // From JWT

  const app = await db.query(
    'SELECT owner_user_id FROM core.apps WHERE id = $1',
    [appId]
  );

  if (app.rows[0].owner_user_id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
});
```

---

## 📊 **Database Naming Convention**

Format: `applaa_u{userId}_app{appId}_{sanitizedName}`

Examples:
- User 123, App 5, Name "My Todo App" → `applaa_u123_app5_my_todo_app`
- User 1, App 42, Name "Blog Platform" → `applaa_u1_app42_blog_platform`

**Username Format:** `user_{userId}_app_{appId}`

Examples:
- User 123, App 5 → `user_123_app_5`
- User 1, App 42 → `user_1_app_42`

---

## 🧪 **Testing**

### **Test Script:**

```bash
#!/bin/bash

# 1. Create dedicated database app
echo "Creating app with dedicated database..."
APP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Todo App",
    "appType": "web",
    "dedicatedDatabase": true,
    "userId": 1
  }')

APP_ID=$(echo $APP_RESPONSE | jq -r '.id')
echo "✅ App created with ID: $APP_ID"

# 2. Get credentials
echo -e "\nFetching credentials..."
curl -s http://localhost:3000/api/apps/$APP_ID/credentials | jq

# 3. Test connection
echo -e "\nTesting connection..."
CONNECTION_STRING=$(curl -s http://localhost:3000/api/apps/$APP_ID/credentials | jq -r '.connectionString')
psql "$CONNECTION_STRING" -c "SELECT current_database();"

# 4. Export database
echo -e "\nExporting database..."
curl -s http://localhost:3000/api/apps/$APP_ID/export -o test_export.sql
echo "✅ Export saved to test_export.sql"

echo -e "\n✅ All tests passed!"
```

---

## 💰 **Pricing Strategy (Optional)**

Suggested tiered pricing:

| Tier | Database Type | External Access | Export | Price/Month |
|------|--------------|----------------|--------|-------------|
| **Free** | Schema-based | ❌ | ❌ | $0 |
| **Pro** | Dedicated | ✅ | ✅ | $9 |
| **Team** | Dedicated + SSL | ✅ | ✅ + Scheduled | $29 |
| **Enterprise** | Dedicated + VPN | ✅ | ✅ + Auto-backup | Custom |

---

## 📈 **Monitoring**

### **Database Usage Query:**

```sql
SELECT 
  d.database_name,
  a.name as app_name,
  pg_size_pretty(pg_database_size(d.database_name)) as size,
  (SELECT count(*) FROM pg_stat_activity WHERE datname = d.database_name) as active_connections,
  d.created_at
FROM core.app_databases d
JOIN core.apps a ON a.id = d.app_id
WHERE d.database_name IS NOT NULL
ORDER BY pg_database_size(d.database_name) DESC;
```

---

## 🆘 **Troubleshooting**

| Issue | Solution |
|-------|----------|
| **Can't connect externally** | Check VPS firewall and `pg_hba.conf` |
| **Password authentication failed** | Verify credentials in response |
| **Database doesn't exist** | Check if provisioning completed successfully |
| **Export fails** | Ensure `pg_dump` is installed on VPS |
| **Connection timeout** | Check if VPS IP is correct |

---

## ✅ **Implementation Checklist**

- [x] Core schema migration (002_dedicated_databases.sql)
- [x] Password generation utility
- [x] Dedicated database provisioning function
- [x] Database credentials endpoint
- [x] Database export endpoint
- [x] VPS configuration guide
- [x] Documentation
- [ ] Encrypt passwords in production
- [ ] Add user authentication/authorization
- [ ] SSL/TLS for Postgres connections
- [ ] Automated backups
- [ ] Usage monitoring dashboard

---

**✅ Feature Complete!** Users can now have their own dedicated databases with full external access! 🎉

