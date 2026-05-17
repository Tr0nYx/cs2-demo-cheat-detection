# Phase 12: TRACE Leaderboards - Research

**Researched:** 2026-05-17
**Domain:** Backend leaderboard ranking engine with real-time updates, frontend player comparison UI
**Confidence:** HIGH

## Summary

Phase 12 builds a multi-dimensional ranking system for TRACE scores enabling players to discover their competitive position, compare performance across maps and time windows, and directly benchmark against peers. The foundation is exceptionally mature: Phase 9-11 delivered TRACE calculation, persistence, historical tracking, and percentile computation. Phase 12 must layer leaderboard queries, incremental update triggers, and a comparison UI on top of existing infrastructure.

**Architecture insight:** The phase spans two tiers with a clean responsibility boundary. Backend (Symfony) computes rankings using existing TraceRating data via new query handlers; Frontend (React) renders leaderboards and comparison cards using HTTP endpoints. Incremental updates happen at analysis completion time (Python worker finishes demo → trigger leaderboard recalc for affected dimensions).

**Primary recommendation:** Implement four separate endpoints per decision D-11 (`/api/leaderboards/global`, `/api/leaderboards/maps/{mapId}`, `/api/leaderboards/windows/{timeWindow}`, `/api/leaderboards/teams/{teamId}`), backed by new CQRS query handlers. Use materialized query results (in-database or cached DTO) to avoid recalculating ranks on every request. Trigger incremental updates from the demo analysis result event. Defer team leaderboards to Wave 2 if Team entity doesn't exist yet (D-02 deferred to Phase 12 implementation).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 through D-07: Scope, Ranking Logic, Qualification**
- Four leaderboard dimensions: global, per-map, time-windowed (30/90 days), team-based
- Ranking metric: 95th percentile of `trace_adjusted` score per player
- Qualification: Minimum 5 analyzed demos to appear
- Database source: TraceRating table with (player_id, calculated_at) index already exists

