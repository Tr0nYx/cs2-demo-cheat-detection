---
phase: 12
title: TRACE Leaderboards
status: planning
created: 2026-05-17
updated: 2026-05-17
---

# Phase 12: TRACE Leaderboards - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

## Phase Boundary

Phase 12 delivers global and per-map player rankings based on TRACE scores, plus a player comparison view. Players can see where they rank globally, how they compare on specific maps, how their performance trends over time, and how they stack up against other players side-by-side.

## Implementation Decisions

### Leaderboard Scope & Dimensions

- **D-01:** Leaderboards will include four dimensions: global (all players, all-time), per-map rankings, time-windowed rankings (30/90 days), and team leaderboards
- **D-02:** For team data: extract team names/context from sharecode imports (Phase 8), create a new Team entity in the database, and establish player-team associations
- **D-03:** Map leaderboards will use map data already extracted during demo analysis (Phase 3)
- **D-04:** Time-windowed leaderboards will filter by demo `calculated_at` timestamps (30 days, 90 days, etc.)

### Ranking Calculation Logic

- **D-05:** Ranking metric: 95th percentile of `trace_adjusted` score per player (showcases peak consistent performance without being outlier-dependent)
- **D-06:** Qualification threshold: Players must have at least 5 analyzed demos to appear on any leaderboard (filters noise, includes active/casual players)
- **D-07:** Ranking order: Sort all leaderboards descending by 95th percentile TRACE score

### Player Comparison View

- **D-08:** Comparison will show four metrics side-by-side: component breakdown (5 components with percentile badges), TRACE trend (last 10 demos), map affinity (top 3 maps by TRACE score), and match history (demos where both players participated)
- **D-09:** Layout: Use separate cards per metric (component card, trend card, map affinity card, history card) for clarity and scannability; cards can be rearranged or hidden by user preference
- **D-10:** Comparison is accessible via a "Compare" action on leaderboards or by searching two players directly

### API Endpoints & Caching

- **D-11:** Endpoint design: Separate endpoints per leaderboard type (clearer URLs, easier caching) — `GET /api/leaderboards/global`, `GET /api/leaderboards/maps/{mapId}`, `GET /api/leaderboards/windows/{timeWindow}`, `GET /api/leaderboards/teams/{teamId}`
- **D-12:** Each endpoint accepts pagination params: `?limit=100&offset=0` (default limit 100)
- **D-13:** Refresh strategy: Incremental real-time updates — when a demo finishes analysis, update only the affected player's leaderboard positions (global, map-specific, team-specific, time-window if applicable)
- **D-14:** No batch refresh job; leaderboards are computed on-demand from materialized views or incrementally updated tables to ensure freshness

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### TRACE System Foundation
- `.planning/ROADMAP.md` § Phase 9-11 — TRACE rating system, API, and visualizations (foundation for leaderboards)
- `.planning/phases/09-trace-rating/*-CONTEXT.md` — TRACE component definitions and calibration logic
- `.planning/phases/10-trace-api-frontend/*-CONTEXT.md` — `/api/demos/{id}/trace` endpoint and TraceCard component structure
- `.planning/phases/11-trace-visualizations/*-CONTEXT.md` — Percentile calculations, historical tracking, component visualization patterns

### Database & Query Patterns
- `symfony/src/Domain/Trace/TraceRating.php` — Entity structure: player_id, trace_adjusted, trace_normalized, components (ekill, aim, kast, util, clutch), calculated_at
- `symfony/src/Application/Query/GetPlayerTraceHistoryQuery.php` — Existing pagination pattern for player history queries
- `symfony/src/Domain/Demo/` — Demo entity (contains map field needed for per-map filtering)

### Team Data Integration (Phase 8 Sharecode)
- `.planning/phases/08-demo-download-sharecode/*-CONTEXT.md` — SharecodeImport entity and how team context is available from FACEIT/ESEA/Steam APIs

## Existing Code Insights

### Reusable Assets
- **TraceRating entity:** Already has indexed queries on `(player_id, calculated_at)` for efficient history lookups; can be reused for leaderboard calculations
- **GetPlayerTraceHistoryQuery / Handler:** Existing pagination and sorting pattern; can be adapted for leaderboard queries
- **PercentileBadge, TraceChart components (Phase 11):** Reusable for rendering player comparisons
- **React Query hooks:** Existing caching pattern for history data can be applied to leaderboard endpoints
- **Demo map field:** Already parsed during analysis (Phase 3); available for per-map filtering

### Established Patterns
- **CQRS queries:** Symfony uses immutable Query DTOs with handlers; follow this for LeaderboardQuery, PlayerComparisonQuery
- **Database indexing:** TraceRating indexes on (player_id, calculated_at) show the pattern; leaderboard queries will need indexes on (trace_95p_percentile, calculated_at) or materialized views
- **Incremental updates:** When demo analysis completes, AnalysisResult is persisted; this is the hook point for updating leaderboards incrementally

### Integration Points
- **Demo analysis completion:** Python worker finishes, Symfony creates AnalysisResult and TraceRating → trigger leaderboard recalc for affected player/map/team/time-windows
- **Team entity creation:** New domain object; will have player associations from sharecode imports
- **Frontend routing:** New pages: `/leaderboards/global`, `/leaderboards/maps/{mapId}`, `/players/{playerId}/compare?with={otherPlayerId}`

## Specific Ideas

- Leaderboards should be sortable (best TRACE, most improved, most recent) rather than just showing top 100
- Consider showing "You are ranked #47 globally" on player profile cards
- In time-window leaderboards, show the cutoff date clearly (e.g., "Last 30 days: ending 2026-05-17")
- Player comparison: highlight the highest component for each player visually (e.g., "Aim is your strength" vs. "Opponent's strength")

## Deferred Ideas

None — discussion stayed within phase scope. The following are potential Phase 13+ enhancements:
- Leaderboard filtering by role/weapon type (separate leaderboards for riflers, awpers, supports, etc.)
- "Most improved" leaderboard (steepest positive trend)
- Sensitivity analysis (what-if TRACE scenarios)
- Tournament/league leaderboards

---

*Phase: 12 - TRACE Leaderboards*
*Context gathered: 2026-05-17*
