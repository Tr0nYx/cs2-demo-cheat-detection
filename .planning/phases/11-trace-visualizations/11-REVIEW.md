---
phase: 11-trace-visualizations
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - symfony/src/Application/Service/PercentileCalculator.php
  - symfony/src/Application/Query/GetPlayerTraceHistoryQuery.php
  - symfony/src/Application/Handler/GetPlayerTraceHistoryHandler.php
  - symfony/src/Application/Trace/TraceHistoryDto.php
  - symfony/src/Application/Trace/TraceComponentPercentilesDto.php
  - symfony/src/Application/Trace/TraceHistoryCollectionDto.php
  - symfony/src/Application/Trace/TraceHistoryMapper.php
  - symfony/src/Presentation/Controller/TraceHistoryController.php
  - symfony/tests/Presentation/Controller/TraceHistoryControllerTest.php
  - symfony/tests/Application/Service/PercentileCalculatorTest.php
  - symfony/src/Infrastructure/Persistence/TraceRatingRepository.php
  - frontend/lib/hooks/useTraceHistoryQuery.ts
  - frontend/components/DemoDetail/TraceChart.tsx
  - frontend/components/DemoDetail/PercentileBadge.tsx
  - frontend/components/DemoDetail/TraceSparkline.tsx
  - frontend/components/DemoDetail/CalibrationContextCard.tsx
  - frontend/__tests__/components/DemoDetail/TraceChart.test.tsx
  - frontend/__tests__/components/DemoDetail/TraceSparkline.test.tsx
  - frontend/e2e/trace-visualizations.spec.ts
  - frontend/lib/types.ts
  - frontend/components/DemoDetail/TraceCard.tsx
  - frontend/package.json
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 11: TRACE Visualizations Code Review

**Reviewed:** 2026-05-17
**Depth:** standard
**Files Reviewed:** 22
**Status:** ISSUES FOUND

## Summary

Phase 11 introduces TRACE visualization features across backend (percentile calculations, history API) and frontend (charts, badges, sparklines). Overall implementation is well-structured with comprehensive test coverage, but **critical issues found** in:

1. **Null pointer dereference in TraceHistoryMapper** when percentile calculation returns insufficient data
2. **Inverted assertion logic in test suites** (backwards argument order)
3. **Potential data loss** from aggressive array slicing without documentation

These issues prevent reliable operation under edge cases (low-volume calibration data) and mask test failures.

---

## Critical Issues

### CR-01: Null Pointer Dereference in TraceHistoryMapper

**File:** `symfony/src/Application/Trace/TraceHistoryMapper.php:49-54`

**Issue:** 
When `PercentileCalculator::calculateComponentPercentiles()` returns `null` (insufficient sample data < 10), the mapper attempts to access array keys on a null value using the null coalescing operator. This causes a TypeError when the condition is evaluated:

```php
$componentPercentiles = $percentileCalculator->calculateComponentPercentiles($traceRating);
// If $componentPercentiles is null:
$percentileDto = new TraceComponentPercentilesDto(
    ekill: $componentPercentiles['ekill'] ?? null,  // TypeError: Cannot access offset "ekill" on null
```

**Reproduction:** Request TRACE history for a player when there are fewer than 10 TRACE records in the calibration version.

**Fix:**
```php
// Calculate component percentiles
$componentPercentiles = $percentileCalculator->calculateComponentPercentiles($traceRating);
$percentileDto = new TraceComponentPercentilesDto(
    ekill: $componentPercentiles['ekill'] ?? null,
    aim: $componentPercentiles['aim'] ?? null,
    kast: $componentPercentiles['kast'] ?? null,
    util: $componentPercentiles['util'] ?? null,
    clutch: $componentPercentiles['clutch'] ?? null,
);
```

Should be:

```php
// Calculate component percentiles
$componentPercentiles = $percentileCalculator->calculateComponentPercentiles($traceRating);
$percentileDto = new TraceComponentPercentilesDto(
    ekill: $componentPercentiles !== null ? $componentPercentiles['ekill'] : null,
    aim: $componentPercentiles !== null ? $componentPercentiles['aim'] : null,
    kast: $componentPercentiles !== null ? $componentPercentiles['kast'] : null,
    util: $componentPercentiles !== null ? $componentPercentiles['util'] : null,
    clutch: $componentPercentiles !== null ? $componentPercentiles['clutch'] : null,
);
```

