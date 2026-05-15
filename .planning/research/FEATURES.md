# Feature Research

## Table Stakes

### Demo Intake

- Upload `.dem` files through REST API.
- Store demo files in a local Docker volume through a storage abstraction.
- Track demo lifecycle: pending, processing, done, failed, error.
- Return demo status and result once analysis completes.

### Async Analysis Pipeline

- Symfony dispatches `AnalyzeDemoMessage`.
- Handler writes a Python-consumable Redis payload and marks demo as processing.
- Python worker consumes `cs2.analysis`, logs JSON to stdout, writes scores, and records errors.
- Result ingest path creates `AnalysisResult` records and completes demo status.

### Detection Features

- Aimbot: kill windows, snap ratio, angular velocity, angular jerk, reaction-to-visibility proxy.
- Triggerbot: reaction time distribution, bimodality coefficient, instant-kill ratio.
- Wallhack: sound timeline, pre-aim before information, crosshair-on-peek angle delta.
- Recoil: known weapon recoil patterns, spray extraction, correlation, round consistency.
- Bhop: jump-land timing, perfect jump ratio, sequence length.
- Session consistency: per-round aim behavior variance and warmup-curve absence.

### ML Preparation

- CS2CD loader via Hugging Face datasets.
- Parquet to AntiCheatPT-compatible 256x44 context vectors.
- Stratified train, validation, and test split.
- Position-noise augmentation that preserves attacker-victim relative distance.
- PyTorch AntiCheatPT_256-style transformer baseline.

### Developer Foundation

- Dockerfiles, Compose, `.env.example`, healthchecks, non-root containers.
- Makefile for build, up, worker, analysis, migration, testing, dataset download, and training.
- README with setup, API examples, ML phase notes, and ASCII architecture diagram.

## Differentiators

- Explainable weighted scoring alongside ML preparation.
- Ethical boundary stated in docs and architecture: demo-only research tool.
- Storage interface from day one to allow later S3 or MinIO.
- Player history endpoint for longitudinal review.

## Deferred

- Web UI beyond minimal backend readiness.
- Prometheus, Grafana, and Loki.
- Cloud object storage.
- Full model production serving or online inference service.
