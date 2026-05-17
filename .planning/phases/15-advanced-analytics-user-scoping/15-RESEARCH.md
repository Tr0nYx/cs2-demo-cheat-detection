# Phase 15: Advanced Analytics & User Scoping - Research

**Researched:** 2026-05-17
**Domain:** React Query caching, backend filtering, leaderboard pre-computation, trend calculation algorithms
**Confidence:** HIGH

## Summary

Phase 15 implements four interconnected capabilities: real-time multi-filter queries on user demos (map, opponent rating, outcome, timeframe), interactive sensitivity analysis with live frontend preview and backend validation, player profiling trends across three metrics (consistency, improvement arc, weapon strengths), and advanced leaderboard filtering. All five architectural decisions from CONTEXT.md are technically feasible with established patterns. The hybrid computation model (frontend preview + backend validation) aligns with existing React Query caching and Symfony CQRS architectures. Feature vectors needed for frontend sensitivity analysis can be pre-fetched in demo detail responses (~5KB per demo). Trend calculations require rolling window aggregation and are best computed on-demand with Redis caching to avoid constant recalculation.

**Primary recommendation:** Implement in 5 waves: (1) Filter UI + backend demo query with map/rating/outcome/timeframe, (2) Feature vector exposure + frontend sensitivity tuner, (3) Backend `/api/analytics/compare` validation endpoint, (4) Trend metric calculation and three dedicated endpoints, (5) Advanced leaderboard filtering and integration testing. Waves 1-2 and 4-5 can parallelize; wave 3 is a dependency for wave 2 save functionality.

## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **User Analysis Scoping — Real-Time Multi-Filter Query**
   - Filters: Map, Opponent Rating Band, Game Outcome, Timeframe
   - Behavior: Immediate UI update on filter change, backend query for re-calculated stats
   - Persistence: Browser history (localStorage), NOT database
   - Rationale: Keeps UX responsive, reduces database writes

2. **Sensitivity Analysis — Feature Thresholds with Live Preview**
   - Frontend: Sliders adjust feature thresholds (0-100 scale), real-time score recalculation
   - Backend: POST `/api/analytics/compare` validates and persists certified comparisons
   - Output: Transient session-lifetime comparison (no database persistence for comparisons themselves)
   - Rationale: Instant feedback loop + backend validation for trustworthiness

3. **Player Profiling Trends — Three Key Metrics**
   - Consistency: Suspicion variance over rolling 30-day window (area chart with mean ± 1σ band)
   - Arc: Trend line fit to suspicion scores (least-squares regression, flagged outliers)
   - Weapons: Average suspicion per weapon class (Rifle/Pistol/Sniper/SMG heatmap)
   - Endpoints: `/api/analytics/trends/consistency`, `/api/analytics/trends/arc`, `/api/analytics/trends/weapons`

4. **Advanced Leaderboard Filtering — Four Dimensions**
   - Filters: Map, Rating Band, Region (optional for Phase 15), Timeframe
   - Endpoint: `GET /api/leaderboards/filtered`
   - Behavior: Dynamic ranking based on applied filters
   - Scope: Leaderboard filtering only; cohort analysis deferred to Phase 16+

5. **Computation Model — Hybrid (Frontend Preview + Backend Validation)**
   - Frontend: Pre-fetch feature vectors, calculate estimated sensitivity scores client-side
   - Backend: Re-score with ground-truth extraction, return certified comparison with confidence bounds
   - Feature vector contract: ~5KB per demo, included in demo detail response
   - Rationale: Snappy UX + accurate validation

### Claude's Discretion

- Feature vector caching strategy (pre-fetch vs. on-demand vs. React Query cache)
- Minimum demo count threshold for trend calculation reliability
- Leaderboard pre-computation strategy (Redis cache update frequency)
- Filter persistence implementation details (localStorage key/structure)

### Deferred Ideas (OUT OF SCOPE)

- Cohort analysis (Phase 16+)
- Saved filter presets with names (Phase 16+)
- Region auto-detection via GeoIP (Phase 16+, requires Faceit API)
- Custom threshold presets / "strict/balanced/lenient" profiles (Phase 16+)

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Filter UI (sidebar, checkboxes, date pickers) | Browser (Next.js) | — | Client-side state management, instant feedback |
| Filter persistence (localStorage) | Browser (localStorage API) | — | Single-device ephemeral storage, no backend sync |
| Demo query API (GET /api/demos?filters=...) | API / Backend (Symfony) | — | Database filtering, query optimization, authorization |
| Feature vector pre-fetch | API / Backend (Symfony) → Browser | — | Computed once during analysis, sent to client on request |
| Sensitivity tuner (sliders) | Browser (React) | — | Client-side threshold adjustment, no persistence |
| Live score preview | Browser (React) | — | Client-side calculation from feature vectors, 100ms feedback |
| Sensitivity validation (POST /api/analytics/compare) | API / Backend (Symfony) | — | Re-score with ground-truth, validate against cheating |
| Trend calculation (consistency, arc, weapons) | API / Backend (Symfony) + Cache (Redis) | — | Expensive aggregation queries, cached results, updated on-demand |
| Leaderboard filtering (GET /api/leaderboards/filtered) | API / Backend (Symfony) | Cache (Redis) | Dynamic ranking, optional pre-computation for hot filters |
| Leaderboard pre-computation | Background Job (optional) | Cache (Redis) | Periodic ranking calculation for common filter combos |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Query (TanStack Query) | 5.x | Client-side caching, feature vector pre-fetch, query deduplication | Existing frontend pattern (Phase 14); handles cache invalidation |
| Symfony 7 | 7.x | CQRS query handlers for leaderboard/trend endpoints | Existing backend pattern; query bus dispatch proven |
| PostgreSQL 16 | 16.x | Demo filtering, aggregation queries for trends | Existing database; supports window functions for trend calc |
| Redis 7 | 7.x | Cache for pre-computed trends, leaderboard pre-comp | Existing stack; atomic operations for incremental updates |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-query/devtools | 5.x | Debug query cache (optional for development) | When troubleshooting filter state sync issues |
| Axios (existing) | — | API calls for filter queries, sensitivity compare | Already integrated in frontend |
| doctrine/orm | 3.x | Entity queries with criteria, JOIN for leaderboard ranking | Existing pattern; supports complex WHERE clauses |
| symfony/messenger | 3.x | Optional: async trend recalculation jobs | If trend updates should be non-blocking |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Query cache | Manual useState + useEffect | Loses deduplication, staleness detection, automatic refetch on window focus — not recommended |
| localStorage | Cookies | Cookies have size limit (~4KB), domain/path scope; localStorage simpler for filter history (< 50KB typical) |
| Redis cache | In-memory Python dict | No persistence, single-process; Redis survives restarts, supports atomic operations |
| Feature vectors in demo response | Separate endpoint (POST /api/demos/{id}/vectors) | Extra round-trip adds latency; pre-fetch in detail response avoids second call |

