# Phase 23: Player Profile Detail - Implementation Plan

**Phase:** 23 (Player Profile Detail)
**Status:** Ready for execution
**Scope:** Create comprehensive player profile pages with main profile + sub-routes, on-demand stat computation, Steam enrichment (optional), and research signal framing
**Research:** Complete (23-RESEARCH.md) - 80% assets reusable, 3 new endpoints/pages required
**Dependencies:** Phase 17 (Steam Profile), Phase 19 (UI/UX integration planned), existing TRACE/demo APIs
**Estimated Duration:** 8-12 hours (2-3 day sprint)

---

## Executive Summary

Phase 23 creates a unified player profile surface by implementing:
1. Main profile page (`/players/{playerId}`) with 4 core sections (TRACE, demos, stats, Steam enrichment)
2. Sub-routes for detailed exploration (`/demos`, `/stats`)
3. New backend endpoint for map/weapon stats aggregation (last 30 days, on-demand)
4. Prominent research signal disclaimer at top of profile
5. Parallel coordination with Phase 19 for design integration

**Key Metrics:**
- 1 new backend endpoint required
- 3 new frontend pages/routes required
- 2-3 new React hooks needed
- ~25 components/utilities reusable from existing codebase
- ~8-12 hours total effort (Wave estimates below)

---

## Wave Breakdown

### Wave 1: Backend Stats Endpoint (1-2 hours)
**Goal:** Implement `GET /api/players/{steamId}/stats?window=30d` endpoint for map/weapon aggregation

**Acceptance Criteria:**
- [ ] New endpoint returns map affinity (top 3 maps by demo count, win rate per map)
- [ ] Endpoint returns weapon stats (primary weapons, usage count, kill rate)
- [ ] Results aggregated over specified window (default: last 30 days)
- [ ] Endpoint handles missing data gracefully (returns empty arrays, not errors)
- [ ] HTTP cache headers set correctly (1-hour cache for stats)
- [ ] Response includes metadata (data_window, computed_at, demo_count)

**Tasks:**
1. **T-23-01:** Create `GetPlayerStatsQuery` CQRS query handler
   - Input: `steamId`, `window` (default: "30d")
   - Output: `PlayerStatsDTO` with `maps`, `weapons`, `metadata`
   - Logic: Query `AnalysisResult` for player demos in window, aggregate feature data
   - Reference: `GetPlayerComparisonQuery` pattern in research

2. **T-23-02:** Create `PlayerStatsRepository::getMapAffinity()` method
   - Return: Array of maps with demo count, win rate, average TRACE score
   - Use: `TraceRatingRepository::findByPlayerSince()` for time-windowed data

3. **T-23-03:** Create `PlayerStatsRepository::getWeaponStats()` method
   - Return: Array of primary weapons (rifle, SMG, sniper, utility) with usage/kill rates
   - Parse: Feature data from `AnalysisResult::feature_data` JSON
   - Handle: Missing weapon data gracefully (e.g., demo lacks weapon telemetry)

4. **T-23-04:** Create `PlayerStatsController::stats()` endpoint
   - Route: `GET /api/players/{steamId}/stats`
   - Query params: `window` (optional, default "30d", also "all", "10d")
   - Cache header: `Cache-Control: public, max-age=3600`
   - Error handling: 404 if player not found, 400 if invalid window

5. **T-23-05:** Write integration tests
   - Test map affinity calculation with fixture demos
   - Test weapon aggregation with missing data
   - Test time-window filtering
   - Test cache headers

**Definition of Done:**
- Endpoint tested with real demo data
- Response time <1s for typical player (100+ demos)
- Cache headers correct
- Documentation in code comments
- No architectural changes to existing schemas

---

### Wave 2: Frontend Main Profile Page (3-4 hours)
**Goal:** Implement main player profile page at `/players/{playerId}` with 4 core sections

