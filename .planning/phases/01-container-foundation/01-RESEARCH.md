# Phase 1: Container Foundation - Research

## RESEARCH COMPLETE

## Objective

Research how to plan Phase 1: Container Foundation for a dev-first Docker Compose stack with PHP-FPM, Nginx, PostgreSQL, Redis, Python, environment configuration, healthchecks, local demo storage, and pragmatic non-root runtime users.

## Inputs

- `.planning/phases/01-container-foundation/01-CONTEXT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `tasks/setup.md`

## Findings

### Compose and Service Ordering

Docker Compose supports long-form `depends_on` with health conditions. For this phase, PostgreSQL and Redis should define healthchecks, and PHP/Python services should use `condition: service_healthy` for dependencies that must be ready before app startup. Nginx should depend on PHP being started, not necessarily healthy, unless a PHP healthcheck is added later.

Source: Docker Compose service reference, `depends_on` and `service_healthy`: https://docs.docker.com/reference/compose-file/services/

### Dockerfile Practices

Docker's official best-practice guidance supports using official/minimal base images, excluding build-irrelevant files with `.dockerignore`, avoiding unnecessary packages, and using `USER` when a service can run without privileges. It also recommends explicit UID/GID values when stable file ownership matters.

Source: Docker Dockerfile best practices: https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/

### Phase-Specific Implications

- Use official major-version images: `php:8.3-fpm`, `python:3.12-slim`, `postgres:16`, `redis:7`, `nginx:stable` or `nginx:1.27-alpine`.
- Keep Compose dev-first with bind mounts for `symfony/`, `python/`, and local config.
- Create explicit non-root app users for PHP and Python with practical UID/GID defaults such as `1000:1000`.
- Keep database and Redis official images as-is; they already manage their own runtime users internally.
- Use named volumes for PostgreSQL data, Redis data, Composer cache, Python cache if useful, and demo storage.
- Keep `.env.example` complete and grouped, even if later phases consume some variables.

## Recommended Plan Structure

### Plan 01: Compose skeleton and environment contract

Create the repo layout, `.env.example`, `.dockerignore`, `.gitignore` coverage, `docker-compose.yml`, and storage directories. This anchors paths and service names for later plans.

### Plan 02: PHP-FPM and Nginx runtime

Create `docker/php/Dockerfile`, PHP config, `docker/nginx/nginx.conf`, and a minimal Symfony public placeholder so Nginx can be configured without waiting for the Symfony phase.

### Plan 03: Python worker runtime and storage permissions

Create `docker/python/Dockerfile`, `python/requirements.txt`, a minimal worker placeholder, storage directories, and permission conventions so the Python service can build and start.

## Validation Architecture

Validation should prove the foundation exists and is internally consistent:

- `docker compose config` parses successfully.
- `.env.example` contains required service variables.
- Dockerfiles contain non-root `USER` instructions.
- Healthchecks exist for PostgreSQL and Redis.
- Demo storage is mounted in Compose and ignored by git.
- Phase 1 requirements `INFR-01` through `INFR-05` are covered by the plan set.

## Risks

- `torch` makes the Python image heavy. In Phase 1, define dependencies according to the brief, but leave performance optimization for later if builds are slow.
- Bind mounts plus non-root users can cause permission friction on Windows. Use explicit UID/GID build args and ensure writable paths are owned by the app user in the image.
- A Compose file can be syntactically valid before all application code exists, so verification should focus on configuration, file existence, and build readiness rather than full product behavior.
