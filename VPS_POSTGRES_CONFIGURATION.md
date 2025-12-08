# 🔐 VPS Postgres Configuration for External Access

This guide explains how to configure your VPS Postgres database to allow users to connect externally with their own dedicated databases and credentials.

---

## ⚠️ **IMPORTANT: Security First**

External database access is powerful but requires proper security configuration. Follow ALL steps carefully.

---

## 📋 **Prerequisites**

- ✅ VPS with Ubuntu 20.04/22.04
- ✅ Postgres 14+ installed
- ✅ Applaa backend deployed
- ✅ Root or sudo access

---

## 🔧 **Step 1: Configure Postgres for External Connections**

### **1.1 Edit postgresql.conf**

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Find and change:**
```
listen_addresses = 'localhost'
```

**To:**
```
listen_addresses = '*'  # Allow external connections
```

**Also check these settings:**
```
max_connections = 100       # Adjust based on expected users
shared_buffers = 256MB      # Adjust based on VPS RAM
```

---

### **1.2 Edit pg_hba.conf (PostgreSQL Host-Based Authentication)**

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

**Add at the end:**

#### **Option A: Password Authentication (Recommended for Development)**
```
# Allow external connections with password authentication
host    all             all             0.0.0.0/0               md5
```

#### **Option B: SSL Only (Recommended for Production)**
```
# Require SSL for all external connections
hostssl all             all             0.0.0.0/0               md5
```

#### **Option C: IP Whitelist (Most Secure)**
```
# Allow only specific IP addresses
host    all             all             123.45.67.89/32         md5  # User 1
host    all             all             98.76.54.32/32          md5  # User 2
```

---

### **1.3 Restart Postgres**

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql  # Verify it's running
```

---

## 🔥 **Step 2: Configure Firewall**

### **2.1 Allow Postgres Port (5432)**

```bash
sudo ufw allow 5432/tcp
sudo ufw status  # Verify rule is added
```

### **2.2 (Optional) Restrict by IP**

For extra security, only allow specific IPs:

```bash
sudo ufw allow from 123.45.67.89 to any port 5432  # User's IP
sudo ufw allow from 98.76.54.32 to any port 5432   # Another user's IP
```

---

## 🔐 **Step 3: Setup SSL/TLS (Highly Recommended)**

### **3.1 Generate Self-Signed Certificate (For Testing)**

```bash
sudo mkdir -p /etc/postgresql/14/main/ssl
cd /etc/postgresql/14/main/ssl

# Generate private key
sudo openssl genrsa -out server.key 2048

# Generate certificate
sudo openssl req -new -key server.key -out server.csr
sudo openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

# Set permissions
sudo chmod 600 server.key
sudo chown postgres:postgres server.key server.crt
```

### **3.2 Configure Postgres to Use SSL**

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Add/update:**
```
ssl = on
ssl_cert_file = '/etc/postgresql/14/main/ssl/server.crt'
ssl_key_file = '/etc/postgresql/14/main/ssl/server.key'
```

**Restart Postgres:**
```bash
sudo systemctl restart postgresql
```

### **3.3 Use Let's Encrypt Certificate (For Production)**

```bash
# Install certbot
sudo apt install certbot

# Get certificate for your domain
sudo certbot certonly --standalone -d db.yourdomain.com

