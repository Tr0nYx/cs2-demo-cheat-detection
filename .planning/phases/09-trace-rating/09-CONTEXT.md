# Phase 9: TRACE Rating System — Context & Decisions

**Phase Goal:** Implement a transparent player impact rating (TRACE) that complements the existing cheat-suspicion pipeline. Both signals must stay visible and separate.

**Status:** Decisions locked, ready for planning.

---

## Locked Decisions

### 1. Component Scope: ALL 5 MVP COMPONENTS

**Decision:** Implement complete MVP with all five TRACE components.

**Components in scope:**
- **eKILL**: Economy-adjusted kill value (weapon equity scoring)
- **AIM**: Mechanical skill score (crosshair placement, shot velocity, reaction time, spray control)
- **KAST**: Round participation percentage
- **UTIL**: Team utility impact (flashes, grenades, damage)
- **CLUTCH**: High-value round wins (1v1, 1v2, 1v3, 1v4, 1v5)

**Rationale:** MVP is feature-complete per TRACE.md. All components use existing parsed data; no new extractors needed. Delivers a product-ready rating in one phase.

**Out of Scope (Phase 9b feature):**
- SWING component (win-probability ML model) — deferred to later phase

**Implementation notes:**
- Reuse existing feature outputs from `python/features/*` where possible
- Use TRACE.md formulas exactly: eKILL weighting 0.30, AIM 0.25, KAST 0.20, UTIL 0.15, CLUTCH 0.10
- Trust multiplier: `clamp(1.0 - (suspicion_score * 0.30), 0.73, 1.00)` where suspicion_score comes from Phase 7 `weighted_scorer`

---

### 2. Storage Strategy: DIRECT RELATIONAL (new trace_rating table)

**Decision:** Create dedicated `trace_rating` table; do NOT use support_data JSON.

**Schema (draft — to be detailed in PLAN):**
```sql
trace_rating:
  - id (PK)
  - analysis_result_id (FK)
  - player_id (FK)
  - demo_id (FK)
  - calibration_version (string)
  - trace_base (float)
  - trace_adjusted (float)
  - trace_normalized (float)
  - trust_multiplier (float)
  - trace_percentile (float, nullable)
  - round_count (int)
  - components: ekill, aim, kast, util, clutch (float each)
  - raw_components: ekill_raw, aim_cpq, aim_csq, aim_ttd, aim_scs, kast_percentage, clutch_attempts, clutch_wins
  - calculated_at (timestamp)
```

**Rationale:** 
- Skip MVP JSON approach — TRACE is core to results, not auxiliary data
- Relational storage allows queries, percentiles, and history from the start
- Cleaner than future migration from JSON to table
- Supports aggregation queries needed for calibration and trends

**Calibration persistence:**
- Add separate `trace_calibration` table to store versions, sample_size, global_average, percentiles, created_at
- Load calibration at analysis time, store version in each trace_rating row for reproducibility

**Migration:** Add new tables in Phase 9 PLAN (no schema from previous phases to worry about).

---

### 3. API Contract: NEW DEDICATED ENDPOINT

**Decision:** Create new endpoint `/api/demos/{id}/trace` (separate from `/api/demos/{id}/results`).

