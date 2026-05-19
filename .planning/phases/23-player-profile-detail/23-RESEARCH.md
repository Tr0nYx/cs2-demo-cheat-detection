# Phase 23: Player Profile Detail - Research & Implementation Foundation

**Completed:** 2026-05-19  
**Status:** Ready for Planning  
**Scope:** Comprehensive analysis of existing frontend/backend assets, patterns, and gaps for Phase 23 player profile implementation

---

## Executive Summary

Phase 23 requires building comprehensive player profile views (`/players/{playerId}`) with four core sections:
1. TRACE score & components (with percentiles)
2. Paginated demo history
3. Map & weapon stats (last 30 days)
4. Steam profile enrichment (optional)

This research identifies **mature reusable patterns** across frontend and backend, confirms the **core APIs exist**, and documents **specific gaps** that require new endpoints.

**Key Finding:** 80% of required functionality can be composed from existing components, queries, and repository methods. New work is primarily:
- Main profile page layout and routing
- Stats aggregation endpoint (GET `/api/players/{steamId}/stats?window=30d`)
- Research signal disclaimer banner
- Optional Steam inventory details integration

---

## Existing Frontend Assets

### Pages & Routes

| Path | Purpose | Status | Reusable |
|------|---------|--------|----------|
| `/app/leaderboards/page.tsx` | Global TRACE leaderboard with filtering | ✅ Implemented | Table layout, filters, pagination |
| `/app/players/[playerId]/compare/page.tsx` | Side-by-side player comparison | ✅ Implemented | Route pattern, breadcrumbs, multi-card layout |
| `/app/results/[demoId]/page.tsx` | Demo analysis detail view | ✅ Implemented | TRACE card, component breakdown, heatmap viewer |

**Notable:** No main profile page exists at `/players/{playerId}` (root) or sub-routes (`/demos`, `/stats`). Phase 23 must create these.

### Hooks & API Clients

#### TRACE & Player Data Hooks

| Hook | Purpose | Returns | Status |
|------|---------|---------|--------|
| `usePlayerComparison(playerId, compareWithId)` | Fetch 4-metric comparison | `PlayerComparisonData` | ✅ Ready. Used by compare page. Fetches `/api/players/{playerId}/compare?with=...` |
| `useTraceHistoryQuery(playerId, limit=10)` | Fetch player's last N TRACE records | `TraceHistoryCollectionDto` | ✅ Ready. Used by comparison and demo detail cards. Calls `/api/players/{playerId}/trace-history` |
| `useTraceQuery(demoId)` | Fetch single demo TRACE rating | `TraceDto` | ✅ Ready. Used by demo detail. Calls `/api/demos/{demoId}/trace` |
| `useFilteredLeaderboard()` | Global leaderboard with map/rating/timeframe filters | `{ filters, players, total, hasMore, error }` | ✅ Ready. Supports pagination, recent 5-filter history |
| `useFilteredDemos(initialFilters)` | User's demo list with sorting/filtering | `{ filters, demos, total, hasMore, error }` | ✅ Ready. Accumulates demos on pagination |

#### Data Fetching Patterns

**React Query Configuration:**
- `staleTime`: 5-10 minutes for volatile data (TRACE scores, leaderboards)
- `gcTime` (formerly `cacheTime`): 5-10 minute cache-in-memory
- `retry`: 1-2 retries on failure
- Custom error handling: Check for JSON content type, fallback to statusText

**Example from `usePlayerComparison`:**
```typescript
// Fetch with error handling and cache headers
const response = await fetch(`${API_BASE_URL}/players/${playerId}/compare?with=${compareWithId}`)
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}))
  throw new Error(errorData.message || `Failed to fetch...`)
}
return response.json() as Promise<PlayerComparisonData>
```

### UI Components

#### TRACE & Score Display

