# Applaa MVP Development Roadmap

## Overview
This document outlines the three critical features for Applaa MVP: Enhanced Expo Preview System, User Authentication & Cloud Storage, and Analytics Integration.

---

## 1. Enhanced Expo Preview System 🚀

### Current Issues
- Flaky and unstable preview experience
- Web preview not loading on app start
- Manual restart required for device preview
- Inconsistent tunnel connectivity

### MVP Requirements
- **Zero-restart preview**: Preview should work immediately without manual intervention
- **Default tunnel mode**: Automatically open tunnel for device connectivity
- **Stable device frame**: Consistent preview in desktop device frame
- **Split-second loading**: Desktop-optimized for instant preview updates
- **Reliable QR code**: Always-available QR code for device testing

### Technical Implementation
```typescript
// Enhanced Expo Preview Architecture
interface ExpoPreviewConfig {
  autoStart: true;
  tunnelMode: 'tunnel'; // Default to tunnel for device access
  deviceFrame: 'ios' | 'android';
  autoReload: true;
  errorRecovery: 'auto-restart';
}

// Key Components to Enhance:
// - src/components/expo/SimpleMobilePreview.tsx
// - src/ipc/handlers/expo_handlers.ts
// - Auto-tunnel detection and fallback
```

### Success Criteria
- ✅ Preview loads within 2 seconds of app creation
- ✅ No manual restart required
- ✅ QR code always visible and functional
- ✅ Device frame shows app immediately
- ✅ Tunnel opens automatically for device testing

---

## 2. User Authentication & Cloud Storage System 🔐

### Architecture Overview
**Supabase** (Authentication + Metadata) + **Cloudflare R2** (Source Code Storage) + **SQLite Backup**

### 2.1 Supabase Authentication
```sql
-- User Profile Schema
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free', -- 'free' | 'pro'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Apps Metadata
CREATE TABLE user_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  app_name TEXT NOT NULL,
  app_type TEXT NOT NULL, -- 'web' | 'expo' | 'flutter'
  local_path TEXT,
  r2_storage_path TEXT, -- Path to source code in R2
  github_repo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sync_enabled BOOLEAN DEFAULT true
);

-- SQLite Backup Metadata
CREATE TABLE sqlite_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  backup_path TEXT NOT NULL, -- R2 path to SQLite backup
  backup_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Cloudflare R2 Storage Strategy
```typescript
// R2 Storage Structure
interface R2StorageStructure {
  users: {
    [userId: string]: {
      apps: {
        [appId: string]: {
          'source/': string; // Source code only
          'metadata.json': AppMetadata;
        }
      };
      backups: {
        'sqlite/': string; // SQLite database backups
        'settings/': string; // User settings backups
      }
    }
  }
}

// Security Model
interface R2Security {
  userTokens: string; // JWT-based access tokens
  pathIsolation: boolean; // Users can only access their own paths
  encryptionAtRest: boolean; // R2 server-side encryption
}
```

### 2.3 Source Code Sync Rules
```typescript
// Files to Include in Sync
const SYNC_INCLUDE = [
  '**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx',
  '**/*.json', '**/*.md', '**/*.css', '**/*.scss',
  '**/*.html', '**/*.vue', '**/*.dart',
  'package.json', 'pubspec.yaml', 'app.json'
];

// Files to Exclude (Save Storage Costs)
const SYNC_EXCLUDE = [
  'node_modules/**',
  'build/**', 'dist/**', '.next/**',
  'android/build/**', 'ios/build/**',
  '.git/**', '.vscode/**',
  '**/*.log', '**/*.tmp'
];
```

### 2.4 Implementation Plan
1. **Phase 1**: Supabase Auth Integration
   - User registration/login
   - Profile management
   - JWT token handling

2. **Phase 2**: R2 Storage Setup
   - Bucket configuration
   - Security policies
   - Upload/download APIs

3. **Phase 3**: Sync Engine
   - Real-time file watching
   - Incremental sync
   - Conflict resolution

4. **Phase 4**: SQLite Backup
   - Continuous backup scheduling
   - Disaster recovery testing

### Privacy & Control
- **Opt-out available**: Users can disable cloud sync in settings
- **GitHub priority**: GitHub remains primary source of truth
- **Local-first**: All features work offline
- **Data portability**: Users can export all their data

---

## 3. Analytics & Telemetry Integration 📊

### 3.1 Google Analytics 4 Integration
```typescript
// GA4 Events Tracking
interface ApplaaAnalytics {
  // User Journey Events
  app_creation_started: { app_type: string; template?: string };
  app_creation_completed: { app_type: string; duration: number };
  preview_opened: { app_type: string; preview_type: string };
  
  // Engagement Events
  chat_message_sent: { message_length: number; app_context: boolean };
  code_generated: { lines_of_code: number; language: string };
  error_encountered: { error_type: string; component: string };
  
