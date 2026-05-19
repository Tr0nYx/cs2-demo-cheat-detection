# Architecture

**Analysis Date:** 2026-05-19

## System Overview

This is a three-tier cheat detection system for Counter-Strike 2 demos. The **Symfony 7.4 backend** serves as the orchestrator and API gateway, the **Python 3.12 ML pipeline** performs deep feature extraction and scoring, and the **Next.js 16 frontend** provides visualization and user interaction. Communication flows through **Redis queues** and **HTTP APIs**, with **PostgreSQL** as the persistent store.

```text
┌──────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                           │
│                      (Browser Clients)                            │
│         `frontend/app`, `frontend/lib/hooks`                      │
└─────────────────┬────────────────────────────────┬────────────────┘
                  │                                 │
                  │ HTTP/JSON                       │ HTTP/JSON
                  │ (auth, queries)                 │ (analysis results)
                  │                                 │
┌─────────────────▼───────────────────────────────▼────────────────┐
│                  Symfony 7.4 API Backend                          │
│        Demo Upload • Analytics • User Auth                        │
│  `symfony/src/UI/Api`, `symfony/src/Application/*`               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Application Layer (Handlers, Services, DTOs)               │ │
│  │ • UploadDemoService (file handling)                        │ │
│  │ • AnalyzeDemoHandler (job dispatch)                        │ │
│  │ • ResultIngestHandler (result consumption)                 │ │
│  │ • LeaderboardHandlers (aggregations)                       │ │
│  └──────┬──────────────────────────────┬──────────────────────┘ │
│         │ Redis Queue                   │ HTTP                    │
│         │ (job dispatch)                │ (Steam API)             │
│         │                               │                         │
│  ┌──────▼───────────────────────────────────────────────────────┐ │
│  │ Infrastructure Layer (Queue, Storage, APIs)                 │ │
│  │ • RedisAnalysisJobPublisher                                 │ │
│  │ • LocalDemoStorage (file system)                            │ │
│  │ • SteamOpenIdValidator, SteamProfileClient                  │ │
│  │ • ResultIngestController (webhook endpoint)                 │ │
│  └──────┬──────────────────────────────┬──────────────────────┘ │
│         │ Domain Entities               │                         │
│  ┌──────▼──────────────────────────────────────────────────────┐ │
│  │ Domain & Entity Layer (PostgreSQL)                          │ │
│  │ • Demo, AnalysisResult, Player                              │ │
│  │ • DemoStatus (Uploaded → Queued → Done/Error)               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────┬────────────────────────────────┬──────────────┘
                    │                                 │
                    │ Redis Queue                     │ HTTP POST
                    │ cs2.analysis                    │ /api/internal/results
                    │ JSON payload                    │ JSON + token auth
                    │                                 │
┌───────────────────▼────────────────────────────────▼──────────────┐
│                   Python 3.12 ML Pipeline                          │
│              Feature Extraction & Scoring                          │
│         `python/worker.py`, `python/features/*`                   │
│                                                                    │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Worker Loop (worker.py)                                  │   │
│  │ • Consumes Redis queue jobs                             │   │
│  │ • Orchestrates feature extraction                       │   │
│  │ • Handles errors and retries                            │   │
│  └────┬──────────────────────────┬───────────────────┬──────┘   │
│       │                          │                   │           │
│  ┌────▼──────────┐  ┌───────────▼─────────┐  ┌──────▼────────┐  │
│  │ Parser        │  │ Feature Extractors  │  │ Scoring       │  │
│  │               │  │                     │  │               │  │
│  │ • DemoParser  │  │ • AimbotExtractor   │  │ • Weighted    │  │
│  │   (protobuf)  │  │ • WallhackExtractor │  │   Scorer      │  │
│  │ • pandas DFs  │  │ • TriggerbotExtract │  │ • Suspicion   │  │
│  │ • tick events │  │ • RecoilExtractor   │  │   Labels      │  │
│  │               │  │ • BhopExtractor     │  │ • TRACE       │  │
│  │ `python/      │  │ • SessionExtractor  │  │   Rating      │  │
│  │ parser/*`     │  │                     │  │               │  │
│  │               │  │ `python/features/`  │  │ `python/      │  │
│  │               │  │                     │  │ scoring/*`    │  │
│  └────┬──────────┘  └──────┬──────────────┘  └──────┬────────┘  │
│       │                     │                        │            │
│       └─────────────────────┼────────────────────────┘            │
│                             │                                     │
│                    ┌────────▼────────┐                           │
│                    │ Result Writer   │                           │
│                    │ (persistence)   │                           │
│                    │                 │                           │
│                    │ • PostgreSQL    │                           │
│                    │ • JSON storage  │                           │
│                    │ • AnalysisResult│                           │
│                    │                 │                           │
│                    `python/          │                           │
│                    persistence/`     │                           │
│                                      │                           │
└──────────────────────────────────────▼──────────────────────────┘
                                       │
                                       │ HTTP POST
                                       │ (result ingest)
                                       │
                            ┌──────────▼──────────┐
                            │   PostgreSQL        │
                            │                     │
                            │ • demo              │
                            │ • analysis_result   │
                            │ • player            │
                            │ • trace_rating      │
                            │                     │
                            └─────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **DemoController** | REST endpoints for demo upload, list, detail | `symfony/src/UI/Api/DemoController.php` |
| **UploadDemoService** | Validates file, stores on disk, creates Demo entity | `symfony/src/Application/Demo/UploadDemoService.php` |
| **AnalyzeDemoHandler** | Message handler: fetches Demo, publishes to Redis | `symfony/src/Application/Handler/AnalyzeDemoHandler.php` |
| **RedisAnalysisJobPublisher** | Publishes JSON job to Redis queue | `symfony/src/Infrastructure/Queue/RedisAnalysisJobPublisher.php` |
| **Python Worker** | Consumes Redis, orchestrates feature extraction, calls result API | `python/worker.py` |
| **Feature Extractors** | Extract specific cheat features (aimbot, recoil, etc.) | `python/features/*.py` |
| **DemoParser** | Parses protobuf .dem file → pandas DataFrames | `python/parser/adapter.py` |
| **WeightedScorer** | Combines feature scores into overall suspicion label | `python/scoring/weighted_scorer.py` |
| **ResultIngestController** | Webhook endpoint receiving analysis results from Python | `symfony/src/UI/Api/ResultIngestController.php` |
| **AnalyticsController** | Aggregation queries (leaderboards, trends) | `symfony/src/UI/Api/AnalyticsController.php` |
| **Frontend Pages** | Next.js route handlers and React components | `frontend/app/`, `frontend/components/` |
| **Frontend Hooks** | Data fetching (useMatchDetail, useUploadDemo, etc.) | `frontend/lib/hooks/` |

## Pattern Overview

**Overall:** **Event-Driven Queue-Based Pipeline** with asynchronous processing.

**Key Characteristics:**
- **Decoupled tiers:** Symfony publishes jobs; Python consumes independently
- **Fire-and-forget analysis:** Demo upload returns immediately; analysis happens in background
- **Result push:** Python pushes results back to Symfony via HTTP webhook with token auth
- **Stateless workers:** Python worker instances are horizontally scalable
- **PostgreSQL for state:** Single source of truth; Redis only for job queues

## Layers

**Presentation Layer:**
- Purpose: Handle HTTP requests and responses
- Location: `symfony/src/UI/Api/`, `frontend/app/`, `frontend/components/`
- Contains: Controllers, API route handlers, React components
- Depends on: Application layer (handlers), Authentication middleware
- Used by: Browser clients, external integrations

**Application Layer:**
- Purpose: Orchestrate use cases (upload, analyze, query leaderboards)
- Location: `symfony/src/Application/`
- Contains: Handlers (message/query), Services (UploadDemoService), DTOs (data transfer objects)
- Depends on: Domain entities, Infrastructure (storage, queue, APIs)
- Used by: Presentation controllers

**Domain Layer:**
- Purpose: Define core business logic, entities, and rules
- Location: `symfony/src/Domain/`
- Contains: Demo, AnalysisResult, Player, DemoStatus enum, value objects
- Depends on: Nothing (pure business logic)
- Used by: Application and Infrastructure layers

**Infrastructure Layer:**
- Purpose: Implement external dependencies (storage, queue, APIs, database)
- Location: `symfony/src/Infrastructure/`
- Contains: Redis queue publisher, file storage, Steam API clients, Doctrine repositories
- Depends on: Domain entities
- Used by: Application layer via dependency injection

**Python ML Layer:**
- Purpose: Feature extraction and scoring pipeline
- Location: `python/`
- Contains: Worker loop, feature extractors, demo parser, scoring logic
- Depends on: PostgreSQL, Redis, external protobuf parser
- Data flow: Consumes Redis jobs → parses demo → extracts features → scores → persists results

## Data Flow

### Primary Request Path: Demo Upload → Analysis → Results Display

1. **User uploads demo** (`frontend/app/matches` POST) → `DemoController::create()`
   - File validation in `UploadDemoRequest`
   - Store file via `LocalDemoStorage` (filesystem)
   - Create `Demo` entity (status: "Uploaded"), save to PostgreSQL
   - Return demo UUID + 202 Accepted

2. **UploadDemoService dispatches analysis** → publishes `AnalyzeDemoMessage`
   - Symfony Messenger publishes message to RabbitMQ (or direct handler)
   - Handler: `AnalyzeDemoHandler::__invoke()`
   - Publishes to Redis queue `cs2.analysis` via `RedisAnalysisJobPublisher`
   - Message format: `{"demo_id": UUID, "file_path": "/storage/demos/...", "queued_at": "ISO8601"}`
   - Updates Demo.status to "Queued"

3. **Python worker consumes from Redis** → `python/worker.py` main loop
   - Pops job from `cs2.analysis` queue (blocking LPOP)
   - Deserializes JSON payload
   - Manages in-flight counters for graceful shutdown

4. **Demo parsing** → `DemoParserAdapter` → `pandas.DataFrame`
   - Calls external demo parser (protobuf .dem file)
   - Output: `ParsedDemo` with:
     - `ticks_df`: tick-by-tick player state (X, Y, Z, yaw, pitch, velocity, etc.)
     - `events_df`: events (kill, bomb_plant, etc.)
     - `map_name`: detected map

5. **Feature extraction per-player** → 6 extractors in parallel
   - Each extractor (`AimbotExtractor`, `WallhackExtractor`, etc.) processes player's ticks/events
   - Output: `FeatureResult(score: float 0-1, raw_measurements: dict, metadata: dict)`
   - Failures caught: if insufficient data, returns `FeatureExtractionError` or None

6. **Scoring aggregation** → `WeightedScorer::score()`
   - Combines 6 per-feature scores using configured weights (aimbot: 0.28, wallhack: 0.24, etc.)
   - Handles missing features via proportional weight redistribution
   - Outputs: `ScoringSummary(overall_score: 0-1, label: "clean"|"suspicious"|"likely_cheating")`

7. **Result write via HTTP POST** → `ResultIngestController::ingest()`
   - Python calls `POST /api/internal/results` with `X-Result-Ingest-Token` header
   - Payload: `{"demo_id": UUID, "results": [{player_steam_id, scores, feature_data}]}`
   - Token validation: `hash_equals()` against `RESULT_INGEST_TOKEN` env var
   - Handler: `ResultIngestHandler::__invoke()`

8. **Result persistence** → `python/persistence/result_writer.py`
   - Creates/updates `AnalysisResult` for each player + demo
   - Stores JSON blob `feature_data` (raw measurements per extractor)
   - Updates `Demo.status` to "Done", saves `Demo.map`
   - Inserts optional `TraceRating` if TRACE components provided

9. **Frontend polls and displays** → `useMatchDetail()` hook
   - Fetches demo detail from `GET /api/demos/{id}`
   - Displays feature scores, raw measurements, suspicion label
   - Visualizes heatmaps, kill events, round breakdowns

### Secondary Flow: Analytics & Leaderboards

- `GetFilteredLeaderboardHandler`: Queries players sorted by overall suspicion
- `GetAnalyticsTrendHandler`: Aggregates scores over time windows
- Frontend queries via `GET /api/analytics/leaderboard?filters=...`
- All data read-only from PostgreSQL

### State Management

**Demo Lifecycle:**
```
Uploaded → Queued → Done / Error
```

**Player Session State:**
- Each player in each demo has exactly one `AnalysisResult` (unique constraint on `demo_id, player_id`)
- Re-processing updates in place (UPSERT via ON CONFLICT)

**Frontend State:**
- React Query caching via custom hooks (`useDemoDetail`, `useDemoEvents`)
- Manual refetch on demand (retry button)
- Partial error handling (some queries can fail without breaking page)

## Key Abstractions

**Demo Entity:**
- Purpose: Represents a single CS2 demo file
- Examples: `symfony/src/Domain/Demo/Demo.php`
- Pattern: Aggregate root in DDD; owns file path, status, timestamps
- Status transitions enforced via `Demo::markQueued()`, `Demo::markDone()`

**AnalysisResult Entity:**
- Purpose: Stores feature scores and raw data for a player in a demo
- Examples: `symfony/src/Domain/Analysis/AnalysisResult.php`
- Pattern: Value object; immutable except via explicit replace methods
- JSON fields: `feature_data`, `support_data` for explainability

**Feature Extractor Interface:**
- Purpose: Pluggable cheat detection algorithms
- Examples: `python/features/aimbot.py`, `python/features/recoil.py`
- Pattern: Abstract base class `AbstractFeatureExtractor`; each implements `extract(demo_data) → FeatureResult`
- Returns: score (0-1), raw measurements dict, calibration metadata

**Queue Message:**
- Purpose: Async job dispatching between tiers
- Examples: `AnalyzeDemoMessage`, `ImportDemoMessage`
- Pattern: Simple data container (DTO); no behavior
- Protocol: JSON serialization → Redis LPUSH → Python LPOP

## Entry Points

**Symfony HTTP:**
- Location: `symfony/src/UI/Api/` with `#[Route]` attributes
- Triggers: Browser requests, external webhooks
- Responsibilities:
  - `DemoController::create()` → demo upload
  - `DemoController::list()` → paginated demo list
  - `AnalyticsController` → leaderboard/trend queries
  - `ResultIngestController::ingest()` → Python webhook

**Python Worker:**
- Location: `python/worker.py` main loop
- Triggers: Startup (blocking queue consumer)
- Responsibilities:
  - Consume Redis queue jobs infinitely
  - Handle graceful shutdown on SIGTERM/SIGINT
  - Log all events as JSON to stdout

**Frontend Pages:**
- Location: `frontend/app/matches/[demoId]/page.tsx` and others
- Triggers: Browser navigation
- Responsibilities:
  - Render match details, player stats, heatmaps
  - Fetch data via React Query hooks

## Architectural Constraints

- **Threading:** Python worker runs single-threaded event loop with asyncio; in-flight job counting via threading.Lock for shutdown coordination
- **Global state:** Redis is distributed queue; no local shared state between workers. Demo status in PostgreSQL is source of truth
- **Circular imports:** PHP strict typed; prevented via constructor injection (no circular dependencies observed)
- **API contracts:** Symfony and Python communicate via JSON; no shared protocol buffers for app logic (only for demo file parsing)

## Anti-Patterns

### Long-Running Synchronous Operations

**What happens:** Frontend hits demo analysis endpoint, waits for Python worker result, returns 200 only after analysis complete

**Why it's wrong:** Blocks HTTP request for minutes; doesn't scale; frontend timeouts; poor UX

**Do this instead:** Use async job dispatch (current pattern) → return 202 Accepted immediately → frontend polls `/api/demos/{id}` for status → display loading UI until status changes to "done"

### Storing Raw Demo File in Database

**What happens:** Attempt to BLOB demo files into PostgreSQL

**Why it's wrong:** Demo files are 10-100 MB; database becomes bloated; slow backups; bad for OLTP

**Do this instead:** Store file path only (current pattern) → keep file on filesystem or S3 → reference via Demo.file_path → delete when demo deleted

### Trusting Python Results Without Token Auth

**What happens:** Any external service POSTs to `/api/internal/results` and inserts arbitrary scores

**Why it's wrong:** Security risk; attackers can fake high/low scores; leaderboards manipulated

**Do this instead:** Use token auth with `hash_equals()` (current pattern) → `RESULT_INGEST_TOKEN` env var → validate every request

## Error Handling

**Strategy:** Graceful degradation with explicit logging.

**Patterns:**
- **Demo parsing fails:** Record error in `Demo.error_message`, set status to "error", return via `ResultIngestController`
- **Feature extraction fails:** Log warning, return `None` for that feature; scorer handles missing features via weight redistribution
- **Redis queue down:** Worker retries connection with exponential backoff; logs to stdout for alerting
- **Database connection lost:** Python catches `psycopg2.Error`, logs to stdout, leaves job in queue for retry
- **HTTP webhook timeout:** Implement retries in Python (circuit breaker pattern recommended but not yet implemented)

## Cross-Cutting Concerns

**Logging:** 
- Symfony: Monolog via `symfony.log` (PSR-3 compatible); rotates daily
- Python: JSON structured logs to stdout (can be consumed by log aggregator like ELK)
- Frontend: Console logs + optional Sentry integration for errors

**Validation:**
- Symfony: Input validation in DTO classes (`UploadDemoRequest`); Symfony validator constraints
- Python: Type hints + runtime checks in feature extractors (raise `FeatureExtractionError` if data invalid)
- Frontend: React form validation + API response schema validation

**Authentication:**
- Symfony: JWT tokens from `SteamVerifyHandler` (Steam OpenID 2.0)
- NextAuth: Custom provider for Steam auth; stores JWT in session
- Python: No auth (worker is internal; only result webhook uses token auth)

---

*Architecture analysis: 2026-05-19*