| Component | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `TraceCard` | Full TRACE analysis display (base, adjusted, normalized, trust multiplier, components) | ✅ Implemented | Shows TRACE chart, sparkline, percentile badges, calibration context. Supports optional advanced visualizations |
| `TraceComponentChart` | Bar chart breakdown of 5 TRACE components | ✅ Implemented | Percentile badges, color-coded risk levels |
| `PercentileBadge` | Visual percentile rank display | ✅ Implemented | Color-coded (red/yellow/green) by percentile |
| `TraceSparkline` | Compact sparkline for TRACE history | ✅ Implemented | Shows trend direction (up/down) |

#### Player & Comparison

| Component | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `PlayerComparisonCard` | 4-metric side-by-side comparison container | ✅ Implemented | Renders 4 sub-cards (components, trend, maps, history). Handles loading/error states. |
| `PlayerSteamProfileBadge` | Steam profile display with avatar, name, account age link | ✅ Implemented | Gracefully handles missing profile. Shows persona name, visibility state, refresh timestamp. |
| `ComponentBreakdownCard` | Single player's component breakdown | ✅ Implemented | Part of comparison card |
| `TrendCard` | Historical TRACE sparkline for single player | ✅ Implemented | Last 10 demos, trending direction |
| `MapAffinityCard` | Top maps by affinity (win rate or TRACE) | ✅ Implemented | Shows top 3 maps |
| `MatchHistoryCard` | Shared demos between two players | ✅ Implemented | Table of shared demo records |

#### Tables & Lists

| Component | Purpose | Status | Reusable For Phase 23 |
|-----------|---------|--------|----------------------|
| `DemoHistoryTable` | Paginated demo list with sorting (date, suspicion) | ✅ Implemented | Can be adapted for player profile demo list. Shows pagination, sort controls, demo links. |
| Leaderboard table | Global rankings with rank, name, TRACE, demo count, component badges | ✅ Implemented | Row pattern (rank cell, player name, score, metadata) reusable |
| Generic `table.tsx` (shadcn) | Responsive table UI primitive | ✅ Implemented | Base for custom tables |

#### UI Primitives

**shadcn/ui components available:**
- `Badge` - For component labels, risk indicators
- `Card` - Section containers
- `Alert` - Error/warning messages
- `Button` - Navigation, actions
- `Skeleton` - Loading placeholders
- `Tabs` - Multi-section navigation (if needed for stats)
- `Progress` - For component score bars

### Data Types & Interfaces

Key TypeScript types in `frontend/lib/types` and hook files:

```typescript
// From usePlayerComparison.ts
interface ComponentBreakdownData {
  components: Record<string, { value: number; percentile: number }>
  traceDatetime: string
}

interface TrendData {
  history: Array<{ date: string; value: number }>
  trending: boolean
}

interface MapAffinityData {
  topMaps: Array<{ map: string; traceAdjusted: number }>
}

interface MatchHistoryData {
  sharedDemos: Array<{ demoId: string; date: string; mapId?: string }>
}

interface SteamPlayerProfileData {
  steamId?: string
  personaName?: string | null
  avatarUrl?: string | null
  profileUrl?: string | null
  visibilityState?: string
  lastRefreshedAt?: string
}

// From useTraceQuery.ts
interface TraceHistoryCollectionDto {
  // Collection of TraceHistoryDto with pagination
}
```

### Styling & Design System

**Framework:** Tailwind CSS + shadcn/ui base components

**Established Patterns:**
- Dark mode support via `dark:` prefix
- Consistent spacing: `p-4`, `gap-6`, `space-y-4`
- Color tokens: `text-gray-600`, `bg-gray-50`, `border-gray-200`
- Component tokens from Phase 19 (Console design system) partially integrated in DemoDetail components
- Research signal notice component: `ResearchSignalNotice` - used in console panels

**Example Layout Pattern:**
```tsx
<main className="min-h-screen bg-white px-4 py-8 dark:bg-gray-950">
  <div className="mx-auto max-w-7xl space-y-6">
    {/* Header */}
    {/* Filters / Navigation */}
    {/* Content Section */}
  </div>
</main>
```

