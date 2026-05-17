---
phase: 15
plan: 01a
type: execute
wave: 1
depends_on: []
files_modified:
  - symfony/src/Application/Query/GetFilteredDemosQuery.php
  - symfony/src/Application/Handler/GetFilteredDemosHandler.php
  - symfony/src/UI/Api/DemoController.php
  - symfony/src/Infrastructure/Persistence/DemoRepository.php
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - Backend query correctly applies all four filter dimensions (map, rating band, outcome, timeframe) without N+1 queries
    - GET /api/demos?filters endpoint validates all parameters against whitelist and rejects invalid values with 400
    - DemoRepository filters by current user's player_id, preventing access to other users' demos
    - Filter sidebar metadata endpoint (GET /api/analytics/filters/metadata) returns complete enum for UI
  artifacts:
    - path: symfony/src/Application/Query/GetFilteredDemosQuery.php
      provides: CQRS query for filtered demo retrieval
      min_lines: 25
    - path: symfony/src/Application/Handler/GetFilteredDemosHandler.php
      provides: Query handler with parameterized SQL WHERE clauses
      min_lines: 80
    - path: symfony/src/UI/Api/DemoController.php
      provides: Extended controller with GET /api/demos filtering endpoint + metadata
      min_lines: 50
  key_links:
    - from: DemoController.getDemosByFilter
      to: GetFilteredDemosHandler
      via: message bus dispatch
      pattern: queryBus->dispatch
    - from: GetFilteredDemosHandler
      to: DemoRepository
      via: QueryBuilder with conditional WHERE clauses
      pattern: createQueryBuilder.*where
    - from: GET /api/demos?filters
      to: database query
      via: parameterized SQL
      pattern: setParameter.*:map|:ratingBand|:outcome|:days

---

<objective>
Implement backend filtering infrastructure: CQRS query/handler layer with parameterized database queries, DemoController endpoint validation, and filter metadata API. This wave establishes the database query foundation that frontend hooks will consume.

Purpose: Filters are the foundation for user analysis scoping. Backend filtering is isolated from UI to enable parallel frontend work. Query/Handler patterns are tested independently before integration.

Output: Working /api/demos?filters endpoint with validation, parameterized queries, and metadata endpoint ready for frontend consumption.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/15-advanced-analytics-user-scoping/15-CONTEXT.md
@.planning/phases/15-advanced-analytics-user-scoping/15-RESEARCH.md
@.planning/phases/14-landing-steam-login/14-CONTEXT.md

Core entities and patterns:
@symfony/src/Domain/Demo/Demo.php (map field, status enum)
@symfony/src/Domain/Analysis/AnalysisResult.php (feature vectors, scores)
@symfony/src/Domain/Trace/TraceRating.php (trace_adjusted, trace_normalized, player_id, calculated_at)
@symfony/src/Infrastructure/Persistence/DemoRepository.php (existing query patterns)

Filter specification (from 15-CONTEXT.md):
- Map: Single or multi-select from extracted demo map values (Mirage, Inferno, Nuke, Ancient, Vertigo, Dust2, etc.)
- Opponent Rating Band: ['0-5', '5-10', '10+', null] mapped to trace_adjusted percentile buckets
- Game Outcome: ['win', 'loss', 'draw', null] — requires outcome field in demo or computed from team scores
- Timeframe: [7, 30, 90, 999] days (999 = all-time), null = all-time
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CQRS Query/Handler for filtered demos with parameterized filtering</name>
  <files>
    symfony/src/Application/Query/GetFilteredDemosQuery.php
    symfony/src/Application/Handler/GetFilteredDemosHandler.php
  </files>
  <read_first>
    symfony/src/Domain/Demo/Demo.php
    symfony/src/Domain/Trace/TraceRating.php
    symfony/src/Domain/Analysis/AnalysisResult.php
    symfony/src/Infrastructure/Persistence/DemoRepository.php
  </read_first>
  <action>