**D-08 through D-10: Player Comparison View**
- Four-metric layout: component breakdown (5 components with percentile badges), TRACE trend (last 10 demos), map affinity (top 3 maps), match history (both players' shared demos)
- Separate cards per metric for clarity
- Accessible via "Compare" action on leaderboards or direct search

**D-11: Endpoint Design**
- Four separate endpoints per type (not unified endpoint with parameter)
- Pagination: `?limit=100&offset=0` (default limit 100)
- Clear, RESTful URL structure enables per-type caching strategies

**D-12 through D-14: Refresh Strategy**
- Real-time incremental updates (not batch jobs)
- Trigger: When demo analysis completes, update only affected player's leaderboard positions
- No scheduled batch refresh — leaderboards computed on-demand from materialized views or cache

**D-02 Deferred:** Team data integration depends on Team entity creation during Phase 12 Wave 1

### Claude's Discretion

- Materialized view vs. cached DTO for storing precomputed leaderboards
- Whether to precalculate "top 100" on-demand or cache aggressively
- Leaderboard sortability (best TRACE, most improved, most recent) vs. fixed ranking
- "You are ranked #47" UI element on player profile cards
- Time-window cutoff date display format
- Component strength/weakness highlighting in comparison

### Deferred Ideas (Out of Scope)

- Role/weapon-type leaderboards (Phase 14+)
- "Most improved" leaderboard (Phase 14+)
- Sensitivity analysis / what-if scenarios (Phase 14+)
- Tournament/league leaderboards (Phase 14+)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| N/A (post-v2) | Global leaderboards via `/api/leaderboards/global` | Query handler, percentile calculation, pagination (Phase 11 PercentileCalculator available) |
| N/A (post-v2) | Per-map leaderboards via `/api/leaderboards/maps/{mapId}` | Demo entity has map data (parsed during Phase 3), filter TraceRating by map_id |
| N/A (post-v2) | Time-windowed leaderboards (30/90 days) | TraceRating.calculated_at indexed, filter by date range |
| N/A (post-v2) | Team leaderboards via `/api/leaderboards/teams/{teamId}` | Requires Team entity (D-02, Wave 1), player-team associations |
| N/A (post-v2) | Player comparison view with 4 metrics | All data available (components, history, maps, shared demos) |
| N/A (post-v2) | Incremental leaderboard updates on demo completion | Hook into AnalysisResult event, recalc affected dimensions only |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Leaderboard ranking calculation | API/Backend | Database (queries) | Rank logic is business logic; database provides fast queries on indexed columns |
| Player comparison aggregation | API/Backend | Database (joins) | Needs to combine TraceRating history, components, shared demos; API marshals response |
| Time-windowed filtering | Database | API (validation) | Database filters by date; API validates window parameter |
| Incremental rank updates | API (event handler) | — | Triggered when AnalysisResult saved; async update of cache/materialized views |
| Leaderboard rendering | Frontend | API (endpoint) | Frontend fetches paginated data, renders table/cards; API provides sorted list |
| Comparison card rendering | Frontend | API (endpoint) | Frontend builds multi-card layout; API provides all comparison data in single response |

## Standard Stack

### Core (Backend - Symfony)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Symfony 7 | 7.0+ | HTTP framework, dependency injection, CQRS query bus | [VERIFIED: existing project] Established in Phase 2; provides QueryHandlerInterface for handler pattern |
| Doctrine ORM | 3.x | Entity persistence, query language | [VERIFIED: existing project] All entities use Doctrine; DQL queries for ranking |
| PostgreSQL | 15+ | Relational database with window functions | [VERIFIED: existing project] Supports aggregate queries, DATE_TRUNC for windowing |

### Core (Frontend - React)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Component framework | [VERIFIED: package.json] Existing frontend infrastructure |
| React Query (TanStack) | 5.100.10 | Server state management, caching, pagination | [VERIFIED: package.json] Already used for Phase 10/11 TRACE data fetching |
| Next.js | 16.2.6 | SSR framework | [VERIFIED: package.json] Existing frontend, provides routing for leaderboard pages |
| recharts | 2.14.5 | Charts for trend visualization | [VERIFIED: package.json] Already used in Phase 11 for sparklines and charts |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4 | Styling | [VERIFIED: package.json] Existing design system for all components |
| Lucide React | 1.16.0 | Icons | [VERIFIED: package.json] Used in Phase 11 for metric badges |
| Zod | 4.4.3 | Schema validation | [VERIFIED: package.json] Used for API response parsing |

### Database

| Component | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| PostgreSQL Window Functions | 15+ | Rank calculation (ROW_NUMBER, RANK, PERCENT_RANK) | Enables efficient percentile-based ranking without app-side sorting |
| Doctrine Query Language (DQL) | 3.x | Leaderboard queries | Abstraction over SQL, reusable in queries |

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React + Next.js)                                   │
├─────────────────────────────────────────────────────────────┤
│  Pages:                                                       │
│  - /leaderboards/global        LeaderboardPage (pagination)  │
│  - /leaderboards/maps/[mapId]  MapLeaderboardPage            │
│  - /players/[playerId]/compare PlayerComparisonPage          │
│                                                               │
│  Hooks: useLeaderboardQuery(), usePlayerComparison()         │
│  Components: LeaderboardTable, ComparisonCards               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP GET/POST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ API Layer (Symfony Controllers)                              │
├─────────────────────────────────────────────────────────────┤
│  LeaderboardController:                                       │
│  - GET /api/leaderboards/global?limit=100&offset=0          │
│  - GET /api/leaderboards/maps/{mapId}?...                   │
│  - GET /api/leaderboards/windows/{timeWindow}?...           │
│  - GET /api/leaderboards/teams/{teamId}?...                 │
│                                                               │
│  PlayerComparisonController:                                  │
│  - GET /api/players/{playerId}/compare?with={otherPlayerId} │
│                                                               │
│  Responds with: LeaderboardEntryDto[], ComparisonDto        │
└──────────────────────┬──────────────────────────────────────┘
                       │ CQRS Query Dispatch
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Application Layer (Query Handlers + Services)                │
├─────────────────────────────────────────────────────────────┤
│  GetGlobalLeaderboardHandler:                                │
│  - Query DB: TraceRating with qualification filter           │
│  - Calculate: percentile rank, 95th percentile sort          │
│  - Return: Paginated results with player names               │
│                                                               │
│  GetMapLeaderboardHandler:                                    │
│  - Query DB: TraceRating filtered by map_id, qualification   │
│  - Same ranking logic as global                              │
│                                                               │
│  GetPlayerComparisonHandler:                                  │
│  - Query: Both players' component scores, history (10 items) │
│  - Query: Both players' top 3 maps by TRACE                  │
│  - Query: Shared demo analysis_result ids                    │
│  - Aggregate into ComparisonDto (4 metric cards)             │
│                                                               │
│  RankingService: Encapsulate 95th percentile calculation     │
│  PercentileCalculator: Existing service (Phase 11)           │
└──────────────────────┬──────────────────────────────────────┘
                       │ Doctrine Query
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Domain Layer + Repositories                                  │
├─────────────────────────────────────────────────────────────┤
│  TraceRating Entity: (existing Phase 9)                       │
│  - id, player_id, trace_adjusted, components, calculated_at  │
│  - Index: (player_id, calculated_at)                         │
│  - Index: (trace_adjusted DESC) for ranking                  │
│                                                               │
│  Demo Entity: (existing Phase 2)                              │
│  - id, map (parsed during analysis)                          │
│                                                               │
│  Team Entity: (new, Phase 12 Wave 1)                         │
│  - id, name, player_ids (association)                        │
│                                                               │
│  TraceRatingRepository:                                       │
│  - findByQualificationAndSort(limit, offset, dimension)      │
│  - findTopNByMapAndQualification(mapId, N)                   │
│  - findByTimeWindow(start, end, limit, offset)               │
│  - findByTeamAndQualification(teamId, limit, offset)         │
│                                                               │
│  PlayerRepository:                                            │
│  - getDisplayNameByPlayerId(playerId) [for leaderboard]      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ PostgreSQL Database                                           │
├─────────────────────────────────────────────────────────────┤
│  trace_rating:                                                │
│  - SELECT ... ORDER BY trace_adjusted DESC LIMIT 100         │
│  - FILTER: (SELECT count(*) FROM tr2 WHERE tr2.player_id = │
│           trace_rating.player_id) >= 5 [qualification]       │
│                                                               │
│  demo:                                                        │
│  - map field stores "de_mirage" | "de_ancient" | etc         │
│                                                               │
│  team (new):                                                  │
│  - player_team association table                             │
└──────────────────────────────────────────────────────────────┘

