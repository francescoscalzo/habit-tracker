# Data Model: L4 Frontend + AI Coach

**Date**: 2026-05-20

---

## Entities

### User *(Supabase-managed, not stored in Redis)*

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID (string) | Supabase `auth.users.id` — used as `userId` in Redis keys |
| `email` | string | Supabase-managed |

Backend never stores user records in Redis. Identity comes exclusively from the
validated JWT `sub` claim.

---

### Habit *(Redis: `habits:{userId}:{habitId}`)*

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v4 | Server-generated. Never accepted from client. |
| `name` | string | Non-empty, max 100 chars |
| `emoji` | string | Single emoji character |
| `createdAt` | ISO 8601 UTC string | Server-generated |

**L4 change**: key prefix `habits:default:` → `habits:{userId}:`. No other
field changes. Serialisation: JSON string.

---

### CheckIn *(Redis: `checks:{habitId}:{YYYY-MM-DD}`)*

Presence-only — key existence signals check-in done for that day.
Value: `"1"`. No TTL. No content fields.

**L4 note**: Key format unchanged. Ownership enforced at application layer
(verify `habits:{userId}:{habitId}` exists before any check operation).

---

### HabitStats *(computed on read, never stored)*

| Field | Type | Notes |
|-------|------|-------|
| `currentStreak` | int | Consecutive days ending today |
| `longestStreak` | int | Longest consecutive run ever |
| `successRate` | float (0–1) | `checkins / days_since_created` |
| `last30days` | bool[30] | `[0]` = today, `[29]` = 30 days ago |
| `last90days` | bool[90] | `[0]` = today, `[89]` = 90 days ago *(L4 new)* |

`last90days` extends the L3 `last30days` pattern. Same indexing convention.
Used by the frontend calendar heatmap.

---

### CoachRequest *(request body, ephemeral)*

| Field | Type | Notes |
|-------|------|-------|
| `messages` | `list[CoachMessage]` | Full conversation history from frontend |

**No `user_id` field.** User identity extracted from JWT header server-side.

---

### CoachMessage *(part of CoachRequest, ephemeral)*

| Field | Type | Notes |
|-------|------|-------|
| `role` | `"user"` \| `"assistant"` | Anthropic messages API roles |
| `content` | string | Message text |

Not persisted in Redis. Frontend accumulates in local state.

---

## Redis Key Schema (L4 canonical)

All key strings live in `src/lib/redis_keys.py` only.

| Key pattern | Value | Owns by |
|-------------|-------|---------|
| `habits:{userId}:{habitId}` | JSON Habit | user |
| `checks:{habitId}:{YYYY-MM-DD}` | `"1"` | habit (UUID globally unique) |

Scan pattern for all habits of a user: `habits:{userId}:*`
Scan pattern for all check-ins of a habit: `checks:{habitId}:*`

---

## State Transitions

```
Habit lifecycle:
  [created via POST /habits] → exists in Redis
  [no deletion UI in L4]     → habits persist indefinitely in lab

CheckIn lifecycle:
  [POST /habits/{id}/check]  → key created (idempotent guard: 409 if exists today)
  [no deletion]              → permanent

Auth session lifecycle (frontend):
  [signup / login]  → Supabase issues JWT, stored in localStorage
  [page refresh]    → Supabase JS client restores session from localStorage
  [JWT expiry]      → backend returns 401 → frontend redirects to login
```
