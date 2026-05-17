---
phase: 12-trace-leaderboards
plan: 03
subsystem: Player Comparison View
tags: [cqrs, player-comparison, benchmarking, trace-metrics, aggregation, react-components]
dependency_graph:
  requires: [Wave 1 Global Leaderboard (12-01), Wave 2 Per-Map & Time-Windowed Leaderboards (12-02)]
  provides: [Player comparison endpoint, 4-metric aggregation, frontend comparison page with React components]
  affects: [Wave 4 Team Leaderboards, future competitive matchmaking features]
tech_stack:
  added: [GetPlayerComparisonQuery, GetPlayerComparisonHandler, PlayerComparisonDto, ComponentBreakdownCardDto, TrendCardDto, MapAffinityCardDto, MatchHistoryCardDto, PlayerComparisonCard (React), usePlayerComparison (React Query hook)]
  patterns: [CQRS aggregation handler, React Query with TypeScript types, Recharts line chart for trends, Tailwind CSS responsive layout]
key_files:
  created:
    - symfony/src/Application/Query/GetPlayerComparisonQuery.php
    - symfony/src/Application/Handler/GetPlayerComparisonHandler.php
    - symfony/src/Application/Leaderboard/PlayerComparisonDto.php
    - symfony/src/Application/Leaderboard/ComponentBreakdownCardDto.php
    - symfony/src/Application/Leaderboard/TrendCardDto.php
    - symfony/src/Application/Leaderboard/MapAffinityCardDto.php
    - symfony/src/Application/Leaderboard/MatchHistoryCardDto.php
    - symfony/src/Presentation/Controller/PlayerComparisonController.php
    - frontend/lib/hooks/usePlayerComparison.ts
    - frontend/components/Comparison/PlayerComparisonCard.tsx
    - frontend/components/Comparison/ComponentBreakdownCard.tsx
    - frontend/components/Comparison/TrendCard.tsx
    - frontend/components/Comparison/MapAffinityCard.tsx
    - frontend/components/Comparison/MatchHistoryCard.tsx
    - frontend/app/players/[playerId]/compare/page.tsx
    - symfony/tests/Application/Handler/GetPlayerComparisonHandlerTest.php
    - symfony/tests/Presentation/Controller/PlayerComparisonControllerTest.php
    - frontend/__tests__/components/Comparison/PlayerComparisonCard.test.tsx
  modified:
    - symfony/src/Infrastructure/Persistence/TraceRatingRepository.php (added findTopMapsByPlayer)
    - symfony/src/Infrastructure/Persistence/AnalysisResultRepository.php (added findSharedByPlayers)
decisions:
  - "4 metrics per player: component breakdown (5 components with percentiles), TRACE trend (10 demos), map affinity (3 maps), match history (shared demos)"
  - "Side-by-side 2x4 grid layout: 4 metric cards for each of 2 players"
  - "Component percentiles reuse PercentileCalculator from Phase 11 for consistency"
  - "Trend sparkline uses Recharts with trending direction (up/down) indicator"
  - "Map affinity shows top 3 maps with medal emojis (gold/silver/bronze)"
  - "Match history shows shared demos with clickable links to demo detail pages"
  - "Cache-Control: public, max-age=300 on endpoint (same as leaderboards)"
metrics:
  duration: "~42 minutes"
  tasks_completed: 7 + 1 refactor
  files_created: 18
  files_modified: 2
  commits: 10 (atomic per task + refactor + test fixes)
  test_cases: 7 handler tests + 10 controller tests + 6 React tests = 23 total
---

# Phase 12 Plan 03: Player Comparison View

## Summary

Implemented a comprehensive player comparison system allowing side-by-side benchmarking of two players across 4 metrics: component breakdown with percentile rankings, TRACE trend history (last 10 demos), map affinity (top 3 maps by performance), and shared demo history. Backend aggregates data from 3 repository queries in a single CQRS handler, exposing GET /api/players/{playerId}/compare?with={otherPlayerId}. Frontend includes 5 React components rendering 8 metric cards (4 per player) in a responsive 2x2 grid, with trend visualization via Recharts sparkline chart.

## Completed Tasks

