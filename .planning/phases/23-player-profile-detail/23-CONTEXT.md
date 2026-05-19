# Phase 23: Player Profile Detail - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 23 implements comprehensive player profile views and analysis detail pages. Currently, players are accessible only through leaderboards (list view), comparisons (`/players/{playerId}/compare`), or demo results. This phase creates a unified player profile surface with:

- **Main profile page** at `/players/{playerId}` with core sections (TRACE, demos, stats, Steam enrichment)
- **Sub-routes** for detailed views (`/players/{playerId}/demos`, `/players/{playerId}/stats`, etc.)
- **Demo history** paginated table showing chronological demo records
- **Map & weapon statistics** aggregated over last 30 days
- **Steam profile enrichment** (optional) showing avatar, persona, account age, inventory where available
- **Research signal framing** with prominent disclaimer at top of profile

This phase does not alter scoring, suspicion labels, or detection models. All outputs remain research signals. Phase 19 (UI/UX Console Redesign) will run in parallel to integrate player profiles into the console design system; Phase 23 builds functional structure now.

</domain>

<decisions>
## Implementation Decisions

### Route Structure: Main Profile + Sub-Routes
- **D-01:** Main player profile page at `/players/{playerId}` displays overview of player data across all available metrics.
- **D-02:** Sub-routes exist for detailed exploration:
  - `/players/{playerId}/demos` - Paginated demo history and filtering
  - `/players/{playerId}/stats` - Detailed map affinities, weapon performance, temporal trends
  - `/players/{playerId}/compare` - Existing comparison route (redirects from main profile or accessible from sidebar)
- **D-03:** Main profile serves as the entry point when navigating from leaderboards or other surfaces; compare is accessed as an optional action (e.g., "Compare with another player" button).
- **D-04:** All routes share consistent layout and navigation; sidebar or breadcrumbs orient user within player context.

### Profile Content: Four Core Sections

#### Section 1: TRACE Score & Components
- **D-05:** Display overall TRACE score (e.g., "74.2") with percentile rank in context (e.g., "Top 12% globally").
- **D-06:** Show component breakdown (aimbot, wallhack, triggerbot, recoil, bhop, session) with individual scores and visual indicators (e.g., bar charts, risk badges).
- **D-07:** Include percentile rank for each component so player can see relative standing.
- **D-08:** TRACE data aggregates all demos on-demand (no pre-computation); computed when profile is viewed.

#### Section 2: Demo History
- **D-09:** Display paginated table (10-20 demos per page) showing:
  - Demo ID / sharecode
  - Date / time
  - Map
  - Player outcome (win/loss/draw)
  - TRACE score for that demo
  - Quick link to full demo analysis results
- **D-10:** Demos ordered chronologically (newest first).
- **D-11:** Table must be scrollable/responsive for mobile; consider collapsible columns for smaller screens.
- **D-12:** Pagination uses standard offset/limit; default sort is by date descending.

#### Section 3: Map & Weapon Statistics
- **D-13:** Show aggregated statistics over **last 30 days** only (focused, recent activity view).
- **D-14:** **Map affinity:** Top 3 maps by appearance count, with win rate or TRACE score per map.
- **D-15:** **Weapon performance:** Favorite primary weapons (rifle, SMG, sniper, utility) with kill count / usage rate / win rate where available from demo parser.
- **D-16:** Statistics are computed on-demand (query-based aggregation) when profile is viewed; no pre-computation job.
- **D-17:** If a player has fewer than 2 demos in the last 30 days, display "Insufficient data" placeholder rather than zero counts.

#### Section 4: Steam Profile Enrichment (Optional)
- **D-18:** **Display only if Steam profile data is available** for the player (from Phase 17 snapshots).
- **D-19:** If available, show a compact Steam badge/card including:
  - Steam avatar (profile picture)
  - Persona name (CS2 in-game name from Steam)
  - Account age (calculated from account creation timestamp)
  - Community profile URL (clickable link)
  - Optional: Inventory value (research-context label, e.g., "~$2,500 market value" with "research reference only" note)
  - Last refreshed timestamp
- **D-20:** If Steam profile is unavailable or private, **omit the section entirely**; do not show a placeholder or "not available" message that takes up space.
- **D-21:** Inventory value and account age must include explicit research-context labels (e.g., "for reference, not proof").

### Data Aggregation & Caching Strategy
- **D-22:** All player stats (TRACE, demos, map/weapon stats) are **computed on-demand** when the profile is viewed, not pre-computed.
- **D-23:** Query strategy:
  - **TRACE score:** Call existing TRACE calculation for all player's demos; compute percentiles against leaderboard baseline.
  - **Demos:** Query `AnalysisResult` table filtered by `steam_id`, order by `created_at DESC`, apply pagination.
  - **Map/weapon stats:** Aggregate demo results from last 30 days; compute win rates, usage counts from `AnalysisResult` feature data.
  - **Steam profile:** Fetch latest `SteamSnapshot` for player's `steam_id` if it exists; use cache-headers compatible with Phase 17 refresh strategy.
