import os
from collections.abc import AsyncGenerator

import anthropic

from src.models.habit import HabitOut


def build_system_prompt(habits: list[HabitOut]) -> str:
    if not habits:
        return (
            "You are a habit coach. The user has no habits yet. "
            "Encourage them to start building good habits. "
            "Reply in the same language the user writes in."
        )
    lines = "\n".join(f"- {h.emoji} {h.name}" for h in habits)
    return (
        f"You are a habit coach. The user's current habits:\n{lines}\n\n"
        "Give concise, motivating coaching advice based on their habits. "
        "Reply in the same language the user writes in."
    )


async def stream_coach_response(
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield f"data: {text}\n\n"
    yield "data: [DONE]\n\n"
