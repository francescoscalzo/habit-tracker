# Contract: Coach API (L4 new)

Requires `Authorization: Bearer <supabase_jwt>` header.
`userId` extracted from JWT server-side.

Base URL (dev): `http://localhost:8000`

---

## POST /coach/chat

Send a message to the AI Coach. Returns a streaming SSE response.

**Request headers**
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body**
```json
{
  "messages": [
    { "role": "user", "content": "Come sto andando con le mie abitudini?" },
    { "role": "assistant", "content": "Stai facendo bene! ..." },
    { "role": "user", "content": "Cosa posso migliorare?" }
  ]
}
```

- `messages`: full conversation history from the frontend session.
  Frontend is responsible for accumulating history. Backend is stateless.
- No `user_id` in body — extracted from JWT.

**Response 200** — `Content-Type: text/event-stream`

```
data: Ciao

data: ! Ecco

data:  un'analisi

data:  delle tue abitudini...

data: [DONE]
```

Each `data:` line contains one streamed text chunk. `[DONE]` signals end of
stream. Frontend should stop reading on `[DONE]`.

**Errors**:
- 401 missing/invalid token
- 503 Anthropic API unavailable (non-streaming JSON error response)

---

## Habit context injected by backend

Before calling Anthropic, backend loads `GET /habits` data for the user and
builds a system prompt:

```
You are a habit coach. The user's current habits are:
- Meditazione 🧘 | streak: 5 | success rate: 73%
- Corsa 🏃 | streak: 0 | success rate: 40%
Reply in the same language the user writes in.
```

The frontend does NOT send habit data — backend fetches it from Redis.
