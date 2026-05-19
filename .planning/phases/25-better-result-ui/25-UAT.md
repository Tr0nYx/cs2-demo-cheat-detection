---
status: testing
phase: 25-better-result-ui
source: 25-01-SUMMARY.md, 25-02-SUMMARY.md, 25-03-SUMMARY.md, 25-04-SUMMARY.md
started: 2026-05-19T19:30:00Z
updated: 2026-05-19T19:30:00Z
---

## Current Test

number: 1
name: Results Page Loads
expected: |
  Navigate to a results page for a demo (e.g., `/results/{demoId}`). The page loads without errors, and a tabbed interface appears with Players, TRACE, Sensitivity, and Viewer tabs visible.
result: issue
reported: "Automated Playwright test failed: Components not rendering. Expected 'Evidence Overview' panel is missing. Expected text 'research signals from post-game demo analysis' not found on page."
severity: blocker

## Tests

### 1. Results Page Loads
expected: Navigate to results page, page loads without errors, tabbed interface visible
result: issue
reported: "Automated Playwright test failed. Page renders but multiple assertions failed: (1) Expected text '/research signals from post-game demo analysis/' not found - actual description is 'View detailed feature vectors, TRACE rating, and 2D replay mapping for post-game research review.' (2) 'Evidence Overview' panel title not found - shows 'Analysis Results' instead. (3) 'Top Player Review Signals' not found - shows 'PLAYER ANALYSIS REPORTS' instead. (4) Tabs component not visible in viewport."
severity: blocker

### 2. Results Overview Panel
expected: Results overview panel displays status, research signal, provenance info, match report action, and download action at the top
result: pending

### 3. Players Table Display
expected: Default Players tab shows a ranked evidence table with player information (steam profile links, scores, evidence summary)
result: pending

### 4. Player Selection and Detail
expected: Clicking a row in the players table shows a detail panel with "Why this score?" explanation leading, technical details secondary, and evidence breakdown
result: pending

### 5. Tab Navigation
expected: TRACE, Sensitivity, and Viewer tabs are clickable and show their respective content (TRACE card, sensitivity tuner, demo viewer)
result: pending

### 6. Empty States
expected: When appropriate, empty states display clearly (e.g., no players detected, loading states during data fetch)
result: pending

### 7. Safety Language Verification
expected: No "proof" or "enforcement" language appears in the interface; uses "research", "review", "confidence" language instead
result: pending

### 8. Responsive Design
expected: Results page is responsive and evidence table works correctly on mobile viewport (tested at 375px width)
result: pending

### 9. Feature State Visibility
expected: Capped, weak, warning, and unavailable feature states are visible and clearly indicated in evidence panels
result: pending

### 10. Cold Start Smoke Test
expected: Kill any running server. Clear ephemeral state. Start application from scratch. Server boots without errors and results page loads with live data.
result: pending

## Summary

total: 10
passed: 0
issues: 1
pending: 9
skipped: 0
blocked: 0

## Gaps

- truth: "Results page renders with tabbed interface for Players, TRACE, Sensitivity, and Viewer modes; Evidence Overview panel shows status, research signal, and provenance"
  status: failed
  reason: "Playwright automated test found multiple rendering issues: (1) page description text doesn't match test expectations - test expects '/research signals from post-game demo analysis/' but page has 'View detailed feature vectors, TRACE rating, and 2D replay mapping for post-game research review.' (2) ResultOverviewPanel renders as 'Analysis Results' title instead of 'Evidence Overview'. (3) Top signals section renders as 'PLAYER ANALYSIS REPORTS' instead of 'Top Player Review Signals'. (4) Tabs component (ResultDashboardTabs) either not rendering or not visible in viewport."
  severity: blocker
  test: 1
  root_cause: "Multiple alignment issues between test expectations and implementation: (1) ConsoleHeader description text was updated but test expectations weren't updated; (2) Panel title in ResultOverviewPanel shows 'Evidence Overview' as expected, but test is looking at wrong location or ResultOverviewPanel isn't rendering; (3) Top signals section title doesn't match expectation; (4) ResultDashboardTabs component may not be rendering or has CSS visibility issue"
  artifacts:
    - path: "frontend/app/results/[id]/page.tsx"
      issue: "Line 148 has description that doesn't match test line 133 expectation"
    - path: "frontend/components/ResultsDashboard/ResultOverviewPanel.tsx"
      issue: "Title is 'Evidence Overview' (correct) but may not be rendering"
    - path: "frontend/e2e/results-dashboard.spec.ts"
      issue: "Test expectations on lines 133-135 don't match actual page content"
    - path: "frontend/test-results/"
      issue: "Screenshot shows tabs are not visible in rendered page"
  missing:
    - "Verify ResultOverviewPanel is being rendered (line 153 of page.tsx)"
    - "Fix test text expectations to match actual implementation (or vice versa)"
    - "Investigate why ResultDashboardTabs component isn't visible in viewport"
    - "Check if tabs component has CSS/visibility issue preventing display"
  debug_session: ""
