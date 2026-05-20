def habit_key(user_id: str, habit_id: str) -> str:
    return f"habits:{user_id}:{habit_id}"


def habits_pattern(user_id: str) -> str:
    return f"habits:{user_id}:*"


def check_key(habit_id: str, date: str) -> str:
    return f"checks:{habit_id}:{date}"


def checks_pattern(habit_id: str) -> str:
    return f"checks:{habit_id}:*"
