---
phase: 12
phase_name: TRACE Leaderboards
reviewed: 2026-05-17T12:00:00Z
depth: standard
files_reviewed: 47
files_reviewed_list:
  - symfony/src/Domain/Leaderboard/LeaderboardEntry.php
  - symfony/src/Domain/Team/Team.php
  - symfony/src/Application/Leaderboard/LeaderboardEntryDto.php
  - symfony/src/Application/Leaderboard/LeaderboardResponseDto.php
  - symfony/src/Application/Leaderboard/PaginationDto.php
  - symfony/src/Application/Query/GetGlobalLeaderboardQuery.php
  - symfony/src/Application/Handler/GetGlobalLeaderboardHandler.php
  - symfony/src/Presentation/Controller/LeaderboardController.php
  - symfony/src/Infrastructure/Persistence/TraceRatingRepository.php
  - symfony/tests/Application/Handler/GetGlobalLeaderboardHandlerTest.php
  - symfony/tests/Presentation/Controller/LeaderboardControllerTest.php
  - symfony/src/Application/Query/GetMapLeaderboardQuery.php
  - symfony/src/Application/Query/GetTimeWindowLeaderboardQuery.php
  - symfony/src/Application/Handler/GetMapLeaderboardHandler.php
  - symfony/src/Application/Handler/GetTimeWindowLeaderboardHandler.php
  - symfony/src/Domain/Demo/Demo.php
  - symfony/tests/Application/Handler/GetMapLeaderboardHandlerTest.php
  - symfony/tests/Application/Handler/GetTimeWindowLeaderboardHandlerTest.php
  - symfony/migrations/Version20260517101100.php
  - symfony/src/Application/Query/GetPlayerComparisonQuery.php
  - symfony/src/Application/Handler/GetPlayerComparisonHandler.php
  - symfony/src/Application/Leaderboard/PlayerComparisonDto.php
  - symfony/src/Application/Leaderboard/ComponentBreakdownCardDto.php
  - symfony/src/Application/Leaderboard/TrendCardDto.php
  - symfony/src/Application/Leaderboard/MapAffinityCardDto.php
  - symfony/src/Application/Leaderboard/MatchHistoryCardDto.php
  - symfony/src/Presentation/Controller/PlayerComparisonController.php
  - symfony/src/Infrastructure/Persistence/AnalysisResultRepository.php
  - symfony/tests/Application/Handler/GetPlayerComparisonHandlerTest.php
  - symfony/tests/Presentation/Controller/PlayerComparisonControllerTest.php
  - frontend/lib/hooks/usePlayerComparison.ts
  - frontend/components/Comparison/PlayerComparisonCard.tsx
  - frontend/components/Comparison/ComponentBreakdownCard.tsx
  - frontend/components/Comparison/TrendCard.tsx
  - frontend/components/Comparison/MapAffinityCard.tsx
  - frontend/components/Comparison/MatchHistoryCard.tsx
  - frontend/app/players/[playerId]/compare/page.tsx
  - frontend/__tests__/components/Comparison/PlayerComparisonCard.test.tsx
  - symfony/src/Application/Query/GetTeamLeaderboardQuery.php
  - symfony/src/Application/Handler/GetTeamLeaderboardHandler.php
  - symfony/src/Domain/Analysis/AnalysisResultCreated.php
  - symfony/src/Application/Service/LeaderboardUpdateService.php
  - symfony/src/Infrastructure/Event/LeaderboardUpdateListener.php
  - symfony/src/Domain/Player/Player.php
  - symfony/tests/Application/Handler/GetTeamLeaderboardHandlerTest.php
  - symfony/tests/Infrastructure/Event/LeaderboardUpdateListenerTest.php
  - symfony/migrations/Version20260517101200.php
findings:
  critical: 4
  warning: 7
  info: 5
  total: 16
status: issues_found
---

# Phase 12: TRACE Leaderboards - Code Review Report

**Reviewed:** 2026-05-17T12:00:00Z  
**Depth:** standard  
**Files Reviewed:** 47  
**Status:** Issues Found

## Summary

