# System Architecture

## Overview

CS2 Demo Cheat Detection is a full-stack web application for analyzing Counter-Strike 2 demo files to detect potential cheating patterns. The system consists of three main components: a Next.js frontend, a Symfony PHP backend, and a Python worker service.

```
┌─────────────────────────────────────────────────────────────┐
│                    User (Web Browser)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Nginx (Reverse Proxy)                           │
│              (Port 80, 443)                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  Next.js         │    │  Symfony API     │
│  Frontend        │    │  (Port 8000)     │
│  (Port 3000)     │    │                  │
│                  │    │  - Demo Upload   │
│  - UI/UX         │    │  - Result API    │
│  - Auth Callback │    │  - Job Queue     │
│  - Demo Viewer   │    │  - Leaderboard   │
└──────────────────┘    └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌──────────────┐ ┌─────────┐ ┌────────┐
            │ PostgreSQL   │ │ Redis   │ │ File   │
            │ (Demos,      │ │ (Job    │ │Storage │
            │  Players,    │ │ Queue,  │ │(Demo   │
            │  Results)    │ │ Cache)  │ │Files)  │
            └──────────────┘ └─────────┘ └────────┘
                    ▲
                    │
            ┌───────┴───────┐
            ▼               ▼
    ┌──────────────┐ ┌──────────────┐
    │ Python       │ │ Python       │
    │ Worker       │ │ ML Pipeline  │
    │ (Processing) │ │ (Analysis)   │
    └──────────────┘ └──────────────┘
```

## Component Details

### 1. Frontend (Next.js)

**Location:** `frontend/`

**Responsibilities:**
- User interface for demo upload and analysis
- Demo viewer with interactive visualization (heatmaps, grenades, timeline)
- Authentication with Steam API
- Dashboard with leaderboards and analytics
- Real-time results polling

**Key Features:**
- SSR with Next.js 16.x
- React 19 with TypeScript
- TanStack Query for data fetching
- Tailwind CSS for styling
- Playwright E2E tests
- Jest unit tests

**Routes:**
- `/` — Landing page with Steam auth
- `/dashboard` — User dashboard with upload history
- `/results/[id]` — Demo analysis results
- `/viewer/[id]` — Interactive demo viewer
- `/leaderboard` — Player leaderboard

### 2. Backend API (Symfony)

**Location:** `symfony/`

**Responsibilities:**
- RESTful API for demo upload and analysis
- Job queue management (Redis)
- Database persistence (PostgreSQL)
- Authentication and authorization
- Results aggregation and reporting

**Architecture Pattern:** Hexagonal (Ports & Adapters)

**Layers:**
- **Presentation:** HTTP Controllers (`src/Presentation/Controller/`)
- **Application:** Use cases, handlers, DTOs (`src/Application/`)
- **Domain:** Core business logic, value objects, entities (`src/Domain/`)
- **Infrastructure:** Database repos, queue, cache, external services (`src/Infrastructure/`)

**Key Endpoints:**
- `POST /api/demos` — Upload demo
- `GET /api/demos/{id}` — Get demo status/results
- `GET /api/demos/{id}/results` — Get analysis results
- `GET /api/leaderboards` — Get leaderboard data
- `GET /api/trace/{id}` — Get viewer event trace

### 3. Python Worker

**Location:** `python/`

**Responsibilities:**
- Consume demo analysis jobs from Redis queue
- Parse CS2 demo files (`.dem` format)
- Extract feature vectors for ML inference
- Run transformer-based cheat detection model
- Generate heatmaps and visualization data
- Compute player suspicion scores

**Modules:**
- `parser/` — CS2 demo file parsing
- `features/` — Feature extraction pipeline
- `ml/` — Model training and inference
- `viewer/` — Heatmap and visualization generation

### 4. Data Persistence

