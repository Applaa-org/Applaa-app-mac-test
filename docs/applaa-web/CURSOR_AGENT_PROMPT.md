# Cursor Agent Prompt for Applaa Web Platform Implementation

## Task Overview
You are a senior full-stack developer tasked with implementing the complete Applaa Web platform. This is a conversion of an existing Electron desktop app to a cloud-native web platform with full feature parity plus new user-centric capabilities.

## Project Context
Applaa is an AI-powered app builder that currently runs as an Electron desktop application. We need to convert it to a web-based platform while maintaining 100% feature parity and adding new capabilities like user authentication, skill-based personalization, specialized AI agents, and cloud development environments.

## Your Mission
Implement the entire Applaa Web platform in a new `applaa-web/` folder following the specifications in the provided documentation.

## Documentation References
Read and follow these documents in `docs/applaa-web/`:
1. **PRD.md** - Product requirements, features, success metrics
2. **TECHNICAL_DESIGN.md** - Architecture, APIs, data models, security
3. **TASKMASTER.md** - Epics, tasks, milestones, acceptance criteria
4. **AGENT_RUNBOOK.md** - Setup instructions, coding standards, delivery checklist

## Key Requirements

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes + Supabase (PostgreSQL, Storage, Auth, Realtime)
- **Infrastructure**: Vercel (hosting), Docker (containers), Cloud Run (MCP services)
- **State Management**: Jotai (reuse existing patterns from desktop app)
- **Code Editor**: Monaco Editor for in-browser code editing

### Core Features to Implement
1. **Authentication & Onboarding**
   - Google OAuth via Supabase Auth
   - User profiles and skill assessment (beginner/intermediate/advanced)
   - Personalized onboarding flow

2. **App Management (Feature Parity)**
   - Create apps (Web/React, Expo, Flutter)
   - File system abstraction over Supabase Storage
   - Template system and project scaffolding
   - Live preview with hot reload

3. **AI Agent System (New)**
   - Specialized agents: UI/UX, Security, QA, ASO/SEO, BAU, Deployment, Analytics
   - Agent orchestrator with skill-based personalization
   - Chat interface with streaming responses

4. **Development Environments**
   - Docker containers for React/Expo/Flutter development
   - Cloud-based preview URLs
   - Container lifecycle management (start/stop/restart)

5. **Quality Pipeline (Enhanced)**
   - Build → Security → Tests orchestration
   - Semgrep MCP integration for security scanning
   - Playwright MCP integration for testing
   - Unified findings model and Problems hub UI

6. **Deployment & Integrations**
   - Vercel deployment for web apps
   - GitHub integration (connect repos, push code)
   - Expo EAS build integration
   - Flutter build orchestration

7. **Collaboration & Real-time**
   - Real-time file editing with conflict resolution
   - Team member management (owner/editor/viewer roles)
   - Presence indicators and activity feeds

### Database Schema
Implement the complete PostgreSQL schema with these core tables:
- `users` (profiles, skill levels, subscription tiers)
- `apps` (projects with metadata)
- `app_files` (virtual file system)
- `chats` (AI conversations)
- `user_agents` (agent configurations)
- `dev_environments` (container management)
- `mcp_service_logs` (quality pipeline logs)
- `team_members` (collaboration)
- `usage_analytics` (telemetry)

### API Endpoints
Create REST APIs that replace all Electron IPC handlers:
- `/api/auth/*` - Authentication and user management
- `/api/apps/*` - App CRUD operations
- `/api/apps/[id]/files/*` - File system operations
- `/api/apps/[id]/dev/*` - Development environment management
- `/api/apps/[id]/chat/*` - AI chat and agent interactions
- `/api/agents/*` - Agent configuration and queries
- `/api/apps/[id]/mcp/*` - MCP service integrations
- `/api/apps/[id]/deploy/*` - Deployment operations

### MCP Services Integration
Implement HTTP-based MCP services:
1. **Playwright MCP** - Automated testing service
2. **Semgrep MCP** - Security scanning service
3. **Flutter SDK Service** - Flutter development tools

### Security & Performance
- Row Level Security (RLS) on all user data
- Rate limiting on sensitive endpoints
- Signed URLs for file downloads
- Container resource limits and auto-sleep
- Error handling with structured logging

## Implementation Guidelines

### Project Structure
```
applaa-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Main application
│   │   ├── api/               # API endpoints
│   │   └── globals.css
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── auth/             # Auth components
│   │   ├── apps/             # App management
│   │   ├── chat/             # Chat interface
│   │   ├── editor/           # Code editor
│   │   └── agents/           # Agent interfaces
│   ├── lib/                  # Utilities
│   │   ├── supabase/         # Database client
│   │   ├── containers/       # Container management
│   │   ├── mcp/              # MCP integrations
│   │   └── utils/            # Helper functions
│   └── hooks/                # Custom React hooks
├── docker/                   # Container definitions
├── docs/                     # Documentation
└── scripts/                  # Setup and migration scripts
```

### Coding Standards
- Use TypeScript strict mode throughout
- Implement Zod schemas for all API inputs/outputs
- Follow error-first design patterns
- Add comprehensive error handling and logging
- Write unit tests for core business logic
- Use consistent naming conventions
- Document complex functions and APIs

### Environment Setup
Required environment variables:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VERCEL_TOKEN=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
PLAYWRIGHT_MCP_URL=
SEMGREP_MCP_URL=
FLUTTER_MCP_URL=
```

## Delivery Expectations

### Phase 1 (Foundation)
- [ ] Next.js project setup with TypeScript and Tailwind
- [ ] Supabase integration with database schema
- [ ] Authentication system with Google OAuth
- [ ] Basic app CRUD operations
- [ ] File system abstraction working

### Phase 2 (Core Features)
- [ ] Container management for dev environments
- [ ] AI agent system with chat interface
- [ ] MCP service integrations
- [ ] Quality pipeline orchestration
- [ ] Real-time collaboration basics

### Phase 3 (Polish & Deploy)
- [ ] Deployment integrations (Vercel, GitHub, EAS)
- [ ] Team management and permissions
- [ ] Analytics and monitoring
- [ ] Documentation and setup guides
- [ ] Production deployment configuration

### Success Criteria
- Users can sign up with Google and complete skill assessment
- All three app types (Web, Expo, Flutter) can be created and previewed
- AI agents provide contextual, skill-appropriate responses
- Quality pipeline runs automatically and shows actionable findings
- One-click deployments work for web apps
- Real-time collaboration functions without conflicts
- All existing desktop features have web equivalents

## Additional Context
- Refer to the existing Electron codebase in `src/` for feature reference
- Maintain UI/UX consistency with existing design patterns
- Prioritize performance and scalability for multi-user scenarios
- Ensure mobile-responsive design throughout
- Follow accessibility best practices

## Questions & Support
If you encounter ambiguities or need clarification:
1. Check the existing Electron implementation for reference
2. Refer to the technical design document for architecture decisions
3. Follow the taskmaster for prioritization guidance
4. Use the agent runbook for setup and standards

Begin implementation following the milestone schedule in TASKMASTER.md. Focus on getting the foundation solid before moving to advanced features.