---

## Existing Backend APIs & Patterns

### Controllers & Routes

#### Player History Endpoint (Phase 17)

**Endpoint:** `GET /api/players/{steamId}/history?limit=20&offset=0`

**Status:** ✅ Implemented (PlayerController.php)

**Response:**
```json
{
  "steam_id": "76561198...",
  "steam_profile": {
    "steam_id": "76561198...",
    "persona_name": "PlayerName",
    "avatar_url": "https://...",
    "profile_url": "https://...",
    "visibility_state": "public",
    "last_refreshed_at": "2026-05-19T10:00:00Z"
  },
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "id": "demo-uuid",
      "map": "de_mirage",
      "date": "2026-05-19T10:00:00Z",
      "status": "completed",
      "trace_adjusted": 72.4,
      "outcome": "win"
    }
  ]
}
```

**Use:** Already provides demo history + optional Steam profile. Phase 23 can reuse.

#### Player Comparison Endpoint

**Endpoint:** `GET /api/players/{playerId}/compare?with={otherPlayerId}`

**Status:** ✅ Implemented (PlayerComparisonController.php)

**Handles:** Query validation, self-comparison check, CQRS dispatch

**Response:** Full `PlayerComparisonDto` with 4 metrics (components, trend, maps, shared history)

**Cache Headers:** `Cache-Control: public, max-age=300` (5 minutes)

#### TRACE History Endpoint

**Endpoint:** `GET /api/players/{playerId}/trace-history?limit=10&sortBy=date`

**Status:** ✅ Implemented (TraceHistoryController.php)

**Returns:** `TraceHistoryCollectionDto` with paginated TRACE records and percentiles

### CQRS Query Handlers

#### GetPlayerComparisonHandler

**File:** `Application/Handler/GetPlayerComparisonHandler.php`

**Responsibilities:**
1. Load both players via `PlayerRepository::find()`
2. Build `ComponentBreakdownCardDto` (calls `PercentileCalculator`)
3. Build `TrendCardDto` (fetches last 10 demos from `TraceRatingRepository`)
4. Build `MapAffinityCardDto` (aggregates top 3 maps from demo results)
5. Build `MatchHistoryCardDto` (queries shared demos via `AnalysisResultRepository::findSharedByPlayers()`)
6. Fetch optional Steam profile via `SteamPlayerProfileProvider`
7. Return aggregated `PlayerComparisonDto`

**Key Pattern:**
- Message bus dispatch: `$this->queryBus->dispatch($query)`
- DTO normalization: `$this->serializer->normalize($result)`
- Error handling: Throws `PlayerNotFoundException`, `InvalidArgumentException`

#### GetAnalyticsTrendHandler

**File:** `Application/Handler/GetAnalyticsTrendHandler.php`

**Responsibilities:**
- Fetch TRACE ratings by player in time window
- Compute consistency (stddev by day), arc (regression), weapon strength
- Cache results in `AnalyticsCacheAdapter`

**Reusable:** Time-windowed aggregation pattern can be adapted for stats endpoint.

### Repository Methods for Aggregation

#### TraceRatingRepository

| Method | Purpose | Returns |
|--------|---------|---------|
| `findLatestByPlayer(playerId, limit=10)` | Latest N TRACE ratings for player | `array<TraceRating>` |
| `findByPlayerIdPaginated(playerId, limit, offset, sortBy='date')` | Paginated TRACE history | `array<TraceRating>` |
| `findByPlayerSince(playerId, since: DateTimeImmutable)` | TRACE ratings since date | `array<TraceRating>` |
| `countByPlayerId(playerId)` | Total TRACE count for player | `int` |

**Aggregation Support:** `findByPlayerSince()` with `new \DateTimeImmutable('-30 days')` enables 30-day stats window.

