# Phase 25: Better Result UI - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 25 improves the existing `/results/{demoId}` analysis result UI so users can review player-level suspicion signals, TRACE context, feature evidence, analysis status, and viewer access faster and with less ambiguity.

This phase is UI-focused. It must preserve existing backend/Python scoring semantics, existing research-only boundaries, and current API contracts unless planning identifies a small compatible frontend-only data-shaping need.

</domain>

<decisions>
## Implementation Decisions

### Result Page Shape
- **D-01:** Rework `/results/{demoId}` into an evidence dashboard, not just a polished version of the current stacked page.
- **D-02:** The first viewport should orient the reviewer quickly: demo status/provenance, overall research signal, top player review signals, and clear navigation to match report/player/viewer surfaces.
- **D-03:** The dashboard should stay data-dense and operational. Avoid marketing-style hero layout, oversized explanation blocks, and decorative composition.

### Player Evidence Hierarchy
- **D-04:** Lead the main result view with a ranked player table sorted by review signal.
- **D-05:** Player rows should show score band, confidence/evidence status when available, top feature badges, and links to player profile or match report context where valid.
- **D-06:** Detailed feature evidence should be expandable or shown in an adjacent/detail area from the ranked table, rather than rendering every player as a large always-open card.
- **D-07:** Demo-level aggregate placeholder results such as Steam ID `0` must be visually separated from real player rows and framed as match-wide research signals, not player attribution.

### Analysis Modes
- **D-08:** Use separate analysis tabs for the major result modes, likely `Players`, `TRACE`, `Sensitivity`, and `Viewer`.
- **D-09:** The `Players` tab is the default landing mode and contains the ranked table plus selected-player/expanded feature evidence.
- **D-10:** The `TRACE` tab should reuse existing TRACE components and explain whether TRACE is demo-level or player-contextual depending on available payloads.
- **D-11:** The `Sensitivity` tab should keep threshold tuning available but make it clearly exploratory/calibration-oriented, not a claim that changing thresholds changes persisted results.
- **D-12:** The `Viewer` tab should reuse the existing `DemoViewer` module rather than duplicating replay, heatmap, tick, or event logic.

### Feature Explanation
- **D-13:** Expanded feature evidence must explain in plain language why each feature received its score. Users should not need to understand internal method names such as `aimbot_multifeature_sigmoid`.
- **D-14:** For each feature family such as aimbot, triggerbot, wallhack, recoil, bhop, and session, show a short "Why this score?" explanation that translates stored measurements into reviewer-friendly meaning.
- **D-15:** Keep raw method names and technical measurements available only as secondary detail, debug/provenance text, or tooltips. They should not be the primary explanation.
- **D-16:** Feature evidence should connect measurements to the visible score band, for example explaining that snap ratio, angular jerk, reaction timing, or session consistency contributed to the score and whether the evidence is weak, moderate, strong, capped, or unavailable.
- **D-17:** If the backend lacks enough evidence to explain a score, show that limitation explicitly instead of displaying opaque method fields as if they were meaningful to the user.

### Review Language and Severity Display
- **D-18:** High review signals should be calm but visible: clear status color and ordering, but no alarm-style presentation.
- **D-19:** Copy must continue to say "review signal", "research signal", "confidence", "evidence", and "unavailable" rather than proof/enforcement language.
- **D-20:** Avoid labels such as "cheater", "proof", "ban", "conviction", or accusatory phrasing.
- **D-21:** Capped scores, weak evidence, low sample count, missing feature data, or parser gaps should be visible as confidence/warning/explanation states rather than hidden or treated as normal high-confidence output.

### Agent's Discretion
- Exact tab labels, table column order, selected-player detail placement, responsive breakpoint behavior, skeleton layout, and icon choices are planner/implementer discretion as long as they preserve the decisions above.
- Exact sorting tie-breakers are flexible, but the default should prioritize higher review signal and stronger evidence/confidence before lower or unavailable signals.

</decisions>

<specifics>
## Specific Ideas

- The user selected: evidence dashboard, ranked player table first, separate analysis tabs, and calm-but-visible severity display.
- The user added that feature rows must explain why aimbot, triggerbot, wallhack, recoil, bhop, and session received their scores. The current raw `Method:` display and measurement chips are too technical and not understandable enough on their own.
- Phase 25 should make `/results/{demoId}` feel like an investigator's post-game evidence dashboard. The newer `/matches/{demoId}` route remains the match report companion; results should focus on analysis evidence.
- The current result page stacks `ResultsCard`, `TraceCard`, `SensitivityTuner`, and `DemoViewer`. Phase 25 should reorganize those capabilities into a clearer dashboard/tab structure.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Roadmap
- `.planning/PROJECT.md` - Core post-game research scope, ethical boundary, and Symfony/Python ownership split.
- `.planning/REQUIREMENTS.md` - Interface, feature evidence, and out-of-scope constraints.
- `.planning/ROADMAP.md` - Phase 25 goal, dependencies, and planning anchors.
- `.planning/STATE.md` - Current project status, SDK blocker, and recent roadmap evolution.
- `.planning/phases/25-better-result-ui/25-INPUT-IDEAS.md` - Mercurial player/demo page reference analysis captured as implementation input for result-dashboard UX ideas.

