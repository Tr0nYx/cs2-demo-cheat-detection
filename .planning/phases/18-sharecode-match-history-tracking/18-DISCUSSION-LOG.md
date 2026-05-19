# Phase 18: Sharecode Import and Automatic Match History Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 18-sharecode-match-history-tracking
**Areas discussed:** connection flow, seed input, tracking behavior, import dispatch, identity scope, credential storage, error handling, dashboard transparency, disconnect behavior

---

## Connection Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard setup | Dedicated dashboard area for Steam Match History connection, credentials, seed, and status. | yes |
| Import tab extension | Existing sharecode import gets an "automatically track" option. | |
| Both | Dashboard for durable connection plus import-tab shortcut. | |

**User's choice:** Dashboard setup.
**Notes:** Durable tracking should be a conscious consent setup rather than an incidental manual import option.

---

## Seed Input

| Option | Description | Selected |
|--------|-------------|----------|
| Only match sharecode | Accept only plain `CSGO-...` values. | |
| Sharecode plus Steam link | Accept plain `CSGO-...` and `steam://rungame/.../+csgo_download_match%20CSGO-...` links. | yes |
| Extract from arbitrary text | Search longer pasted text for a sharecode. | |

**User's choice:** Sharecode plus Steam link.
**Notes:** Strict enough to validate, broad enough for the supplied Steam launcher link.

---

## Tracking Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Periodic background tracking | Scheduled/queued checks run automatically with backoff. | yes |
| Login/dashboard triggered only | Check only when the user returns. | |
| Manual plus optional automatic | User clicks "check now"; automation is a toggle. | |

**User's choice:** Periodic background tracking.
**Notes:** Manual check may be added as comfort, but is not the primary model.

---

## Discovery Limit

| Option | Description | Selected |
|--------|-------------|----------|
| Until caught up | Continue until Valve returns `nextcode: n/a`. | |
| Bounded per run | Discover up to N new sharecodes per user/run, then continue later. | yes |
| One match per run | Only discover one sharecode per scheduled run. | |

**User's choice:** Bounded per run.
**Notes:** Suggested starting point is about 10 per user/run to avoid queue/API spikes.

---

## Import Dispatch

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately queue | New sharecodes become normal imports and enter the existing async pipeline. | yes |
| Confirm first | Save discovered codes and wait for user confirmation. | |
| Metadata only | Store match-history list without demo downloads. | |

**User's choice:** Immediately queue.
**Notes:** Explicit tracking consent covers automatic ingestion; UI still needs clear status.

---

## Identity Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Logged-in Steam ID only | Tracking may only be enabled for the authenticated user's Steam ID. | yes |
| Free Steam ID | User can enter any Steam ID if credentials work. | |
| Admin exception | Normal users self-only, admins can enter others. | |

**User's choice:** Logged-in Steam ID only.
**Notes:** Reduces abuse risk and keeps consent boundary simple.

---

## Credential Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Encrypted storage | Store decryptable `steamidkey` encrypted for background checks. | yes |
| Do not store | User must re-enter the code for every check. | |
| Hash plus manual reauth | Store only a hash; automatic API calls are impossible. | |

**User's choice:** Encrypted storage after clarification.
**Notes:** User initially chose hash/manual reauth, then selected true automatic tracking with encrypted secret storage after the tradeoff was explained.

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Status per connection | Store states such as caught up, invalid seed, auth failed, rate limited, unavailable, with backoff. | yes |
| Disable immediately | Turn tracking off on error. | |
| Generic error only | Hide detailed state. | |

**User's choice:** Status per connection.
**Notes:** Valve status codes have meaning and should influence status/backoff.

---

## Dashboard Transparency

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal status | Connected since, last check, current status, shortened known code, discovered/queued counts. | yes |
| Full audit | Show every API call, HTTP code, nextcode, and backoff reason. | |
| Only on/off | Minimal visibility. | |

**User's choice:** Minimal status.
**Notes:** Enough for trust and light debugging without exposing API noise or sensitive data.

---

## Disconnect Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Delete secret, keep import history | Stop future tracking while preserving imported demos and analyses. | yes |
| Delete tracking history too | Remove secret and tracking history, keep demos. | |
| Full wipe option | Add deletion of found imports/demos. | |

**User's choice:** Delete secret, keep import history.
**Notes:** Clean consent withdrawal without breaking analysis history.

---

## the agent's Discretion

- Exact scheduler cadence, per-run limit, and backoff durations.
- Exact encrypted storage implementation, within the locked secret-handling constraints.
- Exact dashboard layout.
- Exact persistence shape for connection/status/check history.

## Deferred Ideas

- Admin tracking for arbitrary Steam IDs.
- Full user-facing API audit trail.
- Deleting imported demos/analyses during disconnect.
- Using match-history metadata as scoring or trust signal.
