# Phase 11: TRACE Advanced Visualizations

## Overview

Phase 11 enhances TRACE presentation with rich, interactive visualizations and historical trend analysis. Players can see component percentile ranks, historical TRACE trends, and calibration context.

**Status:** Planning complete, ready for execution

## What Gets Built

### Wave 1: Backend Enhancements
- **New Endpoint:** GET `/api/players/{playerId}/trace-history`
- **Percentile Calculation:** Component-level percentile ranks (0-100%)
- **Query Handler:** Supports limit, offset, sortBy parameters
- **Tests:** 15+ integration tests for history and percentiles

**Deliverable:** Production-ready history API with percentile calculations

### Wave 2: Frontend Visualizations
- **TraceChart:** Interactive bar chart for component scores
- **PercentileBadge:** Visual badges showing percentile rank
- **TraceSparkline:** Line chart showing TRACE trend over time
- **CalibrationContextCard:** Explanation of statistics
- **Tests:** 15+ Playwright tests for visualizations

**Deliverable:** Production-ready visualization components

## Files Overview

### Planning Documents
- `11-CONTEXT.md` — Phase goals, requirements, open questions
- `11-01-PLAN.md` — Wave 1 backend (5 tasks, ~180 min)
- `11-02-PLAN.md` — Wave 2 frontend (7 tasks, ~225 min)
- `README.md` — This file

### Phase 11 Implementation (after execution)
- `11-01-SUMMARY.md` — Wave 1 execution summary (created after completion)
- `11-02-SUMMARY.md` — Wave 2 execution summary (created after completion)

## Success Criteria

### Wave 1 (API)
- [ ] GET `/api/players/{playerId}/trace-history` returns paginated history
- [ ] Percentiles calculated for each component
- [ ] Query params work: limit, offset, sortBy
- [ ] 15+ integration tests pass
- [ ] Type hints on all code
- [ ] No breaking changes

### Wave 2 (Frontend)
- [ ] Component scores in interactive bar chart (not table)
- [ ] Percentile badges shown for each component
- [ ] Historical trend sparkline visible
- [ ] Calibration context card explains statistics
- [ ] 15+ Playwright tests pass
- [ ] Mobile responsive
- [ ] Accessible (ARIA, keyboard nav)

## Dependencies

```
Phase 10 Complete (API + Frontend) ↓
                                    ├─→ Wave 1: History API + Percentiles
                                    └─→ Wave 2: Visualizations
```

- Depends on: Phase 10 (TraceDto, TraceCard foundation, React Query)
- New library: recharts (for charts)
- Existing: database has historical TRACE data

## Architecture

### Backend (Wave 1)
```
GET /api/players/{id}/trace-history
  ↓
TraceHistoryController
  ↓
GetPlayerTraceHistoryHandler
  ↓
TraceRatingRepository.findByPlayerId()
  ↓
PercentileCalculator (for each trace)
  ↓
TraceHistoryMapper → TraceHistoryCollectionDto
```

### Frontend (Wave 2)
```
TraceCard (enhanced from Phase 10)
  ├─ useTraceHistoryQuery hook
  │  └─ GET /api/players/{playerId}/trace-history
  ├─ TraceChart component (bar chart)
  │  ├─ PercentileBadge x5
  │  └─ Hover tooltips
  ├─ TraceSparkline component (trend)
  │  └─ Color reflects direction (↑ or ↓)
  └─ CalibrationContextCard (collapsible)
```

## Execution Order

1. **Wave 1 (Backend)** — Create history API and percentile calculations (~180 min)
   - Independent of frontend changes
   - Can be tested with curl/Postman
   
2. **Wave 2 (Frontend)** — Create visualization components (~225 min)
   - Depends on Wave 1 API working
   - Builds on Phase 10 TraceCard

## Key Features

- **Percentile Ranking:** See where you stand vs. peers (0-100%)
- **Historical Trend:** Sparkline showing TRACE trend over last 10 demos
- **Component Breakdown:** Interactive bar chart with color coding
- **Calibration Context:** Understand how your scores compare to global mean
- **Responsive Design:** Works on mobile, tablet, desktop
- **Accessible:** Keyboard navigation, ARIA labels

## What's Next

After Phase 11 completes:
- **Phase 12:** TRACE Leaderboards (global rankings, per-map, per-component)
- **Phase 13+:** Advanced analytics (sensitivity analysis, player profiling)

## Questions & Clarifications

See `11-CONTEXT.md` for open questions about visualization preferences (sparkline placement, percentile scope, etc.). These will be answered during execution.

---

**Phase 11 Ready for Planning & Execution**

Both waves fully specified with comprehensive plans, clear success criteria, and testable deliverables. Total effort: ~405 minutes (6.75 hours) across 2 waves.
