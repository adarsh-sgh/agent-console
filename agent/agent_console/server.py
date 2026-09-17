"""FastAPI: streams agent runs over SSE, persists them, and serves the tickets REST API."""
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from . import db, store
from .graph import run_agent, to_sse


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    store.get_store()
    yield


app = FastAPI(title="agent-console", lifespan=lifespan)


def require_token(x_internal_token: str | None = Header(default=None)) -> None:
    expected = os.environ.get("INTERNAL_TOKEN")
    if expected and x_internal_token != expected:
        raise HTTPException(401, "missing or invalid X-Internal-Token")


def llm_provider() -> str:
    return os.environ.get("LLM_PROVIDER") or ("anthropic" if os.environ.get("ANTHROPIC_API_KEY") else "fake")


class RunRequest(BaseModel):
    question: str


@app.post("/runs", dependencies=[Depends(require_token)])
async def start_run(body: RunRequest) -> StreamingResponse:
    runs = store.get_store()
    run_id = runs.create_run(body.question)

    async def events():
        steps, answer, status = [], None, "done"
        yield to_sse({"type": "run_started", "run_id": run_id, "llm": llm_provider()})
        try:
            async for ev in run_agent(body.question, run_id=run_id):
                steps.append(ev)
                if ev["type"] == "final":
                    answer = ev["content"]
                yield to_sse(ev)
        except Exception as e:  # keep the stream well-formed; the client shows the error
            status = "error"
            yield to_sse({"type": "error", "content": str(e)})
        finally:
            runs.finish_run(run_id, status, answer, steps)
        yield to_sse({"type": "run_finished", "run_id": run_id, "status": status})

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/runs", dependencies=[Depends(require_token)])
def list_runs(limit: int = 50) -> list[dict]:
    return store.get_store().list_runs(limit)


@app.get("/runs/{run_id}", dependencies=[Depends(require_token)])
def get_run(run_id: str) -> dict:
    run = store.get_store().get_run(run_id)
    if not run:
        raise HTTPException(404, "run not found")
    return run


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str) -> dict:
    ticket = db.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(404, "ticket not found")
    return ticket


@app.get("/health")
def health() -> dict:
    return {"ok": True, "llm": llm_provider()}