Or more concisely:

```php
$componentPercentiles = $percentileCalculator->calculateComponentPercentiles($traceRating);
$percentileDto = new TraceComponentPercentilesDto(
    ekill: $componentPercentiles['ekill'] ?? null,
    // ... etc
);
if ($componentPercentiles === null) {
    $percentileDto = new TraceComponentPercentilesDto();
}
```

---

### CR-02: Inverted Assertion Logic in PercentileCalculator Tests

**File:** `symfony/tests/Application/Service/PercentileCalculatorTest.php:166-167`

**Issue:**
PHPUnit's `assertGreaterThanOrEqual(expected, actual)` has arguments in order `(expected, actual)`. The test has them backwards:

```php
$percentile = $this->calculator->calculateTraceAdjustedPercentile(1.45, 'default-v1');
self::assertNotNull($percentile);
self::assertGreaterThanOrEqual(0.0, $percentile);  // WRONG: asserts 0.0 >= $percentile
self::assertLessThanOrEqual(100.0, $percentile);  // WRONG: asserts 100.0 <= $percentile
```

This inverted logic means tests **pass when percentiles are NEGATIVE or > 100**, masking failures. The assertions should check:
- `$percentile >= 0.0` (correct value is >= lower bound)
- `$percentile <= 100.0` (correct value is <= upper bound)

**Affected Lines:**
- `PercentileCalculatorTest.php:166-167`
- `PercentileCalculatorTest.php:214-215`
- `PercentileCalculatorTest.php:258-259`
- `TraceHistoryControllerTest.php:76-77`
- `TraceHistoryControllerTest.php:98-99`

**Fix:**
```php
// Change all occurrences from:
self::assertGreaterThanOrEqual(0.0, $percentile);
self::assertLessThanOrEqual(100.0, $percentile);

// To:
self::assertGreaterThanOrEqual($percentile, 0.0);
self::assertLessThanOrEqual($percentile, 100.0);

// Or more idiomatically:
self::assertGreaterThanOrEqual(0.0, $percentile);  // $percentile >= 0.0
self::assertLessThanOrEqual($percentile, 100.0);  // $percentile <= 100.0
```

Correct semantic:
```php
self::assertGreaterThanOrEqual($percentile, 0.0);   // Assert $percentile >= 0
self::assertLessThanOrEqual($percentile, 100.0);    // Assert $percentile <= 100
```

---

### CR-03: Undocumented Data Loss from Aggressive Array Slicing

**File:** `symfony/src/Application/Service/PercentileCalculator.php:56, 100, 123`

**Issue:**
The `PercentileCalculator` slices trace data to the last 1000 records using `array_slice($allTraces, -1000)`:

```php
$allTraces = $this->repository->findByCalibrationVersion($trace->getCalibrationVersion());
$allTraces = array_slice($allTraces, -1000);  // Silently discards old data
```

This happens in three methods:
- `calculateComponentPercentiles()` line 56
- `calculateTrustMultiplierPercentile()` line 100
- `calculateTraceAdjustedPercentile()` line 123

**Problems:**
1. **Silent data loss:** If there are 5000+ TRACE records, 4000+ are discarded without logging or notification
2. **Skewed percentiles:** Percentiles are calculated against a subset, not the full population, biasing results toward recent data
3. **Inconsistent with documentation:** The docblock says "Get total count of TRACE records" but actually gets only the last 1000

**Business Impact:** Player percentile rankings become unreliable when population > 1000 records because comparisons exclude historical data.

**Fix:**
Either:

**Option A: Document the windowing and justify the limit:**
```php
// Limit to last 1000 records for performance: recent data is most representative
// WARNING: Percentiles exclude older records, potentially skewing results
$allTraces = array_slice($allTraces, -1000);
$this->logger->warning('Percentile calculation uses limited dataset', [
    'limit' => 1000,
    'totalAvailable' => count($allTraces), // Log before slice
]);
```

**Option B: Remove the limit and handle performance separately:**
```php
// Use full dataset for accurate population statistics
// Performance: Consider pagination or caching at repository layer
$allTraces = $this->repository->findByCalibrationVersion($trace->getCalibrationVersion());
// No slicing - full population comparison
```

---

## Warnings