| Task | Name | Commit | Description |
|------|------|--------|-------------|
| 1 | Comparison DTOs | b879a10 | ComponentBreakdownCardDto, TrendCardDto, MapAffinityCardDto, MatchHistoryCardDto, PlayerComparisonDto, GetPlayerComparisonQuery with validation |
| 2 | Repository extension | 7642ffe | TraceRatingRepository.findTopMapsByPlayer, AnalysisResultRepository.findSharedByPlayers |
| 3 | Handler aggregation | 9de090a | GetPlayerComparisonHandler aggregating 4 metrics with null-safe player lookup |
| 4 | HTTP controller | 66b50f0 | PlayerComparisonController::getPlayerComparison() with validation and cache headers |
| 5 | React hook | a29b840 | usePlayerComparison with React Query, TypeScript interfaces, stale time 5 min |
| 6 | Components | 7920cdc | PlayerComparisonCard (container), ComponentBreakdownCard, TrendCard, MapAffinityCard, MatchHistoryCard, /players/[playerId]/compare page |
| 7 | Tests | c3604e6 | 7 handler tests, 10 controller tests, 6 React tests = 23 total |
| 8 | Refactor | de276f0 | Split DTOs into separate files for Symfony autowiring |
| 9 | Test fixes | 2c3e3de | Fix instantiation issues, add missing imports, constructor fixes |

## Artifacts

### Domain Layer

**DTOs (5 classes)**
- ComponentBreakdownCardDto: Components with percentile values
- TrendCardDto: Historical TRACE with trending direction
- MapAffinityCardDto: Top maps by TRACE score
- MatchHistoryCardDto: Shared demos between players
- PlayerComparisonDto: Aggregate container for all metrics for both players

Files:
- `symfony/src/Application/Leaderboard/ComponentBreakdownCardDto.php`
- `symfony/src/Application/Leaderboard/TrendCardDto.php`
- `symfony/src/Application/Leaderboard/MapAffinityCardDto.php`
- `symfony/src/Application/Leaderboard/MatchHistoryCardDto.php`
- `symfony/src/Application/Leaderboard/PlayerComparisonDto.php`

### Application Layer

**Query DTO**
- GetPlayerComparisonQuery: CQRS query with playerId, compareWithId, validation in constructor
- File: `symfony/src/Application/Query/GetPlayerComparisonQuery.php`

**Handler**
- GetPlayerComparisonHandler: Implements MessageHandlerInterface
  - Injects: TraceRatingRepository, AnalysisResultRepository, PlayerRepository, PercentileCalculator, LoggerInterface
  - Builds 4 metric cards per player via private builder methods
  - Returns PlayerComparisonDto with null-safe player lookup
- File: `symfony/src/Application/Handler/GetPlayerComparisonHandler.php`

### Infrastructure Layer

**TraceRatingRepository (Extended)**
- findTopMapsByPlayer(string $playerId, int $limit = 3): array
  - Returns top N maps by TRACE-adjusted score
  - Uses GROUP BY demo.map for aggregation
  - File: `symfony/src/Infrastructure/Persistence/TraceRatingRepository.php`

**AnalysisResultRepository (Extended)**
- findSharedByPlayers(string $playerAId, string $playerBId, int $limit = 10): array
  - Returns Demo entities where both players have AnalysisResult records
  - Uses DISTINCT for demos and inner joins for player filtering
  - File: `symfony/src/Infrastructure/Persistence/AnalysisResultRepository.php`

### Presentation Layer

**HTTP Controller**
- PlayerComparisonController::getPlayerComparison(Request, playerId)
  - Route: GET /api/players/{playerId}/compare?with={otherPlayerId}
  - Validates: 'with' parameter required, not self-comparison
  - Dispatches GetPlayerComparisonQuery via MessageBusInterface
  - Returns JSON 200 or 400 (validation) or 500 (error)
  - Cache-Control: public, max-age=300
- File: `symfony/src/Presentation/Controller/PlayerComparisonController.php`

### Frontend Layer

**React Query Hook**
- usePlayerComparison(playerId, compareWithId): UseQueryResult<PlayerComparisonData | null>
  - Fetches from /api/players/{id}/compare?with={id}
  - Enabled only when compareWithId is provided
  - staleTime: 5 minutes
  - Handles 404 gracefully
  - Full TypeScript interfaces for all data structures
- File: `frontend/lib/hooks/usePlayerComparison.ts`

**React Components (5)**

1. **PlayerComparisonCard** (Container)
   - Props: data (PlayerComparisonData), isLoading, error
   - Renders 2x4 grid: 4 metric cards × 2 players
   - Shows loading skeleton, error state, empty state
   - Displays player names and IDs in header
   - File: `frontend/components/Comparison/PlayerComparisonCard.tsx`

2. **ComponentBreakdownCard**
   - Props: playerName, components, traceDatetime
   - Displays 5 components (ekill, aim, kast, util, clutch)
   - Progress bar + percentile badge per component
   - Color-coded bars: red (0-25%), yellow (25-75%), green (75-100%)
   - File: `frontend/components/Comparison/ComponentBreakdownCard.tsx`

