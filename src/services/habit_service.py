import json
from datetime import datetime, timezone
from uuid import uuid4

from src.lib.redis_keys import check_key, habit_key, habits_pattern
from src.models.habit import HabitCreate, HabitOut
from src.services import redis_client


async def create_habit(payload: HabitCreate) -> HabitOut:
    habit = HabitOut(
        id=str(uuid4()),
        name=payload.name,
        emoji=payload.emoji,
        createdAt=datetime.now(timezone.utc).isoformat(),
        userId="default",
    )
    await redis_client.redis.set(habit_key(habit.id), habit.model_dump_json())
    return habit


async def get_all_habits() -> list[HabitOut]:
    keys = await redis_client.redis.keys(habits_pattern())
    if not keys:
        return []
    values = await redis_client.redis.mget(*keys)
    habits = [HabitOut(**json.loads(v)) for v in values if v]
    habits.sort(key=lambda h: h.createdAt, reverse=True)
    return habits


async def get_habit(habit_id: str) -> HabitOut | None:
    data = await redis_client.redis.get(habit_key(habit_id))
    if not data:
        return None
    return HabitOut(**json.loads(data))


async def do_checkin(habit_id: str) -> bool:
    """Set today's check-in. Returns False if already set."""
    today = datetime.now(timezone.utc).date().isoformat()
    return bool(await redis_client.redis.setnx(check_key(habit_id, today), "1"))