### WR-01: Missing Error Handling in Frontend Hook

**File:** `frontend/lib/hooks/useTraceHistoryQuery.ts:28`

**Issue:**
The error handler attempts to parse JSON even though `response.ok` is false. Some error responses may not be valid JSON (e.g., 500 errors that return HTML error pages):

```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}))  // Catches parse errors
  throw new Error(
    errorData.message || `Failed to fetch TRACE history: ${response.statusText}`
  )
}
```

While the `.catch(() => ({}))` provides fallback, it silently swallows parse errors. Better to check `Content-Type` header.

**Fix:**
```typescript
if (!response.ok) {
  let errorMessage = `Failed to fetch TRACE history: ${response.statusText}`;
  
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // JSON parse failed, use statusText fallback
    }
  }
  
  throw new Error(errorMessage);
}
```

---

### WR-02: Unsafe Type Casting in TraceChart

**File:** `frontend/components/DemoDetail/TraceChart.tsx:34`

**Issue:**
The custom Tooltip uses `as Promise<TraceHistoryCollectionDto>` type assertion without validation:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
payload?: Array<{ value: number; payload: any }>
```

When Recharts passes unexpected payload structure, the code may crash or display incorrect data. The `any` type disables type checking entirely.

**Fix:**
Create a proper type guard:

```typescript
interface ChartPayload {
  value: number;
  payload: ChartDataItem;
}

function CustomTooltip({
  active,
  payload,
  calibrationMean,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataItem }>;
  calibrationMean: number;
}) {
  if (!active || !payload || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }
  
  const first = payload[0];
  if (!first || typeof first.payload !== 'object' || !('value' in first.payload)) {
    return null;
  }
  
  const item = first.payload as ChartDataItem;
  // ... rest of implementation
}
```

---

### WR-03: Incomplete E2E Test Coverage

**File:** `frontend/e2e/trace-visualizations.spec.ts:76-90`

**Issue:**
The first test `renders demo detail page with TRACE card` does not actually test anything:

```typescript
test('renders demo detail page with TRACE card', async ({ page }) => {
  await page.goto('/results/test-demo-id')
  expect(page).toBeDefined()  // Always passes - just checks page object exists
})
```

This is a placeholder that provides no coverage. All E2E tests use `route.abort()` in beforeEach, which prevents actual API calls.

**Fix:**
Either implement real assertions or remove the test:

```typescript
test('renders demo detail page with TRACE card', async ({ page }) => {
  const demoId = 'test-demo-id';
  
  // Mock the API endpoint
  await page.route('**/api/demos/test-demo-id/trace', (route) => {
    route.resolve({
      status: 200,
      body: JSON.stringify(mockTraceResponse),
      contentType: 'application/json',
    });
  });
  
  await page.goto(`/results/${demoId}`);
  
  // Assert TRACE card is visible
  const traceCard = page.locator('text=TRACE Rating Analysis');
  await expect(traceCard).toBeVisible();
});
```

---

### WR-04: Missing Null Check in TraceCard

**File:** `frontend/components/DemoDetail/TraceCard.tsx:44`

**Issue:**
The hook is always called even when `playerId` is empty:

```typescript
const {
  data: historyData,
  isLoading: historyLoading,
  error: historyError,
} = useTraceHistoryQuery(playerId || '', 10)
```

The hook should skip fetching when `playerId` is empty:

**Current hook implementation:**
```typescript
export function useTraceHistoryQuery(
  playerId: string,
  limit: number = 10
): UseQueryResult<TraceHistoryCollectionDto, Error> {
  return useQuery({
    queryKey: ['traceHistory', playerId, limit],
    queryFn: async (): Promise<TraceHistoryCollectionDto> => {
      // Fetches even when playerId is empty string
    },
    enabled: !!playerId,  // This only prevents execution, queryKey still includes it
  })
}
```

While the `enabled` flag prevents actual fetching, the empty string is still included in the queryKey, creating unnecessary cache entries.

**Fix:**
```typescript
const {
  data: historyData,
  isLoading: historyLoading,
  error: historyError,
} = useTraceHistoryQuery(playerId, 10)  // Remove fallback to empty string

