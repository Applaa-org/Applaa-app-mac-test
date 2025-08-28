# GitHub Integration Setup Guide

## 🎯 **Overview**

Integrate Applaa with GitHub to enable automatic repository creation, code synchronization, and deployment workflows for Pro users.

## 🔧 **GitHub App Setup**

### **1. Create GitHub App**

#### **App Configuration**
```
App Name: Applaa
Homepage URL: https://applaa.com
User authorization callback URL: https://api.applaa.com/auth/github/callback
Setup URL: https://applaa.com/github/setup
Webhook URL: https://api.applaa.com/webhooks/github
Webhook Secret: [Generate secure secret]
```

#### **Repository Permissions**
```
Contents: Read & Write
Metadata: Read
Pull requests: Read & Write
Issues: Read & Write
Actions: Read
Deployments: Read & Write
Environments: Read & Write
Pages: Read & Write
```

#### **Account Permissions**
```
Email addresses: Read
Git SSH keys: Read
```

#### **Subscribe to Events**
```
- Push
- Pull request
- Issues
- Deployment
- Deployment status
- Page build
- Release
```

### **2. Generate App Credentials**
- Download private key (.pem file)
- Note App ID
- Generate webhook secret
- Store securely in environment variables

## 🔐 **Authentication Flow**

### **OAuth Integration**
```typescript
interface GitHubAuth {
  // Step 1: Redirect to GitHub
  initiateAuth(userId: string): string; // Returns auth URL
  
  // Step 2: Handle callback
  handleCallback(code: string, state: string): Promise<GitHubToken>;
  
  // Step 3: Store tokens
  storeTokens(userId: string, tokens: GitHubToken): Promise<void>;
}

interface GitHubToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope: string[];
}
```

### **Installation Flow**
```typescript
interface GitHubInstallation {
  installationId: number;
  accountId: number;
  accountType: 'User' | 'Organization';
  repositorySelection: 'all' | 'selected';
  repositories: Repository[];
  permissions: Permissions;
}
```

## 🏗️ **Repository Management**

### **Auto Repository Creation**
```typescript
interface RepoCreationConfig {
  name: string;
  description: string;
  private: boolean;
  autoInit: boolean;
  gitignoreTemplate?: string;
  licenseTemplate?: string;
  allowSquashMerge: boolean;
  allowMergeCommit: boolean;
  allowRebaseMerge: boolean;
}

class GitHubRepoManager {
  async createRepository(
    userId: string, 
    config: RepoCreationConfig
  ): Promise<Repository> {
    // Create repo via GitHub API
    // Setup initial commit with generated code
    // Configure branch protection
    // Setup deployment keys
  }
}
```

### **Code Synchronization**
```typescript
interface SyncOperation {
  type: 'push' | 'pull' | 'merge';
  files: FileChange[];
  commitMessage: string;
  branch: string;
}

class CodeSync {
  async pushChanges(
    repoId: string, 
    changes: FileChange[]
  ): Promise<Commit> {
    // Stage files
    // Create commit
    // Push to remote
    // Update local tracking
  }
  
  async pullChanges(repoId: string): Promise<FileChange[]> {
    // Fetch remote changes
    // Merge with local
    // Resolve conflicts
    // Update workspace
  }
}
```

## 🚀 **Deployment Integration**

### **Vercel Integration**
```typescript
interface DeploymentConfig {
  provider: 'vercel' | 'netlify' | 'github-pages';
  buildCommand?: string;
  outputDirectory?: string;
  environmentVariables: Record<string, string>;
  customDomain?: string;
}

class DeploymentManager {
  async setupDeployment(
    repoId: string, 
    config: DeploymentConfig
  ): Promise<Deployment> {
    // Configure deployment provider
    // Setup build pipeline
    // Configure custom domain
    // Setup SSL certificates
  }
}
```

### **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🔄 **Webhook Handling**

### **Webhook Events**
```typescript
interface WebhookHandler {
  handlePush(payload: PushPayload): Promise<void>;
  handlePullRequest(payload: PRPayload): Promise<void>;
  handleDeployment(payload: DeploymentPayload): Promise<void>;
  handleIssues(payload: IssuesPayload): Promise<void>;
}

class GitHubWebhookProcessor {
  async processPush(payload: PushPayload) {
    // Update local workspace
    // Trigger rebuild if needed
    // Notify user of changes
    // Update deployment status
  }
  
  async processDeployment(payload: DeploymentPayload) {
    // Update deployment status in UI
    // Send notifications
    // Update analytics
  }
}
```

### **Security**
```typescript
class WebhookSecurity {
  verifySignature(payload: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }
}
```

## 📊 **Database Schema**

### **User GitHub Connection**
```sql
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_user_id INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  installation_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Repository Tracking**
```sql
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  private BOOLEAN DEFAULT false,
  clone_url TEXT NOT NULL,
  default_branch VARCHAR(255) DEFAULT 'main',
  applaa_app_id UUID REFERENCES apps(id),
  deployment_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Deployment Status**
```sql
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  github_deployment_id INTEGER,
  status VARCHAR(50) NOT NULL, -- pending, success, failure, error
  environment VARCHAR(100) DEFAULT 'production',
  url TEXT,
  commit_sha VARCHAR(40),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎨 **UI Components**

### **GitHub Connection Flow**
```typescript
// GitHub connection button
<GitHubConnectButton 
  onConnect={handleGitHubConnect}
  isConnected={user.githubConnected}
/>

// Repository selection
<RepositorySelector
  repositories={userRepos}
  onSelect={handleRepoSelect}
  allowCreate={true}
/>

// Deployment status
<DeploymentStatus
  status={deployment.status}
  url={deployment.url}
  lastDeploy={deployment.updatedAt}
/>
```

### **Settings Integration**
```typescript
// In user settings
<GitHubSettings
  connection={githubConnection}
  onDisconnect={handleDisconnect}
  onReconnect={handleReconnect}
  repositories={connectedRepos}
/>
```

## 🔧 **Implementation Steps**

### **Phase 1: Basic Integration (Week 1)**
- [ ] Create GitHub App
- [ ] Implement OAuth flow
- [ ] Basic repository creation
- [ ] Store user connections

### **Phase 2: Code Sync (Week 2)**
- [ ] File synchronization
- [ ] Commit management
- [ ] Branch handling
- [ ] Conflict resolution

### **Phase 3: Deployment (Week 3)**
- [ ] Vercel integration
- [ ] Custom domains
- [ ] Environment variables
- [ ] SSL certificates

### **Phase 4: Advanced Features (Week 4)**
- [ ] Webhook processing
- [ ] Real-time updates
- [ ] Deployment analytics
- [ ] Team collaboration

## 🚀 **Pro Feature Integration**

### **Free Tier Restrictions**
- No GitHub integration
- Local development only
- Manual code export

### **Pro Tier Benefits**
- Automatic repository creation
- Real-time code synchronization
- One-click deployment
- Custom domain support
- Team repository access

## 📈 **Success Metrics**

### **Adoption Metrics**
- GitHub connection rate: >60% of Pro users
- Repository creation rate: >80% of connected users
- Deployment success rate: >95%
- Average time to first deploy: <5 minutes

### **Technical Metrics**
- Webhook processing time: <2 seconds
- Sync operation success rate: >99%
- API rate limit compliance: 100%
- Security incident rate: 0

This GitHub integration will be a key differentiator for Applaa Pro, providing seamless development workflow from idea to production deployment.

