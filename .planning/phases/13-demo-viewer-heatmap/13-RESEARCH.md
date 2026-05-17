# Phase 13: 2D Demo Viewer + Heatmap Module - Research

## RESEARCH COMPLETE

## Phase Summary

Phase 13 adds a post-game 2D demo review surface over the existing CS2 analysis pipeline. It should not change the ethical boundary: all data comes from uploaded/queued demos after analysis, and every cheat-related marker is a research signal, not a verdict or enforcement action.

The implementation should be split into six executable waves:

1. Python viewer foundation: map coordinate transforms, heatmap renderer, tick/grenade helpers, and tests.
2. Symfony viewer data model and API foundation: persisted round/grenade/suspicious-kill/heatmap references, Redis tick cache, events/rounds endpoints.
3. Heatmap queue and endpoint: image/png cache path, Python viewer worker, Makefile helpers.
4. Tick streaming API and frontend hooks: chunked tick endpoint, typed API functions, React Query hooks, playback state.
5. Canvas demo viewer UI: map canvas, timeline, player legend, round selector, viewer route integration.
6. Suspicion overlay and grenade inspector: flagged kill review panel, grenade trajectory inspection, similar throw search.

## Existing Codebase Patterns

### Symfony

- API controllers exist in both `symfony/src/UI/Api` and `symfony/src/Presentation/Controller`.
- Recent feature controllers use `Presentation\Controller` with `MessageBusInterface`, `SerializerInterface`, and `ApiErrorResponder`.
- Existing upload/status API lives in `symfony/src/UI/Api/DemoController.php`.
- Existing ingest flow writes `AnalysisResult` rows through `ResultIngestHandler` and stores rich per-player details in `featureData` and `supportData`.
- Demo entity already has nullable `map` and file path fields, making it a good root for viewer data.
- Queue publishers connect to Redis directly through `\Redis` in infrastructure classes.
- Migrations live under `symfony/migrations/Version*.php`.

### Python

- `python/parser/adapter.py` wraps `demoparser2` and returns `ParsedDemo(ticks_df, events_df)`.
- `python/worker.py` consumes Redis with `BRPOP`, logs structured JSON, handles SIGTERM, parses demos, extracts features, scores, and persists results.
- Python dependencies already include `numpy`, `scipy`, `redis`, `psycopg2`, and `pytest`.
- `Pillow` and `matplotlib` are not currently listed in `python/requirements.txt`; Phase 13 must add them for PNG heatmap rendering.
- Existing tests live in `python/tests/` and use plain pytest.

### Frontend

- Next.js is version 16.2.6 and React is 19.2.4. `frontend/AGENTS.md` requires reading Next docs before code edits because this version may have breaking changes.
- UI components live in `frontend/components`, hooks in `frontend/lib/hooks`, API helpers in `frontend/lib/api.ts`, and shared types in `frontend/lib/types.ts`.
- Data fetching uses React Query v5.
- Existing domain UI uses shadcn-like UI primitives and Tailwind.
- Canvas work should be isolated in client components and tested with React Testing Library plus Playwright smoke tests.

## Architecture Decisions for Planning

### Coordinate Transforms

Use a dedicated Python module, `python/viewer/map_config.py`, as the canonical server-side coordinate mapping. Mirror the same formulas in frontend `useMapTransform.ts`, but keep the map constants in a shared typed frontend file generated or manually synchronized from the Python list. The initial phase supports one radar layer per map. Nuke/Vertigo layer selection should be represented as explicit deferred work, not silently approximated.

### Tick Data

Do not persist raw tick data in PostgreSQL. Store compressed JSON chunks in Redis with a 48-hour TTL:

- Key: `demo_ticks:{demoId}:{fromTick}:{toTick}:{step}`
- Encoding: JSON -> gzip/zlib -> base64
- Default viewer step: 4
- Export chunk size: 500 ticks

The API should validate `step`, `from_tick`, `to_tick`, `round`, and `players[]`; it should return clear `404`/`409` style errors when a demo is not analyzed or cache is missing.

### Persistent Viewer Events

Persist small, queryable event summaries:

- `demo_rounds`: round start/end metadata and kill/bomb summary.
- `demo_grenades`: grenade endpoints and sampled trajectories.
- `demo_suspicious_kills`: flagged kill review markers derived from existing feature/support data.
- `demo_heatmaps`: file references for generated PNG heatmaps.

This keeps the frontend fast without storing high-volume per-tick telemetry in SQL.

### Heatmaps

Server-render PNGs in Python and cache at two levels:

- Redis bytes: `heatmap:{demoId}:{playerIdOrAll}:{type}:{roundFilter}`, TTL 7 days.
- Filesystem: `/storage/heatmaps/{demoId}/{type}_{player}_{rounds}.png`.

The Symfony endpoint should serve `image/png` directly with `Cache-Control: public, max-age=604800`.

### Frontend UI Direction

This is an analyst workstation, not a marketing surface. Use a dense, dark tactical interface with clear CT/T colors, compact controls, stable square radar dimensions, and no explanatory feature copy inside the app. The first screen should be the usable viewer, with heatmap and event panels as tabs or side panels.

Canvas must own the fast loop. Do not render player dots, grenade trails, or current-tick markers as DOM nodes.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Tick payloads become huge | Chunk ticks, enforce `step`, cap ranges, Redis TTL, no SQL tick persistence |
| Heatmap endpoint blocks requests | Serve cache/file first; queue generation on miss; return 202/JSON or existing placeholder if generation is pending |
| Radar assets unavailable | Use explicit missing-asset error state; allow placeholder map in tests only; document `assets/maps/{map}_radar.png` |
| Suspicion overlay appears accusatory | Label as "review signal" and expose reasons/metrics without proof language |
| Canvas performance drops | Use requestAnimationFrame, memoized current tick lookup, stable canvas size, devicePixelRatio scaling, no DOM in render loop |
| Coordinate transforms drift | Unit-test known map points and Python<->frontend formula parity |
| Redis unavailable | API returns recoverable cache-miss/error response; worker logs structured errors |

## Validation Architecture

Phase 13 should validate at four levels:

- Python unit tests for map transforms, heatmap bytes, tick compression helpers, and similar-throw search.
- Symfony unit/integration tests for repositories, controller query validation, cache hit/miss behavior, and PNG responses.
- Frontend unit tests for hooks, playback state, transform math, and component states.
- Playwright smoke test for the viewer route at desktop and tablet widths, including nonblank canvas check and no overlapping core controls.

## Recommended Plan Boundaries

- Wave 1 should be Python-only and low-risk.
- Wave 2 should establish SQL/cache/API contracts before UI consumes them.
- Wave 3 should close the heatmap path end-to-end.
- Wave 4 should add tick streaming and frontend data hooks.
- Wave 5 should implement the main viewer UI and route.
- Wave 6 should add differentiated value: suspicion review and grenade inspector.

## Open Implementation Notes

- Prefer adding `pillow` and `matplotlib` to `python/requirements.txt`; `scipy` is already present for Gaussian blur.
- Use `lucide-react` icons for viewer controls in React.
- Avoid nested cards in the viewer. Use one full-width work surface with panels/toolbars.
- Keep all new queue names configurable by env vars, defaulting to `cs2.viewer` or `cs2.heatmap`.
- The task brief says "ask after each main step"; in GSD execution this should translate to wave summaries and checkpoints only if a plan reaches a real ambiguity. Otherwise execution can continue autonomously.