**Acceptance Criteria:**
- [ ] Page route created at `frontend/app/players/[playerId]/page.tsx`
- [ ] Prominent research disclaimer banner at top of page (D-26)
- [ ] TRACE score & components section displays correctly (D-05 to D-08)
- [ ] Demo history table section displays (first 10 demos, paginated, D-09 to D-12)
- [ ] Map & weapon stats section shows last 30 days data (D-13 to D-17)
- [ ] Steam profile section conditionally shown only if data available (D-18 to D-21)
- [ ] All sections have inline context labels (D-27)
- [ ] Page is responsive at 320px, 768px, 1024px, 1440px breakpoints
- [ ] Loading states and error handling present
- [ ] Research signal language throughout

**Tasks:**
1. **T-23-06:** Create main profile page component
   - File: `frontend/app/players/[playerId]/page.tsx`
   - Layout: Research disclaimer banner → 4 sections in card layout
   - Use existing `Card`, `Badge`, `Alert` components from shadcn
   - Fetch data: `usePlayerProfile()` hook (new, defined in T-23-08)
   - Loading: Show skeleton loaders for each section
   - Error: Display error card with retry button

2. **T-23-07:** Create research disclaimer banner component
   - File: `frontend/components/ResearchDisclaimerBanner.tsx`
   - Content: "This player profile shows research signals from post-game demo analysis. Scores are for research review only, not proof of cheating."
   - Visual: Warning color (amber), icon, clear typography
   - Sticky: Fixed or sticky at top while scrolling (per D-26)
   - Placement: Top of page, always visible

3. **T-23-08:** Create `usePlayerProfile()` React Query hook
   - Fetch: `GET /api/players/{steamId}/trace-history` (existing)
   - Fetch: `GET /api/players/{steamId}/history` (existing, includes Steam profile)
   - Fetch: `GET /api/players/{steamId}/stats?window=30d` (new, Wave 1)
   - Return: Combined data object with all 3 requests
   - Caching: Leverage React Query defaults (5min for TRACE, 1h for stats)
   - Error handling: Return partial data if individual requests fail

4. **T-23-09:** Create TRACE section component
   - File: `frontend/components/PlayerProfile/TraceSection.tsx`
   - Display: Overall TRACE score, percentile rank
   - Display: Component breakdown (6 components: aimbot, wallhack, triggerbot, recoil, bhop, session)
   - Reuse: Existing `TraceComponentChart`, `PercentileBadge` components
   - Context label: "95th percentile TRACE score (research signal)"
   - Render: Bar chart or grid layout with component scores and percentiles

5. **T-23-10:** Create demo history section component
   - File: `frontend/components/PlayerProfile/DemoHistorySection.tsx`
   - Display: Paginated table (first 10, limit/offset pagination)
   - Columns: Demo ID, Date, Map, Outcome (W/L/D), TRACE score, Action link to results
   - Pagination: "Load more" button or page controls
   - Sort: Fixed sort by date descending (no user sort in Phase 23)
   - Responsive: Table scrolls horizontally on small screens
   - Context label: Research signal framing on TRACE score column

6. **T-23-11:** Create stats section component
   - File: `frontend/components/PlayerProfile/StatsSection.tsx`
   - Display: Map affinity (top 3 maps, demo count, win rate per map)
   - Display: Weapon stats (primary weapons, usage count, kill rate)
   - Window label: "Statistics from last 30 days"
   - Empty state: "Insufficient data" if <2 demos in window (D-17)
   - Reuse: Simple card/grid layout with icons or badges
   - Context label: "Recent activity (last 30 days)"

7. **T-23-12:** Create Steam profile section component
   - File: `frontend/components/PlayerProfile/SteamProfileSection.tsx`
   - Conditional: Only render if Steam profile data exists (prop check)
   - Display: Avatar, persona name, account age, community profile link
   - Display: Inventory value if available, with "for research reference only" label
   - Visual: Compact badge/card layout (reuse Phase 17 SteamPlayerProfileBadge if available)
   - Research labels: "Account age: for research reference only" (D-21)

8. **T-23-13:** Update leaderboard links
   - File: `frontend/app/leaderboards/page.tsx`
   - Change: Player name links from `/players/{playerId}/compare` to `/players/{playerId}`
   - Keep: Compare accessible via button or navigation from new profile page

