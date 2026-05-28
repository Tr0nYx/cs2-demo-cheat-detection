---
phase: 26
slug: umsetzung-der-mercurial-referenzideen-fuer-result-dashboard
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-28
---

# Phase 26 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x, ESLint 9, Next.js build, Playwright 1.60 |
| **Config file** | `frontend/jest.config.js`, `frontend/eslint.config.mjs`, `frontend/playwright.config.ts` |
| **Quick run command** | `cd frontend && npm test -- --runTestsByPath __tests__/lib/result-dashboard.test.ts --watch=false` |
| **Full suite command** | `cd frontend && npm test -- --runTestsByPath __tests__/lib/result-dashboard.test.ts __tests__/components/ResultsDashboard/ResultDashboardComponents.test.tsx __tests__/components/ResultsDashboard/ResultsPageIntegration.test.tsx __tests__/components/ResultsDashboard/ResultResearchLanguage.test.tsx --watch=false` |
| **Estimated runtime** | ~120 seconds targeted, ~300 seconds with Playwright/build |

---

## Sampling Rate

- **After every task commit:** Run the plan-specific targeted Jest or ESLint command.
- **After every plan wave:** Run the plan verification block for that wave.
- **Before `$gsd-verify-work`:** Targeted Jest, ESLint, Next build, and Playwright smoke should be green or documented with inherited blockers.
- **Max feedback latency:** ~300 seconds for the full targeted Phase 26 verification set.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | PHASE-26-01/02/03/05/06 | T-26-01/T-26-02 | Presentation types do not change API/scoring contracts | typecheck | `cd frontend && npx tsc --noEmit --pretty false` | yes | pending |
| 26-01-02 | 01 | 1 | PHASE-26-01/02/03/05/06 | T-26-01/T-26-03/T-26-04 | Helpers derive display state only from stored data | lint | `cd frontend && npx eslint lib/result-dashboard.ts --max-warnings=0` | yes | pending |
| 26-01-03 | 01 | 1 | PHASE-26-01/02/03/05/06 | T-26-01/T-26-03/T-26-04 | Unit tests reject fabricated facets and aggregate attribution | unit | `cd frontend && npm test -- --runTestsByPath __tests__/lib/result-dashboard.test.ts --watch=false` | yes | pending |
| 26-02-01 | 02 | 2 | PHASE-26-01/02/03/05 | T-26-05/T-26-06 | Overview coverage counts are display-only and research-safe | lint | `cd frontend && npx eslint components/ResultsDashboard/ResultOverviewPanel.tsx --max-warnings=0` | yes | pending |
| 26-02-02 | 02 | 2 | PHASE-26-02/03/05 | T-26-05/T-26-07/T-26-08 | Filters are local UI state and rows keep limitations visible | lint | `cd frontend && npx eslint components/ResultsDashboard/PlayerEvidenceTable.tsx --max-warnings=0` | yes | pending |
| 26-02-04 | 02 | 2 | PHASE-26-01/02/03/05 | T-26-05/T-26-06/T-26-07 | Component tests cover counts, filters, bands, and aggregate links | component | `cd frontend && npm test -- --runTestsByPath __tests__/components/ResultsDashboard/ResultDashboardComponents.test.tsx --watch=false` | yes | pending |
| 26-03-01 | 03 | 3 | PHASE-26-04/05/06 | T-26-09/T-26-11 | Narrative sections are grounded in stored payload data | lint | `cd frontend && npx eslint components/ResultsDashboard/PlayerEvidenceDetail.tsx --max-warnings=0` | yes | pending |
| 26-03-04 | 03 | 3 | PHASE-26-04/05/06 | T-26-09/T-26-12 | Component tests cover reducers, samples, and unavailable facets | component | `cd frontend && npm test -- --runTestsByPath __tests__/components/ResultsDashboard/ResultDashboardComponents.test.tsx --watch=false` | yes | pending |
| 26-04-01 | 04 | 4 | PHASE-26-01/02/03/04/05/06 | T-26-13 | Route assembly preserves existing modules and selected-row behavior | lint | `cd frontend && npx eslint app/results/[id]/page.tsx components/ResultsDashboard/ResultDashboardTabs.tsx --max-warnings=0` | yes | pending |
| 26-04-02 | 04 | 4 | PHASE-26-01/02/03/04/05/06 | T-26-14 | Route and language tests cover forbidden terms | integration | `cd frontend && npm test -- --runTestsByPath __tests__/components/ResultsDashboard/ResultsPageIntegration.test.tsx __tests__/components/ResultsDashboard/ResultResearchLanguage.test.tsx --watch=false` | yes | pending |
| 26-04-03 | 04 | 4 | PHASE-26-06 | T-26-15/T-26-16 | Browser smoke checks desktop/mobile result-dashboard behavior | e2e | `cd frontend && npx playwright test e2e/results-dashboard.spec.ts --project=chromium` | yes | pending |
| 26-04-04 | 04 | 4 | PHASE-26-01/02/03/04/05/06 | all | Final verification records test outcomes and inherited blockers | summary | recorded in `26-04-SUMMARY.md` | yes | pending |

---

## Wave 0 Requirements

Existing frontend Jest, ESLint, Next build, and Playwright infrastructure covers the phase. No Wave 0 installation is required.

---

## Manual-Only Verifications

All Phase 26 behaviors have automated or smoke verification. Human review is still useful for visual polish and copy tone, but it is not the only acceptance mechanism.

---

## Validation Sign-Off

- [x] All tasks have automated verify or existing infrastructure.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags in verification commands.
- [x] Feedback latency target documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-28
