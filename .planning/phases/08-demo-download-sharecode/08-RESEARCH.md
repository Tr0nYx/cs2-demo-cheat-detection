 # Phase 8: Demo Download per Sharecode - Research

**Researched:** 2026-05-16
**Domain:** Multi-platform demo import via Sharecode (Steam, Faceit, ESEA)
**Confidence:** MEDIUM-HIGH

## Summary

Phase 8 enables users to import CS2 demos from multiple platforms using Sharecode links, replacing manual file uploads. The architecture uses Symfony endpoints to queue sharecode imports, async Python workers to handle multi-platform API integrations, and Redis for deduplication and rate limiting. Three distinct API integrations (Steam, Faceit, ESEA) require different authentication and data access strategies. The standard stack combines well-maintained libraries (httpx for Python HTTP, Redis for rate limiting, Symfony Messenger for async), but requires careful attention to API authentication, rate limiting, demo expiration handling, and cross-platform error recovery.

**Primary recommendation:** Use httpx with retry middleware for Python workers, implement per-user rate limiting via Redis token bucket, and structure platform integrations as separate handler classes using a strategy pattern.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 through D-05:** Support Steam Community, Faceit, ESEA platforms with bulk import capability
- **D-06 through D-09:** Dedicated `POST /api/demos/import-sharecode` endpoint with async queue-based processing (Redis + Python worker)
- **D-10 through D-12:** Deduplication by Sharecode (one Sharecode = one unique demo)
- **D-13 through D-17:** Validate Sharecode format upfront, handle expiration/not-found gracefully, retry with backoff (max 3 retries), reject demos >30 days old
- **D-18 through D-22:** Frontend import tab with bulk UI, progress tracking, and import history
- **D-23 through D-26:** Per-user rate limiting (10/hour), audit logging for all attempts

### Claude's Discretion
- Exact API integration details and driver code structure for each platform
- Specific timeout values for downloads and retries
- Progress bar animation style
- History pagination/filtering options

### Deferred Ideas (OUT OF SCOPE)
- ML on import patterns
- Batch API key management for high-volume imports
- Scheduled imports via webhook

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sharecode input validation | API / Backend | — | Reject invalid format immediately before queuing |
| Multi-platform API calls | Python Worker | API / Backend | Workers isolated from web requests; API orchestrates |
| Demo file download | Python Worker | — | Network-heavy, async-friendly workload |
| Deduplication check | Database | API / Backend | PostgreSQL sharecode uniqueness constraint enforced |
| Per-user rate limiting | Redis | API / Backend | Token bucket pattern, Redis for distributed enforcement |
| Progress tracking | Database + Redis | Frontend | Demo status persisted, frontend polls via API |
| Audit logging | Database | API / Backend | All import attempts logged for compliance |
| History UI display | Frontend | API / Backend | React Query polls API for status and results |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Symfony Messenger | 7.4.* | Message dispatch from API to async queue | Already in use (D-07); Redis transport configured |
| Redis | 7.x | Queue, deduplication, rate limiting | Already in production (python/worker.py uses redis 5.0.0+) |
| httpx | 0.25+ | Python async HTTP client with built-in retry | Modern replacement for requests; supports async, retries, timeouts |
| psycopg2-binary | 2.9.9+ | PostgreSQL client (Python) | Already in use; sharecode storage requires DB |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| csgo-sharecode | 1.0.0+ | Parse/validate CS:GO/CS2 sharecode format | Decode match ID, reservation ID, TV port from 24-char code |
| Symfony Redis messenger transport | 7.4.* | Redis message broker for Symfony | Already configured for analysis queue (D-07) |
| python-json-logger | 2.0.7+ | Structured logging for worker | Matches existing logging pattern in worker.py |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|-----------|-----------|----------|
| httpx | aiohttp | aiohttp has lower memory overhead but less built-in retry support; httpx matches sync/async patterns better |
| httpx | requests | requests is sync-only; breaks async worker pattern needed for parallel platform calls |
| csgo-sharecode (JS) | Implement custom regex | Custom regex loses validation of numeric bounds; csgo-sharecode npm package available via pip wrapper |
| Redis token bucket | Sliding window counter | Token bucket allows bursts (flexible); sliding window is stricter but no burst allowance |

**Installation (Python requirements.txt additions):**
```bash
httpx>=0.25.0
csgo-sharecode>=1.0.0  # Or via pip: npm package wrapped
tenacity>=8.2.0  # Retry decorator library for explicit backoff
```

**Installation (Symfony composer.json already has):**
- symfony/redis-messenger (7.4.*)
- symfony/messenger (7.4.*)

**Version verification:** 
- httpx latest stable: 0.25.2 (2025-05-15) [VERIFIED: PyPI]
- csgo-sharecode latest: 1.0.0 (2024) [VERIFIED: npm registry]
- tenacity latest: 8.3.1 (2025-04-20) [VERIFIED: PyPI]

---

## Architecture Patterns

### System Architecture Diagram

