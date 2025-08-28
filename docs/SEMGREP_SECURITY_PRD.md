# Applaa Security PRD — Semgrep MCP Integration + Secure Auto‑Fix

## 1) Summary
Add first‑class security scanning and auto‑fix to Applaa by integrating Semgrep MCP. Security will run automatically during code generation and on demand, producing actionable findings, auto‑applying safe fixes when possible, and surfacing a clear security score and dashboard. Advanced rules and compliance reporting are Pro features.

Reference: Semgrep MCP server and usage details are documented here: [semgrep/mcp](https://github.com/semgrep/mcp).

## 2) Problem / Opportunity
- AI code generation can introduce vulnerabilities (XSS, SQLi, insecure auth, etc.).
- Security reviews happen late, are manual, and are often skipped for MVPs.
- Competitive tools don’t ship secure‑by‑default workflows.

Applaa can differentiate by making security an always‑on capability with one‑click remediation.

## 3) Goals (MVP)
- Automatically scan generated/edited code with Semgrep MCP.
- Auto‑fix common vulnerabilities or propose safe changes for review.
- Show a simple security score (0–100) and list of findings grouped by severity.
- Run scans on demand and as part of the existing auto‑fix pipeline.
- Provide clear, copy‑pastable remediation diffs.

## 4) Non‑Goals (MVP)
- Full enterprise policy management.
- Org‑wide dashboards across machines.
- Multi‑language SAST parity beyond Semgrep’s rule coverage.

## 5) Users / Segmentation
- All users benefit from basic scanning and simple auto‑fix.
- Pro users unlock advanced rule sets, compliance packs, and exportable reports.

## 6) Success Metrics
- ≥80% of generated projects scanned at least once.
- ≥60% of medium+ findings auto‑fixed or accepted within session.
- Mean security score improvement of ≥20 points post‑auto‑fix.
- <2% scan failures across platforms.

## 7) Architecture & Flow

### Components
- Renderer: Security UI (panel in Preview area + toast notifications + Settings).
- Main process: `SecurityEngine` orchestrates MCP calls, aggregates results, merges fixes.
- External: Semgrep MCP server (preferred transport: stdio for local reliability; optional streamable‑http).

### Runtime Flow
1. AI generates code (existing pipeline).
2. If auto‑fix enabled, run TypeScript problem check (existing).
3. Run Semgrep scan against changed files (new).
4. Generate auto‑fixes for eligible findings (new), apply in VFS → write.
5. Re‑scan; compute security score; emit UI events.

### Transport
- Default: stdio (invoke `semgrep-mcp` via Python `uvx`/`pipx`).
- Optional: streamable‑http on `127.0.0.1:8000` for debugging.

Reference details for transports and CLI: [semgrep/mcp](https://github.com/semgrep/mcp).

## 8) Installation & Environment
- Detect Semgrep MCP:
  - Preferred: `uvx semgrep-mcp` (Python/uv present) or `pipx install semgrep-mcp`.
  - Fallback: Docker `ghcr.io/semgrep/mcp` for machines without Python.
- Renderer shows guided installer if missing (like our AI features onboarding):
  - “Install Semgrep MCP” button (+ progress logs).
  - Post‑install verification.

## 9) IPC Contracts (Main ⇄ Renderer)
```ts
// security_handlers.ts (Main)
security:scan-code(params: { appId: number; files?: string[] })
  → { issues: SecurityIssue[]; summary: SecuritySummary; score: number }

security:auto-fix(params: { appId: number; issues: SecurityIssue[] })
  → { fixesApplied: number; errors: string[]; reScan: SecuritySummary }

security:get-dashboard(params: { appId: number })
  → SecurityDashboard
```

Types (abbrev):
```ts
interface SecurityIssue {
  id: string;
  ruleId: string;              // Semgrep rule id
  file: string;
  line: number;
  severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  title: string;               // human summary
  message: string;             // detailed description
  cwe?: string;
  owasp?: string;
  fix?: { patch?: string; suggestion?: string };
}

interface SecuritySummary {
  counts: { critical: number; high: number; medium: number; low: number };
}

interface SecurityDashboard {
  score: number;
  summary: SecuritySummary;
  recentScans: Array<{ when: string; score: number; summary: SecuritySummary }>;
  topIssues: SecurityIssue[];
}
```

## 10) UX / UI
- Preview Panel → “Security” tab with:
  - Security score badge + trends sparkline.
  - Issues table (filter by severity, file).
  - “Auto‑fix eligible” quick action.
- Toasts:
  - “🔒 Applied 3 security fixes” (link → diff view).
- Settings → Security:
  - Enable/disable scanning, enable auto‑apply low‑risk fixes.
  - Choose rule packs (Basic / Advanced / Compliance) → Pro gating.

## 11) Auto‑Fix Strategy
- Safe, small patches auto‑apply by default (e.g., escaping, parameterized queries, headers).
- Risky refactors require user approval with inline diffs.
- After fixes, re‑scan and update score.

## 12) Pricing / Gating
- Free: Basic OWASP Top 10 rules, manual fix suggestions, score.
- Pro: Advanced rules (CWE/SANS), compliance bundles, batch auto‑fix, exportable reports.

## 13) Risks & Mitigations
- Python/runtime missing → Guided install or Docker fallback.
- False positives → Allow dismiss/ignore rules per repo.
- Performance → Scan changed files first; full scan on demand.
- Platform variance (Win/macOS/Linux) → stdio first, robust process management.

## 14) Quality Pipeline Handshake (Build → Security → Tests)
A single orchestrated pipeline to unify problem detection and fixing across three sources:

### Deterministic Order
1. **Build‑time** (LLM auto‑fix): TypeScript/build errors, missing imports, type mismatches.
2. **Security** (Semgrep MCP): OWASP/CWE rules, safe auto‑patching, security score.
3. **Tests** (Playwright MCP): smoke/full/AXE suites, self‑healing selectors, targeted re‑runs.

### Triggers & Budget
- Trigger a “quality run” after any accepted code write.
- Max 2 full cycles or 3 minutes per run; short‑circuit on blockers.

### Publish Gate
- No compile errors.
- No CRITICAL/HIGH security issues unresolved.
- Smoke tests green.

### Unified Findings Schema
```ts
interface Finding {
  id: string;
  source: 'build' | 'security' | 'test';
  severity: 'blocker' | 'high' | 'medium' | 'low';
  file?: string; line?: number; ruleId?: string; message: string;
  suggestedFix?: { patch?: string; prompt?: string; steps?: string[] };
  autofixable: boolean;
}
```

## 15) Milestones & Timeline (4 weeks)
- Week 1: MCP process mgmt, detection, basic scan; UI skeleton; Settings.
- Week 2: Auto‑fix pipeline integration; score calculation; notifications.
- Week 3: Dashboard polish; rule pack selection; Pro gating; telemetry.
- Week 4: Docs, tests (unit/e2e), stability, performance, release.

## 16) Deliverables
- Main: `security_handlers.ts`, `SecurityEngine`, MCP process control, QualityOrchestrator hooks.
- Renderer: Security tab, Problems hub tabs (Build/Security/Tests), notifications, settings panel.
- Docs: User guide + admin setup.
- Tests: Unit (engine), integration (pipeline), e2e (user flows).

## 17) Task Management (Epics → Tasks)

### Epic A — MCP Runtime & Detection
- A1: Detect `semgrep-mcp` locally (uvx/pipx) and via Docker fallback.
- A2: Start/stop MCP (stdio) with robust process control; Windows support.
- A3: Health/status IPC (`security:status`).
- A4: Settings UI for install/check + logs.

### Epic B — Scanning Pipeline
- B1: `security:scan-code` IPC + `SecurityEngine.scan()`.
- B2: Diff‑aware scan (changed files only); full scan on demand.
- B3: Map Semgrep results → `SecurityIssue` model.
- B4: Score algorithm (severity‑weighted).

### Epic C — Auto‑Fix Integration
- C1: Merge security scan into existing LLM auto‑fix loop (after TS check).
- C2: Auto‑apply low‑risk patches; prompt for risky; re‑scan; emit events.
- C3: Normalize to unified `Finding` and feed Problems hub.

### Epic D — Test Phase (Playwright MCP)
- D1: IPC to run smoke/full/AXE suites; collect failures/perf/AXE.
- D2: Self‑healing: selector stabilization + minimal diff proposal + targeted re‑run.
- D3: Normalize findings to `Finding`; publish gate enforcement.

### Epic E — Orchestrator & UI/UX
- E1: `QualityOrchestrator` to run Build→Security→Tests with budgets.
- E2: Problems hub with tabs + diff viewer; Fix all safe (security) action.
- E3: Publish gate badges + toasts; history and trendline for score/tests.

### Epic F — Pro Features & Reporting
- F1: Gate advanced rule packs behind Pro.
- F2: Exportable reports (JSON/Markdown) + compliance presets (optional post‑MVP).

### Epic G — Quality
- G1: Unit tests (engine, score, mappers, orchestrator).
- G2: Integration tests (pipeline with sample repos).
- G3: e2e flows (create app → generate → scan → fix → test → publish gate).
- G4: Docs (user + dev + ops install).

## 18) Acceptance Criteria (MVP)
- On any generated change, Build→Security→Tests run in order; findings surface in Problems hub.
- Low‑risk security issues can be auto‑fixed; diffs viewable; security score increases.
- Tests auto‑heal simple flake; unresolved failures block publish with clear guidance.
- Missing MCP shows guided install and passes verification.
- Advanced rule packs gated for Pro and disabled otherwise.

---

References:
- Semgrep MCP repository and transports, install options: [semgrep/mcp](https://github.com/semgrep/mcp)
