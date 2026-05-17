# Phase 15 Discussion Log

**Phase:** 15 - Advanced Analytics & User Scoping  
**Date:** 2026-05-17  
**Participants:** User (visionary), Claude (builder)

---

## Discussion Summary

Gray areas were identified across four implementation domains: User Analysis Scoping, Sensitivity Analysis, Player Profiling Trends, and Advanced Dashboard Filtering. User confirmed all four areas are important for Phase 15. Discussion then deepened each area with specific architectural choices.

---

## Area 1: User Analysis Scoping

### Question 1: Filter Architecture
**Options Presented:**
- Persistent filter presets (user saves filter combinations, only selected preset applies)
- **Real-time multi-filter query** ← SELECTED
- Comparison mode (side-by-side filtered subsets)

**User Selection:** Real-time multi-filter query

**Rationale:** Users want immediate feedback when adjusting filters. Interactive exploration is more important than preset management (which can be Phase 15+ scope creep).

---

### Question 2: Filter Dimensions
**Options Presented:**
- **Map (Mirage, Inferno, etc.)** ← SELECTED
- **Opponent rating band** ← SELECTED
- **Game outcome (win/loss)** ← SELECTED
- **Timeframe (last N days)** ← SELECTED

**User Selection:** All four dimensions

**Rationale:** Complete multi-dimensional filtering enables targeted analysis ("wins on Mirage against high-rated opponents"). No single dimension provides enough insight alone.

**Constraint:** Weapon-specific filtering (e.g., "AWP-only") deferred — not essential for v1, can follow in Phase 15+.

---

## Area 2: Sensitivity Analysis

### Question 3: Feature Adjustment Approach
**Options Presented:**
- **Individual feature thresholds** ← SELECTED
- Global confidence slider (single knob)
- Weapon-specific weights

**User Selection:** Individual feature thresholds

**Rationale:** Users want granular control to understand which signals matter. Adjusting aimbot threshold independently from wallhack reveals impact of each detection channel.

---

### Question 4: Presentation Format
**Options Presented:**
- **Interactive sliders with live score preview** ← SELECTED
- Comparison table (stock vs tuned side-by-side)
- Sensitivity report view (separate page)

**User Selection:** Interactive sliders with live score preview

**Rationale:** Live feedback loop (sliders + instant score update) enables intuitive exploration. Users can "tune until they find the right setting."

**Scope:** "Save Comparison" feature added to persist certified comparisons (backend-validated). Report view deferred to Phase 15+.

---

## Area 3: Player Profiling Trends

### Question 5: Trend Metrics
**Options Presented:**
- **Consistency over time** ← SELECTED
- **Improvement/degradation arc** ← SELECTED
- **Weapon-specific strengths** ← SELECTED

**User Selection:** All three metrics

**Rationale:** Three metrics provide complementary insights:
- Consistency reveals playstyle stability (variance)
- Arc reveals skill trajectory (improvement/decay)
- Weapons reveal playstyle diversity (which weapons are their strength)

**Anomaly Detection:** Flags added for:
- Variance jumps >20% week-over-week (consistency)
- Outlier demos (arc) — 2σ jumps suggest cheat introduction or config change
- Weapon disparities — high variance in weapon performance

---

## Area 4: Advanced Dashboard Filtering

### Question 6: Leaderboard Filtering Priority
**Options Presented:**
- **Leaderboard filters (map, rating, region, timeframe)** ← SELECTED
- Cohort analysis (compare player groups)
- Public trend reports (meta shifts)

**User Selection:** Leaderboard filters

**Rationale:** Leaderboard discovery is the primary use case. Users want to find top players in their niche (e.g., "best Mirage players in 10+ RWS"). Cohort analysis is a separate research feature for Phase 15+.

---

## Architectural Clarifications

### Question 7: Filter Persistence
**Options Presented:**
- Save to database (explicit filter presets)
- Browser-only (localStorage, ephemeral)
- **Hybrid: auto-save recent** ← SELECTED

**User Selection:** Hybrid (auto-save recent)

**Rationale:** Recent filter combinations are auto-loaded on next session (convenience), but no explicit "save preset" feature (reduces database writes). If power users later request named presets, that's Phase 15+ scope.

**Implementation:** Most recent N filter combos stored in localStorage, loaded on dashboard init.

---