1. Create GetFilteredDemosQuery.php in symfony/src/Application/Query/ with:
   - Properties: userId (string, required), map (string|null), ratingBand (string|null), outcome (string|null), daysBack (int|null), limit (int, default 20), offset (int, default 0)
   - ratingBand enum: '0-5', '5-10', '10+', or null
   - outcome enum: 'win', 'loss', 'draw', or null
   - daysBack validation: Accept 7, 30, 90, 999 (999 = null = all-time), or custom integer
   - Constructor accepts all params and validates rating band + outcome against allowed values

2. Create GetFilteredDemosHandler.php implementing MessageHandler with __invoke(GetFilteredDemosQuery):
   - Use DemoRepository to build QueryBuilder with conditional WHERE clauses per D-01 in CONTEXT.md
   - Join: demo → analysisResults (LEFT JOIN to filter results for current user) → traceRating (LEFT JOIN for TRACE scores)
   - Filter 1 (map): If map !== null, add WHERE d.map = :map parameter
   - Filter 2 (ratingBand): If ratingBand !== null, map to trace_adjusted percentile:
     * '0-5' → tr.trace_adjusted < 0.33
     * '5-10' → tr.trace_adjusted BETWEEN 0.33 AND 0.67
     * '10+' → tr.trace_adjusted > 0.67
     (Rationale: Per A2 in RESEARCH.md, TRACE score is proxy for opponent skill rating)
   - Filter 3 (outcome): If outcome !== null, add WHERE d.outcome = :outcome parameter
     (Note: Assume Demo entity has outcome field; if missing, flag in acceptance_criteria and handle as Wave 0 gap)
   - Filter 4 (timeframe): If daysBack !== null and < 999, add WHERE d.uploadedAt >= DATE_SUB(NOW(), INTERVAL :days DAY)
   - User scope: Always add WHERE ar.player_id = :playerId (per ASVS V4 from 15-RESEARCH.md)
   - Pagination: setFirstResult($query->offset), setMaxResults($query->limit), ORDER BY d.uploadedAt DESC
   - Return FilteredDemosDto with:
     * demos array (id, map, status, uploadedAt, trace_adjusted)
     * total count (for pagination UI)
     * hasMore boolean
   - No N+1 queries: All JOINs and filters executed in single query, tested with database profiler

3. Add database index if missing:
   - Verify index on trace_rating(player_id, calculated_at) exists (per 15-RESEARCH.md Pitfall 5)
   - Verify index on demo(uploaded_at) and demo(map) exist for filter performance
   - If any missing, note in acceptance_criteria for Wave 0 migration

4. DTOs used:
   - FilteredDemosDto: Contains demos (DemoSummaryDto[]), total (int), hasMore (bool)
   - DemoSummaryDto: id (UUID), map (string), status (enum), uploadedAt (DateTime), trace_adjusted (float), outcome (string|null)
  </action>
  <verify>
    <automated>cd symfony && php bin/console lint:container && ./vendor/bin/phpunit tests/Application/Handler/GetFilteredDemosHandlerTest.php -v</automated>
  </verify>
  <acceptance_criteria>
    - GetFilteredDemosQuery.php exists with all required properties and constructor validation
    - GetFilteredDemosHandlerTest.php test file exists and all tests pass:
      * testFilterByMapReturnsOnlyMatchingDemos: Filter by map='Mirage' returns 2+ Mirage demos, 0 others
      * testFilterByRatingBandReturnsCorrectPercentiles: '0-5' band returns demos with trace_adjusted < 0.33
      * testFilterByOutcomeReturnsMatchingResults: outcome='win' returns only wins
      * testFilterByTimeframeReturnsRecentDemos: daysBack=30 returns no demos older than 30 days
      * testMultipleFiltersApplyAllConstraints: map + rating + outcome all combined correctly
      * testUserScopeEnforcement: Different user ID returns different results
      * testPaginationWorksCorrectly: limit=5, offset=5 skips first 5, returns next 5
    - Database query profiler shows single SELECT (no N+1 joins)
    - All query parameters bound (no string concatenation in WHERE clauses)
    - Demo.outcome field confirmed to exist; if missing, acceptance_criteria updated to: "outcome field must be added in Wave 0 migration"
  </acceptance_criteria>
  <done>CQRS query and handler fully implemented, tested, parameterized WHERE clauses prevent SQL injection, filters compose correctly, no N+1 queries</done>
</task>

