---
phase: 15
plan: 01b
type: execute
wave: 1
depends_on: ["15-01a"]
files_modified:
  - frontend/lib/hooks/useFilteredDemos.ts
  - frontend/components/Analytics/FilterSidebar.tsx
  - frontend/app/dashboard/page.tsx
  - frontend/lib/types.ts
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - User can select filters (map, rating band, outcome, timeframe) and see filtered demo list update in real-time
    - Filters persist to localStorage and auto-load on dashboard revisit
    - Filter sidebar is responsive and accessible
    - useFilteredDemos hook correctly composes React Query queryKey, triggering refetch when any filter changes
  artifacts:
    - path: frontend/lib/hooks/useFilteredDemos.ts
      provides: React Query hook for filter state + API call
      min_lines: 60
    - path: frontend/components/Analytics/FilterSidebar.tsx
      provides: UI component with map/rating/outcome/timeframe selectors
      min_lines: 120
    - path: frontend/app/dashboard/page.tsx
      provides: Dashboard integration with FilterSidebar + demo list
      min_lines: 80
    - path: frontend/lib/types.ts
      provides: TypeScript types for FilterCriteria, DemoSummaryDto, FilteredDemosResponse
      min_lines: 30
  key_links:
    - from: FilterSidebar.tsx
      to: useFilteredDemos hook
      via: callback onFilterChange
      pattern: updateFilters\(newFilters\)
    - from: useFilteredDemos hook
      to: GET /api/demos?filters=...
      via: React Query queryKey composition auto-trigger
      pattern: queryKey:.*filters
    - from: dashboard/page.tsx
      to: FilterSidebar + demo list
      via: local state composition
      pattern: <FilterSidebar|<DemoList

---

<objective>
Implement frontend filtering UI and React Query integration: useFilteredDemos hook with localStorage persistence, FilterSidebar component, and dashboard integration. This wave makes the backend filtering API (from 15-01a) accessible to users, enabling real-time multi-filter queries.

Purpose: Frontend filtering provides immediate user feedback and client-side state management. useFilteredDemos hook abstracts API calls, caching, and history management. Responsive FilterSidebar makes filtering intuitive.

Output: Working filter sidebar on authenticated dashboard, React Query hook for client-side caching, localStorage history management, demo list updated by filter changes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/15-advanced-analytics-user-scoping/15-CONTEXT.md
@.planning/phases/15-advanced-analytics-user-scoping/15-RESEARCH.md
@.planning/phases/14-landing-steam-login/14-CONTEXT.md

Reference implementations:
@frontend/lib/hooks/useTraceQuery.ts (React Query pattern reference)
@frontend/lib/api.ts (existing API client setup)
@frontend/components (existing component patterns, tailwind styling)

Filter specification (from 15-CONTEXT.md):
- Map: Single or multi-select from extracted demo map values (Mirage, Inferno, Nuke, Ancient, Vertigo, Dust2, etc.)
- Opponent Rating Band: ['0-5', '5-10', '10+', null] mapped to trace_adjusted percentile buckets
- Game Outcome: ['win', 'loss', 'draw', null] — requires outcome field in demo or computed from team scores
- Timeframe: [7, 30, 90, 999] days (999 = all-time), null = all-time
</context>

<tasks>

<task type="auto">
  <name>Task 1: Frontend: useFilteredDemos hook with React Query + localStorage history persistence</name>
  <files>
    frontend/lib/hooks/useFilteredDemos.ts
    frontend/lib/types.ts
  </files>
  <read_first>
    frontend/lib/hooks/useTraceQuery.ts (React Query usage pattern)
    frontend/lib/api.ts (existing API client setup)
    frontend/lib/types.ts (existing type patterns)
  </read_first>
  <action>
1. Extend frontend/lib/types.ts with new TypeScript interfaces (append to existing file):
   ```typescript
   export interface FilterCriteria {
     map?: string | null
     ratingBand?: '0-5' | '5-10' | '10+' | null
     outcome?: 'win' | 'loss' | 'draw' | null
     daysBack?: 7 | 30 | 90 | 999 | null
     limit: number        // default 20
     offset: number       // default 0
   }

   export interface DemoSummaryDto {
     id: string           // UUID
     map: string
     status: 'pending' | 'done' | 'error'
     uploadedAt: string   // ISO 8601 datetime
     traceAdjusted: number
     outcome?: 'win' | 'loss' | 'draw' | null
   }

   export interface FilteredDemosResponse {
     demos: DemoSummaryDto[]
     total: number
     hasMore: boolean
   }
   ```

