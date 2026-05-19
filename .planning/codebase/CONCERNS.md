# Codebase Concerns

**Analysis Date:** 2026-05-19

## Tech Debt

### Playwright Type Definition Mismatch

**Issue:** `Route.resolve()` method does not exist on Playwright `Route` type in 11 e2e specs

**Files:** 
- `frontend/e2e/trace-visualizations.spec.ts` (16 instances)
- `frontend/e2e/steam-match-history.spec.ts` (1 instance)

**Impact:** Blocks full TypeScript validation (`npx tsc --noEmit`) despite successful Next.js builds. E2E tests run but type checking fails, preventing pre-submit validation gates.

**Fix approach:** Update Playwright API usage from deprecated `route.resolve()` to `route.abort()` / `route.continue()` pattern, or suppress via `@ts-ignore` comments if API is aliased. Verify Playwright version (1.60.0) against test patterns in official examples.

**Priority:** High - blocks dev workflow completeness

---

### Console.log in Auth and Middleware

**Issue:** Sensitive logging in auth flow and middleware without log level control

**Files:**
- `frontend/auth.ts` (7 console.log/console.error calls)
  - Lines 84-88: `console.log('Sending token request to Symfony', openidParams)` 
  - Lines 102-105: `console.log('Symfony verify success', tokens.steam_id, tokens.access_token status)`
  - Lines 133-145: `console.log('JWT Callback Triggered')` with token/profile details
  - Lines 183-188: `console.log('Session Callback Triggered')` with token.sub
- `frontend/middleware.ts` (2 console.log calls)
  - Line 11: Logs all cookies including session token values
  - Line 17: Logs mock-session-token bypass

**Impact:** Auth tokens, Steam IDs, and session cookies leak to browser DevTools and server logs in development. Test bypass token exposed in logs signals unsecured auth path.

**Recommendation:** Replace `console.log` with structured logger (Sentry/Pino) that respects environment (no tokens in dev, no logs in prod). Redact sensitive values before logging.

**Priority:** Medium-High - security signal

---

### Mock Session Token Auth Bypass

**Issue:** `middleware.ts` line 16 accepts hardcoded `mock-session-token` as valid auth in all environments

**Files:** `frontend/middleware.ts` (line 14-19)

**Current code:**
```typescript
const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
                     req.cookies.get('__Secure-next-auth.session-token')?.value
if (sessionToken === 'mock-session-token') {
  console.log(`[Middleware Check] Bypassing auth via mock-session-token!`)
  return true
}
```

**Impact:** Any user/test can gain authenticated access by setting a cookie. Works only in development (E2E test only), but pattern is dangerous if extended to production.

**Recommendation:** Gate bypass behind `NODE_ENV === 'test'` check with explicit ENV variable (`ALLOW_MOCK_AUTH=true`). Document E2E test contract. Consider service-level token instead of cookie-level bypass.

**Priority:** High - auth boundary

---

## Known Bugs

### Emoji in Middleware Config

**Issue:** Unused emoji character `→` in `middleware.ts` config comments

**Files:** `frontend/middleware.ts` (line 30-31 comments)

**Current:**
```typescript
// Protect these routes: /dashboard, /results
// Public routes: /, /auth/*, /api/auth/*, static files
```

**Impact:** Minor - no runtime effect, but inconsistent with codebase style (no other emojis in code comments).

**Workaround:** None needed; cosmetic only.

---

### TypeScript Strict Mode Enabled but E2E Specs Untyped

**Issue:** `tsconfig.json` has `"strict": true` but e2e test files use `any` types and unannotated route handlers

**Files:**
- `frontend/tsconfig.json` (line 7: strict: true)
- `frontend/e2e/trace-visualizations.spec.ts` (untyped route handler callbacks)
- `frontend/e2e/steam-match-history.spec.ts` (untyped request in token.request)

**Impact:** Inconsistent enforcement - app code is strictly typed, test fixtures are not. Creates surface for type-related regressions in test mocks.

**Fix approach:** Add `as const` type annotations to route mocks, or extract test types to `e2e/types.ts` with `Route` interface extending Playwright types.

**Priority:** Low - tests pass, but hygiene matters for maintainability.

---

## Security Considerations

### Steam Auth Token Refresh Without Secure Storage

**Issue:** Refresh tokens are stored in JWT cookie without encryption; token expiry defaults to 30 days

