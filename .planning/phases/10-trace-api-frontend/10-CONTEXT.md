---
phase: 10
title: TRACE API & Frontend Integration
status: planning
created: 2026-05-16
updated: 2026-05-16
---

# Phase 10 Context: TRACE API & Frontend Integration

## Overview

Phase 10 brings the TRACE rating system to users by exposing it via REST API and rendering interactive visualizations in the frontend. Builds directly on Phase 9's production-ready persistence layer.

## Business Goal

Users can view detailed TRACE breakdown for any analyzed demo:
- API consumers query `/api/demos/{id}/trace` to get structured TRACE data
- Web frontend displays TRACE Card with component scores, trust multiplier, and historical context

## Phase 9 Handoff

Phase 9 completed:
- ✅ TraceCalculator: 5-component formula with trust multiplier
- ✅ Database: trace_rating and trace_calibration tables with FK relationships
- ✅ CalibrationManager: Version tracking, 100-sample threshold, auto-recalibration
- ✅ Integration: result_writer.py persists TRACE on every analysis
- ✅ Tests: 40+ integration tests, 90% coverage

**Available for Phase 10:**
- TraceRating and TraceCalibration Doctrine entities ✅
- TraceRatingRepository with finder methods ✅
- TRACE data in database (sample: 5-10 traces per test run) ✅

## Requirements (Refined from Roadmap)

### API Tier (Symfony)
1. **Endpoint:** GET `/api/demos/{demoId}/trace`
   - Returns single TraceRating with all components, calibration version
   - Error handling: 404 if no TRACE, graceful fallback to suspicion-only

2. **Schema:** TraceDto with fields:
   - traceBase, traceAdjusted, traceNormalized (floats)
   - trustMultiplier (float, [0.73, 1.00])
   - components: { ekill, aim, kast, util, clutch } (floats, [0.3, 2.0])
   - calibrationVersion (string)
   - calculatedAt (ISO timestamp)

3. **Serialization:** JSON, consistent with existing API (AnalysisResultDto pattern)

### Frontend Tier (React)
1. **TRACE Card Component**
   - Display on demo detail view (next to suspicion score)
   - Show base/adjusted/normalized values
   - Component breakdown (5-component bar chart or table)
   - Trust multiplier labeled with explanation
   - Calibration version and last update timestamp

2. **Conditional Rendering**
   - If TRACE unavailable: show "Not yet calculated" or similar
   - If only suspicion available: hide TRACE Card
   - Graceful degradation if API call fails

3. **Data Integration**
   - Query `/api/demos/{id}/trace` when demo detail loads
   - Use React Query for caching and refetch
   - Handle loading/error states

## Waves Structure (Tentative)

**Wave 1:** API Layer (Symfony Controller + DTO + Tests)
- Create TraceController with GET `/api/demos/{id}/trace` endpoint
- Create TraceDto and TraceComponentDto DTOs
- Mapper: TraceRating entity → TraceDto
- Unit + integration tests (TRACE present, TRACE absent, edge cases)
- Verification: API returns 200 with correct schema, 404 for missing TRACE

**Wave 2:** Frontend Layer (React Component + Query)
- Create TraceCard component (TypeScript + React)
- Hook up React Query to `/api/demos/{id}/trace`
- Handle loading/error states
- Integration with demo detail view (conditionally render)
- Playwright tests for rendering, API interaction
- Verification: TRACE Card displays on demo detail page, shows data correctly

**Wave 3 (optional):** Advanced Visualization
- Component scores visualization (bar chart using recharts)
- Calibration history (sparkline of TRACE trends over time)
- Leaderboard tier visualization (percentile badge)
- Deferred to Phase 11+ if timeline tight

## Success Criteria (Phase Exit)

- [ ] Endpoint exists and returns TraceDto schema (JSON)
- [ ] Frontend TRACE Card renders on demo detail view
- [ ] Missing TRACE handled gracefully (no errors)
- [ ] API + frontend integration tested end-to-end
- [ ] Type hints on Symfony (DTO properties) and React (component props)
- [ ] Error handling verified (404, null TRACE, API failures)
- [ ] Backward compatible: suspicion-only demos still work

## Notes

- **Design System:** Reuse existing Card/Grid layout from Phase 6 frontend
- **Schema Consistency:** Follow existing AnalysisResultDto pattern (camelCase properties)
- **Testing:** Phase 6 established Playwright for integration tests; use same pattern
- **Timezone:** calculatedAt returned as ISO string in UTC (existing pattern)
- **Error Budget:** If API integration takes longer, defer Wave 2 visualization to Phase 11

## Dependency Map

```
Phase 9 (Complete) ───→ Database + Entities ───┐
                                                 ├─→ Phase 10 Wave 1 (API)
                                                 └─→ Phase 10 Wave 2 (Frontend)
```

## Open Questions for Planning

1. Should TRACE Card be mandatory on demo detail, or optional/collapsible?
2. How many historical TRACE entries to show (just latest, or history list)?
3. Should components be sorted by value, or fixed order?
4. Tooltips/explanations for Trust Multiplier and calibration version?
5. Any frontend state management changes needed (Zustand/Context for TRACE)?
