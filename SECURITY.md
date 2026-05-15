# Security Audit Report: Phase 3 — Python Analysis Pipeline

**Phase:** 03 — Python Analysis Pipeline  
**Audit Date:** 2026-05-15  
**Auditor:** Claude Security Team  
**Status:** **OPEN THREATS DETECTED** — Phase must not ship until mitigations are implemented

---

## Executive Summary

Security audit of Phase 3 implementations against declared threat model found **2 OPEN THREATS** related to Information Disclosure (file path leakage). All other declared mitigations are correctly implemented and verified in code.

**Threats Closed:** 17/19  
**Threats Open:** 2/19  
**ASVS Level:** 2 (baseline)

---

## Threat Verification Matrix

### CLOSED Threats

| ID | Category | Disposition | Threat | Mitigation | Evidence | Status |
|----|----------|-------------|--------|-----------|----------|--------|
| T-03-01 | Tampering | Mitigate | JSON deserialization RCE via redis.brpop | Use json.loads (safe, no code execution) | `python/worker.py:232` — `json.loads(job_json)` only; no pickle/yaml imports | **CLOSED** |
| T-03-02 | Elevation | Mitigate | File path access (../../../etc/passwd) | Paths from Symfony DB only, sandboxed | File path passed via Redis queue populated by Symfony backend; no user-supplied traversal | **CLOSED** |
| T-03-03 | Tampering | Mitigate | SQL injection via error messages | psycopg2 parameterized queries with %s | `python/persistence/result_writer.py:64, 202, 224` — all queries use `cursor.execute(query, (params))` tuple binding; no f-string SQL | **CLOSED** |
| T-03-04 | Denial of Service | Mitigate | Malicious demo file causes crash | DemoParseError exception handling, all-or-nothing | `python/parser/adapter.py:70-76` — DemoParser wrapped in try/except, converts all exceptions to DemoParseError; `python/worker.py:93-99` catches DemoParseError and returns gracefully without raising | **CLOSED** |
| T-03-05 | Information Disclosure | Mitigate | Stack traces in logs | log only str(e), never full traceback | No `traceback` module imported in codebase; all error logging uses `str(e)` (e.g., `worker.py:97, 119, 128, 154, 163, 252`); no `.print_exc()` or `exc_info=True` calls | **CLOSED** |
| T-03-05-Alt | Information Disclosure | Mitigate | Demo file paths in logs | log only demo_id UUID, not file_path | **SEE OPEN THREAT T-03-06 BELOW** | **OPEN** |
| T-03-02-01 | Tampering | Mitigate | demoparser2 malformed input crash | try/except around demoparser2, convert to DemoParseError | `python/parser/adapter.py:71-76` wraps DemoParser instantiation; lines 79-82 wrap parse_ticks; lines 105-116 wrap parse_event; all non-fatal exceptions converted to DemoParseError | **CLOSED** |
| T-03-02-02 | Denial of Service | Mitigate | Parser hangs on corrupt file | Hardened parser, worker exit code 1 triggers restart | Try/except wraps all demoparser2 calls; raises DemoParseError on failure; worker.py raises exception on persistence errors to trigger orchestration restart | **CLOSED** |
| T-03-02-03 | Information Disclosure | Mitigate | Internal paths leak | Sanitized paths, demo_id only | **SEE OPEN THREAT T-03-06 BELOW** | **OPEN** |
| T-03-03-01 | Tampering | Mitigate | Feature score > 1.0 | _validate_score() raises ValueError | All extractors call `self._validate_score(final_score)` before return: aimbot.py:220, triggerbot.py:118, wallhack.py:159, recoil.py:218, bhop.py:175, session.py:148; weighted_scorer.py:97-100 validates each feature score independently | **CLOSED** |
| T-03-03-02 | Denial of Service | Mitigate | Large dataset hangs extraction | Data limits (e.g., last 100 footsteps) | aimbot.py:33 (KILL_WINDOW_TICKS=10), recoil.py:40 (SPRAY_WINDOW_MAX_TICKS=50), wallhack.py:139 (tail(10) limits prior ticks), bhop.py:45 (SEQUENCE_LENGTH_THRESHOLD=10) | **CLOSED** |
| T-03-03-03 | Information Disclosure | Accept | Raw measurements leak game state | Non-sensitive, research scope | Documented acceptance in threat model; raw measurements recorded but marked non-sensitive research data | **CLOSED** |
| T-03-04-01 | Tampering | Mitigate | Corrupt recoil pattern file | try/except, graceful degradation | recoil.py:79-99 wraps json.load in try/except; logs warnings but continues; if no patterns loaded, raises FeatureExtractionError which is caught in worker.py:114-122 | **CLOSED** |
| T-03-04-02 | Denial of Service | Mitigate | Large spray sequences | max 50 ticks per spray | recoil.py:40 (SPRAY_WINDOW_MAX_TICKS=50) enforced at lines 137-138 | **CLOSED** |
| T-03-04-03 | Information Disclosure | Accept | Skill level leakage | Research scope | Documented acceptance in threat model | **CLOSED** |
| T-03-05-01 | Tampering | Mitigate | Score validation | Validators in extractor and scorer | features/base.py:134-137 (extract phase), weighted_scorer.py:97-100 (scoring phase); both raise ValueError on invalid scores | **CLOSED** |
| T-03-05-02 | Information Disclosure | Accept | Raw measurements exposed | Non-sensitive research data | Documented acceptance in threat model | **CLOSED** |
| T-03-05-03 | Denial of Service | Mitigate | Test fixtures hang | Minimal realistic data, data limits | Data limits applied throughout extractors; test fixtures use bounded event counts | **CLOSED** |