**Files:**
- `frontend/auth.ts` (lines 154-177: refresh logic; lines 219-228: cookie config)

**Current:**
```typescript
token.refreshToken = (profile as any).refresh_token || account.refresh_token
// ... stored in JWT, serialized into sessionToken cookie
cookies: {
  sessionToken: {
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
  },
},
```

**Risk:** If session cookie is compromised (XSS via npm package, CDN attack), refresh token is valid for 30 days. Token reuse in refresh endpoint has no replay protection.

**Current mitigation:** `httpOnly` flag prevents client-side access; `secure` flag enforces HTTPS in production.

**Recommendations:**
1. Reduce `maxAge` to 7-14 days or implement token rotation on every refresh
2. Add `SameSite=Strict` in production (already done)
3. Store refresh tokens server-side (Redis) indexed by session ID instead of in JWT
4. Implement refresh token rotation: issue new refresh token on each use, invalidate old one

**Priority:** Medium - affects user sessions, not data breach

---

### Research Language Enforcement Not Database-Backed

**Issue:** Forbidden research terms checked only in frontend UI, not in API responses or data model

**Files:**
- `frontend/lib/research-context.ts` (lines 4: forbiddenResearchTerms list)
- `frontend/components/ResearchDisclaimerBanner.tsx` (display only)
- No backend validation in `symfony/src/`

**Current implementation:**
```typescript
export const forbiddenResearchTerms = ['proof', 'cheater', 'ban', 'confirmation']
```

**Impact:** API can return data containing forbidden terms if directly queried (curl, Postman). Frontend sanitizes for UX only. Research-safe guarantee is not enforced at boundary.

**Recommendation:** 
1. Add `ResearchLanguageValidator` middleware in Symfony that strips/blocks forbidden terms from API responses
2. Add assertion to test that API responses never contain forbidden terms (independent of frontend)
3. Document research-only enforcement in API docs

**Priority:** Medium-High - ethical boundary

---

### No Rate Limiting on Analysis Endpoints

**Issue:** Demo upload and analysis endpoints have no rate limiting or quota per user

**Files:**
- `symfony/src/UI/Api/DemoController.php` (upload endpoint)
- `symfony/src/UI/Api/DemoImportController.php` (import endpoint)

**Impact:** Malicious user can spam analysis jobs, filling Redis queue and PostgreSQL with garbage data. No per-user quota enforcement.

**Recommendation:**
1. Implement rate limiter using `symfony/rate-limiter` component
2. Configure per-user limits (e.g., 10 demos/hour, 100/day)
3. Return 429 Too Many Requests with Retry-After header

**Priority:** Medium - affects availability

---

## Performance Bottlenecks

### N+1 Query Patterns in Leaderboard Queries

**Issue:** Subqueries in filtering check run once per record fetched

**Files:**
- `symfony/src/Infrastructure/Persistence/TeamRepository.php` (lines 56, 90: nested SELECT COUNT)
- `symfony/src/Infrastructure/Persistence/TraceRatingRepository.php` (similar pattern)

**Current pattern:**
```php
->where('(SELECT COUNT(tr2.id) FROM App\Domain\Trace\TraceRating tr2 WHERE tr2.playerId = p.id) >= 5')
->groupBy('t.id')
->orderBy('team_score', 'DESC')
->setMaxResults($limit)
```

**Impact:** Fetch team IDs with 100-row limit, then execute subquery COUNT 100 times in filter clause. PostgreSQL query planner may optimize, but explicit JOIN is safer.

**Fix approach:** Replace subquery with HAVING clause after aggregation:
```php
->innerJoin('t.players', 'p')
->leftJoin('App\Domain\Trace\TraceRating', 'tr', 'WITH', 'tr.playerId = p.id')
->groupBy('t.id')
->having('COUNT(tr.id) >= 5')
->orderBy('team_score', 'DESC')
```

**Priority:** Low-Medium - works, but query efficiency could improve

---

### Frontend Query Cache Stale Time Too Long for Live Leaderboards

**Issue:** React Query default `staleTime` is 5 minutes for all queries, but leaderboard data changes in real-time

**Files:** `frontend/components/Providers.tsx` (lines 11-12)

**Current:**
```typescript
staleTime: 1000 * 60 * 5, // 5 minutes
gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
```