**Response contract (draft):**
```json
GET /api/demos/{id}/trace
{
  "trace": {
    "base": 1.12,
    "adjusted": 0.98,
    "normalized": 0.98,
    "trustMultiplier": 0.88,
    "percentile": 0.65,
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

**Rationale:**
- Dedicated endpoint is RESTful and explicit
- Frontend can fetch TRACE independently (optional, doesn't block player results)
- Allows lazy-loading or separate caching strategies
- Cleaner separation of concerns

**Existing endpoint note:** `/api/demos/{id}/results` remains unchanged; TRACE is accessed separately.

**Error handling:**
- 404 if demo not found
- 422 if TRACE not yet calculated (still queued)
- 200 with null components if < 100 samples (calibration fallback)

---

### 4. Calibration Strategy: 100-Sample Trigger

**Decision:** Follow TRACE.md spec exactly — use hardcoded defaults until 100 completed player-match ratings exist.

**Behavior:**
- **< 100 samples:** Use default constants (global_average = 1.0, component defaults)
- **≥ 100 samples:** Calculate live medians, percentiles, per-component means/stdevs from stored ratings
- **Calibration updates:** Recalculate after each batch of ~50 new ratings (not per-rating to avoid churn)
- **Fallback during live calc:** If calibration query fails, use defaults

**Calibration version tracking:**
- Each TRACE result stores `calibration_version` (e.g., "default-v1", "live-v1")
- Old results remain reproducible with their original calibration
- Prevents silent recalculation of historical ratings

**Rationale:**
- 100-sample threshold balances safety (enough data) with speed (not too slow to start)
- Explicit defaults prevent division-by-zero or NaN in early deploys
- Version tracking is research best-practice

---

### 5. Frontend Integration: SEPARATE TRACE CARD

**Decision:** Display TRACE on Results screen as a dedicated visual card, separate from suspicion verdict.

**Design constraints:**
- **Never merge TRACE and suspicion into one verdict** — two independent signals must stay visible
- **Trust multiplier labeled explicitly** as "rating after suspicion adjustment" (not proof of cheating)
- **Show all three TRACE values:** base, adjusted, normalized
- **Component breakdown available** (expandable section or hover)

**Placement:**
- Results screen shows player suspicion card + TRACE card side-by-side (or stacked on mobile)
- History/leaderboard (future phase) can sort by TRACE independently

**Rationale:**
- Transparency: users see both impact and suspicion without conflation
- Prevents misinterpretation of low trust multiplier as evidence of cheating
- Foundation for future TRACE-only rankings or trend analysis

---

### 6. Phase Dependencies: INDEPENDENT FROM 7+8

**Decision:** Phase 9 can proceed in parallel or immediately after Phase 7 (which provides `suspicion_score`).

**Hard dependency:**
- Phase 7 must be complete — `weighted_scorer.overall_suspicion_score` is used for Trust multiplier

**Soft dependencies (already exist):**
- Phase 3 parser and demo loading (existing)
- Phase 6 frontend infrastructure (existing)
- Phase 7 feature extractors and scoring (existing)

**Why independent:**
- All required feature outputs already exist or will be generated during Phase 9 demo analysis
- No Phase 8-specific features needed
- TRACE calculator is standalone Python module

**Execution:** Can plan Phase 9 immediately; can execute after Phase 7 ships.

---

### 7. Testing Strategy: UNIT + INTEGRATION

**Decision:** Implement both unit and integration test coverage.

**Unit tests (python/tests/test_trace_rating.py):**
- Formula validation: AK vs Glock kill discount, Deagle vs M4 reward
- Knife attacker does not divide by zero
- Player with zero kills does not crash
- Player with no clutch situations gets neutral score
- Suspicion 0.0 → Trust 1.00, Suspicion 1.0 → Trust 0.73
- Component values clamped to expected ranges
- Calibration fallback when no sample data
- Percentile computation edge cases

**Integration tests (python/tests/test_trace_integration.py):**
- Parser output → Component extraction → TRACE calculation → Result writer
- Symfony ingests TRACE data from result_writer
- API endpoint returns TRACE with correct structure
- Frontend can render TRACE without errors
- Historical TRACE data queryable with calibration_version

**Test data:**
- Use existing Phase 7 demo fixtures
- Generate synthetic edge cases (0-kill player, 100% clutch wins, etc.)
- Validate against TRACE.md test matrix

**Rationale:**
- Unit tests verify formula correctness (fast feedback)
- Integration tests catch data flow breakage (catches real issues)
- Test matrix in TRACE.md is prescriptive

---

## Gray Areas RESOLVED → DEFERRED

### Initially Gray, Now Clear:
- ✅ Component scope → All 5 MVP
- ✅ Storage → Relational tables
- ✅ API → New endpoint
- ✅ Calibration → 100-sample trigger
- ✅ Frontend → Separate card
- ✅ Dependencies → Independent from 8
- ✅ Testing → Unit + Integration

### Deferred (Not Phase 9):
- **Leaderboards / Trend visualization** → Phase 10
- **SWING component (win-probability model)** → Phase 9b or v3
- **Map-specific or skill-bracket calibration** → Future enhancement
- **TRACE-only ranking UI** → Future enhancement

---

## Implementation Sequence (Recommended)

For PLAN phase, suggest this wave order:

1. **Wave 1 — Python Foundation:**
   - Create `python/scoring/trace_rating.py` (dataclasses, formula implementation)
   - Create `python/scoring/trace_components.py` (extraction helpers)
   - Unit tests for all components
   
2. **Wave 2 — Database & Persistence:**
   - Create `trace_rating` and `trace_calibration` tables in Symfony migrations
   - Update `result_writer.py` to persist TRACE output
   - Calibration calculation and storage

3. **Wave 3 — Symfony API:**
   - Create `/api/demos/{id}/trace` endpoint and response factory
   - Integrate suspicion_score loading from Phase 7

4. **Wave 4 — Frontend:**
   - React components for TRACE display
   - Fetch TRACE from new endpoint
   - Integration tests

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Calibration with < 100 samples produces unreliable percentiles | Users see inaccurate ranks early | Use explicit defaults, clear UI about "preliminary" status |
| Trust multiplier misinterpreted as proof of cheating | False conviction in community | Label explicitly "suspicion adjustment", not proof |
| TRACE components correlated with suspicion | Redundant signal | Keep independent calculation, separate display |
| New tables add migration overhead | Slower release | Plan migrations early, test in Docker Compose |

---

## References

- **TRACE Spec:** [.planning/TRACE.md](./../../../TRACE.md) (full implementation order, formulas, definitions)
- **Existing Scoring:** `python/scoring/weighted_scorer.py` (Phase 7 suspicion_score)
- **Feature Extractors:** `python/features/*.py` (AIM, wallhack, bhop, session, recoil)
- **Result Persistence:** `python/persistence/result_writer.py` (where TRACE will be written)
- **Parser:** `python/parser/adapter.py` + `python/sharecode_parser.py`

---

**Context locked by user discussion on 2026-05-16.**
Ready for PLAN phase.
