# Roadmap: CS2 Demo Cheat Detection

## Overview

Build the project from the outside in: first a repeatable container foundation, then the Symfony product boundary, then the Python analysis pipeline, then ML preparation, and finally documentation and developer polish. This order makes each phase verifiable without requiring the whole system to exist at once.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions marked with INSERTED

- [ ] **Phase 1: Container Foundation** - Docker Compose, service images, environment, healthchecks, and local storage.
- [ ] **Phase 2: Symfony API and Domain** - Entities, migrations, REST endpoints, storage abstraction, and Messenger dispatch.
- [ ] **Phase 3: Python Analysis Pipeline** - Worker, parser adapter, feature extractors, scoring, error handling, and result persistence.
- [ ] **Phase 4: ML Dataset and Transformer Prep** - CS2CD loader, AntiCheatPT vectors, augmentation, model, and training entrypoint.
- [ ] **Phase 5: Developer Readiness and Documentation** - Makefile, recoil data, README, gitignore, and test commands.

## Phase Details

### Phase 1: Container Foundation
**Goal**: Developer can build and start the full local service stack.
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04, INFR-05
**UI hint**: no
**Success Criteria** (what must be TRUE):
1. Developer can run Docker Compose and see PHP-FPM, Nginx, PostgreSQL, Redis, and Python services healthy or ready.
2. Services use non-root runtime users where applicable.
3. `.env.example` documents all environment variables needed by the stack.
4. Demo storage is mounted as a Docker volume and demo files are ignored by git.
**Plans**: 3 plans

Plans:
**Wave 1**
- [ ] 01-01: Compose network, volumes, service wiring, healthchecks, and environment files

**Wave 2 (blocked on Wave 1 completion)**
- [ ] 01-02: PHP-FPM and Nginx Dockerfiles/configuration
- [ ] 01-03: Python image, dependency pinning, and storage permissions

Cross-cutting constraints:
- Use the exact target top-level structure from `tasks/setup.md`.
- Keep the default Compose setup dev-first with bind mounts and local defaults.
- Run PHP and Python application processes as pragmatic non-root users.
- Treat `.env.example` as the full Symfony/Python/Redis/PostgreSQL/storage/ML service contract.

### Phase 2: Symfony API and Domain
**Goal**: Symfony can accept demos, persist domain records, dispatch analysis jobs, ingest results, and expose the requested REST API.
**Depends on**: Phase 1
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, BACK-06, BACK-07
**UI hint**: yes
**Success Criteria** (what must be TRUE):
1. API user can upload a `.dem` file and receive a demo ID.
2. API user can poll demo status and receive result data when analysis completes.
3. API user can retrieve player history by Steam ID.
4. Symfony writes analysis jobs without waiting for Python processing.
5. Result ingestion creates `AnalysisResult` rows and updates demo status.
**Plans**: 4 plans

Plans:
- [ ] 02-01: Symfony skeleton, packages, configuration, and database connectivity
- [ ] 02-02: Domain entities, enums, repositories, and migrations
- [ ] 02-03: Storage abstraction, demo upload, status/result, and player history controllers
- [ ] 02-04: Messenger messages, handlers, Redis payload contract, and result ingest flow

### Phase 3: Python Analysis Pipeline
**Goal**: Python can consume queued demo jobs, parse CS2 data, compute feature scores, and persist explainable results.
**Depends on**: Phase 2
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05, FEAT-06, FEAT-07, FEAT-08, FEAT-09
**UI hint**: no
**Success Criteria** (what must be TRUE):
1. Worker BRPOPs jobs from `cs2.analysis`, handles SIGTERM, and logs JSON to stdout.
2. Parser adapter returns validated tick and event data or a clear error.
3. Each feature module returns a normalized score with raw supporting feature data.
4. Weighted scorer produces `clean`, `suspicious`, or `likely_cheating` labels.
5. Worker writes successful results and failed demo errors to PostgreSQL.
**Plans**: 5 plans

Plans:
- [ ] 03-01: Worker lifecycle, Redis consumption, structured logging, and PostgreSQL writes
- [ ] 03-02: Demo parser adapter and validation layer
- [ ] 03-03: Aimbot, triggerbot, and wallhack feature extractors
- [ ] 03-04: Recoil, bhop, and session consistency feature extractors
- [ ] 03-05: Weighted scoring, result schema integration, and worker tests

### Phase 4: ML Dataset and Transformer Prep
**Goal**: Project can prepare CS2CD training data and run the requested AntiCheatPT-style model scaffold.
**Depends on**: Phase 3
**Requirements**: ML-01, ML-02, ML-03, ML-04, ML-05, ML-06
**UI hint**: no
**Success Criteria** (what must be TRUE):
1. Dataset loader can load CS2CD from Hugging Face using the live repository identifier.
2. Loader converts data into 256x44 matrices compatible with the requested model.
3. Dataset split is stratified 70/15/15.
4. Augmentation adds matching Gaussian position noise to preserve relative distances.
5. PyTorch model and training entrypoint run with the requested loss, optimizer, scheduler, and batch size.
**Plans**: 3 plans

Plans:
- [ ] 04-01: CS2CD loader, schema validation, and matrix conversion
- [ ] 04-02: Splitting, augmentation, and dataset tests
- [ ] 04-03: Transformer model, training script, and smoke test path

### Phase 5: Developer Readiness and Documentation
**Goal**: The repository is directly usable by a developer following the README.
**Depends on**: Phase 4
**Requirements**: DEVX-01, DEVX-02, DEVX-03, DEVX-04, DEVX-05
**UI hint**: no
**Success Criteria** (what must be TRUE):
1. Makefile exposes all requested targets and routes them to working container commands.
2. README covers prerequisites, quickstart, migrations, direct analysis, API curl examples, ML phase, and architecture.
3. Recoil pattern files exist with AK-47 data and M4A4/M4A1-S stubs using the same schema.
4. `.gitignore` covers generated PHP, Python, ML, demo, and environment artifacts.
5. PHP and Python test commands are discoverable and executable.
**Plans**: 3 plans

Plans:
- [ ] 05-01: Makefile, local commands, and test command wiring
- [ ] 05-02: Recoil pattern data and repository ignore rules
- [ ] 05-03: README, API examples, architecture diagram, and final verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Container Foundation | 0/3 | Ready to execute | - |
| 2. Symfony API and Domain | 0/4 | Not started | - |
| 3. Python Analysis Pipeline | 0/5 | Not started | - |
| 4. ML Dataset and Transformer Prep | 0/3 | Not started | - |
| 5. Developer Readiness and Documentation | 0/3 | Not started | - |
