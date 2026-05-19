# External Integrations

**Analysis Date:** 2026-05-19

## APIs & External Services

**Steam Community (Valve):**
- Steam API (GetPlayerSummaries, GetNextMatchSharingCode, inventory endpoints)
  - SDK/Client: `symfony/src/Infrastructure/Steam/SteamProfileClient.php`, `SteamMatchHistoryClient.php`
  - Auth: `STEAM_API_KEY` environment variable
  - Endpoints:
    - `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/` - Fetch player profile data
    - `https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1` - Get next match sharecode
    - Steam WebAPI for inventory and market data via `SteamInventoryClient.php`, `SteamMarketPriceClient.php`
  - Rate limiting: Handles 429 responses with exponential backoff
  - Timeout: 8 seconds per request

**Steam OpenID 2.0 (Authentication):**
- Endpoint: `https://steamcommunity.com/openid/login`
  - Implementation: `frontend/auth.ts` - NextAuth steam provider
  - Purpose: User authentication via Steam account
  - Backend validation: `symfony/src/Infrastructure/Steam/SteamOpenIdValidator.php`
  - JWT token generation: `symfony/src/Application/Auth/SteamVerifyHandler.php`

**HLTV Match Data (Web Scraping):**
- Service: Browser-based scraper for HLTV.org match pages
  - Implementation: `hltv-scraper/` - Express.js + Playwright service
  - Purpose: Extract demo URLs, match stats, and player performance data
  - Technology: Playwright with stealth plugin to bypass Cloudflare detection
  - Endpoint: POST `/scrape` accepts HLTV match URLs
  - Failure handling: Returns 503 if blocked by Cloudflare
  - Container: Runs as separate Docker service on port 3001

**Valve Demo Servers:**
- Purpose: Download CS2 demo files from sharecode
  - Implementation: `python/platforms/steam.py` - `SteamDemoFetcher` class
  - Protocol: HTTPS download of .dem files
  - Retry strategy: 3 attempts with exponential backoff (2-10s intervals)
  - Timeout: 5s connect, 300s read timeout (for large files ~50MB)

## Data Storage

**Databases:**
- PostgreSQL 16 (primary application database)
  - Connection: `DATABASE_URL` environment variable (format: `postgresql://user:pass@host:port/db`)
  - Client: PHP via Doctrine DBAL/ORM, Python via psycopg2-binary
  - Purpose: Stores demos, analysis results, user accounts, leaderboard data, Steam profiles
  - Tables: See `symfony/src/Entity/` and `symfony/migrations/`
  - Health check: Container validates with `pg_isready`

**Redis (Cache and Message Queue):**
- Purpose: Pub/sub message broker and caching layer
  - Connection: `REDIS_URL` environment variable (format: `redis://[user:pass@]host:port[/db]`)
  - Client: PHP native `\Redis` extension, Python `redis>=5.0.0` library
  - Queues (Redis Streams):
    - `cs2.analysis` - ML pipeline job queue
    - `cs2.analysis.dispatch` - Analysis dispatch queue
    - `cs2.import` - Demo import queue
    - `cs2.steam_profile` - Steam profile refresh queue
    - `cs2.steam_match_history` - Match history tracking queue
    - `cs2.viewer` - Demo viewer heatmap/visualization queue
    - `cs2.results` - Result ingestion queue
    - `redis://redis:6379/messages` - Symfony Messenger default transport
    - `redis://redis:6379/failed` - Failed message dead-letter queue
  - TTL: Configurable per queue
  - Persistence: AOF (append-only file) enabled in docker-compose
  - Health check: Container validates with `redis-cli ping`

**File Storage:**
- Local filesystem with volume mounting
  - Path: `DEMO_STORAGE_PATH` (default: `/storage/demos`)
  - Purpose: Store uploaded .dem files
  - Docker volume: `demo_storage` - shared across PHP and Python services
  - Max size: Configured via `MAX_DEMO_UPLOAD_SIZE` (default: 2GB)
  - Implementation: `symfony/src/Infrastructure/Storage/LocalDemoStorage.php`