9. **T-23-14:** Write component tests
   - Test: Each section renders with mock data
   - Test: Loading and error states
   - Test: Research language in disclaimers and context labels
   - Test: Responsive layout (basic snapshot tests)
   - Test: Optional Steam profile conditional rendering

**Definition of Done:**
- Main profile page fully functional
- All sections display with real API data
- Responsive design tested at breakpoints
- Research signal framing throughout
- No console errors or warnings

---

### Wave 3: Frontend Sub-Routes (2-3 hours)
**Goal:** Implement `/demos` and `/stats` sub-routes for detailed exploration

**Acceptance Criteria:**
- [ ] `/players/{playerId}/demos` page displays full demo history with pagination
- [ ] `/players/{playerId}/stats` page displays detailed map/weapon stats
- [ ] Both pages include breadcrumb or sidebar navigation
- [ ] Consistent layout and styling with main profile
- [ ] Research disclaimers present on both pages
- [ ] Responsive design working

**Tasks:**
1. **T-23-15:** Create `/demos` sub-route page
   - File: `frontend/app/players/[playerId]/demos/page.tsx`
   - Layout: Breadcrumb → Demo history table (full, more columns, sortable)
   - Pagination: Offset/limit with page controls (10-20 demos per page)
   - Columns: Demo ID, Date, Map, Outcome, TRACE score, Duration, Player count, Action link
   - Optional in Phase 23: No sorting/filtering UI (defer to Phase 19)
   - Research disclaimer: Show at top (reuse banner component)

2. **T-23-16:** Create `/stats` sub-route page
   - File: `frontend/app/players/[playerId]/stats/page.tsx`
   - Layout: Breadcrumb → Detailed stats view
   - Sections: Map affinity (expanded view with charts), weapon performance (expanded grid)
   - Charts: Recharts line chart for TRACE trend over 30 days (if data available)
   - Time window: "Last 30 days" prominently displayed
   - Research disclaimer: Show at top

3. **T-23-17:** Create breadcrumb/navigation component
   - File: `frontend/components/PlayerProfile/ProfileNav.tsx`
   - Show: Player name, current section (Overview/Demos/Stats/Compare)
   - Links: Navigate between sections
   - Breadcrumb: e.g., "Leaderboards > Player > Demos"
   - Reuse: shadcn breadcrumb component

4. **T-23-18:** Write sub-route tests
   - Test: Page navigation between sections
   - Test: Pagination works on `/demos`
   - Test: Stats charts render on `/stats`
   - Test: Breadcrumb navigation correct

**Definition of Done:**
- Both sub-routes fully functional
- Navigation between sections working
- Pagination and responsive design verified
- Research framing consistent

---

### Wave 4: Research Framing & Disclaimers (1-2 hours)
**Goal:** Implement prominent research signal framing throughout player profiles (D-26 to D-29)

**Acceptance Criteria:**
- [ ] Disclaimer banner at top of every player profile page (main + sub-routes)
- [ ] Inline context labels on all data sections (TRACE, demos, stats, Steam)
- [ ] Research signal language used throughout (never "proof," never "cheater")
- [ ] Inventory value label includes "for research reference only"
- [ ] Account age label includes disclaimer
- [ ] All components have research context in code/comments

**Tasks:**
1. **T-23-19:** Create research context labels utility
   - File: `frontend/lib/research-context.ts`
   - Export: Functions for consistent disclaimer text
   - Example: `getTraceContextLabel()` → "95th percentile TRACE score (research signal)"
   - Example: `getSteamContextLabel()` → "Account age: for research reference only"
   - Usage: Imported by all profile components to ensure consistency

2. **T-23-20:** Add context labels to all sections
   - TRACE section: "TRACE score (research signal)" + "Component suspicion (research signal)"
   - Demo history: "TRACE score (research signal)" on score column
   - Stats section: "Recent activity (last 30 days)" + time window label
   - Steam section: All fields labeled "for research reference"
   - Implementation: Use utility from T-23-19

3. **T-23-21:** Verify research language throughout
   - Audit: Every mention of suspicion/score uses "signal," "pattern," "evidence"
   - Audit: Never use "proof," "cheater," "ban," "confirmation"
   - Audit: TRACE/scores always framed as research tool for review
   - Update: Any violating language in comments, tooltips, labels

