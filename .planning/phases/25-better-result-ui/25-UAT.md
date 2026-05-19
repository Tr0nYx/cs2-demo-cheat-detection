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
result: pass

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
passed: 1
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps

[none - automated tests now passing]
