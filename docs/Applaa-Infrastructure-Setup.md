# Applaa Infrastructure Setup

This guide documents the end-to-end setup Applaa needs to mirror Dyad’s working integrations for GitHub, Supabase, and privacy-first Telemetry.

- Source inspiration: Dyad repo (dyad-sh/dyad). See repository overview: https://github.com/dyad-sh/dyad

## 1) GitHub App (for code sync, PRs, issues)

### Create the GitHub App
1. Go to GitHub → Settings → Developer settings → GitHub Apps → New GitHub App
2. Fill:
   - App name: Applaa
   - Homepage URL: https://applaa.dev
   - Callback URL: https://applaa.dev/auth/github/callback
   - Webhook URL: https://api.applaa.dev/webhooks/github
3. Permissions (minimum):
   - Repository contents: Read & write
   - Metadata: Read
   - Pull requests: Read & write
   - Issues: Read & write
   - Repository projects: Read & write (optional)
4. Generate the Private Key (.pem), note App ID, Client ID, Client Secret
5. Install the App on the org/repos used by Applaa

### Environment variables (Desktop + API)
```
GITHUB_APP_ID=xxxxx
GITHUB_CLIENT_ID=Iv1.xxxxx
GITHUB_CLIENT_SECRET=xxxxx
GITHUB_PRIVATE_KEY_BASE64=<base64 of .pem>
GITHUB_WEBHOOK_SECRET=<random string>
```

## 2) Supabase (Auth, DB, Storage, Edge Functions)

### Organization & Projects
- Org: Applaa
- Projects:
  - applaa-prod (Production)
  - applaa-staging (Staging)
  - applaa-dev (Development)

### Auth Providers
- Email/password, Magic links
- GitHub OAuth (Client ID/Secret from the GitHub App)

### Minimal schema
```sql
-- user profile
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  github_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- user apps
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  github_repo TEXT,
  supabase_project_id TEXT,
  template_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- privacy-first telemetry events
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT now(),
  session_id TEXT,
  app_version TEXT
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- Example RLS: users can read/write their own rows
CREATE POLICY up_select ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY up_upsert ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY up_update ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY apps_rw ON apps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Telemetry: insert-only for authenticated
CREATE POLICY tel_insert ON telemetry_events FOR INSERT TO authenticated WITH CHECK (true);
```

### Expo client (already included in template)
- @supabase/supabase-js, @react-native-async-storage/async-storage, react-native-url-polyfill
- Use expo-templates/base-router/utils/supabase.ts

### Env vars (Desktop, Web, Expo)
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx   # server only
```

## 3) Telemetry (privacy-first, opt-in)

### Principles
- Collect anonymous usage to improve Applaa
- Never collect code, chat content, secrets, file paths, or personal data
- User-facing toggle (Settings → Telemetry), show Telemetry ID

### Events to capture
- app_start { platform, version }
- app_created { template_type }
- feature_used { feature, metadata }
- error_occurred { type, message_short }
- upgrade_applied { upgrade_type, success }

### API endpoint
- POST https://api.applaa.dev/telemetry → body: { events: TelemetryEvent[] }
- Store in Supabase telemetry_events

### Example client payload
```json
{
  "events": [
    {
      "event_type": "app_start",
      "event_data": { "platform": "win32", "version": "1.0.0" },
      "timestamp": "2025-09-02T10:48:27.000Z",
      "session_id": "uuid",
      "app_version": "1.0.0"
    }
  ]
}
```

## 4) Desktop app settings (Applaa)
- Provider settings (OpenAI, etc.) with safe encryption
- Integrations → “Connect Supabase” (IPC supabase:* handlers)
- Integrations → “Connect GitHub” (GitHub App OAuth)
- Telemetry toggle (show Telemetry ID)

## 5) Security checklist
- Verify GitHub webhook signatures
- Restrict CORS on API
- Rate-limit write endpoints
- Encrypt secrets at rest
- Enforce RLS on all tables

## 6) Quick validation
1. Create GitHub App → install on repo
2. Create Supabase org/projects → set env vars
3. Toggle telemetry on → see events saved
4. Create new app (web/expo) → connect GitHub & Supabase → run

---
For reference architecture and behavior, see Dyad: https://github.com/dyad-sh/dyad






