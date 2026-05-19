# Phase 19 Patterns: Frontend Console Redesign

## Existing Structure

- App routes:
  - `frontend/app/page.tsx` public landing page.
  - `frontend/app/dashboard/page.tsx` authenticated dashboard.
  - `frontend/app/results/[id]/page.tsx` demo result detail.
  - `frontend/app/leaderboards/page.tsx` filtered leaderboard.
  - `frontend/app/analytics/trends/page.tsx` trends.
  - `frontend/app/players/[playerId]/compare/page.tsx` player comparison.
- Shared app shell:
  - `frontend/app/layout.tsx`
  - `frontend/components/Navbar.tsx`
  - `frontend/components/Providers.tsx`
- API/hooks:
  - `frontend/lib/api.ts`
  - `frontend/lib/types.ts`
  - `frontend/lib/hooks/*`
- UI primitives:
  - `frontend/components/ui/*`

## Patterns To Introduce

### Console Components

Create `frontend/components/Console/` with these likely components:

- `ConsolePage`: authenticated work-surface wrapper with consistent background, width, padding, and optional page density.
- `ConsoleHeader`: title, subtitle, metadata row, action slot, and optional `ResearchSignalNotice`.
- `ConsolePanel`: panel primitive layered on top of shadcn `Card` style but using Phase 19 semantic tokens.
- `ConsoleMetric`: compact status/metric tile for pipeline counts and analysis values.
- `StatusBadge`: consistent status/severity/provenance badge for demo status, import status, tracking status, suspicion bands, TRACE availability, and errors.
- `ResearchSignalNotice`: calm reusable notice for research/provenance boundaries.
- `DataValue`: mono-formatted IDs, sharecodes, ticks, calibration IDs, numeric scores, and timestamps.
- `ResponsiveDataList`: shared table-on-desktop/card-list-on-mobile pattern.

### Styling Pattern

- Add semantic CSS variables in `frontend/app/globals.css` and map them into Tailwind theme variables.
- Prefer utility classes based on semantic tokens, e.g. `bg-surface-panel`, `text-signal-review`, `border-border-subtle`, once mapped.
- Keep raw `gray`/`zinc` usage mainly inside low-level primitives, not feature surfaces.
- Keep radius at or below the existing card radius unless a component is a modal or repeated item.

### Accessibility Pattern

- Every custom clickable card/button must include:
  - `cursor-pointer`
  - `focus-visible:outline-none`
  - `focus-visible:ring-2`
  - a semantic `aria-label` when visible text is insufficient
- Every color-coded state must also include text/icon/shape.
- Tables and charts need labels and exact values, not only color.

### Test Pattern

- Component tests live under `frontend/__tests__/components/...`.
- Hook tests live under `frontend/__tests__/hooks` or `frontend/__tests__/lib/hooks`.
- Playwright specs live under `frontend/e2e`.
- Prefer route-mocked Playwright tests for UI/responsive verification to avoid backend availability.

## Migration Pattern

1. Build console primitives and keep old surfaces working.
2. Migrate one page/surface at a time.
3. Keep data hooks/API contracts stable.
4. Add tests for primitives before using them widely.
5. Use Playwright for final responsive and keyboard smoke, not for every tiny component state.

## Surfaces And Closest Existing Analogs

| New/Migrated Surface | Closest Current Analog | Notes |
|----------------------|------------------------|-------|
| Console shell | `frontend/app/dashboard/page.tsx`, `frontend/app/leaderboards/page.tsx` | Normalize into a shared wrapper. |
| Research notice | Existing copy in leaderboards and Steam card | Make reusable and calmer. |
| Status badge | `VerdictBadge`, hard-coded status spans | Expand into consistent non-proof language. |
| Dashboard status metrics | `SteamMatchHistoryCard` status items | Promote to top-level workflow summary. |
| Responsive data list | `DemoHistoryTable` desktop/mobile split | Generalize for history/leaderboards/filter demos. |
| TRACE sections | `TraceCard`, `TraceComponentChart`, `TraceChart` | Reorganize rather than rewrite scoring logic. |
| Viewer inspector | `DemoViewer` aside, `Timeline` | Keep data hooks, improve layout/responsiveness. |
