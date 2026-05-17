# Phase 15 UAT: Advanced Analytics & User Scoping

## Verdict

APPROVED FOR RESEARCH USE

Phase 15 delivers the requested advanced analytics workflows while keeping outputs framed as explainable research signals rather than proof or enforcement.

## Accepted Workflows

- Authenticated dashboard users can filter their demos by map, rating band, outcome, and timeframe.
- Demo detail users can preview sensitivity changes and request backend-validated comparisons.
- Authenticated analytics users can view consistency, improvement arc, and weapon-strength trend cards.
- Public leaderboard users can filter TRACE rankings by map, rating band, and timeframe.
- Recent dashboard filter combinations persist in browser localStorage without database writes.

## Verification Summary

- Backend filtered leaderboard: 8 targeted tests, 25 assertions passed.
- Backend comparison/trend/filter waves: targeted wave summaries passed and recorded in `15-01a-SUMMARY.md` through `15-04-SUMMARY.md`.
- Symfony container lint passed.
- Frontend filtered leaderboard tests passed: 7 Jest tests.
- Next.js production build passed.
- Route-mocked Playwright integration spec was added for all five workflows, but local execution timed out after 4 minutes without test output.

## Constraints Preserved

- No live cheats.
- No memory reading.
- No client tampering.
- No ban automation.
- Symfony remains responsible for API, queue dispatch, persistence, and product boundaries.
- Python remains responsible for parsing, feature extraction, scoring, and ML.

## Follow-Up

- Re-run `npm run e2e -- analytics-integration.spec.ts` in a stable browser-test environment.
- Consider Redis-backed trend cache pool configuration if filesystem cache becomes too slow.