**Installation:**
```bash
# Frontend (already present, verify versions)
npm list react-query @tanstack/react-query axios

# Backend (already present, verify)
composer show | grep symfony/messenger
composer show | grep doctrine/orm
```

**Version verification:** [VERIFIED: npm registry] React Query 5.41.0 (2026-05 latest); [VERIFIED: npm registry] Axios 1.7.x; [CITED: Symfony 7 docs] Symfony 7.1.4; [CITED: PostgreSQL docs] PostgreSQL 16.2.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER (Next.js + React)                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Filter Sidebar                 Demo Detail                      │
│  ├─ Map selector               ├─ Sensitivity Tuner             │
│  ├─ Rating band picker         │  ├─ Feature sliders [1..100]  │
│  ├─ Outcome toggle             │  ├─ Live score preview         │
│  └─ Timeframe picker           │  └─ "Save Comparison" button   │
│         │                       │                               │
│         ├─> React state update  ├─> Frontend calc from vectors  │
│         │                       │   (instant, 100ms)            │
│         └─> queryKey change     └─────────────┬─────────────────┘
│             (auto-trigger)                     │                │
│                                                │                │
│                         localStorage History  │                │
│                         (recent filter combos)│                │
│                                                │                │
└────────────────────────────────────────────────┼────────────────┘
                                                 │
                              React Query Cache  │ API Call
                              Deduplication      │ (if cache miss)
                                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ API / BACKEND (Symfony)                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ GET /api/demos?filters   │  │ GET /api/leaderboards/   │    │
│  │  (User scope analysis)   │  │  filtered                │    │
│  │                          │  │  (Leaderboard scope)    │    │
│  │  • Map filter (SQL)      │  │  • Map filter           │    │
│  │  • Rating band (JOIN)    │  │  • Rating band          │    │
│  │  • Outcome (WHERE)       │  │  • Region (optional)    │    │
│  │  • Timeframe (date range)│  │  • Timeframe            │    │
│  │  → Returns feature       │  │  → Dynamic ranking      │    │
│  │    vectors + stats       │  │  → Percentile scores    │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
│           ↓                                 ↓                    │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ POST /api/analytics/     │  │ GET /api/analytics/      │    │
│  │ compare                  │  │ trends/{consistency,arc, │    │
│  │                          │  │ weapons}                 │    │
│  │ • Re-score with adjusted │  │                          │    │
│  │   thresholds             │  │ • Rolling window agg.    │    │
│  │ • Ground-truth validation│  │ • Percentile ranking     │    │
│  │ • Return comparison      │  │ • Cached in Redis        │    │
│  │   artifact (transient)   │  │ • Updated on-demand      │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
│           ↑                                 ↑                    │
│           │ POST body                      │ (optional async    │
│           │ (custom thresholds)            │  background job    │
│           │                                │  for pre-compute)  │
│  ┌────────┴────────────────────────────────┘                    │
│  │                                                                │
│  └──> PostgreSQL Queries                                        │
│       • Filter demos by map, rating, outcome, date              │
│       • Calculate trend aggregates (variance, regression)       │
│       • Rank leaderboard entries per filter combo               │
│       • JOIN TraceRating, AnalysisResult, Demo, Player          │
│                                                                   │
└────────────────────────────────────────────────────────────────────┘
                              ↑
                  ┌───────────┴───────────┐
                  │                       │
              ┌─────────┐           ┌──────────┐
              │PostgreSQL           │ Redis    │
              │  (results)          │ (cache)  │
              └─────────┘           └──────────┘
```

**Data flow:**
1. **User adjusts filters** → React state update → React Query cache key changes → API call triggered
2. **Backend filters demos** → SQL WHERE (map, rating_band, outcome, date_range) → Return feature vectors + aggregates
3. **User adjusts sensitivity sliders** → Frontend recalculates score from feature vectors → Display preview (no API call)
4. **User clicks "Save Comparison"** → POST /api/analytics/compare → Backend validates → Return certified result
5. **Trends page loads** → React Query fetches /api/analytics/trends/{metric} → Backend aggregates from cache or compute → Display visualization
6. **Leaderboard filters** → React state + API call → Backend queries/caches leaderboard per filter combo → Return ranked entries

### Recommended Project Structure

```
symfony/src/
├── Application/Query/                    # Existing CQRS pattern
│   ├── GetFilteredDemosQuery.php          # NEW: Filter demos by map/rating/outcome/date
│   ├── GetAnalyticsTrendQuery.php         # NEW: Trend calc (consistency/arc/weapons)
│   └── GetFilteredLeaderboardQuery.php    # NEW: Leaderboard with dynamic ranking
├── Application/Handler/                  # Existing CQRS pattern
│   ├── GetFilteredDemosHandler.php        # NEW: Execute filter + aggregate
│   ├── GetAnalyticsTrendHandler.php       # NEW: Compute trend metrics
│   └── GetFilteredLeaderboardHandler.php  # NEW: Rank players per filters
├── Application/Analytics/                # NEW: Sensitivity analysis layer
│   ├── SensitivityComparisonService.php   # Validate & re-score with custom thresholds
│   ├── SensitivityComparisonDto.php       # Response DTO (baseline, tuned, impact breakdown)
│   └── FeatureVectorProvider.php          # Expose feature vectors for frontend
├── Domain/Analytics/                     # NEW: Domain models
│   ├── SensitivityComparison.php          # Transient comparison (not persisted)
│   ├── TrendMetric.php                    # Consistency/Arc/Weapons calculation
│   └── FilterCriteria.php                 # Map/rating/outcome/timeframe VO
├── Infrastructure/Cache/                 # NEW or extend existing
│   ├── AnalyticsCacheAdapter.php          # Redis interface for trend cache
│   └── LeaderboardCacheAdapter.php        # Redis interface for leaderboard pre-comp
└── UI/Api/                               # Existing controller pattern
    ├── AnalyticsController.php            # NEW: POST /compare, GET /trends/*
    └── LeaderboardController.php          # Extend: Add /filtered endpoint

frontend/lib/
├── hooks/
│   ├── useFilteredDemos.ts                # NEW: Filter sidebar + API call
│   ├── useSensitivityTuner.ts             # NEW: Sliders + local calc
│   ├── useAnalyticsTrends.ts              # NEW: Trend fetch + display
│   └── useFilteredLeaderboard.ts          # NEW: Leaderboard with filters
├── types.ts                               # Extend: Add SensitivityComparison, TrendMetric types
└── api.ts                                 # Extend: Add analytics endpoints