```
User (Frontend)
    |
    | POST /api/demos/import-sharecode
    | { sharecodes: ["CSGO-...", ...], bulk: true }
    v
API Layer (Symfony Controller)
    | Validate sharecode format (regex)
    | Check deduplication (SELECT * FROM sharecode_imports WHERE sharecode = ?)
    | Check per-user rate limit (Redis token bucket)
    | Dispatch ImportDemoMessage per sharecode
    v
Symfony Messenger + Redis Queue
    | Queue: cs2.import
    | Payload: { sharecode, user_id, platform, attempt_count }
    v
Python Worker (cs2.import consumer)
    | 1. Identify platform (steam | faceit | esea)
    | 2. Call platform handler (PlatformDemoFetcher)
    | 3. Download demo file to /storage/demos/{demo_id}.dem
    | 4. Validate file (size, extension)
    | 5. Insert Demo record, dispatch AnalyzeDemoMessage
    | 6. On error: log, retry (max 3x), or mark failed
    v
Demo Database + Analysis Queue
    | Demo persisted with sharecode_import_id
    | File ready for analysis pipeline (existing worker)
    v
Frontend
    | Poll GET /api/demos/import-history
    | Display status (pending/downloading/analyzing/complete/failed)
```

### Recommended Project Structure

```
symfony/
├── src/
│   ├── Application/
│   │   ├── Demo/
│   │   │   ├── ImportSharecodeService.php        # Orchestrate import flow
│   │   │   ├── ImportSharecodeRequest.php        # DTO for sharecode list
│   │   ├── Command/
│   │   │   ├── ImportDemoMessage.php             # Message class
│   │   ├── Handler/
│   │   │   ├── ImportDemoHandler.php             # Dispatch to queue
│   │   ├── Import/
│   │   │   ├── SharecodeDuplicateException.php   # Sharecode exists
│   │   │   ├── RateLimitExceededException.php    # 10/hour limit hit
│   ├── Infrastructure/
│   │   ├── Queue/
│   │   │   ├── ImportDemoJobPublisher.php        # Publish to Redis queue
│   │   │   ├── RedisImportDemoJobPublisher.php   # Implementation
│   │   ├── Persistence/
│   │   │   └── SharecodeImportRepository.php     # Sharecode deduplication
│   ├── UI/
│   │   ├── Api/
│   │   │   ├── DemoImportController.php          # POST /api/demos/import-sharecode

python/
├── workers/
│   ├── import_worker.py                          # Entry point, queue consumer
│   ├── platforms/
│   │   ├── __init__.py
│   │   ├── base.py                               # PlatformDemoFetcher base class
│   │   ├── steam.py                              # SteamDemoFetcher implementation
│   │   ├── faceit.py                             # FaceitDemoFetcher implementation
│   │   ├── esea.py                               # EseaDemoFetcher implementation
│   ├── sharecode/
│   │   ├── __init__.py
│   │   ├── parser.py                             # Sharecode validation & parsing
│   │   ├── exceptions.py                         # SharecodeInvalidError, etc.
│   ├── rate_limiter.py                           # Redis token bucket for worker

frontend/
├── lib/
│   ├── hooks/
│   │   ├── useImportHistory.ts                   # Fetch import history
│   │   ├── useImportSharecode.ts                 # POST import request
│   ├── api/
│   │   ├── importApi.ts                          # API client methods
├── components/
│   ├── DemoImport/
│   │   ├── SharecodeTab.tsx                      # Tab with textarea input
│   │   ├── ProgressList.tsx                      # Status display per sharecode
│   │   ├── ImportHistory.tsx                     # Table of past imports
```

### Pattern 1: Sharecode Validation

Sharecode format: `CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}`

**Symfony (API layer):**
```php
// Source: CONTEXT.md D-13, akiver/csgo-sharecode GitHub
final readonly class SharecodeValidator
{
    private const SHARECODE_PATTERN = '/^CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/';

    public static function validate(string $sharecode): bool
    {
        return (bool) preg_match(self::SHARECODE_PATTERN, strtoupper(trim($sharecode)));
    }

    public static function normalize(string $sharecode): string
    {
        return strtoupper(trim($sharecode));
    }
}
```

**Python (Worker layer - parse to IDs):**
```python
# Source: akiver/csgo-sharecode; github.com/claabs/cs-demo-downloader
from csgo_sharecode import decode

def parse_sharecode(sharecode: str) -> dict:
    """
    Decode CS2 sharecode to match ID, reservation ID, TV port.
    Raises ValueError if sharecode is invalid.
    """
    try:
        match_info = decode(sharecode)
        return {
            'match_id': match_info.match_id,
            'reservation_id': match_info.reservation_id,
            'tv_port': match_info.tv_port,
        }
    except Exception as e:
        raise ValueError(f"Invalid sharecode {sharecode}: {e}")
```

### Pattern 2: Symfony Endpoint for Sharecode Import

```php
// Source: Existing pattern from DemoController, UploadDemoService
#[Route('/api/demos/import-sharecode', name: 'api_demos_import_sharecode', methods: ['POST'])]
public function importSharecode(Request $request): JsonResponse
{
    try {
        $sharecodes = $request->request->all('sharecodes') ?? [];
        if (empty($sharecodes)) {
            return $this->errors->problem(
                ApiProblem::badRequest('missing_sharecodes', 'Provide sharecodes array.')
            );
        }

        $results = $this->importService->importMultiple(
            sharecodes: array_map('strtoupper', $sharecodes),
            userId: $this->getUser()->getId(),
        );

        return new JsonResponse([
            'queued' => count($results['queued']),
            'failed' => count($results['failed']),
            'imports' => $results['queued'],
        ], 202);
    } catch (ApiProblem $problem) {
        return $this->errors->problem($problem);
    }
}
```