- **D-24:** Performance: For players with 100+ demos, on-demand aggregation may incur a ~500ms-1s backend query cost. If this becomes a bottleneck, consider caching TRACE aggregates in a dedicated table (defer to Phase 20+ optimization if needed).
- **D-25:** HTTP cache headers: TRACE scores cache for 5 minutes (demo analysis can shift TRACE); stats cache for 1 hour (less volatile).

### Research Signal Framing & Disclaimers
- **D-26:** **Prominent disclaimer banner at top of player profile:**
  - Location: Above the fold, sticky or fixed at top while scrolling
  - Content: "This player profile shows research signals from post-game demo analysis. Scores are for research review only, not proof of cheating."
  - Visual treatment: Warning background color (yellow/amber), medium emphasis, clear typography
  - Present on main profile, `/players/{playerId}` (all sections visible)
- **D-27:** Inline context labels on key sections:
  - TRACE score: "95th percentile TRACE score (research signal)"
  - Component breakdown: "Aimbot suspicion (research signal based on crosshair patterns)"
  - Weapon stats: "Usage in last 30 days" (neutral, data-driven language)
  - Account age: "For research reference only; does not indicate intent"
- **D-28:** Never frame scores as "confidence player is cheating" or "cheater rank." Language must remain "suspicion," "signal," "research signal," "evidence pattern."
- **D-29:** If inventory value is shown, label it: "Inventory value: ~$2,500 (market estimate, not proof of anything)."

### Phase 19 (UI/UX Console Redesign) Coordination
- **D-30:** Phase 23 builds **functional player profiles** with minimal styling (basic layout, readable typography, accessible spacing).
- **D-31:** Phase 19 will integrate player profile pages into the console design system:
  - Apply console design tokens (colors, typography, spacing, component patterns)
  - Refine visual hierarchy (data-dense dashboard style, dark/OLED-friendly)
  - Ensure responsive behavior at breakpoints (320px, 768px, 1024px, 1440px)
  - Add keyboard navigation polish for analytics/profile workflows
- **D-32:** Phase 23 should use existing Tailwind + shadcn/base-ui patterns so Phase 19 integration is straightforward (no conflicting custom styles).
- **D-33:** Phase 23 should NOT block on Phase 19 design tokens; use functional defaults and let Phase 19 refactor styling.

### Navigation & Linking Strategy
- **D-34:** Leaderboard rows link to `/players/{playerId}` (main profile), not `/players/{playerId}/compare`.
- **D-35:** From main profile, users can:
  - Click "View all demos" to navigate to `/players/{playerId}/demos`
  - Click "View stats" to navigate to `/players/{playerId}/stats`
  - Click "Compare with another player" button to open compare UI (modal or navigate to `/players/{playerId}/compare?with=...`)
- **D-36:** Within sub-routes (demos, stats), a breadcrumb or sidebar shows player name and navigation to other sections.
- **D-37:** Comparison page remains at `/players/{playerId}/compare?with={otherPlayerId}` and is accessible from profile or leaderboards.

### API Contracts & Backend
- **D-38:** Reuse existing backend APIs where possible:
  - GET `/api/players/{steamId}/trace` (if exists) or compute on-demand from existing endpoints
  - GET `/api/players/{steamId}/history` (Phase 17 already exists; extend with optional Steam profile enrichment)
  - GET `/api/demos?steam_id={steamId}&limit=X&offset=Y` (leverage existing demo query API)
  - GET `/api/players/{steamId}/stats?window=30d` (new endpoint: returns map/weapon aggregates)
- **D-39:** If new backend endpoints are needed, they should follow existing naming/response patterns and include proper cache headers.
- **D-40:** All responses must handle missing Steam profile gracefully (null or omitted fields, not errors).

### Deferred to Phase 19
- **D-41:** Final visual polish (color theming, typography refinement, spacing optimization)
- **D-42:** Dark/light mode toggle integration and OLED-friendly palette
- **D-43:** Advanced responsive behavior at edge breakpoints (handled by Phase 19 design system)
- **D-44:** Detailed component animations or interactive transitions

</decisions>

<specifics>
## Specific Ideas

