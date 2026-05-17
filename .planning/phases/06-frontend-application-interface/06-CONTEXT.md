---
phase: 6
slug: frontend-application-interface
status: context-locked
created: 2026-05-15
---

# Phase 6 — Implementation Context

> Decisions extracted from user discussion. Answers questions: Where does it run? How does it integrate? What's the quality bar? Timeline constraints?

---

## Executive Summary

**What:** Build the web UI for CS2 demo uploads, analysis tracking, and results visualization.

**Who:** Solo developer, ~1-2 weeks to MVP.

**Where:** 
- **Local dev:** Separate Next.js service in Compose alongside Symfony.
- **Production:** Docker container co-deployed with Symfony API.

**Quality:** Full unit tests (Jest), E2E tests (Playwright in CI), error logging (Sentry), robust error handling.

---

## Locked Decisions

### 1. Deployment & Infrastructure

**Decision:** Next.js frontend runs as a separate Docker service in `docker-compose.yml`.

**Why:** 
- Clean separation between backend and frontend services.
- Local dev experience: `docker-compose up` spins up entire stack (Symfony + Next.js).
- Matches production model (Docker container + Symfony container).
- Enables independent frontend/backend iteration.

**How to Apply:**
- Add `next-app` service to `docker-compose.yml` (builds from `./Dockerfile.next` or similar).
- Next.js dev server runs on `localhost:3000` locally.
- In CI/production, uses Next.js standalone server (Node.js server, not dev server).
- Symfony must have CORS configured to allow `http://localhost:3000` (dev) and docker network DNS (production).

**Out of Scope (v1):** Vercel, separate hosting providers. Keep unified Docker deployment for v1.

---

### 2. API Contract & Integration

**Decision:** UI-SPEC.md is the source of truth. Backend must implement the contract as written.

**Why:**
- Unblocks frontend development — frontend can be built against the spec.
- Clear contract: endpoint paths, request/response shapes, status codes, polling intervals.
- Backend team must deliver matching API, not vice versa.

**API Endpoints (from UI-SPEC):**
- `POST /api/demos` — Upload demo file (multipart form data).
- `GET /api/demos/{demo_id}` — Fetch demo status and results (JSON).
- `DELETE /api/demos/{demo_id}` — Delete a demo.
- `GET /api/demos` — List all demos (pagination, filtering).
- `GET /api/players/{steamId}/history` — Player analysis history (already exists, reuse).
- `GET /api/demos/{demo_id}/download` — Download original demo file.

**Status Polling:**
- Frontend polls `GET /api/demos/{demo_id}` every 2 seconds.
- Stops when `status === "done"` or `status === "error"`.
- Maximum timeout: 5 minutes. If analysis doesn't finish, show error state.
- Response must include: `id`, `status` ("pending"|"done"|"error"), `results` (if done), `error_message` (if error), `updated_at`.

**Demo Download:**
- `GET /api/demos/{demo_id}/download` streams the original `.dem` file from Symfony backend.
- Backend retrieves file from storage layer (Docker volume or abstracted storage interface).
- Sets `Content-Disposition: attachment` header.
- Allows frontend to use simple link: `<a href="/api/demos/{id}/download">Download</a>`.

**CORS:**
- Symfony must allow requests from `http://localhost:3000` (dev) and Next.js Docker service DNS name (production).
- No authentication required (public/research tool).

---

### 3. Error Handling & Resilience

**Decision:** Robust error handling with graceful degradation. Frontend handles backend unavailability.

**Why:**
- Production-quality UX: don't crash on network errors.
- Solo developer has 1-2 weeks — time to implement properly once, save debugging later.

**Implementation Requirements:**

1. **Network Error Handling:**
   - Handle `fetch` failures (network down, DNS failure, timeout).
   - Show friendly error: "Unable to connect to server. Please check your connection and try again."
   - Provide "Retry" button.

