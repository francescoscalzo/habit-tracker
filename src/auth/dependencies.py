import os
from functools import lru_cache

from fastapi import Header, HTTPException, status
from supabase import Client, create_client

_DEV_USER = "dev-user"


@lru_cache(maxsize=1)
def _supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def get_current_user_id(authorization: str = Header()) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    token = authorization[7:]

    if os.getenv("DEV_MODE") == "true" and token == "dev":
        return _DEV_USER

    try:
        resp = _supabase().auth.get_user(token)
        return resp.user.id
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
