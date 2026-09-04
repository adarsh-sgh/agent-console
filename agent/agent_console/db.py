"""SQLite: sample business tables the SQL tool queries, plus the run-history table."""
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL, plan TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount_usd REAL NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id),
  subject TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY, question TEXT NOT NULL, answer TEXT, status TEXT NOT NULL,
  steps TEXT NOT NULL, created_at TEXT NOT NULL
);
"""

CUSTOMERS = [
    (1, "Acme Corp", "US", "enterprise"), (2, "Globex", "DE", "pro"),
    (3, "Initech", "US", "pro"), (4, "Umbrella", "JP", "enterprise"), (5, "Hooli", "IN", "free"),
]
ORDERS = [
    (1, 1, 1200.0, "paid", "2026-07-02"), (2, 1, 800.0, "paid", "2026-08-11"),
    (3, 2, 450.0, "refunded", "2026-07-19"), (4, 3, 300.0, "paid", "2026-08-01"),
    (5, 4, 2500.0, "paid", "2026-08-20"), (6, 4, 990.0, "pending", "2026-09-01"),
    (7, 5, 0.0, "paid", "2026-08-28"),
]
TICKETS = [
    ("T-101", 1, "SSO login loops back to sign-in page", "high", "open"),
    ("T-102", 2, "Invoice PDF shows wrong VAT rate", "medium", "open"),
    ("T-103", 4, "Export job stuck at 99%", "high", "in_progress"),
    ("T-104", 3, "Feature request: dark mode", "low", "closed"),
]


def db_path() -> str:
    return os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "agent_console.db"))


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
        if conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0] == 0:
            conn.executemany("INSERT INTO customers VALUES (?,?,?,?)", CUSTOMERS)
            conn.executemany("INSERT INTO orders VALUES (?,?,?,?,?)", ORDERS)
            conn.executemany("INSERT INTO tickets VALUES (?,?,?,?,?)", TICKETS)


def run_select(sql: str, limit: int = 20) -> list[dict]:
    """Read-only query; the SQL tool relies on this guard."""
    if not sql.strip().lower().startswith("select"):
        raise ValueError("only SELECT statements are allowed")
    with connect() as conn:
        rows = conn.execute(sql).fetchmany(limit)
        return [dict(r) for r in rows]


def get_ticket(ticket_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT t.*, c.name AS customer FROM tickets t JOIN customers c ON c.id=t.customer_id WHERE t.id=?",
            (ticket_id,),
        ).fetchone()
        return dict(row) if row else None


def create_run(question: str) -> str:
    run_id = uuid.uuid4().hex[:12]
    with connect() as conn:
        conn.execute(
            "INSERT INTO runs VALUES (?,?,?,?,?,?)",
            (run_id, question, None, "running", "[]", datetime.now(timezone.utc).isoformat()),
        )
    return run_id


def finish_run(run_id: str, status: str, answer: str | None, steps: list[dict]) -> None:
    with connect() as conn:
        conn.execute("UPDATE runs SET status=?, answer=?, steps=? WHERE id=?",
                     (status, answer, json.dumps(steps), run_id))


def _row_to_run(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["steps"] = json.loads(d["steps"])
    return d


def list_runs(limit: int = 50) -> list[dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM runs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [_row_to_run(r) for r in rows]


def get_run(run_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        return _row_to_run(row) if row else None