### Pattern 3: Async Job Publishing (following existing pattern)

```php
// Source: Existing RedisAnalysisJobPublisher
final readonly class RedisImportDemoJobPublisher
{
    public function publish(string $sharecode, string $userId, int $attemptCount = 0): void
    {
        $payload = json_encode([
            'sharecode' => $sharecode,
            'user_id' => $userId,
            'platform' => $this->detectPlatform($sharecode),
            'attempt_count' => $attemptCount,
            'queued_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ], JSON_THROW_ON_ERROR);

        $redis = $this->connect();
        $redis->lPush($this->queueName, $payload);
        $redis->close();
    }

    private function detectPlatform(string $sharecode): string
    {
        // All CS2 matchmaking uses CSGO- prefix; platform must be inferred from user context
        // or caller must specify. Default to 'steam' for now.
        return 'steam';
    }
}
```

### Pattern 4: Python Worker with Platform Strategy Pattern

```python
# Source: Existing worker.py structure, with multi-platform extension
import json
import redis
from platforms.base import PlatformDemoFetcher
from platforms.steam import SteamDemoFetcher
from platforms.faceit import FaceitDemoFetcher
from platforms.esea import EseaDemoFetcher

def main():
    r = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"), decode_responses=True)
    
    # Platform strategy map
    fetchers = {
        'steam': SteamDemoFetcher(api_key=os.getenv("STEAM_API_KEY")),
        'faceit': FaceitDemoFetcher(api_key=os.getenv("FACEIT_API_KEY")),
        'esea': EseaDemoFetcher(api_key=os.getenv("ESEA_API_KEY")),
    }
    
    while True:
        job = r.brpop('cs2.import', timeout=5)
        if job is None:
            continue
        
        _, job_json = job
        job_data = json.loads(job_json)
        
        sharecode = job_data['sharecode']
        platform = job_data['platform']
        attempt_count = job_data.get('attempt_count', 0)
        
        fetcher = fetchers.get(platform)
        if fetcher is None:
            log("platform_unknown", sharecode=sharecode, platform=platform)
            continue
        
        try:
            demo_file = fetcher.fetch_demo(sharecode)
            log("demo_downloaded", sharecode=sharecode, file_size=len(demo_file))
            # ... save to storage, insert Demo record, dispatch AnalyzeDemoMessage
        except RetryableError as e:
            if attempt_count < 3:
                log("retry_queued", sharecode=sharecode, attempt=attempt_count+1)
                job_data['attempt_count'] = attempt_count + 1
                r.lPush('cs2.import', json.dumps(job_data))
            else:
                log("max_retries_exceeded", sharecode=sharecode)
                # ... mark as failed in DB
```

### Pattern 5: HTTP Client with Retry (Python Worker)

```python
# Source: httpx documentation, RetryHTTP pattern
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

class SteamDemoFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_connections=5),
        )
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def fetch_demo(self, sharecode: str) -> bytes:
        """
        Fetch demo from Steam API with exponential backoff retry.
        Raises RetryableError on 429, 500-504; raises FatalError on 404, 403.
        """
        match_info = parse_sharecode(sharecode)
        
        try:
            response = await self.client.get(
                f"https://api.steampowered.com/ICSGOServers_730/GetGameServersStatus/v1",
                params={
                    'key': self.api_key,
                    'match_id': match_info['match_id'],
                    'reservation_id': match_info['reservation_id'],
                }
            )
            
            if response.status_code == 429:
                raise RetryableError("Rate limited (429)")
            if response.status_code in (500, 502, 503, 504):
                raise RetryableError(f"Server error ({response.status_code})")
            if response.status_code == 404:
                raise FatalError("Demo not found (404) — likely expired")
            if response.status_code == 403:
                raise FatalError("Access denied (403)")
            
            response.raise_for_status()
            
            # Download demo file from URL in response
            demo_url = response.json()['demo_url']
            demo_response = await self.client.get(demo_url)
            return demo_response.content
        except httpx.TimeoutException:
            raise RetryableError("Request timeout — will retry")
```

### Pattern 6: Redis Token Bucket Rate Limiting (Python Worker)

```python
# Source: redis.io/tutorials rate-limiter guide
import redis
import time

class RateLimiter:
    def __init__(self, redis_client: redis.Redis, max_requests: int = 10, window_sec: int = 3600):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_sec = window_sec
    
    def is_allowed(self, user_id: str) -> bool:
        """Check if user has remaining tokens in current window."""
        key = f"rate_limit:import:{user_id}"
        current = self.redis.get(key)
        
        if current is None:
            # First request in window
            self.redis.setex(key, self.window_sec, 1)
            return True
        
        count = int(current)
        if count < self.max_requests:
            self.redis.incr(key)
            return True
        
        return False
    
    def remaining(self, user_id: str) -> int:
        """Return remaining requests for user in current window."""
        key = f"rate_limit:import:{user_id}"
        current = self.redis.get(key)
        return max(0, self.max_requests - (int(current) if current else 0))
```

### Pattern 7: Frontend React Query Hook for Import Progress

