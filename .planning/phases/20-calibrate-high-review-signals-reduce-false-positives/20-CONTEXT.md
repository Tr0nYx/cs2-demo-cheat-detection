# Phase 20: Calibrate High Review Signals and Reduce False Positives in Player Analysis - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 20 recalibrates the existing player-specific detection pipeline so normal demos do not produce blanket high review signals. The phase focuses on feature thresholds, evidence gates, confidence handling, missing-data behavior, and result explanations for the existing aimbot, wallhack, triggerbot, recoil, bhop, session, and weighted scoring flow.

This phase does not add live cheat detection, memory inspection, client tampering, ban automation, or new external scoring sources. Demo-wide aggregate suspicion is not a useful product output; visible suspicion must remain player-specific and research-only.

</domain>

<decisions>
## Implementation Decisions

### Calibration Posture
- **D-01:** Calibrate conservatively. `High review signal` should appear only when strong player-specific evidence exists.
- **D-02:** Normal, ambiguous, parser-limited, or weakly evidenced behavior should land in `Low review signal` or `Review signal`, not `High review signal`.
- **D-03:** Reducing false positives is more important than preserving sensitivity for borderline cases in this phase.

### Evidence Gates
- **D-04:** High feature scores require strong player-specific evidence: at least two independent signals, or one very strong signal with sufficient sample count.
- **D-05:** Single max values, broad demo-level proxies, small sample counts, or weak timing/yaw proxies are not enough to produce a high feature score.
- **D-06:** Aimbot evidence should require multiple suspicious kill windows with aim snap/angular jerk behavior, not a single snap-ratio maximum.
- **D-07:** Wallhack evidence should require multiple plausible peek/info-timing cases with player-local context, not just yaw changes before footsteps.
- **D-08:** Triggerbot evidence should require repeated extremely short weapon-fire/kill reaction windows, not noisy median behavior.
- **D-09:** Recoil evidence should require multiple real spray sequences with known weapon-pattern basis; `unknown` weapon or unavailable pattern data should not inflate score.
- **D-10:** Low sample counts, parser gaps, or unavailable contextual data cap the feature at `Review signal` at most and should prevent `High review signal`.

### Uncertain Signal Handling
- **D-11:** If a feature computes a high raw score but lacks strong evidence, cap the visible/effective score to a conservative range, expected around `40-50`.
- **D-12:** Capped or uncertain features should expose confidence/warning metadata so the UI can explain why the signal was limited.
- **D-13:** Uncertain features must not be allowed to pull the overall result into `High review signal` by themselves.
- **D-14:** Missing or failed feature extraction should reduce confidence or be treated conservatively, not proportionally inflate remaining high features.

### Overall High Review Rules
- **D-15:** Overall `High review signal` should normally require multiple feature families with strong evidence, such as aim plus trigger timing or wall/info behavior plus another independent family.
- **D-16:** A single high feature should usually produce at most `Review signal` unless it has exceptionally strong evidence and high confidence.
- **D-17:** The weighted scorer should include guardrails that prevent one over-sensitive extractor from creating blanket likely-cheating labels across most players in a demo.

### Result Explanation
- **D-18:** Each high feature score must store evidence explaining the player-specific measurements that caused the signal.
- **D-19:** The UI/API should distinguish strong evidence from weak/proxy evidence and clearly show confidence or warnings for capped features.
- **D-20:** All copy and labels remain research-signal language for human review, never proof or enforcement.

### the agent's Discretion
- Exact numeric caps, thresholds, sample-count minima, and confidence formulas are planner/researcher discretion, as long as they satisfy the conservative posture and evidence-gate decisions above.
- Exact implementation shape for score caps versus confidence fields is flexible, provided persisted results and frontend explanations can represent the distinction.

</decisions>

<specifics>
## Specific Ideas

- The motivating problematic demo is `019e3a28-60a6-7c96-99c8-34ddd3231268`, where player-specific attribution is now fixed but many players still receive high review scores.
- Demo-wide aggregate scoring should remain removed from visible player suspicion output.
- The target behavior is not "hide bad news"; it is "only escalate when the evidence is strong enough for a conservative research signal."

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Boundaries
- `.planning/PROJECT.md` - Core post-game research scope, ethical boundary, and Symfony/Python ownership split.
- `.planning/REQUIREMENTS.md` - Existing worker, feature extraction, scoring, and out-of-scope constraints.
- `.planning/ROADMAP.md` - Phase 20 goal, acceptance criteria, expected waves, and dependencies.

### Prior Phase Context
- `.planning/phases/19-frontend-ui-ux-analysis-console-redesign/19-CONTEXT.md` - Evidence-first results direction and research-safe UI framing.
- `.planning/phases/17-steamprofile-usage/17-CONTEXT.md` - External Steam metadata must not influence visible scoring without explicit research/shadow-mode approval.
- `.planning/phases/18-sharecode-match-history-tracking/18-CONTEXT.md` - Match-history provenance must not influence suspicion/TRACE/labels.

### Code Anchors
- `python/scoring/weighted_scorer.py` - Overall score weighting, feature aliases, missing-feature handling, and label thresholds.
- `python/features/aimbot.py` - Current snap/angular velocity/angular jerk kill-window extractor.
- `python/features/wallhack.py` - Current sound/pre-aim/crosshair delta proxy extractor.
- `python/features/triggerbot.py` - Current trigger timing extractor.
- `python/features/recoil.py` - Current recoil pattern/correlation extractor.
- `python/features/bhop.py` - Current bhop extractor.
- `python/features/session.py` - Current session consistency extractor.
- `python/worker.py` - Player-specific slicing and feature extraction orchestration.
- `python/persistence/result_writer.py` - Persisted feature data and score fields.
- `frontend/lib/api.ts` - Backend feature-data mapping into UI evidence.
- `frontend/components/FeatureTable.tsx` - Expanded feature evidence display.
- `frontend/components/ResultsCard.tsx` - Overall/player review signal rendering.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `python/worker.py` now slices analysis by real player SteamID and removes old demo-level aggregate results. Phase 20 should preserve this attribution model.
- `python/persistence/result_writer.py` persists per-feature raw measurements and metadata into `feature_data`, which can carry confidence/warning fields.
- `frontend/lib/api.ts` already maps backend `feature_data` into compact evidence strings for the Results UI.
- `frontend/components/FeatureTable.tsx` can already show method, warning, and evidence in expanded feature rows.

### Established Patterns
- Python owns parsing, feature extraction, scoring, and ML behavior.
- Symfony owns API, persistence boundaries, queue dispatch, and product constraints.
- Frontend surfaces research signals and evidence; it should not invent score logic that is not persisted by the analysis pipeline.
- Suspicion labels must remain framed as research signals, not proof of cheating.

### Integration Points
- Add confidence/evidence-gate output to feature extractors and persist it through `feature_data`.
- Update `WeightedScorer` so missing, capped, or weak-evidence features do not redistribute weight in a way that inflates overall suspicion.
- Add regression tests around conservative scoring, low sample counts, missing data, and the previously problematic demo behavior.
- Update frontend evidence rendering only after backend feature metadata exposes enough confidence/warning detail.

</code_context>

<deferred>
## Deferred Ideas

- Any use of Steam profile, inventory, account age, match-history provenance, or external reputation as scoring input remains out of scope.
- New ML model training or AntiCheatPT replacement behavior is out of scope unless a later phase explicitly accepts it.
- Ban automation, enforcement decisions, or live anti-cheat behavior remain out of scope.

</deferred>

---

*Phase: 20-calibrate-high-review-signals-reduce-false-positives*
*Context gathered: 2026-05-19*
