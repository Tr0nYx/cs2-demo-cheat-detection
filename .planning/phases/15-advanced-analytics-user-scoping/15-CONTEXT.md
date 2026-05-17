# Phase 15: Advanced Analytics & User Scoping

**Phase Goal:** Enable authenticated users to customize analysis scope with real-time filtering, explore sensitivity of detection models through interactive threshold adjustment, discover player profiling trends over time, and leverage advanced leaderboard filtering for cohort analysis.

**Status:** Implementation decisions locked and ready for research/planning.

## Business Context

Current state: Users have personalized dashboards with demo history (Phase 14), global leaderboards (Phase 12), and TRACE component breakdowns (Phases 9-12). Phase 15 deepens user insights by:
- Letting users ask **"How does my score change if I filter to just Mirage?"** (User Analysis Scoping)
- Showing **"Which detection features have the biggest impact on my suspicion level?"** (Sensitivity Analysis)
- Tracking **"Am I improving or getting more inconsistent over time?"** (Player Profiling Trends)
- Enabling **"Show me top players on this map in this skill band"** (Advanced Dashboard Filtering)

Phase 15 transforms the dashboard from a demo browser into a **research platform** where players understand the signals driving their suspicion scores.

## Dependencies

- Phase 14: Landing Page + Steam Login (authenticated user sessions, User entity)
- Phase 12: TRACE Leaderboards (leaderboard infrastructure, ranking data)
- Phase 9: TRACE Rating System (component-level scoring, feature weights)
- Phase 13: 2D Demo Viewer + Heatmap (raw analysis data available for replay)

## Success Criteria

1. **User Analysis Scoping:** Authenticated user can apply real-time filters (map, opponent rating, game outcome, timeframe) and see filtered stats/TRACE updated immediately. Filters persist as browser history (last N combinations auto-loaded on next visit).
2. **Sensitivity Analysis:** User can adjust individual feature thresholds (aimbot, wallhack, recoil, etc.) with live score preview. Changes are reflected immediately in suspicion score display.
3. **Player Profiling Trends:** Dashboard shows 3 trend metrics: consistency over time (variance band), improvement arc (trend line with flags for jumps/decay), weapon-specific strengths (heatmap: AK/AWP/pistol performance).
4. **Advanced Leaderboard Filtering:** Global leaderboard view accepts filters (map, rating band, region, timeframe) and updates rankings dynamically. Users discover top players in their niche.
5. **Hybrid Computation:** Frontend provides live preview of sensitivity changes; backend API validates and persists final comparisons via new `/api/analytics/compare` endpoint.
6. **No explicit storage:** Recent filter combinations auto-loaded via browser history, not database. Sensitivity comparisons not persisted unless user explicitly saves.

## Architectural Decisions (LOCKED)

### 1. User Analysis Scoping — Real-Time Multi-Filter Query

**Decision:** Users apply multiple filters simultaneously. Filtering is immediate (React state update) with backend query for re-calculated stats.

**Filters Included:**
- **Map:** Mirage, Inferno, Nuke, Ancient, Vertigo, Dust2, etc. (single or multi-select)
- **Opponent Rating Band:** Below 5 RWS, 5-10 RWS, 10+ RWS (using estimated rating or ladder position)
- **Game Outcome:** Win/Loss/Draw (separate wins from losses)
- **Timeframe:** All-time, Last 7/30/90 days (default: all-time)

**UX Pattern:** Sidebar filter panel on dashboard. User adjusts filters → state updates → UI re-queries `/api/demos?filters={map,rating,outcome,days}` → stats re-render.

**Persistence:** Browser history tracking (localStorage-based recent filter states). No database storage. Most recent filter combo auto-loads on next session.

**Rationale:** Reduces database writes, keeps UX responsive, lets users explore without friction. If power users request "saved filter presets" later, that's Phase 15+ scope creep.

---

### 2. Sensitivity Analysis — Individual Feature Thresholds with Live Preview

**Decision:** Users adjust individual feature thresholds (aimbot, triggerbot, wallhack, recoil, bhop, session) independently. Changes update suspicion score in real-time.

**Mechanism:**
- **Frontend:** Sliders for each feature (0-100 scale). Each slider maps to the feature's threshold cutoff.
- **Real-time Preview:** Frontend re-calculates estimated score based on current settings (using pre-fetched feature vectors from last API call).
- **Backend Validation:** When user requests "save this comparison," POST to `/api/analytics/compare` with adjusted thresholds. Backend re-scores against ground truth and returns certified comparison.

**UI Presentation:** "Sensitivity Tuner" panel on demo detail page. Shows:
- Default thresholds (from system config)
- User's current settings
- Live suspicion score preview (client-side estimate)
- "Save Comparison" button → Backend validation + storage