// Then in hook:
if (!playerId) {
  return useQuery({
    queryKey: ['traceHistory', playerId, limit],
    enabled: false,  // Don't fetch
  })
}
```

---

### WR-05: Hard-Coded Default Values in CalibrationContextCard

**File:** `frontend/components/DemoDetail/CalibrationContextCard.tsx:261-270`

**Issue:**
The `TraceCard` passes hard-coded component means (all 1.0):

```typescript
<CalibrationContextCard
  calibrationVersion={trace.calibrationVersion}
  globalAverage={1.0}
  playerValue={trace.traceAdjusted}
  componentMeans={{
    ekill: 1.0,
    aim: 1.0,
    kast: 1.0,
    util: 1.0,
    clutch: 1.0,
  }}
/>
```

These values should be retrieved from the backend's calibration statistics API or calculated from the player's history. Hard-coding assumes the global average for all components is exactly 1.0, which is unrealistic once real data is analyzed.

**Fix:**
Add API endpoint to fetch calibration statistics and display real values:

```typescript
// In TraceCard: fetch calibration stats
const { data: calibrationStats } = useCalibrationStatsQuery(
  trace.calibrationVersion
)

// Then pass to card:
<CalibrationContextCard
  calibrationVersion={trace.calibrationVersion}
  globalAverage={calibrationStats?.globalAverage ?? 1.0}
  playerValue={trace.traceAdjusted}
  componentMeans={calibrationStats?.componentMeans}
/>
```

---

## Info

### IN-01: Performance Concern - Array Mapping in Loop

**File:** `symfony/src/Application/Service/PercentileCalculator.php:71-75`

**Issue:**
For each of 5 components, the code creates a new array by mapping over all traces:

```php
$percentiles = [
    'ekill' => $this->calculatePercentile($trace->getEkill(), 
        array_map(fn(TraceRating $t) => $t->getEkill(), $allTraces)
    ),
    'aim' => $this->calculatePercentile($trace->getAim(), 
        array_map(fn(TraceRating $t) => $t->getAim(), $allTraces)
    ),
    // ... 5x total, each iterating ~1000 items = 5000 iterations
];
```

This creates 5 new arrays of size ~1000 each. For a 1000-item dataset, that's 5000 array iterations and 5MB+ allocations per request.

**Recommendation:** Build a single pass:

```php
$componentArrays = [
    'ekill' => [],
    'aim' => [],
    'kast' => [],
    'util' => [],
    'clutch' => [],
];

foreach ($allTraces as $t) {
    $componentArrays['ekill'][] = $t->getEkill();
    $componentArrays['aim'][] = $t->getAim();
    // ... single pass
}

$percentiles = [
    'ekill' => $this->calculatePercentile($trace->getEkill(), $componentArrays['ekill']),
    // ...
];
```

This is an optimization, not a bug, so noted as INFO.

---

### IN-02: Unreliable Trend Detection in TraceSparkline

**File:** `frontend/components/DemoDetail/TraceSparkline.tsx:70-77`

**Issue:**
The trend detection uses a fixed 1% threshold which may not detect meaningful changes with small datasets:

```typescript
const threshold = 0.01; // 1% threshold for meaningful change

if (lastValue > firstValue * (1 + threshold)) {
  trendDirection = 'improving'
} else if (lastValue < firstValue * (1 - threshold)) {
  trendDirection = 'declining'
}
```

With 2 data points of [0.7, 0.705], this correctly detects as flat. But with [0.7, 0.7007], the 1% threshold may hide meaningful changes with limited data.

**Note:** This is acceptable UI behavior - the threshold prevents noise from being reported as trend. Not a bug, just noted for awareness.

---

## Summary of Findings

### By Severity
- **Critical (3):** Must fix before shipping - data corruption, crash, test reliability
- **Warning (5):** Should fix - incomplete error handling, unsafe types, hard-coded values
- **Info (2):** Consider fixing - performance, signal detection tuning

### By Component
- **Backend (6):** Null dereference, assertion errors, data loss, performance
- **Frontend (4):** Error handling, type safety, incomplete tests, hard-coded values

### Recommendations
1. **Immediate:** Fix the null pointer dereference in TraceHistoryMapper (CR-01)
2. **Before merge:** Fix test assertions (CR-02) to ensure test suite reliability
3. **Documentation:** Justify or remove the 1000-record limit (CR-03)
4. **Follow-up:** Implement proper E2E tests and fetch calibration statistics from backend

---

_Reviewed: 2026-05-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
