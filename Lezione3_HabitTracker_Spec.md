# Habit Tracker — Project Spec

> Documento distribuito agli studenti all'inizio del lab di Lezione 3.
> Definisce cosa costruiamo in L3 (backend Python) e cosa aggiungiamo in L4 (frontend Lovable + AI).
> **In L3 si lavora DA questa spec. In L4 si impara a SCRIVERE spec come questa.**

---

## Panoramica

Un'API HTTP per tracciare abitudini quotidiane personali. L'utente crea abitudini (es. "Sport 💪", "Lettura 📚"), fa check-in ogni giorno e vede statistiche su streak e success rate.

Il backend è scritto in **Python** con **FastAPI**, usa **Redis** come storage, ed è **dockerizzato**. In L4 verrà esteso con un frontend React (Lovable) che parla con questo backend via REST.

**Architettura target (L3 + L4):**

```
┌─────────────────────────┐    HTTP/REST    ┌─────────────────────────┐
│  Frontend (L4, Lovable) │  ───────────▶   │  Backend (L3, FastAPI)  │
│  React + TypeScript     │  ◀───────────   │  Python + Pydantic      │
│  Supabase Auth          │       JSON      │  Redis                  │
└─────────────────────────┘                 └─────────────────────────┘
```

Linguaggi separati per ogni layer, REST come contratto neutro.

---

## Data model

### Habit

```python
{
    "id": "uuid-v4",
    "name": "Sport",
    "emoji": "💪",
    "createdAt": "2026-05-13T10:00:00.000Z",
    "userId": "default"
}
```

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID v4 | generato server-side |
| `name` | string | 1–50 caratteri |
| `emoji` | string | 1 emoji |
| `createdAt` | ISO 8601 | generato server-side |
| `userId` | string | fisso `"default"` in L3 (auth in L4) |

### Check-in

Non è un oggetto separato. Viene rappresentato come presenza di una chiave Redis:

```
checks:{habitId}:{YYYY-MM-DD}  →  "1"
```

Se la chiave esiste → check-in eseguito quel giorno.

---

## Redis key schema

| Chiave | Valore | Descrizione |
|--------|--------|-------------|
| `habits:default:{habitId}` | JSON string | oggetto Habit serializzato |
| `checks:{habitId}:{YYYY-MM-DD}` | `"1"` | check-in del giorno (TTL: nessuno) |

---

## API endpoints (scope L3)

### `POST /habits`

Crea nuova abitudine.

**Request body:**
```json
{ "name": "Sport", "emoji": "💪" }
```

**Response 201:**
```json
{
  "id": "a1b2c3d4-...",
  "name": "Sport",
  "emoji": "💪",
  "createdAt": "2026-05-13T10:00:00.000Z",
  "userId": "default"
}
```

**Errori:** `422` se validazione Pydantic fallisce (FastAPI default), `400` per errori applicativi.

---

### `GET /habits`

Lista tutte le abitudini dell'utente corrente.

**Response 200:**
```json
[
  { "id": "...", "name": "Sport", "emoji": "💪", "createdAt": "..." },
  { "id": "...", "name": "Lettura", "emoji": "📚", "createdAt": "..." }
]
```

Note: ordinate per `createdAt` decrescente.

---

### `POST /habits/{habit_id}/check`

Check-in giornaliero per un'abitudine. Una sola volta al giorno.

**Response 200:**
```json
{ "habitId": "a1b2c3d4-...", "date": "2026-05-13", "completed": true }
```

**Errori:**
- `404` se habit non trovata
- `409` se check-in già fatto oggi

---

### `GET /habits/{habit_id}/stats`

Statistiche per un'abitudine.

**Response 200:**
```json
{
  "habitId": "a1b2c3d4-...",
  "totalCheckIns": 15,
  "currentStreak": 5,
  "longestStreak": 12,
  "successRate": 0.71,
  "last30days": [true, false, true, true, "..."]
}
```

**Campi:**
| Campo | Calcolo |
|-------|---------|
| `totalCheckIns` | numero totale di check-in |
| `currentStreak` | giorni consecutivi fino ad oggi |
| `longestStreak` | streak più lunga di sempre |
| `successRate` | checkIns / giorni dall'inizio (0.0–1.0) |
| `last30days` | array 30 bool, [0] = oggi, [29] = 30 giorni fa |

