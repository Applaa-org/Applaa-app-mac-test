# Applaa Web — Taskmaster (Epics, Tasks, Milestones)

## Milestones
- M1 (Week 1–2): Foundation — Auth, DB, Files, Core APIs.
- M2 (Week 3–4): Dev Envs, Agents, MCP, Quality Pipeline.
- M3 (Week 5–6): Deployments, Collaboration, Polish, Docs.

## Epics & Tasks

### Epic A — Platform Foundation
- A1: Repo bootstrap (`applaa-web/` Next.js + TS + Tailwind).
- A2: Supabase project + schemas + RLS.
- A3: Auth (Google OAuth) + profile CRUD + skill assessment quiz.
- A4: File system abstraction (Storage + `app_files`).
- A5: Core APIs (apps CRUD, files read/write/list, metadata).
- A6: App templates & scaffolding endpoints.

### Epic B — Dev Environments
- B1: Docker images for react/expo/flutter.
- B2: Container manager service + start/stop/status.
- B3: Preview reverse proxy + URL issuance.
- B4: Logs streaming to UI.

### Epic C — Agents & Chat
- C1: General chat + SSE streaming.
- C2: Agent base classes + registry + orchestrator.
- C3: UI/UX, Security, QA agents (v1).
- C4: Skill-based prompt enhancer.

### Epic D — MCP Services
- D1: Playwright MCP HTTP service + client.
- D2: Semgrep MCP HTTP service + client.
- D3: Flutter doctor/build service (HTTP) + client.
- D4: Service authZ + rate limits.

### Epic E — Quality Pipeline
- E1: Normalized Finding model.
- E2: Build → Security → Tests orchestrator.
- E3: Problems hub UI + diff viewer + Fix-safe action.
- E4: Publish gate badges + history.

### Epic F — Deployments & Integrations
- F1: Vercel integration (projects, envs, deploy).
- F2: GitHub integration (connect, push, branches).
- F3: Expo EAS build; Flutter build job orchestration.

### Epic G — Collaboration & Realtime
- G1: Presence; basic editor concurrency.
- G2: Share links; team members (owner/editor/viewer).
- G3: Activity feed; invitations.

### Epic H — UX, Telemetry, Docs
- H1: Onboarding flows + empty states.
- H2: GA4/PostHog funnels, events, and dashboards.
- H3: Docs: user guide, admin setup, runbooks.

## Acceptance Criteria per Milestone
- M1: Create/Read/Write files in cloud; login; scaffold app; basic preview.
- M2: Containers start; agents answer; MCP runs; pipeline renders findings.
- M3: Deploy web app; build mobile app job starts; collaboration works.

