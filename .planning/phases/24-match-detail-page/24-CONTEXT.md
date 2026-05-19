# Phase 24: Match Detail Page - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 24 adds a comprehensive match-level detail page for one analyzed CS2 demo. The page should behave like a post-game match report and research review surface: match summary, team score, participants, round/event navigation, player-level TRACE and suspicion research signals, heatmap/viewer entry points, and links into player profiles.

This phase does not change parsing semantics, model scoring, TRACE calculation, evidence thresholds, or enforcement behavior. It must stay post-game only and frame every detection-related value as a research signal, not proof.

</domain>

<decisions>
## Implementation Decisions

### Route and Identity
- **D-01:** Use the internal demo UUID as the route identity because that is the stable identifier already used by result, detail, viewer, and heatmap APIs.
- **D-02:** Add a canonical match detail route at `/matches/{demoId}` if no route exists yet. Preserve `/results/{demoId}` as the existing analysis-result surface; planning may link from `/results/{demoId}` to the new match page rather than replacing it outright.
- **D-03:** Display external provenance fields when they exist (sharecode, source platform, original filename, upload/import time), but do not require them for the page to render.

### Product Reference and Page Shape
- **D-04:** Use `https://csstats.gg/match/443694426` as the product reference: match header, map/date/provenance metadata, score line, team rosters, and tabbed match sections.
- **D-05:** Adapt the reference to this project rather than copying it. The CS2CD page should feel like a research console match report, not a public stats clone.
- **D-06:** The first viewport should answer: what match is this, what was the score/outcome, who played, and what research-review signals deserve attention.
- **D-07:** The page should be data-dense and operational. Avoid marketing-style hero sections, oversized explanatory copy, and decorative layouts.

### Core Match Sections
- **D-08:** The top summary includes map, score/outcome if available, status, upload/import/provenance metadata, analysis state, and actions for viewer/heatmap/download where available.
- **D-09:** Participant display uses team-oriented rosters or tables when team data exists. Rows link to `/players/{playerId}` for real Steam IDs.
- **D-10:** Participant rows include neutral match stats where available and research-signal badges/columns for TRACE or suspicion outputs. Labels must stay neutral: "review signal", "TRACE", "research signal".
- **D-11:** Main navigation should include tabs or segmented sections for Overview/Scoreboard, Rounds, Events, and Viewer/Heatmaps. Weapons and Duels parity with csstats is deferred unless the existing data already supports it without broad new parsing work.
- **D-12:** The Rounds section shows round number, winner, end reason, duration, kill count, first-kill tick, bomb plant flag, and an expandable event/kills view where existing APIs support it.
- **D-13:** The Events section surfaces notable kill/grenade/damage events from existing viewer endpoints, with flagged kill review signals and seek links into the viewer when possible.
- **D-14:** Viewer/Heatmaps should reuse the existing `DemoViewer` module and heatmap mode rather than rebuilding playback controls inside the match page.

### API and Data Contracts
- **D-15:** Reuse existing APIs first: `GET /api/demos/{id}`, `GET /api/demos/{id}/detail`, `GET /api/demos/{id}/rounds`, `GET /api/demos/{id}/events`, `GET /api/demos/{id}/ticks`, and `GET /api/demos/{id}/heatmap`.
- **D-16:** Add a match-summary endpoint or DTO only if existing payloads cannot provide team score, participant roster, or provenance cleanly enough for the page.
- **D-17:** Do not persist raw tick volume in PostgreSQL. Keep tick and heatmap behavior aligned with the Phase 13 cache-backed viewer pattern.
- **D-18:** If team/score/round/economy data is missing from older analyses, render graceful empty states and available sections instead of blocking the whole match page.

### Research and Safety Framing
- **D-19:** Show a prominent research-signal disclaimer near the top, consistent with Phase 23: "Research signals only, not proof."
- **D-20:** Do not use labels such as "cheater", "proof", "ban", or "conviction" in the page UI.
- **D-21:** Suspicion and TRACE outputs should explain their source and limitations. The match page is for post-game review and triage, not enforcement automation.
- **D-22:** Any csstats-inspired comparison is functional only: match report structure, tabs, scoreboards, and round/event navigation. Do not imply endorsement or scrape/copy proprietary content.

### Agent's Discretion
- Exact route-link placement between `/results/{demoId}` and `/matches/{demoId}`.
- Exact responsive layout, table column order, skeleton states, empty-state copy, icons, and tab styling.
- Whether to implement match sections as one page with in-page tabs or route-level subviews, as long as the primary route is usable by itself.
- Whether to add a narrow backend aggregation DTO or compose multiple existing frontend hooks, depending on what planning finds safest.

</decisions>

<specifics>
## Specific Ideas

