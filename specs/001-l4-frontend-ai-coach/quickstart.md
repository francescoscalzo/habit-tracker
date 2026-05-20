# Quickstart: L4 Habit Tracker (Backend + Frontend)

**Prerequisites**: Docker, Python 3.11+, uv, Node.js 20+

---

## 1. Backend setup

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7

# Install Python deps (adds supabase-py, anthropic SDK)
uv sync

# Copy and fill environment variables
cp .env.example .env
# Required vars:
#   SUPABASE_URL=https://<your-project>.supabase.co
#   SUPABASE_SERVICE_KEY=<service_role_key>   ← server-side only
#   ANTHROPIC_API_KEY=<your_key>              ← server-side only
#   CORS_ORIGINS=*                            ← change for prod

# Run backend
uv run uvicorn src.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok"}`

---

## 2. Frontend setup (Bolt.new generated)

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Required vars (safe to expose — Supabase anon key):
#   VITE_SUPABASE_URL=https://<your-project>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<anon_key>
#   VITE_API_BASE_URL=http://localhost:8000

npm run dev
# → http://localhost:5173
```

**Note**: ANTHROPIC_API_KEY MUST NOT appear in `.env.local` or any frontend file.

---

## 3. Smoke test (authenticated)

```bash
# 1. Sign up via browser → http://localhost:5173
# 2. Get JWT from browser devtools (Application → localStorage → supabase.auth.token)
TOKEN="<paste_jwt_here>"

# 3. Create a habit
curl -X POST http://localhost:8000/habits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Meditazione","emoji":"🧘"}'

# 4. Check in
HABIT_ID="<id from step 3>"
curl -X POST http://localhost:8000/habits/$HABIT_ID/check \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'

# 5. Stats (verify last90days has 90 elements)
curl http://localhost:8000/habits/$HABIT_ID/stats \
  -H "Authorization: Bearer $TOKEN"

# 6. AI Coach streaming
curl -X POST http://localhost:8000/coach/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Come sto andando?"}]}' \
  --no-buffer
# → Should see data: tokens streaming line by line
```

---

## 4. Run tests

```bash
uv run pytest tests/ -v
# Tests use FakeAsyncRedis + mocked Supabase auth
```

---

## 5. Validation checklist

- [ ] Backend returns 401 without Authorization header
- [ ] Two different users cannot see each other's habits
- [ ] Duplicate check-in on same day returns 409
- [ ] `last90days` array has exactly 90 elements
- [ ] `/coach/chat` streams tokens (not a single buffered response)
- [ ] `ANTHROPIC_API_KEY` not present in any browser network response
- [ ] Frontend dashboard updates streak without full page reload