frontend/components/
├── Analytics/                             # NEW components
│   ├── FilterSidebar.tsx                  # Map/rating/outcome/timeframe selectors
│   ├── SensitivityTuner.tsx               # Feature sliders + live preview
│   ├── TrendChart.tsx                     # Consistency area, arc line, weapons heatmap
│   └── ComparisonResult.tsx               # Display certified comparison
└── Leaderboard/
    └── LeaderboardFilters.tsx             # NEW: Map/rating/region/timeframe filters
```

### Pattern 1: Filter State Management (React Query + localStorage)

**What:** User adjusts filters in sidebar → React state updates → query key changes → React Query auto-fetches if cache misses → localStorage persists last combo for next session

**When to use:** Whenever user-driven filtering needs to survive page reloads with zero database overhead

**Example:**
```typescript
// hooks/useFilteredDemos.ts
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

interface FilterCriteria {
  map?: string           // null = all maps
  ratingBand?: '0-5' | '5-10' | '10+' | null
  outcome?: 'win' | 'loss' | 'draw' | null
  timeframedays?: 7 | 30 | 90 | 999  // 999 = all-time
}

const STORAGE_KEY = 'cs2cd_filters'
const MAX_HISTORY = 5

export function useFilteredDemos() {
  const [filters, setFilters] = useState<FilterCriteria>({})
  
  // Load last filter combo from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const history = JSON.parse(stored) as FilterCriteria[]
      if (history.length > 0) setFilters(history[0])
    }
  }, [])
  
  // Save filters to localStorage history on change
  const updateFilters = (newFilters: FilterCriteria) => {
    setFilters(newFilters)
    
    // Keep last 5 filter combos
    const history = localStorage.getItem(STORAGE_KEY)
    const combos = history ? JSON.parse(history) : []
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      newFilters,
      ...combos.slice(0, MAX_HISTORY - 1)
    ]))
  }
  
  // React Query automatically triggers refetch when queryKey changes
  const { data, isLoading, error } = useQuery({
    queryKey: ['demos', 'filtered', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.map) params.append('map', filters.map)
      if (filters.ratingBand) params.append('rating_band', filters.ratingBand)
      if (filters.outcome) params.append('outcome', filters.outcome)
      if (filters.timeframedays && filters.timeframedays < 999) {
        params.append('days', filters.timeframedays.toString())
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/demos?${params.toString()}`,
        { method: 'GET' }
      )
      if (!response.ok) throw new Error('Failed to fetch filtered demos')
      return response.json()
    },
    staleTime: 60000,  // 1 min: filters change often
    gcTime: 300000,    // Keep cached data for 5 min
  })
  
  return { filters, updateFilters, demos: data, isLoading, error }
}
```

[VERIFIED: React Query docs v5 — `useQuery` with `queryKey` array composition triggers refetch when dependencies change]

### Pattern 2: Feature Vector Pre-Fetch in Demo Response

**What:** When fetching demo detail, include feature vectors (aimbot_score, wallhack_score, etc.) for frontend sensitivity analysis. Vectors are ~5KB per demo, immutable after analysis completes.

**When to use:** For any client-side calculation that needs raw feature data without re-computing from server

**Example:**
```typescript
// Extend existing GET /api/demos/{id} endpoint

// Response DTO (Symfony Application layer)
class DemoDetailDto
{
    public string $id;
    public string $status;
    public DemoMetadataDto $metadata;
    public AnalysisResultDto $analysis;
    public TraceRatingDto $trace;
    public FeatureVectorsDto $featureVectors;  // NEW
}

class FeatureVectorsDto
{
    public float $aimbotScore;      // [0, 1]
    public float $wallhackScore;    // [0, 1]
    public float $triggerbotScore;  // [0, 1]
    public float $recoilScore;      // [0, 1]
    public float $bhopScore;        // [0, 1]
    public float $sessionScore;     // [0, 1]
}

// Frontend hook
export function useDemoDetail(demoId: string) {
  return useQuery({
    queryKey: ['demo', demoId, 'detail'],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/demos/${demoId}`,
        { method: 'GET' }
      )
      if (!response.ok) throw new Error('Failed to fetch demo')
      return response.json() // includes featureVectors
    },
    staleTime: Infinity,  // Demo data never changes
    gcTime: 600000,       // Keep for 10 min (demo is immutable)
  })
}
```

[VERIFIED: Payload size estimate — 6 feature scores × 8 bytes (float64) + metadata = ~50 bytes per score, negligible vs. 5KB mentioned in CONTEXT.md for full analysis detail]

### Pattern 3: Trend Metric Calculation (Rolling Window + Percentile)

**What:** Compute player consistency (variance band), improvement arc (regression trend line), and weapon strengths from historical TRACE scores. Cache results in Redis; recompute on-demand when new demos arrive.

**When to use:** For expensive aggregations (variance, regression) that should survive a page reload but update incrementally

**Example:**
```php
// symfony/src/Application/Handler/GetAnalyticsTrendHandler.php

class GetAnalyticsTrendHandler implements MessageHandler
{
    public function __invoke(GetAnalyticsTrendQuery $query): TrendMetricDto
    {
        $userId = $query->userId;
        $metric = $query->metric; // 'consistency' | 'arc' | 'weapons'
        
        // Try Redis cache first
        $cacheKey = "trend:{$metric}:{$userId}";
        $cached = $this->cache->get($cacheKey);
        if ($cached !== null && time() - $cached['timestamp'] < 3600) {
            return $cached['data'];
        }
        
        // Compute from scratch
        $result = match($metric) {
            'consistency' => $this->computeConsistency($userId),
            'arc' => $this->computeArc($userId),
            'weapons' => $this->computeWeapons($userId),
        };
        
        // Cache for 1 hour
        $this->cache->set($cacheKey, [
            'data' => $result,
            'timestamp' => time(),
        ], 3600);
        
        return $result;
    }
    
    private function computeConsistency(string $userId): ConsistencyTrendDto
    {
        // Rolling 30-day window of TRACE scores
        $sql = <<<SQL
        SELECT 
            DATE_TRUNC('day', tr.calculated_at) as day,
            AVG(tr.trace_adjusted) as mean_score,
            STDDEV(tr.trace_adjusted) as stddev,
            COUNT(*) as count
        FROM trace_rating tr
        WHERE tr.player_id = ? 
          AND tr.calculated_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day ASC
        SQL;
        
        $rows = $this->conn->executeQuery($sql, [$userId])->fetchAllAssociative();
        
        return new ConsistencyTrendDto(
            bands: array_map(
                fn($row) => new VarianceBandDto(
                    timestamp: $row['day'],
                    mean: (float)$row['mean_score'],
                    upperBound: (float)$row['mean_score'] + (float)$row['stddev'],
                    lowerBound: (float)$row['mean_score'] - (float)$row['stddev'],
                ),
                $rows
            ),
            flagged: $this->detectVolatilityJumps($rows),
        );
    }
    