- Player profiles should feel like a **natural entry point** for users coming from leaderboards or demo results, not a secondary view. The main profile page should answer "who is this player?" with a quick scan.
- The **paginated demo table** should be sortable (by date, map, score) in future phases; Phase 23 can hardcode date-descending.
- **Map & weapon stats** aggregating only 30 days keeps the view focused and prevents long-tail historical data from obscuring trends.
- The **optional Steam profile** approach (omit if not available) avoids clutter and confusion; users won't wonder "why is the section empty?"
- **On-demand computation** is simpler for Phase 23 and acceptable because profile views are typically lower-traffic than leaderboards. If performance becomes an issue, Phase 20+ can add caching.
- **Prominent disclaimer** at the top of every profile ensures users cannot miss the research-signal framing, reducing risk of misinterpretation.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Prior Phase Context
- `.planning/PROJECT.md` - Post-game research scope and ethical boundary.
- `.planning/ROADMAP.md` - Phase 23 goal: Add comprehensive player profile views and analysis detail pages.
- `.planning/phases/17-steamprofile-usage/17-CONTEXT.md` - Steam profile snapshot schema and refresh strategy (Phase 23 consumes this data).
- `.planning/phases/19-frontend-ui-ux-analysis-console-redesign/19-CONTEXT.md` - Console design tokens and layout patterns (Phase 19 will refine Phase 23 styling).

### Existing Frontend Architecture
- `frontend/app/players/[playerId]/compare/page.tsx` - Existing player comparison page (Phase 23 adds main profile + sub-routes).
- `frontend/app/leaderboards/page.tsx` - Leaderboard that links to players (Phase 23 updates links to main profile).
- `frontend/lib/hooks/usePlayerComparison.ts` - Existing hook for player comparison data; may be reused/extended for profile data.
- `frontend/components/` - Existing component library (TRACE cards, tables, badges); Phase 23 reuses for consistency.

### Existing Backend APIs
- `symfony/src/Presentation/Controller/PlayerComparisonController.php` - Comparison endpoint structure.
- `symfony/src/Application/Query/GetPlayerComparisonQuery.php` - CQRS query pattern for player data.
- Phase 17 Player/Steam APIs - Steam profile, inventory, account enrichment endpoints.
- Phase 3+ AnalysisResult persistence - Demo results querying and aggregation.

### Research & Ethical Framing
- `.planning/phases/20-calibrate-high-review-signals-reduce-false-positives/20-CONTEXT.md` - Calibration posture and evidence gates (Phase 23 displays outputs within these constraints).
- `tasks/frontend-ui-ux-review.md` - UI/UX review with research-safe copy and explainability guidance.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlayerComparisonController` and `GetPlayerComparisonQuery` demonstrate the CQRS pattern for player data; Phase 23 can follow this pattern for profile queries.
- Existing components (TRACE card, component bar charts, demo table) can be reused/adapted for profile display.
- Tailwind + shadcn styling is consistent across the frontend; Phase 23 should match this approach.
- Phase 17's `SteamSnapshotRepository` and DTO can be queried for profile enrichment.

### Established Patterns
- **Frontend:** Next.js App Router, React Query for data fetching, TypeScript, Tailwind CSS, shadcn/base-ui components
- **Backend:** Symfony 7 with CQRS (MessageBus for queries), Doctrine ORM, PostgreSQL
- **Data flow:** Frontend fetches from backend API → backend queries Doctrine repositories → response serialized as JSON
- **Cache headers:** Use `Cache-Control` HTTP headers for client-side caching; server-side caching deferred to optimization phases

### Integration Points
- Leaderboard links to `/players/{playerId}` instead of `/players/{playerId}/compare`
- Main profile queries existing player history/TRACE APIs or new aggregation endpoints
- Sub-routes (demos, stats) extend the same data fetching patterns
- Steam profile badge conditionally rendered if data exists (Phase 17 contract)

</code_context>

<deferred>
## Deferred Ideas

- **Demo filtering & sorting UI:** Advanced filters (map, date range, score range, outcome) deferred to Phase 19 polish or future enhancement. Phase 23 provides paginated table only.
- **Pre-computed TRACE aggregates:** Batch job to pre-compute player TRACE stats deferred to Phase 20+ optimization if on-demand performance becomes a bottleneck.
- **Player comparison modal:** Inline comparison modal from profile page deferred; Phase 23 links to separate compare route.
- **Inventory details & breakdown:** Detailed weapon breakdown, market price tracking, item crafting analysis deferred. Phase 23 shows top-level inventory value only if available.
- **Historical trends over months:** Multi-month TRACE trend charts deferred. Phase 23 shows last 30 days of stats; longer trends can be added later.
- **Player matching & recommendations:** "Find similar players" or "suggested comparisons" deferred to Phase 20+.
- **Achievement badges or milestones:** Leaderboard rank badges, demo count milestones, etc., deferred to UI/UX polish.
- **Live player status (online/last seen):** Steam online status integration deferred; Phase 23 shows account age only.
- **Demo export or sharing:** Exporting player stats to PDF or sharing profile links deferred to future feature phases.
- **Advanced analytics (cohort analysis, temporal patterns):** Complex time-series analysis deferred to Phase 20+ research features.

</deferred>

---

*Phase: 23-player-profile-detail*
*Context gathered: 2026-05-19*
*Coordination: Phase 19 (parallel UI/UX integration)*
