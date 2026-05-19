# Phase 19 Research: Frontend UI/UX Analysis Console Redesign

## Research Complete

Phase 19 should be executed as a staged console redesign, not as a disconnected visual refresh. The current frontend already has the required product capabilities: authenticated dashboard, filtered demos, quick upload, Steam match-history tracking, results, TRACE, sensitivity tuning, demo viewer, heatmaps, analytics trends, leaderboards, and player comparison. The implementation risk is mostly integration and UX consistency, not missing backend capability.

## Technical Baseline

- Stack: Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, shadcn/base-ui primitives, React Query 5, Recharts, Jest, Testing Library, Playwright.
- Frontend instruction: `frontend/AGENTS.md` requires reading relevant Next docs under `frontend/node_modules/next/dist/docs/` before writing app code because this Next version may differ from prior assumptions.
- Root app shell currently loads `Navbar`, `Providers`, Geist fonts, and `globals.css` in `frontend/app/layout.tsx`.
- Global theme tokens in `frontend/app/globals.css` are mostly monochrome and do not yet encode product concepts such as research signal, TRACE, heatmap, pipeline status, or console surfaces.
- Existing reusable UI primitives live under `frontend/components/ui`.
- Existing feature components use many hard-coded Tailwind color families (`gray`, `zinc`, `blue`, `cyan`, `emerald`, `yellow`, `red`), producing multiple visual languages.

## UX Direction

The UI/UX review and `ui-ux-pro-max` skill point to a data-dense analysis console:

- Dark/OLED-friendly default look with strong contrast.
- Neutral greys for structure, trust blue for primary actions/context, orange/hot accents for review-priority states, and green/yellow/red only for status/severity.
- Swiss/grid-like composition: predictable page shells, compact panels, consistent max widths, and no marketing-style hero composition inside authenticated tools.
- Evidence hierarchy: summary first, evidence next, interactive exploration last.
- Research-signal framing: visible but calm reminders that suspicion, TRACE, leaderboards, Steam metadata, and match-history metadata are review signals/provenance, not proof.
- Accessibility: visible keyboard focus, no color-only meaning, labels/legends on charts, responsive behavior at 320px/768px/1024px/1440px, no mobile horizontal scroll.

## Local Code Findings

### Strong Patterns To Reuse

- `frontend/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `alert.tsx`, `tabs.tsx`, `table.tsx`, `skeleton.tsx`, `input.tsx`, and `label.tsx` provide a reusable primitive layer with good focus-state foundations.
- `frontend/lib/hooks/*` already isolates API data loading, especially React Query hooks for TRACE, filtered demos, filtered leaderboards, trends, viewer rounds/events/ticks, and match-history status.
- `frontend/lib/types.ts` centralizes DTO types for demo status, TRACE, feature vectors, viewer data, filters, trends, and leaderboards.
- Existing tests cover many components and hooks; Phase 19 should extend them instead of replacing the test strategy.
- Demo viewer already uses Canvas for rendering and avoids per-tick DOM nodes.

### Weak Patterns To Replace

- Page shells are inconsistent: dashboard uses custom dark panels, results and leaderboards use mixed light/dark card layouts, player comparison is mostly light-mode.
- High-impact copy sometimes uses generic wording such as "Safe", "Loading", "Analysis Results", or "Overall Suspicion Level" without enough research-context framing.
- Some text glyphs or mojibake-like artifacts appear in interactive chrome and should be replaced by Lucide icons.
- Custom button/card-like controls often lack explicit focus rings and consistent `cursor-pointer` behavior.
- Leaderboard component values are compressed into text rather than readable comparison visuals.
- Analytics trends page lacks enough scope/context around charts.
- Dashboard distributes ingestion, tracking, filters, scoped demos, and history across side rails and sections without a clear "what needs attention" hierarchy.

## Implementation Strategy

Plan this as five waves:

1. **Console foundation**: semantic design tokens, shared console primitives, status badges, research notice, typography/data-value styles, glyph/focus polish.
2. **Dashboard workflow**: regroup ingestion actions, tracking status, pipeline status, scoped demos, filters, and history into a task console.
3. **Results/TRACE explainability**: evidence-first layout, clearer TRACE sections, neutral sensitivity tuner, no placeholder calibration facts.
4. **Viewer/heatmap UX**: replay-like controls, stable inspector, responsive layout, legends, color semantics.
5. **Analytics/tables/forms/accessibility verification**: leaderboards mini-bars, trend scope, shared tables/card-list behavior, inline validation, copy/error taxonomy, Playwright responsive/a11y smoke.

This sequence reduces risk because design primitives land first, then high-value workflow surfaces migrate one by one.

## Constraints For Plans

- Do not change Symfony or Python scoring semantics.
- Do not alter suspicion, TRACE, label, model confidence, or player trust based on Steam metadata or match-history provenance.
- Preserve backend API contracts unless a plan explicitly states a compatible frontend-only adaptation.
- Do not introduce new UI libraries unless existing primitives cannot meet the requirement.
- Keep landing page changes minimal; Phase 19 targets authenticated analysis workflows.
- Use Lucide icons; avoid emoji icons and fragile text glyphs.
- Prefer shadcn/base-ui primitives and local helpers over ad hoc markup.
- Maintain tests while refactoring; add focused tests for shared primitives and migrated pages.

## Verification Strategy

Per-wave verification should use focused unit/component tests plus final browser validation:

- `cd frontend; npm test`
- `cd frontend; npm run lint`
- `cd frontend; npm run e2e`
- Playwright screenshots or snapshots for dashboard, results, viewer, analytics, leaderboards, and player comparison at 320px, 768px, 1024px, 1440px.
- Keyboard smoke for navbar, filters, dashboard rows, forms, viewer controls, timeline, tabs, and tables.
- Manual dark/light contrast review for muted text and transparent panels.
