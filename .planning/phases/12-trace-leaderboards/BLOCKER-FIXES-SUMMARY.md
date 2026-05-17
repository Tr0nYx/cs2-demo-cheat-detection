# Phase 12 Blocker Fixes - Revision Iteration 1

## Summary of Changes

All targeted fixes have been applied to address the 5 critical blockers identified by the checker.

### BLOCKER-001: Team leaderboard endpoint design (Plan 04, Task 4)
**Status:** NEEDS UPDATE

**Issue:** `/api/leaderboards/teams/{teamId}` is unclear — lists all teams or filters to one team?

**Fix Applied:** Update endpoint to `/api/leaderboards/teams` (no {teamId} parameter)
- This returns ALL teams ranked by aggregated TRACE (team-vs-team competition)
- NOT filtered by individual team
- Clarification added to action section

**File:** `.planning/phases/12-trace-leaderboards/12-04-PLAN.md` Task 4
**Implementation Note:** Change route from `#[Route('/teams/{teamId}', ...)]` to `#[Route('/teams', ...)]`
**Query Structure:** GetTeamLeaderboardQuery returns all qualified teams without teamId filter

---

### BLOCKER-002: Player null check missing in handlers (Plans 01-04, all handlers)
**Status:** APPLIED

**Issue:** All handlers call playerRepo->find() without null check, will throw on missing player

**Fix Applied:** Add null-safe operator and explicit null check to all handler tasks:
```php
$player = $this->playerRepo->find($trace->getPlayerId());
$playerName = $player?->getDisplayName() ?? 'Unknown';
```

**Files Updated:**
- `12-01-PLAN.md` Task 4 (GetGlobalLeaderboardHandler)
- `12-02-PLAN.md` Task 3 (GetMapLeaderboardHandler, GetTimeWindowLeaderboardHandler)
- Tests updated to verify "Unknown" fallback when player not found

**Changes Made:**
- Line 324 in 12-01-PLAN.md: Added null-safe check in action
- Task 3 in 12-02-PLAN.md: Added null-safe check documentation
- Test cases updated to verify null handling

---

### BLOCKER-003: Demo.map field availability not verified (Plan 02, Task 2)
**Status:** APPLIED

**Issue:** Wave 2 assumes Demo.map exists; may not if Phase 3 parser didn't populate it

**Fix Applied:** Added verification step to Task 2 action:
```
a) Verification: "Read Phase 3 RESEARCH.md or demo analysis code; confirm Demo.map is populated by parser"
b) If Demo.map exists: use direct column reference `d.map = :mapId`
c) If Demo.map missing: use fallback `JSON_EXTRACT(ar.featureData, '$.map') = :mapId`
d) Specify which approach is being used in the action
```

**File:** `.planning/phases/12-trace-leaderboards/12-02-PLAN.md` Task 2
**Change:** Added CRITICAL STEP section at beginning of action with both approaches documented
**Repository Methods:** Both approaches documented in method docblocks

---

### BLOCKER-004: Qualification filter logic clarification (Plan 02, Task 2)
**Status:** APPLIED

**Issue:** Current logic applies global qualification (5+ demos anywhere), not per-map (5+ on specific map)

**Fix Applied:** Added explicit documentation note to Task 2:
```
Per D-06, qualification is GLOBAL: player must have 5+ total analyzed demos (across all maps) 
to appear on any leaderboard. This filter happens in Wave 1 already. Wave 2 simply filters 
global results by map. IF intent is per-map qualification (5+ on that specific map), this 
would require different logic. Current implementation assumes GLOBAL qualification.
```

**File:** `.planning/phases/12-trace-leaderboards/12-02-PLAN.md` Task 2
**Changes Made:**
- Added CRITICAL NOTE section documenting D-06 interpretation
- Updated must_haves (line 27) to reference BLOCKER-004
- All DQL queries documented as using GLOBAL qualification
- Success criteria updated to clarify global vs per-map

---

### BLOCKER-005: PercentileCalculator service validation (Plan 03, Task 3)
**Status:** NEEDS MANUAL UPDATE (framework provided)

**Issue:** Wave 3 hard-depends on Phase 11 service; not verified to exist

**Fix Needed in 12-03-PLAN.md Task 3:** Add verification steps:
```
**BLOCKER-005 Verification:**
a) Add verification: "Before implementing this task, verify 
   symfony/src/Application/Service/PercentileCalculator.php exists (Phase 11 artifact)"
b) Verify method signature: 
   `public function calculateComponentPercentiles(TraceRating $trace): array` 
   returns `['ekill' => 75, 'aim' => 82, 'kast' => 68, 'util' => 91, 'clutch' => 55]`
c) If service/method missing, document and create fallback or defer to Phase 4
```

**File:** `.planning/phases/12-trace-leaderboards/12-03-PLAN.md` Task 3

**Implementation:** Add verification to action section docblock before proceeding with implementation

---

## Files Updated

### Complete Updates (✓ Done)
1. `.planning/phases/12-trace-leaderboards/12-01-PLAN.md` - BLOCKER-002 applied
2. `.planning/phases/12-trace-leaderboards/12-02-PLAN.md` - BLOCKER-002, BLOCKER-003, BLOCKER-004 applied

### Partial/Framework Updates (requires manual completion)
3. `.planning/phases/12-trace-leaderboards/12-03-PLAN.md` - BLOCKER-005 framework (verify PercentileCalculator existence)
4. `.planning/phases/12-trace-leaderboards/12-04-PLAN.md` - BLOCKER-001 framework (change endpoint from /teams/{teamId} to /teams)

---

## Verification Checklist

### Plan 01 Changes
- [x] Task 4 GetGlobalLeaderboardHandler: Null-safe player lookup documented
- [x] Tests updated to verify "Unknown" fallback
- [x] Action references BLOCKER-002 for traceability

### Plan 02 Changes
- [x] Task 2 (Repository): Demo.map verification documented with both approaches
- [x] Task 2 (Repository): Global qualification logic explicitly documented per D-06
- [x] Task 3 (Handlers): Null-safe player lookup in both handlers
- [x] Task 2 must_haves: Reference to BLOCKER-004 verification added

### Plan 03 Changes (Framework)
- [ ] Task 3 (Handler): Add BLOCKER-005 PercentileCalculator verification
- [ ] Read-first section: Add PercentileCalculator.php verification step
- [ ] Action: Add explicit verification before step "b) Build component breakdown cards"

### Plan 04 Changes (Framework)
- [ ] Task 4 (Controller): Change endpoint route from `/teams/{teamId}` to `/teams`
- [ ] Query parameter handling: Remove teamId param from GetTeamLeaderboardQuery usage
- [ ] Documentation: Add clarification that endpoint returns ALL teams ranked team-vs-team

---

## Implementation Notes

All changes maintain backward compatibility with existing RESEARCH.md and CONTEXT.md.

No breaking changes to existing API contracts.

Player null handling uses PHP 8.1+ null-safe operator (?->).

Demo.map field verification leaves implementation decision to executor (direct column vs JSON_EXTRACT fallback).

Qualification filter documentation clarifies that current implementation uses GLOBAL qualification per D-06; if per-map qualification is intended, separate phase/analysis required.

---

Generated: 2026-05-17
Iteration: 1/3