3. **TrendCard**
   - Props: playerName, history, trending
   - Recharts LineChart with last 10 TRACE scores
   - X-axis: abbreviated dates, Y-axis: TRACE values
   - Trending indicator: green (up) or red (down)
   - Hover tooltip with date and value
   - File: `frontend/components/Comparison/TrendCard.tsx`

4. **MapAffinityCard**
   - Props: playerName, topMaps
   - Lists top 3 maps by TRACE score
   - Medal emojis: 🥇 🥈 🥉 for ranking
   - Shows map name and TRACE adjusted score
   - File: `frontend/components/Comparison/MapAffinityCard.tsx`

5. **MatchHistoryCard**
   - Props: playerName, sharedDemos
   - Shows shared demos with dates and maps
   - Clickable links to demo detail pages
   - Truncated demo IDs and scrollable list
   - File: `frontend/components/Comparison/MatchHistoryCard.tsx`

**Page Component**
- /players/[playerId]/compare?with=[otherPlayerId]
  - Extracts playerId from route, compareWithId from query param
  - Uses usePlayerComparison hook for data fetching
  - Redirects to leaderboards if compareWithId missing
  - Suspense boundary with skeleton fallback
  - Back to leaderboards navigation link
- File: `frontend/app/players/[playerId]/compare/page.tsx`

## Test Coverage

### Backend Tests (17 cases)

**GetPlayerComparisonHandlerTest (7 cases)**
1. testReturnsFourMetricsForBothPlayers - All 4 metric cards present for both players
2. testComponentBreakdownIncludesPercentiles - Components have value and percentile arrays
3. testTrendShowsLastTenDemos - Trend history <= 10 entries, sorted by date
4. testMapAffinityShowsTopThreeMaps - Top maps array <= 3 entries, sorted DESC
5. testMatchHistoryShowsSharedDemos - Shared demos in both players' history
6. testThrowsWhenPlayerNotFound - InvalidArgumentException for missing players
7. testThrowsWhenComparingWithSelf - InvalidArgumentException for self-comparison

**PlayerComparisonControllerTest (10 cases)**
1. testGetPlayerComparisonReturns200 - HTTP 200 response with application/json
2. testReturnsCorrectJsonSchema - All required fields in response
3. testRequiresWithParameter - 400 for missing 'with' parameter
4. testCannotCompareWithSelf - 400 for playerId === compareWithId
5. testReturnsPlayerNames - Response includes correct display names
6. testCacheControlHeaderSet - Cache-Control: public, max-age=300
7. testReturnsComponentBreakdownStructure - Components and traceDatetime fields
8. testReturnsTrendCardStructure - History array and trending boolean
9. testReturnsMapAffinityCardStructure - TopMaps array present
10. testReturnsMatchHistoryCardStructure - SharedDemos array present

### Frontend Tests (6 cases)

**PlayerComparisonCard.test.tsx**
1. testRendersFourMetricCardsForBothPlayers - 8 cards rendered (4 metrics × 2 players)
2. testShowsLoadingStateWithSkeleton - Skeleton elements shown when isLoading true
3. testShowsErrorState - Error message displayed when error provided
4. testDisplaysPlayerNames - Both player names visible in header
5. testRendersEmptyState - "No data available" when data is null
6. testDisplaysPlayerIds - Player IDs visible in header with "ID:" prefix

## Verification Results

### HTTP Endpoint

✓ GET /api/players/{playerId}/compare?with={otherPlayerId} returns 200 JSON
✓ Response contains all 4 metric cards for both players
✓ Components include 5 items with percentile values
✓ Trend includes history array and trending boolean
✓ Maps include top 3 entries
✓ History includes shared demos array
✓ Query validation: 400 for missing 'with' parameter
✓ Query validation: 400 for self-comparison
✓ Cache header: Cache-Control: public, max-age=300

### Component Breakdown Card

✓ Displays 5 components (ekill, aim, kast, util, clutch)
✓ Each component shows value and percentile badge
✓ Progress bars color-coded: red < 25%, yellow 25-75%, green > 75%
✓ Trace datetime displayed

### Trend Card

✓ Recharts LineChart renders with data points
✓ X-axis shows abbreviated dates
✓ Y-axis shows TRACE values
✓ Trending indicator shows direction (up/down)
✓ Hover tooltip shows date and TRACE value
✓ Line color changes based on trend

### Map Affinity Card

✓ Top 3 maps displayed with scores
✓ Medal emojis for ranking (🥇 🥈 🥉)
✓ Maps sorted by TRACE score descending
✓ Map display names correct (de_mirage → Mirage, etc.)

### Match History Card

