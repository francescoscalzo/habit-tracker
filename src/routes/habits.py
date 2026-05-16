from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Response, status
from redis.exceptions import RedisError

from src.models.habit import CheckInOut, HabitCreate, HabitOut, StatsOut
from src.services import habit_service, redis_client, stats_service

router = APIRouter()


@router.post("/habits", response_model=HabitOut, status_code=status.HTTP_201_CREATED)
async def create_habit(payload: HabitCreate) -> HabitOut:
    return await habit_service.create_habit(payload)


@router.get("/habits", response_model=list[HabitOut])
async def list_habits() -> list[HabitOut]:
    return await habit_service.get_all_habits()


@router.post("/habits/{habit_id}/check", response_model=CheckInOut)
async def check_habit(habit_id: str) -> CheckInOut:
    habit = await habit_service.get_habit(habit_id)
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    ok = await habit_service.do_checkin(habit_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in today")

    return CheckInOut(habitId=habit_id, date=datetime.now(timezone.utc).date().isoformat(), completed=True)


@router.get("/habits/{habit_id}/stats", response_model=StatsOut)
async def get_stats(habit_id: str) -> StatsOut:
    habit = await habit_service.get_habit(habit_id)
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    return await stats_service.get_stats(habit_id, habit.createdAt)


@router.get("/health")
async def health(response: Response) -> dict:
    try:
        await redis_client.redis.ping()
        return {"status": "ok", "redis": "connected"}
    except RedisError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "error", "redis": "disconnected"}
