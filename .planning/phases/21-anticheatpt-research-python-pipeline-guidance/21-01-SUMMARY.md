# Phase 21-01 Summary: AntiCheatPT Python Research and Pipeline Guidance

## What was executed

- Reviewed the Phase 21 planning artifacts and current Python backend pipeline files.
- Confirmed there is one active plan: `21-01-PLAN.md` (wave 1, research/analysis/documentation).
- Created this summary as the execution outcome for the research wave.

## Key AntiCheatPT-aligned Python patterns

1. `demoparser2` / parser adapter pattern
   - AntiCheatPT expects a dedicated parser boundary that returns structured tick and event tables.
   - Our pipeline already uses `python/parser/adapter.py` and `ParsedDemo` as a clean boundary in `python/worker.py`.
   - Recommendation: enforce strict validation of tick/event schema and fail fast on malformed demos.

2. Steam ID normalization and anonymization
   - External datasets map or hash Steam IDs to avoid leaking raw identifiers.
   - Our worker already normalizes Steam IDs via `_normalize_steam_id` and `_string_series`.
   - Recommendation: preserve this normalization, and document the research guardrail that only stable internal IDs should be persisted.

3. Event-to-DataFrame conversion and JSON-safe storage
   - AntiCheatPT stores tick data as columnar formats and event sequences as JSON records.
   - `python/persistence/result_writer.py` already sanitizes NaN/Inf for JSON persistence.
   - Recommendation: continue using parameterized queries and JSON-serializable feature payloads, with explicit type-safe conversion for events.

4. Context-window feature extraction
   - The external pipeline builds fixed-length context windows around kills and important events, normalizing spatial/angle/velocity features.
   - Our current worker slices player-specific demos and includes opponent footsteps, which is a compatible first step.
   - Recommendation: add reusable window construction helpers in `python/features/` and normalize continuous features before scoring.

5. Conservative scoring and evidence gating
   - AntiCheatPT-style research pipelines gate high-confidence labels behind multiple independent strong signal families.
   - `python/scoring/weighted_scorer.py` already applies conservative cap logic and redistributes weights when features fail.
   - Recommendation: keep the existing `likely_cheating` cap rules, document them clearly, and add explicit evidence metadata support in feature results.

## Specific code-level recommendations

- `python/worker.py`
  - Keep `DemoParserAdapter` as the parse boundary and ensure `parse_demo` raises `DemoParseError` for malformed input.
  - Continue normalizing Steam IDs at the parser/worker boundary so all downstream logic sees stable string IDs.
  - Maintain the player-specific slice logic, and consider a separate helper for "context windows around kills" when generating feature inputs.

- `python/scoring/weighted_scorer.py`
  - Preserve proportional redistribution for missing features.
  - Continue using conservative caps for likely-cheating labels when only one strong signal family exists.
  - Add optional `metadata` evidence handling to feature results so future AntiCheatPT-derived features can encode `evidence_strength` and `confidence` explicitly.

- `python/persistence/result_writer.py`
  - Continue sanitizing JSON values (`NaN`, `Inf`, `np.ndarray`) before persistence.
  - Document the distinction between feature-level evidence data and final suspicion labels.

- `python/parser/__init__.py`
  - The existing adapter export is appropriate. Ensure the public API stays small: `ParsedDemo`, `DemoParseError`, `DemoParserAdapter`.

## Execution outcome

- Phase 21 plan exists and is correct.
- The roadmap entry for Phase 21 is present and verified.
- Plan execution is research-only: no code changes were made yet.
- This summary captures the actionable guidance needed for a follow-up implementation phase.

## Next steps

- Implement the parser validation and context-window feature helpers in the next Phase 21 implementation wave.
- Add targeted tests for parser schema validation, Steam ID normalization, and scoring cap behavior.
- Create a follow-up summary file after code changes are applied and validated.
