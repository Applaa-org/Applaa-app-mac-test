---
name: learning-academy
description: Learning Academy in Applaa—routes, layout, pages, and patterns. Use when adding or changing Learning Academy features, routes, sidebar nav, or styling (teal theme).
---

# Learning Academy

Learning Academy is the curriculum/school-style learning section. It has its own layout (no main app sidebar) and a fixed left sidebar with nav and "Main menu" at the bottom.

---

## When to Use This Skill

- Adding or changing Learning Academy routes or pages
- Changing Learning Academy sidebar nav or "Main menu" link
- Fixing layout/visibility issues on `/learning-academy` or sub-routes
- Matching patterns used in AI Academy (see ai-academy skill for comparison)

---

## Routes & Files

**Route config:** `src/routes/learning-academy.tsx`  
**Layout:** `src/pages/learning-academy/LearningAcademyLayout.tsx`  
**Pages:** `src/pages/learning-academy/`

| Path | Component | Purpose |
|------|-----------|---------|
| `/learning-academy` | LearningAcademyDashboard | Dashboard |
| `/learning-academy/curriculum` | LearningAcademyCurriculum | Curriculum |
| `/learning-academy/curriculum/$subjectId/$topicId` | LearningAcademyCurriculumTopic | Topic detail |
| `/learning-academy/schedule` | LearningAcademySchedule | Year 11 schedule |

All these routes use **LearningAcademyLayout** (sidebar + `<Outlet />`). The main app sidebar is hidden when `pathname.startsWith("/learning-academy")` (see `src/app/layout.tsx`).

---

## Layout Pattern

- **Root:** `flex h-full min-h-0` (must use `h-full min-h-0` so the layout fits the parent and doesn’t overflow; do not use `100vh` calc here).
- **Sidebar:** `aside` with `w-56`, `flex flex-col shrink-0 h-full min-h-0`, then:
  - Header block: `shrink-0`
  - Nav: `flex-1 min-h-0 overflow-y-auto`
  - Bottom "Main menu" block: `shrink-0` with link to `/` and `aria-label="Back to main menu"`.
- **Main content:** `main` with `flex-1 overflow-auto` and `<Outlet />`.

Theme: **teal** (e.g. `teal-600`, `teal-100`, `teal-800`, `dark:bg-teal-900/50`, `dark:text-teal-200` for active states).

---

## Sidebar Nav Items

Defined in `LearningAcademyLayout.tsx` as `navItems`:

- Dashboard → `/learning-academy`
- Curriculum → `/learning-academy/curriculum`
- Year 11 schedule → `/learning-academy/schedule`

Active state for the index route: `pathname === "/learning-academy" || pathname === "/learning-academy/"`. For schedule, exact match only: `pathname === "/learning-academy/schedule"`. For curriculum, `pathname.startsWith(to)`.

---

## Main Menu Link

At the bottom of the sidebar there is a "Main menu" link (Home icon) to `/`. It must stay in a `shrink-0` block so it’s always visible. Use the same structure as in [layout-sidebar-fixes](../layout-sidebar-fixes/SKILL.md) and [ai-academy](../ai-academy/SKILL.md) (background strip, teal styling, `aria-label="Back to main menu"`).

---

## Adding a New Route

1. In `src/routes/learning-academy.tsx`: create a route with `getParentRoute: () => learningAcademyRoute`, path, and component.
2. In `LearningAcademyLayout.tsx`: add an entry to `navItems` with `to`, `label`, and `icon`.
3. For active state, follow the same pattern as existing items (exact match for index/schedule, `startsWith` for curriculum).

---

## Common Pitfalls

- **Layout overflow:** Using `h-[calc(100vh-...)]` on the academy layout root causes the bottom of the sidebar (including "Main menu") to be cut off. Use `h-full min-h-0` instead.
- **Main app sidebar:** It is intentionally hidden on `/learning-academy`; don’t show it for learning-academy routes.
- **Styling:** Keep teal for Learning Academy; AI Academy uses indigo so the two stay visually distinct.