2. **Polling Failure:**
   - If polling request fails, retry with exponential backoff (1s, 2s, 4s).
   - After 3 failures, show: "Analysis service is unreachable. Analysis may be complete — [Check Status] or [Go Back]".
   - Don't retry forever.

3. **API Error Responses (4xx, 5xx):**
   - Display user-friendly messages:
     - 400 "Invalid file format"
     - 413 "File too large"
     - 500 "Server error. Please try again later."
   - Log to Sentry with full error details.

4. **Timeout:**
   - If analysis doesn't complete in 5 minutes, show: "Analysis is taking longer than expected. Results will appear when ready. [Check Status] or [Go Back]".
   - Allow user to navigate away and check later.

5. **Loading States:**
   - Show spinners + "Analysis running... (10-30s typical)" during polling.
   - Skeleton screens while fetching history.
   - Disable buttons while in-flight.

**Out of Scope (v1):** Offline queue, service workers, offline mode. Assume backend is reachable.

---

### 4. Demo File Access & Storage

**Decision:** Demo files downloaded through Symfony backend API endpoint.

**Why:**
- Keeps file access behind the API boundary.
- Allows future access control/logging without frontend changes.
- Simpler than presigned URLs.

**Implementation:**
- Backend exposes `GET /api/demos/{demo_id}/download`.
- Symfony returns file stream with `Content-Disposition: attachment; filename="demo.dem"`.
- Frontend uses simple `<a href="/api/demos/{id}/download" download>Download Demo</a>`.
- No special handling needed on frontend.

**Storage Layer:**
- Backend abstracts storage (local Docker volume by default).
- Frontend doesn't care where files live.

---

### 5. Testing Strategy

**Decision:** Full test suite — unit tests (Jest), E2E tests (Playwright), run in CI.

**Why:**
- Solo developer working 1-2 weeks needs confidence that features work.
- E2E tests in CI catch regressions automatically.
- Jest/React Testing Library fast feedback loop during development.

**Unit Tests (Jest + React Testing Library):**
- Test all React components: upload form, results display, history table, etc.
- Test custom hooks (usePolling, useDemoFetch, etc.).
- Test utility functions (formatScore, verdictColor, etc.).
- Target: 70-80% coverage (pragmatic, not 100%).
- Run locally: `npm test`.
- Run in CI: on every commit.

**E2E Tests (Playwright):**
- Core user flows:
  1. Upload demo → see results page with verdicts.
  2. View analysis history → filter by date/verdict.
  3. Download demo file.
  4. Handle error states (upload failure, backend error, timeout).
- Playwright configuration: headless, single browser (Chrome) for v1.
- Run locally: `npm run e2e`.
- Run in CI: on every commit (may add to pull request checks).

**Out of Scope (v1):**
- Visual regression tests.
- Performance tests (Lighthouse in v2).
- Mobile-specific E2E tests (responsive design in unit tests only).

**CI Integration:**
- GitHub Actions workflow: `npm test && npm run e2e`.
- Must pass before merge.

---

### 6. Observability & Error Logging

**Decision:** Sentry for error tracking + performance monitoring.

**Why:**
- Standard-of-the-line error tracking.
- Captures stack traces, breadcrumbs, user sessions.
- Performance monitoring (Core Web Vitals, slow transactions).
- Free tier sufficient for v1.

**Sentry Configuration:**
- Initialize in Next.js app (instrument client + server).
- Capture unhandled errors, promise rejections, API errors.
- Set release tag (from git commit SHA).
- Set environment (development, staging, production).

**What to Log:**
- Unhandled exceptions (automatic).
- API errors (manual in error boundaries and fetch handlers).
- Analysis timeouts (manual in polling logic).
- File upload failures (manual in upload handler).

