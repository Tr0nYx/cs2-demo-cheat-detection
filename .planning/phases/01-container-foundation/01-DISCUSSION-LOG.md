# Phase 1: Container Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 01-container-foundation
**Areas discussed:** Repository Layout, Compose Profile, Runtime Security, Environment Contract

---

## Repository Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Exakt | `docker/`, `symfony/`, `python/`, `data/` direkt so anlegen, wie spätere Phasen sie brauchen. Empfohlen. | yes |
| Lean | Nur minimale Docker-Dateien, Symfony/Python-Struktur wächst später. | |
| Hybrid | Top-Level-Struktur jetzt, aber nur Phase-1-Dateien statt vollständiger App-Scaffolds. | |

**User's choice:** 1 - Exakt
**Notes:** User chose the recommended exact layout from `tasks/setup.md`.

---

## Compose Profile

| Option | Description | Selected |
|--------|-------------|----------|
| Dev-first | Bind mounts, schnelle Iteration, einfache Logs, lokale Defaults. Empfohlen für Phase 1. | yes |
| Prod-like | Striktere Images, weniger Host-Mounts, näher an Deployment-Disziplin. | |
| Hybrid | Dev-first als Default, plus optionale prod-nahe Overrides/Profile für später. | |

**User's choice:** 1 - Dev-first
**Notes:** Phase 1 should optimize for local development and debugging.

---

## Runtime Security

| Option | Description | Selected |
|--------|-------------|----------|
| Pragmatisch non-root | App-Prozesse laufen als nicht-root, Volumes/Permissions funktionieren sauber. Empfohlen. | yes |
| Strikt gehärtet | Zusätzlich read-only Filesysteme, dropped capabilities, sehr enge Mounts, wo möglich. | |
| Minimal jetzt | Nur dort non-root erzwingen, wo es ohne Reibung klappt; Rest später härten. | |

**User's choice:** 1 - Pragmatisch non-root
**Notes:** Keep the explicit non-root requirement, but avoid over-hardening before the app/worker exist.

---

## Environment Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Vollständig | Direkt alle absehbaren Variablen für Symfony, Python, Redis, Postgres, Storage und ML dokumentieren. Empfohlen. | yes |
| Nur Phase 1 | Nur Variablen, die Docker Compose jetzt wirklich braucht. | |
| Vollständig, aber gruppiert | Alle Variablen, klar nach Phase/Service gruppiert, damit spätere Werte nicht wie sofort nötig wirken. | |

**User's choice:** 1 - Vollständig
**Notes:** `.env.example` should be a future-facing service contract from the start.

---

## the agent's Discretion

- Exact UID/GID values.
- Exact image tags within requested major versions.
- Exact grouping style inside `.env.example`.
- Healthcheck timing values.

## Deferred Ideas

- Production-oriented Compose profile and stricter runtime hardening.
- Observability stack.
- MinIO/S3 storage implementation.
