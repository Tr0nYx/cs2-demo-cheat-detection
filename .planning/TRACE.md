# TRACE Rating SPEC

## Purpose

TRACE is a transparent player impact rating for CS2 demo analysis.

It complements the existing cheat-suspicion pipeline. Suspicion scores answer
"how unusual or potentially automated was this behavior?" TRACE answers "how
much useful round impact did this player produce?" The two signals must stay
visible as separate values.

TRACE stands for **Tactical Round Action & Contribution Evaluation**.

## Product Boundaries

- TRACE is computed only from post-game `.dem` data and derived analysis output.
- TRACE is a research and analytics signal, not proof of fair or unfair play.
- TRACE must never trigger bans, enforcement, client tampering, memory reading,
  or live anti-cheat behavior.
- Symfony owns API responses, persistence, history, and UI boundaries.
- Python owns TRACE calculation, feature reuse, calibration, and model-assisted
  scoring.

## Rating Shape

TRACE has three visible values:

```text
trace_base = weighted player impact and skill score
trust_multiplier = 1.0 - (overall_suspicion_score * 0.30), clamped to [0.73, 1.00]
trace_adjusted = trace_base * trust_multiplier
```

The UI should show all three values:

- **Base TRACE**: player impact before suspicion adjustment.
- **Trust multiplier**: transparent dampening from the existing suspicion score.
- **Final TRACE**: adjusted rating used for ranking and history.

This prevents the anti-cheat signal from silently becoming a hidden skill
penalty.

## MVP Formula

The first implementation should avoid a trained win-probability dependency.
Use existing parsed data and feature outputs first.

```text
trace_base =
    eKILL  * 0.30 +
    AIM    * 0.25 +
    KAST   * 0.20 +
    UTIL   * 0.15 +
    CLUTCH * 0.10

trace_adjusted = trace_base * trust_multiplier
trace_normalized = trace_adjusted / calibration.global_average
```

Initial target range:

- Average player: `1.00`
- Strong player: `1.20-1.45`
- Weak player: `0.60-0.85`

Keep the old SWING concept as a later enhancement. It is useful, but it should
not block the first working TRACE implementation.

## Component Definitions

### eKILL measures economy-adjusted kill value

Kills against better-equipped opponents count more. Anti-eco kills count less.

Initial weapon values:

```python
WEAPON_VALUES = {
    "glock": 300,
    "usp_silencer": 300,
    "hkp2000": 300,
    "p250": 700,
    "cz75a": 500,
    "tec9": 500,
    "fiveseven": 500,
    "deagle": 700,
    "revolver": 600,
    "mac10": 1050,
    "mp9": 1250,
    "mp7": 1500,
    "mp5sd": 1500,
    "ump45": 1200,
    "p90": 2350,
    "bizon": 1400,
    "galil": 1800,
    "famas": 2050,
    "ak47": 2700,
    "m4a1_silencer": 2900,
    "m4a4": 3100,
    "sg556": 3000,
    "aug": 3300,
    "ssg08": 1700,
    "awp": 4750,
    "g3sg1": 5000,
    "scar20": 5000,
    "nova": 1050,
    "xm1014": 2000,
    "mag7": 1300,
    "sawedoff": 1100,
    "m249": 5200,
    "negev": 1700,
    "knife": 0,
    "knife_t": 0,
}
```

Per-kill value:

```text
ratio = victim_weapon_value / max(attacker_weapon_value, 1)
kill_value = min(sqrt(ratio), 2.0)
```

Modifiers:

- Assisted kill with at least 35 damage: add `0.60 * kill_value`.
- Player death within 5 seconds after own kill: multiply that kill by `0.85`.
- Two kills within 5 seconds: multiply the second kill by `1.10`.
- Knife kills should not divide by zero. Treat the attacker weapon value as `1`.
- Player with zero kills gets neutral-to-low eKILL from calibration fallback, not a crash.

### AIM reuses existing mechanical feature evidence

AIM should use the existing extractor outputs where possible. It should not
duplicate suspicion logic blindly.

Sub-components:

- `aim_cpq`: crosshair placement quality from encounter angle deltas. Lower angle
  delta is better.
- `aim_csq`: low-velocity shot ratio for non-AWP shots. Treat this as an
  experimental signal until enough matches validate it.