**Errori:** `404` se habit non trovata.

---

## Validazione (Pydantic)

```python
from pydantic import BaseModel, Field

class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    emoji: str = Field(min_length=1, max_length=10)

class HabitOut(BaseModel):
    id: str
    name: str
    emoji: str
    createdAt: str
    userId: str
```

FastAPI usa automaticamente Pydantic per:
- Validare richieste in ingresso (422 automatico se non valida)
- Serializzare risposte in uscita
- Generare documentazione OpenAPI/Swagger su `/docs`

---

## Test coverage minima (L3)

| Test | Tipo |
|------|------|
| `POST /habits` con input valido → 201 | happy path |
| `POST /habits` con `name` vuoto → 422 | validation |
| `GET /habits` → array (anche vuoto) | happy path |
| `POST /habits/{id}/check` → 200 | happy path |
| `POST /habits/{id}/check` habit inesistente → 404 | error |
| `POST /habits/{id}/check` due volte stesso giorno → 409 | error |
| `GET /habits/{id}/stats` → oggetto stats | happy path |
| `GET /habits/{id}/stats` habit inesistente → 404 | error |

---

## Stack tecnico L3

| Componente | Scelta |
|------------|--------|
| Runtime | Python 3.11+ |
| Framework | FastAPI 0.115+ |
| ASGI server | Uvicorn (con `[standard]` per reload) |
| Validazione | Pydantic v2 |
| ID generazione | `uuid` (stdlib) |
| Storage | Redis 7 (via Docker Compose) |
| Redis client | `redis-py` con supporto asyncio |
| Test | pytest + pytest-asyncio + httpx |
| Package manager | `uv` (raccomandato 2025) o `pip` |

### `pyproject.toml` di riferimento

```toml
[project]
name = "habit-tracker"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "pydantic>=2.9",
    "redis>=5.2",
]

[dependency-groups]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "httpx>=0.28",
]
```

### Comandi essenziali

```bash
# Setup (una volta sola)
uv sync                          # installa dipendenze

# Sviluppo
uv run uvicorn src.main:app --reload --port 8000

# Test
uv run pytest

# Docker
docker compose up                # avvia Redis + app

# Esplora API in browser
open http://localhost:8000/docs  # Swagger UI auto-generato
```

---

## CORS (importante per L4)

Il backend deve accettare richieste dal frontend Lovable (che gira su dominio diverso). FastAPI ha middleware nativo:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://habit-tracker-*.lovable.app",  # preview Lovable
        "http://localhost:5173",                # dev locale
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

In L3 si configura subito CORS aperto (`["*"]` per semplicità lab), in L4 si restringe ai domini reali.

---

## Scope L4 (non implementare in L3)

Le seguenti feature sono fuori scope per L3 e verranno aggiunte in L4 via Lovable + estensione di questo backend:

| Feature | Tipo | Dove |
|---------|------|------|
| Frontend UI completa | React + Tailwind | Lovable (TypeScript) |
| Autenticazione utente | Supabase Auth (JWT) | Lovable |
| Calendar heatmap 90gg | componente React | Lovable |
| Pagina statistiche grafiche | UI | Lovable |
| Multi-user reale | userId da JWT | backend Python (estensione L4) |
| Chatbot AI Coach | `POST /coach/chat` | backend Python (estensione L4, vedi sotto) |
| Deploy pubblico backend | Render/Fly/Railway | DevOps L4 |

### Estensione L4 — Endpoint AI Coach (aggiunto in L4)

```python
from anthropic import Anthropic

@app.post("/coach/chat")
async def coach_chat(payload: ChatRequest):
    habits = await get_user_habits(payload.user_id)
    response = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        system=f"Sei un coach motivazionale. Abitudini utente: {habits}",
        messages=payload.messages,
        max_tokens=1024,
        stream=True,
    )
    return StreamingResponse(stream_anthropic(response))
```

Il frontend Lovable chiama questo endpoint via `fetch` e mostra la risposta in streaming.

---

## Endpoint health (bonus)

