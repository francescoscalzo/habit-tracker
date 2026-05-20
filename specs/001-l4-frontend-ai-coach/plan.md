# Implementation Plan: L4 Frontend + AI Coach

**Branch**: `001-l4-frontend-ai-coach` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-l4-frontend-ai-coach/spec.md`

## Summary

Extend the L3 Python/FastAPI backend with Supabase JWT authentication, a
multi-user Redis key migration, a 90-day stats extension, and a streaming AI
Coach endpoint (`POST /coach/chat`). Add a Bolt.new-generated React/TypeScript
frontend covering login, habit dashboard with check-in, habit detail heatmap,
and a coach chat drawer.

## Technical Context

**Language/Version**: Python 3.11+ (backend) · TypeScript (frontend, Bolt.new)
**Primary Dependencies**:
- Backend: FastAPI 0.115+, Pydantic v2, supabase-py, anthropic SDK, redis-py
- Frontend: Vite + React 18, @supabase/supabase-js (Bolt-generated)
**Storage**: Redis 7 (Docker) — key-value, no ORM
**Testing**: pytest + httpx + FakeAsyncRedis (backend) · Bolt acceptance tests (frontend)
**Target Platform**: Local dev (localhost); deployable to any cloud
**Project Type**: Web service (backend) + Single-page app (frontend)
**Performance Goals**: Dashboard load < 2s · Check-in response < 1s · First coach token < 3s
**Constraints**: API key server-side only · CORS restricted in prod · JWT validation on every request
**Scale/Scope**: Single-user lab → multi-user (one JWT per student) · ~10 habits per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Disciplined Python Backend | ✅ Pass | Type hints + async required on all new files; TDD enforced |
| II. Spec as Source of Truth | ✅ Pass | This plan derives from ratified spec.md |
| III. REST as Language-Agnostic Bridge | ✅ Pass | All endpoints REST/JSON; SSE for streaming |
| IV. Vibe Frontend, Spec Contract | ✅ Pass | Bolt.new with spec as context; acceptance scenarios validate output |
| V. Security Boundaries | ✅ Pass | ANTHROPIC_API_KEY server-side only; CORS restricted in prod |
| Architecture Invariant: Redis key schema | ⚠️ Amendment | `habits:default:` → `habits:{userId}:` is planned L4 migration (documented in spec Decisions). Constitution v1.0.0 references old key; recommend v1.0.1 patch amendment. |
| Architecture Invariant: Coach endpoint name | ⚠️ Amendment | Constitution says `/coach/advice`; spec (source of truth) says `/coach/chat`. Spec wins (Principle II). Recommend constitution v1.0.1 patch. |

**Action required**: After this plan is approved, amend constitution to v1.0.1
updating the two ⚠️ invariants above.

**Post-design re-check**: All gates still pass after Phase 1. No new violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-l4-frontend-ai-coach/
├── plan.md              # This file
├── research.md          # Phase 0 ✅
├── data-model.md        # Phase 1 ✅
├── quickstart.md        # Phase 1 ✅
├── contracts/
│   ├── habits-api.md    # Phase 1 ✅
│   └── coach-api.md     # Phase 1 ✅
└── tasks.md             # Phase 2 (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
Backend — extends L3 src/ in place:
src/
├── main.py                    # MODIFY: register coach router, update CORS
├── auth/
│   ├── __init__.py            # NEW
│   └── dependencies.py        # NEW: get_current_user_id FastAPI dependency
├── lib/
│   └── redis_keys.py          # MODIFY: key builders accept user_id param
├── models/
│   ├── habit.py               # MODIFY: HabitStats gains last90days field
│   └── coach.py               # NEW: CoachRequest, CoachMessage Pydantic models
├── routes/
│   ├── habits.py              # MODIFY: inject user_id from JWT dependency
│   └── coach.py               # NEW: POST /coach/chat streaming route
└── services/
    ├── redis_client.py        # UNCHANGED
    ├── habit_service.py       # MODIFY: user_id param throughout
    ├── stats_service.py       # MODIFY: extend to 90 days
    └── coach_service.py       # NEW: Anthropic streaming generator

tests/
├── conftest.py                # MODIFY: add JWT auth fixtures, mock supabase
├── test_habits.py             # MODIFY: add Authorization header to all calls
└── test_coach.py              # NEW: coach endpoint streaming tests

Frontend — Bolt.new generated, tracked at repo root:
frontend/
├── src/
│   ├── lib/
│   │   └── supabase.ts        # Supabase JS client initialisation
│   ├── components/
│   │   ├── HabitCard.tsx      # Name + emoji + streak + check-in button
│   │   ├── HabitHeatmap.tsx   # 90-day calendar from last90days array
│   │   └── CoachDrawer.tsx    # Side drawer with chat UI + SSE streaming
│   ├── pages/
│   │   ├── LoginPage.tsx      # Signup + login forms
│   │   ├── DashboardPage.tsx  # Habit list + coach toggle button
│   │   └── HabitDetailPage.tsx # Stats + heatmap
│   └── services/
│       ├── habitApi.ts        # fetch wrappers for all habit endpoints
│       └── coachApi.ts        # fetch + ReadableStream for SSE
├── .env.local                 # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
│                              # VITE_API_BASE_URL — NO API keys here
└── vite.config.ts
```

**Structure Decision**: Web application (Option 2 variant). Backend stays in
`src/` (extending L3 in-place). Frontend in `frontend/` (Bolt-generated).
Separation mirrors the lesson progression (students touch backend first, then
generate frontend).

## Complexity Tracking

> No constitution violations requiring justification. ⚠️ items above are
> planned amendments, not violations.

## Implementation Order

### Backend first (blocks frontend integration)

1. `src/lib/redis_keys.py` — add `user_id` param; update all callers
2. `src/auth/dependencies.py` — JWT dependency
3. `src/models/habit.py` — add `last90days` to HabitStats
4. `src/services/stats_service.py` — extend to 90 days
5. `src/services/habit_service.py` — user_id throughout
6. `src/routes/habits.py` — inject dependency
7. `src/models/coach.py` — Pydantic models
8. `src/services/coach_service.py` — Anthropic streaming generator
9. `src/routes/coach.py` — streaming route
10. `src/main.py` — register coach router, env-var CORS
11. Tests: conftest update, test_habits update, test_coach new

### Frontend after backend is green

12. Generate with Bolt.new using spec.md + contracts/ as context
13. Validate against quickstart.md checklist

## Environment Variables

| Variable | Location | Value (dev) |
|----------|----------|-------------|
| `SUPABASE_URL` | backend `.env` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | backend `.env` | service role key |
| `ANTHROPIC_API_KEY` | backend `.env` | Anthropic key |
| `CORS_ORIGINS` | backend `.env` | `*` (dev) / domain (prod) |
| `VITE_SUPABASE_URL` | frontend `.env.local` | same project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend `.env.local` | anon key (safe) |
| `VITE_API_BASE_URL` | frontend `.env.local` | `http://localhost:8000` |

`ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_KEY` MUST NOT appear in any frontend
file. Violation = constitution Principle V breach.
