# Phase 8: Demo Download per Sharecode - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to import CS2 demos directly via Sharecode links from multiple platforms (Steam, Faceit, ESEA), bypassing manual file upload. Support bulk imports and provide clear progress indication and error handling.

</domain>

<decisions>
## Implementation Decisions

### Data Source & Multi-Platform Support
- **D-01:** Support Steam Community (official API) as primary source
- **D-02:** Support Faceit API for Faceit demos
- **D-03:** Support ESEA API for ESEA demos
- **D-04:** Accept user-pasted individual Sharecode strings via form input
- **D-05:** Support bulk import (multiple Sharecodes in one operation)

### Backend Architecture
- **D-06:** Implement dedicated `POST /api/demos/import-sharecode` endpoint (separate from file upload)
- **D-07:** Use async queue-based processing (Redis queue) — download jobs handled by Python worker, not blocking API
- **D-08:** User receives "pending" status immediately, import completes asynchronously
- **D-09:** Python worker handles all download, parsing, and error handling

### Duplicate Detection & Handling
- **D-10:** Detect duplicates by Sharecode (one Sharecode = one unique demo)
- **D-11:** Reject duplicate Sharecode imports with user-friendly error message ("This demo was already imported on [date]")
- **D-12:** If same Sharecode re-imported, return reference to existing demo instead of re-downloading

### Error Handling & Validation
- **D-13:** Validate Sharecode format before queueing (reject invalid format immediately)
- **D-14:** Handle expired/not-found Sharecodes gracefully ("This demo is no longer available on the platform")
- **D-15:** Implement retry logic for rate-limited API responses (queue for later, max 3 retries)
- **D-16:** Reject demos older than 30 days (configurable, safety measure for incomplete data)
- **D-17:** Log all errors with platform, timestamp, and reason for audit trail

### Frontend UI Integration
- **D-18:** Create new "Import by Sharecode" tab alongside existing "Upload File" tab in demo upload form
- **D-19:** Support bulk import via textarea (paste multiple Sharecodes, one per line)
- **D-20:** Show real-time progress indication for each Sharecode (pending → downloading → parsing → complete/error)
- **D-21:** Display import history with timestamps, platform source, and final status
- **D-22:** Allow retry of failed imports from history

### Security & Validation
- **D-23:** Validate Sharecode format (length, character set) before API calls
- **D-24:** Implement per-user rate limiting (max 10 imports/hour per user)
- **D-25:** Log all import attempts (who, when, platform, Sharecode, outcome) for compliance
- **D-26:** Content filtering: reject imports from known bot/spam accounts (platform-level check)

### Claude's Discretion
- Exact API integration details for each platform (driver code structure)
- Specific timeout values for downloads and retries
- Progress bar animation style and color
- History pagination/filtering options

</decisions>

<specifics>
## Specific Ideas

- User workflow: paste a Sharecode in a text field, immediately see it appear in a queue with "processing..." status
- Similar to how Faceit CLI `faceit download` works — fast feedback, async processing
- History should show which imports succeeded and which failed with clear reason

</specifics>

<canonical_refs>
## Canonical References

### Existing Architecture
- `.planning/PROJECT.md` — Core value and architectural decisions (async Redis queuing, Symfony API)
- `symfony/src/Application/Demo/` — Demo upload endpoint patterns (DemoResponseFactory, validation approach)
- `python/workers/` — Existing worker pattern for async job processing

### Related Phases
- Phase 2 (Symfony API) — Baseline API patterns and validation
- Phase 3 (Python Analysis Pipeline) — Worker pattern, error handling, logging
- Phase 6 (Frontend UI) — Demo upload form structure, React Query patterns
- Phase 7 (Enhanced ML) — Production readiness, observability

### API Integration
- Steam Community API documentation (external reference for Sharecode fetching)
- Faceit API documentation (external reference)
- ESEA API documentation (external reference)

</canonical_refs>

<deferred>
## Deferred Ideas

- Machine learning on import patterns (e.g., "user often imports demos from region X")
- Batch API key management for high-volume imports (belongs in separate admin phase)
- Scheduled imports via webhook (e.g., import demo every time a Sharecode is posted to Discord)

</deferred>

---

*Phase: 08-demo-download-sharecode*
*Context gathered: 2026-05-16*
