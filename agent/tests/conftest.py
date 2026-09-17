import httpx
import pytest

from agent_console import db, store, tools
from agent_console.server import app


@pytest.fixture(autouse=True)
def fresh_db(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.delenv("MONGO_URL", raising=False)  # API tests always run on SQLite
    monkeypatch.setattr(store, "_store", None)
    monkeypatch.setenv("LLM_PROVIDER", "fake")
    monkeypatch.setenv("TICKETS_API_URL", "http://agent")
    db.init_db()
    # Route the ticket tool and the fetch tool at the in-process ASGI app: no sockets in tests.
    monkeypatch.setattr(tools, "http_transport", httpx.ASGITransport(app=app))


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://agent") as c:
        yield c