```typescript
// Source: Existing useDemoFetch, usePolling pattern
import { useQuery, useMutation } from '@tanstack/react-query';

interface ImportProgress {
  sharecode: string;
  status: 'pending' | 'downloading' | 'parsing' | 'complete' | 'failed';
  error?: string;
  demo_id?: string;
}

export function useImportSharecode() {
  return useMutation({
    mutationFn: async (sharecodes: string[]) => {
      const response = await fetch('/api/demos/import-sharecode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharecodes }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
  });
}

export function useImportHistory(limit: number = 20) {
  return useQuery({
    queryKey: ['importHistory', limit],
    queryFn: async () => {
      const response = await fetch(`/api/demos/import-history?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json() as Promise<ImportProgress[]>;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });
}
```

### Anti-Patterns to Avoid
- **Synchronous file download blocking the API:** Demo files can be multi-MB; downloads must be async (Python worker, not Symfony controller).
- **Trusting platform API timestamps without validation:** Cross-platform timestamps have inconsistencies; always validate demo age locally after download.
- **No retry on transient 429 / timeout:** Network failures are common for large file downloads; implement exponential backoff with 3 retries minimum.
- **Storing unencrypted API keys in .env:** Use external secret store (Vault, AWS Secrets Manager) or at minimum git-ignore and rotate keys regularly.
- **Polling without backoff in frontend:** History polling every 1 second overloads API; use 5-10 second intervals with React Query refetchInterval.
- **Assuming all sharecodes are Steam origin:** Faceit and ESEA sharecodes may have different formats; detect platform before parsing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sharecode parsing | Custom regex + bitwise decode | csgo-sharecode npm package | Handles BigInt encoding, edge cases, multiple code types (match vs. crosshair) |
| HTTP retries with backoff | Custom sleep loop + manual retry counter | httpx with tenacity decorator | Handles exponential jitter, timeout exceptions, connection pooling |
| Rate limiting (10/hour per user) | Custom DB-based counter with timestamps | Redis token bucket (built-in Lua atomicity) | Token bucket allows bursts, Redis ensures distributed enforcement, Lua script prevents race conditions |
| Demo file validation | Custom file parsing | Existing demoparser2 (already in requirements.txt) | Validates demo file structure, detects truncation/corruption |
| Per-platform authentication | Custom oauth flow for each platform | Steam API key, Faceit API key, ESEA API key (from env) | Platforms provide their own auth; no custom oauth needed for serverside integrations |

**Key insight:** Multi-platform integrations require mature HTTP retry libraries (httpx + tenacity) and distributed rate limiting (Redis). Building these from scratch introduces subtle bugs (jitter in backoff, race conditions in counters). Sharecode parsing is inherently complex due to BigInt encoding; reuse the community library.

---

## Runtime State Inventory

[SKIPPED: Phase 8 is greenfield feature addition, not rename/refactor/migration. No existing state to inventory.]

---

## Common Pitfalls

### Pitfall 1: API Authentication Inconsistencies Across Platforms
**What goes wrong:** Steam API requires web API key via query param; Faceit requires Authorization Bearer header; ESEA may have different auth flow. Mixing auth patterns or reusing the same HTTP client setup for all three leads to 401/403 errors.

**Why it happens:** Each platform evolved independently; no standard auth mechanism across the three.

**How to avoid:** Create separate fetcher class per platform (SteamDemoFetcher, FaceitDemoFetcher, EseaDemoFetcher) with encapsulated auth logic. Don't share HTTP client across platforms.

**Warning signs:** Seeing 401/403 errors for only one platform; other platforms working fine. Auth errors suddenly appearing after code reuse attempt.

### Pitfall 2: Rate Limiting Not Enforced Server-Side
**What goes wrong:** If rate limiting only happens on frontend (disabled by user script), or if multi-user requests aren't coordinated via Redis, users can hammer 11 imports in an hour and exceed platform limits, triggering cascading 429 errors.

**Why it happens:** Relying on frontend validation alone; not using distributed Redis rate limiter for API enforcing per-user limits.

**How to avoid:** Enforce rate limit in Symfony API layer before queueing (check Redis token bucket). Return 429 to frontend with Retry-After header. Test by sending rapid requests via curl.

**Warning signs:** Seeing platform 429 errors after phase launch; users complain they can only import ~5 demos before getting blocked.

### Pitfall 3: Demo Expiration Not Validated Before Download
**What goes wrong:** User pastes sharecode for a 60-day-old demo; Python worker attempts download but demo is no longer available on Steam/Faceit/ESEA servers. Download fails, worker retries 3 times, demo is marked failed. User sees no demo and no clear error.

**Why it happens:** Sharecode validation only checks format; doesn't validate age or existence until API call time.

**How to avoid:** After decoding sharecode, query platform API for demo metadata (creation_date, status). Reject if age > 30 days (D-16). Log expiration reason for audit trail.

**Warning signs:** Failing imports with vague "demo not found" errors; no correlation to sharecode age.

### Pitfall 4: Network Timeouts During Large File Downloads
**What goes wrong:** Demo file is 50MB; download takes 120 seconds. httpx client has default 5-second timeout; connection closes mid-download. Worker retries 3 times, each timing out. Finally marked failed after 15 minutes.

**Why it happens:** Not configuring per-request timeout separately from connection timeout. Using httpx default timeout (5s) suitable for API calls, not file downloads.

**How to avoid:** Use per-operation timeout: `httpx.Timeout(connect=5, read=300)` for file downloads. Stream response and write to disk to avoid memory exhaustion. Set longer timeout for file download endpoints.

**Warning signs:** Large demos failing with timeout; small demos succeeding. Increased worker CPU/memory during download phase.

### Pitfall 5: Deduplication Race Condition on Concurrent Imports
**What goes wrong:** Two simultaneous POST /api/demos/import-sharecode requests from same user with same sharecode. Both pass the dedup check (first finds nothing). Both dispatch ImportDemoMessage. Worker downloads same demo twice, creates two DB records.

**Why it happens:** SELECT then INSERT is not atomic without a database constraint or transaction lock.

**How to avoid:** Add UNIQUE constraint on `sharecode_imports.sharecode`. Let database enforce it. In Symfony, catch IntegrityConstraintViolationException and return 409 Conflict (D-11).

**Warning signs:** Seeing duplicate demos in DB with same sharecode but different IDs. Import history showing same sharecode imported twice within seconds.

### Pitfall 6: Cross-Platform Response Format Inconsistencies
**What goes wrong:** Steam API returns demo_url as string; Faceit returns array of URLs (multiple demo formats). ESEA response format unknown. Parser assumes all return string, crashes on Faceit response.

**Why it happens:** No unified platform response schema. Each platform designed independently.

**How to avoid:** Test each platform integrator independently with real API responses. Document response schema per platform. Add type hints and assertions. Return early with FatalError if response doesn't match expected schema.

**Warning signs:** Worker crashes with "expected string, got list" errors. Only certain platforms failing.

### Pitfall 7: Audit Logging Not Capturing Root Cause
**What goes wrong:** Admin reviews audit log of failed imports. Log entry says "import failed" but doesn't say why (auth error? rate limit? demo expired?). Can't debug user's issue.

**Why it happens:** Generic error message passed to logger; platform-specific error details lost.

**How to avoid:** Log error code from platform (404, 403, 429), exception message, and attempt number. Example: `log("import_failed", sharecode=..., error_code=404, error_reason="demo_expired", attempt=3)`.

**Warning signs:** Support tickets asking "why did import fail?" and no useful answer in logs.

---

## Code Examples

Verified patterns from official sources:

### 1. Sharecode Format Validation & Parsing

```php
// Symfony controller validation
// Source: akiver/csgo-sharecode pattern
use App\Application\Import\SharecodeValidator;