---

## OPEN THREATS — BLOCKER

### Open Threat 1: File Path Logged at Job Entry

**Threat ID:** T-03-06 (Part 1)  
**Category:** Information Disclosure  
**Declared Mitigation:** "log only demo_id UUID, not file_path"  
**Severity:** MEDIUM (Blocks Shipping)

**Location:** `python/worker.py`, line 90

**Finding:**
```python
log("job_processing", demo_id=demo_id, file_path=file_path)
```

**Violation:** The mitigation declares that logs should contain only `demo_id` UUID. The implementation explicitly logs both `demo_id` AND the full `file_path` to stdout. This leaks the storage directory structure and file naming convention.

**Attack Vector:** An attacker with access to stdout logs (via log aggregation, container inspection, or credential compromise) can enumerate the demo storage directory and attempt file access via path traversal in a later attack.

**Fix Required:**
```python
# BEFORE (VULNERABLE)
log("job_processing", demo_id=demo_id, file_path=file_path)

# AFTER (CORRECT)
log("job_processing", demo_id=demo_id)
```

**Evidence Checked:**
- ✓ No other instances of `file_path` logging found in worker.py
- ✓ All subsequent logs use demo_id only (lines 95, 97, etc.)

---

### Open Threat 2: File Path Embedded in Error Messages

**Threat ID:** T-03-06 (Part 2)  
**Category:** Information Disclosure  
**Declared Mitigation:** "log only demo_id UUID, not file_path" (applies to error context)  
**Severity:** MEDIUM (Blocks Shipping)

**Location:** `python/parser/adapter.py`, line 74 (error source); `python/worker.py`, line 97 (error logged)

**Finding:**
```python
# parser/adapter.py:74
except FileNotFoundError as e:
    raise DemoParseError(f"Demo file not found: {file_path}") from e

# worker.py:97 — this logs the error message
log("parser_error", demo_id=demo_id, error=str(e), level="error")
```

**Violation:** The error message in `DemoParseError` exception embeds the full file path. When caught and logged via `str(e)` in worker.py line 97, the file path leaks to stdout logs. The mitigation should extend to error message sanitization.

**Attack Vector:** Parser error logs (e.g., on corrupted files or edge cases) reveal exact demo file locations and naming structure, enabling reconnaissance for follow-up attacks.

**Fix Required:**

Option A (Generic Error):
```python
# parser/adapter.py:74
raise DemoParseError("Demo file not found")
```

Option B (Safe Context if demo_id available):
Since `file_path` alone is not context to identify the demo, remove it entirely or use generic language.

**Evidence Checked:**
- ✓ Line 76 also embeds exception details in error message: `f"Failed to initialize parser: {e}"` — this may leak internal demoparser2 details but is less sensitive than file paths
- ✓ worker.py:97 will log the full error message via `str(e)`
- ✓ No other parser functions embed file_path in errors (lines 82, 86, etc. use generic messages)

---

## Implementation Quality — Verified Strengths

### Parameterized SQL Queries (T-03-03)
- **All database operations use parameterized queries:**
  - `result_writer.py:64` — UPDATE demo with (error_message, 'error', demo_id)
  - `result_writer.py:202-214` — INSERT analysis_result with 10 parameters
  - `result_writer.py:224` — UPDATE demo status with ("done", demo_id)