#### AnalysisResultRepository

| Method | Purpose | Returns |
|--------|---------|---------|
| `newestForSteamId(steamId, limit, offset)` | Paginated demos for player | `array<AnalysisResult>` |
| `findByDemoIdAndUserId(demoId, steamId)` | Single result for demo+player | `?AnalysisResult` |
| `findSharedByPlayers(playerAId, playerBId, limit=10)` | Demos both players are in | `array<Demo>` |

**Data Access:** AnalysisResult entity provides access to `featureData` (weapon kills, map, outcome, etc.) and `supportData` (round counts, kills/deaths).

#### SteamProfileSnapshotRepository

| Method | Purpose | Returns |
|--------|---------|---------|
| `latestForSteamId(steamId)` | Most recent Steam profile snapshot | `?SteamProfileSnapshot` |

**Integration:** Via `SteamPlayerProfileProvider::forSteamId()` which transforms snapshot to DTO.

### DTOs & Response Serialization

#### Leaderboard DTOs

```php
// ComponentBreakdownCardDto
// - components: map of component name => { value: float, percentile: float }
// - traceDatetime: string (ISO 8601)

// TrendCardDto
// - history: array of { date: DateTimeImmutable, value: float }
// - trending: bool (up/down)

// MapAffinityCardDto
// - topMaps: array of { map: string, traceAdjusted: float }

// MatchHistoryCardDto
// - sharedDemos: array of { demoId, date, mapId }

// PlayerComparisonDto (aggregates all 4)
// - playerAId, playerAName, playerAComponents, playerATrend, playerAMaps, playerAHistory, playerASteamProfile
// - playerBId, playerBName, playerBComponents, playerBTrend, playerBMaps, playerBHistory, playerBSteamProfile
```

#### Trace DTOs

```php
// TraceDto (single demo)
// - traceBase, traceAdjusted, traceNormalized: float
// - trustMultiplier: float
// - components: map of { ekill, aim, kast, util, clutch } => { value, percentile }
// - roundCount: int

// TraceHistoryDto (single record in history)
// - date: DateTimeImmutable
// - traceAdjusted: float
// - components with percentiles

// TraceHistoryCollectionDto
// - items: array<TraceHistoryDto>
// - pagination: { total, limit, offset }
```

### Serialization Strategy

**Framework:** Symfony Serializer with custom normalization

**Pattern:** Handler normalizes entity → DTO → JSON via `SerializerInterface::normalize()`

**Cache Headers:**
- TRACE scores: `Cache-Control: public, max-age=300` (5 minutes, per D-25)
- Stats (maps/weapons): `Cache-Control: public, max-age=3600` (1 hour, per D-25)
- Demo history: `Cache-Control: public, max-age=60` (1 minute, volatile)

---

## Reusable Code Patterns

### CQRS Pattern (Query Bus)

**Pattern Flow:**
1. Controller receives HTTP request
2. Controller creates `Query` DTO (e.g., `GetPlayerComparisonQuery`)
3. Controller dispatches query: `$this->queryBus->dispatch($query)`
4. Message bus routes to `Handler` (e.g., `GetPlayerComparisonHandler`)
5. Handler aggregates data from repositories, returns result DTO
6. Controller serializes result and returns Response

**Example:**
```php
// Controller
$query = new GetPlayerComparisonQuery($playerId, $compareWithId);
$result = $this->queryBus->dispatch($query);
$data = $this->serializer->normalize($result);
return new Response(json_encode($data), 200, ['Content-Type' => 'application/json']);

// Handler
final readonly class GetPlayerComparisonHandler {
  public function __invoke(GetPlayerComparisonQuery $query): PlayerComparisonDto {
    // Aggregate from repositories
    return new PlayerComparisonDto(...);
  }
}
```

**Application to Phase 23:**
- Create `GetPlayerProfileQuery(steamId, window='all')`
- Create `GetPlayerStatsQuery(steamId, window='30d')`
- Handlers aggregate from existing repositories