**Cache Storage:**
- Redis (primary)
  - Heatmap cache: `DemoHeatmapCacheRepository.php`
  - Tick data cache: `DemoTickCacheRepository.php`
- Optional file-based backup (Symfony cache pool)

## Authentication & Identity

**Auth Provider:**
- Steam Community OpenID 2.0 (Valve)
  - Implementation: NextAuth.js frontend, Symfony backend verification
  - Flow:
    1. Frontend redirects to Steam OpenID endpoint
    2. Steam verifies and redirects back with openid parameters
    3. Frontend calls `/api/auth/steam-verify` on backend
    4. Backend validates signature and returns JWT + refresh token
    5. Frontend stores JWT in NextAuth session
  - Token endpoints:
    - `POST /api/auth/steam-verify` - Initial authentication
    - `POST /api/auth/refresh` - Token refresh (expiry handling)
    - `POST /api/auth/me` - Get current user profile

**JWT Implementation:**
- Secret: `JWT_SECRET` environment variable
- Algorithm: HS256 (assumed by NextAuth)
- Tokens issued by: `symfony/src/Application/Auth/SteamVerifyHandler.php`
- Expiry handling: Automatic refresh when `expiresAt` < current time
- Refresh tokens stored in: User entity + browser session

**Authorization:**
- Role-based access control (RBAC) via user entity
- Steam ID validation for user-owned demo access

## Monitoring & Observability

**Error Tracking:**
- Sentry (optional, frontend only)
  - DSN: `NEXT_PUBLIC_SENTRY_DSN` environment variable
  - Implementation: `@sentry/nextjs` 10.53.1
  - Captures: Unhandled exceptions, API errors, performance metrics
  - Configuration via env vars: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

**Logs:**
- Python: JSON-structured logging via `python-json-logger`
  - Format: JSON for ELK/Datadog compatibility
  - Stdout capture in Docker logs
- PHP: Symfony monolog to stdout
- Node.js: Express/Next.js default logging to stdout
- All stdout captured in Docker container logs

**Metrics:**
- Custom metrics endpoint: `GET /api/metrics/public` (no auth)
  - Implementation: `symfony/src/Application/Metrics/PublicMetricsService.php`
  - Updated via `symfony/src/Command/UpdatePublicMetricsCommand.php` (cron job)
  - Contains: Global cheat detection statistics, match counts

## CI/CD & Deployment

**Hosting:**
- Docker containers orchestrated by docker-compose (development) or Kubernetes (production)
- Services:
  - `cs2-php` - Symfony API (port 80 internal, 8080 external)
  - `cs2-python` - ML worker (async, no exposed port)
  - `cs2-php-steam-scheduler` - Cron-like service for Steam tracking
  - `cs2-php-steam-consumer` - Message consumer for Steam tasks
  - `cs2-frontend` - Next.js app (port 3000)
  - `cs2-hltv-scraper` - Playwright scraper (port 3001)
  - `cs2-postgres` - Database (port 5432 exposed for local dev)
  - `cs2-redis` - Cache/queue (port 6379 exposed for local dev)
  - `cs2-nginx` - Reverse proxy (port 8080)

**CI Pipeline:**
- Not detected in codebase (would be in `.github/workflows/` or GitLab CI)

**Build Process:**
- Backend: Composer install, cache clear, migrations
- Frontend: npm ci, npm run build (Next.js standalone)
- Python: pip install from requirements.txt

## Environment Configuration

**Required env vars:**