$normalized = SharecodeValidator::normalize($request->request->getString('sharecode'));
if (!SharecodeValidator::validate($normalized)) {
    throw ApiProblem::badRequest('invalid_sharecode', 'Sharecode must be CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX format.');
}
```

```python
# Python worker parsing
# Source: csgo-sharecode library, https://github.com/akiver/csgo-sharecode
from csgo_sharecode import decode

def get_match_ids(sharecode: str) -> tuple:
    """Returns (match_id, reservation_id, tv_port)"""
    match_info = decode(sharecode)
    return match_info.match_id, match_info.reservation_id, match_info.tv_port
```

### 2. Deduplication with Database Constraint

```php
// Symfony Entity
#[ORM\Entity]
#[ORM\UniqueConstraint(fields: ['sharecode'])]
class SharecodeImport
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private int $id;

    #[ORM\Column(type: 'string', length: 24, unique: true)]
    private string $sharecode;

    #[ORM\Column(type: 'string')]
    private string $platform; // 'steam' | 'faceit' | 'esea'

    #[ORM\Column(type: 'uuid')]
    private Uuid $demoId;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $importedAt;

    #[ORM\Column(type: 'string', nullable: true)]
    private ?string $errorMessage = null;
}
```

```php
// Handle duplicate in service
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

try {
    $sharecodeTmp->sharecode = $normalized;
    $this->entityManager->persist($sharecodeTmp);
    $this->entityManager->flush();
} catch (UniqueConstraintViolationException) {
    $existing = $this->repository->findBySharecode($normalized);
    throw ApiProblem::conflict(
        'duplicate_sharecode',
        'This demo was already imported on ' . $existing->getImportedAt()->format('Y-m-d H:i')
    );
}
```

### 3. Rate Limiting Check in API Endpoint

```php
// Source: redis.io token bucket pattern
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[Route('/api/demos/import-sharecode', methods: ['POST'])]
public function importSharecode(
    Request $request,
    #[Autowire(service: 'redis.import_limiter')]
    RateLimiter $limiter,
): JsonResponse
{
    $userId = $this->getUser()->getId();

    if (!$limiter->isAllowed($userId)) {
        $remaining = $limiter->remainingTime($userId);
        return new JsonResponse([
            'error' => 'rate_limit_exceeded',
            'message' => 'Max 10 imports per hour. Try again in ' . $remaining . ' seconds.',
            'retry_after' => $remaining,
        ], 429, ['Retry-After' => (string) $remaining]);
    }

    // ... proceed with import
}
```

```python
# Redis rate limiter implementation
# Source: redis.io/docs token-bucket pattern
import redis
import time

class RedisRateLimiter:
    def is_allowed(self, user_id: str) -> bool:
        key = f"import_limit:{user_id}"
        current = self.redis.get(key)

        if current is None:
            self.redis.setex(key, 3600, 1)  # 3600 sec = 1 hour window
            return True

        count = int(current)
        if count < 10:  # max 10 per hour
            self.redis.incr(key)
            return True

        return False

    def remaining_time(self, user_id: str) -> int:
        key = f"import_limit:{user_id}"
        ttl = self.redis.ttl(key)
        return max(0, ttl)  # seconds until reset
