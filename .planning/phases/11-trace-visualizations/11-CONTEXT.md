---
phase: 11
title: TRACE Advanced Visualizations
status: planning
created: 2026-05-16
updated: 2026-05-16
---

# Phase 11 Context: TRACE Advanced Visualizations

## Overview

Phase 11 enhances TRACE presentation with rich visualizations and historical context. Builds on Phase 10's API and frontend foundation to show players where they rank, how their skills trend, and which components drive their suspicion signal.

## Business Goal

Players understand their skill profile by:
- Seeing component scores compared to peers (percentiles)
- Viewing historical TRACE trend (improving/declining)
- Understanding component strength/weakness distribution
- Comparing against calibration statistics
- Identifying which components most impact their suspicion score

## Phase 10 Handoff

Phase 10 completed:
- ✅ GET `/api/demos/{id}/trace` endpoint (Wave 1)
- ✅ TraceCard component on demo detail page (Wave 2)
- ✅ Basic TRACE display: components, trust multiplier, calibration version
- ✅ React Query integration with caching

**Available for Phase 11:**
- TraceDto from API ✅
- TraceCard component foundation ✅
- React Query hook (useTraceQuery) ✅
- Historical TRACE data (multiple rows per player) ✅
- Calibration statistics (means, stdevs, percentiles) ✅

## Requirements (Refined from Roadmap)

### Visualization Enhancements (Frontend)

1. **Component Score Visualization**
   - Replace table with interactive chart (recharts bar chart)
   - Color code: green (low suspicion), yellow (neutral), red (high suspicion)
   - X-axis: component values [0.3, 2.0]
   - Y-axis: component names (ekill, aim, kast, util, clutch)
   - Hover: show raw value, percentile, mean/stdev from calibration
   - Responsive to screen size

2. **Percentile Badge System**
   - For each component: show percentile rank (0-100%)
   - Visual indicator: color-coded (red 0-25%, yellow 25-75%, green 75-100%)
   - Icon/text: "75th percentile" for each component
   - Tooltip: explain what percentile means (player better than 75% of peers)

3. **Historical Trend (New Endpoint + Component)**
   - New API: GET `/api/players/{playerId}/trace-history?limit=10`
     - Returns last N TRACE records for player
     - Includes all fields from TraceDto (base, adjusted, normalized, components)
     - Sorted by calculated_at DESC
   - Frontend: Sparkline chart showing TRACE adjusted trend (last 10 demos)
   - Y-axis: trace_adjusted value over time
   - Color: green if trending up (improving), red if down (declining)
   - Tooltip: date, value, delta from previous

4. **Calibration Context Card** (Sub-component)
   - Show calibration statistics (optional, collapsible)
   - Display: Global average (1.0), player's current value
   - Component means: show distribution (histogram-style)
   - Percentile explanation: "You scored higher than X% of players"

5. **Component Breakdown Tooltip**
   - On hover over each component score:
     - Raw value (e.g., 0.82)
     - What it means (e.g., "Efficient kills above baseline")
     - Percentile rank (e.g., "75th percentile")
     - How it affects suspicion (e.g., "+0.15 to base score")
     - Comparison to mean (e.g., "+0.12 above global mean")

### API Layer (Symfony)

1. **New Endpoint: Player TRACE History**
   - GET `/api/players/{playerId}/trace-history`
   - Query params: limit=10 (default), offset=0, sortBy=date (asc/desc)
   - Returns: Array of TraceDto + pagination metadata
   - Security: Verify player_id matches authenticated user or is public
   - Error handling: 404 if player not found, 400 for invalid params

2. **Existing Endpoint Enhancement**
   - GET `/api/demos/{id}/trace` now includes:
     - Percentile field (per component and overall)
     - Calibration statistics (global_average, means, stdevs)
     - Raw debugging fields (aim_cpq, aim_csq, etc.)
     - Computed percentile rank vs. peers