2. Create frontend/lib/hooks/useFilteredDemos.ts:
   - Export function useFilteredDemos(initialFilters?: FilterCriteria):
     * State: filters (FilterCriteria), filterHistory (FilterCriteria[] max 5)
     * Constants: STORAGE_KEY = 'cs2cd_filter_history', MAX_HISTORY = 5
     * On mount: Load last filter combo from localStorage via JSON.parse(localStorage.getItem(STORAGE_KEY))
       - If stored array exists and length > 0, set filters to first item (most recent combo)
     * Function updateFilters(newFilters: Partial<FilterCriteria>):
       - Merge newFilters with current filters (shallow spread)
       - Save to localStorage: localStorage.setItem(STORAGE_KEY, JSON.stringify([merged, ...history.slice(0, 4)]))
       - setFilters(merged)
   - React Query setup:
     * useQuery with queryKey: ['demos', 'filtered', filters.map, filters.ratingBand, filters.outcome, filters.daysBack, filters.limit, filters.offset]
     * queryFn: Build URLSearchParams from filters, fetch GET /api/demos?{params}, parse response (FilteredDemosResponse)
     * Options:
       - staleTime: 60000 (1 min — filters change frequently, but individual combos recur)
       - gcTime: 300000 (5 min — keep cache if user navigates away and returns)
       - retry: 2 (network resilience)
   - Return object:
     * filters (current filter state)
     * updateFilters (callback to update and persist)
     * demos (parsed array of DemoSummaryDto)
     * total (for pagination info)
     * hasMore (boolean)
     * isLoading (React Query state)
     * error (error message or null)
     * filterHistory (recent combos for "Recent" UI if desired)

3. Error handling:
   - If fetch fails: error string "Failed to fetch filtered demos"
   - If API returns 400: surface error message from response body to user (via error state)
   - If localStorage full (unlikely < 50KB): silently skip history persistence, continue with current filters

4. Type safety:
   - All filter values explicitly typed (no any)
   - queryKey composition auto-triggers refetch when any filter element changes (React Query standard)
  </action>
  <verify>
    <automated>cd frontend && npm run test -- --run lib/hooks/useFilteredDemos.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - useFilteredDemos hook exists and exports function
    - Hook compiles without TypeScript errors (strict mode)
    - Test file useFilteredDemos.test.ts exists and all tests pass:
      * testInitializesWithEmptyFilters: On first load, filters = { limit: 20, offset: 0 }
      * testLoadsLastFilterComboFromLocalStorage: After setting filters once, closing tab, reopening → filters auto-load
      * testUpdateFiltersPersiststoLocalStorage: updateFilters({map: 'Mirage'}) → localStorage contains ['Mirage', ...]
      * testKeepsMaxFiveHistoryItems: Add 6 unique filter combos → history truncates to 5
      * testReactQueryRefetchsOnFilterChange: Change map filter → queryKey changes → useQuery triggers refetch
      * testHandlesAPIErrorGracefully: API returns 400 → error state populated with message
    - localhost:3000/dashboard loads, useFilteredDemos hook initializes without errors
    - localStorage browser tab shows 'cs2cd_filter_history' entry with valid JSON array
  </acceptance_criteria>
  <done>useFilteredDemos hook implemented with React Query, localStorage persistence, and full type safety; tests confirm query refetch on filter change and history management</done>
</task>

<task type="auto">
  <name>Task 2: Frontend: FilterSidebar component with map/rating/outcome/timeframe selectors</name>
  <files>
    frontend/components/Analytics/FilterSidebar.tsx
  </files>
  <read_first>
    frontend/lib/hooks/useFilteredDemos.ts (from Task 1)
    frontend/lib/types.ts (FilterCriteria type)
    frontend/components (existing component patterns, tailwind styling)
  </read_first>
  <action>
1. Create frontend/components/Analytics/FilterSidebar.tsx as React functional component:
   - Props: filters (FilterCriteria), onUpdateFilters (callback: (newFilters: Partial<FilterCriteria>) => void), isLoading (boolean)
   - Layout: Vertical sidebar (min-width 280px) with sections:
     * "Filters" header (bold, uppercase)
     * Map selector: Multi-select dropdown or checkboxes
       - Options: ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Vertigo', 'Dust2', 'Anubis']
       - Default: null (all maps)
       - Fires onUpdateFilters({map: selectedMap})
     * Rating Band selector: Radio buttons or select
       - Options: 'All' (null), '0-5 RWS', '5-10 RWS', '10+ RWS'
       - Fires onUpdateFilters({ratingBand: selected})
     * Outcome selector: Checkboxes for Win/Loss/Draw (multi-select allowed, null = all)
       - Options: 'All', 'Wins', 'Losses', 'Draws'
       - Fires onUpdateFilters({outcome: selected})
     * Timeframe selector: Radio buttons
       - Options: 'All-time' (999), 'Last 7 days' (7), 'Last 30 days' (30), 'Last 90 days' (90)
       - Default: null (all-time)
       - Fires onUpdateFilters({daysBack: selected})
     * Clear filters button: Resets all filters to default (null)
       - onClick: onUpdateFilters({map: null, ratingBand: null, outcome: null, daysBack: null, offset: 0})

