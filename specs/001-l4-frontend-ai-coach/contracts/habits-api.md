# Contract: Habits API (L4)

All endpoints require `Authorization: Bearer <supabase_jwt>` header.
Backend extracts `userId` from the JWT — never from the request body.

Base URL (dev): `http://localhost:8000`

---

## POST /habits

Create a new habit for the authenticated user.

**Request**
```json
{
  "name": "Meditazione",
  "emoji": "🧘"
}
```

**Response 201**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Meditazione",
  "emoji": "🧘",
  "createdAt": "2026-05-20T10:00:00Z"
}
```

**Errors**: 422 validation · 401 missing/invalid token

---

## GET /habits

List all habits for the authenticated user.

**Response 200**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Meditazione",
    "emoji": "🧘",
    "createdAt": "2026-05-20T10:00:00Z"
  }
]
```

Empty list `[]` when user has no habits.

**Errors**: 401

---

## POST /habits/{habitId}/check

Record a check-in for today (UTC date).

**Path param**: `habitId` — UUID of the habit

**Request body**: empty `{}`

**Response 200**
```json
{ "checked": true, "date": "2026-05-20" }
```

**Errors**:
- 404 habit not found or not owned by user
- 409 already checked in today
- 401 missing/invalid token

---

## GET /habits/{habitId}/stats

Return computed stats for a habit.

**Response 200**
```json
{
  "currentStreak": 5,
  "longestStreak": 12,
  "successRate": 0.73,
  "last30days": [true, false, true, ...],
  "last90days": [true, false, true, ...]
}
```

- `last30days`: array of 30 booleans, `[0]` = today
- `last90days`: array of 90 booleans, `[0]` = today *(L4 addition)*

**Errors**: 404 · 401

---

## GET /health

Health check. No auth required.

**Response 200**
```json
{ "status": "ok" }
```