Phase 12 implements a comprehensive 4-wave leaderboard system with global, per-map, time-windowed, and team rankings, plus a 4-metric player comparison view. The implementation is well-structured with proper CQRS patterns, comprehensive test coverage, and thoughtful frontend components.

**Critical Issues Found:** 4 issues require immediate remediation before shipping.

**Warnings Found:** 7 issues degrade code quality or risk bugs under edge cases.

**Info Items:** 5 observations for future improvement.

---

## Critical Issues

### CR-01: SQL Injection Risk in TraceRatingRepository.findTopMapsByPlayer()

**File:** `symfony/src/Infrastructure/Persistence/TraceRatingRepository.php:296-299`

**Issue:** The `findTopMapsByPlayer()` method constructs a query with `d.map as mapId` but the result mapping returns `['map' => ...]` in the transformed array, creating potential confusion. More critically, the `->groupBy('d.map')` clause is applied without any validation that `d.map` is not user-controlled through the query. While the current code paths don't expose direct injection, the pattern is fragile: if future code reuses this logic with parameterized `$mapId`, the `groupBy()` clause remains vulnerable.

**Fix:**
```php
// Line 283-299: Add explicit parameter binding for groupBy to be defensive
public function findTopMapsByPlayer(string $playerId, int $limit = 3): array
{
    $results = $this->createQueryBuilder('tr')
        ->select('d.map as mapId, MAX(tr.traceAdjusted) as traceAdjusted')
        ->innerJoin('tr.analysisResult', 'ar')
        ->innerJoin('ar.demo', 'd')
        ->where('tr.playerId = :playerId')
        ->groupBy('d.map')  // Safe: d.map is entity column, not user input
        ->setParameter('playerId', $playerId)  // Ensure this stays parameterized
        ->orderBy('traceAdjusted', 'DESC')
        ->setMaxResults($limit)
        ->getQuery()
        ->getResult();

    // Convert to expected format (returning 'map' instead of 'mapId' inconsistency)
    return array_map(fn(array $row) => [
        'map' => $row['mapId'],  // Clarify: this is the Map ID string, not a Map object
        'traceAdjusted' => (float) $row['traceAdjusted'],
    ], $results);
}
```

While currently safe, add a comment clarifying that `d.map` is a safe entity column and defensive measures should be taken if refactoring.

---

### CR-02: Missing Null Checks in GetPlayerComparisonHandler.buildComponentBreakdownCard()

**File:** `symfony/src/Application/Handler/GetPlayerComparisonHandler.php:121-166`

**Issue:** At line 125, the code accesses `$traces[0]` without null-safe checks:
```php
$traces = $this->traceRepo->findLatestByPlayer($playerId, 1);
$trace = $traces[0] ?? null;  // Array access without bounds check
```

If `$traces` is an empty array, `$traces[0]` throws a `PHP_ERROR` before the `??` operator can catch it in PHP 8.0. In PHP 8.0+, this would return null safely with the `??` operator, but the pattern is fragile. The same issue appears at line 195 in `buildTrendCard()`:

```php
$latest = $traces[0]->getTraceAdjusted();
$oldest = $traces[count($traces) - 1]->getTraceAdjusted();  // No bounds check
```

**Fix:**
```php
private function buildComponentBreakdownCard(string $playerId): ComponentBreakdownCardDto
{
    $traces = $this->traceRepo->findLatestByPlayer($playerId, 1);
    
    if (empty($traces)) {
        // No TRACE data yet - return empty card
        return new ComponentBreakdownCardDto(
            components: [],
            traceDatetime: new \DateTimeImmutable(),
        );
    }
    
    $trace = $traces[0];  // Safe: already checked length
    // ... rest of method
}

private function buildTrendCard(string $playerId): TrendCardDto
{
    $traces = $this->traceRepo->findLatestByPlayer($playerId, 10);

    if (count($traces) < 2) {
        // Insufficient data for trend
        return new TrendCardDto(
            history: [],
            trending: false,
        );
    }

    // All traces are now safe to access
    $latest = $traces[0]->getTraceAdjusted();
    $oldest = $traces[count($traces) - 1]->getTraceAdjusted();
    // ... rest of method
}
```

---

### CR-03: Infinite Array Iteration Risk in GetTeamLeaderboardHandler.buildLeaderboardEntries()