4. **T-23-22:** Write compliance tests
   - Test: Disclaimer banner present on all player pages
   - Test: Context labels render correctly on all sections
   - Test: No forbidden language ("proof", "cheater") in rendered text
   - Test: Steam data labels correct

**Definition of Done:**
- All research signal framing complete and consistent
- Compliance tests passing
- Code review confirms language appropriate

---

### Wave 5: Verification & Testing (1-2 hours)
**Goal:** Verify all components integrated, test end-to-end workflows, ensure Phase 19 coordination

**Acceptance Criteria:**
- [ ] All waves integrated without conflicts
- [ ] End-to-end: Leaderboard → Main profile → Sub-routes → Compare all working
- [ ] On-demand stat computation working for 100+ demo players
- [ ] Cache headers correct (5min TRACE, 1h stats)
- [ ] Mobile responsive (tested at 320px, 768px, 1024px, 1440px)
- [ ] Research disclaimers present throughout
- [ ] No console errors or warnings
- [ ] Performance acceptable (<2s page load)

**Tasks:**
1. **T-23-23:** Full end-to-end testing
   - Test: Leaderboard → Click player → Main profile loads
   - Test: Main profile → Click "View all demos" → `/demos` page loads
   - Test: Main profile → Click "View stats" → `/stats` page loads
   - Test: Main profile → Click "Compare" → Comparison modal/page loads
   - Test: Pagination works on demo history
   - Test: Stats update when window changes (manual cache invalidation)

2. **T-23-24:** Performance testing
   - Test: Page load time for player with 50 demos (<1.5s)
   - Test: Page load time for player with 200 demos (<2s)
   - Test: Back navigation fast (cached React Query data reused)
   - Test: Stat endpoint response time <1s
   - Measure: Network waterfall, JS execution, paint times

3. **T-23-25:** Responsive design verification
   - Test at breakpoints: 320px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
   - Verify: Tables collapse/scroll on small screens
   - Verify: Stack layout on mobile (vertical cards)
   - Verify: Touch targets adequate (min 44px)
   - Verify: Text readable without zooming

4. **T-23-26:** Phase 19 coordination checkpoint
   - Verify: Component structure is conducive to design token application
   - Verify: No custom colors/spacing that conflict with console design system
   - Verify: Tailwind patterns used (not custom CSS)
   - Document: Any assumptions about Phase 19 integration

5. **T-23-27:** Write final integration tests
   - Test: All components render without errors
   - Test: Data flows correctly through hooks
   - Test: Error states handled gracefully
   - Test: Accessibility basics (keyboard nav, focus states, color contrast)

6. **T-23-28:** Documentation & cleanup
   - Document: New components and hooks in code comments
   - Document: New backend endpoints in API docs or README
   - Cleanup: Remove any console.log or debug code
   - Update: Frontend README if needed

**Definition of Done:**
- All tests passing
- End-to-end workflows verified
- Performance acceptable
- Phase 19 coordination clear
- Ready for production merge

---

## Success Criteria Summary

| Criterion | Wave | Verification |
|-----------|------|--------------|
| Main profile page at `/players/{playerId}` | 2 | Route exists, loads data, renders 4 sections |
| Sub-routes `/demos` and `/stats` | 3 | Both routes exist, navigation works, pagination works |
| Backend stats endpoint | 1 | GET `/api/players/{steamId}/stats?window=30d` returns correct data, cache headers set |
| TRACE section displays components & percentiles | 2 | Component list + percentile ranks rendered with reused components |
| Demo history paginated table | 2 | Table shows 10-20 demos, pagination controls work, chronological sort |
| Map/weapon stats from last 30 days | 2, 3 | Stats endpoint works, stats section displays, stats page shows detail |
| Steam profile optional (only if available) | 2 | Section omitted if no data, shows avatar/name/age/inventory if available |
| Prominent research disclaimer at top | 4 | Banner visible on all player pages, research language throughout |
| On-demand computation (no batch jobs) | 1, 2 | Stats computed when page viewed, response time acceptable |
| Phase 19 coordination (parallel work) | 5 | Component structure ready for design token integration |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stats endpoint slow for players with 200+ demos | High | Query optimization in T-23-02/03, add indexes if needed, cache invalidation strategy |
| React Query caching conflicts | Medium | Test cache behavior with manual invalidation, document cache TTLs |
| Steam profile data missing breaks layout | Medium | Conditional rendering in T-23-12, test with null Steam data |
| Responsive design breaks at edge sizes | Medium | Test at 320px and 1440px explicitly in T-23-25 |
| Research language not consistent | High | Utility functions (T-23-19) + compliance tests (T-23-22) ensure consistency |
| Phase 19 design tokens not compatible | Low | Early coordination checkpoint (T-23-26), use Tailwind not custom CSS |

