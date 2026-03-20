---
name: ai-academy
description: AI Academy in Applaa—routes, layout, pages, and patterns. Use when adding or changing AI Academy features, routes, sidebar nav, or styling (indigo theme).
---

# AI Academy

AI Academy is the coding/AI learning section of the app. It has its own layout (no main app sidebar) and a fixed left sidebar with nav and "Main menu" at the bottom.

---

## When to Use This Skill

- Adding or changing AI Academy routes or pages
- Changing AI Academy sidebar nav or "Main menu" link
- Fixing layout/visibility issues on `/academy` or sub-routes
- Matching patterns used in Learning Academy (see learning-academy skill for comparison)

---

## Routes & Files

**Route config:** `src/routes/academy.tsx`  
**Layout:** `src/pages/academy/AcademyLayout.tsx`  
**Pages:** `src/pages/academy/`

| Path | Component | Purpose |
|------|-----------|---------|
| `/academy` | AcademyDashboard | Dashboard |
| `/academy/learn` | AcademyLearn | Learn (tracks, lessons) |
| `/academy/playground` | AcademyPlayground | Playground |
| `/academy/challenges` | AcademyChallenges | Challenges |
| `/academy/projects` | AcademyProjects | Projects list |
| `/academy/projects/$projectId` | AcademyProjectDetail | Project detail |

All these routes use **AcademyLayout** (sidebar + `<Outlet />`). The main app sidebar is hidden when `pathname.startsWith("/academy")` (see `src/app/layout.tsx`).

---

## Layout Pattern

- **Root:** `flex h-full min-h-0` (must use `h-full min-h-0` so the layout fits the parent and doesn’t overflow; do not use `100vh` calc here).
- **Sidebar:** `aside` with `w-56`, `flex flex-col shrink-0 h-full min-h-0`, then:
  - Header block: `shrink-0`
  - Nav: `flex-1 min-h-0 overflow-y-auto`
  - Bottom "Main menu" block: `shrink-0` with link to `/` and `aria-label="Back to main menu"`.
- **Main content:** `main` with `flex-1 overflow-auto` and `<Outlet />`.

Theme: **indigo** (e.g. `indigo-600`, `indigo-100`, `indigo-800`, `dark:bg-indigo-900/50`, `dark:text-indigo-200` for active states).

---

## Sidebar Nav Items

Defined in `AcademyLayout.tsx` as `navItems`:

- Dashboard → `/academy`
- Learn → `/academy/learn`
- Playground → `/academy/playground`
- Challenges → `/academy/challenges`
- Projects → `/academy/projects`

Active state for Projects must handle both `/academy/projects` and `/academy/projects/$projectId` (e.g. `pathname === "/academy/projects" || pathname.startsWith("/academy/projects/")`).

---

## Main Menu Link

At the bottom of the sidebar there is a "Main menu" link (Home icon) to `/`. It must stay in a `shrink-0` block so it’s always visible. Use the same structure as in [layout-sidebar-fixes](../layout-sidebar-fixes/SKILL.md) and [learning-academy](../learning-academy/SKILL.md) (background strip, indigo styling, `aria-label="Back to main menu"`).

---

## Adding a New Route

1. In `src/routes/academy.tsx`: create a route with `getParentRoute: () => academyRoute`, path, and component.
2. In `AcademyLayout.tsx`: add an entry to `navItems` with `to`, `label`, and `icon`.
3. For "Projects"-style active state (path + subpaths), mirror the existing Projects `isActive` logic.

---

## Common Pitfalls

- **Layout overflow:** Using `h-[calc(100vh-...)]` on the academy layout root causes the bottom of the sidebar (including "Main menu") to be cut off. Use `h-full min-h-0` instead.
- **Main app sidebar:** It is intentionally hidden on `/academy`; don’t show it for academy routes.
- **Styling:** Keep indigo for AI Academy; Learning Academy uses teal so the two stay visually distinct.

---
## Lesson Navigation UX (Back/Next + pickers)

Use these patterns when updating `src/pages/academy/` lesson/assignment flows:

### Academy Learn (lesson detail)
- Back button should NOT use `history.back()` (it can land on an unrelated previous flow after deep navigation).
  - Always navigate to the track’s Learn page instead:
    - route: `/academy/learn`
    - search: `{{ track }}`
  - label should be:
    - `Back to {track}` (e.g. `Back to JavaScript`)
- For track lesson detail pages, show:
  - A top line `Next lesson: <lesson title>` (or `Last lesson`)
  - A collapsible picker (e.g. via `details/summary`) to browse all lessons in the current track
  - Keep bottom navigation buttons for `Previous` and `Next` between lessons
- For concept sub-topic pages:
  - Back label should be `Back to {blockLabel}`
  - Add `Previous`/`Next` sub-topic navigation alongside the Back control
  - The Back control should also navigate to the parent concept block’s Learn page:
    - route: `/academy/learn`
    - search: `{{ track: blockId }}` (where `blockId` is the current concept block id used by the page)

### Academy Challenges (assignment detail)
- Challenges page must use full-height scrolling:
  - Root container: `h-full flex flex-col`
  - Main row: `flex-1 min-h-0`
  - Left list container: `flex-1 min-h-0 overflow-y-auto` (avoid small fixed max-heights)
- Back label should be `Back to {track}` (e.g. `Back to Python`)
- Both the top Back and bottom “Back to …” links must navigate to the track’s main Learn page:
  - `/academy/learn` with `search={{ track }}`
  - Do not use history-back here (so it doesn’t land one step back)
- Challenges can optionally be opened from a specific lesson; when using URL navigation, ensure the route search includes:
  - `track`, `lessonId`, `challengeId`

### Academy Projects (project detail)
- Back navigation should return via history (so it returns to the previous flow step).
