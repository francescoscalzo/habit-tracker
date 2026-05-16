# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture invariants (from `Lezione3_HabitTracker_Spec.md`)

Habit Tracker HTTP API. L3 = Python/FastAPI backend + Redis. L4 will add React/Lovable frontend + Supabase Auth + Anthropic AI coach endpoint to this same backend.

Decisions baked into the lesson — do not refactor away:

- **Single-user mode in L3**: `userId` hardcoded `"default"`. Real auth is L4.
- **Redis key schema** (canonical, no variants):
  - `habits:default:{habitId}` → JSON-serialised Habit object.
  - `checks:{habitId}:{YYYY-MM-DD}` → `"1"` (presence = check-in done that day, no TTL).
  - Check-ins are **not a separate object** — only key existence matters.
- **Stats computed on read**, not stored. `currentStreak` / `longestStreak` / `successRate` / `last30days` derive from scanning `checks:*` keys for the habit.
- **`last30days` array indexing**: `[0]` = today, `[29]` = 30 days ago. Order matters for the future frontend.
- **CORS wide-open in L3** (`allow_origins=["*"]`) — restricted to Lovable domains only in L4.
- **`createdAt` / IDs server-generated**: UUID v4, ISO 8601 UTC. Never trust client values.
- **Error contract**: 422 from Pydantic auto, 400 app errors, 404 missing habit, 409 duplicate same-day check-in.

## Suggested layout

```
src/
  main.py            # FastAPI app + CORS + router mounting
  routes/habits.py   # 4 habit endpoints + /health
  models/habit.py    # Pydantic schemas (HabitCreate, HabitOut)
  services/
    redis_client.py  # async Redis connection
    habit_service.py # CRUD
    stats_service.py # streak/successRate/last30days logic
  lib/redis_keys.py  # key builders — keep schema in one place
tests/
  conftest.py        # AsyncClient fixture, Redis test setup
  test_habits.py
docker/Dockerfile
```

Keep Redis key strings in `lib/redis_keys.py` only — scattering raw `f"habits:default:{id}"` across services breaks the L4 multi-user migration.

## Plans

Implementation plans live in `.claude/plans/` (versioned in repo). Plan mode writes to `~/.claude/plans/` — after approval, move the file here manually or with `cp ~/.claude/plans/<name>.md .claude/plans/`.

## Teaching constraint

Course material. Prefer patterns shown in spec's example code over more idiomatic alternatives students haven't been taught yet. If a "better" way appears (DI, repository pattern, etc.), keep it for L4 — L3 deliberately stays flat.