---

## Dependencies & Sequencing

```
Wave 1 (Backend) ─→ Wave 2 (Frontend Main Profile) ─→ Wave 3 (Sub-routes)
                         ↓
                    Wave 4 (Research Framing)
                         ↓
                    Wave 5 (Verification)
```

- **Wave 1 must complete before Wave 2** (stats endpoint needed for main profile stats section)
- **Wave 2 must complete before Wave 3** (sub-routes build on main profile patterns)
- **Wave 4 can run in parallel with Wave 2-3** (research framing added after components created)
- **Wave 5 runs last** (verification of all waves)

---

## Phase 19 Coordination Notes

Phase 19 (UI/UX Console Redesign) runs in parallel. This plan assumes:
- Phase 23 builds functional profiles with basic Tailwind styling
- Phase 19 will integrate player profiles into console design tokens (colors, typography, spacing)
- Phase 23 uses standard shadcn/Tailwind patterns, no custom CSS
- Phase 19 can refactor styling without changing component logic
- Responsive behavior (320px, 768px, 1024px, 1440px) verified in Phase 23; Phase 19 can refine

**Handoff to Phase 19:**
- Component structure and data flow finalized
- Research framing locked (per D-26 to D-29)
- API contracts stable
- Phase 19 applies design tokens, refines styling, adds keyboard navigation polish

---

## Appendix: File Manifest

### Backend (New/Modified)
- `symfony/src/Application/Query/GetPlayerStatsQuery.php` (new)
- `symfony/src/Application/Dto/PlayerStatsDTO.php` (new)
- `symfony/src/Infrastructure/Persistence/PlayerStatsRepository.php` (new)
- `symfony/src/Presentation/Controller/PlayerStatsController.php` (new)
- `symfony/tests/Presentation/Controller/PlayerStatsControllerTest.php` (new)

### Frontend (New/Modified)
- `frontend/app/players/[playerId]/page.tsx` (new)
- `frontend/app/players/[playerId]/demos/page.tsx` (new)
- `frontend/app/players/[playerId]/stats/page.tsx` (new)
- `frontend/components/ResearchDisclaimerBanner.tsx` (new)
- `frontend/components/PlayerProfile/TraceSection.tsx` (new)
- `frontend/components/PlayerProfile/DemoHistorySection.tsx` (new)
- `frontend/components/PlayerProfile/StatsSection.tsx` (new)
- `frontend/components/PlayerProfile/SteamProfileSection.tsx` (new)
- `frontend/components/PlayerProfile/ProfileNav.tsx` (new)
- `frontend/lib/hooks/usePlayerProfile.ts` (new)
- `frontend/lib/research-context.ts` (new)
- `frontend/app/leaderboards/page.tsx` (modified - update player links)
- `frontend/__tests__/components/PlayerProfile/*.test.tsx` (new)

### Documentation
- `.planning/phases/23-player-profile-detail/23-RESEARCH.md` (created by research phase)
- `.planning/phases/23-player-profile-detail/23-CONTEXT.md` (created by discuss phase)
- `.planning/phases/23-player-profile-detail/23-PLAN.md` (this file)

---

**Next Step:** Execute Wave 1 (Backend stats endpoint) with `/gsd-execute-phase 23 --wave 1` or begin Wave 1 tasks directly.

*Plan created: 2026-05-19*
*Research reference: 23-RESEARCH.md*
*Context reference: 23-CONTEXT.md*