2. UI/UX patterns per design conventions:
   - Use Tailwind CSS classes (existing project pattern)
   - Responsive: Hide sidebar on mobile (display-none below sm breakpoint), full width on desktop
   - Label styling: text-sm text-gray-600 for section headers
   - Selection styling: Highlight selected options with primary color (blue), unselected light gray
   - Loading state: Disable all inputs (opacity-50, cursor-not-allowed) during API fetch
   - Accessibility: All inputs have associated <label> elements, ARIA roles for dropdown/radio groups

3. State management:
   - All state lives in parent (dashboard page.tsx), this component is presentational
   - No local state except for dropdown open/close UI behavior if needed
   - Callbacks immediately invoke parent's onUpdateFilters

4. Optional "Recent Filters" section (if filterHistory available):
   - Display last 3 filter combos as quick-select buttons
   - Example: "Map: Mirage, Rating: 0-5, Last 7d" button → applies all three filters at once
   - onClick handler: onUpdateFilters({...previousCombo})
  </action>
  <verify>
    <automated>cd frontend && npm run test -- --run components/Analytics/FilterSidebar.test.tsx && npm run build 2>&1 | head -50</automated>
  </verify>
  <acceptance_criteria>
    - FilterSidebar.tsx compiles without TypeScript errors
    - Component accepts filters prop and renders selected values correctly
    - Clicking map selector fires onUpdateFilters({map: 'Mirage'})
    - Clicking rating band fires onUpdateFilters({ratingBand: '0-5'})
    - Clicking outcome fires onUpdateFilters({outcome: 'win'})
    - Clicking timeframe fires onUpdateFilters({daysBack: 30})
    - Clear filters button resets all to null
    - Component renders responsive: hidden on mobile, visible on desktop (tailwind breakpoints)
    - Test file FilterSidebar.test.tsx exists and tests pass:
      * testRendersAllSelectorSections: Component renders map, rating, outcome, timeframe sections
      * testCallsOnUpdateFiltersWhenSelectionChanges: Each selector change fires callback
      * testClearFiltersResetsAll: Clear button resets to null
      * testDisabledDuringLoading: isLoading={true} disables all inputs
  </acceptance_criteria>
  <done>FilterSidebar component fully functional with all four filter dimensions, responsive layout, accessibility, and proper callback firing; tests confirm interaction behavior</done>
</task>

<task type="auto">
  <name>Task 3: Integrate FilterSidebar into authenticated dashboard and connect to demo list display</name>
  <files>
    frontend/app/dashboard/page.tsx
  </files>
  <read_first>
    frontend/app/dashboard/page.tsx (existing dashboard structure)
    frontend/components/Analytics/FilterSidebar.tsx (from Task 2)
    frontend/lib/hooks/useFilteredDemos.ts (from Task 1)
  </read_first>
  <action>
1. Update frontend/app/dashboard/page.tsx Dashboard component:
   - Import useFilteredDemos hook and FilterSidebar component
   - Add state: const { filters, updateFilters, demos, total, hasMore, isLoading } = useFilteredDemos()
   - Layout: 2-column grid layout (or flex row):
     * Left column: FilterSidebar (sticky to viewport top, width 280px)
     * Right column: Demo list results (flex-grow, width remaining)

2. Demo list display:
   - For each demo in demos array, render demo card with:
     * Map name (filters.map or null if all)
     * Upload date (human-readable, e.g., "2 days ago")
     * TRACE score as primary metric (traceAdjusted, formatted 0.00-1.00)
     * Status badge (pending/done/error) with color coding
     * Outcome label if present (Win/Loss/Draw)
     * Click to navigate to demo detail: /demos/{id}
   - Empty state: If total === 0, show "No demos match your filters. Try adjusting the filters above."
   - Loading state: Show skeleton cards (or spinner) while isLoading
   - Pagination: If hasMore === true, show "Load More" button at bottom
     * onClick: updateFilters({offset: filters.offset + filters.limit})

3. Integration point with useFilteredDemos:
   - FilterSidebar.onUpdateFilters → calls updateFilters(newFilters)
   - updateFilters automatically updates React Query cache key
   - useQuery hook refetches demos based on new filter combination
   - Demo list re-renders with new data

