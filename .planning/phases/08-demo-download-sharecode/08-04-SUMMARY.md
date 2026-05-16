---
phase: 08-demo-download-sharecode
plan: 04
subsystem: React Frontend - Sharecode Import UI
tags: [react-frontend, sharecode-import, real-time-progress, user-interface]
completion_date: 2026-05-16
duration: 30 minutes
task_count: 4
file_count: 10
requires: [08-02, 08-03]
provides: [SharecodeTab, ProgressList, ImportHistory, useImportSharecode, useImportHistory]
affects: [testing-phase-8, deployment]
tech_stack:
  - added: [React Query polling (2s interval), Radix UI Tabs, Tailwind CSS]
  - patterns: [React Query hooks (useQuery, useMutation), component composition, client-side validation]
key_files:
  - created: frontend/components/DemoImport/SharecodeTab.tsx
  - created: frontend/components/DemoImport/ProgressList.tsx
  - created: frontend/components/DemoImport/ImportHistory.tsx
  - created: frontend/lib/hooks/useImportSharecode.ts
  - created: frontend/lib/hooks/useImportHistory.ts
  - created: frontend/components/ui/textarea.tsx
  - created: frontend/components/ui/tabs.tsx
  - modified: frontend/app/page.tsx
  - created: frontend/__tests__/components/DemoImport/SharecodeTab.test.tsx
  - created: frontend/e2e/import-sharecode.spec.ts
decisions: []
metrics:
  - total_lines_added: 1247
  - commits: 4
  - verification_checks_passed: 4/4
---

# Phase 8 Plan 4: React Frontend - Sharecode Import UI Summary

**One-liner:** Implemented complete React frontend UI for sharecode import with real-time progress tracking, import history table, and error handling.

## Objective Achieved

Created a cohesive user experience for sharecode-based demo import: users paste sharecode(s), see real-time progress updates via polling, and can retry failed imports from history. All components follow Phase 6 design patterns and integrate seamlessly with existing upload flow.

## Tasks Completed

### Task 1: Create SharecodeTab component and useImportSharecode hook ✓

**Status:** COMPLETE
**Commits:** 164a259

**Deliverables:**

- `frontend/components/DemoImport/SharecodeTab.tsx` - Sharecode input component (118 lines)
  - Textarea for bulk sharecode paste (one per line)
  - Client-side format validation: CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX regex
  - Displays sharecode count and invalid format warnings inline
  - Submit button: enabled only when valid sharecodes present
  - Success message: "{N} demo(s) queued for import"
  - Error display: user-friendly error message from API
  - Loading state: textarea disabled, button shows "Importing..."
  - Card wrapper with title and description

- `frontend/lib/hooks/useImportSharecode.ts` - Mutation hook (36 lines)
  - useMutation wrapper for POST /api/demos/import-sharecode
  - Accepts array of sharecode strings
  - Returns ImportResponse with queued and failed counts
  - Error handling: re-throws with descriptive message

- `frontend/components/ui/textarea.tsx` - UI component (17 lines)
  - Styled textarea with consistent design system
  - Accessible with label support

- `frontend/components/ui/tabs.tsx` - UI component (52 lines)
  - Radix UI-based Tabs, TabsList, TabsTrigger, TabsContent
  - Responsive tab navigation with active state styling

**Verification:**
- ✓ SharecodeTab exports function component
- ✓ Textarea input renders with placeholder
- ✓ parseSharecodes() splits by newline and trims
- ✓ isValidSharecode() checks CSGO-XXXXX pattern
- ✓ useImportSharecode returns useMutation hook
- ✓ Mutates to /api/demos/import-sharecode endpoint
- ✓ Validation shows count and invalid warnings

### Task 2: Create ProgressList component and useImportHistory hook with polling ✓

**Status:** COMPLETE
**Commits:** 0efdfa9

**Deliverables:**

- `frontend/components/DemoImport/ProgressList.tsx` - Real-time progress display (149 lines)
  - Shows import status for requested sharecodes
  - Status icons: ⏳ pending, ⬇️ downloading, ⚙️ parsing, ✅ complete, ❌ failed
  - Progress bar: (complete + failed) / total
  - Status breakdown: "Pending: X | Downloading: Y | Parsing: Z | Done: C | Failed: F"
  - Per-sharecode display: sharecode code, platform badge, timestamp, status badge
  - Error messages: displayed for failed imports
  - Completed imports: link to /results/{demo_id}
  - Filters imports by requested sharecodes
  - Sorts by most recent first

- `frontend/lib/hooks/useImportHistory.ts` - Query hook with polling (26 lines)
  - useQuery for GET /api/demos/import-history
  - refetchInterval: 2000 (2-second polling per D-20)
  - refetchIntervalInBackground: true (continues polling in background)
  - Supports optional limit parameter (default 50)
  - Typed response: ImportHistoryItem[], total count

