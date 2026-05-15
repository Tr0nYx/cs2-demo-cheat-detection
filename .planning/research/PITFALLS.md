# Pitfalls Research

## Parser Drift

**Risk:** `demoparser2` fields, event payloads, or CS2 demo internals may differ from the brief.

**Warning signs:** Empty DataFrames, missing columns, inconsistent Steam IDs, or impossible tick ranges.

**Prevention:** Build a parser adapter with explicit required columns, typed output, validation errors, and fixture demos.

## False Certainty

**Risk:** Suspicion scores are mistaken for proof of cheating.

**Warning signs:** Labels presented as bans, no raw feature data, no explanation for scores.

**Prevention:** Use cautious labels, preserve feature JSON, document limitations, and keep the project framed as research.

## Queue Contract Drift

**Risk:** Symfony and Python encode different queue payloads.

**Warning signs:** Worker rejects jobs after backend changes or silently ignores fields.

**Prevention:** Define JSON payload schema in docs and tests. Keep the initial payload minimal.

## Long-Running Worker Failures

**Risk:** Demo parsing or ML work fails mid-job and leaves demos stuck in processing.

**Warning signs:** Old processing demos, no error rows, no structured logs.

**Prevention:** Worker catches exceptions, writes `error` status, logs JSON, and handles SIGTERM gracefully.

## Overbuilding ML Too Early

**Risk:** The transformer consumes effort before the deterministic feature pipeline is observable.

**Warning signs:** Training code exists but upload-to-result flow does not.

**Prevention:** Make weighted scoring operational before ML training. Treat ML as Phase 4 preparation.

## Data Licensing and Dataset Identity

**Risk:** Implementation pins the wrong dataset DOI or assumes dataset shape without checking Hugging Face metadata.

**Warning signs:** Dataset loader hardcodes stale DOI `10.57967/hf/5315` or brittle column positions.

**Prevention:** Use the live dataset repo ID and note current DOI `10.57967/hf/5654`; validate schema at load time.
