# Phase 26: Umsetzung der Mercurial-Referenzideen fuer Result Dashboard - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 26 implements the Mercurial-inspired refinements captured in `.planning/phases/25-better-result-ui/25-INPUT-IDEAS.md` after the Phase 25 result-dashboard baseline.

This phase sharpens `/results/{demoId}` as a dense post-game research review console: compact selected-player orientation, feature-family bands, scan filters, selected-player narrative sections, context reducers, and evidence-sample affordances. It must not change backend/Python scoring semantics, TRACE semantics, confidence labels, model output, player trust, or enforcement behavior.

</domain>

<decisions>
## Implementation Decisions

### Scope Relationship to Phase 25
- **D-01:** Treat Phase 25 as the baseline dashboard foundation and Phase 26 as a focused refinement pass. Do not rebuild the result page from scratch if Phase 25 components already provide the shell, tabs, table, and selected-player detail.
- **D-02:** Preserve the existing `Players`, `TRACE`, `Sensitivity`, and `Viewer` mode split. Mercurial-style evidence detail belongs inside the Players review surface or selected-player detail, not as a replacement for those modes.
- **D-03:** Keep Phase 26 frontend-first unless planning proves that an existing payload cannot safely expose an already-persisted field. New parsing, scoring, calibration, or external-profile scoring contracts are out of scope.

### Compact Review Header
- **D-04:** Add selected-player orientation near the review surface: player name, Steam ID, profile-link eligibility, match report link, viewer link, analysis status, model/provenance, and coverage counts.
- **D-05:** Coverage counts should emphasize what the reviewer can trust: real player rows, aggregate/demo-level rows, top review-signal rows, capped/limited features, unavailable evidence, and stored evidence sample count where available.
- **D-06:** External Steam/FACEIT/profile/rank/history context may be shown only when already available as provenance. It must never affect visible suspicion scores, confidence, labels, TRACE, sorting, or player trust in this phase.

### Dense Scan Surface
- **D-07:** Expand the ranked player table from "top three feature badges" into a denser scan surface with compact feature-family bands for aimbot, triggerbot, wallhack, recoil, bhop, session, and available TRACE context.
- **D-08:** Feature-family bands should show a short label, score or band, evidence state, capped/unavailable marker, and one top measurement or driver when safely available.
- **D-09:** Add simple review filters for `All`, `Review signals`, `Capped/limited`, and `Aggregate/demo-level` entries. Filters are for result review only; they do not change persisted results or analysis thresholds.
- **D-10:** Keep rows compact on desktop and card-like on mobile, following the existing `PlayerEvidenceTable` pattern. Avoid large always-open cards for every player.

### Selected-Player Narrative
- **D-11:** Structure selected-player detail into reviewer-readable sections: `What happened`, `Why this score`, `What limits confidence`, and `Next review links`.
- **D-12:** `What happened` summarizes the stored result row and strongest feature families without inventing match stats, role tags, standout moments, rank, ELO, history, weapon data, or round detail that is not present.
- **D-13:** `Why this score` should translate stored measurements and feature drivers into plain language. Raw method names remain technical provenance.
- **D-14:** `What limits confidence` should gather context reducers such as weak evidence, low confidence, capped scores, low sample count, parser gaps, unavailable feature data, aggregate-only attribution, and warnings.
- **D-15:** `Next review links` should route to already-existing surfaces: player profile when the Steam ID is real, match report, TRACE tab, viewer tab, and technical provenance.

### Context Reducers
- **D-16:** Use neutral context-reducer language for evidence that reduces confidence or concern. Preferred terms: `Context reducer`, `Limited evidence`, `Unavailable`, `Capped`, `Parser gap`, `Aggregate only`, and `Needs human review`.
- **D-17:** Do not adopt Mercurial's `Red flag` / `Exonerator` wording directly. Use this project's calmer research-signal tone.
- **D-18:** Clean history can be a context reducer only if already present in project-owned payloads. Do not fetch or infer history in Phase 26.

### Evidence Samples
- **D-19:** Prepare UI affordances for concrete evidence samples, but display them only when persisted payload data exists. Acceptable sample facets include feature family, stored evidence text, round, target, weapon, and evidence strength if present.
- **D-20:** When sample facets are missing, the UI should say what is unavailable rather than showing empty filters or fabricated values.
- **D-21:** Evidence sample filters should stay local to the selected-player detail. They are review tools, not query parameters or new backend search/filter capabilities unless later planning explicitly scopes that in.

### Safety and Product Reference
- **D-22:** Use Mercurial only as product inspiration for density, hierarchy, and review flow. Do not copy its visual styling, product language, trust-factor claims, proprietary phrasing, or claims of authority.
- **D-23:** Do not use Valve-confusing `Trust Factor` naming. Any future lobby-quality concept must be labeled as estimated matchmaking context and belongs outside this phase unless already available.
- **D-24:** All copy must stay research-safe: review signal, research signal, evidence, confidence, limitation, unavailable, context, and human review. Avoid proof, ban, conviction, cheater, or accusation language.

### Agent's Discretion
- Exact component split, icon choices, row density, responsive breakpoints, filter control styling, empty-state copy, and ordering of narrative subsections are planner/implementer discretion as long as the decisions above are preserved.
- Exact wording of generated summaries may be refined during implementation, but must remain grounded in stored payload fields and must not invent evidence.

</decisions>

<specifics>
## Specific Ideas

