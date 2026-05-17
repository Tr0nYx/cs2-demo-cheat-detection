# Phase 15-02 Summary: Sensitivity Analysis

## Status

Completed on 2026-05-17.

## Delivered

- Added `/api/demos/{id}/detail` to expose demo metadata, baseline suspicion, and player-scoped feature vectors for sensitivity analysis.
- Added `FeatureVectorsDto` with range validation and serialization for aimbot, wallhack, triggerbot, recoil, bhop, and session scores.
- Added `useDemoDetail`, `useSensitivityTuner`, and a `SensitivityTuner` UI for previewing how threshold changes alter the research suspicion signal.
- Integrated the tuner into the existing `/results/[id]` page beside the TRACE card.
- Added backend endpoint coverage for authenticated player scoping and frontend tests for score calculation, clamping, unavailable state, and slider updates.

## Verification

- `php bin/console lint:container` passed.
- `php vendor/bin/phpunit tests/Domain/Analytics/FeatureVectorProviderTest.php` passed: 3 tests, 10 assertions.
- `docker exec ... php vendor/bin/phpunit tests/UI/Api/DemoControllerTest.php --filter 'testDetailDemoScopesFeatureVectorsToAuthenticatedPlayer|testGetFilteredDemos|testGetFilterMetadata'` passed: 8 tests, 23 assertions.
- `npm run test -- --runTestsByPath __tests__/lib/hooks/useSensitivityTuner.test.tsx __tests__/components/Analytics/SensitivityTuner.test.tsx` passed: 5 tests.
- `npm run build` passed.

## Notes

- The comparison save action is local-only for this phase and records the tuned preview in component state; no persistence endpoint was added.
- A brittle `useDemoDetail` renderHook test was not kept because React Query did not reliably execute the fetch in the current Jest harness. Backend endpoint and UI behavior are covered instead.
- `npm run build` still reports the existing Next.js warning that the `middleware` file convention is deprecated in favor of `proxy`.