<task type="auto">
  <name>Task 2: Extend DemoController with GET /api/demos?filters endpoint and expose filter metadata</name>
  <files>
    symfony/src/UI/Api/DemoController.php
  </files>
  <read_first>
    symfony/src/UI/Api/DemoController.php (existing method structure, JWT auth pattern)
    symfony/src/Application/Handler/GetFilteredDemosHandler.php (from Task 1)
  </read_first>
  <action>
1. Add new public method getDemosByFilter(Request $request, GetFilteredDemosHandler $handler, JwtTokenProvider $jwt):
   - Extract auth from JWT (per Phase 14 pattern): user_id from token, validate httpOnly cookie present
   - Extract query parameters from Request:
     * map: string|null (validate against enum of known CS2 maps: mirage, inferno, nuke, ancient, vertigo, dust2, etc. — reject unknown maps with 400)
     * rating_band: string|null (validate against ['0-5', '5-10', '10+'] — reject others with 400)
     * outcome: string|null (validate against ['win', 'loss', 'draw'] — reject others with 400)
     * days_back: int|null (validate against [7, 30, 90, 999] — reject others with 400)
     * limit: int, default 20 (validate 1-100, reject > 100 with 400)
     * offset: int, default 0 (validate >= 0)
   - Create GetFilteredDemosQuery from parameters (map, ratingBand, outcome, daysBack, limit, offset, userId from JWT)
   - Dispatch via message bus: $this->queryBus->dispatch($query)
   - Serialize response using SymfonySerializer with DemoSummaryDto
   - Return JsonResponse with status 200, include X-Total-Count header (for pagination UI)

2. Add new public method getFilterMetadata() -> JsonResponse:
   - Return static JSON with filter options:
     * maps: ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Vertigo', 'Dust2', 'Anubis'] (alphabetical)
     * ratingBands: [{ id: '0-5', label: 'Below 5 RWS' }, { id: '5-10', label: '5-10 RWS' }, { id: '10+', label: '10+ RWS' }]
     * outcomes: [{ id: 'win', label: 'Win' }, { id: 'loss', label: 'Loss' }, { id: 'draw', label: 'Draw' }]
     * timeframes: [{ id: '7', label: 'Last 7 days' }, { id: '30', label: 'Last 30 days' }, { id: '90', label: 'Last 90 days' }, { id: '999', label: 'All-time' }]
   - Route: GET /api/analytics/filters/metadata
   - No auth required (public metadata)
   - Cache response in Redis for 1 hour (static data, no need to recompute)

3. Routing attributes per Symfony 7 pattern:
   - GET /api/demos?filters → #[Route('/api/demos', methods: ['GET'])] with existing endpoint; add new filter parsing logic
   - OR create separate #[Route('/api/demos/filtered', methods: ['GET'])] and leave old endpoint unchanged
   - (Recommendation: Use existing /api/demos endpoint with backward-compatible query params)

4. Error handling:
   - Invalid map → 400 with message: "Invalid map. Allowed values: Mirage, Inferno, ..."
   - Invalid rating_band → 400 with message: "Invalid rating band. Allowed values: 0-5, 5-10, 10+"
   - Invalid outcome → 400 with message: "Invalid outcome. Allowed values: win, loss, draw"
   - Invalid days_back → 400 with message: "Invalid timeframe. Allowed values: 7, 30, 90, 999"
   - Unauthorized (no JWT or expired) → 401 (existing auth middleware)
  </action>
  <verify>
    <automated>cd symfony && ./vendor/bin/phpunit tests/UI/Api/DemoControllerTest.php::testGetFilteredDemos -v && curl -H "Authorization: Bearer {valid_jwt}" "http://localhost/api/demos?map=mirage&rating_band=0-5&limit=5" 2>/dev/null | jq .</automated>
  </verify>
  <acceptance_criteria>
    - GET /api/demos?map=Mirage&rating_band=0-5 returns 200 with filtered demo list
    - Response includes X-Total-Count header with integer value
    - Invalid map parameter returns 400 with descriptive error message
    - Invalid rating_band returns 400
    - Invalid outcome returns 400
    - Invalid days_back returns 400
    - Unauthorized request (no JWT) returns 401
    - getFilterMetadata() returns 200 with full filter enum JSON structure
    - All string parameters case-insensitive for map (e.g., 'mirage', 'Mirage', 'MIRAGE' all work)
    - Curl test confirms demo list returns in expected structure with trace_adjusted scores included
  </acceptance_criteria>
  <done>DemoController extended with filter parsing, validation, and response formatting; metadata endpoint provides UI with enum values; all error cases return appropriate HTTP status codes</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Frontend → Backend API | Untrusted query parameters (map, rating_band, outcome, days_back) from URL; must validate all values against whitelist |
