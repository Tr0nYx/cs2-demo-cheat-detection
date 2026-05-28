# Phase 25: Better Result UI - Research

**Researched:** 2026-05-19
**Status:** Complete

## Implementation Shape

Phase 25 is best implemented as a frontend-only result dashboard refactor. Existing backend, Python scoring, TRACE, sensitivity, and viewer contracts already provide the necessary data. The safest plan is to add a small frontend view-model layer for player ordering, demo-level aggregate separation, feature explanation copy, and unavailable/confidence states, then consume that from redesigned result components and the existing `/results/{demoId}` route.

## Current Result Surface

`frontend/app/results/[id]/page.tsx` currently renders:

- `ConsoleHeader` and a match-report link.
- `ResultsCard` for pending/error/done result states.
- `TraceCard` and `SensitivityTuner` side by side.
- `DemoViewer` below the result stack.

`ResultsCard` currently owns too much presentation at once: overall summary, player cards, demo-level aggregate warning, download link, and feature table usage. `FeatureTable` supports expanded evidence metadata, but its expanded content leads with raw `Method:` fields and measurement chips rather than reviewer-friendly explanations.

## Recommended Architecture

Add a pure helper module, likely `frontend/lib/result-dashboard.ts`, that:

- Separates real players from demo-level aggregate placeholder results such as Steam ID `0`.
- Sorts real players by review priority using score, verdict, confidence, and available evidence.
- Builds top feature summaries from each player’s feature list.
- Produces plain-language feature explanation copy for `aimbot`, `triggerbot`, `wallhack`, `recoil`, `bhop`, and `session`.
- Converts low-confidence, capped-score, missing-evidence, parser-gap, and unavailable states into visible UI flags without changing scores.

This keeps the route and components declarative while avoiding new backend assumptions.

## UI Direction

The result page should behave like an operational evidence dashboard:

- First viewport: status/provenance, overall research signal, top review signals, and navigation to match/player/viewer surfaces.
- Default tab: `Players`, with a ranked responsive table and selected-player evidence detail.
- Other tabs: `TRACE`, `Sensitivity`, and `Viewer`, reusing existing `TraceCard`, `SensitivityTuner`, and `DemoViewer`.
- Styling: data-dense console patterns, not a marketing hero. Use existing `ConsolePage`, `ConsoleHeader`, `ConsolePanel`, `StatusBadge`, `DataValue`, and `ResearchSignalNotice`.
- Severity: calm but visible. High scores can use existing semantic signal colors, but copy must stay review/research/confidence oriented.

## Feature Explanation Strategy

Feature evidence should start with `Why this score?` and explain the score in natural language:

- `aimbot`: snap behavior, angular velocity/jerk, kill-window evidence, sample limits.
- `triggerbot`: repeated fire/kill reaction windows and instant timing signals.
- `wallhack`: pre-aim, crosshair-on-peek, and sound/info timing proxies.
- `recoil`: spray pattern correlation, known weapon basis, and consistency.
- `bhop`: jump-land timing, perfect jump ratio, and sequence length.
- `session`: round-to-round consistency, variance, and warmup-curve absence.

Raw method names should remain available as secondary provenance or technical detail. If evidence is missing, the UI should say that directly instead of promoting opaque method names as the primary explanation.

## Testing Approach

Focused tests should cover:

- View-model sorting, aggregate separation, profile-link eligibility, and feature explanation text.
- Dashboard component rendering for pending, error, no-player, aggregate-only, low/high/capped confidence states.
- Route-level tab behavior for Players, TRACE, Sensitivity, and Viewer using mocked hooks/components where needed.
- Research language guard rejecting proof/enforcement terms in new result UI files.
- Playwright smoke for `/results/{demoId}` at desktop and mobile viewports, preferably route-mocked so it does not depend on local database fixtures.

## Pitfalls

- Do not introduce frontend scoring logic that changes persisted suspicion, TRACE, confidence, or labels.
- Do not fabricate teams, scores, weapon context, player profile availability, or evidence strings not present in payloads.
- Do not make the dashboard a broad Phase 19 redesign. Keep scope to `/results/{demoId}` and result-related components.
- Do not duplicate `DemoViewer`, heatmap, TRACE, or sensitivity behavior. Reuse existing modules behind tabs.
- Avoid copy such as `cheater`, `proof`, `ban`, `conviction`, or accusatory language.

## Validation Architecture

The phase is verifiable through unit/component tests plus a browser smoke pass:

- Unit: `frontend/__tests__/lib/result-dashboard.test.ts`
- Component: `frontend/__tests__/components/ResultsDashboard/*.test.tsx` or equivalent colocated tests.
- Route: `frontend/__tests__/components/ResultsDashboard/ResultsPageIntegration.test.tsx`
- Language guard: `frontend/__tests__/components/ResultsDashboard/ResultResearchLanguage.test.tsx`
- E2E: `frontend/e2e/results-dashboard.spec.ts`

Final verification should run targeted Jest tests, lint for touched files, `npm run build`, and Playwright smoke. Standalone `npx tsc --noEmit --pretty false` may still be blocked by pre-existing e2e type issues noted after Phase 24; any such failure should be documented rather than hidden.