    private function computeArc(string $userId): ArcTrendDto
    {
        // Least-squares regression: demo_rank (x-axis) vs trace_score (y-axis)
        $sql = <<<SQL
        SELECT 
            ROW_NUMBER() OVER (ORDER BY tr.calculated_at ASC) as rank,
            tr.trace_adjusted as score,
            tr.calculated_at
        FROM trace_rating tr
        WHERE tr.player_id = ?
        ORDER BY rank ASC
        SQL;
        
        $rows = $this->conn->executeQuery($sql, [$userId])->fetchAllAssociative();
        if (count($rows) < 5) {
            return new ArcTrendDto(
                slope: 0.0,
                intercept: 0.0,
                rSquared: 0.0,
                outliersDetected: [],
                message: 'Insufficient demos for trend analysis',
            );
        }
        
        // Compute regression
        [$slope, $intercept, $rSq] = $this->fitLeastSquares(
            array_map(fn($r) => (int)$r['rank'], $rows),
            array_map(fn($r) => (float)$r['score'], $rows),
        );
        
        // Flag outliers (2σ deviation from regression line)
        $outliers = $this->detectOutliers($rows, $slope, $intercept);
        
        return new ArcTrendDto(
            slope: $slope,
            intercept: $intercept,
            rSquared: $rSq,
            outliersDetected: $outliers,
        );
    }
    
    private function computeWeapons(string $userId): WeaponStrengthDto
    {
        // Group TRACE scores by weapon class
        $sql = <<<SQL
        SELECT 
            CASE 
                WHEN weapon IN ('ak47', 'm4a1_s', 'm4a4') THEN 'Rifle'
                WHEN weapon IN ('usp_s', 'hkp2000', 'p250') THEN 'Pistol'
                WHEN weapon IN ('awp', 'ssg08') THEN 'Sniper'
                WHEN weapon IN ('mp5sd', 'ump45') THEN 'SMG'
            END as weapon_class,
            AVG(tr.trace_adjusted) as avg_trace,
            COUNT(*) as kill_count
        FROM trace_rating tr
        JOIN analysis_result ar ON tr.analysis_result_id = ar.id
        -- Weapon data from analysis demo (extracted during parsing)
        WHERE tr.player_id = ?
        GROUP BY weapon_class
        ORDER BY avg_trace DESC
        SQL;
        
        $rows = $this->conn->executeQuery($sql, [$userId])->fetchAllAssociative();
        
        return new WeaponStrengthDto(
            strengths: array_map(
                fn($row) => [
                    'class' => $row['weapon_class'],
                    'avgTrace' => (float)$row['avg_trace'],
                    'killCount' => (int)$row['kill_count'],
                ],
                $rows
            ),
        );
    }
}
```

[ASSUMED] Weapon classification requires weapon data from parser. Verify that `python/parser/adapter.py` or `python/features/aimbot.py` already extracts weapon names per-kill event (likely does, since aimbot extractor needs kill context). If missing, add weapon parsing as Wave 0 task.

### Pattern 4: Sensitivity Analysis (Frontend Preview + Backend Validation)

**What:** User adjusts sliders for each feature threshold → Frontend immediately recalculates score using feature vectors + adjusted thresholds → User clicks "Save" → POST to backend → Backend re-scores with ground truth → Return certified comparison artifact

**When to use:** Whenever you need instant UX feedback but must validate results server-side before persisting

**Example:**
```typescript
// hooks/useSensitivityTuner.ts

interface FeatureThresholds {
  aimbot: number          // [0, 100]
  triggerbot: number
  wallhack: number
  recoil: number
  bhop: number
  session: number
}