| Authenticated → Unauthenticated | JWT token in httpOnly cookie; if expired, user auto-redirected to login (existing Phase 14 behavior) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-01a | Tampering | GET /api/demos?map=Mirage' OR '1'='1 | Mitigate | Use Doctrine QueryBuilder with parameterized queries; test with common SQL injection payloads ('OR '1'='1, UNION SELECT, etc.) |
| T-15-01b | Information Disclosure | User A queries filters, sees User B's demos | Mitigate | Always add WHERE ar.player_id = :playerId from JWT; unit test verifies different user_id returns different results |
| T-15-01c | Denial of Service | POST large offset (offset=99999999) | Mitigate | Validate offset >= 0 and < (total + 1000); return 400 if invalid; limit query depth via LIMIT clause |

</threat_model>

<verification>
**Phase 15 Wave 1a Checklist:**

- [ ] GetFilteredDemosQuery and GetFilteredDemosHandler implemented with parameterized WHERE clauses (no SQL injection)
- [ ] DemoController.getDemosByFilter validates all query params against whitelist (map, rating_band, outcome, days_back)
- [ ] User scope enforcement: Always filter by current user's player_id (ASVS V4)
- [ ] All unit tests pass: `cd symfony && ./vendor/bin/phpunit tests/Application/Handler/GetFilteredDemosHandlerTest.php`
- [ ] Database query profiler shows single SELECT (no N+1 joins)
- [ ] getFilterMetadata() endpoint returns complete filter enum without auth required
- [ ] Database indexes present on demo(map), demo(uploadedAt), trace_rating(player_id, calculated_at)
- [ ] Error handling: Invalid map/rating/outcome/days_back return 400 with descriptive messages
- [ ] Security: User cannot access other users' demos via filter manipulation (verified by unit test)

**Open Questions for Executor:**

1. Does Demo entity have `outcome` field (win/loss/draw)? If not, flag as Wave 0 gap to add in migration.
2. Are database indexes on demo(map), demo(uploadedAt) already present from Phase 13? Confirm in schema.
3. Redis connection already configured for metadata caching? If not, use in-memory cache as fallback.
</verification>

<success_criteria>
**Wave 1a Complete When:**

1. GET /api/demos?map=Mirage&rating_band=0-5&days_back=30 returns correct filtered list (verified with curl)
2. Backend rejects invalid filter values with 400 + descriptive error message
3. No SQL injection vulnerabilities (parameterized queries only)
4. User cannot access other users' demos (scope enforcement via JWT player_id)
5. All unit/integration tests pass: `make test-unit`
6. GET /api/analytics/filters/metadata returns complete filter enum in expected JSON structure
7. Database query profiler confirms single SELECT with proper JOINs (no N+1)
8. Ready to proceed to Wave 1b (frontend hooks and dashboard integration)

**Definition of Done:**

- Wave 1a SUMMARY.md committed to git with full execution notes
- All acceptance_criteria met for each task
- No blocking issues or warnings in console logs
- Backend filtering API ready for frontend consumption
</success_criteria>

<output>
After completion, create `.planning/phases/15-advanced-analytics-user-scoping/15-01a-SUMMARY.md`

Required sections:
- What was built (GetFilteredDemosQuery/Handler, DemoController endpoint, metadata API)
- Verify each acceptance criteria (tests pass, no SQL injection, user scope enforced)
- Note any gaps discovered (e.g., missing Demo.outcome field → escalate as Wave 0)
- File changes (commit hashes, line counts added)
- Performance notes (query time, response payload size)
- Test coverage (unit/integration test counts, % of code tested)
- Next steps (Wave 1b ready to begin independently)
</output>