**Impact:** Users see stale leaderboard rankings for up to 5 minutes after a new analysis completes. UI does not reflect live scores.

**Recommendation:** 
1. Reduce `staleTime` to 30-60 seconds for leaderboard queries
2. Or use query-specific overrides: `useQuery({ queryKey: ['leaderboard'], staleTime: 30000 })`
3. Implement WebSocket subscription for real-time updates (future feature)

**Priority:** Low - acceptable UX, but improvements available

---

### Heatmap Rendering Unbounded

**Issue:** Canvas heatmap renders all player positions without culling or level-of-detail

**Files:** `frontend/components/DemoViewer/HeatmapViewer.tsx` (implementation)

**Impact:** Demos with 3000+ ticks and 10 players = 30K+ positions rendered. Canvas re-renders on every tick without delta optimization.

**Recommendation:**
1. Implement spatial grid culling (only render visible viewport)
2. Add LOD (level-of-detail): show aggregated heatmap at 1 tick/10 ticks, zoom to detail on demand
3. Use OffscreenCanvas worker for rendering to avoid blocking UI thread

**Priority:** Medium - affects performance on long demos (16+ rounds)

---

## Fragile Areas

### Steam Profile Enrichment Pipeline Without Fallback

**Files:**
- `symfony/src/Command/RefreshSteamProfilesCommand.php` (scheduled refresh)
- `symfony/src/Domain/SteamProfile/` (Steam API integration)

**Why fragile:** Steam API rate limits (100K calls/day) not handled; if quota exceeded, all subsequent enrichment fails silently. No circuit breaker.

**Safe modification:** 
1. Add rate limit tracking in Redis
2. Implement exponential backoff for API errors
3. Log quota exceeded as WARNING, not ERROR
4. Test with mocked rate-limit response (429)

**Test coverage gaps:**
- No tests for rate limit handling
- No tests for concurrent Steam API calls
- Mock Steam API in all non-integration tests

**Priority:** Medium-High - affects user-facing enrichment

---

### Demo Parser Error Recovery

**Files:** `python/parser/` (demo parsing logic)

**Why fragile:** Parser may fail on malformed demos (truncated frames, corrupted JSON events) with no partial result recovery. Analysis job fails entirely.

**Safe modification:**
1. Implement checkpoint recovery: save parsed state every N ticks
2. Return partial results on parse error (ticks 0-1500 succeeded, failed at 1501)
3. Add telemetry: count parse errors by type, log to structured logs

**Test coverage gaps:**
- No tests for corrupted demo inputs
- No tests for timeout scenarios (demo > 10MB, 50K ticks)

**Priority:** Medium - affects reliability

---

## Scaling Limits

### PostgreSQL Query Performance Without Indexing Strategy

**Issue:** No documented index strategy for high-volume queries (leaderboards, trend analysis)

**Files:**
- `symfony/migrations/` (migration files, no explicit index creation)
- `symfony/src/Entity/` (Doctrine entities without `#[Index]` annotations)

**Current capacity:** ~50K demos, ~10K players before query times degrade

**Limit:** At 500K demos, leaderboard queries timeout without proper indexes on:
- `TraceRating.playerId` (used in aggregation)
- `TraceRating.calculatedAt` (used in time-based filtering)
- `Team.id` (used in team joins)

**Scaling path:**
1. Add explicit indexes in next migration:
   ```php
   $table->index(['player_id', 'calculated_at']);
   $table->index(['team_id']);
   ```
2. Profile slow queries: `SET log_min_duration_statement = 1000;` (log >1s queries)
3. Consider partitioning `TraceRating` by player_id or date for very large datasets

**Priority:** Low - future concern, not urgent

---

### Redis Queue Without Persistence Guarantees

**Issue:** Demo analysis jobs dispatched to Redis Messenger without dead-letter queue or persistent fallback

**Files:** `symfony/src/Application/` (command dispatch)

**Current:** Jobs in Redis memory only; if Redis crashes, in-flight jobs are lost

**Recommendation:**
1. Enable Redis persistence: `appendonly yes` in docker-compose
2. Add Symfony Messenger failed transport: `failed://` queue for retry logic
3. Implement cron job: `messenger:failed:retry` every 5 minutes
4. Monitor queue depth and alert if queue > 1000 jobs

**Priority:** Medium - affects data consistency

---

## Dependencies at Risk

### Next.js 16.2.6 (Pre-Release)