4. Accessibility & UX:
   - Page title: "My Demos" or "Demo Analysis"
   - If user not authenticated: Redirect to login (existing middleware behavior from Phase 14)
   - Loading states provide visual feedback (spinner, skeleton cards)
   - Sort order: Always DESC by uploadedAt (most recent first, per task 1 ordering)
  </action>
  <verify>
    <automated>cd frontend && npm run dev &amp; sleep 3 &amp; npx playwright test e2e/dashboard-filters.spec.ts --headed 2>&1 | tail -30</automated>
  </verify>
  <acceptance_criteria>
    - Dashboard page loads without errors (console shows no TypeScript errors)
    - FilterSidebar appears on left side of dashboard with all four filter sections
    - Demo list appears on right side with demo cards
    - Clicking map selector in FilterSidebar → demo list updates to show only that map's demos
    - Clicking rating band → list updates with only matching suspicion levels
    - Clicking outcome → list updates with only matching win/loss/draw
    - Clicking timeframe → list updates with only recent demos
    - Pagination: 20 demos shown, clicking "Load More" appends next 20 to list
    - Empty state message displayed when zero demos match filters
    - localStorage persists filters: Close and reopen dashboard → last filter combo still applied
    - Responsive: Sidebar and list stack vertically on mobile, side-by-side on desktop
    - E2E test (if dashboard-filters.spec.ts created):
      * testDashboardLoadsWithoutFilters: Page loads, all demos visible
      * testApplyingMapFilterUpdateslist: Select map → only that map's demos shown
      * testFilterHistoryPersists: Apply filters, refresh page → same filters applied
  </acceptance_criteria>
  <done>Dashboard fully integrated with FilterSidebar, demo list display, pagination, and React Query-driven updates; localStorage ensures filter persistence across sessions</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → localStorage | Trusted (same-origin); user may manually edit localStorage, but filters just re-query, no injection risk |
| Authenticated → Unauthenticated | JWT token in httpOnly cookie; if expired, user auto-redirected to login (existing Phase 14 behavior) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-01b | Spoofing | Frontend claims false user_id in localStorage | Accept | localStorage persists filter state only; actual demo ownership verified by server JWT token (immune to client-side manipulation) |
| T-15-01d | Information Disclosure | Filter metadata endpoint (map list) exposed | Accept | Maps and rating bands are public information (inferred from leaderboards, Phase 12); no sensitive data leaked |

</threat_model>

<verification>
**Phase 15 Wave 1b Checklist:**

- [ ] useFilteredDemos hook tests pass (localStorage persistence, React Query refetch)
- [ ] FilterSidebar component renders all four filter dimensions with proper callbacks
- [ ] Dashboard page.tsx integrates FilterSidebar + demo list + pagination
- [ ] E2E test confirms filter workflow end-to-end (select filter → list updates → localStorage persists)
- [ ] Responsive design: Sidebar + list render correctly on mobile and desktop
- [ ] No TypeScript errors in dashboard build
- [ ] Frontend correctly consumes GET /api/demos?filters endpoint from 15-01a
- [ ] Error states handled gracefully (API 400/500 → user-visible error message)

**Open Questions for Executor:**

1. Does /api/analytics/filters/metadata endpoint exist and return expected enum from 15-01a? Confirm API contract.
2. Are Demo detail routes (/demos/{id}) already established from Phase 13? Confirm navigation targets.
3. Should FilterSidebar be sticky (always visible during scroll) or fixed? Per CONTEXT.md, no specific requirement; recommend sticky for UX.
</verification>

<success_criteria>
**Wave 1b Complete When:**

1. FilterSidebar component visible on /dashboard with all four filter selectors (map, rating, outcome, timeframe)
2. Adjusting any filter immediately updates demo list without page reload
3. Filter combinations persist to browser localStorage; closing and reopening dashboard re-applies last combo
4. Backend filtering from 15-01a works end-to-end with frontend
5. All React component tests pass: `npm run test -- --run lib/hooks/ components/Analytics/`
6. Responsive design passes visual inspection (mobile sidebar stacks, desktop side-by-side)
7. Pagination works: 20 demos per page, "Load More" appends next batch
8. Ready to proceed to Wave 2 (Sensitivity Tuner, feature vectors)

**Definition of Done:**

- Wave 1b SUMMARY.md committed to git with full execution notes
- All acceptance_criteria met for each task
- No TypeScript errors or warnings in build
- No blocking issues or warnings in console logs
- Frontend filtering ready to be consumed by downstream analytics features (15-02+)
</success_criteria>

<output>
After completion, create `.planning/phases/15-advanced-analytics-user-scoping/15-01b-SUMMARY.md`

Required sections:
- What was built (useFilteredDemos hook, FilterSidebar, dashboard integration)
- Verify each acceptance criteria (tests pass, responsive, localStorage persistence)
- Note any gaps discovered (e.g., missing API endpoint → escalate as gap)
- File changes (commit hashes, line counts added)
- Performance notes (React Query cache TTL, localStorage usage)
- Test coverage (unit/integration/E2E test counts, % of code tested)
- Next steps (Wave 1b ready to complete; Wave 2 ready to begin once 15-01a completes)
</output>
