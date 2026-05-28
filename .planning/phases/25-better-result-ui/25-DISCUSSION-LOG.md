# Phase 25: Better Result UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 25-better-result-ui
**Areas discussed:** Result page shape, Player evidence hierarchy, TRACE and tuner placement, Feature explanation, Review language and severity display

---

## Result Page Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Evidence dashboard | Primary review workspace: summary at top, ranked players, feature evidence, TRACE, tuner, and viewer access organized for analysis. | yes |
| Compact command center | Short result summary with clear links into match report, player profiles, TRACE, tuner, and viewer. | |
| Current page, polished | Keep the existing stacked structure, but improve visual hierarchy, spacing, empty states, and copy. | |

**User's choice:** Evidence dashboard
**Notes:** The result route should become the main evidence review workspace for analysis output.

---

## Player Evidence Hierarchy

| Option | Description | Selected |
|--------|-------------|----------|
| Ranked player table first | Show all players in a dense table sorted by review signal, with top feature badges and quick links. Selecting a player opens details below or beside it. | yes |
| Expanded player cards | Keep one panel per player, but redesign them with clearer score, confidence, feature evidence, and action links. | |
| Review queue first | Lead with signals needing review, grouped across players. | |

**User's choice:** Ranked player table first
**Notes:** The main player review area should prioritize fast match-wide orientation before deeper evidence.

---

## TRACE and Tuner Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Context panels below selected player | Selecting a player shows feature evidence, TRACE context when available, and tuner controls in one detail area. | |
| Separate analysis tabs | Top-level tabs like Players, TRACE, Sensitivity, and Viewer, keeping each mode focused. | yes |
| Keep side-by-side panels | Preserve the current TRACE and tuner grid, but make it visually subordinate to the main player table. | |

**User's choice:** Separate analysis tabs
**Notes:** Tabs should reduce long scrolling and keep result modes focused.

---

## Review Language and Severity Display

| Option | Description | Selected |
|--------|-------------|----------|
| Calm but visible | High signals use clear color/status treatment, but copy emphasizes review signal, confidence, and evidence limits. No alarm-style presentation. | yes |
| Strong visual escalation | High signals get prominent red treatment, top placement, and stronger warning copy while still saying research-only. | |
| Neutral analytic scale | Avoid dramatic severity styling; use score bands, confidence labels, and evidence strength as the primary cues. | |

**User's choice:** Calm but visible
**Notes:** The UI should orient reviewers without sounding accusatory.

---

## Feature Explanation

| Option | Description | Selected |
|--------|-------------|----------|
| Plain-language score explanation | Explain why each feature such as aimbot or triggerbot received its score in reviewer-friendly language. | yes |
| Raw method and measurements only | Keep displaying internal method names and measurement chips as the main evidence. | |
| Hide technical evidence | Show only score bands without detailed evidence. | |

**User's choice:** Plain-language score explanation
**Notes:** User provided a screenshot showing that raw fields such as `Method: aimbot_multifeature_sigmoid`, snap ratio, normalized snap, and angular jerk are not understandable enough. Phase 25 should translate these into "Why this score?" explanations while preserving raw measurements as secondary detail.

---

## Agent's Discretion

- Exact tab labels, column order, selected-player detail placement, responsive behavior, skeleton layout, icons, sorting tie-breakers, and exact wording of feature explanations.

## Deferred Ideas

- Scoring, calibration, and feature extraction changes belong to separate backend/Python phases.
- Full app-wide console redesign remains broader than this result-specific phase.
