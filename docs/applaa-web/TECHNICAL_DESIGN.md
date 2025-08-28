# Applaa Web Platform — Technical Design

## 1) Architecture Overview
- Frontend: Next.js (App Router), React, TypeScript, Tailwind, Jotai, Monaco.
- Backend: Next.js API routes + Supabase (Postgres/Storage/Auth/Realtime).
- Infra: Vercel (frontend+API), Docker containers for dev env and MCP services.
- MCP Services: Playwright MCP (tests), Semgrep MCP (security), Flutter SDK service.

## 2) IPC → Web API Mapping
Replace Electron IPC handlers with REST/WS endpoints.

- Apps
  - POST /api/apps → create app (maps create-app IPC)
  - GET /api/apps/:id → get app
  - PUT /api/apps/:id → update metadata
  - DELETE /api/apps/:id → delete app
- Files (VFS over Supabase Storage)
  - GET /api/apps/:id/files → list files
  - GET /api/apps/:id/files/[...path] → read
  - PUT /api/apps/:id/files/[...path] → write
  - DELETE /api/apps/:id/files/[...path] → delete
  - POST /api/apps/:id/files/upload → bulk upload
- Dev Environments
  - POST /api/apps/:id/dev/start|stop|restart
  - GET /api/apps/:id/dev/status|logs
- Chat & Agents
  - POST /api/apps/:id/chat/:chatId/message → stream responses (SSE)
  - POST /api/agents/:type/query → specialized agent responses
- MCP
  - POST /api/apps/:id/mcp/semgrep/scan
  - POST /api/apps/:id/mcp/playwright/test
  - POST /api/apps/:id/mcp/flutter/doctor
  - GET  /api/apps/:id/mcp/status
- Deploy
  - POST /api/apps/:id/deploy/vercel|github|app-store
  - GET  /api/apps/:id/deploy/status

## 3) Data Model (Postgres)
- users, apps, app_files, chats, user_agents, dev_environments, mcp_service_logs, team_members, usage_analytics.
- Indexes on foreign keys and heavy-read columns (see PRD schema). 

## 4) File System Abstraction
- Supabase Storage bucket `app-files` with path `${appId}/${filePath}`.
- Metadata rows in `app_files` (hash, size, mime, updated_at) for queries.
- Large binaries stored only in Storage; text code also cached in DB for diffing.

## 5) Containers & Previews
- Base images: `react-dev`, `expo-dev`, `flutter-dev`.
- Start container with appId env and mount Storage via fetch proxy layer.
- Expose preview via reverse proxy; return `preview_url` to frontend.

## 6) MCP Integration
- Dedicated microservices with HTTP endpoints.
- AuthN via service token; AuthZ via app ownership.
- Normalize outputs to unified Finding model.

## 7) Quality Pipeline Orchestrator
- Trigger on file write or explicit run.
- Steps: Build → Security → Tests; enforce budgets and publish gate.
- Persist run/finding logs; emit WS events to UI.

## 8) Realtime & Collaboration
- Supabase Realtime channel per app (`app:{id}`).
- Broadcast file changes and pipeline events.
- Presence for editors; basic conflict resolution with last-writer-wins + diff hints.

## 9) Security & Compliance
- Row Level Security (RLS) on all user-owned tables.
- Secrets in Vercel env vars; never expose service tokens to client.
- Signed URLs for Storage downloads.
- Rate limiting on sensitive endpoints.

## 10) Observability
- Sentry for errors, Vercel analytics, structured logs with request IDs.
- Trace MCP and container operations with correlating IDs.

## 11) Migration Strategy
- Dual-run with desktop; import local projects to cloud.
- Hybrid mode: desktop connects to cloud backend.
- Gradual parity; feature flags for beta users.

## 12) Open Questions
- Long-lived container costs & autosleep policy.
- Flutter iOS build path for non-macOS runners (remote mac build provider?).
- Terminal emulation over WS vs logs-only MVP.

