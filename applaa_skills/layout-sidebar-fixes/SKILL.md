---
name: layout-sidebar-fixes
description: Fix main app layout and left sidebar issues—chat/main content trimmed, sidebar too wide when toggled, extra top space. Use when the left menu trims the chat, the sidebar gap doesn't match the visible sidebar width, or there is unwanted space at the top of the sidebar.
---

# Layout & Sidebar Bug Fixes

Proven fixes for main app layout and left sidebar (AppSidebar) issues.

---

## When to Use This Skill

| Symptom | Use this skill |
|--------|-----------------|
| Chat or main content is trimmed / cut off on the right | Yes |
| Left menu (sidebar) overlaps or trims the chat when toggled | Yes |
| Sidebar with icons is wider than the reserved gap (toggle state) | Yes |
| Unwanted empty space at top of sidebar (above hamburger) | Yes |
| Academy (AI or Learning) sidebar "Main menu" not visible / cut off | Yes (see academy layouts below) |

---

## 1. Main App: Content Trimmed (Chat / Main Area Cut Off)

**Cause:** The main content area was not a proper flex child or the root could grow/scroll, so the chat panel got less width or overflow was clipped.

**Files:** `src/app/layout.tsx`, `src/pages/chat.tsx`

**Fixes applied:**

- **Root constraint:** `SidebarProvider` must have a fixed height and no overflow so the page doesn’t scroll.  
  - Add: `className="flex h-screen w-full overflow-hidden"` on `SidebarProvider`.

- **Main row wrapper:** Wrap sidebar + status bars + content in one flex row with bounded size:  
  - A single wrapper div: `className="flex flex-1 min-h-0 min-w-0 mt-12 overflow-hidden"` so the row takes remaining space and doesn’t grow the viewport.

- **Content area:** The div that wraps route `children` must shrink and contain overflow:  
  - Use `flex-1 min-w-0 min-h-0 overflow-hidden` on the content wrapper and an inner div around `children` with `min-w-0 flex-1 min-h-0 overflow-hidden w-full`.

- **Chat page:** So the chat panel doesn’t force width, give the resizable panel root a constrained width:  
  - On the `PanelGroup` in `src/pages/chat.tsx` add: `className="min-w-0 w-full h-full"`.

**Do not:** Use `overflow-x-hidden` on the main content wrapper without also giving it `min-w-0` and a proper flex parent; that clips content instead of giving the chat the right width.

---

## 2. Left Sidebar: Wider When Toggled (Trim / Overlap)

**Cause:** The reserved “gap” width (layout flow) didn’t match the actual sidebar width. When expanded, the sidebar content (icon column + 240px panel) was wider than the gap, so the sidebar overlapped the main content.

**File:** `src/components/app-sidebar.tsx`

**Fixes applied:**

- **Expanded width:** Icon column is `w-16` (4rem) and right panel is `w-[240px]`, so total = 19rem.  
  - Set `--sidebar-width` when expanded (Apps or Settings selected) to **19rem**, not 18rem.

- **Collapsed width:** Use a single, consistent width for the icons-only state so the gap matches the visible sidebar.  
  - Set `--sidebar-width-icon` to **5rem** (enough for `w-16` icons).  
  - When not expanded, set `--sidebar-width` to **5rem** so the gap matches.

**Example:**

```ts
style={{
  '--sidebar-width': shouldExpand ? '19rem' : '5rem',
  '--sidebar-width-icon': '5rem'
}}
```

**Do not:** Use 18rem when the content is 64px + 240px (19rem), or use different values for gap vs. fixed sidebar; that causes trim/overlap when toggling.

---

## 3. Sidebar: Unwanted Space at Top (Above Hamburger)

**Cause:** Extra top margin on the sidebar content pushed the hamburger and icons down.

**File:** `src/components/app-sidebar.tsx`

**Fix:** Remove top margin from the inner content wrapper.  
- Remove `mt-8` from the div that wraps `SidebarTrigger` and `AppIcons` (the one with `flex flex-1 min-h-0 overflow-auto`).  
- The sidebar already starts below the title bar via `top-12` on the Sidebar; no extra margin is needed.

**Do not:** Add `mt-8` or other top margin on that inner content div; it creates a visible gap above the hamburger.

---

## 4. Sidebar: Height and Scrolling

**File:** `src/components/app-sidebar.tsx`

- **Position below title bar:** On `Sidebar`, add `className="top-12 h-[calc(100vh-3rem)]"` so the sidebar doesn’t cover the title bar and fits in the viewport.
- **Scrollable middle:** So the list of icons can scroll and the footer (e.g. R ULTRA, Help) stays visible, use:
  - `SidebarContent`: `className="flex flex-col h-full min-h-0 overflow-hidden"`.
  - Inner scrollable div: `className="flex flex-1 min-h-0 overflow-auto"` (no `mt-8`).

---

## 5. Academy Layouts: “Main menu” Visible and No Trim

**Cause:** Academy layout roots used a fixed viewport height that overflowed their parent, so the bottom “Main menu” link was off-screen or the layout was clipped.

**Files:** `src/pages/academy/AcademyLayout.tsx`, `src/pages/learning-academy/LearningAcademyLayout.tsx`

**Fix:** Use the parent’s height instead of a viewport calc.  
- Change the root div from `h-[calc(100vh-var(--title-bar-height,0px))]` to **`h-full min-h-0`** so the layout fills the parent (the layout wrapper that already has `h-screenish` or similar) and can shrink in a flex context.

**Do not:** Use `100vh` or `calc(100vh - ...)` on the academy layout root when it’s inside a parent that has a smaller height (e.g. `h-screenish`); that causes overflow and trimming.

---

## Quick Reference

| Issue | File | Change |
|-------|------|--------|
| Chat trimmed | layout.tsx | SidebarProvider: `flex h-screen w-full overflow-hidden`; main row wrapper with `flex flex-1 min-h-0 min-w-0 mt-12 overflow-hidden`; content wrapper + inner with `min-w-0 flex-1 min-h-0 overflow-hidden` |
| Chat trimmed | chat.tsx | PanelGroup: `className="min-w-0 w-full h-full"` |
| Sidebar wider when toggled | app-sidebar.tsx | `--sidebar-width`: 19rem when expanded, 5rem when not; `--sidebar-width-icon`: 5rem |
| Space on top left of sidebar | app-sidebar.tsx | Remove `mt-8` from inner content div |
| Academy Main menu cut off | AcademyLayout, LearningAcademyLayout | Root div: `h-full min-h-0` instead of `h-[calc(100vh-...)]` |