### Prior Phase Context
- `.planning/phases/19-frontend-ui-ux-analysis-console-redesign/19-CONTEXT.md` - Console design direction, evidence-first result UX, accessibility, and responsive verification expectations.
- `.planning/phases/20-calibrate-high-review-signals-reduce-false-positives/20-CONTEXT.md` - Conservative evidence gates, capped/uncertain feature handling, and confidence explanation requirements.
- `.planning/phases/24-match-detail-page/24-CONTEXT.md` - Relationship between `/results/{demoId}` and `/matches/{demoId}`, match report links, and research-safe navigation.

### Existing Frontend Code
- `frontend/app/results/[id]/page.tsx` - Current result page composition and status handling.
- `frontend/components/ResultsCard.tsx` - Current overall/player result rendering and demo-level aggregate warning.
- `frontend/components/FeatureTable.tsx` - Existing expandable feature evidence table with confidence, evidence strength, warnings, and score-cap display.
- `frontend/components/DemoDetail/TraceCard.tsx` - TRACE display states and component breakdown conventions.
- `frontend/components/Analytics/SensitivityTuner.tsx` - Current threshold preview/tuner UI and exploratory comparison behavior.
- `frontend/components/DemoViewer/DemoViewer.tsx` - Existing viewer/heatmap/tick/event UI to reuse under the Viewer tab.
- `frontend/components/MatchDetail/MatchParticipantTable.tsx` - Recent responsive ranked/table pattern for participants and feature badges.
- `frontend/components/Console/*` - Existing console shell, panels, metrics, status badges, and research notice components.
- `frontend/lib/api.ts` - Backend result mapping into frontend player/features/evidence types.
- `frontend/lib/types.ts` - Demo, player, feature, TRACE, detail, and viewer DTO types.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ConsolePage`, `ConsoleHeader`, `ConsolePanel`, `StatusBadge`, `DataValue`, and `ResearchSignalNotice` already provide the console-style shell and research framing.
- `ResultsCard` already knows how to display pending, error, done, no-player, and demo-level aggregate states.
- `FeatureTable` already supports expandable feature rows and can display method, confidence, evidence strength, independent signals, score caps, warnings, and stored evidence.
- `TraceCard`, `SensitivityTuner`, and `DemoViewer` can be reused behind tabs instead of remaining as a long stacked layout.
- `MatchParticipantTable` provides a useful recent pattern for a responsive desktop table plus mobile card fallback.

### Established Patterns
- Frontend uses Next.js App Router client pages, React Query hooks, Tailwind, lucide icons, and console-style components.
- Existing result language already uses "review signal" and "research signal"; Phase 25 should make this more consistent, not replace it with accusation language.
- Existing API contracts should be preserved; frontend view-model shaping is preferred for this UI phase.
- Data that is unavailable should produce explicit unavailable/empty states rather than fabricated score, player, team, or evidence data.

### Integration Points
- Update `frontend/app/results/[id]/page.tsx` to introduce the evidence dashboard layout and tab structure.
- Refactor or replace `ResultsCard` into smaller result-dashboard components if that makes ranked table and detail panels cleaner.
- Reuse `FeatureTable` or extract a shared evidence-detail component for selected/expanded player rows.
- Wire links from result rows to `/players/{playerId}` only for real Steam IDs and keep `/matches/{demoId}` as the match-report companion action.
- Keep `DemoViewer` under the Viewer tab and pass existing map/analyzed props from the result page.

</code_context>

<deferred>
## Deferred Ideas

- New scoring, threshold, calibration, or feature extraction semantics remain out of scope for this UI phase.
- New backend result endpoints are deferred unless planning proves existing payloads cannot support the dashboard without unsafe client inference.
- Full Phase 19 global console redesign remains broader than Phase 25; this phase targets the result UI specifically.
- Ban automation, enforcement workflows, live cheat detection, memory reading, or client tampering remain out of scope.

</deferred>

---

*Phase: 25-better-result-ui*
*Context gathered: 2026-05-19*
