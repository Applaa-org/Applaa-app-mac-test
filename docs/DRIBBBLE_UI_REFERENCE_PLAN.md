# Dribbble UI Reference Integration Plan

## Objective
Give the LLM high‑quality visual context so that generated Expo apps are consistently modern, colorful, and polished. We will curate UI references from Dribbble (and similar sources) and feed condensed, actionable descriptions into the Expo system prompt (and later inject dynamically per app type).

## Constraints & Guardrails
- Do not embed third‑party images in the product without explicit license. Store links + our own textual summaries only.
- Keep prompt size within token budget: use short, high‑signal bullets; 5–8 lines per category.
- Avoid brand/style overfitting: provide multiple styles per category.

## Phased Delivery

### Phase 1 — Manual curation (quick win)
- Curate 10–15 top‑tier Dribbble shots per app category:
  - Food/Recipe, Fitness/Health, Finance, Shopping/E‑commerce, Travel, Social/Community, Productivity.
- For each shot, write a 2–4 line textual summary focused on: color palette, layout pattern, component ideas (cards, lists, badges, tab bar), and micro‑interactions.
- Produce a compact, category‑level “style capsule” (5–8 bullets) distilled from the best shots.
- Add a static “References” section to `src/prompts/expo_system_prompt.ts` (or a placeholder token) using the style capsules.

Deliverables:
- `docs/UI_REFERENCE_CATALOG.md` (links + 2–4 line summaries)
- Updated Expo prompt with concise, category style capsules

### Phase 2 — Structured references (scalable)
- Add a typed reference registry (no images), e.g. `src/prompts/ui_references.ts`:
  - Minimal schema: `{ id, category, title, url, colors[], components[], summary }`.
  - Export `getStyleCapsule(category): string[]` returning 5–8 high‑signal bullets.
- Update system‑prompt assembly to inject the correct capsule based on detected app type (from `appTypeDetector`).

Deliverables:
- `src/prompts/ui_references.ts` with initial categories
- Prompt assembly that injects per‑category capsules

### Phase 3 — Assisted curation pipeline (optional)
- Script to fetch candidate shots (via search or manual list), then:
  - Human selection → store link + short summary
  - Auto‑extract dominant colors (optional, local image analysis)
  - Generate capsule suggestions; human approve/edit

Deliverables:
- `tools/ui_ref_curate.(js|ts)` for assisted curation (local use)

### Phase 4 — Quality loop & A/B tests
- Compare “before vs after” app visual scores (internal heuristic + user thumbs‑up).
- Track: time‑to-first pleasing preview, user satisfaction, “wow factor” feedback.
- Iterate capsules quarterly to reflect trend shifts.

## Data Schema (Phase 2)
```ts
export type AppCategory =
  | "food"
  | "fitness"
  | "finance"
  | "shopping"
  | "travel"
  | "social"
  | "productivity";

export interface UIReferenceItem {
  id: string;
  category: AppCategory;
  title: string;
  url: string; // external link only
  colors: string[]; // hex strings, 3–5 max
  components: string[]; // e.g., ["gradient-header", "shadow-card", "badge"]
  summary: string; // 2–4 lines, actionable
}

export interface StyleCapsule {
  category: AppCategory;
  bullets: string[]; // 5–8 short, actionable lines
}
```

## Prompt Injection Design
- Short term (Phase 1): keep concise static capsules in `expo_system_prompt.ts` under a new section “DESIGN INSPIRATION (from curated references)”.
- Medium term (Phase 2): `constructSystemPrompt()` appends capsule based on detected app category.
- Rule: capsules must be text‑only, no code, no images, ≤ 8 bullets.

## Licensing & Compliance
- Only store: link, title, and our textual summary.
- Do not copy proprietary text or images.
- If showcasing examples publicly in docs, attribute with link and designer name.

## Acceptance Criteria
- New apps exhibit notably richer color, card design, and icon usage across categories.
- Visual quality rating improves (target ≥ 8/10 in internal review).
- Prompt size stays within safe limits; no regressions in generation stability.

## Next Actions (this week)
1. Create `docs/UI_REFERENCE_CATALOG.md` with 10 curated links per category and 2–4 line summaries.
2. Add a compact “DESIGN INSPIRATION” section to the Expo prompt using capsules for Food, Fitness, Finance (start with 3 categories).
3. Review visual output on 3 fresh apps; adjust capsules for clarity and brevity.
4. If results are strong, proceed to Phase 2 (typed registry + dynamic injection).







