# Habit Tracker — Approccio implementazione L3

**Context:** Repo vuoto (solo spec + docker-compose Redis). Dobbiamo decidere COME costruire, non COSA — la spec è la fonte di verità.

---

## 1. Struttura moduli Python

La spec suggerisce la struttura, ma ci sono decisioni da prendere:

```
src/
  main.py              # app FastAPI + CORS + lifespan + router
  routes/habits.py     # thin HTTP layer, delega a services
  models/habit.py      # Pydantic: HabitCreate, HabitOut
  services/
    redis_client.py    # singleton Redis asincrono (module-level)
    habit_service.py   # CRUD habits
    stats_service.py   # streak / successRate / last30days
  lib/redis_keys.py    # UNICO posto con le key string Redis
tests/
  conftest.py
  test_habits.py
```

**Decisione critica:** `redis_client.py` espone un singleton `redis` importato direttamente nei route/service — pattern semplice, ok per L3. Usa FastAPI `lifespan` (non `@app.on_event`, deprecato) per open/close connessione.

`lib/redis_keys.py` è non negoziabile: niente `f"habits:default:{id}"` sparso — serve per la migrazione multi-user di L4.

---

## 2. Ordine di implementazione

**Raccomandazione: Hybrid scaffold → TDD**

```
Step 1  pyproject.toml + scaffold (tutti i file vuoti, __init__.py)
Step 2  models/habit.py              (Pydantic puro, no Redis, feedback rapido via /docs)
Step 3  lib/redis_keys.py            (helper puri, testabili in isolamento)
Step 4  services/redis_client.py     (connessione)
Step 5  tests/conftest.py            (fixture fakeredis — vedi §3)
Step 6  tests/test_habits.py         (scrivere gli 8 test della spec → tutti RED)
Step 7  services/habit_service.py    (implementare CRUD fino a far passare i test)
Step 8  services/stats_service.py    (implementare stats)
Step 9  routes/habits.py + main.py   (wire-up finale)
Step 10 /health endpoint             (bonus spec)
```

Vantaggi: gli studenti vedono il ciclo red→green; i modelli Pydantic danno feedback immediato via Swagger; i test definiscono il contratto prima dell'implementazione.

---

## 3. Strategia test Redis

**Raccomandazione: `fakeredis`** (non real Redis, non mock)

| Opzione | Pro | Contro |
|---------|-----|--------|
| Real Redis (docker) | 100% autentico | richiede Docker up per ogni `pytest`, lento |
| `unittest.mock` | veloce | non testa logica Redis reale, fragile |
| `fakeredis` | in-process, no Docker, API identica a redis-py async | piccola divergenza nei corner case |
| testcontainers | Redis reale in Docker per test | heavyweight, overkill per L3 |

**Implementazione in conftest.py:**
```python
import fakeredis.aioredis
import pytest
from unittest.mock import patch
from httpx import ASGITransport, AsyncClient
from src.main import app

@pytest.fixture(autouse=True)
async def fake_redis():
    fake = fakeredis.aioredis.FakeRedis()
    with patch("src.services.redis_client.redis", fake):
        yield fake
    await fake.aclose()

@pytest.fixture
async def client(fake_redis):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

`autouse=True` garantisce Redis pulito per ogni test (isolamento). `patch` sostituisce il singleton.

**Aggiunta a `pyproject.toml` (dev deps):**
```toml
"fakeredis>=2.26",
```

**Config pytest (evita `@pytest.mark.asyncio` su ogni test):**
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

---

## 4. Edge case non espliciti nella spec

### A. Stats con zero check-in
```python
totalCheckIns=0, currentStreak=0, longestStreak=0,
successRate=0.0, last30days=[False]*30
```
`successRate` denominator = `max(days_since_creation, 1)` — evita divisione per zero se habit creata oggi.

### B. `currentStreak` — definizione precisa
Spec dice "giorni consecutivi fino ad oggi". **Strict**: se oggi non c'è check-in, streak = 0 (si conta solo se oggi è incluso). Più semplice e deterministico. Alternativa lenient (conta ieri come "ancora valida") è più complessa senza vantaggio pedagogico.

### C. `last30days` per habit < 30 giorni
Array è sempre 30 elementi. Giorni precedenti alla creazione della habit → `False` (non `None`). Spec non lo esplicita ma è l'unica scelta sensata per il frontend heatmap L4.

### D. Sorting `GET /habits`
Spec: "ordinate per createdAt decrescente". ISO 8601 UTC si ordina lessicograficamente → sort in Python dopo il fetch. Redis `KEYS habits:default:*` + JSON parse + `.sort(key=lambda h: h["createdAt"], reverse=True)`.

### E. Timezone per check-in date
Spec non specifica. Usare **UTC** per la data del check-in (`datetime.now(timezone.utc).date().isoformat()`). Consistente con `createdAt`.

### F. Redis KEYS vs SCAN
`KEYS checks:{habitId}:*` blocca Redis ma va bene per L3 lab (dati minimi). Notare la differenza agli studenti come approfondimento.

### G. `successRate` arrotondamento
`round(total / days, 2)` — Pydantic serializza float nativo ma floating point dà `0.7100000001` senza arrotondamento.

---

## 5. Dipendenze da aggiungere rispetto alla spec

| Package | Perché |
|---------|--------|
| `fakeredis>=2.26` | test Redis senza Docker (dev dep) |

**`pyproject.toml` completo:**
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
    "fakeredis>=2.26",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

---

## Decisioni prese

| Domanda | Decisione |
|---------|-----------|
| `currentStreak` | **Strict** — se oggi manca check-in → streak = 0 |
| Test Redis | **fakeredis** |
| Scope sessione | 4 endpoint + /health + Dockerfile + docker-compose app service |
| Approccio | **Scaffold tutto + TDD** (tutti i file vuoti → 8 test RED → implementa → GREEN) |

---

## Algoritmo `currentStreak` (Strict)

```python
# Scorri all'indietro da oggi
today = date.today()
streak = 0
d = today
while True:
    key = f"checks:{habit_id}:{d.isoformat()}"
    if not await redis.exists(key):
        break
    streak += 1
    d -= timedelta(days=1)
return streak
```

Se oggi non c'è check-in → primo `exists` fallisce → `streak = 0`. Test deterministici.