- `aim_ttd`: time-to-damage score from legitimate reaction windows only
  (`80ms <= reaction <= 600ms`).
- `aim_scs`: spray-control quality from recoil correlation and human consistency.

Initial formula:

```text
aim_raw =
    aim_cpq * 0.35 +
    aim_csq * 0.20 +
    aim_ttd * 0.25 +
    aim_scs * 0.20
```

The lower CSQ weight is intentional. Counter-strafe behavior varies by weapon,
movement state, and duel context.

### KAST measures round participation

A round counts as KAST-positive if the player:

- got a kill,
- got an assist,
- survived,
- or was traded within 5 seconds after death.

```text
kast_percentage = kast_positive_rounds / total_rounds
```

Use `0.73` as the initial average until calibration replaces it.

### UTIL measures team utility impact

MVP utility should only use signals available from parsed events:

```text
util_raw =
    flash_assists * 2.0 +
    enemy_blind_seconds * 0.5 +
    he_damage_to_enemies * 0.02 +
    molotov_damage_to_enemies * 0.015 -
    teammate_blind_seconds * 1.0 -
    unused_utility_value_at_death * 0.001
```

Do not include "correct smoke position" in the MVP. Map-specific smoke knowledge
needs separate data and validation.

### CLUTCH rewards unlikely round wins

MVP clutch can start without a win-probability model:

```text
clutch_raw =
    1v1 wins * 1.00 +
    1v2 wins * 1.35 +
    1v3 wins * 1.65 +
    1v4 wins * 1.90 +
    1v5 wins * 2.10
```

Normalize by clutch attempts. Players with no clutch situations receive a
neutral clutch score of `1.00`, not `0.00`.

### TRUST dampens, but never hides, suspicious play

The Trust multiplier comes from the existing `overall_suspicion_score` produced
by the weighted suspicion scorer.

```text
trust_multiplier = clamp(1.0 - (overall_suspicion_score * 0.30), 0.73, 1.00)
```

Examples:

| Suspicion | Trust |
| --------- | ----- |
| 0.00      | 1.00  |
| 0.30      | 0.91  |
| 0.50      | 0.85  |
| 0.75      | 0.78  |
| 1.00      | 0.73  |

The UI must label this as a suspicion adjustment, not as proof of cheating.

## Calibration

Hard-coded normalization values are acceptable only as initial defaults.

Add a calibration concept before using TRACE for rankings:

- `calibration_version`
- `sample_size`
- `global_average`
- per-component means, standard deviations, and percentiles
- `created_at`

Fallback behavior:

- If fewer than 100 completed player-match ratings exist, use default constants.
- Once at least 100 ratings exist, calculate medians and percentiles from stored
  ratings.
- Keep the calibration version with each stored TRACE result so old ratings stay
  reproducible.

Use the live CS2CD dataset DOI `10.57967/hf/5654` unless a future task explicitly
pins a different dataset version.

## Python Integration

Create the MVP around these modules:

- `python/scoring/trace_rating.py`: dataclasses, constants, component
  normalization, TRACE calculation, Trust multiplier.
- `python/scoring/trace_components.py`: helper functions that convert parser and
  extractor output into `TraceComponents`.
- `python/tests/test_trace_rating.py`: unit tests for formulas and edge cases.

Keep `python/scoring/weighted_scorer.py` focused on suspicion scoring. TRACE can
consume its `overall_score`, but should not be merged into the suspicion labeler.

Required Python behavior:

- type hints on public functions,
- docstrings explaining formulas,
- structured JSON log event per TRACE calculation,
- no placeholder implementations in production code,
- clamp external numeric inputs to expected ranges before scoring.

## Persistence Strategy

Start with low-risk persistence before adding new relational tables.

### MVP storage

Store TRACE output inside `analysis_result.support_data.trace`:

```json
{
  "trace": {
    "calibration_version": "default-v1",
    "base": 1.12,
    "adjusted": 0.98,
    "normalized": 0.98,
    "trust_multiplier": 0.88,
    "components": {
      "ekill": 1.08,
      "aim": 1.22,
      "kast": 0.97,
      "util": 0.84,
      "clutch": 1.0
    },
    "raw": {
      "ekill_raw": 1.04,
      "aim_cpq": 0.61,
      "aim_csq": 0.44,
      "aim_ttd": 0.58,
      "aim_scs": 0.72,
      "kast_percentage": 0.76,
      "clutch_attempts": 0,
      "clutch_wins": 0
    }
  }
}
```