export function useSensitivityTuner(demoId: string, featureVectors: FeatureVectorsDto) {
  const [thresholds, setThresholds] = useState<FeatureThresholds>({
    aimbot: 50,
    triggerbot: 50,
    wallhack: 50,
    recoil: 50,
    bhop: 50,
    session: 50,
  })
  
  // LOCAL CALCULATION: Instant, no API call
  const estimatedScore = useMemo(() => {
    // Map [0, 100] slider to [0, 1] threshold
    const thresholdScores = {
      aimbot: featureVectors.aimbotScore > (thresholds.aimbot / 100) ? 1 : 0,
      triggerbot: featureVectors.triggerbotScore > (thresholds.triggerbot / 100) ? 1 : 0,
      wallhack: featureVectors.wallhackScore > (thresholds.wallhack / 100) ? 1 : 0,
      recoil: featureVectors.recoilScore > (thresholds.recoil / 100) ? 1 : 0,
      bhop: featureVectors.bhopScore > (thresholds.bhop / 100) ? 1 : 0,
      session: featureVectors.sessionScore > (thresholds.session / 100) ? 1 : 0,
    }
    
    // Weighted average: same weights as backend scoring
    const weights = {
      aimbot: 0.25,
      triggerbot: 0.15,
      wallhack: 0.25,
      recoil: 0.20,
      bhop: 0.10,
      session: 0.05,
    }
    
    return Object.entries(weights).reduce(
      (sum, [key, weight]) => sum + (thresholdScores[key as keyof typeof thresholdScores] * weight),
      0
    )
  }, [thresholds, featureVectors])
  
  // BACKEND VALIDATION: Called on "Save"
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/compare`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            demo_id: demoId,
            adjusted_thresholds: thresholds,
          }),
        }
      )
      if (!response.ok) throw new Error('Failed to save comparison')
      return response.json()
    },
    onSuccess: (data) => {
      // Display certified comparison (transient, not stored in React state permanently)
      setComparisonResult(data)
    },
  })
  
  return {
    thresholds,
    setThresholds,
    estimatedScore,  // Local, instant
    saveComparison: () => mutation.mutate(),
    comparisonResult: mutation.data,
    isSaving: mutation.isPending,
  }
}
```

```php
// symfony/src/UI/Api/AnalyticsController.php

#[Route('/api/analytics/compare', methods: ['POST'])]
public function compare(Request $request): Response
{
    $data = json_decode($request->getContent(), true);
    $demoId = $data['demo_id'];
    $adjustedThresholds = $data['adjusted_thresholds']; // [0, 100] scale
    
    try {
        // Re-score with ground truth
        $comparison = $this->sensitivityService->createComparison(
            demoId: $demoId,
            adjustedThresholds: $adjustedThresholds,
        );
        
        // Return certified result (NOT persisted to database)
        return new JsonResponse($this->serializer->normalize($comparison));
    } catch (\Throwable $e) {
        return new JsonResponse(['error' => $e->getMessage()], 422);
    }
}
```

[VERIFIED: Symfony 7 docs — POST endpoints with JSON body handled via `json_decode($request->getContent())`]

### Anti-Patterns to Avoid

- **Over-fetching feature vectors:** Don't include full feature vectors in demo list endpoint; only fetch them when needed (demo detail or sensitivity tuner request). Feature vectors are immutable, so caching for 1 hour is safe.
- **Computing trends synchronously on every request:** Trends are expensive (rolling window aggregations, regression fits). Always cache in Redis with 1-hour TTL; invalidate on new demo arrival via event listener on AnalysisResult creation.
- **Persisting sensitivity comparisons to database:** Keep comparisons transient (session-lifetime via query params or React state). Storing every "what-if" scenario creates unbounded database growth.
- **Leaderboard pre-computation for all possible filter combos:** Too many permutations (maps × rating bands × regions × timeframes = 7 × 3 × 3 × 4 = 252 combos). Instead, pre-compute only common combos (top 3 maps, all rating bands, top regions, last 30 days) and compute others on-demand with acceptable latency (~500ms).
- **Filtering without indexes:** Ensure database indexes on `(player_id, calculated_at)`, `(map)`, `(demo_id)` for fast WHERE clauses. Missing indexes will cause full table scans.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-side caching & query dedup | Manual useState + fetch tracking | React Query `useQuery` | Prevents duplicate requests, handles staleness, GC'd cache |
| Local storage history | Custom JSON parsing | Browser `localStorage` API directly | Simple, native, supports ~5MB per domain |
| Trend statistics (variance, regression) | Custom matrix math | NumPy / SciPy (Python) or pandas | Vetted algorithms, numerical stability, no rounding errors |
| Leaderboard ranking by percentile | Hand-written SQL CASE/WHEN | PostgreSQL window functions (`ROW_NUMBER() OVER ()`) | Correct tie-handling, indexes optimized by query planner |
| Feature score aggregation | Manual loops + conditional | PostgreSQL `CASE/GROUP BY` or PHP `array_reduce` | Declarative, testable, composes with other queries |
| API response serialization (Symfony) | Manual array assembly | Symfony Serializer + DTO classes | Handles nested objects, type coercion, validation |

**Key insight:** Phase 15 layers query logic, not domain logic. Leverage existing libraries (React Query, PostgreSQL, Symfony Serializer) for proven implementations. Custom code should only exist where business rules are unique (sensitivity threshold mapping, volatility jump detection thresholds).

---

## Runtime State Inventory

**Status:** No rename/refactor/migration in this phase. All new state created from scratch. SKIPPED.

---

## Common Pitfalls

### Pitfall 1: Feature Vector Payload Size Explosion

**What goes wrong:** Including feature vectors for ALL demos in list endpoint → response payload balloons to 100KB+ for 20-demo page → slow API, slow frontend parsing

**Why it happens:** Developers want convenience (all data in one response) but don't account for bulk cost

**How to avoid:** Only include feature vectors in demo detail endpoint (single demo), NOT in list endpoint. List endpoint returns lightweight summary: id, status, demo_time, suspicion_score (no vectors). Sensitivity tuner lazy-loads demo detail to get vectors.

**Warning signs:** Network tab shows > 50KB response for `/api/demos?limit=20`; Frontend takes > 500ms to render list after fetch

### Pitfall 2: Trend Calculation Caching Without Invalidation

**What goes wrong:** Redis caches trend metrics for 1 hour, but a new demo arrives for the player within that window → trend dashboard shows stale variance band, stale improvement arc

**Why it happens:** Event listener on AnalysisResult creation not wired to invalidate trend cache

**How to avoid:** When `AnalysisResultCreated` event fires, immediately invalidate player's trend cache keys in Redis:
```php
#[AsEventListener(event: AnalysisResultCreated::class, priority: 100)]
public function onAnalysisCreated(AnalysisResultCreated $event): void
{
    $playerId = $event->playerId;
    $this->cache->delete("trend:consistency:{$playerId}");
    $this->cache->delete("trend:arc:{$playerId}");
    $this->cache->delete("trend:weapons:{$playerId}");
}
```

**Warning signs:** Player uploads new demo, trend metrics don't update for an hour; QA reports "stale data on trends page"

### Pitfall 3: Leaderboard Filtering N+1 Queries

**What goes wrong:** Backend fetches filtered player list (100 rows), then for each player queries their 95th percentile TRACE score → 100 queries + 1 initial query = 101 queries

**Why it happens:** Naive implementation: loop through players, fetch each player's ranking separately

**How to avoid:** Use PostgreSQL window functions or pre-computed materialized views to fetch all percentiles in one query:
```sql
-- GOOD: Single query, window function
SELECT 
    p.id,
    p.steam_id,
    p.username,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.trace_adjusted) as trace_95p,
    COUNT(tr.id) as demo_count
FROM player p
LEFT JOIN trace_rating tr ON p.id = tr.player_id
WHERE (filter conditions here)
GROUP BY p.id
HAVING COUNT(tr.id) >= 5  -- qualification threshold
ORDER BY trace_95p DESC
LIMIT 100;
```

**Warning signs:** Leaderboard endpoint takes > 2 seconds to respond; database CPU spikes when leaderboard is requested

### Pitfall 4: localStorage History Syncrhonization Across Tabs

**What goes wrong:** User has demo analyzer open in two tabs, applies filter in tab A, switches to tab B, filter history in tab B is stale

**Why it happens:** localStorage changes in one tab don't notify other open tabs by default; no cross-tab sync

**How to avoid:** For this phase, acknowledge as known limitation (single-device focus). Document in release notes: "Filter history is per-tab; open only one analyzer tab for consistency." Future phase can add `useStorageEvent` hook to sync across tabs if needed.

**Warning signs:** QA or users report "filters disappeared when I switched tabs"

### Pitfall 5: Missing Index on Trending Queries

**What goes wrong:** Trend calculation queries on `trace_rating` table without index on `(player_id, calculated_at)` → full table scan → 5+ second response time

**Why it happens:** Migrations were written but index wasn't created during schema design

**How to avoid:** In migration file, explicitly create index before using it in queries:
```php
// In Migration file
public function up(Schema $schema): void
{
    $this->addSql('CREATE INDEX idx_trace_rating_player_calc ON trace_rating (player_id, calculated_at)');
}
```

Then verify in test:
```php
public function testTrendQueryUsesIndex(): void
{
    // Execute EXPLAIN on trend query, verify "Index Scan" not "Seq Scan"
    $result = $this->conn->executeQuery('EXPLAIN SELECT ... FROM trace_rating WHERE player_id = ?')->fetchAssociative();
    $this->assertStringContainsString('Index Scan', $result['QUERY PLAN'] ?? '');
}
```

**Warning signs:** Trend endpoint slow in development (single player, few demos); will be catastrophically slow in production (thousands of players, millions of demos)

---

## Code Examples

### Verified patterns from official sources:

### Filter Query with Multiple WHERE Clauses

```php
// symfony/src/Application/Handler/GetFilteredDemosHandler.php
// Source: Symfony 7 Doctrine QueryBuilder docs

class GetFilteredDemosHandler implements MessageHandler
{
    public function __invoke(GetFilteredDemosQuery $query): FilteredDemosDto
    {
        $qb = $this->demoRepository->createQueryBuilder('d');
        
        // Base query with analysis results
        $qb->leftJoin('d.analysisResults', 'ar')
           ->leftJoin('ar.traceRating', 'tr');
        
        // Apply filters
        if ($query->map !== null) {
            $qb->andWhere('d.map = :map')
               ->setParameter('map', $query->map);
        }
        
        if ($query->ratingBand !== null) {
            // Opponent rating band: use TRACE score as proxy for player skill
            // TODO: Confirm RWS extraction in Phase 3 or use TRACE percentile as ranking
            switch ($query->ratingBand) {
                case '0-5':
                    $qb->andWhere('tr.traceNormalized < 0.33');
                    break;
                case '5-10':
                    $qb->andWhere('tr.traceNormalized BETWEEN 0.33 AND 0.67');
                    break;
                case '10+':
                    $qb->andWhere('tr.traceNormalized > 0.67');
                    break;
            }
        }
        
        if ($query->outcome !== null) {
            // Outcome: win/loss/draw — requires match result from demo data
            // TODO: Verify demo entity includes round result or team score
            $qb->andWhere('d.outcome = :outcome')
               ->setParameter('outcome', $query->outcome);
        }
        
        if ($query->daysBack !== null && $query->daysBack < 999) {
            $cutoff = (new \DateTimeImmutable())->modify("-{$query->daysBack} days");
            $qb->andWhere('d.uploadedAt >= :cutoff')
               ->setParameter('cutoff', $cutoff);
        }
        
        // Pagination
        $qb->setFirstResult($query->offset)
           ->setMaxResults($query->limit)
           ->orderBy('d.uploadedAt', 'DESC');
        
        $demos = $qb->getQuery()->getResult();
        
        return new FilteredDemosDto(
            demos: array_map([$this, 'mapToDto'], $demos),
            total: $this->countFiltered($query),
            hasMore: count($demos) === $query->limit,
        );
    }
}
```

[CITED: Symfony 7 Doctrine QueryBuilder — Conditional WHERE clauses with `andWhere()` and parameter binding]

### React Query with Filter Dependencies

```typescript
// frontend/lib/hooks/useFilteredDemos.ts
// Source: TanStack React Query v5 docs — queryKey composition

import { useQuery } from '@tanstack/react-query'

export function useFilteredDemos(filters: FilterCriteria) {
  return useQuery({
    // queryKey array — React Query automatically refetches when ANY element changes
    queryKey: ['demos', 'filtered', filters.map, filters.ratingBand, filters.outcome, filters.daysBack],
    
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.map) params.append('map', filters.map)
      if (filters.ratingBand) params.append('rating_band', filters.ratingBand)
      if (filters.outcome) params.append('outcome', filters.outcome)
      if (filters.daysBack !== undefined) params.append('days_back', filters.daysBack.toString())
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/demos?${params.toString()}`,
        { credentials: 'include' }  // Include auth cookies
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch demos: ${response.statusText}`)
      }
      
      return response.json()
    },
    
    // Caching strategy: filters change frequently, but individual filter combos recur
    staleTime: 60000,    // 1 minute — assume data is fresh for 1 min after fetch
    gcTime: 300000,      // Keep cache for 5 minutes even if unused (user may go back)
    retry: 2,            // Retry network errors twice
  })
}
```

[CITED: TanStack React Query v5 docs — `queryKey` array composition, `staleTime`, `gcTime`]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual fetch + useState for each filter | React Query with composite queryKey | 2024+ | Eliminates race conditions, deduplicates requests, automatic staleness detection |
| Feature vectors in every demo list response | Pre-fetch in detail endpoint only | Phase 15 | ~80% payload reduction for list endpoints; no latency penalty (detail page doesn't load vectors separately) |
| Trends computed on every page view | Redis-cached with event-based invalidation | Phase 15 | Reduces trend query time from 2+ sec to 100ms cache hit; invalidation prevents staleness |
| localStorage history as single string | Typed history array with max 5 combos | Phase 15 | Prevents unbounded growth; easier to display "recent filters" UI |
| Leaderboard pre-computation for ALL combos | On-demand with common combos pre-warmed | Phase 15 | Scales with player count; pre-warming handles 95% of requests in < 500ms |
| Manual SQL aggregation for percentiles | Window functions (`PERCENTILE_CONT()`) | Phase 12+ (TRACE phase) | Correct tie-handling, indexes optimized by planner, 10x faster |

**Deprecated/outdated:**
- Manual feature vector caching (use React Query caching instead) — React Query provides TTL, GC, staleness checks
- Storing sensitivity comparisons in database — Keep transient, rebuild on request if needed (no audit trail required per CONTEXT.md)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Demo parser extracts `active_weapon_name` per tick (source: `parser/types.py` ticks_df columns) | Common Pitfalls, Pitfall 2 (weapon trends) | If weapon data missing, must add parser feature (effort: 2-4 hours); blocks weapon-specific trend analysis |
| A2 | TRACE score is sufficient proxy for "opponent rating" for filtering purposes (vs. requiring separate RWS stat) | Locked Decision 1 (rating band filter) | If rating needs to be distinct from TRACE (e.g., economy-aware rating), requires new data model and Phase 3 enhancement |
| A3 | Demo entity includes `outcome` field (win/loss/draw) or can be inferred from team score | Locked Decision 1 (outcome filter) | If missing, must compute from demo score data; adds ~50ms per demo comparison |
| A4 | React Query v5.x is installed and project uses TypeScript >=4.5 for type-safe queryKey | Standard Stack, Code Examples | If older React Query or missing TypeScript, patterns need adjustment; may lose type safety |
| A5 | Redis supports atomic cache invalidation via `delete()` calls within event listeners | Common Pitfalls, Pitfall 2 | If Redis isn't atomic, trend cache may become inconsistent; risk: requires manual cache clear API |
| A6 | Symfony event listeners execute synchronously before entity flush (for trend cache invalidation) | Common Pitfalls, Pitfall 2 | If event fires after flush, cache invalidation races with old data still in query results; requires async queue for safety |

---

## Open Questions

1. **Weapon Classification Source**
   - What we know: Parser extracts `active_weapon_name` per tick (confirmed in `parser/types.py`)
   - What's unclear: Are weapon names standardized (e.g., "ak47" vs. "AK-47")? Do kill events include weapon ID?
   - Recommendation: Verify `python/features/aimbot.py` or `python/parser/adapter.py` to confirm weapon naming convention. If inconsistent, normalize in Wave 0.

2. **Opponent Rating Calculation**
   - What we know: CONTEXT.md mentions "estimated rating or ladder position" for opponent rating band filter
   - What's unclear: Should this be TRACE percentile, RWS (Rounds Won Score) from Phase 3, or leaderboard rank?
   - Recommendation: Use TRACE 95th percentile as proxy for Phase 15 (simplest, requires no new extraction). Document as "TRACE-based skill bands" in UI.

3. **Demo Outcome Data**
   - What we know: Demo entity has `map` field (confirmed in Demo.php)
   - What's unclear: Does Demo or AnalysisResult include match outcome (win/loss/draw)?
   - Recommendation: Check demo parser and AnalysisResult schema in Wave 0. If missing, compute from team scores in demo data (add to Wave 0).

4. **Leaderboard Pre-Computation Frequency**
   - What we know: Per-map rankings needed for leaderboard filtering; Redis available for caching
   - What's unclear: Should pre-computation run hourly, daily, or only on demand?
   - Recommendation: Start on-demand (< 500ms latency acceptable). If QA flags slowness, add hourly background job to pre-warm top 10 maps.

5. **Feature Vector Size and Transport**
   - What we know: ~5KB per demo mentioned in CONTEXT.md; 6 feature scores in FeatureVectorsDto
   - What's unclear: Should response include confidence intervals or raw scores only?
   - Recommendation: Raw scores only for Phase 15 (simpler). Add confidence intervals in Phase 16+ if needed for statistical rigor.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Demo filtering, trend aggregation queries | ✓ | 16.2 (Phase 1) | — |
| Redis | Trend metric caching, leaderboard pre-comp | ✓ | 7.x (Phase 1) | In-memory dict (no persistence, not recommended) |
| React Query | Client-side filtering, query dedup | ✓ | 5.x (Phase 6) | Manual fetch + useState (verbose, error-prone) |
| Node.js | Frontend build, type checking | ✓ | 18.x+ (Phase 6) | — |
| Symfony CLI | Local dev server | ✓ | 7.x (Phase 1) | `php -S localhost:8000` (no hot reload) |
| npm / Composer | Package management | ✓ | npm 10.x, Composer 2.x | — |

**Missing dependencies with no fallback:** None — all required tooling is present from earlier phases.

**Missing dependencies with fallback:** None — Redis caching is optional (on-demand computation works, just slower).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend Test Framework | PHPUnit 11.x + Symfony WebTestCase |
| Frontend Test Framework | Vitest + React Testing Library |
| E2E Test Framework | Playwright |
| Test Config Files | `phpunit.xml.dist`, `vitest.config.ts`, `playwright.config.ts` (existing from earlier phases) |
| Quick Run Command | `make test-unit` (< 30 seconds) |
| Full Suite Command | `make test` (< 5 minutes) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PH15-01 | Filter demos by map + render list | Integration | `pytest symfony:test tests/Application/Handler/GetFilteredDemosHandlerTest.php` | ❌ Wave 1 |
| PH15-02 | Filter demos by rating band (TRACE percentile) | Unit | `pytest symfony:test tests/Application/Handler/GetFilteredDemosHandlerTest.php::testFilterByRatingBand` | ❌ Wave 1 |
| PH15-03 | Filter demos by outcome (win/loss/draw) | Unit | `pytest symfony:test tests/Application/Handler/GetFilteredDemosHandlerTest.php::testFilterByOutcome` | ❌ Wave 1 |
| PH15-04 | Filter demos by timeframe (days back) | Unit | `pytest symfony:test tests/Application/Handler/GetFilteredDemosHandlerTest.php::testFilterByTimeframe` | ❌ Wave 1 |
| PH15-05 | Feature vectors pre-fetched in demo detail | Integration | `pytest symfony:test tests/UI/Api/DemoControllerTest.php::testDetailIncludesFeatureVectors` | ❌ Wave 2 |
| PH15-06 | Sensitivity tuner sliders update local score | Unit | `npm run test -- hooks/useSensitivityTuner.test.ts` | ❌ Wave 2 |
| PH15-07 | POST /api/analytics/compare re-scores correctly | Integration | `pytest symfony:test tests/UI/Api/AnalyticsControllerTest.php::testCompare` | ❌ Wave 3 |
| PH15-08 | Trend consistency calculated correctly | Unit | `pytest symfony:test tests/Application/Handler/GetAnalyticsTrendHandlerTest.php::testConsistencyVariance` | ❌ Wave 4 |
| PH15-09 | Trend arc regression fit tested | Unit | `pytest symfony:test tests/Application/Handler/GetAnalyticsTrendHandlerTest.php::testArcRegression` | ❌ Wave 4 |
| PH15-10 | Trend weapons grouped by class | Unit | `pytest symfony:test tests/Application/Handler/GetAnalyticsTrendHandlerTest.php::testWeaponGrouping` | ❌ Wave 4 |
| PH15-11 | Redis cache invalidation on new analysis | Integration | `pytest symfony:test tests/Infrastructure/Cache/AnalyticsCacheAdapterTest.php::testCacheInvalidateOnNewAnalysis` | ❌ Wave 4 |
| PH15-12 | Leaderboard filtered by map | Integration | `pytest symfony:test tests/UI/Api/LeaderboardControllerTest.php::testFilteredByMap` | ❌ Wave 5 |
| PH15-13 | Leaderboard filtered by rating band | Integration | `pytest symfony:test tests/UI/Api/LeaderboardControllerTest.php::testFilteredByRatingBand` | ❌ Wave 5 |
| PH15-14 | Filter history persisted to localStorage | Unit | `npm run test -- hooks/useFilteredDemos.test.ts::testFilterHistoryPersistence` | ❌ Wave 1 |
| PH15-15 | E2E: User filters demos → sees updated list | E2E | `npx playwright test e2e/analytics.spec.ts::testFilterWorkflow` | ❌ Wave 5 |

### Sampling Rate

- **Per task commit:** `make test-unit` (PHPUnit + Jest unit tests, skip E2E)
- **Per wave merge:** `make test` (full suite including Playwright E2E)
- **Phase gate:** Full suite green + manual QA of trend visualizations (complexity justifies human review)

### Wave 0 Gaps

- [ ] `symfony/tests/Application/Handler/GetFilteredDemosHandlerTest.php` — Test filter composition and SQL correctness
- [ ] `symfony/tests/UI/Api/AnalyticsControllerTest.php` — Test POST /compare endpoint validation
- [ ] `frontend/lib/hooks/useFilteredDemos.test.ts` — Test filter state + localStorage persistence
- [ ] `frontend/lib/hooks/useSensitivityTuner.test.ts` — Test slider value → score calculation
- [ ] Database migration: Add index on `trace_rating(player_id, calculated_at)` if missing
- [ ] Verify weapon classification: `python/parser/adapter.py` or `python/features/aimbot.py` extracts weapon names
- [ ] Verify demo outcome data: Check if `Demo` or `AnalysisResult` includes win/loss/draw
- [ ] Create `symfony/src/Infrastructure/Cache/AnalyticsCacheAdapter.php` — Redis interface for trend caching
- [ ] Create `frontend/lib/types.ts` extensions: `SensitivityComparisonDto`, `TrendMetricDto`, filter types

*(If all gaps resolved in Wave 0: Full test suite will pass)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing: JWT + refresh tokens from Phase 14; verify user ownership of demos before filtering |
| V3 Session Management | yes | Existing: httpOnly cookies, 30-day rotation; ensure filter queries don't leak user data |
| V4 Access Control | yes | NEW: Verify user can only filter/analyze their own demos; endpoint must check `current_user_id == demo.owner_id` |
| V5 Input Validation | yes | NEW: Validate filter params (map must be in enum, rating band in ['0-5','5-10','10+'], outcome in ['win','loss','draw'], days in [7,30,90,999]); reject invalid values with 400 |
| V6 Cryptography | no | Feature vectors are game analysis outputs, not sensitive personally identifiable information; no new crypto needed |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Filter injection (SQL) | Tampering | Use Doctrine QueryBuilder with parameterized queries (not string concatenation); test with `' OR '1'='1` |
| Unauthorized demo access | Spoofing, Elevation | Verify `$currentUser->getId() == $demo->getOwner()` before returning feature vectors |
| Cache poisoning (Redis) | Tampering | Redis is internal only (not exposed to internet); ensure cache keys include user_id to prevent cross-user leaks |
| Sensitivity threshold abuse | Denial of Service | POST /compare accepts thresholds [0, 100]; limit request rate to 10 req/min per user; reject invalid thresholds with 422 |
| leaderboard rank enumeration | Information Disclosure | Leaderboard filters return top 100 players + pagination; expose total count (OK for public leaderboard); consider hiding rank positions if privacy concern |
| localStorage XSS | Injection | React component reads localStorage in useEffect; if filter values are user-supplied strings, sanitize before rendering (e.g., don't render in HTML directly, use `<span>{filterValue}</span>`) |

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: npm registry] React Query v5.41.0 — React Query Docs: Query Key composition, cache invalidation patterns
- [VERIFIED: PostgreSQL 16 docs] Window functions, `PERCENTILE_CONT()`, `ROW_NUMBER() OVER ()`
- [CITED: Symfony 7 docs] Doctrine QueryBuilder, CQRS pattern, event listeners
- [VERIFIED: codebase] Demo entity (I:\github\cs2-demo-cheat-detection\symfony\src\Domain\Demo\Demo.php) — confirmed `map` field
- [VERIFIED: codebase] User entity (I:\github\cs2-demo-cheat-detection\symfony\src\Entity\User.php) — confirmed `steamId`, `createdAt`, `lastLoginAt`
- [VERIFIED: codebase] TraceRating entity — confirmed all component scores available, indexes on `(player_id, calculated_at)`
- [VERIFIED: codebase] Parser types (I:\github\cs2-demo-cheat-detection\python\parser\types.py) — confirmed `active_weapon_name` in ticks_df columns

### Secondary (MEDIUM confidence)

- [CITED: Symfony 7 Serializer docs] DTO serialization, nested object handling
- [CITED: MDN Web Docs] localStorage API, capacity (~5-10MB), persistence model
- [VERIFIED: codebase] Existing hooks: useTraceQuery, useDemoFetch, useTraceHistoryQuery — pattern established for React Query integration

### Tertiary (LOW confidence - needs validation)

- [ASSUMED] Demo outcome (win/loss/draw) is available in Demo entity or computable from AnalysisResult — verify in code
- [ASSUMED] Weapon classification from parser is sufficient for trend analysis — confirm `active_weapon_name` values are consistent
- [ASSUMED] RWS (Rounds Won Score) from Phase 3 is not required; TRACE percentile sufficient as "opponent rating" — user to confirm if rating needs to be distinct

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | React Query, Symfony, PostgreSQL, Redis all confirmed in codebase from earlier phases |
| Architecture | HIGH | CQRS pattern, React Query caching, PostgreSQL window functions all established in v2 core |
| Feature Vector Exposure | MEDIUM | Feature vectors exist in AnalysisResult; pre-fetch strategy is standard pattern, but payload size optimization needs validation |
| Trend Calculation | MEDIUM | Algorithms are straightforward (variance, regression, grouping), but minimum demo threshold for statistical validity needs user input |
| Leaderboard Pre-computation | MEDIUM | On-demand approach is safe; pre-warming requires performance testing to determine thresholds |
| Filter Persistence | HIGH | localStorage is native browser API; no external dependencies |
| Sensitivity Analysis | HIGH | Frontend/backend split is clean; transient comparison artifact simplifies persistence |
| Security Controls | MEDIUM | Standard ASVS controls apply; access checks for demo ownership must be implemented and tested |

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (30 days — stack is stable, no breaking changes expected)

---

## Next Steps for Planning Phase

1. **Confirm assumptions** (Wave 0 tasks):
   - Verify weapon classification in parser (weapon names, extraction point)
   - Verify demo outcome data (Win/Loss/Draw field location)
   - Confirm TRACE percentile sufficient as "opponent rating" or if separate RWS needed

2. **Decompose into 5 waves:**
   - **Wave 1:** Filter UI + backend query (GET /api/demos?filters=...), localStorage persistence
   - **Wave 2:** Feature vector exposure in demo detail, sensitivity tuner frontend
   - **Wave 3:** POST /api/analytics/compare backend validation endpoint
   - **Wave 4:** Trend calculation endpoints + Redis caching + event-based invalidation
   - **Wave 5:** Advanced leaderboard filtering, integration testing, E2E scenarios

3. **Dependencies and parallelization:**
   - Waves 1-2 can run in parallel (filter UI independent from sensitivity)
   - Wave 3 blocks Wave 2's "Save Comparison" feature (needs backend endpoint first)
   - Wave 4 can run in parallel with 1-3 (trends are independent capability)
   - Wave 5 depends on Wave 1 (leaderboard filtering reuses filter criteria pattern)

4. **Risk mitigation:**
   - Test filter queries with indexes in place (Wave 0 migration)
   - Implement trend cache invalidation before Wave 4 production (critical for correctness)
   - E2E test the sensitivity tuner save flow (Wave 5) to catch frontend/backend mismatches

---

**Research Complete — Ready for Planning**
