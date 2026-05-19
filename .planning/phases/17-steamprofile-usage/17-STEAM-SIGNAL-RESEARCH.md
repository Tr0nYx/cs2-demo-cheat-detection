---
phase: 17
generated_at: 2026-05-18T06:34:44+00:00
status: shadow_research_only
---

# Steam External Signal Research

## Scope

This report evaluates public Steam profile and CS2 inventory metadata as shadow-only research signals. It does not approve any change to visible suspicion labels, TRACE ratings, ban decisions, or demo-derived scoring.

## Data Coverage

- Player sample count: 1
- Profiles with account age: 0
- Inventories with estimated value: 0
- Private inventories observed: 0

## Correlation Notes

Automated correlation against suspicion and TRACE requires a larger labeled local sample before interpretation. Until then, inventory value, account age, and profile visibility must be treated as context for research only.

## Bias And Privacy Risk

Inventory value and account age can proxy for wealth, region, trading habits, and privacy choices. Private or sparse accounts must not be treated as suspicious by default.

## Manipulation Risk

Attackers can buy aged accounts, move items between accounts, hide inventories, or inflate apparent inventory value. These signals are weak, gameable, and unsuitable as standalone anti-cheat evidence.

## Explainability Notes

Any future visible use would need plain-language labels, confidence/coverage indicators, and clear separation from demo-derived behavior. Missing/private data must remain an explicit unknown state.

## Recommendation

Keep Steam external metadata in shadow mode. Use it only for offline analysis and cohort research until a later phase demonstrates measurable lift, acceptable bias/privacy risk, and an explainable product treatment.
