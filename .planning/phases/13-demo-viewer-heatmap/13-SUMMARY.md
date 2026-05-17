# Phase 13 Summary: Demo Viewer + Heatmap

## Outcome

Phase 13 delivered the post-game 2D demo viewer foundation:

- Python map transforms, heatmap rendering, tick cache export, grenade helpers, and viewer worker.
- Symfony compact viewer entities, migrations, Redis cache wrappers, viewer queue jobs, and API endpoints.
- Frontend typed API helpers, React Query hooks, playback/map transform hooks, Canvas viewer UI, heatmap viewer, suspicious kill review, and grenade inspector.

## API Surface

- `GET /api/demos/{id}/rounds`
- `GET /api/demos/{id}/events`
- `GET /api/demos/{id}/heatmap`
- `GET /api/demos/{id}/ticks`

## Verification

- Python viewer tests: 23 passed.
- Symfony targeted tests: 14 passed, 65 assertions.
- Frontend DemoViewer/hook tests: 13 passed.
- Playwright viewer + review smoke tests: 6 passed.

## Notes

- Real radar assets should be added under `frontend/public/maps/{map_name}_radar.png` and/or `assets/maps/{map_name}_radar.png`.
- The viewer UI intentionally uses review-signal language only.
- Next dev server is running locally at `http://localhost:3000`.
