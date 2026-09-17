"""Storage contract: the same run lifecycle on both backends. Mongo is skipped unless MONGO_URL is set."""
import os

import pytest

from agent_console.store import MongoRunStore, SqliteRunStore


def make_sqlite():
    return SqliteRunStore()


def make_mongo():
    url = os.environ.get("MONGO_URL")
    if not url:
        pytest.skip("MONGO_URL unset; MongoDB store not exercised")
    s = MongoRunStore(url, os.environ.get("MONGO_DB", "agent_console_test"))
    s.runs.delete_many({})
    return s


@pytest.mark.parametrize("make", [make_sqlite, make_mongo], ids=["sqlite", "mongo"])
def test_run_lifecycle_round_trips(make):
    runs = make()

    run_id = runs.create_run("revenue?")
    started = runs.get_run(run_id)
    assert started["question"] == "revenue?" and started["status"] == "running" and started["steps"] == []

    steps = [{"type": "tool_call", "tool": "sql_query", "args": {"query": "SELECT 1"}},
             {"type": "final", "content": "42"}]
    runs.finish_run(run_id, "done", "42", steps)
    done = runs.get_run(run_id)
    assert done["status"] == "done" and done["answer"] == "42"
    assert done["steps"] == steps  # nested dicts survive the round trip on both backends

    newer = runs.create_run("second")
    listed = runs.list_runs(10)
    assert [r["id"] for r in listed][:2] == [newer, run_id]  # newest first
    assert set(listed[0]) >= {"id", "question", "answer", "status", "steps", "created_at"}
    assert runs.get_run("nope") is None