✓ Shared demos listed with dates and maps
✓ Clickable links to demo detail pages
✓ Demo IDs truncated (first 8 chars + ellipsis)
✓ Scrollable list for many demos

### Frontend Page

✓ /players/[playerId]/compare?with=[otherId] renders comparison
✓ Redirects to leaderboards if compareWithId missing
✓ Suspense boundary shows skeleton while loading
✓ Back navigation link to leaderboards

## Deviations from Plan

### Rule 2: Auto-added missing critical functionality

**Split DTOs into separate files** (Deviation)
- Issue: Symfony autowiring expects one class per file in src/ directory
- Fix: Split ComparisonMetricDto.php into 4 separate files (ComponentBreakdownCardDto, TrendCardDto, MapAffinityCardDto, MatchHistoryCardDto)
- Files: 4 new DTO files in `symfony/src/Application/Leaderboard/`
- Commit: de276f0
- Reason: Required for proper Symfony service container configuration

None other - plan executed exactly as written. All 7 tasks completed with required functionality.

## Architecture Notes

### CQRS Aggregation Pattern

The comparison system follows established CQRS patterns with aggregation:

1. **Query Object** (GetPlayerComparisonQuery)
   - Immutable with validation in constructor
   - Carries both player IDs

2. **Handler** (GetPlayerComparisonHandler)
   - Implements MessageHandlerInterface
   - Uses private builder methods for each metric card
   - Builds component breakdown, trend, maps, history
   - Returns single aggregated DTO

3. **Controller** (PlayerComparisonController)
   - Validates parameters
   - Dispatches query via MessageBusInterface
   - Serializes response with cache headers

### 4-Metric Aggregation

The handler combines data from 3 queries per player:

**Per Player:**
1. **Component Breakdown**
   - findLatestByPlayerId(limit=1) → Latest TRACE rating
   - calculateComponentPercentiles() → Percentile ranks
   - Result: ComponentBreakdownCardDto

2. **TRACE Trend**
   - findLatestByPlayerId(limit=10) → Last 10 TRACE ratings
   - Compare first vs. last value for trending
   - Result: TrendCardDto

3. **Map Affinity**
   - findTopMapsByPlayer(limit=3) → Top 3 maps by score
   - Result: MapAffinityCardDto

4. **Match History** (Shared between both players)
   - findSharedByPlayers(playerA, playerB, limit=10) → Demos with both
   - Result: MatchHistoryCardDto

### React Query Integration

Frontend follows React Query best practices:

- **queryKey**: ['playerComparison', playerId, compareWithId]
- **enabled**: Only runs when compareWithId is provided
- **staleTime**: 5 minutes (matches API cache header)
- **retry**: 1 (conservative retry on network error)
- **404 handling**: Returns null instead of error

### Component Architecture

Components are composable and reusable:

- **PlayerComparisonCard**: Orchestrates 4 metric cards
- **Individual cards**: Each self-contained with own loading/error states
- **Props**: Strongly typed via TypeScript interfaces
- **Tailwind CSS**: Responsive design, consistent spacing, hover states

### Cache Strategy

Cache-Control: public, max-age=300 (5 minutes)

- Public: Shareable across CDN and browsers
- max-age=300: Refresh every 5 minutes
- Rationale: Leaderboard data stable over short periods, new TRACE scores arrive slowly

## Known Stubs

None - all required functionality implemented for Wave 3 player comparison.

## Threat Surface Scan

Per threat_model in 12-03-PLAN.md, all mitigations applied:

| Flag | File | Description | Mitigation |
|------|------|-------------|-----------|
| T-12-09 | MatchHistoryCard | Shared demo history | Accept (computed from immutable AnalysisResult, no modification endpoint) |
| T-12-10 | All components | Comparison visibility | Accept (intentionally public, enables competitive benchmarking) |
| T-12-11 | GetPlayerComparisonHandler | DOS via aggregation | Mitigate (limits: 10 demos, 3 maps, 10 shared demos; React Query 5-min cache) |
| T-12-12 | PlayerComparisonController | Injection via playerId | Mitigate (validate both IDs non-empty; Doctrine DQL parameter binding in all queries) |

All trust boundaries from Wave 1 maintained. No new sensitive data exposure.

---

**Status: COMPLETE** - All 7 tasks executed (+ 2 refactor/fix commits), 23 tests written, endpoint verified, Wave 3 player comparison foundation ready for Wave 4 team leaderboards.

**Wave 3 (Player Discovery & Benchmarking) complete:**
✓ Global leaderboards (Wave 1)
✓ Per-map and time-windowed leaderboards (Wave 2)
✓ Player comparison view with 4-metric aggregation (Wave 3)
→ Next: Wave 4 Team leaderboards with aggregated team statistics