**PostgreSQL Schema:**
- `demos` — Uploaded demo files and metadata
- `players` — Counter-Strike players
- `suspicions` — Detected suspicion signals
- `viewer_events` — Demo event trace for visualization
- `demo_heatmaps` — Cached heatmap data
- `demo_ticks` — Cached tick/round data

**Redis:**
- Job queue (RQ) for async demo processing
- Cache layer for heatmaps and viewer events
- Session storage

## Data Flow

### Demo Upload Flow
1. User uploads `.dem` file via Next.js frontend
2. Frontend sends file to Symfony API (`POST /api/demos`)
3. Symfony creates `Demo` record, saves file to storage
4. Job enqueued to Redis queue
5. Frontend polls `GET /api/demos/{id}` for status
6. Python worker picks up job, processes demo
7. Results persisted to PostgreSQL
8. Frontend fetches results and renders UI

### Demo Viewer Flow
1. User clicks demo in dashboard
2. Frontend fetches demo metadata and viewer events (`GET /api/trace/{id}`)
3. Demo Viewer component loads with Canvas
4. User scrubs timeline → frontend polls tick data
5. Python heatmap module generates visualization on-demand
6. Results cached in Redis for subsequent views

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend Framework | Next.js | 16.x |
| Frontend Language | TypeScript | 5.x |
| Frontend Styling | Tailwind CSS | 4.x |
| Backend Framework | Symfony | 7.x |
| Backend Language | PHP | 8.3 |
| Python Version | Python | 3.12+ |
| Database | PostgreSQL | 15+ |
| Cache/Queue | Redis | 7+ |
| ML Framework | PyTorch | 2.x |
| Container | Docker | 20.10+ |
| Container Orchestration | Docker Compose | 2.0+ |

## Key Design Decisions

1. **Async Processing:** Demo analysis happens in background via Redis queue. Frontend polls for results to avoid blocking API calls.

2. **Hexagonal Architecture:** Backend uses ports & adapters pattern to isolate business logic from framework-specific details.

3. **ML-Ready Feature Extraction:** Python parser extracts both statistical and deep learning features for flexibility in model updates.

4. **Caching Layer:** Heatmaps and viewer events cached in Redis to avoid re-computation during user interactions.

5. **Event-Sourced Viewer Data:** Demo events stored in database for reproducible analysis and timeline scrubbing.

6. **Monorepo Structure:** Frontend and backend in single repo for easier cross-component collaboration.

## Deployment Architecture

In production, the system runs in Docker Compose with:
- Nginx reverse proxy (port 80/443)
- PHP-FPM (behind Nginx)
- PostgreSQL (persistent volume)
- Redis (for queue and cache)
- Python worker (scaled horizontally as needed)
- Prometheus + Grafana (monitoring)
- Loki (log aggregation)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production setup.

## Security Considerations

- **Authentication:** Steam OAuth 2.0 for user login
- **Authorization:** API tokens/sessions for protected endpoints
- **File Upload:** Validated demo file format, stored outside web root
- **SQL Injection:** Parameterized queries via ORM
- **API Rate Limiting:** Redis-based rate limiter on key endpoints
- **Secrets Management:** Environment variables for sensitive config

## Performance Characteristics

- **Demo Upload:** Accepts files up to 100 MB
- **Analysis Time:** 30 seconds to 5 minutes per demo (model dependent)
- **Viewer Load:** ~500ms for initial load, ~100ms per frame scrub
- **Database:** Indexed queries for leaderboard filters (<100ms)
- **Cache Hit Rate:** >80% for repeated heatmap/viewer queries

## Future Scaling Paths

1. **Horizontal Scaling:** Run multiple Python workers behind load balancer
2. **Database Sharding:** Partition demo/player data by time or region
3. **CDN Integration:** Cache viewer assets and demo files
4. **Model Serving:** Dedicated ML model server (TorchServe, Triton)
5. **Stream Processing:** Move from batch processing to real-time Kafka pipeline
