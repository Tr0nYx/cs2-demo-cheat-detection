# Phase 10: TRACE API & Frontend Integration

## Overview

Phase 10 brings the TRACE rating system to users by exposing calculated TRACE scores via REST API and rendering an interactive card component in the web frontend.

**Status:** Planning complete, ready for execution

## What Gets Built

### Wave 1: API Layer (Symfony)
- **Endpoint:** GET `/api/demos/{demoId}/trace`
- **Response:** TraceDto with all component scores, trust multiplier, calibration version
- **Error Handling:** 404 if no TRACE calculated, 400 for invalid input
- **Tests:** 15+ integration tests

**Deliverable:** Production-ready API endpoint with full type hints and documentation

### Wave 2: Frontend Layer (React)
- **Component:** TraceCard for demo detail page
- **Features:** Display all 5 components, trust multiplier, calibration context
- **States:** Loading, success, no-TRACE (graceful), error with retry
- **Tests:** 15+ Playwright tests + hook unit tests

**Deliverable:** Production-ready component with error handling and responsive design

## Files Overview

### Planning Documents
- `10-CONTEXT.md` — Phase goals, requirements, dependency map
- `10-01-PLAN.md` — Wave 1 API layer (5 tasks, ~135 min)
- `10-02-PLAN.md` — Wave 2 Frontend (5 tasks, ~175 min)
- `README.md` — This file

### Phase 10 Implementation (after execution)
- `10-01-SUMMARY.md` — Wave 1 execution summary (created after completion)
- `10-02-SUMMARY.md` — Wave 2 execution summary (created after completion)

## Success Criteria

### Wave 1 (API)
- [ ] GET `/api/demos/{demoId}/trace` returns 200 with TraceDto
- [ ] All component scores included (ekill, aim, kast, util, clutch)
- [ ] Trust multiplier present ([0.73, 1.00])
- [ ] 404 when TRACE not calculated
- [ ] 15+ integration tests pass
- [ ] Type hints on all DTOs and methods

### Wave 2 (Frontend)
- [ ] TraceCard renders on demo detail page
- [ ] All components and trust multiplier displayed
- [ ] Missing TRACE handled gracefully (no errors)
- [ ] Loading and error states visible
- [ ] 15+ Playwright tests pass
- [ ] Responsive on mobile/tablet/desktop

## Dependencies

```
Phase 9 Complete (TRACE persistence) ↓
                                      ├─→ Wave 1: API Layer
                                      └─→ Wave 2: Frontend
```

- Depends on: Phase 9 (TraceRating entity, repositories, calculated data)
- Required: Symfony API framework (existing)
- Required: React, React Query (existing from Phase 6)

## Architecture

### API Tier (Symfony)
```
GET /api/demos/{id}/trace
  ↓
TraceController::getTrace()
  ↓
TraceRatingRepository::findByAnalysisResultId()
  ↓
TraceMapper::toDto()
  ↓
TraceDto (JSON response)
```

### Frontend Tier (React)
```
Demo Detail Page
  ↓
<TraceCard demoId={id} />
  ↓
useTraceQuery(demoId)
  ↓
/api/demos/{id}/trace (Wave 1 API)
  ↓
<TraceComponentChart /> (display scores)
```

## Execution Order

1. **Wave 1 (API)** — Create DTOs, mapper, controller, tests (~135 min)
   - Independent of Wave 2
   - Can be deployed and tested separately
   
2. **Wave 2 (Frontend)** — Create component, hook, integration (~175 min)
   - Depends on Wave 1 API working
   - Can be tested with mocked API (but Wave 1 enables real testing)

## Notes

- **Design System:** Reuses existing Phase 6 Card and layout components
- **Testing:** Playwright for integration tests (existing pattern from Phase 6)
- **TypeScript:** Both API (DTOs) and frontend (component props) fully typed
- **Error Handling:** API gracefully returns 404 if no TRACE; frontend gracefully hides card
- **Backward Compatibility:** No breaking changes to existing API or pages

## What's Next

After Phase 10 completes:
- **Phase 11+:** Advanced TRACE features (leaderboards, trend analysis, calibration explainer)
- **Phase 12+:** Additional visualizations and player profiling based on TRACE

## Questions & Clarifications

See `10-CONTEXT.md` for open questions about design decisions (card placement, historical data display, etc.). These will be answered during execution.