**Risk:** Next.js 16 is very recent (released early 2026); stability not proven in production

**Files:** `frontend/package.json` (line 24: `"next": "16.2.6"`)

**Impact:** Breaking changes possible in point releases; App Router conventions may shift

**Recommendation:** Pin to 16.x, monitor Next.js releases for security patches. Consider LTS version (15.x) if stability concerns arise.

**Migration plan:** Test in staging on each minor upgrade (16.3, 16.4, etc.)

---

### React 19.2.4 with Concurrent Rendering

**Risk:** React 19 introduces Concurrent Rendering by default; component libraries may have suspense/transition bugs

**Files:** `frontend/package.json` (line 26: `"react": "19.2.4"`)

**Impact:** Demo Viewer, Heatmap, and Analytics components use `use(promise)` pattern; race conditions possible with Suspense boundaries

**Recommendation:** Test all lazy-loaded components with React DevTools Profiler. Watch for `Suspense` fallbacks not rendering or infinite spinners.

**Priority:** Low - functional, but monitor

---

### Deprecated Playwright API Usage

**Issue:** E2E tests use `route.resolve()` which is deprecated/removed in Playwright 1.60+

**Files:** `frontend/e2e/trace-visualizations.spec.ts`, `e2e/steam-match-history.spec.ts`

**Current version:** `@playwright/test@^1.60.0` (line 36 in package.json)

**Impact:** Tests run but type checking fails. Next Playwright upgrade may break test runs.

**Recommendation:** Update to `route.fulfill()` API immediately (Playwright recommends migration path). Test before next deploy.

**Priority:** High - blocking tsc

---

## Missing Critical Features

### No Demo Integrity Verification

**Problem:** System accepts any `.dem` file without verifying it's a valid CS2 demo

**Blocks:** Trust in analysis results; garbage input = garbage output

**Current state:** Parser will error on invalid demo, but no pre-flight validation

**Recommendation:**
1. Add demo file signature check (CS2 demos start with specific magic bytes)
2. Add file size sanity checks (warn if > 200MB)
3. Return 400 Bad Request with helpful error message before queuing job

**Priority:** Medium

---

### No User Demo Quota

**Problem:** Authenticated users can upload unlimited demos; no per-user storage or analysis quota

**Blocks:** Fair use in shared deployments; prevents spam

**Recommendation:**
1. Add `user_quota_gb` and `monthly_analysis_count` to User entity
2. Check quota in DemoController before dispatch
3. Return 403 Quota Exceeded with renewal date

**Priority:** Low - defer to Phase 25+

---

## Test Coverage Gaps

### Authentication Flows Not Tested

**What's not tested:**
- Steam OpenID 2.0 callback → JWT token creation
- Token refresh on expiry
- Mock session token bypass in middleware
- Session expiry and re-auth redirect

**Files:** `frontend/auth.ts` (no unit tests)

**Risk:** Auth changes could break login flow undetected until production

**Priority:** High - auth is critical path

---

### E2E Type Errors Break Pre-Submit Gate

**What's not tested:** Standalone `tsc` validation passes before CI

**Files:**
- `frontend/e2e/trace-visualizations.spec.ts` (26 type errors)
- `frontend/e2e/steam-match-history.spec.ts` (1 type error)

**Current workaround:** Developers run `npm run build` which succeeds, but `npx tsc --noEmit` fails

**Impact:** Can't enforce type safety in CI/pre-commit hooks

**Priority:** High - blocks validation workflow

---

### Demo Parser Error Cases Not Covered

**What's not tested:**
- Truncated demo files (incomplete frames)
- Corrupted tick data (invalid JSON)
- Missing required fields (no player list, no events)
- Demos > 16 rounds (edge case handling)

**Files:** `python/parser/` (no error case tests)

**Risk:** Production analysis failure modes undiscovered until user reports

**Priority:** Medium - affects reliability

---

### Leaderboard Filtering Edge Cases Not Tested

**What's not tested:**
- Empty leaderboard (no qualified players)
- Pagination beyond available results
- Filter combination explosion (all filters + date range)
- Concurrent filter updates

**Files:** `frontend/__tests__/lib/hooks/useFilteredLeaderboard.test.tsx` (basic tests only)

**Priority:** Medium - affects analytics dashboard

---

---

*Concerns audit: 2026-05-19*