This fits the existing Symfony `AnalysisResult` model and avoids schema churn
while TRACE is being validated.

### Relational storage later

Add a dedicated `trace_rating` table after the MVP proves useful for history,
ranking, and percentiles.

Suggested table fields:

- `id`
- `analysis_result_id`
- `player_id`
- `demo_id`
- component scores
- raw component values
- `trace_base`
- `trace_adjusted`
- `trace_normalized`
- `trace_percentile`
- `trust_multiplier`
- `calibration_version`
- `round_count`
- `calculated_at`

Add `player_trace_aggregate` only when the UI needs cross-match trend views.

## API and UI Integration

Symfony should expose TRACE as part of player analysis results:

```json
{
  "steamId": "7656119...",
  "name": "player",
  "overallScore": 0.41,
  "overallVerdict": "suspicious",
  "trace": {
    "base": 1.12,
    "adjusted": 0.98,
    "normalized": 0.98,
    "trustMultiplier": 0.88,
    "components": {
      "ekill": 1.08,
      "aim": 1.22,
      "kast": 0.97,
      "util": 0.84,
      "clutch": 1.0
    }
  }
}
```

Frontend display requirements:

- Show TRACE separately from cheat suspicion.
- Show the Trust multiplier explicitly.
- Explain adjusted TRACE as "rating after suspicion adjustment."
- Do not imply that a low Trust multiplier proves cheating.

## Later SWING Enhancement

SWING should become a Phase 2 TRACE feature after the MVP.

Train a win-probability model on CS2CD-derived round states:

- `n_alive_ct`
- `n_alive_t`
- `ct_equipment_value`
- `t_equipment_value`
- `equipment_ratio`
- `bomb_planted`
- `time_remaining_seconds`
- `round_number`
- one-hot map columns

Target:

- `round_winner`

Recommended model:

- XGBoost classifier or a simpler calibrated logistic baseline first.
- Persist as `models/win_probability.pkl`.
- Track training dataset version and validation AUC.

SWING can then replace part of KAST or become a sixth component:

```text
trace_base =
    eKILL  * 0.28 +
    AIM    * 0.20 +
    SWING  * 0.18 +
    KAST   * 0.15 +
    UTIL   * 0.10 +
    CLUTCH * 0.09
```

Do not enable SWING in final ratings until validation shows stable behavior.

## Implementation Order

1. Implement `TraceCalculator` and eKILL helpers.
2. Add unit tests for formula edges and Trust behavior.
3. Build `TraceComponents` from existing parser and feature outputs.
4. Store TRACE in `support_data.trace`.
5. Expose TRACE through Symfony response factories.
6. Add frontend types and result display.
7. Add calibration storage and percentile computation.
8. Add relational TRACE tables if ranking/history queries need them.
9. Add SWING and win-probability model as a separate phase.

## Test Matrix

Required unit tests:

- AK vs Glock kill is discounted.
- Deagle vs M4 kill is rewarded.
- Knife attacker does not divide by zero.
- Player with zero kills does not crash.
- Player with no clutch situations gets neutral clutch.
- Suspicion `0.0` gives Trust `1.00`.
- Suspicion `1.0` gives Trust `0.73`.
- Global average `0.0` does not divide by zero.
- Component values outside expected ranges are clamped.

Required integration tests:

- Python result writer includes `support_data.trace`.
- Symfony result ingest preserves TRACE data.
- API response exposes TRACE per player.
- Frontend renders TRACE without merging it into suspicion verdicts.

## Open Decisions

- Should TRACE rank players by `trace_adjusted` or show leaderboards by both
  `trace_base` and `trace_adjusted`?
- Should calibration be global, map-specific, skill-bracket-specific, or all
  three?
- Should Trust use only `overall_suspicion_score`, or should severe labels such
  as `likely_cheating` apply an additional UI warning without changing the math?
- Should TRACE be added to player history immediately, or only after the first
  calibration pass?
