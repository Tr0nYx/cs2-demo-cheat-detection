# Phase 20: Calibrate High Review Signals and Reduce False Positives in Player Analysis - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 20-calibrate-high-review-signals-reduce-false-positives
**Areas discussed:** Calibration posture, uncertain signal handling, evidence gates, overall label behavior

---

## Calibration Posture

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative | High review only when strong player-specific evidence exists; reduce false positives. | yes |
| Sensitive | Keep broad detection sensitivity and accept more false positives. | |

**User's choice:** Conservative.
**Notes:** User explicitly preferred a conservative posture.

---

## Uncertain Signal Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Cap score + warning | Hard-cap weakly evidenced features and show confidence/warning metadata. | yes |
| Ignore feature | Drop uncertain features from overall scoring entirely. | |
| Keep score, lower confidence | Preserve raw score but visually mark uncertainty. | |

**User's choice:** Accepted recommendation: cap uncertain feature scores and expose confidence/warnings.
**Notes:** Goal is to prevent weak proxies from pulling overall results into high review.

---

## Evidence Gates

| Option | Description | Selected |
|--------|-------------|----------|
| Require strong evidence | High feature scores require two independent signals or one very strong signal with enough samples. | yes |
| Allow single proxy | A single high computed proxy can produce a high feature score. | |

**User's choice:** Accepted recommendation: high feature scores need strong player-specific evidence.
**Notes:** Examples discussed: multiple suspicious kill windows for aimbot, multiple plausible peek/info-timing cases for wallhack, repeated short fire/kill reaction windows for triggerbot, and known weapon spray evidence for recoil.

---

## Overall Label Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Require multiple feature families | Overall high review usually requires several strong, independent feature families. | yes |
| Single feature may dominate | One high feature can generally pull overall to high review. | |

**User's choice:** Accepted recommendation: overall high review should normally require multiple strong feature families.
**Notes:** A single high feature should usually produce at most review signal unless it has exceptional evidence and high confidence.

---

## the agent's Discretion

- Exact numeric thresholds, caps, sample-count minima, and confidence formulas.
- Exact persistence structure for confidence/warning metadata.
- Exact UI wording for capped/uncertain feature explanations, as long as research-signal framing remains intact.

## Deferred Ideas

- External Steam/profile/match-history signals in scoring.
- New ML model replacement work.
- Enforcement or ban automation.
