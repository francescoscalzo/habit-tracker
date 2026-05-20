import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from src.routes import habits, coach  # noqa: E402 — must be after load_dotenv
from src.services import redis_client  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await redis_client.redis.aclose()


app = FastAPI(title="Habit Tracker API", version="0.2.0", lifespan=lifespan)

cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(habits.router)
app.include_router(coach.router)