**Verification:**
- ✓ ProgressList exports function component
- ✓ statusIcon object has all status types
- ✓ refetchInterval set to 2000ms
- ✓ Queries import-history endpoint
- ✓ Filters imports by requested sharecodes
- ✓ Shows progress bar calculation
- ✓ Links to results for completed imports

### Task 3: Create ImportHistory component and integrate tabs into page ✓

**Status:** COMPLETE
**Commits:** fcbc38e

**Deliverables:**

- `frontend/components/DemoImport/ImportHistory.tsx` - History table (92 lines)
  - Scrollable table showing all user's past imports
  - Columns: Sharecode, Platform, Status, Imported At, Error, Action
  - Status badges with color coding
  - Completed imports show "View Results" link
  - Failed imports show "Retry" button (calls useImportSharecode)
  - Empty state: "No imports yet."
  - Loading state: "Loading history..."
  - Display total count: "{N} import(s) across all time"

- `frontend/app/page.tsx` - Updated page layout (with tabs)
  - Changed from 'use server' to 'use client' (necessary for tabs)
  - Added Tab interface with two triggers: "Upload File" and "Import by Sharecode"
  - Upload tab content: existing UploadForm
  - Sharecode tab content: SharecodeTab + ProgressList
  - ImportHistory always visible below tabs
  - Responsive max-width: 4xl (matches upload form)
  - Maintained header, footer, and styling

**Verification:**
- ✓ ImportHistory exports function component
- ✓ handleRetry() calls useImportSharecode mutation
- ✓ Table displays all six columns
- ✓ Status color mapping implemented
- ✓ Page has Tabs with two TabsTriggers
- ✓ SharecodeTab and ImportHistory imported
- ✓ Layout maintains spacing and responsive design

### Task 4: Add unit tests and E2E tests ✓

**Status:** COMPLETE
**Commits:** cb21b26

**Deliverables:**

- `frontend/__tests__/components/DemoImport/SharecodeTab.test.tsx` - Unit tests (158 lines)
  - Renders textarea with placeholder
  - Displays count of valid sharecodes
  - Shows invalid format warning for malformed codes
  - Disables submit button with no valid sharecodes
  - Enables submit button with valid sharecode
  - Submits multiple sharecodes as array
  - Shows success message on successful submission
  - Shows error message on failed submission
  - Disables textarea while submitting
  - Shows "Importing..." text during submission
  - Uses QueryClientProvider wrapper pattern
  - Mocks useImportSharecode hook

- `frontend/e2e/import-sharecode.spec.ts` - Playwright E2E tests (181 lines)
  - Tab visibility and switching
  - Sharecode count display
  - Invalid format rejection
  - Submit button state (enabled/disabled)
  - Import history section visibility
  - Table columns (Sharecode, Platform, Status, Imported At, Error, Action)
  - Multiple sharecode handling
  - Accepts clipboard paste
  - Default button text ("Import Demos")
  - Card displays title and description

**Verification:**
- ✓ Unit tests use jest and React Testing Library
- ✓ E2E tests use Playwright
- ✓ All major user flows covered
- ✓ Tests verify component behavior and UI state
- ✓ Mock patterns consistent with Phase 6 tests

## Must-Have Requirements Met

✓ **Upload page has two tabs: 'Upload File' and 'Import by Sharecode'**
  - Tabs component with TabsList and TabsTrigger for both tabs
  - Upload tab shows existing UploadForm
  - Sharecode tab shows SharecodeTab component

✓ **Sharecode tab shows textarea for pasting multiple sharecodes (one per line)**
  - Textarea with placeholder showing example format
  - parseSharecodes() splits by \n and trims whitespace
  - Displays count of parsed sharecodes

✓ **Submit button sends sharecodes to POST /api/demos/import-sharecode endpoint**
  - useImportSharecode hook with useMutation
  - Calls fetch with POST method and JSON body
  - Returns ImportResponse with queued/failed counts

✓ **Progress list shows status for each sharecode: pending → downloading → parsing → complete/error**
  - ProgressList component with status icons
  - Status badges show current state
  - Filters to display only requested sharecodes
  - Progress bar shows (complete + failed) / total

✓ **Progress updates every 2 seconds via polling GET /api/demos/import-history**
  - useImportHistory hook with refetchInterval: 2000
  - refetchIntervalInBackground: true for continuous polling
  - ProgressList uses useImportHistory data

✓ **Completed imports link to /results/{demo_id} for analysis results**
  - ProgressList and ImportHistory both show "View Results →" link
  - Link href set to `/results/{imp.demo_id}`

✓ **Failed imports show error reason**
  - ImportHistory table shows error_message in Error column
  - ProgressList shows error_message below sharecode info
  - User-friendly error display (not raw API errors)

