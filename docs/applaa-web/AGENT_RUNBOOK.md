# Applaa Web — Backend Agent Runbook

## Scope
Implement the Applaa Web platform in `applaa-web/` with full parity and MVP features per PRD and Technical Design.

## Setup
- Prereqs: Node 18+, Docker, Supabase project, Vercel account.
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, MCP service URLs.
- Create Storage bucket `app-files`.

## Folder Structure
```
applaa-web/
  src/app/ (Next.js App Router)
    api/ (REST endpoints)
    (auth)/ (login, onboarding)
    (dashboard)/ (apps, settings, team)
  src/components/ (ui, editor, agents)
  src/lib/ (supabase, containers, mcp, utils)
```

## Build Steps
1. Bootstrap Next.js app with Tailwind.
2. Add Supabase client (RLS-ready) and service client (server-side).
3. Implement DB schema migrations.
4. Implement APIs per mapping (apps, files, dev, agents, mcp, deploy).
5. Add container manager and preview proxy.
6. Integrate MCP services (Playwright/Semgrep/Flutter).
7. Implement Quality Orchestrator and Problems hub.
8. Wire GA4/PostHog events.

## Coding Standards
- TypeScript strict mode; Zod schemas for I/O.
- API route handlers server-only; no secrets in client.
- Error-first design; normalized errors; logs with request IDs.
- Unit tests for mappers/orchestrators; integration tests for APIs.

## Commands
- Dev: `pnpm dev` (Next.js), Docker for services.
- Lint/Test: `pnpm lint && pnpm test`.
- Seed: `pnpm ts-node scripts/seed.ts`.

## Delivery Checklist
- [ ] Auth + profiles + skill assessment working.
- [ ] Apps CRUD + files R/W + templates.
- [ ] Containers start/stop; preview URL reachable.
- [ ] Agents reply; pipeline runs; findings visible.
- [ ] Deploy to Vercel; EAS/Flutter build job triggers.
- [ ] Docs updated; env/prod configs set.