3. **Calibration Stats Endpoint** (Optional)
   - GET `/api/calibrations/{version}` — View calibration statistics
   - Returns: means, stdevs, percentiles for all components
   - Used for calibration context card

### Frontend Components

1. **TraceVisualizationCard** (Enhanced TraceCard)
   - Rename or extend TraceCard from Phase 10
   - Upgrade component table → interactive chart (recharts)
   - Add percentile badges
   - Add historical sparkline (below main card)
   - Add calibration context (collapsible)

2. **TraceChart** (New Sub-component)
   - Render bar chart with recharts
   - X-axis: component values [0.3, 2.0] with reference lines (1.0 = baseline)
   - Y-axis: component names
   - Bars colored by suspicion level (green/yellow/red)
   - Hover: show percentile, mean, stdev

3. **TraceSparkline** (New Sub-component)
   - Compact line chart showing TRACE trend (last 10 demos)
   - X-axis: time (demo date)
   - Y-axis: trace_adjusted value
   - Color: green (trending up) or red (trending down)
   - Tooltip: date, value, delta

4. **CalibrationContextCard** (New Sub-component)
   - Collapsible section explaining calibration
   - Show: global average (1.0), player's current score
   - Histogram or distribution visualization
   - Explanation: percentiles, what it means

5. **PercentileBadge** (New Sub-component)
   - Small badge showing rank (e.g., "75th %ile")
   - Color: red/yellow/green based on percentile
   - Tooltip: "Better than X% of players"

## Waves Structure (Tentative)

**Wave 1:** Backend Enhancements (API)
- Create /api/players/{id}/trace-history endpoint
- Enhance /api/demos/{id}/trace to include percentiles
- Calculate percentiles on-the-fly or cache
- Tests for new endpoints

**Wave 2:** Frontend Visualization (React)
- Create TraceChart component (recharts bar chart)
- Create TraceSparkline component (historical trend)
- Create PercentileBadge component
- Create CalibrationContextCard component
- Enhance TraceCard to use new components
- Playwright tests for visualizations

**Wave 3 (Optional):** Polish & Performance
- Leaderboard visualization (top 10 players by TRACE)
- Component sensitivity analysis (what-if scenarios)
- Caching optimization for historical data
- Mobile/tablet layout refinements

## Success Criteria (Phase Exit)

- [ ] Component scores displayed in interactive chart (not table)
- [ ] Percentile badges shown for each component
- [ ] Historical trend sparkline visible (last 10 demos)
- [ ] /api/players/{id}/trace-history endpoint working
- [ ] /api/demos/{id}/trace includes percentile calculations
- [ ] Calibration context card explains statistics
- [ ] All visualizations responsive on mobile/tablet
- [ ] 20+ new tests covering visualizations
- [ ] No breaking changes to Phase 10 API/frontend

## Notes

- **Percentiles:** Calculate from existing trace_rating rows (e.g., count where component_value > player's value / total)
- **Trend:** Simple linear chart (recharts), no ML-based forecasting
- **Calibration:** Explain that means/stdevs come from calibration table (Phase 9)
- **Deferred to Phase 12+:** Leaderboards, per-map rankings, sensitivity analysis

## Dependencies

```
Phase 10 (Complete) ───→ TraceDto + TraceCard ────→ Phase 11 Wave 1 (API)
                                                    Phase 11 Wave 2 (Frontend)
```

- Depends on: Phase 10 (API endpoint, React Query, design system)
- New dependencies: recharts library (for charts)
- Existing: database has historical TRACE data from Phase 9/10

## Open Questions for Planning

1. Should sparkline be inline (next to component chart) or below as separate card?
2. How many historical demos to show in sparkline (5, 10, 20)?
3. Should percentile calculation include only recent data (e.g., last 100 demos) or all-time?
4. Should calibration context be collapsible, always visible, or modal/tooltip?
5. Should we show player's rank among all players (e.g., "Top 10%") or just component-level percentiles?
6. Any specific color palette for red/yellow/green (accessibility/colorblind)?