**File:** `symfony/src/Application/Handler/GetTeamLeaderboardHandler.php:52-82`

**Issue:** At line 59, the code uses `continue` in a foreach loop when aggregated score is null:

```php
foreach ($teams as $index => $trace) {
    $rank = $query->offset + $index + 1;
    // ...
    $aggregatedScore = $this->teamRepo->getTeamAggregatedScore((string) $team->getId());
    if (null === $aggregatedScore) {
        continue;  // PROBLEM: skips incrementing rank but continues iterating
    }
    // ... 
    $entries[] = new LeaderboardEntryDto(
        rank: $rank,  // rank is based on $index, not actual entries count
        // ...
    );
}
```

The `$index` counter is not adjusted when `continue` is called. This causes rank values to be non-sequential (e.g., ranks 1, 3, 5 instead of 1, 2, 3) if some teams are skipped. Additionally, if many teams are filtered out, the rank values will be far higher than the actual position in the results.

**Fix:**
```php
$entries = [];
$rank = $query->offset + 1;  // Start rank counter separately

foreach ($teams as $team) {
    // Get aggregated TRACE score for this team
    $aggregatedScore = $this->teamRepo->getTeamAggregatedScore((string) $team->getId());
    if (null === $aggregatedScore) {
        // Skip teams with no qualified members (shouldn't happen due to query filter)
        continue;
    }

    // ... rest of logic ...

    // Create entry DTO with correct rank
    $entries[] = new LeaderboardEntryDto(
        rank: $rank,
        playerId: (string) $team->getId(),
        playerName: $teamName,
        traceAdjusted: $aggregatedScore,
        components: [],
        demoCount: $demoCount,
        createdAt: $team->getUpdatedAt()->format('c'),
    );
    
    $rank++;  // Increment rank after adding entry
}
```

---

### CR-04: Missing Repository Method Implementations

**File:** `symfony/src/Infrastructure/Persistence/TeamRepository.php` (not in provided files)

**Issue:** The `GetTeamLeaderboardHandler` at line 49 calls `$this->teamRepo->findQualifiedTeamsAndSorted()`, and at line 57 calls `$this->teamRepo->getTeamAggregatedScore()`, and at line 85 calls `$this->teamRepo->countQualifiedTeams()`. 

These methods are referenced but **not provided in the file list**. This suggests the TeamRepository implementation is missing or incomplete, which means the team leaderboard feature **cannot work** without it.

**Fix:**
Ensure `TeamRepository` is implemented with these methods:
```php
public function findQualifiedTeamsAndSorted(int $limit = 100, int $offset = 0): array
{
    // Query teams that have at least one player with 5+ demos
    return $this->createQueryBuilder('t')
        ->select('t')
        ->innerJoin('t.players', 'p')
        ->where('(SELECT COUNT(tr.id) FROM TraceRating tr WHERE tr.playerId = p.id) >= 5')
        ->groupBy('t.id')
        ->orderBy('aggregatedScore', 'DESC')  // Requires computed aggregation
        ->setMaxResults($limit)
        ->setFirstResult($offset)
        ->getQuery()
        ->getResult();
}

public function getTeamAggregatedScore(string $teamId): ?float
{
    // Calculate aggregated TRACE score for team members
    // Option 1: Average of top members
    // Option 2: Sum of members
    // Option 3: Weighted average (per current implementation reference)
}

public function countQualifiedTeams(): int
{
    // Count teams with at least one qualified member
}
```

**Immediate action required:** Provide the TeamRepository implementation or this entire wave will fail at runtime.

---

## Warnings

### WR-01: Inconsistent DTO Field Naming (map vs mapId)

**File:** `symfony/src/Infrastructure/Persistence/TraceRatingRepository.php:296`

**Issue:** The `findTopMapsByPlayer()` method returns an array with `'map'` as the key:
```php
return array_map(fn(array $row) => [
    'map' => $row['mapId'],  // Inconsistency: SQL returns 'mapId', DTO uses 'map'
    'traceAdjusted' => (float) $row['traceAdjusted'],
], $results);
```

