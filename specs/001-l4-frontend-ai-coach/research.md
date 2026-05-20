# Research: L4 Frontend + AI Coach

**Date**: 2026-05-20
**Feature**: specs/001-l4-frontend-ai-coach/spec.md

---

## 1. supabase-py JWT Verification in FastAPI

**Decision**: Use `supabase.auth.get_user(jwt)` from the `supabase-py` SDK as a
FastAPI dependency to validate tokens on every protected request.

**Pattern**:
```python
# src/auth/dependencies.py
from fastapi import Header, HTTPException
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async def get_current_user_id(authorization: str = Header()) -> str:
    token = authorization.removeprefix("Bearer ")
    try:
        resp = supabase.auth.get_user(token)
        return resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

Use the **service role key** (`SUPABASE_SERVICE_KEY`) server-side for admin
operations; the **anon key** is frontend-only.

**Rationale**: `get_user()` validates the JWT signature against Supabase's
public key and returns full user info in one call. Simpler than local JWKS
validation. Acceptable network overhead in a lab context.

**Alternatives considered**:
- Local JWT validation via `PyJWT` + JWKS endpoint — avoids remote call, but
  requires caching JWKS keys and handling key rotation manually. Overkill for L4.
- Trusting client-supplied `user_id` — rejected (security violation, per spec).

---

## 2. Redis Key Migration (L3 → L4)

**Decision**: Update `src/lib/redis_keys.py` key builders to accept `user_id`
as a required parameter. No live migration script — L4 is a fresh start in the
lab (students reinitialize Redis).

**L3 keys** (retired):
- `habits:default:{habitId}`

**L4 keys** (canonical):
- `habits:{userId}:{habitId}` — Habit JSON object
- `checks:{habitId}:{YYYY-MM-DD}` — `"1"` (unchanged; habitId UUID is globally
  unique, no userId needed)

**Ownership enforcement**: Before any check-in or stats operation, verify
`habits:{userId}:{habitId}` exists. If not → 404 (habit not found or not owned).

**Rationale**: Simple key prefix change. `checks:` key stays the same because
UUID4 habitIds are globally unique — no two users will share a habitId.

---

## 3. FastAPI StreamingResponse + Anthropic SDK

**Decision**: Use `anthropic.Anthropic().messages.stream()` context manager,
yield Server-Sent Events (`data: <token>\n\n`) via `StreamingResponse`.

**Pattern**:
```python
# src/services/coach_service.py
import anthropic
from collections.abc import AsyncIterator

async def stream_coach(
    habit_context: str,
    messages: list[dict],
) -> AsyncIterator[str]:
    client = anthropic.Anthropic()
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=habit_context,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {text}\n\n"
    yield "data: [DONE]\n\n"
```

```python
# src/routes/coach.py
from fastapi.responses import StreamingResponse

@router.post("/coach/chat")
async def coach_chat(
    body: CoachRequest,
    user_id: str = Depends(get_current_user_id),
) -> StreamingResponse:
    habits = await habit_service.list_habits(user_id)
    context = build_habit_context(habits)
    return StreamingResponse(
        stream_coach(context, body.messages),
        media_type="text/event-stream",
    )
```

**Rationale**: `messages.stream()` is the official Anthropic SDK streaming
interface. SSE is the simplest streaming protocol for Fetch API / EventSource
on the frontend.

**Frontend consumption** (EventSource or fetch with ReadableStream):
```typescript
const resp = await fetch('/coach/chat', {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ messages }),
});
const reader = resp.body!.getReader();
// decode chunks and append to chat state
```

**Alternatives considered**:
- WebSockets — overkill for one-directional streaming; SSE simpler.
- Buffered response — violates FR-012 (token-by-token display).

---

## 4. CORS Configuration for L4

**Decision**: Keep `allow_origins=["*"]` in dev (localhost). Add Bolt/Lovable
deployed domain to allowed origins before any cloud deployment.

**Pattern** (FastAPI):
```python
import os
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, ...)
```

Set `CORS_ORIGINS=https://your-app.bolt.new` in production `.env`.

**Rationale**: Env-var-driven CORS is a one-line switch from dev to prod.
Constitution V mandates restriction in production.

---

## 5. Frontend Auth Pattern (Supabase JS + Vite)

**Decision**: Use `@supabase/supabase-js` client in the frontend. Store only
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (safe to
expose). Pass `session.access_token` as `Authorization: Bearer` on every
backend API call.

**Session persistence**: Supabase JS client persists session to `localStorage`
by default — satisfies FR-002 (no re-login on refresh).

**Rationale**: Standard Supabase browser auth pattern. The anon key is public
by design (row-level security enforces data isolation in Supabase; here data
isolation is enforced by the Python backend via JWT).