✓ **Import history page displays past imports sorted by recent first with platform, status, error**
  - ImportHistory component shows table with all fields
  - Sorts by imported_at descending
  - Displays platform badge, status badge, error message
  - Shows total count

✓ **Failed imports can be retried from history**
  - ImportHistory shows "Retry" button for failed status
  - Retry calls useImportSharecode mutation with single sharecode
  - Disables button while mutation is pending

✓ **UI handles concurrent uploads + sharecode imports in same session**
  - Two separate tabs: Upload File and Import by Sharecode
  - Both can be used independently without blocking
  - ImportHistory shows all imports regardless of method

✓ **Sharecode format validated client-side before submission**
  - isValidSharecode() checks CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX format
  - Submit button disabled if any sharecode invalid
  - Invalid format warning shows count of invalid codes

## Design Decisions Applied

| Decision ID | Impact | Implementation |
|------------|--------|-----------------|
| D-18 | Tab-based interface | Tabs component with Upload and Sharecode tabs |
| D-19 | Bulk import via textarea | Textarea input, newline-separated parsing |
| D-20 | Real-time progress | 2-second polling with refetchInterval |
| D-21 | Import history | Table showing all user imports, sorted descending |
| D-22 | Retry capability | Retry button in ImportHistory for failed imports |

## Threat Model Mitigations Incorporated

| Threat ID | Category | Mitigation |
|-----------|----------|-----------|
| T-08-19 | Spoofing | Client-side format validation (regex) before submit; server re-validates |
| T-08-20 | Tampering | Import history data from API is immutable; displayed as-is |
| T-08-21 | Denial of Service | Max 100 sharecodes enforced server-side; UI shows count |
| T-08-22 | Information Disclosure | User-friendly error messages; detailed logs server-side only |
| T-08-23 | Elevation of Privilege | API returns only current user's imports (backend enforced) |

## Integration with Upstream Dependencies

- **08-02 (API Endpoint):** SharecodeTab calls POST /api/demos/import-sharecode; ProgressList and ImportHistory call GET /api/demos/import-history
- **08-03 (Python Worker):** Worker consumes queue and updates sharecode_imports status; frontend polls for these updates
- **Phase 6 (Frontend Foundation):** Uses React Query patterns, Tailwind CSS, UI components (Card, Badge, Button, Table)
- **Existing upload flow:** New tab-based interface allows users to choose between file upload and sharecode import

## Deviations from Plan

None - plan executed exactly as written. All tasks delivered with full specifications.

## Known Issues / Stubs

None - all components are fully functional and tested.

## Architecture Notes

**Component Hierarchy:**
```
Page (tabs interface)
├── Tabs (TabsList + TabsTrigger)
├── TabsContent (Upload)
│   └── UploadForm
├── TabsContent (Sharecode)
│   ├── SharecodeTab (input form)
│   └── ProgressList (real-time progress)
└── ImportHistory (always visible)
```

**Data Flow:**
1. User enters sharecodes in SharecodeTab textarea
2. On submit: useImportSharecode mutation calls API
3. API returns immediately with queued/failed summary
4. useImportHistory polling fetches updates every 2 seconds
5. ProgressList displays current status from polling data
6. When complete, link to /results/{demo_id} or show Retry button

**React Query Patterns:**
- **useMutation:** One-time POST request (submit sharecodes)
- **useQuery with polling:** Continuous GET requests (import status updates)
- **refetchInterval:** 2000ms for real-time feel without overwhelming server
- **refetchIntervalInBackground:** Keeps polling even if tab not focused

## Testing Coverage

**Unit Tests (Jest + React Testing Library):**
- Component rendering
- User input validation
- Button state management
- Success/error message display
- Loading states

**E2E Tests (Playwright):**
- Tab navigation
- Form validation
- Tab switching behavior
- Table visibility
- Field interaction

All tests follow Phase 6 patterns with QueryClientProvider wrapper and hook mocking.

## Next Steps (Phase 8 Testing & Deployment)

- **Testing Phase (Wave 0):** Integration tests for full sharecode → download → analysis flow
- **Deployment (Phase 8.5):** Docker Compose integration, environment variable setup, production testing
- **Enhancement (v2.2):** Bulk status export, import history pagination, advanced filtering

All frontend UI infrastructure in place and ready for end-to-end testing.

## Self-Check

✓ All created files exist and contain expected content
✓ All commits present in git log (164a259, 0efdfa9, fcbc38e, cb21b26)
✓ No unexpected file deletions
✓ UI components properly exported and importable
✓ Hooks follow React Query patterns from Phase 6
✓ Tests use correct libraries (Jest, Playwright, React Testing Library)
✓ No generated files left untracked

---

**Execution Complete:** 2026-05-16 at 04:45 UTC
**Total Duration:** 30 minutes
**Plan Status:** SHIPPED ✓
