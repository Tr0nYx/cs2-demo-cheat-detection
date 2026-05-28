# Phase 26: Umsetzung der Mercurial-Referenzideen fuer Result Dashboard - Discussion Log

> Audit trail only. Downstream planning should use `26-CONTEXT.md` as the canonical input.

**Date:** 2026-05-28  
**Mode:** discuss-phase default with non-interactive fallback  
**Phase:** 26-umsetzung-der-mercurial-referenzideen-fuer-result-dashboard

## Workflow Notes

- User invoked `$gsd-discuss-phase 26`.
- Interactive `request_user_input` was unavailable in the current Default mode, so the workflow used the documented fallback and selected the recommended option: discuss all core Phase 26 areas together.
- No user corrections were provided during this turn.

## Inputs Reviewed

- `.planning/phases/25-better-result-ui/25-INPUT-IDEAS.md`
- `.planning/ROADMAP.md` Phase 26 entry
- `.planning/REQUIREMENTS.md` Phase 26 requirements
- `.planning/phases/25-better-result-ui/25-CONTEXT.md`
- `.planning/phases/24-match-detail-page/24-CONTEXT.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/STACK.md`
- `frontend/app/results/[id]/page.tsx`
- `frontend/lib/result-dashboard.ts`
- `frontend/lib/types.ts`
- `frontend/components/ResultsDashboard/*`
- `frontend/components/FeatureTable.tsx`
- `frontend/components/ResultsCard.tsx`

## Gray Areas Considered

### Scope Relationship to Phase 25
- **Decision:** Treat Phase 26 as refinement after the Phase 25 dashboard baseline, not as a rebuild.
- **Reason:** Existing code already has `ResultsDashboard` components, `buildResultDashboardViewModel`, tabs, overview, ranked table, selected detail, and feature explanations.

### Compact Review Header
- **Decision:** Add selected-player orientation, provenance, navigation, and coverage counts.
- **Reason:** Mercurial's useful pattern is fast orientation, but this project must keep external profile/rank context as provenance only.

### Dense Scan Surface
- **Decision:** Expand the ranked player table with feature-family bands and simple local filters.
- **Reason:** The current table is a good base but only shows three top feature badges; Phase 26 should make scan/review faster without large card stacks.

### Selected-Player Narrative
- **Decision:** Restructure selected-player detail into `What happened`, `Why this score`, `What limits confidence`, and `Next review links`.
- **Reason:** This borrows Mercurial's narrative clarity while keeping content grounded in stored evidence and neutral language.

### Context Reducers
- **Decision:** Use project-safe context-reducer terminology instead of Mercurial's `Red flag` / `Exonerator`.
- **Reason:** The project requires calm research-signal language and avoids accusation or proof framing.

### Evidence Samples
- **Decision:** Prepare optional evidence-sample affordances only for data that exists in persisted payloads.
- **Reason:** Mercurial's shot/round/weapon filters are useful, but fabricating unavailable sample dimensions would violate Phase 26 guardrails.

## Deferred

- Backend evidence-search APIs and parser extensions.
- External history/rank/profile context as suspicion evidence.
- Trust-factor or lobby-quality naming/surfaces.
- AI verdict generation, coaching tips, public player pages, or match-history redesign.
- Any scoring, calibration, threshold, label, or confidence semantic changes.