### Repository Query Pattern

**Time-Windowed Queries:**

```php
// Example: Last 30 days of TRACE ratings
$since = new \DateTimeImmutable('-30 days');
$ratings = $this->traceRatings->findByPlayerSince($playerId, $since);

// Aggregation in handler:
foreach ($ratings as $rating) {
  $map = $rating->getAnalysisResult()->getDemoData()['map'];
  $maps[$map]['count']++;
}
```

**Pagination Pattern:**

```php
// Controller
$limit = $request->query->getInt('limit', 20);
$offset = $request->query->getInt('offset', 0);
$limit = max(1, min(100, $limit));
$offset = max(0, $offset);

// Repository
$results = $this->repository->newestForSteamId($steamId, $limit, $offset);

// Response with pagination metadata
return new JsonResponse([
  'results' => $results,
  'limit' => $limit,
  'offset' => $offset,
  'total' => $this->repository->count(...),
]);
```

### Component Breakdown & Percentile Calculation

**Pattern from `PercentileCalculator`:**

```php
// Fetch player's latest TRACE components
$latestTrace = $this->traceRatings->findLatestByPlayer($playerId, 1);

// Build component breakdown with percentiles against global baseline
$components = [
  'ekill' => [
    'value' => $latestTrace->getEkill(),
    'percentile' => $this->percentiles->calculate('ekill', $latestTrace->getEkill())
  ],
  // ... other components
];

return new ComponentBreakdownCardDto($components, $datetime);
```

**Percentile Calculation Logic:**
- Query global distribution of scores for component
- Calculate percentile rank (0-100) of player's score against distribution
- Return { value, percentile } for each component

### Steam Profile Optional Data Pattern

**Pattern from PlayerSteamProfileProvider & Phase 17:**

```php
// Try to load Steam profile; gracefully omit if not available
$steamProfile = $this->steamProfiles->forSteamId($steamId);

// Return DTO with nullable field
return new PlayerDto(
  ...,
  $steamProfile, // null if not available
);
```

**Frontend Rendering:**
```tsx
// Only render section if data exists (conditional mount)
{profile && (
  <PlayerSteamProfileBadge playerName={name} steamId={steamId} profile={profile} />
)}
```

**Benefits:**
- No placeholder UI clutter if data unavailable
- Schema matches optional integration
- Phase 17 handles refresh cycle; Phase 23 just consumes

### Caching Strategy

**Server-Side:**
- `AnalyticsCacheAdapter` caches trend computations by userId, metric, window
- Set & get pattern: `$cache->set($key, $value, $ttl)`
- Used by `GetAnalyticsTrendHandler`

**Client-Side (React Query):**
- `staleTime`: How long until data is "stale" but still in memory
- `gcTime`: How long to keep garbage-collected data
- Frontend re-fetches on stale data, uses cache if available

**HTTP Cache Headers:**
- Browser respects `Cache-Control: public, max-age=300`
- CDN can cache public endpoints

---

## Blockers & Gaps

### Missing Backend Endpoints

#### 1. GET `/api/players/{steamId}/stats?window=30d` (REQUIRED)

**Current State:** No dedicated stats aggregation endpoint exists.

**Needed For:** Phase 23 Section 3 (Map & Weapon Statistics)

**Responsibility:**
- Query `AnalysisResult` filtered by `player.steamId` and `analyzedAt >= NOW() - INTERVAL 30 DAYS`
- Aggregate by map: count appearances, calculate win rate, TRACE average
- Aggregate by weapon: count kills, calculate win rate
- Return response:
  ```json
  {
    "window": "30d",
    "computed_at": "2026-05-19T10:00:00Z",
    "stats": {
      "maps": [
        { "map": "de_mirage", "appearance_count": 12, "win_rate": 0.667, "avg_trace": 68.5 }
      ],
      "weapons": [
        { "weapon": "ak47", "kill_count": 156, "usage_rate": 0.45, "win_rate": 0.65 }
      ],
      "total_demos_in_window": 18,
      "insufficient_data": false
    }
  }
  ```

