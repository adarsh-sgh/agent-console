"""Run history behind one interface: SQLite by default, MongoDB when MONGO_URL is set.

The sample business tables the SQL tool queries always stay in SQLite (see db.py);
only run history moves.
"""
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Protocol

from . import db

RUNS_TABLE = """
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY, question TEXT NOT NULL, answer TEXT, status TEXT NOT NULL,
  steps TEXT NOT NULL, created_at TEXT NOT NULL
);
"""


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class RunStore(Protocol):
    """What the API layer needs from storage; both backends satisfy it."""

    def create_run(self, question: str) -> str: ...
    def finish_run(self, run_id: str, status: str, answer: str | None, steps: list[dict]) -> None: ...
    def list_runs(self, limit: int = 50) -> list[dict]: ...
    def get_run(self, run_id: str) -> dict | None: ...


class SqliteRunStore:
    """Default, keyless: the runs table lives next to the sample tables."""

    def __init__(self) -> None:
        with db.connect() as conn:
            conn.executescript(RUNS_TABLE)

    @staticmethod
    def _row(row: sqlite3.Row) -> dict:
        d = dict(row)
        d["steps"] = json.loads(d["steps"])
        return d

    def create_run(self, question: str) -> str:
        run_id = _new_id()
        with db.connect() as conn:
            conn.execute("INSERT INTO runs VALUES (?,?,?,?,?,?)",
                         (run_id, question, None, "running", "[]", _now()))
        return run_id

    def finish_run(self, run_id: str, status: str, answer: str | None, steps: list[dict]) -> None:
        with db.connect() as conn:
            conn.execute("UPDATE runs SET status=?, answer=?, steps=? WHERE id=?",
                         (status, answer, json.dumps(steps), run_id))

    def list_runs(self, limit: int = 50) -> list[dict]:
        with db.connect() as conn:
            rows = conn.execute("SELECT * FROM runs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
            return [self._row(r) for r in rows]

    def get_run(self, run_id: str) -> dict | None:
        with db.connect() as conn:
            row = conn.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
            return self._row(row) if row else None


class MongoRunStore:
    """One document per run; steps nest as an array instead of a JSON blob."""

    def __init__(self, url: str, db_name: str = "agent_console") -> None:
        from pymongo import MongoClient  # imported lazily: only needed when MONGO_URL is set

        self.runs = MongoClient(url, serverSelectionTimeoutMS=5000)[db_name]["runs"]
        self.runs.create_index("created_at")

    @staticmethod
    def _doc(doc: dict) -> dict:
        return {"id": doc["_id"], **{k: v for k, v in doc.items() if k != "_id"}}

    def create_run(self, question: str) -> str:
        run_id = _new_id()
        self.runs.insert_one({"_id": run_id, "question": question, "answer": None,
                              "status": "running", "steps": [], "created_at": _now()})
        return run_id

    def finish_run(self, run_id: str, status: str, answer: str | None, steps: list[dict]) -> None:
        self.runs.update_one({"_id": run_id}, {"$set": {"status": status, "answer": answer, "steps": steps}})

    def list_runs(self, limit: int = 50) -> list[dict]:
        cursor = self.runs.find(sort=[("created_at", -1)], limit=limit)
        return [self._doc(d) for d in cursor]

    def get_run(self, run_id: str) -> dict | None:
        doc = self.runs.find_one({"_id": run_id})
        return self._doc(doc) if doc else None


_store: RunStore | None = None
_key: str | None = None


def get_store() -> RunStore:
    """MONGO_URL picks MongoDB; otherwise SQLite. Cached until the env changes (tests swap paths)."""
    global _store, _key
    url = os.environ.get("MONGO_URL")
    name = os.environ.get("MONGO_DB", "agent_console")
    key = f"mongo:{url}/{name}" if url else f"sqlite:{db.db_path()}"
    if _store is None or _key != key:
        _store = MongoRunStore(url, name) if url else SqliteRunStore()
        _key = key
    return _store
