# Phase 26: Umsetzung der Mercurial-Referenzideen fuer Result Dashboard - Research

**Researched:** 2026-05-28
**Status:** Complete

## Implementation Shape

Phase 26 should be a frontend-only refinement of the already-present Phase 25 result dashboard. The current codebase already contains the core baseline:

- `frontend/lib/result-dashboard.ts` builds ranked player rows, aggregate separation, score labels, feature explanations, and top review signals.
- `frontend/components/ResultsDashboard/ResultOverviewPanel.tsx` provides first-viewport status, overall signal, provenance, match report, and download actions.
- `frontend/components/ResultsDashboard/PlayerEvidenceTable.tsx` provides a responsive table/card pattern with selected row behavior.
- `frontend/components/ResultsDashboard/PlayerEvidenceDetail.tsx` provides selected-player feature detail with drivers, limitations, and technical provenance.
- `frontend/app/results/[id]/page.tsx` assembles the dashboard with `Players`, `TRACE`, `Sensitivity`, and `Viewer` tabs.

The safest approach is to extend the existing view-model and components, not replace them.

## Recommended Architecture

Add Phase 26 data shaping to `frontend/lib/result-dashboard.ts`:

- Coverage counts for real players, aggregate rows, high/review signals, limited/capped features, unavailable evidence, and stored evidence samples.
- Feature-family band models for all six feature families and optional TRACE context where current props already expose it.
- Review filter helpers for `all`, `review`, `limited`, and `aggregate`.
- Context reducer models derived only from existing fields: confidence, evidence strength, score cap, warning, missing evidence, aggregate-only attribution, and parser/unavailable wording.
- Optional evidence sample models derived from `Feature.evidence` strings and optional existing metadata. Do not fabricate round, target, weapon, rank, ELO, or match-history facets.

This keeps rendering declarative and testable.

## UI Direction

The Mercurial reference is useful for density and hierarchy, not for direct copying. The project should keep its existing console style:

- Compact orientation: selected player, Steam ID, profile eligibility, match/viewer links, model/provenance, and coverage counts.
- Dense scan table: one row per real player, feature-family bands visible without opening detail, local filters, and mobile card parity.
- Selected-player narrative: `What happened`, `Why this score`, `What limits confidence`, and `Next review links`.
- Evidence samples: only when stored payload data exists. Missing facets should be explicitly unavailable.

Avoid turning `/results/{demoId}` into a public player profile page, match history page, or Mercurial clone.

## Existing Data Limits

Current `Feature` payloads support:

- `name`, `score`, `interpretation`
- `evidence?: string[]`
- `method?: string`
- `warning?: string`
- `confidence?: low|medium|high`
- `evidenceStrength?: weak|medium|strong`
- `scoreCapApplied?: boolean`
- `scoreCapReason?: string`
- `independentSignals?: string[]`

They do not reliably support:

- Round IDs
- Target names
- Weapon names
- Shot strings
- External rank/ELO
- Lobby quality
- Clean history
- Per-feature sample counts beyond evidence array length

Phase 26 must treat unsupported fields as unavailable rather than inventing them.

## Testing Approach

Add focused coverage at three layers:

- Unit tests for result-dashboard helper functions: coverage counts, feature bands, filters, context reducers, and evidence sample derivation.
- Component tests for overview/table/detail rendering: selected-player orientation, dense bands, filters, context reducers, narrative sections, and aggregate handling.
- Route/language/browser smoke tests: `/results/{demoId}` renders the refined dashboard at desktop and mobile sizes, forbidden language remains absent, tabs still work, and no text overlap/regression is introduced.

Keep tests route-mocked or component-level where possible so planning does not depend on local database fixtures.

## Pitfalls

- Do not change persisted scores, labels, confidence, TRACE, thresholds, model output, or player trust.
- Do not use external profile, rank, history, inventory, or lobby quality as suspicion evidence.
- Do not add backend endpoints for shot/round/weapon evidence unless a later phase explicitly scopes parser/persistence support.
- Do not adopt Mercurial's `Trust Factor`, `Red flag`, or `Exonerator` wording directly.
- Do not make filters mutate analysis thresholds or persisted results.
- Do not hide aggregate Steam ID `0` rows inside real player attribution.

## Validation Architecture

Final verification should run:

- `cd frontend && npm test -- --runTestsByPath __tests__/lib/result-dashboard.test.ts __tests__/components/ResultsDashboard/ResultDashboardComponents.test.tsx __tests__/components/ResultsDashboard/ResultsPageIntegration.test.tsx __tests__/components/ResultsDashboard/ResultResearchLanguage.test.tsx --watch=false`
- `cd frontend && npx eslint lib/result-dashboard.ts components/ResultsDashboard app/results/[id]/page.tsx __tests__/lib/result-dashboard.test.ts __tests__/components/ResultsDashboard --max-warnings=0`
- `cd frontend && npm run build`
- `cd frontend && npx playwright test e2e/results-dashboard.spec.ts --project=chromium`

If standalone `npx tsc --noEmit --pretty false` still fails because of pre-existing e2e type issues, document the inherited blocker and rely on targeted tests/build for Phase 26 verification.