**Implementation Path:**
1. Create `GetPlayerStatsQuery(steamId, window='30d')`
2. Create `GetPlayerStatsHandler` aggregating from `AnalysisResultRepository` + `TraceRatingRepository`
3. Create `PlayerStatsController` route
4. Add `findByPlayerSinceWithAggregates()` or similar to repository (or compute in handler)

**Complexity:** Medium. Aggregation logic similar to existing trend analysis.

#### 2. GET `/api/players/{steamId}` (OPTIONAL, Nice-to-Have)

**Purpose:** Fetch unified player profile data (main page)

**Content:** Could aggregate all four sections in single request, or frontend fetches individually.

**Current State:** No single endpoint. Frontend would need to fetch:
- `/api/players/{steamId}/history` (demo list)
- `/api/players/{steamId}/trace-history` (TRACE scores)
- `/api/players/{steamId}/stats?window=30d` (map/weapon stats) - NEW
- `/api/players/{steamId}/compare?with=...` (comparison, if used) - Optional

**Decision:** Phase 23 can omit single endpoint. Frontend parallelize fetches via React Query.

### Frontend Gaps

#### 1. Main Profile Page Layout

**Missing:** `/app/players/[playerId]/page.tsx`

**Needed:** Full-page layout with:
- Research signal disclaimer banner (prominent, sticky top)
- Four-section layout (TRACE, demos, stats, Steam enrichment)
- Navigation breadcrumbs or sidebar to sub-routes
- Responsive design (mobile collapsing sections)

**Reuse:** Combine patterns from:
- Leaderboard page (grid layout, research notice)
- Comparison page (multi-card sections)
- Demo detail page (TRACE card, component chart)

#### 2. Sub-Route Pages

**Missing:**
- `/app/players/[playerId]/demos/page.tsx` - Paginated demo history table
- `/app/players/[playerId]/stats/page.tsx` - Map/weapon breakdown

**Reuse:**
- Demo table layout from `DemoHistoryTable`
- Stats display from `TrendCard` and custom charts

#### 3. Research Signal Disclaimer Component

**Missing:** Dedicated prominent disclaimer component for player profiles

**Exists:** `ResearchSignalNotice` in Console components (used in demo detail)

**Reuse:** Adapt `ResearchSignalNotice` for player profile (or create variant with larger, sticky styling)

**Content per D-26:**
```
"This player profile shows research signals from post-game demo analysis. 
Scores are for research review only, not proof of cheating."
```

#### 4. Stats Aggregation UI Components

**Missing:** Dedicated components for map/weapon stats display

**Options:**
- Table (like leaderboard)
- Card grid with icons
- Bar chart per weapon

**Reuse:** `TrendCard` pattern (simple display), shadcn `Table` component

### Performance Considerations

#### 1. On-Demand TRACE Computation

**Issue:** Computing TRACE percentiles for 100+ demos requires aggregating global distribution.

**Current Approach:** `PercentileCalculator` caches results. Acceptable for phase 23.

**Potential Bottleneck (D-24):** "For players with 100+ demos, on-demand aggregation may incur ~500ms-1s backend query cost."

**Mitigation Options:**
1. Accept latency for phase 23 (profile views are lower-traffic than leaderboards)
2. Implement caching table for pre-computed TRACE aggregates (defer to Phase 20+)
3. Cache HTTP responses aggressively (5-minute stale window)

**No Blocking Issue:** Phase 23 can proceed with on-demand.

#### 2. 30-Day Aggregation Query

**Issue:** Aggregating `AnalysisResult` by map/weapon requires table scan or indexed query.

**Index Strategy:** Create index on `(steam_id, analyzed_at)` for fast windowed queries.