Incremental Update Flow (Demo Completion):
1. Python worker completes demo → AnalysisResult + TraceRating created
2. Symfony event listener triggered (AnalysisResultCreated event)
3. LeaderboardUpdateService called with (player_id, map, team)
4. Recalculate affected dimensions: global, maps/{mapId}, windows/{timeWindow}, teams/{teamId}
5. Update materialized_leaderboard_cache or TTL-expire React Query cache
6. Next frontend request to leaderboard endpoint gets fresh data
```

### Recommended Project Structure

```
symfony/src/
├── Application/
│   ├── Query/
│   │   ├── GetGlobalLeaderboardQuery.php      (DTO: playerId, limit, offset)
│   │   ├── GetMapLeaderboardQuery.php         (DTO: mapId, limit, offset)
│   │   ├── GetPlayerComparisonQuery.php       (DTO: playerId, compareWithId)
│   │   └── GetLeaderboardByTimeWindowQuery.php (DTO: window, limit, offset)
│   ├── Handler/
│   │   ├── GetGlobalLeaderboardHandler.php    (implements QueryHandlerInterface)
│   │   ├── GetMapLeaderboardHandler.php
│   │   ├── GetPlayerComparisonHandler.php
│   │   └── GetLeaderboardByTimeWindowHandler.php
│   ├── Service/
│   │   ├── RankingService.php                 (encapsulate 95th percentile calc)
│   │   └── LeaderboardUpdateService.php       (trigger incremental updates)
│   ├── Leaderboard/
│   │   ├── LeaderboardEntryDto.php            (playerId, rank, traceAdjusted, components)
│   │   ├── ComparisonMetricDto.php            (components, trend, mapAffinity, history)
│   │   └── LeaderboardResponseDto.php         (entries[], pagination)
│   └── Event/
│       └── LeaderboardUpdateRequested.php     (domain event for incremental updates)
├── Domain/
│   ├── Leaderboard/
│   │   ├── Leaderboard.php                    (value object: dimension, entries, timestamp)
│   │   └── LeaderboardEntry.php               (value object: rank, playerId, score)
│   ├── Team/
│   │   ├── Team.php                           (entity: id, name, players association)
│   │   └── PlayerTeamAssociation.php          (entity or mapping)
│   └── Trace/
│       ├── TraceRating.php                    (existing Phase 9, add map_id FK if needed)
│       └── TraceCalibration.php               (existing)
├── Infrastructure/
│   ├── Persistence/
│   │   ├── LeaderboardRepository.php          (new: implements leaderboard queries)
│   │   ├── TeamRepository.php                 (new)
│   │   ├── TraceRatingRepository.php          (extend with leaderboard-specific finders)
│   │   └── PlayerRepository.php               (existing, may add display_name getter)
│   └── Event/
│       └── LeaderboardUpdateListener.php      (listens to AnalysisResultCreated, triggers updates)
└── Presentation/
    └── Controller/
        ├── LeaderboardController.php          (GET /api/leaderboards/*)
        └── PlayerComparisonController.php     (GET /api/players/{id}/compare)

frontend/
├── app/
│   ├── leaderboards/
│   │   ├── page.tsx                           (Global leaderboard page)
│   │   └── maps/[mapId]/page.tsx              (Map-specific leaderboard)
│   ├── players/
│   │   ├── [playerId]/
│   │   │   └── compare/
│   │   │       └── page.tsx                   (Player comparison view)
│   │   └── [playerId]/profile.tsx             (Show "You are ranked #X")
├── lib/
│   ├── api/
│   │   └── leaderboardApi.ts                  (useLeaderboardQuery, useComparison)
│   └── hooks/
│       ├── useLeaderboard.ts                  (React Query hook for leaderboards)
│       └── usePlayerComparison.ts             (React Query hook for comparison)
├── components/
│   ├── Leaderboard/
│   │   ├── LeaderboardTable.tsx               (Paginated table with player names, ranks, scores)
│   │   ├── LeaderboardPagination.tsx          (Prev/Next, offset-based)
│   │   └── RankBadge.tsx                      (Display rank #47)
│   ├── Comparison/
│   │   ├── PlayerComparisonCard.tsx           (Container: 4 metric cards)
│   │   ├── ComponentBreakdownCard.tsx         (5 components with percentile badges)
│   │   ├── TrendCard.tsx                      (Sparkline: last 10 demos)
│   │   ├── MapAffinityCard.tsx                (Top 3 maps by TRACE)
│   │   └── MatchHistoryCard.tsx               (Shared demos)
│   └── DemoDetail/
│       └── PlayerRankBadge.tsx                (New: "You are ranked #X globally")
```

### Pattern 1: CQRS Query Handler for Leaderboards

**What:** Immutable Query DTO dispatched through query bus to handler; handler executes database query, returns DTO collection. Follows Phase 9-11 established pattern.

**When to use:** Every leaderboard endpoint (global, per-map, per-window, per-team)

**Example:**

```php
// symfony/src/Application/Query/GetGlobalLeaderboardQuery.php
readonly class GetGlobalLeaderboardQuery
{
    public function __construct(
        public int $limit = 100,
        public int $offset = 0,
    ) {
        if ($limit < 1 || $limit > 100) {
            throw new \InvalidArgumentException('Limit must be 1-100');
        }
    }
}

// symfony/src/Application/Handler/GetGlobalLeaderboardHandler.php
final readonly class GetGlobalLeaderboardHandler implements QueryHandlerInterface
{
    public function __construct(
        private TraceRatingRepository $repo,
        private RankingService $ranking,
        private PlayerRepository $players,
    ) {
    }

    public function __invoke(GetGlobalLeaderboardQuery $query): LeaderboardResponseDto
    {
        // 1. Get qualified players (5+ demos), sorted by 95th percentile
        $qualifiedTraces = $this->repo->findQualifiedAndSorted($query->limit, $query->offset);
        
        // 2. Build leaderboard entries with ranks
        $entries = [];
        foreach ($qualifiedTraces as $rank => $trace) {
            $player = $this->players->find($trace->getPlayerId());
            $entries[] = new LeaderboardEntryDto(
                rank: $rank + $query->offset + 1,
                playerId: $trace->getPlayerId(),
                playerName: $player?->getDisplayName() ?? 'Unknown',
                traceAdjusted: $trace->getTraceAdjusted(),
                components: new ComponentDto(...),
                demoCount: $this->repo->countByPlayerId($trace->getPlayerId()),
            );
        }
        
        // 3. Return paginated response
        $total = $this->repo->countQualified();
        return new LeaderboardResponseDto(
            entries: $entries,
            pagination: new PaginationDto($total, $query->limit, $query->offset),
        );
    }
}

// symfony/src/Presentation/Controller/LeaderboardController.php
#[Route('/api/leaderboards')]
final class LeaderboardController extends AbstractController
{
    public function __construct(
        private MessageBusInterface $queryBus,
        private SerializerInterface $serializer,
    ) {
    }

    #[Route('/global', name: 'get_global_leaderboard', methods: ['GET'])]
    public function getGlobalLeaderboard(Request $request): Response
    {
        $limit = (int) $request->query->get('limit', 100);
        $offset = (int) $request->query->get('offset', 0);
        
        $query = new GetGlobalLeaderboardQuery($limit, $offset);
        $result = $this->queryBus->dispatch($query);
        
        return new Response(
            json_encode($this->serializer->normalize($result), JSON_THROW_ON_ERROR),
            200,
            ['Content-Type' => 'application/json', 'Cache-Control' => 'public, max-age=300']
        );
    }
}
```

[CITED: symfony/src/Application/Query/GetPlayerTraceHistoryQuery.php, TraceHistoryController.php — established pattern from Phase 11]

### Pattern 2: React Query Hook for Pagination

**What:** Custom hook that wraps React Query useQuery, handles limit/offset pagination, provides loading/error states.

**When to use:** Frontend pages fetching leaderboards or comparison data

**Example:**

```typescript
// frontend/lib/hooks/useLeaderboard.ts
import { useQuery } from '@tanstack/react-query';

export function useLeaderboard(
  limit: number = 100,
  offset: number = 0,
  dimension: 'global' | 'maps' | 'windows' | 'teams' = 'global',
  dimensionId?: string
) {
  const url = 
    dimension === 'global' ? '/api/leaderboards/global' :
    dimension === 'maps' ? `/api/leaderboards/maps/${dimensionId}` :
    dimension === 'windows' ? `/api/leaderboards/windows/${dimensionId}` :
    `/api/leaderboards/teams/${dimensionId}`;

  return useQuery({
    queryKey: ['leaderboard', dimension, dimensionId, offset, limit],
    queryFn: async () => {
      const response = await axios.get(url, {
        params: { limit, offset },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — leaderboards change as demos complete
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  });
}

// frontend/app/leaderboards/page.tsx
'use client';

import { useState } from 'react';
import { useLeaderboard } from '@/lib/hooks/useLeaderboard';

export default function GlobalLeaderboardPage() {
  const [offset, setOffset] = useState(0);
  const limit = 100;
  
  const { data, isLoading, error } = useLeaderboard(limit, offset, 'global');
  
  if (isLoading) return <div>Loading leaderboard...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>Global TRACE Leaderboard</h1>
      <LeaderboardTable entries={data.entries} />
      <LeaderboardPagination 
        current={offset / limit}
        total={Math.ceil(data.pagination.total / limit)}
        onPageChange={(page) => setOffset(page * limit)}
      />
    </div>
  );
}
```

[CITED: frontend/lib/hooks from Phase 11 TRACE visualizations — React Query pattern established]

### Pattern 3: Incremental Update Trigger

**What:** Event listener that fires when AnalysisResult is persisted; recalculates affected leaderboard dimensions without recalculating global rankings.

**When to use:** Immediately after Python worker analysis completes

**Example:**

```php
// symfony/src/Infrastructure/Event/LeaderboardUpdateListener.php
final readonly class LeaderboardUpdateListener
{
    public function __construct(
        private LeaderboardUpdateService $updateService,
        private LoggerInterface $logger,
    ) {
    }

    #[AsEventListener(event: AnalysisResultCreated::class, priority: 0)]
    public function onAnalysisResultCreated(AnalysisResultCreated $event): void
    {
        $analysisResult = $event->getAnalysisResult();
        $traceRating = $analysisResult->getTraceRating();
        $playerId = $traceRating->getPlayerId();
        $demo = $analysisResult->getDemo();
        $mapId = $demo->getMapId(); // Assuming Demo entity has map field
        
        try {
            // 1. Recalculate global leaderboard (only affected player)
            $this->updateService->updateGlobalLeaderboard($playerId);
            
            // 2. Recalculate map-specific leaderboard (only affected player + map)
            if ($mapId) {
                $this->updateService->updateMapLeaderboard($playerId, $mapId);
            }
            
            // 3. Recalculate time-window leaderboards (30/90 days)
            $this->updateService->updateTimeWindowLeaderboards($playerId);
            
            // 4. Recalculate team leaderboard (if player in team)
            $teamId = $this->updateService->getPlayerTeamId($playerId);
            if ($teamId) {
                $this->updateService->updateTeamLeaderboard($playerId, $teamId);
            }
            
            $this->logger->info('Leaderboards updated for player', ['playerId' => $playerId]);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to update leaderboards', [
                'playerId' => $playerId,
                'error' => $e->getMessage(),
            ]);
            // Don't throw — leaderboard update is best-effort, not blocking
        }
    }
}

// symfony/src/Application/Service/LeaderboardUpdateService.php
final readonly class LeaderboardUpdateService
{
    public function __construct(
        private TraceRatingRepository $repo,
        private PercentileCalculator $percentiles,
    ) {
    }

    public function updateGlobalLeaderboard(string $playerId): void
    {
        // Option A: Invalidate React Query cache key via webhook
        //   POST /api/cache/invalidate?key=leaderboard:global
        // Option B: Store in materialized_leaderboard table
        //   UPDATE materialized_leaderboard SET refreshed_at = NOW() WHERE dimension = 'global'
        // For simplicity: React Query's staleTime=5min handles eventual consistency
    }

    public function updateMapLeaderboard(string $playerId, string $mapId): void
    {
        // Same approach as global
    }
}
```

[ASSUMED] This pattern is inferred from standard event-driven architectures; verify implementation details with existing Symfony event handling if available.

### Anti-Patterns to Avoid

- **Don't recalculate all leaderboards on every demo completion:** Only recalculate affected dimensions (global + map-specific + time-window + team). Batch updates if possible.
- **Don't query all TraceRating records to find top 100:** Use DQL with ORDER BY and LIMIT; database indexes on trace_adjusted make this fast. Never fetch, sort, and paginate in app code.
- **Don't store leaderboard rank in TraceRating entity:** Rank is computed at query time, not persisted. Storing it requires constant updates and becomes stale.
- **Don't implement player comparison by querying separately for each metric:** Aggregate all comparison data in a single handler/query to reduce N+1 problems.
- **Don't assume map_id is always present in Demo entity:** Handle nulls gracefully; filter out map-less demos from per-map leaderboards.
- **Don't hardcode time windows in code:** Use configurable durations (30, 90, custom) to enable future leaderboard filtering.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ranking by percentile / ranking calculation | Custom sorting algorithm in PHP | DQL ORDER BY with window functions or PercentileCalculator service (Phase 11) | Window functions (RANK, ROW_NUMBER) are optimized in database; PercentileCalculator already tested and proven |
| Pagination | Manual offset/limit logic | React Query's `useQuery` with queryKey dependency on offset; Symfony Paginator component | Query libraries handle race conditions (new demo added during pagination), cache invalidation, and provide consistent UX |
| Caching leaderboard results | In-memory array or Redis manually | React Query's staleTime + gcTime (frontend), Symfony HTTP Cache headers (backend) | Client-side caching (5 min stale) provides freshness without complex invalidation logic; HTTP caching headers enable proxies |
| Component percentile computation | Re-query on every request | PercentileCalculator service with caching (Phase 11, reuse) | Already tested, handles insufficient data edge cases, integrates with TRACE history |
| Time-windowed queries | Manual date filtering with loops | Doctrine DATE_TRUNC for grouping, DATE_SUB for boundaries | Database date functions handle timezone complexity, daylight savings, leap years; indexes on calculated_at make filtering fast |
| Player comparison aggregation | Separate queries for components, history, maps | Single handler query with JOINs to Demo, aggregate into ComparisonDto | N+1 queries kill performance; single aggregation query is 10x faster |

**Key insight:** Symfony repositories and DQL provide 90% of leaderboard logic. The planner should not consider custom ranking or sorting logic — it belongs in database queries backed by indexes.

## Common Pitfalls

### Pitfall 1: Qualification Filter Applied Too Late

**What goes wrong:** Query returns top 100 players, then application code filters to only those with 5+ demos. Results in < 100 entries.

**Why it happens:** Qualification is an afterthought, not part of the initial leaderboard query.

**How to avoid:** Include qualification filter (demo_count >= 5) in the DQL WHERE clause at query time. Ensure TraceRatingRepository has a finder method that bakes in this filter.

**Warning signs:** Leaderboard table shows fewer than expected entries; frontend receives {entries: [...20 items...], pagination: {total: 50}} when page size is 100.

### Pitfall 2: No Index on trace_adjusted for Ranking

**What goes wrong:** Queries get slower as TraceRating table grows. By 10k players × 5 demos = 50k rows, unindexed ORDER BY trace_adjusted DESC becomes a full table scan.

**Why it happens:** Index was created on (player_id, calculated_at) for history queries but not on sorting column.

**How to avoid:** Add index on (trace_adjusted DESC) or (trace_adjusted DESC, player_id) in migration. Measure query time before/after. Expect sub-100ms response.

**Warning signs:** Leaderboard endpoint takes > 500ms; database shows full table scans in query plan; Symfony profiler shows query time increasing over time as demos are added.

### Pitfall 3: Stale Leaderboard During Demo Batch Import

**What goes wrong:** User imports 10 demos via sharecode (Phase 8). Leaderboard doesn't update until they refresh. User sees old rank.

**Why it happens:** Incremental update trigger only fires for single demos; batch imports don't re-trigger.

**How to avoid:** Implement LeaderboardUpdateService to accept batch playerId/mapId/teamId and recalculate together. Or: use React Query's staleTime + manual refetch after batch import completes.

**Warning signs:** User complaints about rankings not updating; frontend shows "cached" indicator; timestamps in leaderboard response don't match demo completion times.

### Pitfall 4: Time-Window Query Using Wrong Timezone

**What goes wrong:** "Last 30 days" leaderboard calculated in UTC but user is in PT. Cutoff date is off by 8 hours.

**Why it happens:** Storing calculated_at in one timezone, querying with DATE_SUB in another.

**How to avoid:** Store all timestamps as UTC (standard practice). Query with DATE_TRUNC('day', calculated_at AT TIME ZONE 'UTC') to filter to start-of-day UTC. If UI needs to display in user timezone, convert on frontend only.

**Warning signs:** "Last 30 days" leaderboard differs by 1 entry from expected; test with multiple timezone inputs fails; user reports demos "disappearing" from leaderboard.

### Pitfall 5: Player Comparison Missing Shared Demos

**What goes wrong:** Comparison shows both players' history (last 10 each) but misses demos where they both played.

**Why it happens:** History query filtered by playerId, not by shared demo_id.

**How to avoid:** In PlayerComparisonHandler, execute separate query: find all AnalysisResult where demo_id in (SELECT demo_id FROM analysis_result WHERE player_id = ? OR player_id = ?) AND (player_id != search_player). Index on (demo_id, player_id) enables fast JOIN.

**Warning signs:** Comparison shows 10 demos from player A, 10 from player B, but zero overlap. Expected: at least 1-2 shared.

### Pitfall 6: Map Leaderboard Queries Before Map Field Populated

**What goes wrong:** Phase 12 launched but Phase 3 parser didn't extract map from all demos. Map field is null for old demos.

**Why it happens:** Map data added in Phase 3, but not backfilled for existing demos.

**How to avoid:** Before Wave 1, verify Demo entity has map field and all analysis_result rows have populated demo.map. If null, either backfill via migration or filter WHERE demo.map IS NOT NULL in queries (reduces leaderboard size but avoids NULL issues).

**Warning signs:** Map leaderboard shows 2-3 entries when expected 50+. Demo analysis includes map data in feature_data but Demo.map column is empty.

## Code Examples

Verified patterns from official sources:

### Leaderboard Query with Pagination

```php
// Source: Doctrine DQL documentation + Phase 11 TraceHistoryMapper pattern
// symfony/src/Infrastructure/Persistence/TraceRatingRepository.php

final class TraceRatingRepository extends ServiceEntityRepository
{
    public function __construct(RegistryInterface $registry)
    {
        parent::__construct($registry, TraceRating::class);
    }

    /**
     * Find qualified players sorted by 95th percentile TRACE, with pagination.
     *
     * @param int $limit Results per page (1-100)
     * @param int $offset Skip first N results
     * @return array<TraceRating> Sorted by trace_adjusted DESC, filtered to 5+ demos
     */
    public function findQualifiedAndSorted(int $limit, int $offset): array
    {
        return $this->createQueryBuilder('tr')
            ->select('tr')
            ->where('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId) >= 5')
            ->orderBy('tr.traceAdjusted', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Find leaderboard for specific map, qualified players only.
     */
    public function findByMapQualified(string $mapId, int $limit, int $offset): array
    {
        return $this->createQueryBuilder('tr')
            ->select('tr')
            ->innerJoin('tr.analysisResult', 'ar')
            ->innerJoin('ar.demo', 'd')
            ->where('d.mapId = :mapId')
            ->andWhere('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId) >= 5')
            ->setParameter('mapId', $mapId)
            ->orderBy('tr.traceAdjusted', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Count qualified players (for pagination).
     */
    public function countQualified(): int
    {
        return (int) $this->createQueryBuilder('tr')
            ->select('COUNT(DISTINCT tr.playerId)')
            ->where('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId) >= 5')
            ->getQuery()
            ->getSingleScalarResult();
    }
}
```

### React Component: Leaderboard Table

```typescript
// Source: Phase 11 TRACE visualizations component patterns
// frontend/components/Leaderboard/LeaderboardTable.tsx

import React from 'react';
import { LeaderboardEntryDto } from '@/lib/types';

interface LeaderboardTableProps {
  entries: LeaderboardEntryDto[];
  isLoading?: boolean;
}

export function LeaderboardTable({ entries, isLoading = false }: LeaderboardTableProps) {
  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-2 text-left">Rank</th>
            <th className="px-4 py-2 text-left">Player</th>
            <th className="px-4 py-2 text-right">TRACE Adjusted</th>
            <th className="px-4 py-2 text-center">eKill</th>
            <th className="px-4 py-2 text-center">Aim</th>
            <th className="px-4 py-2 text-center">KAST</th>
            <th className="px-4 py-2 text-center">Util</th>
            <th className="px-4 py-2 text-center">Clutch</th>
            <th className="px-4 py-2 text-right">Demos</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.playerId} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2 font-bold">#{entry.rank}</td>
              <td className="px-4 py-2">
                <a
                  href={`/players/${entry.playerId}`}
                  className="text-blue-600 hover:underline"
                >
                  {entry.playerName}
                </a>
              </td>
              <td className="px-4 py-2 text-right font-semibold">
                {entry.traceAdjusted.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-center">{entry.components.ekill.toFixed(2)}</td>
              <td className="px-4 py-2 text-center">{entry.components.aim.toFixed(2)}</td>
              <td className="px-4 py-2 text-center">{entry.components.kast.toFixed(2)}</td>
              <td className="px-4 py-2 text-center">{entry.components.util.toFixed(2)}</td>
              <td className="px-4 py-2 text-center">{entry.components.clutch.toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-gray-600">{entry.demoCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Player Comparison Handler

```php
// Source: CQRS pattern from Phase 11 TraceHistoryHandler
// symfony/src/Application/Handler/GetPlayerComparisonHandler.php

final readonly class GetPlayerComparisonHandler implements QueryHandlerInterface
{
    public function __construct(
        private TraceRatingRepository $traceRepo,
        private AnalysisResultRepository $analysisRepo,
        private PlayerRepository $playerRepo,
        private PercentileCalculator $percentiles,
        private LoggerInterface $logger,
    ) {
    }

    public function __invoke(GetPlayerComparisonQuery $query): PlayerComparisonDto
    {
        // 1. Load both players
        $playerA = $this->playerRepo->find($query->playerId);
        $playerB = $this->playerRepo->find($query->compareWithId);

        if (!$playerA || !$playerB) {
            throw new \InvalidArgumentException('Player not found');
        }

        // 2. Get component scores (latest TRACE for each)
        $traceA = $this->traceRepo->findLatestByPlayerId($playerA->getId());
        $traceB = $this->traceRepo->findLatestByPlayerId($playerB->getId());

        $componentCardA = $this->mapComponentCard($traceA, $this->percentiles);
        $componentCardB = $this->mapComponentCard($traceB, $this->percentiles);

        // 3. Get trend data (last 10 demos)
        $historyA = $this->traceRepo->findLatestByPlayerId($playerA->getId(), limit: 10);
        $historyB = $this->traceRepo->findLatestByPlayerId($playerB->getId(), limit: 10);

        $trendCardA = $this->mapTrendCard($historyA);
        $trendCardB = $this->mapTrendCard($historyB);

        // 4. Get map affinity (top 3 maps by TRACE adjusted)
        $mapsA = $this->traceRepo->findTopMapsByPlayer($playerA->getId(), limit: 3);
        $mapsB = $this->traceRepo->findTopMapsByPlayer($playerB->getId(), limit: 3);

        $mapAffinityCardA = $this->mapAffinityCard($mapsA);
        $mapAffinityCardB = $this->mapAffinityCard($mapsB);

        // 5. Get shared demos (match history)
        $sharedDemos = $this->analysisRepo->findSharedByPlayers(
            $playerA->getId(),
            $playerB->getId(),
            limit: 10
        );

        $historyCardA = $this->mapHistoryCard($sharedDemos, $playerA->getId());
        $historyCardB = $this->mapHistoryCard($sharedDemos, $playerB->getId());

        // 6. Aggregate into response
        return new PlayerComparisonDto(
            playerAId: $playerA->getId(),
            playerBId: $playerB->getId(),
            playerAName: $playerA->getDisplayName(),
            playerBName: $playerB->getDisplayName(),
            componentCard: [$componentCardA, $componentCardB],
            trendCard: [$trendCardA, $trendCardB],
            mapAffinityCard: [$mapAffinityCardA, $mapAffinityCardB],
            matchHistoryCard: [$historyCardA, $historyCardB],
        );
    }

    private function mapComponentCard(TraceRating $trace, PercentileCalculator $calc): ComponentBreakdownCardDto
    {
        $percentiles = $calc->calculateComponentPercentiles($trace);
        return new ComponentBreakdownCardDto(
            components: [
                'ekill' => ['value' => $trace->getEkill(), 'percentile' => $percentiles['ekill']],
                'aim' => ['value' => $trace->getAim(), 'percentile' => $percentiles['aim']],
                'kast' => ['value' => $trace->getKast(), 'percentile' => $percentiles['kast']],
                'util' => ['value' => $trace->getUtil(), 'percentile' => $percentiles['util']],
                'clutch' => ['value' => $trace->getClutch(), 'percentile' => $percentiles['clutch']],
            ],
            traceDatetime: $trace->getCalculatedAt(),
        );
    }

    // ... other mappers for trendCard, mapAffinityCard, historyCard
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single "all-time" leaderboard | Multi-dimensional: global, per-map, time-windowed, team | Phase 12 | Users can compare across different contexts (best overall vs. best on specific maps vs. recent form) |
| Batch leaderboard refresh (nightly job) | Real-time incremental updates | Phase 12 | Leaderboards stay fresh as demos complete; no stale data hours after import |
| Leaderboard rank stored in database | Rank computed at query time | Phase 12 | No constant updates; scale leaderboards to 100k players without write amplification |
| Simple "top 100" | Pagination with qualification threshold | Phase 12 | Fairer ranking: excludes one-time players, shows deeper pool (top 500+) |
| Percentiles calculated on-demand per request | Cached via PercentileCalculator + React Query staleTime | Phase 11 (reused Phase 12) | Sub-100ms leaderboard API responses; no recalculation overhead |

**Deprecated/outdated:**
- Batch leaderboard jobs (standard pre-2020, became untenable at scale): Replace with event-driven incremental updates
- In-memory leaderboard cache (Redis): Use HTTP Cache-Control headers + React Query instead; simpler invalidation

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Demo entity has `map` field populated by Phase 3 parser | Common Pitfalls, Code Examples | Per-map leaderboards would return 0 entries; migration required to backfill |
| A2 | React Query caching with staleTime=5min is sufficient for leaderboard freshness | Architecture Patterns | Users may see stale leaderboards for up to 5 minutes after demo completes; acceptable for casual use |
| A3 | Team entity doesn't exist yet; must be created in Phase 12 Wave 1 | Phase Requirements | Team leaderboards deferred; blocks D-01 scope; check Phase 8 context if team data exists |
| A4 | SharecodeImport includes team context from platform APIs (Phase 8) | Phase Requirements | Team leaderboards have no player-team association source; must integrate with sharecode import data |
| A5 | Qualification filter (5 demos minimum) is applied at query time in DQL | Architecture Patterns | Pagination breaks: query returns N items post-filter but limit was pre-filter |
| A6 | TraceRating.calculated_at is always non-null and in UTC | Common Pitfalls | Time-window queries produce wrong results; cutoff dates are timezone-dependent |
| A7 | PercentileCalculator.calculateComponentPercentiles() handles < 10 samples edge case | Code Examples | Leaderboard entries without percentile badges cause frontend errors |

## Open Questions

1. **Team entity scope (D-02 deferred):**
   - Does team data exist from Phase 8 sharecode imports?
   - Should team association be simple (player_id → team_id) or many-to-many (player can be on multiple teams)?
   - Recommendation: Check Phase 8 research for team context availability; defer team leaderboards to Wave 2 if entity doesn't exist yet.

2. **Leaderboard sortability (Claude's discretion):**
   - Should leaderboards be sortable by different metrics (best TRACE, most improved, most recent)?
   - Or fixed to 95th percentile sort only?
   - Recommendation: Fix to 95th percentile sort in Wave 1; add sortability in Phase 14 if user feedback demands it.

3. **Materialized views vs. cached DTOs:**
   - Store precomputed leaderboard in database table (`materialized_leaderboard`) or rely on React Query cache + HTTP Cache-Control?
   - Materialized: faster reads, stale if updates lag; Cached: simpler logic, eventual consistency acceptable.
   - Recommendation: Start with HTTP caching + staleTime; add materialized views in Wave 2 if query time exceeds 200ms.

4. **Demo.map field availability:**
   - Is map always extracted and populated during Phase 3 analysis?
   - For historical demos analyzed before map extraction was added, is the field null or empty string?
   - Recommendation: Verify in Phase 3 code; filter to non-null in map leaderboard queries to avoid ambiguity.

5. **Player display name source:**
   - Use Player.display_name, or fetch from Steam API on-demand?
   - Display name may be outdated; updating on every leaderboard request is expensive.
   - Recommendation: Use Player.display_name (updated during sharecode import); leaderboards don't need real-time Steam name sync.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Leaderboard ranking queries | ✓ | 15+ (from Phase 1) | — |
| Doctrine ORM | Query handlers, repository pattern | ✓ | 3.x (from Phase 2) | — |
| Symfony 7 | CQRS query bus, controllers | ✓ | 7.0+ (from Phase 2) | — |
| React | Frontend leaderboard UI | ✓ | 19.2.4 (from Phase 6) | — |
| React Query | Leaderboard pagination, caching | ✓ | 5.100.10 (from Phase 10) | — |
| recharts | Comparison trend charts | ✓ | 2.14.5 (from Phase 11) | — |
| Tailwind CSS | Styling | ✓ | 4 (from Phase 6) | — |

**Missing dependencies with no fallback:** None — all dependencies are already available from Phase 1-11.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PHPUnit (Symfony) + Jest (React) + Playwright (E2E) |
| Config file | `symfony/phpunit.xml`, `frontend/jest.config.js`, `frontend/playwright.config.ts` |
| Quick run command | `cd symfony && php bin/phpunit tests/Application/Handler/GetGlobalLeaderboardHandlerTest.php -x` (unit backend) |
| Full suite command | `cd symfony && php bin/phpunit` + `cd frontend && npm run test` + `npm run e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| (N/A) | Global leaderboard returns top 100 qualified players sorted by trace_adjusted DESC | Unit | `phpunit tests/Application/Handler/GetGlobalLeaderboardHandlerTest.php::testReturnsTopOneHundredQualified -x` | ❌ Wave 0 |
| (N/A) | Global leaderboard filters players with < 5 demos | Unit | `phpunit tests/Application/Handler/GetGlobalLeaderboardHandlerTest.php::testFiltersUnqualifiedPlayers -x` | ❌ Wave 0 |
| (N/A) | Map leaderboard returns qualified players for specific map only | Unit | `phpunit tests/Application/Handler/GetMapLeaderboardHandlerTest.php::testFiltersToMapOnly -x` | ❌ Wave 0 |
| (N/A) | Time-window leaderboard returns demos within 30-day window | Unit | `phpunit tests/Application/Handler/GetTimeWindowLeaderboardHandlerTest.php::testFilters30Days -x` | ❌ Wave 0 |
| (N/A) | Player comparison returns 4 metric cards with data | Unit | `phpunit tests/Application/Handler/GetPlayerComparisonHandlerTest.php::testReturnsFourMetrics -x` | ❌ Wave 0 |
| (N/A) | Pagination returns correct count and hasMore flag | Integration | `phpunit tests/Presentation/Controller/LeaderboardControllerTest.php::testPaginationLimitOffset -x` | ❌ Wave 0 |
| (N/A) | GET /api/leaderboards/global returns 200 with JSON schema | Integration | `phpunit tests/Presentation/Controller/LeaderboardControllerTest.php::testGetGlobalLeaderboardReturnsOk -x` | ❌ Wave 0 |
| (N/A) | Leaderboard table renders without errors | E2E | `playwright test frontend/e2e/leaderboard.spec.ts -x` | ❌ Wave 0 |
| (N/A) | Player comparison cards display side-by-side | E2E | `playwright test frontend/e2e/player-comparison.spec.ts -x` | ❌ Wave 0 |
| (N/A) | Pagination links navigate correctly | E2E | `playwright test frontend/e2e/leaderboard-pagination.spec.ts -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** PHPUnit handler test + Jest component test (< 5 sec)
- **Per wave merge:** Full `phpunit` + `npm run test` + `playwright test` (< 2 min)
- **Phase gate:** All tests passing + Playwright E2E verified before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `symfony/tests/Application/Handler/GetGlobalLeaderboardHandlerTest.php` — Unit tests for ranking logic, pagination, qualification filter
- [ ] `symfony/tests/Application/Handler/GetMapLeaderboardHandlerTest.php` — Per-map filtering
- [ ] `symfony/tests/Application/Handler/GetPlayerComparisonHandlerTest.php` — 4-metric aggregation, shared demo detection
- [ ] `symfony/tests/Presentation/Controller/LeaderboardControllerTest.php` — HTTP endpoint validation, response schema, error cases
- [ ] `frontend/components/Leaderboard/__tests__/LeaderboardTable.test.tsx` — Table rendering, pagination links, player name links
- [ ] `frontend/components/Comparison/__tests__/PlayerComparisonCard.test.tsx` — 4 cards render, data population
- [ ] `frontend/e2e/leaderboard.spec.ts` — End-to-end page load, interaction, caching verification
- [ ] `frontend/e2e/player-comparison.spec.ts` — Comparison page load, component rendering
- [ ] Repository finders: `TraceRatingRepository::findQualifiedAndSorted()`, `findByMapQualified()`, `findTopMapsByPlayer()`, `AnalysisResultRepository::findSharedByPlayers()`
- [ ] LeaderboardUpdateService and event listener integration (async event handling after AnalysisResult creation)

**Note:** Framework install not needed — PHPUnit and Jest are already configured from Phase 2 and Phase 6.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Use existing Symfony authentication (Phase 2); leaderboards are public read, authenticated DELETE/ADMIN write only |
| V3 Session Management | no | Leaderboards are read-only; no session state changes |
| V4 Access Control | yes | Leaderboard comparison accessible to any user; deletion/admin requires auth |
| V5 Input Validation | yes | Validate limit (1-100), offset (>= 0), mapId (UUID or string), timeWindow (enum: 30, 90), sortBy (enum) |
| V6 Cryptography | no | Leaderboards are public data; no sensitive information |
| V14 API Endpoints | yes | Use HTTP Cache-Control headers for leaderboard responses; set `public, max-age=300` to enable caching at CDN level |

### Known Threat Patterns for {Leaderboard/TRACE Stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Enumerate player IDs via leaderboard offset | Information Disclosure | Leaderboards are intentionally public for competitive discovery; no mitigation needed (same as Steam leaderboards) |
| DOS: Request leaderboards with huge limit parameter (limit=1000000) | Denial of Service | Validate limit in controller: `if ($limit > 100) { throw BadRequest }` |
| DOS: Rapidly request all pagination offsets | Denial of Service | Use HTTP Cache-Control + rate limiting on controller (existing Phase 6 pattern) |
| Rank manipulation: Player requests to be ranked higher | Tampering | Rank is computed from TraceRating (immutable after creation); no API endpoint to modify rank |
| Fake comparison: Forge side-by-side comparison data | Tampering | Comparison data is read-only from database; POST/PUT endpoints require authentication |
| SQL Injection in mapId or playerId parameters | Injection | Use Doctrine DQL with parameter binding (not string concatenation); verified via Phase 2 existing code |

**No new security controls required:** Leaderboards inherit security from existing TRACE system (Phase 9-11) and Symfony defaults.

## Sources

### Primary (HIGH confidence)

- TraceRating entity (existing Phase 9) — [VERIFIED: symfony/src/Domain/Trace/TraceRating.php]
- PercentileCalculator service (existing Phase 11) — [VERIFIED: symfony/src/Application/Service/PercentileCalculator.php]
- TraceHistoryMapper and Controller (existing Phase 11) — [VERIFIED: symfony/src/Application/Trace/TraceHistoryMapper.php, TraceHistoryController.php]
- CQRS Query pattern (Phase 2-11) — [VERIFIED: symfony/src/Application/Query/GetPlayerTraceHistoryQuery.php]
- React Query usage (Phase 10-11) — [VERIFIED: frontend/package.json, Phase 10/11 context]
- Demo entity structure (Phase 2) — [VERIFIED: symfony/src/Domain/Demo/Demo.php]

### Secondary (MEDIUM confidence)

- Phase 12 CONTEXT.md decisions (D-01 through D-14) — [CITED: .planning/phases/12-trace-leaderboards/12-CONTEXT.md]
- Phase 11 visualizations (percentiles, charts) — [CITED: .planning/phases/11-trace-visualizations/11-CONTEXT.md]
- Phase 10 API endpoint patterns — [CITED: .planning/phases/10-trace-api-frontend/10-CONTEXT.md]
- Phase 9 TRACE system foundation — [CITED: .planning/phases/09-trace-rating/09-CONTEXT.md]

### Tertiary (LOW confidence — assumed, pending validation)

- Demo.map field populated during Phase 3 analysis — [ASSUMED] Check Phase 3 parser code to confirm
- Team entity not yet created — [ASSUMED] No Team.php found in Domain; confirm with Phase 8 research
- Sharecodee imports include team context — [ASSUMED] Per Phase 8 context D-02; verify team data availability
- React Query staleTime=5min acceptable for leaderboards — [ASSUMED] Tradeoff between freshness and performance; user feedback may require adjustment

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All dependencies verified in existing project code
- Architecture: HIGH — Built entirely on proven Phase 9-11 infrastructure (TraceRating, percentiles, CQRS)
- Pitfalls: MEDIUM — Patterns inferred from database scaling knowledge; specific CS2 pitfalls TBD during planning
- Test infrastructure: HIGH — PHPUnit, Jest, Playwright all existing from Phase 2-6

**Research date:** 2026-05-17
**Valid until:** 2026-05-31 (stable tech stack, dependencies locked; refresh if Phase 8 team data changes)