However, looking at frontend code (MapAffinityCard.tsx line 46), it accesses `mapData.map`. The DTO definition (MapAffinityCardDto.php:17) expects `map` as the key, so the current implementation is correct. **However**, the SQL column alias is `mapId` while the returned array uses `map`, creating a confusing mismatch. The backend code in `GetPlayerComparisonHandler` at line 215 expects this exact key name, so changing it would break other code.

**Recommendation:** Document this mapping in code comments or normalize to use `mapId` throughout and update frontend accordingly. This is low-risk but confusing.

**Fix:**
```php
// Line 283-299
/**
 * Find top N maps for a player by TRACE score.
 *
 * Returns highest TRACE-adjusted scores for each unique map.
 * 
 * Note: SQL query aliases 'd.map' as 'mapId', but array key is 'map' for
 * consistency with frontend MapAffinityCardDto expectations.
 *
 * @param string $playerId Player ID to search for
 * @param int $limit Maximum number of maps to return (default 3)
 * @return array<array{map: string, traceAdjusted: float}> Array of top maps with scores
 */
public function findTopMapsByPlayer(string $playerId, int $limit = 3): array
```

---

### WR-02: Missing Validation for Empty Map ID in Controller

**File:** `symfony/src/Presentation/Controller/LeaderboardController.php:138-145`

**Issue:** The `getMapLeaderboard()` method validates that `$mapId` is not empty:
```php
if (empty($mapId)) {
    return $this->errors->problem(
        ApiProblem::badRequest(
            'invalid_map_id',
            'Map ID cannot be empty.',
        )
    );
}
```

However, the route parameter `{mapId}` comes from URL routing. If the router correctly enforces non-empty path segments, this validation is redundant. If it doesn't, the validation is insufficient: an attacker could send `/api/leaderboards/maps/..` (just dots). The code should validate the map ID format more strictly.

**Fix:**
```php
// Line 138-145: Add explicit validation for valid map format
const VALID_MAPS = [
    'de_mirage', 'de_inferno', 'de_ancient', 'de_nuke',
    'de_dust2', 'de_overpass', 'de_vertigo', 'de_anubis',
];

if (empty($mapId) || !preg_match('/^[a-z0-9_]+$/', $mapId) || strlen($mapId) > 64) {
    return $this->errors->problem(
        ApiProblem::badRequest(
            'invalid_map_id',
            'Map ID must be alphanumeric (max 64 chars).',
            ['provided' => $mapId]
        )
    );
}

// Optional: whitelist known maps (stricter security)
// if (!in_array($mapId, self::VALID_MAPS, true)) { ... }
```

---

### WR-03: Unvalidated Component Data in GetPlayerComparisonHandler

**File:** `symfony/src/Application/Handler/GetPlayerComparisonHandler.php:138-160`

**Issue:** At line 136, the code builds a components array from TRACE data:
```php
$percentileData = $this->percentiles->calculateComponentPercentiles($trace);

$components = [
    'ekill' => [
        'value' => $trace->getEkill(),
        'percentile' => $percentileData['ekill'] ?? 0,  // Default to 0 if missing
    ],
    // ... same for aim, kast, util, clutch
];
```

The code uses `?? 0` (null coalescing) to provide a default percentile if missing. However, there's no validation that `$percentileData` is an array or that the percentile value is within valid bounds (0-100). If `PercentileCalculator` returns invalid data (e.g., 150%, negative), it will propagate to the frontend without validation.

**Fix:**
```php
private function buildComponentBreakdownCard(string $playerId): ComponentBreakdownCardDto
{
    // ... get trace ...
    
    // Calculate percentiles with validation
    $percentileData = $this->percentiles->calculateComponentPercentiles($trace);
    
    // Validate percentile data structure and bounds
    if (!is_array($percentileData)) {
        $percentileData = [];
    }
    
    $components = [];
    foreach (['ekill', 'aim', 'kast', 'util', 'clutch'] as $component) {
        $percentile = $percentileData[$component] ?? 0;
        
        // Validate percentile is in range [0, 100]
        if (!is_numeric($percentile) || $percentile < 0 || $percentile > 100) {
            $percentile = 0;  // Reset to safe default
        }
        
        $components[$component] = [
            'value' => (float) $trace->{"get" . ucfirst($component)}(),
            'percentile' => (int) round($percentile),
        ];
    }
    
    return new ComponentBreakdownCardDto(
        components: $components,
        traceDatetime: $trace->getCalculatedAt(),
    );
}
```

