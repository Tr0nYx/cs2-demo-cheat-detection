---
phase: 16
slug: hltv-demo-scrape
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PHPUnit (Symfony) / Pytest (Python) |
| **Config file** | `phpunit.xml.dist` / `pyproject.toml` |
| **Quick run command** | `make test` |
| **Full suite command** | `make test-all` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `make test`
- **After every plan wave:** Run `make test-all`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | N/A | — | — | unit | `make test` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | N/A | — | Admin only | api | `make test` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 2 | N/A | — | — | unit | `make test` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 2 | N/A | — | — | e2e | `make test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Python test stubs for the HLTV scraper client.
- [ ] Symfony test stubs for the Admin API trigger.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cloudflare Bypass | N/A | Cloudflare challenges cannot be fully tested with local unit tests. | Manually trigger a scrape against live HLTV and verify it successfully bypasses. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
