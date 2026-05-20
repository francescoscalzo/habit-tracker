from typing import Literal

from pydantic import BaseModel


class CoachMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class CoachRequest(BaseModel):
    messages: list[CoachMessage]