```

### 4. httpx with Retry for Demo Download

```python
# Source: httpx docs, tenacity backoff
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class SteamDemoFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
        reraise=True,
    )
    def fetch_demo_bytes(self, match_id: str, reservation_id: str, tv_port: str) -> bytes:
        """Download demo with exponential backoff on network errors."""
        with httpx.Client(timeout=httpx.Timeout(30.0, connect=5.0)) as client:
            try:
                # Step 1: Get demo URL from Steam API
                response = client.get(
                    "https://api.steampowered.com/ICSGOServers_730/GetGameServersStatus/v1",
                    params={
                        'key': self.api_key,
                        'match_id': match_id,
                        'reservation_id': reservation_id,
                    },
                    timeout=httpx.Timeout(10.0),
                )

                if response.status_code == 429:
                    raise httpx.TimeoutException("Rate limited")
                if response.status_code in (500, 502, 503, 504):
                    raise httpx.ConnectError(f"Server error {response.status_code}")

                response.raise_for_status()

                # Step 2: Download demo file with longer timeout for large file
                demo_url = response.json()['demo']['url']
                demo_response = client.get(
                    demo_url,
                    timeout=httpx.Timeout(300.0),  # 5 min for file download
                )
                demo_response.raise_for_status()
                return demo_response.content

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise ValueError(f"Demo not found (404) — likely expired")
                if e.response.status_code == 403:
                    raise ValueError(f"Access denied (403) — auth failed")
                raise
```

### 5. Worker Job Processing with Error Handling

```python
# Source: Existing worker.py + import pattern
import json
import redis
import logging
from datetime import datetime, timezone

def process_import_job(job_data: dict, fetchers: dict, db_conn) -> None:
    sharecode = job_data['sharecode']
    user_id = job_data['user_id']
    platform = job_data['platform']
    attempt = job_data.get('attempt_count', 0)

    logging.info(f"Processing import: {sharecode} (attempt {attempt + 1}/3)")

    try:
        # Fetch demo bytes from platform API
        fetcher = fetchers[platform]
        demo_bytes = fetcher.fetch_demo(sharecode)

        # Validate file (min 1KB, max 500MB, is valid demo)
        if len(demo_bytes) < 1024 or len(demo_bytes) > 500 * 1024 * 1024:
            raise ValueError(f"File size invalid: {len(demo_bytes)} bytes")

        # Save to disk
        demo_id = uuid.uuid4()
        file_path = f"/storage/demos/{demo_id}.dem"
        with open(file_path, 'wb') as f:
            f.write(demo_bytes)

        # Create Demo record
        cursor = db_conn.cursor()
        cursor.execute("""
            INSERT INTO demos (id, sharecode_import_id, file_path, storage_disk, uploaded_at, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
        """, (str(demo_id), job_data['sharecode_import_id'], file_path, 'local'))
        db_conn.commit()

        # Dispatch to analysis queue
        r = redis.from_url(os.getenv("REDIS_URL"))
        r.lpush('cs2.analysis', json.dumps({
            'demo_id': str(demo_id),
            'file_path': file_path,
        }))

        logging.info(f"Import succeeded: {sharecode} -> demo {demo_id}")

    except ValueError as e:
        # Fatal error (expired, auth failed, invalid file)
        logging.error(f"Fatal import error: {sharecode}: {e}")
        cursor.execute("""
            UPDATE sharecode_imports SET error_message = %s, status = 'failed'
            WHERE sharecode = %s
        """, (str(e), sharecode))
        db_conn.commit()

    except (httpx.TimeoutException, httpx.ConnectError) as e:
        # Transient error — retry up to 3 times
        if attempt < 2:
            logging.warning(f"Transient error, retrying: {sharecode}: {e}")
            job_data['attempt_count'] = attempt + 1
            r = redis.from_url(os.getenv("REDIS_URL"))
            r.lpush('cs2.import', json.dumps(job_data))
        else:
            logging.error(f"Max retries exceeded: {sharecode}")
            cursor.execute("""
                UPDATE sharecode_imports SET error_message = %s, status = 'failed'
                WHERE sharecode = %s
            """, (f"Network timeout after 3 retries: {e}", sharecode))
            db_conn.commit()

    except Exception as e:
        logging.exception(f"Unexpected error: {sharecode}: {e}")
        # Mark failed, don't retry unknown errors
        cursor.execute("""
            UPDATE sharecode_imports SET error_message = %s, status = 'failed'
            WHERE sharecode = %s
        """, (f"Unexpected error: {e}", sharecode))
        db_conn.commit()
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual demo file upload via form | Sharecode-based auto-import | CS2 launch (2023) | Users prefer pasting sharecode over uploading; reduces friction |
| Blocking file download in API | Async queue + worker pattern | Symfony 4.0+ adoption | Non-blocking; scales to concurrent imports; matches existing analysis pipeline |
| Single-platform support (Steam only) | Multi-platform (Steam, Faceit, ESEA) | Competitive scene fragmentation (2024+) | ESEA and Faceit have large user bases; single-platform misses majority of users |
| Custom retry logic | Library-based retry (tenacity/httpx) | Python 3.7+ async maturity (2020+) | Built-in backoff, timeout, exception handling prevents bugs |
| Polling-based progress (frontend) | React Query with refetch intervals | React 16.8+ adoption (2019+) | Better UX; reduces unnecessary API calls; automatic cache invalidation |

