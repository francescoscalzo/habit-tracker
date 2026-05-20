from httpx import AsyncClient


async def test_create_habit_valid(client: AsyncClient):
    response = await client.post("/habits", json={"name": "Sport", "emoji": "💪"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Sport"
    assert data["emoji"] == "💪"
    assert data["userId"] == "test-user-id"
    assert "id" in data
    assert "createdAt" in data


async def test_create_habit_empty_name(client: AsyncClient):
    response = await client.post("/habits", json={"name": "", "emoji": "💪"})
    assert response.status_code == 422


async def test_list_habits_returns_array(client: AsyncClient):
    response = await client.get("/habits")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_checkin_happy(client: AsyncClient):
    r = await client.post("/habits", json={"name": "Sport", "emoji": "💪"})
    habit_id = r.json()["id"]

    response = await client.post(f"/habits/{habit_id}/check")
    assert response.status_code == 200
    data = response.json()
    assert data["habitId"] == habit_id
    assert data["completed"] is True
    assert "date" in data


async def test_checkin_not_found(client: AsyncClient):
    response = await client.post("/habits/nonexistent-id/check")
    assert response.status_code == 404


async def test_checkin_duplicate_same_day(client: AsyncClient):
    r = await client.post("/habits", json={"name": "Sport", "emoji": "💪"})
    habit_id = r.json()["id"]

    await client.post(f"/habits/{habit_id}/check")
    response = await client.post(f"/habits/{habit_id}/check")
    assert response.status_code == 409


async def test_stats_happy(client: AsyncClient):
    r = await client.post("/habits", json={"name": "Sport", "emoji": "💪"})
    habit_id = r.json()["id"]

    response = await client.get(f"/habits/{habit_id}/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["habitId"] == habit_id
    assert data["totalCheckIns"] == 0
    assert data["currentStreak"] == 0
    assert data["longestStreak"] == 0
    assert isinstance(data["successRate"], float)
    assert len(data["last30days"]) == 30
    assert all(isinstance(v, bool) for v in data["last30days"])
    assert len(data["last90days"]) == 90
    assert all(isinstance(v, bool) for v in data["last90days"])


async def test_stats_not_found(client: AsyncClient):
    response = await client.get("/habits/nonexistent-id/stats")
    assert response.status_code == 404


async def test_stats_with_checkin(client: AsyncClient):
    r = await client.post("/habits", json={"name": "Sport", "emoji": "💪"})
    habit_id = r.json()["id"]
    await client.post(f"/habits/{habit_id}/check")

    response = await client.get(f"/habits/{habit_id}/stats")
    data = response.json()
    assert data["totalCheckIns"] == 1
    assert data["currentStreak"] == 1
    assert data["longestStreak"] == 1
    assert data["successRate"] == 1.0
    assert data["last30days"][0] is True
    assert data["last30days"][1] is False


async def test_list_habits_ordered_desc(client: AsyncClient):
    await client.post("/habits", json={"name": "First", "emoji": "1️⃣"})
    await client.post("/habits", json={"name": "Second", "emoji": "2️⃣"})

    response = await client.get("/habits")
    data = response.json()
    assert len(data) == 2
    assert data[0]["createdAt"] >= data[1]["createdAt"]


async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["redis"] == "connected"
