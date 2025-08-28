# Applaa Web Platform — Product Requirements Document (PRD)

## 1) Executive Summary
Convert Applaa from a desktop Electron app into a cloud-native web platform with full feature parity and new user-centric capabilities. The web version must support guided onboarding, skill-based personalization, a specialized Agent Army, cloud development environments for Web/Expo/Flutter, MCP-driven Security and Testing, and one-click deployments.

## 2) Goals (MVP)
- Full parity for core flows: create apps (Web/Expo/Flutter), edit files, preview, deploy, test, secure.
- Web-first UX with Google login and skill assessment that adapts guidance and agents.
- Unified Quality Pipeline (Build → Security → Tests) via MCP services.
- Real-time collaboration, basic team sharing, and cloud previews.
- Hosted environments to build and preview apps without local setup.

## 3) Non-Goals (MVP)
- Enterprise SSO and granular RBAC (post-MVP).
- On-prem/self-host enterprise installs (later offering).
- Heavy multi-tenant org features (advanced permissions, audit trails).

## 4) Personas
- Beginner builders: step-by-step guidance and simple templates.
- Indie developers: fast iteration, testing, and one-click deploys.
- Small teams: sharing, review, CI-like quality pipeline.

## 5) Success Metrics
- Time-to-first-preview app ≤ 10 minutes for beginners.
- ≥80% projects pass Build and Security phases on first run.
- ≥60% medium+ security issues auto-fixed or accepted.
- ≥15% free→pro conversion in first 60 days.

## 6) Feature Parity Checklist
- App creation: Web (React), Expo, Flutter.
- Code generation (chat + agents) and file editing.
- Live preview with hot reload.
- Template registry and scaffolding.
- GitHub integration, Vercel deployments.
- Supabase for settings, metadata, storage.
- Semantic context engine (browser-safe and/or cloud workers).
- Playwright MCP for testing, Semgrep MCP for security.
- Env vars, problem hub, basic terminal/logs.

## 7) New Web-Only MVP Features
- Google OAuth signup + user profiles (Supabase Auth).
- Skill assessment (beginner/intermediate/advanced).
- Agent Army: UI/UX, Security, QA, ASO/SEO, BAU, Deployment, Analytics.
- Cloud dev containers to run dev servers (React/Expo/Flutter web).
- Real-time collaboration (viewers/editors) and presence.
- Analytics (GA4/PostHog) for UX optimization.

## 8) Core Flows
1. Onboarding: Google sign-in → 2‑minute skill quiz → personalize agents.
2. Create app: pick platform/template → scaffold → cloud preview URL.
3. Build with AI: chat with agents, code writes → auto Quality Pipeline.
4. Test & secure: Semgrep scan, Playwright tests → findings hub.
5. Deploy: Vercel for web; EAS/Flutter flows for mobile builds.
6. Collaborate: invite teammate, share preview, review diffs.

## 9) Quality Pipeline (Handshake)
- Order: Build (compile/TS) → Security (Semgrep) → Tests (Playwright).
- Budgets: ≤3 minutes per cycle, ≤2 cycles, short‑circuit on blockers.
- Gate: no compile errors; no HIGH/CRITICAL vulns; smoke tests green.
- Unified Finding model across phases; Problems hub UI.

## 10) Pricing (Indicative)
- Free: 3 apps, 1 GB storage, basic agents, limited build minutes.
- Pro ($29/mo): unlimited apps, 10 GB, full Agent Army, all MCPs, custom domains.
- Team ($99+/mo): collaboration, analytics, increased limits.

## 11) Constraints & Risks
- Browser sandbox: move Node/Electron-only code to backend APIs/containers.
- Long-running jobs: isolate into containers/queues.
- Vendor limits: keep Playwright/Flutter images secured and updated.

## 12) Acceptance Criteria (MVP)
- Users sign up with Google, create and preview Web/Expo/Flutter apps entirely in the browser.
- Agents respond contextually; skill-based guidance visible.
- Quality Pipeline runs automatically on code writes; findings are actionable.
- One-click Vercel deploy for web; mobile build jobs start and report status.
- Real-time collaboration works (at least shared view + basic edit concurrency).

## 13) Launch Plan
- Private beta (invite 50 users), fix blockers, measure TTFApp.
- Public beta with Pro tier, marketing site alignment, docs, demos.

---
References: Semgrep MCP; Playwright MCP; Supabase; Vercel; Expo EAS; Flutter.