---

### WR-04: Missing Error Handling for Missing Player in Comparison Handler

**File:** `symfony/src/Application/Handler/GetPlayerComparisonHandler.php:53-62`

**Issue:** At line 60, the code checks if either player is null:
```php
if (!$playerA || !$playerB) {
    throw new \InvalidArgumentException('One or both players not found');
}
```

However, this exception is caught in a try-catch at line 98, which logs the error but re-throws it. The controller at `PlayerComparisonController.php:101-105` catches `\InvalidArgumentException` and returns a 400 Bad Request. 

**The problem:** A 400 error suggests invalid input (the player IDs format), not that players don't exist. For missing entities, a 404 Not Found is more semantically correct. Additionally, callers expect different HTTP codes:
- 400 = Bad request parameters
- 404 = Resource not found

**Fix:**
```php
// In GetPlayerComparisonHandler
class PlayerNotFoundException extends \Exception {}

public function __invoke(GetPlayerComparisonQuery $query): PlayerComparisonDto
{
    try {
        $playerA = $this->playerRepo->find($query->playerId);
        $playerB = $this->playerRepo->find($query->compareWithId);

        if (!$playerA || !$playerB) {
            throw new PlayerNotFoundException(
                'One or both players not found: ' . 
                (!$playerA ? $query->playerId : $query->compareWithId)
            );
        }
        // ... rest of method
    } catch (PlayerNotFoundException $e) {
        // This is a domain-level error, should be 404
        $this->logger->info('Player not found for comparison', [
            'error' => $e->getMessage(),
        ]);
        throw $e;
    }
}

// In PlayerComparisonController
catch (PlayerNotFoundException $e) {
    return $this->errors->problem(
        ApiProblem::notFound('player_not_found', $e->getMessage())
    );
} catch (\InvalidArgumentException $e) {
    return $this->errors->problem(
        ApiProblem::badRequest('validation_error', $e->getMessage())
    );
}
```

---

### WR-05: Race Condition in Pagination with Concurrent Inserts

**File:** `symfony/src/Application/Handler/GetGlobalLeaderboardHandler.php:48-101`

**Issue:** The handler performs two separate queries:
1. Line 48: `$traceRatings = $this->repo->findQualifiedAndSorted($query->limit, $query->offset);`
2. Line 84: `$totalCount = $this->repo->countQualified();`

If a new qualifying player is inserted between these queries, the pagination metadata becomes inconsistent: `totalCount` might be higher than expected, and `hasMore()` could return incorrect values. This is a known issue with pagination but worth noting.

**Impact:** Low severity in this context because leaderboards are relatively stable. However, under high-frequency demo analysis (many completed demos per second), this could manifest.

**Mitigation:** Use a database-level transaction snapshot or consider caching the total count for the pagination window:

```php
// Use transaction to ensure consistent counts
$this->em->getConnection()->setTransactionIsolation(
    \Doctrine\DBAL\Connections\Connection::TRANSACTION_READ_COMMITTED
);

// Fetch total count first, before offset query
$totalCount = $this->repo->countQualified();
$traceRatings = $this->repo->findQualifiedAndSorted($query->limit, $query->offset);
```

---

### WR-06: Hardcoded Component Order Assumption in Frontend

**File:** `frontend/components/Comparison/ComponentBreakdownCard.tsx:24-31`

**Issue:** The component defines a hardcoded display order:
```tsx
const COMPONENT_DISPLAY_ORDER = ['ekill', 'aim', 'kast', 'util', 'clutch']
```

If backend adds a new component or changes the canonical component names, the frontend will silently ignore it or display blank entries. No validation ensures the backend components match this list.