**Backend (Symfony):**
- `APP_ENV` - Environment (dev/test/prod)
- `APP_DEBUG` - Debug mode (0/1)
- `APP_SECRET` - Symfony secret key
- `APP_URL` - Full API URL for CORS
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `MESSENGER_TRANSPORT_DSN` - Redis Stream for main queue
- `MESSENGER_FAILED_TRANSPORT_DSN` - Redis Stream for DLQ
- `STEAM_API_KEY` - Valve API key (required for profile/match fetching)
- `JWT_SECRET` - Secret for JWT token signing
- `STEAM_MATCH_HISTORY_ENCRYPTION_KEY` - Encryption key for stored sharecode seeds
- `CORS_ALLOW_ORIGIN` - CORS header regex pattern
- `DEMO_STORAGE_DISK` - Storage backend (local/s3)
- `DEMO_STORAGE_PATH` - Path to demo file storage
- `MAX_DEMO_UPLOAD_SIZE` - Max upload size in bytes (default: 2GB)
- Various queue names: `SYMFONY_ANALYSIS_QUEUE`, `PYTHON_WORKER_QUEUE`, `RESULT_INGEST_QUEUE`
- `RESULT_INGEST_TOKEN` - Token for result endpoint authentication

**Frontend (Next.js):**
- `NEXT_PUBLIC_API_URL` - Backend API base URL (browser-accessible)
- `INTERNAL_API_URL` - Backend API for server-side calls (Docker-internal)
- `NODE_ENV` - Environment (development/production)
- `NEXTAUTH_SECRET` - NextAuth session encryption key
- `NEXTAUTH_URL` - Frontend URL for callback
- `STEAM_APP_ID` - Steam app ID for OpenID (default: 570 for CS2)
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking (optional)
- Sentry build config: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

**Python Worker:**
- `REDIS_URL` - Redis connection
- `DATABASE_URL` - PostgreSQL connection
- `DEMO_STORAGE_PATH` - Where to find demo files
- `PYTHON_WORKER_QUEUE` - Queue name to consume from
- `WORKER_LOG_LEVEL` - Log level (DEBUG/INFO/WARNING)
- `WORKER_IDLE_ON_START` - Start in idle mode (for debugging)
- `WORKER_POLL_TIMEOUT_SECONDS` - Queue poll interval
- `WORKER_SHUTDOWN_GRACE_SECONDS` - Graceful shutdown timeout
- `HF_TOKEN` - Hugging Face API key (for downloading models)
- `CS2CD_DATASET_ID` - Hugging Face dataset ID
- `ANTICHEATPT_MODEL_ID` - Hugging Face model ID for AntiCheatPT
- `ML_BATCH_SIZE`, `ML_LEARNING_RATE`, `ML_DEVICE` - ML config
- `ML_DATA_DIR`, `ML_CHECKPOINT_DIR` - ML file paths

**Secrets location:**
- Development: `.env.local` file (git-ignored)
- Production: Container environment variables or secrets management system
- Docker-compose: Defaults in `docker-compose.yml` (CHANGE in production)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/results/ingest` - Results from Python worker
  - Token auth via `RESULT_INGEST_TOKEN`
  - Payload: Analysis results from ML pipeline
  - Implementation: `symfony/src/UI/Api/ResultIngestController.php`

- `POST /api/demos/import/hltv` - Import from HLTV scraper
  - Implementation: `symfony/src/Application/Demo/HltvImportController.php`

- `POST /api/auth/steam-verify` - Steam OpenID callback
  - Called by frontend after Steam verification

**Outgoing:**
- None detected (unidirectional integrations only)
- Python worker reads from Redis queues, no HTTP webhooks
- Demo downloads are synchronous HTTP requests (not webhooks)

## Internal Module Connections

**Data Flow:**
1. **Demo Upload** → `DemoImportController` → `ImportDemoMessage` (queue) → Python worker
2. **Python Analysis** → Results via `ResultIngestController` → Database updates
3. **Steam Auth** → Frontend redirects to Steam → Callback to `SteamVerifyHandler` → JWT issued
4. **Steam Profile Tracking** → `TrackSteamMatchHistoryCommand` (scheduler) → `SteamMatchHistoryClient` → Database update
5. **Demo Viewer** → `GenerateHeatmapHandler` → Queue → Python worker → Cache storage
6. **Leaderboard** → Event listener updates on analysis completion
7. **HLTV Scraper** → Browser automation → API endpoint for match data ingestion

**Async Communication:**
- Backend uses Symfony Messenger (Redis Streams)
- Python uses Redis client for queue polling
- Message routing: `symfony/config/packages/messenger.yaml`

---

*Integration audit: 2026-05-19*
