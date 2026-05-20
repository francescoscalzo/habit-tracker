import fakeredis
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch

from src.auth.dependencies import get_current_user_id
from src.main import app

TEST_USER_ID = "test-user-id"

app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID


@pytest.fixture(autouse=True)
async def fake_redis():
    fake = fakeredis.FakeAsyncRedis(decode_responses=True)
    with patch("src.services.redis_client.redis", fake):
        yield fake


@pytest.fixture
async def client(fake_redis):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
