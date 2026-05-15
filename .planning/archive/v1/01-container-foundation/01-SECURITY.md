---
phase: 01
slug: 01-container-foundation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-15
updated: 2026-05-15
---

# Phase 1 - Security

Per-phase security contract: threat register, accepted risks, and audit trail.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host filesystem to containers | Compose bind mounts local source, config, and data paths into runtime containers. | Source code, Nginx config, demo storage paths |
| Developer environment to containers | `.env`-compatible values are injected into PHP, Python, PostgreSQL, and Redis services. | Local credentials, service URLs, queue names |
| HTTP to Nginx/PHP | Browser or API requests enter Nginx and are proxied to PHP-FPM. | Request metadata, future demo uploads |
| Container network | PHP and Python communicate with PostgreSQL and Redis over the Compose bridge network. | Database credentials, queue configuration, future analysis payloads |
| Python worker to demo storage | Worker reads local demo storage and future parser inputs. | Demo file paths and analysis input metadata |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01 | Spoofing | Compose/env contract | mitigate | `.env.example` centralizes PostgreSQL, Redis, database URL, queue, and storage names; `docker-compose.yml` references those variables. | closed |
| T-02 | Information disclosure | Git and Docker contexts | mitigate | `.gitignore` and `.dockerignore` exclude `.env`, `.env.*`, `*.dem`, demo storage contents, caches, and generated artifacts. | closed |
| T-03 | Elevation of privilege | App containers | mitigate | PHP and Python Dockerfiles create UID/GID-driven `app` users and end with `USER app`; runtime `id` confirms UID 1000. | closed |
| T-04 | Denial of service | Nginx/PHP upload path | mitigate | Nginx and PHP explicitly cap local demo uploads at 2G, making the development limit visible and tunable before real upload endpoints arrive. | closed |
| T-05 | Elevation of privilege | PHP runtime | mitigate | `docker/php/Dockerfile` creates the non-root `app` user before runtime and runs PHP-FPM as `USER app`. | closed |
| T-06 | Information disclosure | Nginx static serving | mitigate | Nginx denies dotfiles except `.well-known`; `http://localhost:8080/.env` returns 403. | closed |
| T-07 | Tampering | Demo storage | transfer | Phase 1 only establishes local dev storage. Upload validation and parser input validation are explicitly assigned to later backend/worker phases. | closed |
| T-08 | Information disclosure | Python worker logs | mitigate | `python/worker.py` logs only event, queue name, Redis configured boolean, storage path, and smoke mode; it does not dump env values or secrets. | closed |
| T-09 | Elevation of privilege | Python runtime | mitigate | `docker/python/Dockerfile` creates the non-root `app` user before runtime and runs the worker as `USER app`; runtime `id` confirms UID 1000. | closed |

Status: closed means mitigation, documented transfer, or accepted risk is present.

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-15 | 9 | 9 | 0 | Codex |

## Verification Evidence

| Check | Evidence | Result |
|-------|----------|--------|
| Env contract alignment | `Select-String` found PostgreSQL, Redis, database URL, queue, and storage variables in `.env.example` and `docker-compose.yml`. | pass |
| Secret/demo exclusions | `.gitignore` and `.dockerignore` contain `.env`, `.env.*`, `*.dem`, and demo storage exclusions. | pass |
| PHP non-root runtime | `docker compose --env-file .env.example exec -T php id` returned `uid=1000(app) gid=1000(app)`. | pass |
| Python non-root runtime | `docker compose --env-file .env.example exec -T python id` returned `uid=1000(app) gid=1000(app)`. | pass |
| Hidden file protection | `Invoke-WebRequest http://localhost:8080/.env` returned `403 Forbidden`. | pass |
| Worker log contents | Python logs include `worker_startup`, queue `cs2.analysis`, `redis_configured: true`, and `/storage/demos` only. | pass |

## Sign-Off

- [x] All threats have a disposition: mitigate, accept, or transfer.
- [x] Accepted risks documented in Accepted Risks Log.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

Approval: verified 2026-05-15