**User Privacy:**
- Don't capture auth tokens, passwords, file contents.
- Redact PII in Sentry (Sentry's default redaction rules).

**No Additional Logging (v1):**
- Skip custom analytics dashboard.
- Skip session replay (LogRocket) for now.
- Rely on Sentry's free tier.

---

### 7. Development Environment & Tooling

**Decision:** Separate Next.js service in docker-compose.yml, spins up with `docker-compose up`.

**Setup:**
1. Create `Dockerfile` for Next.js (multistage: build + runtime).
2. Add to `docker-compose.yml`:
   ```yaml
   next-app:
     build:
       context: ./frontend
       dockerfile: Dockerfile
     ports:
       - "3000:3000"
     environment:
       NEXT_PUBLIC_API_URL: http://symfony:80/api
       NODE_ENV: development
     depends_on:
       - symfony
   ```
3. Developer runs `docker-compose up` once, both services start.
4. Frontend accessible at `http://localhost:3000`.
5. Backend accessible at `http://localhost/api` (from container) or `http://localhost:8000/api` (local machine, if Nginx on 8000).

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` — Backend API base URL (next-public = accessible in browser).
  - Dev: `http://localhost/api` (inside Docker) or `http://localhost:8000/api` (if local dev).
  - Prod: `https://api.example.com/api` (actual domain).
- `NEXT_SENTRY_AUTH_TOKEN` — Sentry auth token (for source map uploads in CI).

**Directory Structure:**
```
frontend/
  app/
    layout.tsx
    page.tsx (upload)
    results/[id]/page.tsx
    history/page.tsx
  components/
    ui/ (shadcn components)
    UploadForm.tsx
    ResultsCard.tsx
    VerdictBadge.tsx
    FeatureTable.tsx
    ErrorBoundary.tsx
  lib/
    api.ts (axios instance + endpoints)
    hooks/ (usePolling, useDemoFetch, etc.)
    utils.ts (formatScore, verdictColor, etc.)
  tests/ (or __tests__)
    components/*.test.tsx
    lib/*.test.ts
  e2e/ (Playwright tests)
    upload.spec.ts
    results.spec.ts
    history.spec.ts
  Dockerfile
  package.json
  tsconfig.json
  tailwind.config.ts
  next.config.ts
```

---

### 8. Team & Timeline

**Context:** Solo developer, ~1-2 weeks to MVP.

**Implication for Planning:**
- Focus on core features first (upload, results, history).
- Don't over-engineer; ship 80% that covers 100% of users.
- Testing is streamlined but not skipped (Jest + Playwright CI).
- Documentation minimal but clear.
- Deploy to production after v1 ships (iterate in staging).

**MVP Scope:**
- Upload page + form validation.
- Results page + verdict display.
- History page + list/filter.
- Error states.
- Unit tests for critical paths.
- E2E tests for core flows.
- Sentry integration.

**Out of Scope (post-v1):**
- Dark mode (mentioned in UI-SPEC as optional).
- Advanced filtering (sortable columns).
- Real-time WebSocket updates.
- Trend analytics.
- Custom styling beyond shadcn defaults.

---

## Gray Areas Resolved ✅

| Area | Decision | Reference |
|------|----------|-----------|
| Deployment model | Separate Docker service | §1 |
| Dev environment | Next.js service in Compose | §7 |
| API contract | UI-SPEC is source of truth | §2 |
| Demo downloads | Via backend API endpoint | §2, §4 |
| Polling strategy | 2s interval, 5min timeout | §2 |
| Error handling | Robust with graceful degradation | §3 |
| Testing | Jest + Playwright in CI | §5 |
| Observability | Sentry error tracking | §6 |
| Production hosting | Docker container with Symfony | §1 |
| Authentication | None (public/research tool) | (assumed) |
| Team/timeline | Solo dev, 1-2 weeks to MVP | §8 |

---

## Next Steps

1. **Research Phase** — Investigate shadcn/ui setup, Next.js 14+ App Router patterns, Playwright test structure.
2. **Planning Phase** — Break down into implementable tasks (e.g., "Setup Next.js + Tailwind", "Implement upload form", "Implement results polling", etc.).
3. **Execution Phase** — Build components, integrate API, write tests, deploy to Docker Compose and production.

---

*Context locked: 2026-05-15*
