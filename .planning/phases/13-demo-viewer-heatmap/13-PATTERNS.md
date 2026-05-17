# Phase 13: Pattern Map

## Python Patterns

| New Area | Closest Existing Pattern | Notes |
|----------|--------------------------|-------|
| `python/viewer/map_config.py` | `python/parser/types.py` | Small typed dataclasses, plain functions, pytest coverage |
| `python/viewer/tick_exporter.py` | `python/parser/adapter.py`, `python/worker.py` | Parse once through `DemoParserAdapter`, transform pandas frames into compact JSON chunks |
| `python/viewer/worker_viewer.py` | `python/worker.py`, `python/import_worker.py` | Redis `BRPOP`, structured JSON logs, SIGTERM handling, env-based queue names |
| `python/viewer/heatmap.py` | `python/features/*.py` | Typed functions, docstrings, no placeholder branches |
| `python/viewer/grenade_analyzer.py` | `python/features/base.py` | Deterministic calculations with unit tests |

## Symfony Patterns

| New Area | Closest Existing Pattern | Notes |
|----------|--------------------------|-------|
| Viewer controllers | `symfony/src/Presentation/Controller/LeaderboardController.php` | Query validation, `ApiErrorResponder`, JSON response headers |
| Demo status lookup | `symfony/src/UI/Api/DemoController.php` | `DemoRepository::findByUuidString` and 404 behavior |
| Result-derived persistence | `symfony/src/Application/Result/ResultIngestHandler.php` | Extend ingest to project viewer event summaries from payload/support data |
| Redis queue/cache | `symfony/src/Infrastructure/Queue/RedisAnalysisJobPublisher.php` | Parse `REDIS_URL`, use `\Redis`, close connection |
| Doctrine entities | `symfony/src/Domain/Analysis/AnalysisResult.php`, `symfony/src/Domain/Demo/Demo.php` | UUID primary keys, Doctrine attributes, cascade to demo |
| Migrations | `symfony/migrations/Version*.php` | Manual DBAL schema changes are acceptable |

## Frontend Patterns

| New Area | Closest Existing Pattern | Notes |
|----------|--------------------------|-------|
| API helpers | `frontend/lib/api.ts` | Add typed functions and image URL builder |
| React Query hooks | `frontend/lib/hooks/useTraceQuery.ts` | Query keys, stale time, explicit 404/cache-miss handling |
| UI components | `frontend/components/DemoDetail/*` | Client components, typed props, testing via `__tests__/components` |
| Route integration | `frontend/app/results/[id]/page.tsx` | Add viewer section to existing result page or a nested viewer route |
| E2E tests | `frontend/e2e/trace-visualizations.spec.ts` | Add viewport checks and canvas nonblank assertion |

## Cross-Cutting Constraints

- No raw ticks in PostgreSQL.
- Suspicion labels are research signals only.
- Python owns demo parsing/render prep; Symfony owns API/product contracts.
- Frontend Canvas loop must not allocate large DOM trees per tick.
- All new endpoints must validate user-controlled params before DB/cache access.
