from datetime import date, datetime, timedelta, timezone

from src.lib.redis_keys import checks_pattern
from src.models.habit import StatsOut
from src.services import redis_client


async def get_stats(habit_id: str, created_at: str) -> StatsOut:
    keys = await redis_client.redis.keys(checks_pattern(habit_id))
    checked_dates = {key.split(":")[-1] for key in keys}

    total_check_ins = len(checked_dates)

    today = datetime.now(timezone.utc).date()
    d = today
    current_streak = 0
    while d.isoformat() in checked_dates:
        current_streak += 1
        d -= timedelta(days=1)

    if not checked_dates:
        longest_streak = 0
    else:
        sorted_dates = sorted(checked_dates)
        longest = current = 1
        for i in range(1, len(sorted_dates)):
            prev = date.fromisoformat(sorted_dates[i - 1])
            curr = date.fromisoformat(sorted_dates[i])
            if (curr - prev).days == 1:
                current += 1
                if current > longest:
                    longest = current
            else:
                current = 1
        longest_streak = longest

    created_date = date.fromisoformat(created_at[:10])
    days_since = (today - created_date).days + 1
    success_rate = round(total_check_ins / max(days_since, 1), 2)

    last30days = [
        (today - timedelta(days=i)).isoformat() in checked_dates
        for i in range(30)
    ]

    last90days = [
        (today - timedelta(days=i)).isoformat() in checked_dates
        for i in range(90)
    ]

    return StatsOut(
        habitId=habit_id,
        totalCheckIns=total_check_ins,
        currentStreak=current_streak,
        longestStreak=longest_streak,
        successRate=success_rate,
        last30days=last30days,
        last90days=last90days,
    )