- The concrete input is the Mercurial reference analysis in `.planning/phases/25-better-result-ui/25-INPUT-IDEAS.md`.
- Useful borrowed patterns: compact player/profile header, score context before detail, capability bands, short verdict/review cards, dense match-history rows, deep-scan tabs, player narrative blocks, concrete evidence filters, and repeated safety framing.
- The user asked for "Umsetzung der Ideen" as a new GSD phase, so Phase 26 should convert the input ideas into implementation plans rather than re-opening whether the ideas are worthwhile.
- Phase 25 has already established the result dashboard direction; Phase 26 should make it feel more like a mature review console rather than a generic table-plus-detail page.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Roadmap
- `.planning/PROJECT.md` - Project purpose, ethical boundary, Symfony/Python split, and research-only framing.
- `.planning/REQUIREMENTS.md` - Phase 26 requirements and global out-of-scope constraints.
- `.planning/ROADMAP.md` - Phase 26 goal, dependencies, planning anchors, and guardrails.
- `.planning/STATE.md` - Current phase status and session continuity.

### Phase 26 Input
- `.planning/phases/25-better-result-ui/25-INPUT-IDEAS.md` - Mercurial player/demo page reference analysis and translation ideas.
- `.planning/phases/25-better-result-ui/25-CONTEXT.md` - Phase 25 baseline dashboard decisions that Phase 26 must build on.
- `.planning/phases/25-better-result-ui/25-RESEARCH.md` - Phase 25 implementation shape, feature explanation strategy, and testing approach.

### Related Prior Context
- `.planning/phases/24-match-detail-page/24-CONTEXT.md` - Relationship between result page, match report, viewer links, and research-safe navigation.
- `.planning/phases/20-calibrate-high-review-signals-reduce-false-positives/20-CONTEXT.md` - Evidence gates, capped/uncertain feature handling, and conservative confidence posture if present.
- `.planning/phases/19-frontend-ui-ux-analysis-console-redesign/19-CONTEXT.md` - Broader console design direction if present.

### Existing Frontend Code
- `frontend/app/results/[id]/page.tsx` - Current result dashboard route assembly, tabs, selected row behavior, and integration with TRACE/Sensitivity/Viewer.
- `frontend/lib/result-dashboard.ts` - Frontend view-model shaping for rows, aggregate separation, feature explanations, score bands, and evidence state.
- `frontend/lib/types.ts` - Result dashboard, player row, feature, evidence, demo detail, and TRACE-related types.
- `frontend/components/ResultsDashboard/ResultOverviewPanel.tsx` - Existing overview/provenance/actions panel to refine into stronger review orientation.
- `frontend/components/ResultsDashboard/PlayerEvidenceTable.tsx` - Existing ranked player table and mobile card fallback to extend with dense feature bands and filters.
- `frontend/components/ResultsDashboard/PlayerEvidenceDetail.tsx` - Existing selected-player feature detail to restructure into narrative sections and context reducers.
- `frontend/components/ResultsDashboard/ResultDashboardTabs.tsx` - Existing Players/TRACE/Sensitivity/Viewer mode split to preserve.
- `frontend/components/FeatureTable.tsx` - Existing feature evidence table and technical provenance behavior.
- `frontend/components/Console/*` - Console shell, panels, status badges, data values, and research notice components.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildResultDashboardViewModel` already separates real player rows from aggregate rows, sorts rows, builds top review signals, and creates feature explanations.
- `ResultOverviewPanel` already provides a first-viewport overview with match report and download actions, analysis state, overall research signal, and provenance.
- `PlayerEvidenceTable` already has a responsive desktop table and mobile card fallback with row selection and profile-link handling.
- `PlayerEvidenceDetail` already renders selected-player feature evidence, warning banner, driver/limitation sections, and technical provenance.
- `ResultDashboardTabs` already implements the desired Players/TRACE/Sensitivity/Viewer separation using accessible tabs.
- `FeatureTable` and `explainFeatureScore` already contain the seed of "Why this score?" copy and can be refined rather than replaced.

### Established Patterns
- Frontend uses Next.js App Router client pages, React Query hooks, Tailwind, lucide icons, and console-style components.
- Console UI uses restrained panels, semantic status badges, `DataValue`, and research-signal notices.
- Existing Phase 25 work prefers frontend view-model shaping over backend/API changes.
- Missing data should become explicit unavailable or limitation states, not hidden gaps or invented context.
- Real player profile links are allowed only for non-placeholder Steam IDs; aggregate Steam ID `0` stays separate.

### Integration Points
- Extend `frontend/lib/result-dashboard.ts` with coverage counts, feature-family band models, context reducer models, review filters, and optional evidence-sample view models.
- Extend `frontend/lib/types.ts` only for frontend view-model fields unless persisted payload types genuinely need already-existing optional fields represented.
- Refine `ResultOverviewPanel` for stronger selected-player/provenance orientation and coverage counts.
- Refine `PlayerEvidenceTable` for dense bands and local review filters.
- Refine `PlayerEvidenceDetail` into narrative sections and optional evidence-sample affordances.
- Keep `/results/{demoId}` as the route and continue linking to `/matches/{demoId}`, `/players/{steamId}`, TRACE, Sensitivity, and Viewer surfaces.

</code_context>

<deferred>
## Deferred Ideas

- New backend evidence-search endpoints, persisted shot/duel/weapon sample schemas, or richer parser output are deferred unless a later phase scopes them.
- External Steam/FACEIT/rank/history enrichment as scoring evidence is deferred and must remain outside suspicion/TRACE semantics unless a future backend/scoring phase defines it.
- Trust-factor or lobby-quality product surfaces are deferred and must avoid Valve-confusing naming.
- Full Mercurial parity, public player pages, AI verdict generation, coaching tips, match-history redesign, and longitudinal history analysis are outside Phase 26.
- Any scoring, calibration, model, threshold, label, or confidence semantic change remains out of scope.

</deferred>

---

*Phase: 26-umsetzung-der-mercurial-referenzideen-fuer-result-dashboard*
*Context gathered: 2026-05-28*
