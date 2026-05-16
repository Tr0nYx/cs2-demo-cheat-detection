# TRACE API Endpoint Documentation

## Overview

The TRACE endpoint provides REST API access to TRACE (Tactical Round Action & Contribution Evaluation) rating data for a specific demo analysis. TRACE is a transparent player impact rating independent of suspicion verdicts.

## Endpoint

### GET /api/demos/{demoId}/trace

Returns TRACE breakdown including component scores, trust multiplier, calibration version, and timestamps.

**Parameters:**
- `demoId` (path parameter, required): Demo UUID identifier (RFC 4122 format)

**Response Headers:**
- `Content-Type: application/json`
- `Cache-Control: public, max-age=3600` (TRACE is immutable once calculated)

## HTTP Status Codes

| Code | Condition | Response |
|------|-----------|----------|
| 200 | TRACE found and serialized | TraceDto JSON |
| 400 | Invalid UUID format for demoId | Error with code `invalid_demo_id` |
| 404 | Demo not found | Error with code `demo_not_found` |
| 404 | TRACE not calculated for demo | Error with code `trace_not_calculated` |
| 500 | Internal server error | Error with code `internal_error` |

## Response Schema (HTTP 200)

### TraceDto (Root Object)

```json
{
  "traceBase": 1.5,
  "traceAdjusted": 1.4,
  "traceNormalized": 1.3,
  "trustMultiplier": 0.95,
  "components": {
    "ekill": 1.4,
    "aim": 1.5,
    "kast": 1.6,
    "util": 1.3,
    "clutch": 1.2
  },
  "calibrationVersion": "default-v1",
  "calculatedAt": "2026-05-15T12:00:00+00:00",
  "createdAt": "2026-05-15T12:00:01+00:00"
}
```

### Field Descriptions

**Score Fields (float):**
- `traceBase`: Weighted average of component scores before trust adjustment. Range: [0.3, 2.0]
- `traceAdjusted`: Base score adjusted by trust multiplier. Formula: `traceBase × trustMultiplier`
- `traceNormalized`: Adjusted rating normalized by calibration global average
- `trustMultiplier`: Dampening factor [0.73, 1.00] from suspicion score. 1.0 = full trust, 0.73 = max suspicion

**Component Scores (TraceComponentDto, all float):**
- `ekill`: Kill efficiency [0.3, 2.0]. Kills relative to damage dealt
- `aim`: Aim accuracy [0.3, 2.0]. CPQ, CSQ, TTD, SCS metrics combined
- `kast`: Kill/death/survival rate [0.3, 2.0]. Percentage of rounds with kill or survive
- `util`: Utility effectiveness [0.3, 2.0]. Grenade (smoke, flash, HE) impact
- `clutch`: Clutch performance [0.3, 2.0]. Success in high-pressure 1v1, 1v2 scenarios

**Metadata Fields:**
- `calibrationVersion`: Calibration version used for normalization (string). Example: "default-v1", "live-v1"
- `calculatedAt`: ISO 8601 timestamp when TRACE was calculated. String format: RFC 3339
- `createdAt`: ISO 8601 timestamp when TRACE was stored. String format: RFC 3339

## Error Response Schema

**HTTP 400, 404, or 500:**

```json
{
  "error": {
    "code": "error_code_string",
    "message": "Human readable error message",
    "details": {}
  }
}
```

**Error Codes:**
- `invalid_demo_id`: Demo ID is not a valid UUID
- `demo_not_found`: Demo does not exist in the database
- `trace_not_calculated`: Demo exists but TRACE has not been calculated yet
- `internal_error`: Unexpected server error

## Example Requests

### Successful Request

```bash
curl -X GET "http://localhost:8000/api/demos/550e8400-e29b-41d4-a716-446655440000/trace" \
  -H "Accept: application/json"
```

**Response (200 OK):**
```json
{
  "traceBase": 1.5,
  "traceAdjusted": 1.4,
  "traceNormalized": 1.3,
  "trustMultiplier": 0.95,
  "components": {
    "ekill": 1.4,
    "aim": 1.5,
    "kast": 1.6,
    "util": 1.3,
    "clutch": 1.2
  },
  "calibrationVersion": "default-v1",
  "calculatedAt": "2026-05-15T12:00:00+00:00",
  "createdAt": "2026-05-15T12:00:01+00:00"
}
```

### Invalid UUID Request

```bash
curl -X GET "http://localhost:8000/api/demos/not-a-uuid/trace" \
  -H "Accept: application/json"
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "code": "invalid_demo_id",
    "message": "Demo ID must be a valid UUID.",
    "details": {}
  }
}
```

### TRACE Not Calculated

```bash
curl -X GET "http://localhost:8000/api/demos/550e8400-e29b-41d4-a716-446655440000/trace" \
  -H "Accept: application/json"
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "trace_not_calculated",
    "message": "TRACE not yet calculated for this demo.",
    "details": {}
  }
}
```

## Implementation Details

### Serialization

- All property names are camelCase (e.g., `traceBase`, `trustMultiplier`)
- Timestamps are ISO 8601 format (RFC 3339)
- Floating-point values are not formatted (full precision)
- Numbers are plain JSON numbers (not quoted strings)

### Caching

The endpoint returns `Cache-Control: public, max-age=3600` header. TRACE scores are immutable once calculated, so browser and CDN caching for 1 hour is safe.

### Performance

- AnalysisResult lookup uses UUID index
- TraceRating lookup uses foreign key index on analysis_result_id (unique constraint)
- No N+1 queries; single demo lookup + single TRACE lookup per request

## Integration with Frontend

The frontend (Wave 2) will consume this endpoint via React Query:

```javascript
const { data: trace } = useQuery({
  queryKey: ['trace', demoId],
  queryFn: () => fetch(`/api/demos/${demoId}/trace`).then(r => r.json()),
  enabled: !!demoId
})
```

Error handling will check for 404 with `trace_not_calculated` code and display a message like "TRACE scores not yet available."

## Phase References

- **Phase 6**: Trust multiplier calculation (suspicion-based dampening)
- **Phase 9**: TRACE rating entity, calculations, calibration
- **Phase 10 Wave 1**: This API endpoint
- **Phase 10 Wave 2**: React frontend component to render TRACE card
- **Phase 10 Wave 3+**: Calibration explanation pages, historical TRACE comparison
