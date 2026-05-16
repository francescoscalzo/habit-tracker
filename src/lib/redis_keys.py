def habit_key(habit_id: str) -> str:
    return f"habits:default:{habit_id}"


def habits_pattern() -> str:
    return "habits:default:*"


def check_key(habit_id: str, date: str) -> str:
    return f"checks:{habit_id}:{date}"


def checks_pattern(habit_id: str) -> str:
    return f"checks:{habit_id}:*"