  // Feature Usage
  expo_preview_used: { success: boolean; load_time: number };
  github_sync_used: { action: 'push' | 'pull' | 'clone' };
  cloud_storage_used: { action: 'upload' | 'download' | 'sync' };
}
```

### 3.2 Crash Analytics (Sentry Integration)
```typescript
// Error Tracking Configuration
interface SentryConfig {
  dsn: string;
  environment: 'development' | 'production';
  tracesSampleRate: 1.0;
  beforeSend: (event) => {
    // Privacy filter - remove sensitive data
    return sanitizeEvent(event);
  };
}

// Custom Error Boundaries
class ApplaaErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { errorInfo },
      tags: { component: 'applaa-ui' }
    });
  }
}
```

### 3.3 Application Logs & Diagnostics
```typescript
// Structured Logging
interface ApplaaLogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  component: string;
  event: string;
  metadata?: Record<string, any>;
  userId?: string; // Only if user consents
}

// Performance Monitoring
interface PerformanceMetrics {
  app_startup_time: number;
  preview_load_time: number;
  code_generation_time: number;
  memory_usage: number;
  cpu_usage: number;
}
```

### 3.4 Privacy-First Implementation
```typescript
// User Consent Management
interface AnalyticsConsent {
  essential: boolean; // Always true (app functionality)
  analytics: boolean; // GA4 tracking
  performance: boolean; // Performance monitoring
  crash_reporting: boolean; // Error tracking
  improvement_data: boolean; // Feature usage for product improvement
}

// Privacy Settings UI
const PrivacySettings = () => (
  <div>
    <h3>Help Improve Applaa</h3>
    <Checkbox checked={consent.analytics}>
      📊 Usage Analytics (Help us understand how you use Applaa)
    </Checkbox>
    <Checkbox checked={consent.crash_reporting}>
      🐛 Crash Reporting (Help us fix bugs faster)
    </Checkbox>
    <Checkbox checked={consent.performance}>
      ⚡ Performance Data (Help us make Applaa faster)
    </Checkbox>
    <p>You can change these settings anytime. We never collect personal code or sensitive data.</p>
  </div>
);
```

### 3.5 Data Collection Guidelines
**What We Collect (with consent):**
- App creation patterns and success rates
- Preview usage and performance metrics
- Error logs and crash reports
- Feature adoption and usage frequency
- Performance bottlenecks and optimization opportunities

**What We NEVER Collect:**
- User's source code content
- API keys or sensitive credentials
- Personal files or documents
- Private chat conversations
- Identifiable user data without explicit consent

---

## Implementation Timeline

### Week 1-2: Enhanced Expo Preview
- [ ] Refactor SimpleMobilePreview component
- [ ] Implement auto-tunnel detection
- [ ] Add error recovery mechanisms
- [ ] Test preview stability across different apps

### Week 3-4: Supabase Authentication
- [ ] Set up Supabase project and database schema
- [ ] Implement user registration/login flows
- [ ] Create user profile management
- [ ] Test authentication edge cases

### Week 5-6: Cloudflare R2 Integration
- [ ] Configure R2 bucket and security policies
- [ ] Build file sync engine
- [ ] Implement incremental sync logic
- [ ] Add conflict resolution

### Week 7-8: Analytics Integration
- [ ] Set up GA4 and Sentry accounts
- [ ] Implement event tracking
- [ ] Create privacy consent UI
- [ ] Test analytics data flow

### Week 9-10: SQLite Backup & Testing
- [ ] Implement continuous SQLite backup
- [ ] Build disaster recovery procedures
- [ ] End-to-end testing of all systems
- [ ] Performance optimization and bug fixes

---

## Success Metrics

### Expo Preview Quality
- Preview success rate: >95%
- Average load time: <3 seconds
- User satisfaction: >4.5/5 stars

### User Adoption
- User registration rate: >60% of app creators
- Cloud sync adoption: >40% of registered users
- Feature retention: >80% monthly active usage

### System Reliability
- Uptime: >99.9%
- Data loss incidents: 0
- Security incidents: 0
- User privacy compliance: 100%

---

## Risk Mitigation

### Technical Risks
- **R2 Storage Costs**: Monitor usage, implement compression
- **Sync Conflicts**: Robust conflict resolution with user choice
- **Preview Instability**: Comprehensive error handling and fallbacks

### Privacy Risks
- **Data Protection**: Encryption at rest and in transit
- **User Consent**: Clear opt-in/opt-out mechanisms
- **Compliance**: GDPR/CCPA compliance from day one

### Business Risks
- **User Trust**: Transparent privacy policy and data handling
- **Scalability**: Design for 10x growth from MVP
- **Cost Management**: Monitor and optimize cloud service costs

---

*This document serves as the technical specification and implementation guide for Applaa MVP's core features. All implementations should prioritize user privacy, system reliability, and exceptional user experience.*