**Fix:** Make the order data-driven:
```tsx
interface ComponentBreakdownCardProps {
  playerName: string
  components: Record<string, { value: number; percentile: number }>
  traceDatetime: string
  componentOrder?: string[]  // Optional order from backend
}

export function ComponentBreakdownCard({
  playerName,
  components,
  traceDatetime,
  componentOrder,
}: ComponentBreakdownCardProps) {
  // Use provided order or fallback to hardcoded
  const order = componentOrder ?? COMPONENT_DISPLAY_ORDER
  
  const hasData = Object.keys(components).length > 0

  return (
    // ... render components in order ...
  )
}
```

Or, expose component order in the API response:
```json
{
  "playerAComponents": {
    "componentOrder": ["ekill", "aim", "kast", "util", "clutch"],
    "components": { ... }
  }
}
```

---

### WR-07: No Handling of Server Errors in React Query Hook

**File:** `frontend/lib/hooks/usePlayerComparison.ts:72-99`

**Issue:** The hook fetches comparison data but doesn't distinguish between different HTTP error codes:

```typescript
if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
        errorData.message || `Failed to fetch player comparison: ${response.statusText}`
    )
}
```

A 500 error (server error) is treated the same as a 400 (bad request) or 404 (not found). The frontend component at `PlayerComparisonCard.tsx:55-61` simply displays the error message without context:

```tsx
if (error) {
    return (
        <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Comparison Error</h3>
            <p className="text-red-700">{error.message}</p>
        </div>
    )
}
```

Users won't know if the issue is missing data, invalid request, or a server problem.

**Fix:**
```typescript
// In usePlayerComparison.ts
export interface ApiError extends Error {
  statusCode: number
  isClientError: boolean  // 4xx vs 5xx
  retryable: boolean
}

queryFn: async (): Promise<PlayerComparisonData | null> => {
    if (!compareWithId) return null

    const response = await fetch(
        `${API_BASE_URL}/players/${playerId}/compare?with=${compareWithId}`
    )

    if (response.status === 404) {
        return null  // Player not found - valid null state
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(
            errorData.message || `Failed to fetch: ${response.statusText}`
        ) as ApiError
        error.statusCode = response.status
        error.isClientError = response.status < 500
        error.retryable = response.status >= 500
        throw error
    }

    return response.json() as Promise<PlayerComparisonData>
},
retry: (failureCount, error) => {
    // Only retry server errors (5xx)
    return (error as ApiError)?.retryable && failureCount < 1
},
```

---

## Info Items

### IN-01: Missing Index on player_team.player_id

**File:** `symfony/migrations/Version20260517101200.php:34-44`

**Issue:** The migration creates the `player_team` junction table with:
```sql
INDEX idx_player_team_team_id (team_id)
```

But queries like `findSharedByPlayers()` in AnalysisResultRepository filter on `player_id`. Adding an index on `player_id` would accelerate queries:

**Recommendation:**
```sql
-- In the migration, add index
CREATE INDEX idx_player_team_player_id ON player_team(player_id);
```

Current impact: Low, as player counts per team are small. Becomes relevant at scale.

---

### IN-02: Redundant Component Fields in Team Leaderboard

**File:** `symfony/src/Application/Handler/GetTeamLeaderboardHandler.php:78`

**Issue:** Team leaderboard entries use `LeaderboardEntryDto`, which includes a `components` field:
```php
$entries[] = new LeaderboardEntryDto(
    rank: $rank,
    playerId: (string) $team->getId(),
    playerName: $teamName,
    traceAdjusted: $aggregatedScore,
    components: [],  // Empty for teams - misleading API
    demoCount: $demoCount,
    createdAt: $team->getUpdatedAt()->format('c'),
);
```

The DTO is designed for players and includes component breakdown. For teams, `components` is always empty. This is API versioning debt: the response mixes player and team data with the same DTO structure.

**Recommendation:** In Wave 5, create a separate `TeamLeaderboardEntryDto` with aggregated components or omit components entirely.

---

### IN-03: Missing Timezone Validation in Demo Map Filtering

**File:** `symfony/src/Infrastructure/Persistence/TraceRatingRepository.php:231-248`

**Issue:** The `findQualifiedByTimeWindowAndSorted()` method uses:
```php
$cutoffDate = new \DateTimeImmutable('-' . $daysBack . ' days');
```

This calculates the cutoff relative to the **server's current time**. If the server is in a different timezone than the demos were recorded, the window could be off by hours. The code comment notes "all timestamps are in UTC (configured in TraceRating entity)" but doesn't enforce UTC in the calculation.

