---
name: webapp-apps
description: Work with web applications in Applaa (React, Next.js, Vue, Svelte). Use when creating webapps, debugging preview issues, working with templates, or handling the unified preview system. Also use for Shadcn UI components and TanStack Router.
---

# Webapp Apps

React and Next.js web application development.

## Templates

**Location:** `webapp-templates/`

| Template | Stack | Default Port |
|----------|-------|--------------|
| React | Vite + React + TypeScript + Shadcn | 3000 |
| Next.js | Next.js 15 + React 19 + Shadcn | 3000 |

Both include:
- Shadcn UI component library
- Tailwind CSS
- TypeScript
- TanStack Router (React) / App Router (Next.js)

## App Structure

**React (Vite):**
```
apps/{appName}/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   └── ui/              # Shadcn components
│   ├── hooks/
│   └── lib/
├── public/
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

**Next.js:**
```
apps/{appName}/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── ui/
├── lib/
├── public/
├── package.json
├── next.config.js
└── tailwind.config.js
```

## Creation Flow

```typescript
// src/ipc/handlers/createFromTemplate.ts
1. Template selection (react or next)
2. Copy template files to app directory
3. Install dependencies (installApplaaApprovedDependencies)
4. Add site policy file
5. Initialize git repository
6. Create database entry (appType: 'web')
```

## Preview System

**Unified Preview Manager:** `src/preview/UnifiedPreviewManager.ts`

```typescript
// Start preview
"unified-preview:start" → { url, port }

// Stop preview
"unified-preview:stop" → { success }

// Get state
"unified-preview:get-state" → { status, url, port }
```

**Preview Control Plane:** `src/preview/PreviewControlPlane.ts`
- Process orchestration
- Port management
- Health monitoring

**Commands by Template:**
| Template | Dev Command | Port |
|----------|-------------|------|
| React | `npm start` | 3000 |
| Next.js | `npm run dev` | 3000 |
| Vue | `npm run dev` | 5173 |

## Shadcn UI Integration

Components in `src/components/ui/`:

```tsx
// Using Button
import { Button } from "@/components/ui/button";

<Button variant="default">Click me</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
```

**Common Components:**
- Button, Input, Label, Textarea
- Card, Dialog, Sheet
- Table, Tabs, Accordion
- Select, Checkbox, Radio
- Toast, Alert, Badge

## TanStack Router (React Template)

```tsx
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => <Outlet />,
})

// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})
```

## IPC Handlers

```typescript
// List web app templates
"web-apps:list" → WebAppTemplate[]

// App creation uses general app handlers
"app:create" → { appId, path }
```

## Preview Component

```tsx
// src/components/webapp/WebappPreview.tsx
const { status, url, start, stop, refresh } = useWebappPreview(appId);

// States: idle, starting, running, error
```

## Build Commands

```bash
# React (Vite)
npm run dev      # Development
npm run build    # Production build
npm run preview  # Preview production

# Next.js
npm run dev      # Development
npm run build    # Production build
npm start        # Start production
```

## Preview Shows Old App When Switching – ALWAYS check when preview looks wrong

**Symptom:** When switching between web apps, the preview briefly shows the old app for a few seconds before showing the current one.

**Root cause:** `appUrlAtom` holds `{ appUrl, appId, originalUrl }`. `selectedAppId` updates immediately on app switch, but components use `appUrl` without checking `appId === selectedAppId`, so they render the previous app's URL for one or more frames.

**Fix:** In `PreviewIframe.tsx` (and any component/hook using `appUrlAtom` for preview/iframe, readiness, testing, or timeout logic):

1. Use the full `appUrlObj` from `appUrlAtom`.
2. Compute `effectiveAppUrl` / `effectiveOriginalUrl` only when `appUrlObj.appId === selectedAppId`; otherwise use `null`.
3. Use `effectiveAppUrl` for: iframe `src`, loader/empty state checks, navigation history init, postMessage `baseUrl`, URL resolution.
4. Use `effectiveOriginalUrl` for "Open in Browser" and preview-ready checks.
5. Apply the same guard pattern in related consumers (not just iframe rendering):
   - `PreviewPanel.tsx` loading/ready conditions
   - `TestingPanel.tsx` app URL passed to tests
   - `useWebPreviewTimeout.ts` status/timeout checks

```tsx
const appUrlObj = useAtomValue(appUrlAtom);
const { appUrl, originalUrl } = appUrlObj ?? { appUrl: null, originalUrl: null };
const belongsToCurrentApp = appUrlObj && 'appId' in appUrlObj && appUrlObj.appId === selectedAppId;
const effectiveAppUrl = belongsToCurrentApp && appUrl ? appUrl : null;
const effectiveOriginalUrl = belongsToCurrentApp && originalUrl ? originalUrl : null;
```

**Rule:** When preview shows wrong/stale app content when switching apps, check **all** `appUrlAtom` consumers (components and hooks) and ensure `appId === selectedAppId` before using the URL.

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Preview shows old app when switching | appUrl used without appId check | Use effectiveAppUrl (see above) |
| Preview not starting | Port in use | Kill process on port 3000 |
| Build fails | Missing dependencies | `npm install` |
| Shadcn not working | Missing components | Add via `npx shadcn-ui@latest add` |
| Hot reload broken | Vite cache | Delete `.vite` folder |
| TypeScript errors | Type mismatch | Check tsconfig.json |

## Environment Variables

```env
# .env.local (Next.js) or .env (Vite)
VITE_API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

**Vercel (recommended):**
- Auto-detects Next.js and Vite
- Creates `vercel.json` if needed
- Handles environment variables

**Static Export:**
```bash
# React: npm run build → dist/
# Next.js: npm run build → .next/ (or out/ for static)
```
