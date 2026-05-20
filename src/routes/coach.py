from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.auth.dependencies import get_current_user_id
from src.models.coach import CoachRequest
from src.services import habit_service
from src.services.coach_service import build_system_prompt, stream_coach_response

router = APIRouter()


@router.post("/coach/chat")
async def coach_chat(
    body: CoachRequest,
    user_id: str = Depends(get_current_user_id),
) -> StreamingResponse:
    habits = await habit_service.get_all_habits(user_id)
    system = build_system_prompt(habits)
    return StreamingResponse(
        stream_coach_response(system, [m.model_dump() for m in body.messages]),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
