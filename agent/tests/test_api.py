"""FastAPI over ASGI: SSE stream shape, persistence into run history, and auth."""
import json


def parse_sse(text: str) -> list[dict]:
    return [json.loads(line[6:]) for line in text.splitlines() if line.startswith("data: ")]


async def test_run_streams_sse_and_is_persisted(client):
    async with client.stream("POST", "/runs", json={"question": "List all customers"}) as r:
        assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
        events = parse_sse((await r.aread()).decode())

    types = [e["type"] for e in events]
    assert types == ["run_started", "thought", "tool_call", "observation", "final", "run_finished"]
    run_id = events[0]["run_id"]

    runs = (await client.get("/runs")).json()
    assert runs[0]["id"] == run_id and runs[0]["status"] == "done"
    assert runs[0]["answer"].startswith("Query returned 5 rows")
    assert [s["type"] for s in runs[0]["steps"]] == types[1:-1]

    one = await client.get(f"/runs/{run_id}")
    assert one.json()["question"] == "List all customers"
    assert (await client.get("/runs/nope")).status_code == 404


async def test_internal_token_required_when_configured(client, monkeypatch):
    monkeypatch.setenv("INTERNAL_TOKEN", "s3cret")
    assert (await client.get("/runs")).status_code == 401
    assert (await client.get("/runs", headers={"X-Internal-Token": "s3cret"})).status_code == 200
    # Tickets API stays open: the agent's own tool calls it without the gateway token.
    assert (await client.get("/tickets/T-101")).json()["customer"] == "Acme Corp"