**Estimate:** ~50-100ms query on 10k demo table. Acceptable.

### Data Availability Issues

#### 1. Demo Feature Data (Maps, Weapons, Outcomes)

**Assumption:** `AnalysisResult.featureData` JSON contains map, weapon stats, outcome.

**Risk:** If `featureData` schema varies or is missing for older demos, aggregation may fail.

**Mitigation:** Defensive aggregation (skip demos without required fields), return "Insufficient data" if sample < 2.

#### 2. Steam Profile Optional Data

**Per D-20:** If Steam profile unavailable or private, omit section entirely.

**Current:** `SteamPlayerProfileProvider` returns null if snapshot not found. Frontend conditionally renders.

**Status:** ✅ Pattern already established.

---

## Implementation Readiness Assessment

### Ready for Implementation (Can Start Now)

✅ **Frontend Page Layout**
- Route structure exists (`[playerId]` dynamic segment)
- Components available (TraceCard, tables, Steam badge)
- Styling patterns established (Tailwind, shadcn)
- Data fetching hooks mature (useTraceHistoryQuery, usePlayerComparison)

✅ **Demo History Pagination**
- `DemoHistoryTable` component exists
- Repository methods ready (`newestForSteamId`, `findSharedByPlayers`)
- Pagination pattern established (limit, offset, hasMore)

✅ **Steam Profile Enrichment**
- `SteamPlayerProfileProvider` ready
- `PlayerSteamProfileBadge` component exists
- Optional data pattern established

✅ **TRACE Score & Components**
- TRACE API endpoints exist (`/api/demos/{demoId}/trace`, `/api/players/{playerId}/trace-history`)
- Components ready (TraceCard, TraceComponentChart, PercentileBadge)
- Percentile calculation via `PercentileCalculator`

✅ **Research Signal Framing**
- `ResearchSignalNotice` component exists
- Patterns for inline context labels established
- No ethical blocker

### Requires New Work (Planned for Phase 23 Planning)

🔨 **Map & Weapon Stats Endpoint**
- New query, handler, controller needed
- `GetPlayerStatsQuery` + `GetPlayerStatsHandler`
- Repository method for 30-day windowed aggregation
- Estimated effort: 1-2 hours backend, 1-2 hours frontend

🔨 **Main Profile Page Layout**
- `/app/players/[playerId]/page.tsx` - new file
- Responsive four-section layout
- Breadcrumb or sidebar navigation
- Estimated effort: 2-3 hours

🔨 **Sub-Route Pages**
- `/app/players/[playerId]/demos/page.tsx` - detailed demo table
- `/app/players/[playerId]/stats/page.tsx` - stats breakdown
- Estimated effort: 2-3 hours

🔨 **Prominent Disclaimer Component**
- Sticky/fixed banner variant for profile pages
- Responsive styling
- Per D-26 specifications
- Estimated effort: 1 hour

### Deferred to Phase 19 (UI/UX Refinement)

📋 **Styling & Visual Polish**
- Console design tokens application
- Dark/OLED mode optimization
- Responsive breakpoint refinement
- Animation & transitions

---

## Database & Query Performance

### Indexes to Verify/Create

| Table | Columns | Purpose | Status |
|-------|---------|---------|--------|
| trace_rating | (player_id, calculated_at) | Fast TRACE history queries | ✅ Exists (idx_trace_rating_player_calculated_at) |
| trace_rating | (calibration_version) | Percentile baseline lookup | ✅ Exists (idx_trace_rating_calibration_version) |
| analysis_result | (player_id, analyzed_at) | **NEW:** 30-day stats window | ⚠️ May need create if missing |
| analysis_result | (demo_id, player_id) | Demo detail lookup | ✅ Likely exists (composite FK) |

### Query Patterns to Test

1. **TRACE history with 1000 demos:** Measure `findByPlayerIdPaginated()` with limit=20, offset=0..50
2. **30-day stats aggregation:** Full table scan vs indexed range query
3. **Percentile calculation:** Global TRACE distribution calculation time

