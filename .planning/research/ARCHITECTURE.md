# Architecture Research

## Components

### Symfony Backend

Owns public API, upload validation, demo metadata, player records, analysis result persistence, and queue dispatch. Structure should follow Domain, Application, Infrastructure, and UI folders as requested.

### Python Worker

Owns Redis consumption, demo parsing, feature extraction, weighted scoring, ML data preparation, and structured logging. It writes durable outcomes to PostgreSQL and should be independently runnable for local development.

### PostgreSQL

Stores demos, players, analysis results, status transitions, and feature JSON. It is the coordination point between the API and worker.

### Redis

Carries async messages. The queue contract must be explicit:

```json
{
  "demo_id": "uuid",
  "file_path": "/storage/demo.dem"
}
```

### Storage

Local Docker volume stores uploaded demos in v1. Symfony should access files through a `StorageInterface`, with `LocalStorage` first and S3-compatible storage later.

## Data Flow

1. User uploads a `.dem` file to `POST /api/demos`.
2. Symfony stores the file and creates a `Demo` row with `pending` status.
3. Symfony dispatches analysis and writes a Redis queue payload.
4. Python worker BRPOPs the job, parses the demo, computes player scores, and writes results.
5. Symfony result ingest or worker-side DB write updates demo status and exposes results through `GET /api/demos/{id}`.
6. Player history endpoint reads aggregate history by Steam ID.

## Build Order

1. Infrastructure and environment first, because every later phase depends on repeatable containers.
2. Symfony domain, DB, API, and queue contract second.
3. Python parser, worker, features, scoring, and ingest third.
4. ML dataset and transformer preparation fourth.
5. Developer docs, recoil pattern data, tests, and hardening throughout, with final polish as its own phase.

## Risks

- Demo parser field names may not exactly match the brief. Isolate parser mapping and fail loudly.
- Tick-rate assumptions affect millisecond thresholds. Centralize tick-to-time conversion.
- Wallhack detection without geometry is necessarily approximate. Keep labels as suspicion scores, not verdicts.
- Feature scores need calibration before they are trustworthy. Ship transparent formulas and preserve raw feature data.