- User supplied `https://csstats.gg/match/443694426` as the concrete reference. Observed reference behavior: match header with map/server/rank/date/demo metadata, team score and rosters, tabs for Scoreboard/Rounds/Weapons/Duels/Heatmaps, and a round-by-round view with outcome/economy/event details.
- The page should feel like a post-game match report first and a cheat-review workspace second. The user should be able to scan score, teams, rounds, and standout signals without opening the full viewer immediately.
- The existing `/results/{demoId}` page is currently analysis-first: `ResultsCard`, `TraceCard`, `SensitivityTuner`, and `DemoViewer`. Phase 24 should reorganize this experience around match context rather than simply adding more panels to results.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Safety Boundary
- `.planning/PROJECT.md` - Project purpose, Symfony/Python split, post-game research-only scope.
- `.planning/REQUIREMENTS.md` - Product requirements and ethical constraints.
- `.planning/ROADMAP.md` - Phase 24 roadmap goal and dependencies.
- `.planning/STATE.md` - Current project status and recent decisions.

### Prior Phase Context
- `.planning/phases/13-demo-viewer-heatmap/13-CONTEXT.md` - Viewer/heatmap scope, cache-backed tick/event APIs, and research-signal overlay boundaries.
- `.planning/phases/23-player-profile-detail/23-CONTEXT.md` - Player profile routes, research disclaimer language, and player-linking expectations.
- `.planning/phases/20-calibrate-high-review-signals-reduce-false-positives/20-CONTEXT.md` - Conservative signal framing and false-positive posture if present in this workspace.

### Existing Frontend Code
- `frontend/app/results/[id]/page.tsx` - Current demo result page that Phase 24 should complement or link from.
- `frontend/lib/hooks/useDemoDetail.ts` - Existing demo detail fetch pattern.
- `frontend/lib/types.ts` - Demo, round, event, heatmap, and detail DTO types.
- `frontend/components/ResultsCard.tsx` - Current player/demo result display and download action.
- `frontend/components/DemoDetail/TraceCard.tsx` - TRACE display component and research copy conventions.
- `frontend/components/DemoViewer/DemoViewer.tsx` - Existing viewer/heatmap container to reuse.
- `frontend/components/DemoViewer/SuspicionPanel.tsx` - Existing flagged kill review-signal list.
- `frontend/components/ResearchDisclaimerBanner.tsx` - Phase 23 disclaimer component for consistent safety framing.

### Existing Backend Code
- `symfony/src/UI/Api/DemoController.php` - Existing demo show/detail API routes.
- `symfony/src/UI/Api/DemoViewerController.php` - Existing rounds, events, ticks, and heatmap API routes.
- `symfony/src/Application/Handler/GetDemoDetailHandler.php` - Current detail payload composition and feature-vector wiring.
- `symfony/src/Application/Demo/DemoResponseFactory.php` - Shared demo response payload factory.

### External Reference
- `https://csstats.gg/match/443694426` - Product reference for match report structure, scoreboard/round tabs, and heatmap entry points. Use as inspiration only.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useDemoDetail(demoId)` already fetches `/api/demos/{id}/detail` with the authenticated session token and returns metadata, feature vectors, and baseline suspicion.
- `DemoViewer` already combines rounds, events, tick playback, player legend, heatmap mode, suspicion panel, and grenade inspector.
- `DemoViewerController` already exposes `rounds`, `events`, `ticks`, and `heatmap` routes for analyzed demos and handles cache/generation behavior.
- `ResultsCard` already handles pending/error/done analysis states and demo download.
- `TraceCard` already provides TRACE display conventions and can be reused where match-level player context permits.
- Phase 23 added player profile routes and a reusable research disclaimer pattern.

### Established Patterns
- Frontend uses Next.js App Router client pages, React Query hooks, Tailwind, lucide icons, and console-style components.
- Backend uses Symfony controllers with CQRS-style handlers for query payloads.
- Viewer data must be generated or cached outside the relational database; the frontend already handles "generating" states for ticks/heatmaps.
- Existing result UI favors research-safe language: "review signal", "suspicion level", "research signal", and "not proof".

### Integration Points
- Add `/matches/{demoId}` in the frontend and link to it from history/results surfaces where useful.
- Use `/api/demos/{id}/detail` for top-level metadata and current analysis outputs.
- Use `/api/demos/{id}/rounds` and `/api/demos/{id}/events` for round and event sections.
- Embed or link to `DemoViewer` for viewer/heatmap interactions.
- Link participant rows to `/players/{playerId}` when a real Steam ID is present and avoid profile links for demo-level placeholder Steam ID `0`.
- Add backend payload shape only after confirming whether current `DemoResponseFactory` plus viewer endpoints lack match score/team/participant data.

</code_context>

<deferred>
## Deferred Ideas

- Full csstats parity for Weapons and Duels tabs if the parser does not already expose the needed weapon/duel aggregates.
- Economy/buy-round visualizations unless round economy data is already persisted or cheaply available.
- Public share pages, embeds, PDF exports, or external match sharing.
- New scoring/calibration/model changes for match-level conclusions.
- Ban automation, live monitoring, client interaction, memory reading, or any enforcement workflow.
- Scraping or copying csstats content beyond using the supplied page as a visual/product reference.

</deferred>

---

*Phase: 24-match-detail-page*
*Context gathered: 2026-05-19*