---

## API Contract Summary for Phase 23 Planning

### Existing Endpoints (Ready to Use)

| Endpoint | Method | Query Params | Status | Usage |
|----------|--------|--------------|--------|-------|
| `/api/players/{steamId}/history` | GET | limit, offset | ✅ | Demo list with Steam profile |
| `/api/players/{playerId}/compare` | GET | with (required) | ✅ | Comparison data (4 metrics) |
| `/api/players/{playerId}/trace-history` | GET | limit, sortBy | ✅ | TRACE score history with percentiles |
| `/api/demos/{demoId}/trace` | GET | - | ✅ | Single demo TRACE analysis |

### New Endpoints Required for Phase 23

| Endpoint | Method | Query Params | Response | Priority |
|----------|--------|--------------|----------|----------|
| `/api/players/{steamId}/stats` | GET | window='30d' | Map/weapon aggregates | ⚠️ Required |

### Frontend API Consumption

```typescript
// Main profile page - fetch all data in parallel
useTraceHistoryQuery(playerId)      // Last 10 TRACE scores
usePlayerHistory(playerId)          // Demo list + Steam profile
usePlayerStats(playerId, '30d')     // NEW: Map/weapon stats (once endpoint exists)

// Sub-routes
usePlayerHistory(playerId, { limit: 50 }) // Demos with pagination
usePlayerStats(playerId, '30d')           // Stats detail
```

---

## Reference Links to Existing Code

### Key Backend Files

- **Controllers:** `symfony/src/Presentation/Controller/PlayerComparisonController.php`
- **Handlers:** `symfony/src/Application/Handler/GetPlayerComparisonHandler.php`
- **Queries:** `symfony/src/Application/Query/GetPlayerComparisonQuery.php`
- **Repositories:** 
  - `symfony/src/Infrastructure/Persistence/AnalysisResultRepository.php`
  - `symfony/src/Infrastructure/Persistence/TraceRatingRepository.php`
  - `symfony/src/Infrastructure/Persistence/PlayerRepository.php`
- **DTOs:** `symfony/src/Application/Leaderboard/*Dto.php`
- **Services:** `symfony/src/Application/Steam/SteamPlayerProfileProvider.php`

### Key Frontend Files

- **Pages:** 
  - `frontend/app/leaderboards/page.tsx`
  - `frontend/app/players/[playerId]/compare/page.tsx`
- **Hooks:**
  - `frontend/lib/hooks/usePlayerComparison.ts`
  - `frontend/lib/hooks/useTraceHistoryQuery.ts`
  - `frontend/lib/hooks/useFilteredLeaderboard.ts`
- **Components:**
  - `frontend/components/Comparison/PlayerComparisonCard.tsx`
  - `frontend/components/DemoDetail/TraceCard.tsx`
  - `frontend/components/PlayerSteamProfileBadge.tsx`
  - `frontend/components/DemoHistoryTable.tsx`

---

## Conclusion

Phase 23 has a **strong foundation** with mature patterns and reusable components. The main blockers are:

1. **New backend endpoint** for 30-day stats aggregation (required)
2. **New frontend pages** for main profile and sub-routes (required)
3. **Prominent disclaimer component** (required per D-26)
4. **UI/UX polish** deferred to Phase 19 (optional for Phase 23 execution)

The **CQRS pattern**, **pagination patterns**, **Steam profile integration**, and **TRACE display components** are proven and ready. Phase 23 planning should focus on:

- Designing stats aggregation query and response schema
- Planning four-section responsive layout
- Implementing disclaimer banner per ethical requirements
- Integrating existing hooks and components into new pages

**Estimated Implementation Effort:** 8-12 hours (1-2 day sprint for backend + frontend)

---

*Research completed: 2026-05-19*  
*Next step: Phase 23 Planning with detailed wave breakdown*