**Recommendation:**
```php
public function findQualifiedByTimeWindowAndSorted(
    int $daysBack,
    int $limit = 100,
    int $offset = 0
): array {
    // Ensure cutoff is calculated in UTC (matching database timestamps)
    $cutoffDate = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))
        ->sub(new \DateInterval('P' . $daysBack . 'D'));

    // ... rest of query
}
```

---

### IN-04: Inefficient Demo Count Calculation in Team Leaderboard

**File:** `symfony/src/Application/Handler/GetTeamLeaderboardHandler.php:67-70`

**Issue:** The handler calculates demo counts in a loop:
```php
$demoCount = 0;
foreach ($team->getPlayers() as $player) {
    $demoCount += $this->traceRepo->countByPlayerId((string) $player->getId());
}
```

If a team has 10 players and the handler returns 100 teams, this triggers 1,000 separate queries (N+1 problem). The `countByPlayerId()` is likely cached by Doctrine's identity map, but it's inefficient.

**Recommendation:** Batch the count query:
```php
// Add method to TraceRatingRepository
public function countDemosByPlayerIds(array $playerIds): array
{
    return $this->createQueryBuilder('tr')
        ->select('tr.playerId, COUNT(tr.id) as count')
        ->where('tr.playerId IN (:playerIds)')
        ->setParameter('playerIds', $playerIds)
        ->groupBy('tr.playerId')
        ->getQuery()
        ->getResult();
}

// In handler
$playerIds = [];
foreach ($teams as $team) {
    foreach ($team->getPlayers() as $player) {
        $playerIds[] = (string) $player->getId();
    }
}
$demoCounts = $this->traceRepo->countDemosByPlayerIds($playerIds);

// Then in loop:
foreach ($teams as $team) {
    $demoCount = 0;
    foreach ($team->getPlayers() as $player) {
        $demoCount += $demoCounts[(string) $player->getId()] ?? 0;
    }
}
```

---

### IN-05: Missing JSDoc Return Type in Frontend Hook

**File:** `frontend/lib/hooks/usePlayerComparison.ts:68-71`

**Issue:** The hook's JSDoc is incomplete:
```typescript
/**
 * React Query hook for fetching player comparison data.
 *
 * Fetches comprehensive comparison between two players across 4 metrics:
 * ...
 *
 * @param playerId - ID of first player
 * @param compareWithId - ID of second player to compare against (optional - skips fetch if not provided)
 * @returns React Query result with PlayerComparisonData
 */
export function usePlayerComparison(
  playerId: string,
  compareWithId: string | null
): UseQueryResult<PlayerComparisonData | null, Error> {
```

The return type is correct in TypeScript but the JSDoc says "PlayerComparisonData" when it should say "PlayerComparisonData | null". Minor documentation issue.

**Fix:**
```typescript
/**
 * @returns React Query result with PlayerComparisonData or null if compareWithId not provided
 */
```

---

## Summary Table

| Severity | Count | Issue | File |
|----------|-------|-------|------|
| **Critical** | 1 | Missing TeamRepository methods | Handler + Repository |
| **Critical** | 1 | SQL injection pattern risk | TraceRatingRepository |
| **Critical** | 1 | Null check bounds errors | GetPlayerComparisonHandler |
| **Critical** | 1 | Rank calculation bug in loop | GetTeamLeaderboardHandler |
| **Warning** | 7 | Various quality issues | Across Phase 12 |
| **Info** | 5 | Documentation/optimization suggestions | Various |
| **Total** | **16** | | |

---

## Recommendations

1. **Immediately fix CR-04 (TeamRepository)** — This is a blocker. Team leaderboard functionality cannot work without the repository implementation.

2. **Address CR-01, CR-02, CR-03** before deployment to prevent runtime errors and data corruption.

3. **Review WR-04 error handling** to ensure users receive correct HTTP status codes.

4. **Refactor frontend error handling (WR-07)** to distinguish error types for better UX.

5. **Consider Wave 5 improvements** for DTO separation and N+1 query optimization.

---

_Reviewed: 2026-05-17T12:00:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