# Copy certificates to Postgres directory
sudo cp /etc/letsencrypt/live/db.yourdomain.com/fullchain.pem /etc/postgresql/14/main/ssl/server.crt
sudo cp /etc/letsencrypt/live/db.yourdomain.com/privkey.pem /etc/postgresql/14/main/ssl/server.key
sudo chown postgres:postgres /etc/postgresql/14/main/ssl/*
sudo chmod 600 /etc/postgresql/14/main/ssl/server.key

# Restart Postgres
sudo systemctl restart postgresql
```

---

## 🧪 **Step 4: Test External Connection**

### **4.1 From Your Mac**

```bash
# Install psql client
brew install postgresql

# Test connection
psql "postgresql://user_1_app_5:PASSWORD@your-vps-ip:5432/applaa_u1_app5_myapp"
```

**Expected result:**
```
psql (14.x)
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

applaa_u1_app5_myapp=>
```

### **4.2 Test with pgAdmin**

1. **Open pgAdmin**
2. **Right-click Servers → Create → Server**
3. **General tab:**
   - Name: "My Applaa App"
4. **Connection tab:**
   - Host: `your-vps-ip` (e.g., `168.231.116.44`)
   - Port: `5432`
   - Maintenance database: Your database name (e.g., `applaa_u1_app5_myapp`)
   - Username: Your username (e.g., `user_1_app_5`)
   - Password: Your password
   - Save password: ✅
5. **SSL tab (if SSL enabled):**
   - SSL mode: `Require`
6. **Click Save**

✅ **You should now be connected!**

---

## 📊 **Step 5: Monitoring & Maintenance**

### **5.1 View Active Connections**

```bash
sudo -u postgres psql -c "SELECT datname, usename, client_addr, state FROM pg_stat_activity WHERE datname LIKE 'applaa_%';"
```

### **5.2 View Database Sizes**

```bash
sudo -u postgres psql -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) as size FROM pg_database WHERE datname LIKE 'applaa_%' ORDER BY pg_database_size(datname) DESC;"
```

### **5.3 Connection Limit Per Database**

```sql
ALTER DATABASE applaa_u1_app5_myapp CONNECTION LIMIT 10;
```

### **5.4 Kill Long-Running Queries**

```sql
-- View long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 minutes';

-- Kill a specific query
SELECT pg_terminate_backend(12345);  -- Replace with actual PID
```

---

## 🛡️ **Security Best Practices**

### ✅ **DO:**
1. **Use SSL/TLS** for all external connections
2. **Use strong passwords** (32+ characters, auto-generated)
3. **Whitelist IPs** when possible
4. **Monitor connections** regularly
5. **Set connection limits** per database
6. **Use separate credentials** for each app/user
7. **Regular backups** of all databases
8. **Keep Postgres updated** with security patches

### ❌ **DON'T:**
1. **Don't use weak passwords** (< 16 characters)
2. **Don't share credentials** between apps
3. **Don't allow root user** external access
4. **Don't skip SSL** in production
5. **Don't expose to 0.0.0.0/0** without SSL
6. **Don't ignore failed login attempts**

---

## 🔒 **Fail2Ban Configuration (Optional but Recommended)**

Protect against brute-force attacks:

### **Install Fail2Ban**

```bash
sudo apt install fail2ban
```

### **Configure Postgres Jail**

```bash
sudo nano /etc/fail2ban/jail.d/postgresql.conf
```

**Add:**
```
[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/postgresql-14-main.log
maxretry = 5
bantime = 3600
```

### **Create Filter**

```bash
sudo nano /etc/fail2ban/filter.d/postgresql.conf
```

**Add:**
```
[Definition]
failregex = ^.*FATAL:  password authentication failed for user.*$
ignoreregex =
```

### **Restart Fail2Ban**

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status postgresql
```

---

## 📈 **Performance Tuning**

### **For VPS with 2GB RAM:**

```
# /etc/postgresql/14/main/postgresql.conf
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 2
max_parallel_workers_per_gather = 1
max_parallel_workers = 2
```

### **For VPS with 4GB RAM:**

```
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
work_mem = 5242kB
```

**Apply changes:**
```bash
sudo systemctl restart postgresql
```

---

## 🆘 **Troubleshooting**

| Issue | Solution |
|-------|----------|
| **Connection refused** | Check firewall: `sudo ufw status` |
| **Connection timed out** | Check `listen_addresses` in postgresql.conf |
| **Password authentication failed** | Verify credentials in `core.app_databases` table |
| **SSL required but not available** | Check SSL configuration in postgresql.conf |
| **Too many connections** | Increase `max_connections` or set per-DB limits |
| **Permission denied** | Verify user has privileges: `GRANT ALL ON DATABASE ...` |

### **View Postgres Logs**

```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 🎯 **Testing Checklist**

- [ ] Postgres listening on 0.0.0.0:5432
- [ ] Firewall allows port 5432
- [ ] SSL enabled (production only)
- [ ] Can connect from external IP
- [ ] Can create tables in user database
- [ ] Can export database
- [ ] Fail2Ban configured
- [ ] Monitoring setup
- [ ] Backup strategy in place

---

## 📚 **Additional Resources**

- [Postgres Security Best Practices](https://www.postgresql.org/docs/current/security.html)
- [SSL/TLS Configuration](https://www.postgresql.org/docs/current/ssl-tcp.html)
- [Performance Tuning](https://pgtune.leopard.in.ua/)

---

**✅ Configuration Complete!** Your VPS Postgres is now ready for external connections!

Users can now connect using their dedicated credentials and manage their databases with any Postgres client. 🎉