```
GET /health  →  { "status": "ok", "redis": "connected" }
```

Verifica che Redis risponda. Utile per Docker healthcheck e monitoring.

---

## Struttura file suggerita

```
habit-tracker/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app + CORS + monta router
│   ├── routes/
│   │   ├── __init__.py
│   │   └── habits.py        # 4 endpoint Habit
│   ├── models/
│   │   ├── __init__.py
│   │   └── habit.py         # Pydantic schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── redis_client.py  # connessione Redis
│   │   ├── habit_service.py # logica habit (CRUD)
│   │   └── stats_service.py # logica streak/stats
│   └── lib/
│       └── redis_keys.py    # helper key builder
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # fixture pytest (test client + Redis test)
│   └── test_habits.py       # pytest async test
├── docker/
│   └── Dockerfile           # immagine app Python
├── docker-compose.yml       # app + Redis
├── pyproject.toml           # dipendenze + config uv
├── .python-version          # 3.11
└── CLAUDE.md                # istruzioni per Claude Code
```

---

## Esempio implementazione: endpoint `POST /habits`

```python
# src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import habits

app = FastAPI(title="Habit Tracker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(habits.router)


# src/routes/habits.py
from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone
from uuid import uuid4
import json
from src.models.habit import HabitCreate, HabitOut
from src.services.redis_client import redis

router = APIRouter()

@router.post("/habits", response_model=HabitOut, status_code=status.HTTP_201_CREATED)
async def create_habit(payload: HabitCreate) -> HabitOut:
    habit = HabitOut(
        id=str(uuid4()),
        name=payload.name,
        emoji=payload.emoji,
        createdAt=datetime.now(timezone.utc).isoformat(),
        userId="default",
    )
    await redis.set(f"habits:default:{habit.id}", habit.model_dump_json())
    return habit
```

```python
# tests/test_habits.py
import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app

@pytest.mark.asyncio
async def test_create_habit_valid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/habits", json={"name": "Sport", "emoji": "💪"})
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Sport"
        assert data["userId"] == "default"
        assert "id" in data

@pytest.mark.asyncio
async def test_create_habit_empty_name():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/habits", json={"name": "", "emoji": "💪"})
        assert response.status_code == 422  # Pydantic validation
```

---

## Differenze rispetto a un classico Node.js Express

Per chi viene da JavaScript:

| Aspetto | Node + Express | Python + FastAPI |
|---------|----------------|------------------|
| Definizione endpoint | `app.post('/path', handler)` | `@app.post("/path")` decorator |
| Validazione | Zod manuale o middleware | Pydantic automatica via type hint |
| Async | `async function ... await` | `async def ... await` |
| Documentazione API | manuale (Swagger separato) | automatica su `/docs` |
| Test HTTP | supertest | httpx (cliente async) |
| Hot reload | `nodemon` o equivalente | `uvicorn --reload` integrato |

Il pattern mentale è simile. Le differenze sono syntactic sugar e qualche convenzione.

---

## Note didattiche

**Perché Python (e non Node) per L3?**

1. **Python è lingua franca dell'AI/ML**: Anthropic, OpenAI, Hugging Face hanno SDK Python di prima classe. Studenti che vogliono lavorare in AI vedranno Python ovunque.
2. **FastAPI + Pydantic sono didatticamente eccellenti**: validazione type-driven, OpenAPI gratis, async naturale. Più "elegante" da insegnare di Express + Zod.
3. **Pattern multi-linguaggio realistico**: aziende AI moderne usano backend Python + frontend React/TS. Il corso lo riflette in L3 (BE Python) + L4 (FE Lovable TS).
4. **REST come ponte**: gli studenti vedono concretamente che REST è language-agnostic. Backend in qualsiasi linguaggio, frontend in qualsiasi linguaggio.

**Continuità con L1/L2:**
- L1 usa Node per Docker (concettuale): Docker è language-agnostic, il container poteva essere qualsiasi cosa.
- L2 usa Git: indifferente al linguaggio.
- L3 cambia stack al backend (Node → Python) → momento didattico per mostrare che **i concetti** (Docker, Git, AI agents) sono **trasversali**, i linguaggi sono dettagli.