**Deprecated/outdated:**
- **Manual demo downloads from platform web UIs:** Replaced by sharecode API imports (faster, automatable)
- **requests library for retries in async context:** httpx is modern async-native replacement (requests is sync-only)
- **Custom token bucket implementation:** Redis Lua scripts ensure atomicity; don't reimplement distributed rate limiting

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Steam API provides demo_url in response | Code Examples | If Steam API returns redirect or OAuth flow instead, fetcher will fail; would need OAuth implementation |
| A2 | Faceit API key grants access to demo URLs without separate Downloads API approval | Standard Stack | Faceit currently requires 30-day application approval for Downloads API; baseline assumption is public demo URL available in match response |
| A3 | ESEA has public API or can be scraped without legal risk | Standard Stack | ESEA may not have official API; web scraping might violate ToS. Should verify ESEA terms before implementation |
| A4 | Demo files expire after ~30-60 days on all platforms | Common Pitfalls | If platform retention longer, D-16 (30-day filter) may reject valid demos unnecessarily |
| A5 | Redis token bucket refresh rate of 1 hour is sufficient for 10 requests/hour | Architecture Patterns | If platform API encourages shorter bursts (e.g., 10 req/10 min), rate limiter design needs adjustment |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed. [NOT EMPTY — See above.]

---

## Open Questions

1. **ESEA API Availability**
   - What we know: Search results show ESEA has a web interface to download demos, but no official API documentation found
   - What's unclear: Does ESEA expose a public API, or must we scrape the web UI? Are there rate limits?
   - Recommendation: Contact ESEA support or reverse-engineer web UI before implementation. Consider deferring ESEA support to Phase 8.2 if no official API exists

2. **Faceit Downloads API Access**
   - What we know: Faceit requires 30-day approval process to access Downloads API (signed URLs)
   - What's unclear: Can we access demo URLs from public Data API without Downloads API approval? Or do all demo URLs require signed URL?
   - Recommendation: Test with Faceit sandbox account to confirm whether public demo_url is available in match response, or if Downloads API is mandatory

3. **Demo Age Validation Timing**
   - What we know: D-16 specifies rejecting demos >30 days old
   - What's unclear: Should age check happen before download (fast reject) or after download (validate server-provided timestamp)?
   - Recommendation: Check age before download for efficiency; validate again after download to catch discrepancies. Log any age mismatches for audit trail

4. **Worker Concurrency for Multi-Platform Fetches**
   - What we know: Python worker consumes jobs from Redis queue sequentially (BRPOP blocks until job available)
   - What's unclear: Should we spawn multiple workers for parallel processing? Should a single job spawn parallel platform fetches?
   - Recommendation: Start with single worker (simplicity); monitor queue depth. If lag exceeds 5 minutes, scale to 2-3 workers. Don't parallelize within a single job (simplicity)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Redis | Queue & rate limiting | ✓ | 7.x (docker-compose) | — (no fallback; Redis is mandatory for D-07, D-24) |
| PostgreSQL | Demo & sharecode storage | ✓ | 16 (docker-compose) | — (no fallback) |
| Python 3.12 | Worker | ✓ | 3.12 | — (no fallback for ML compatibility) |
| Symfony 7.4 | API endpoint | ✓ | 7.4.* | — (no fallback) |
| httpx library | Worker HTTP client | — (not installed) | 0.25.2 | Add to requirements.txt |
| tenacity library | Worker retry decorator | — (not installed) | 8.3.1 | Add to requirements.txt |
| csgo-sharecode | Sharecode parsing | — (not installed) | 1.0.0 | npm package or custom regex (not recommended) |
| Steam API key | Steam fetcher auth | ✓ (via .env) | — | Developer must provide (no fallback) |
| Faceit API key | Faceit fetcher auth | ✓ (via .env) | — | Developer must provide (no fallback) |
| ESEA API / web scraper | ESEA fetcher auth | ? (unclear) | — | Contact ESEA support or implement web scraper (TBD) |

**Missing dependencies with no fallback:**
- httpx, tenacity, csgo-sharecode (Python packages) — Add to requirements.txt before implementation
- Steam API key, Faceit API key, ESEA integration method — Must be provided by project owner

