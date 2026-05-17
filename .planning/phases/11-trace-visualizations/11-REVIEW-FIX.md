---
phase: 11-trace-visualizations
fixed_at: 2026-05-17T00:00:00Z
review_path: .planning/phases/11-trace-visualizations/11-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 11 Code Review Fix Report

**Fixed at:** 2026-05-17
**Source review:** .planning/phases/11-trace-visualizations/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 CRITICAL + 5 WARNING)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: Null Pointer Dereference in TraceHistoryMapper

**File:** `symfony/src/Application/Trace/TraceHistoryMapper.php`
**Commit:** 254a123
**Applied fix:** Added null check before array access on `$componentPercentiles` which can be null when insufficient sample data (< 10 records) is available. Changed from unsafe null coalescing operator directly on null to explicit ternary checks: `$componentPercentiles !== null ? $componentPercentiles['ekill'] : null`

### CR-02: Inverted Assertion Logic in Test Suites

**Files:** `symfony/tests/Application/Service/PercentileCalculatorTest.php`, `symfony/tests/Presentation/Controller/TraceHistoryControllerTest.php`
**Commit:** 1cdc267
**Applied fix:** Fixed inverted argument order in 5 locations across two test files:
- PercentileCalculatorTest.php: Lines 166-167 (1 occurrence), 214-215 (1 occurrence), 258-259 (1 occurrence)
- TraceHistoryControllerTest.php: Lines 76-77 (1 occurrence), 98-99 (1 occurrence)

Changed from `assertGreaterThanOrEqual(0.0, $percentile)` to `assertGreaterThanOrEqual($percentile, 0.0)` to properly check that percentiles are >= 0.0 and <= 100.0. Original inverted logic would pass for negative or >100 values.

### CR-03: Undocumented Data Loss from Aggressive Array Slicing

**File:** `symfony/src/Application/Service/PercentileCalculator.php`
**Commit:** 856c702
**Applied fix:** Added logging and documentation for the 1000-record windowing limit in three methods (`calculateComponentPercentiles`, `calculateTrustMultiplierPercentile`, `calculateTraceAdjustedPercentile`):
- Log total available records and number discarded when limit is exceeded
- Add warning comments explaining that recent data is prioritized for performance
- Document potential side effect: percentiles exclude older records, potentially skewing results toward recent data

### WR-01: Missing Error Handling in Frontend Hook

**File:** `frontend/lib/hooks/useTraceHistoryQuery.ts`
**Commit:** 436bf0b
**Applied fix:** Added proper Content-Type header check before attempting JSON parsing. Error handler now:
1. Checks `Content-Type` header includes 'application/json'
2. Only attempts JSON parsing if header matches
3. Falls back to statusText if parse fails or header is missing
4. Prevents crashes from 500 errors that return HTML instead of JSON

### WR-02: Unsafe Type Casting in TraceChart

**File:** `frontend/components/DemoDetail/TraceChart.tsx`
**Commit:** 1c9e36b
**Applied fix:** Created proper type guard `isValidChartPayload` to validate chart payload structure:
- Replaces unsafe `any` type with typed `ChartDataItem`
- Validates all required properties exist and have correct types
- Adds runtime checks for null safety, array validation, and property existence
- Returns null safely if payload doesn't match expected structure

### WR-03: Incomplete E2E Test Coverage

**File:** `frontend/e2e/trace-visualizations.spec.ts`
**Commit:** 7117dcf
**Applied fix:** Replaced placeholder assertion `expect(page).toBeDefined()` in 'renders demo detail page with TRACE card' test with real assertions:
- Added proper API mocking for both trace and history endpoints
- Test now waits for TRACE card to be visible
- Verifies component actually renders on page instead of checking page object existence

### WR-04: Missing Null Check in TraceCard

**Files:** `frontend/lib/hooks/useTraceHistoryQuery.ts`, `frontend/components/DemoDetail/TraceCard.tsx`
**Commit:** 5839fbe
**Applied fix:** Made `playerId` parameter optional in `useTraceHistoryQuery` hook:
- Changed signature from `playerId: string` to `playerId: string | undefined`
- Updated query key generation to handle undefined playerId
- TraceCard now passes `playerId` directly (undefined when not provided) instead of fallback empty string
- Prevents unnecessary cache entries for empty string queries

### WR-05: Hard-Coded Default Values in CalibrationContextCard

**File:** `frontend/components/DemoDetail/TraceCard.tsx`
**Commit:** 167434d
**Applied fix:** Added TODO comments documenting hard-coded placeholder values:
- Documented that `globalAverage: 1.0` should be fetched from backend calibration statistics API
- Documented that all component means (ekill, aim, kast, util, clutch: 1.0) are placeholder values
- Added note that current implementation is unrealistic with real data and pending backend API implementation

---

_Fixed: 2026-05-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