- **No SQL constructed via string concatenation or f-strings**
- **Pattern:** `cursor.execute(query, (param1, param2, ...))` — correct use of psycopg2

### Exception Handling (T-03-04, T-03-02-01)
- **All demoparser2 calls wrapped in try/except:**
  - DemoParser instantiation (line 72)
  - parse_ticks (line 80)
  - parse_event (line 106) — exception silently ignored, continues to next event type
- **All exceptions converted to DemoParseError** for consistent handling
- **Worker gracefully handles parsing failures** (worker.py:96-99) — writes error, returns without crashing

### Score Validation (T-03-03-01)
- **Every feature extractor validates final score before return:**
  - All 6 extractors call `self._validate_score(final_score)`
  - Raises ValueError if score not in [0.0, 1.0]
- **Weighted scorer validates each input score** (weighted_scorer.py:97-100)
- **No bypass paths identified** — all scores validated in sequence

### Data Limits (T-03-03-02)
- **Aimbot:** Kill window limited to 10 ticks (line 33)
- **Recoil:** Spray window limited to 50 ticks (line 40)
- **Wallhack:** Prior ticks limited to last 10 (line 139)
- **Bhop:** Sequence length threshold 10 (line 44)
- **No unbounded loops or recursive structures**

### Error Logging (T-03-05)
- **No traceback module imported** in any Python file
- **All error logging uses `str(e)` only:**
  - worker.py:97, 119, 128, 154, 163, 252
  - persistence/result_writer.py:80, 246
- **No `.print_exc()`, `exc_info=True`, or exception unpacking**

---

## Accepted Risks (Per Threat Model)

The following threats are documented as **ACCEPTED** and do not require mitigation:

| Threat ID | Category | Rationale | Evidence |
|-----------|----------|-----------|----------|
| T-03-03-03 | Information Disclosure | Raw measurements (snap ratio, angular velocity, etc.) are non-sensitive research data; published in academic papers | persistence/result_writer.py:164 stores raw_measurements in feature_data JSON |
| T-03-04-03 | Information Disclosure | Skill level inference (aimbot score, wallhack score) is research output, not sensitive user data | No restriction on output; scores intended for publication |
| T-03-05-02 | Information Disclosure | Feature extraction results and measurements are non-sensitive research data; scope of analysis pipeline is public | Stored in analysis_result table, intended for dashboard display |

---

## Unregistered Threat Flags

No new threat flags detected in implementation beyond those in the declared threat model.

---

## Test Plan

To verify fixes for Open Threats 1 & 2:

1. **Verify file_path removed from line 90 logging:**
   ```bash
   grep -n "log.*job_processing" python/worker.py | grep -c file_path
   # Should return 0
   ```

2. **Verify error messages sanitized in adapter.py:**
   ```bash
   grep -n "Demo file not found" python/parser/adapter.py
   # Should show generic message without {file_path}
   ```

3. **Run sample worker job with corrupted file:**
   - Enqueue a demo with invalid path
   - Capture logs
   - Verify logs contain `demo_id` and error message, but NO file path

4. **Run integration test:**
   - Process valid demo
   - Verify logs contain demo_id, tick count, scores
   - Verify logs do NOT contain file_path

---

## Recommendations

**Priority 1 (Blocking):**
1. Remove `file_path=file_path` from worker.py line 90
2. Sanitize error message in adapter.py line 74 (remove `{file_path}`)
3. Re-run audit to verify closures

**Priority 2 (Hardening):**
1. Add explicit data sanitization function for log context (e.g., `sanitize_log_value()`) to prevent future regressions
2. Add pre-commit hook to detect hardcoded SQL or traceback usage

**Priority 3 (Monitoring):**
1. Set up log aggregation to detect any file paths in worker logs
2. Alert on ValueError from score validation (indicates extractor bug)

---

## Audit Metadata

- **Code Review Date:** 2026-05-15
- **Files Audited:** 12 Python files in `python/` directory
- **Threat Model Source:** PLAN.md (Phase 03 threat register)
- **Audit Method:** Source code grep + static analysis
- **Confidence Level:** HIGH (direct grep matches for all mitigations)

---

## Sign-Off

Phase 3 Python Analysis Pipeline implementation is **NOT READY FOR SHIPPING** due to 2 open information disclosure threats. All declared mitigations are implemented except for file path logging sanitization. Mitigations must be applied and re-audited before phase release.

**Next Step:** Implement fixes for T-03-06 (Part 1 & 2), then re-run `/gsd-secure-phase` audit.