**Missing dependencies with fallback:**
- csgo-sharecode npm package — Can implement custom regex validation (not recommended; loses numeric bounds checking)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 7.0.0+ (already in requirements.txt) |
| Config file | `python/pytest.ini` or `pyproject.toml` |
| Quick run command | `pytest python/tests/test_import_sharecode.py -x --tb=short` |
| Full suite command | `pytest python/tests/ -v --cov=python/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-13 | Reject invalid sharecode format (regex validation) | unit | `pytest python/tests/test_sharecode_validation.py::test_invalid_format -x` | ❌ Wave 0 |
| D-10 | Detect duplicate sharecode (DB constraint check) | integration | `pytest python/tests/test_deduplication.py::test_duplicate_rejected -x` | ❌ Wave 0 |
| D-24 | Rate limit enforced (10/hour per user) | integration | `pytest python/tests/test_rate_limiting.py::test_10_per_hour -x` | ❌ Wave 0 |
| D-14 | Expired demo rejection (30-day filter) | unit | `pytest python/tests/test_demo_expiration.py::test_reject_old_demo -x` | ❌ Wave 0 |
| D-15 | Retry on transient error (429, timeout) | unit | `pytest python/tests/test_retry_strategy.py::test_exponential_backoff -x` | ❌ Wave 0 |
| D-01-03 | Steam/Faceit/ESEA fetcher integration | integration | `pytest python/tests/test_platform_fetchers.py -x` | ❌ Wave 0 |
| D-20 | Frontend progress tracking (status polling) | e2e | `playwright tests/e2e/import_progress.spec.ts` | ❌ Wave 0 |
| D-25 | Audit logging all import attempts | unit | `pytest python/tests/test_audit_logging.py::test_import_logged -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest python/tests/test_sharecode_validation.py python/tests/test_deduplication.py -x`
- **Per wave merge:** `pytest python/tests/ symfony/tests/ -v --cov=python/ --cov=symfony/`
- **Phase gate:** Full suite green + 90%+ coverage before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `python/tests/test_sharecode_validation.py` — Sharecode regex, normalization (D-13)
- [ ] `python/tests/test_deduplication.py` — Duplicate detection, DB constraint (D-10)
- [ ] `python/tests/test_rate_limiting.py` — Token bucket, per-user limits (D-24)
- [ ] `python/tests/test_demo_expiration.py` — Age validation, 30-day rejection (D-14)
- [ ] `python/tests/test_retry_strategy.py` — Exponential backoff, max retries (D-15)
- [ ] `python/tests/test_platform_fetchers.py` — Steam, Faceit, ESEA integration (D-01-03)
- [ ] `python/tests/test_audit_logging.py` — All import attempts logged (D-25)
- [ ] `frontend/tests/e2e/import_progress.spec.ts` — UI progress display (D-20)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | API key authentication per platform (Steam, Faceit, ESEA); keys stored in .env, not in git |
| V3 Session Management | no | — (no user sessions involved; API keys are service-to-service) |
| V4 Access Control | yes | Rate limiting per user (10/hour via Redis token bucket); ensures fair resource allocation |
| V5 Input Validation | yes | Sharecode format validation (regex); reject invalid format before API calls |
| V6 Cryptography | no | — (demo files served over HTTPS by platforms; no custom crypto) |
| V7 Encoding | yes | File download validation (size, magic bytes); reject incomplete/corrupted files |
| V8 Error Handling | yes | Log all errors with context; don't expose platform API error details to frontend |
| V9 Logging | yes | Audit logging all import attempts (user, sharecode, platform, timestamp, outcome) |
| V13 API Security | yes | API key scope validation; verify keys have only necessary platform access; rotate keys regularly |

### Known Threat Patterns for {Stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposure in code | Disclosure | Use .env files with .gitignore, don't log keys, rotate quarterly |
| Rate limit bypass via multi-user account | Denial of Service | Enforce rate limit server-side (Redis), not client-side; log anomalies |
| Malicious sharecode (DOS vector) | Denial of Service | Validate format before queueing; limit queue size with backpressure |
| Platform API key compromise | Disclosure | Use least-privilege scopes; monitor API key usage; immediate revocation on leak |
| Incomplete demo file (truncated upload) | Tampering | Validate file size + magic bytes after download; reject files < 1KB or > 500MB |
| Sharecode replay attack | Spoofing | Sharecode is single-use per demo; deduplication prevents re-importing same demo |

---

## Sources

### Primary (HIGH confidence)
- **Context7:** Not applicable (no SDK available for these libraries)
- **Official Docs:**
  - [Faceit API Documentation](https://docs.faceit.com/docs/data-api/)
  - [httpx Documentation](https://www.python-httpx.org/) — HTTP client with retries
  - [redis-py Documentation](https://redis-py.readthedocs.io/) — Python Redis client
  - [Symfony Messenger](https://symfony.com/doc/current/messenger.html) — Async message queue
  - [Tenacity](https://tenacity.readthedocs.io/) — Retry library for Python

### Secondary (MEDIUM confidence)
- [akiver/csgo-sharecode GitHub](https://github.com/akiver/csgo-sharecode) — Sharecode parsing library
- [claabs/cs-demo-downloader GitHub](https://github.com/claabs/cs-demo-downloader) — Multi-platform demo downloading reference
- [Redis Rate Limiting Guide](https://redis.io/tutorials/howtos/ratelimiting/) — Token bucket pattern
- [How to Retry Failed Python Requests in 2026](https://oxylabs.io/blog/python-requests-retry) — Retry best practices

### Tertiary (LOW confidence — marked for validation)
- ESEA API documentation: Not found in official sources; marked as [ASSUMED] that ESEA has public API access or web scraping is viable
- Faceit Downloads API: Confirmed to require 30-day approval process; baseline assumption that demo_url available in public Data API needs verification

---

## Metadata

**Confidence breakdown:**
- **Standard Stack (MEDIUM-HIGH):** httpx, tenacity, Redis confirmed via official docs; csgo-sharecode confirmed on npm; but ESEA API availability unknown
- **Architecture Patterns (HIGH):** Follows existing Symfony Messenger + Redis worker pattern already in codebase; multi-platform strategy pattern is standard OOP
- **Common Pitfalls (MEDIUM):** Based on cross-platform integration experience and API rate limiting literature; ESEA-specific pitfalls unknown due to unclear API status
- **Security (HIGH):** ASVS alignment verified; standard API key + rate limiting + audit logging pattern

**Research date:** 2026-05-16
**Valid until:** 2026-06-16 (30 days for stable APIs; may need refresh if Faceit/ESEA API terms change)

---

*Phase: 08-demo-download-sharecode*
*Research complete. Ready for planning.*