### Question 8: Computation Model
**Options Presented:**
- Backend API (Symfony re-scores; slower for interactive)
- Frontend (React in-browser; instant, requires feature vectors)
- **Hybrid** ← SELECTED

**User Selection:** Hybrid (frontend preview + backend validation)

**Rationale:** Frontend sliders provide instant feedback (user responsiveness); backend API validates when user saves (accuracy + security). Prevents score spoofing via client-side manipulation.

**New Endpoints:**
- `POST /api/analytics/compare` — Backend-validated comparison
- `GET /api/analytics/trends/*` — Trend metrics (consistency, arc, weapons)
- `GET /api/leaderboards/filtered` — Dynamic leaderboard filtering

---

## Decisions Locked

### User Analysis Scoping
- ✅ Real-time multi-filter query (not presets)
- ✅ Four filter dimensions: Map, Opponent Rating, Game Outcome, Timeframe
- ✅ Filter state persisted as browser history (localStorage), not database

### Sensitivity Analysis
- ✅ Individual feature thresholds (not global slider)
- ✅ Interactive sliders with live preview
- ✅ "Save Comparison" feature for backend-validated results

### Player Profiling Trends
- ✅ Three trend visualizations: Consistency, Improvement Arc, Weapon Strengths
- ✅ Anomaly flags for volatility jumps, outlier demos, weapon disparities

### Advanced Filtering
- ✅ Leaderboard filters: Map, Rating Band, Region, Timeframe
- ✅ Dynamic ranking (filtered leaderboards recalculate on-demand)

### Computation & Persistence
- ✅ Hybrid model: Frontend preview (instant) + Backend validation (accurate)
- ✅ Filter combinations auto-saved to browser history (not database)
- ✅ Sensitivity comparisons stored transiently (session-lifetime)

---

## Scope Deferred to Phase 15+

The following were discussed and explicitly deferred:

1. **Cohort Analysis** — Compare two player groups side-by-side. Requires custom UI for cohort building. Phase 15+ scope.
2. **Saved Filter Presets** — Named, explicit "save this filter combo" feature. Requires database schema. Phase 15+ scope (current: auto-recent only).
3. **Region Detection (GeoIP)** — Auto-detect player region. Depends on Faceit API. Phase 15+ scope.
4. **Custom Sensitivity Presets** — Pre-built profiles (strict/balanced/lenient). Phase 15+ scope.
5. **Sensitivity Report View** — Separate page showing score stability. Phase 15+ scope (current: interactive sliders only).
6. **Weapon-Specific Filtering** — "AWP-only" or "Pistol-only" analysis. Phase 15+ scope.

---

## Implementation Guidance for Downstream Agents

### For gsd-phase-researcher

Key areas to validate:
1. **Feature Vector Availability:** Confirm that demo analysis includes per-feature scores (aimbot, wallhack, etc.). Needed for sensitivity analysis frontend preview.
2. **Leaderboard Pre-Computation:** Decide on filtering strategy — pre-compute per-map rankings (Redis cache) or allow on-demand ranking queries (acceptable latency: ~500ms).
3. **Trend Metrics:** Validate algorithm for consistency variance, improvement arc regression, and weapon classification.
4. **Database Constraints:** Verify PostgreSQL schema supports new queries (filtered demos, per-user trends).

### For gsd-planner

Suggested wave breakdown:
1. **Wave 1 (Filter UI & Backend):** Dashboard filter sidebar, `/api/demos?filters={...}` endpoint, localStorage persistence
2. **Wave 2 (Sensitivity Analysis):** Feature vector exposure, sensitivity slider UI, `/api/analytics/compare` endpoint
3. **Wave 3 (Trends):** Trend calculation engine, `/api/analytics/trends/*` endpoints, trend visualizations
4. **Wave 4 (Advanced Leaderboard):** Leaderboard filtering UI, `/api/leaderboards/filtered` endpoint
5. **Wave 5 (Testing & Polish):** E2E tests, performance validation, bug fixes

---

## Notes

- No blocking anti-patterns detected. Phase 15 builds on solid Phase 14 foundation (user auth, session management).
- SPEC.md not required for Phase 15 — context decisions are sufficient.
- All four implementation areas are independent enough to be planned in parallel after research. Filter UI can start while trends are being researched.

---

**Discussion Status:** Closed (all gray areas resolved)  
**Next:** Research phase, then planning (4-5 waves expected)