**Output:** Comparison artifact stored transiently (not in database; session-lifetime reference via query params). Shows:
- Baseline suspicion (system defaults)
- Tuned suspicion (user's custom thresholds)
- Impact breakdown: "Aimbot sensitivity: -15% impact, Wallhack: +8% impact, ..."

**Rationale:** Immediate feedback loop (sliders) explores user intuition; backend validation ensures comparisons are trustworthy. Transient storage avoids database bloat.

---

### 3. Player Profiling Trends — Three Key Metrics

**Decision:** Dashboard shows three trend visualizations tracking a user's profile over time:

#### 3a. Consistency Over Time
- **Metric:** Suspicion score variance across all demos (rolling 30-day window, updated daily).
- **Visualization:** Area chart with mean ± 1σ band. High variance = inconsistent play; low variance = stable.
- **Data Source:** `/api/analytics/trends/consistency?user_id={id}&window=30d`
- **Trigger:** Flagged if variance increases >20% week-over-week (possible device change, fatigue, or adaptation).

#### 3b. Improvement / Degradation Arc
- **Metric:** Trend line fit to suspicion scores (least-squares regression over all demos, ordered by date).
- **Visualization:** Line chart. Slope indicates improvement (negative = less suspicious) or degradation (positive = more suspicious).
- **Flags:** Jump detection (2σ outlier demos flagged as potential cheat introduction or anti-cheat adjustment).
- **Data Source:** `/api/analytics/trends/arc?user_id={id}`

#### 3c. Weapon-Specific Strengths
- **Metric:** Average suspicion per weapon class (Rifle/Pistol/Sniper/SMG).
- **Visualization:** Heatmap/bars showing which weapon classes the user excels at (low suspicion) vs struggles with (high suspicion).
- **Data Source:** `/api/analytics/trends/weapons?user_id={id}`

**Rationale:** Three metrics provide multidimensional profile without overwhelming. Consistency + Arc capture temporal dynamics; Weapons capture playstyle diversity. Flags alert users to anomalies.

---

### 4. Advanced Leaderboard Filtering — Map/Rating/Region/Timeframe

**Decision:** Global leaderboard view accepts 4 filter dimensions. Filters narrow the ranked player list dynamically.

**Filters:**
- **Map:** Specific map or aggregate across all maps
- **Rating Band:** 0-5 RWS, 5-10 RWS, 10+, or all (using inferred rating from leaderboard position or player history)
- **Region:** NA, EU, ASIA, or all (from GeoIP or user self-report; stretch goal for Phase 15)
- **Timeframe:** Last 7/30/90 days or all-time

**UX:** Filter sidebar on leaderboard page. User adjusts → rankings re-query `/api/leaderboards/filtered?map={x}&rating={band}&timeframe={y}` → updated rankings render.

**Scope:** Leaderboard rankings only. Does NOT enable cohort analysis (compare two groups side-by-side) — that's Phase 15+ scope creep.

**Rationale:** Leaderboard discovery is the primary use case. Narrow scope keeps implementation bounded; cohort analysis is a clear future phase.

---

### 5. Computation Model — Hybrid (Frontend Preview + Backend Validation)

**Decision:** Sensitivity analysis uses a two-tier approach:

**Frontend Tier (Instant Feedback):**
- User adjusts sliders
- Frontend loads pre-fetched feature vectors from the demo
- Re-calculates estimated suspicion using adjusted thresholds
- Updates UI in real-time (100ms feedback loop)

**Backend Tier (Persistent Comparisons):**
- When user clicks "Save Comparison," POST to `/api/analytics/compare` with:
  - `demo_id`
  - `adjusted_thresholds` (custom feature settings)
- Backend re-scores using ground-truth feature extraction (ensures accuracy)
- Returns certified comparison (includes confidence bounds, potential drift from frontend estimate)
- Comparison stored transiently (session-lifetime via query param, not database)

**New API Endpoints:**
- `POST /api/analytics/compare` — Validate and return certified sensitivity comparison
- `GET /api/analytics/trends/consistency` — User consistency metrics
- `GET /api/analytics/trends/arc` — User improvement/degradation trend
- `GET /api/analytics/trends/weapons` — Weapon-specific performance breakdown
- `GET /api/leaderboards/filtered` — Leaderboards with dynamic filtering
- `PUT /api/user/filter-history` — Auto-save recent filter combinations (browser history mirror, optional)

**Rationale:** Frontend preview keeps UX snappy; backend validation ensures accuracy and prevents score spoofing. Hybrid minimizes data sent to client (no raw feature vectors in responses) while preserving interactivity.

---

### 6. Filter Persistence — Browser History (Hybrid Auto-Save)

**Decision:** Recent filter combinations are auto-saved to browser (localStorage or session history), NOT to database.

**Mechanism:**
- After user adjusts filters and applies them, the filter state is recorded in localStorage with timestamp.
- Last N (e.g., 5) filter combinations are retained.
- On dashboard load, most recent combination auto-loads (if present and not stale).
- User can "clear history" in settings.

**Why Not Database:**
- Reduces writes, keeps schema simple.
- Filters are user-specific and ephemeral (not team/org level).
- localStorage is sufficient for single-device persistence.

**Why Not Browser-Only:**
- Users expect filters to persist across devices. This will be addressed in Phase 15+ (requires backend storage).
- Current approach (localStorage) provides single-device convenience without over-engineering.

**Rationale:** Minimal storage footprint, maximum UX responsiveness, allows for database-backed version in future without architectural redesign.

---

## Implementation Constraints

1. **Frontend Feature Vectors:** Sensitivity analysis requires access to per-demo feature vectors (aimbot score, wallhack score, etc.). These must be available in the frontend, either:
   - Pre-fetched with demo detail (adds payload ~5KB)
   - Computed on-demand (adds latency, not preferred)
   - Stored in React Query cache (preferred)

2. **Leaderboard Ranking Recalculation:** Filtered leaderboards require dynamic ranking (users ranked differently on "Mirage" vs "all maps"). Must avoid N+1 queries:
   - Pre-compute common filter combinations (e.g., per-map rankings) and cache in Redis
   - Or accept ~500ms latency for on-demand ranking queries

3. **Trend Calculation Window:** Consistency/arc metrics are calculated over rolling windows (e.g., 30-day consistency). Must define:
   - Minimum demo count to compute trends (e.g., 5+ demos required)
   - Backfill strategy if new window triggers (e.g., weekly recompute, or lazy-compute on request)

4. **Region Detection (Optional):** Leaderboard filtering by region requires either:
   - User self-report in profile (easy, optional for Phase 15)
   - GeoIP from Faceit API (if demos are imported via Faceit; Phase 15+ stretch)

5. **Weapon Classification:** Demo data must include weapon used in each round. Verify that demo parser extracts weapon data and stores it in `AnalysisResult`.

---

## Data Flow

```
User on Dashboard (Authenticated)
  ↓ Views filter sidebar
  ↓ Selects: Map=Mirage, Outcome=Win, Timeframe=Last 30d
  ↓ Client updates React state → triggers re-query
  ↓ Frontend fetches /api/demos?filters={...}
  ↓ Backend returns filtered demos + aggregated stats
  ↓ UI renders filtered demo list + updated TRACE average

User on Demo Detail (Sensitivity)
  ↓ Clicks "Sensitivity Tuner"
  ↓ Sliders appear with current thresholds
  ↓ User adjusts Aimbot slider
  ↓ Frontend re-calculates score from feature vectors (instant)
  ↓ Score updates in real-time
  ↓ User clicks "Save Comparison"
  ↓ POST /api/analytics/compare {demo_id, thresholds}
  ↓ Backend re-scores, validates, returns certified result
  ↓ Comparison stored as transient artifact, displayed on page

User on Leaderboard (Advanced Filtering)
  ↓ Filter sidebar shows Map, Rating, Region, Timeframe
  ↓ User selects Map=Inferno, Rating=10+, Timeframe=Last 7d
  ↓ Frontend queries /api/leaderboards/filtered
  ↓ Backend returns top 100 players matching filters, ranked
  ↓ UI renders filtered leaderboard

User Returns to Dashboard (Next Session)
  ↓ Most recent filter combo auto-loads from localStorage
  ↓ Dashboard renders with previous filters applied

Player Profiling (Trends Page)
  ↓ System queries /api/analytics/trends/consistency, /arc, /weapons
  ↓ Backend computes metrics (or loads from cache)
  ↓ Frontend renders 3 trend visualizations
  ↓ Flags displayed for volatility jumps, improvement arcs, weapon disparities
```

---

## Canonical References

- `.planning/phases/14-landing-steam-login/14-CONTEXT.md` — User authentication and session management decisions
- `.planning/phases/12-trace-leaderboards/` — Leaderboard ranking system and data model
- `.planning/phases/09-trace-rating-system/` — Feature weighting, component scoring, TRACE calculation
- `.planning/PROJECT.md` — Tech stack (Symfony 7, React/Next.js, PostgreSQL)

---

## Deferred Ideas

- **Cohort Analysis:** Compare two player groups side-by-side. Requires phase-level scope. Deferred to Phase 15+ (e.g., Phase 16).
- **Saved Filter Presets:** Explicit "save this filter combo with a name" (vs auto-recent). Requires database schema. Deferred to Phase 15+.
- **Region Detection (GeoIP):** Auto-detect player region. Depends on Faceit API integration. Deferred to Phase 15+.
- **Custom Threshold Presets:** Pre-built sensitivity profiles (e.g., "strict," "balanced," "lenient"). Deferred to Phase 15+.

---

## Next Steps

1. **Research Phase:** Validate API contract for feature vectors, leaderboard pre-computation strategy, trend calculation algorithm choices.
2. **Planning Phase:** Breakdown into 4-5 waves covering (1) filter UI + backend query, (2) sensitivity analysis, (3) trends, (4) advanced leaderboard, (5) polish/testing.
3. **Execution Phase:** Implement waves in parallel where possible (filter UI is independent from trends; leaderboard filtering independent from sensitivity).

---

**Created:** 2026-05-17  
**Status:** Context locked, ready for research and planning.
