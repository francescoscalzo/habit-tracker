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


class CheckInOut(BaseModel):
    habitId: str
    date: str
    completed: bool


class StatsOut(BaseModel):
    habitId: str
    totalCheckIns: int
    currentStreak: int
    longestStreak: int
    successRate: float
    last30days: list[bool]
