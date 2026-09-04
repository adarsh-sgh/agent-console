"""The four tools the agent can call. Each returns a plain string observation."""
import ast
import json
import operator
import os

import httpx
from langchain_core.tools import tool

from . import db

# Tests swap this for an ASGI / mock transport so no real network is needed.
http_transport: httpx.AsyncBaseTransport | None = None


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=http_transport, timeout=10, follow_redirects=True)


@tool
def sql_query(query: str) -> str:
    """Run a read-only SELECT against the business DB. Tables: customers(id,name,country,plan),
    orders(id,customer_id,amount_usd,status,created_at), tickets(id,customer_id,subject,priority,status)."""
    try:
        return json.dumps(db.run_select(query), default=str)
    except Exception as e:  # surface DB errors to the model as an observation, not a crash
        return f"error: {e}"


_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
        ast.Div: operator.truediv, ast.Pow: operator.pow, ast.Mod: operator.mod, ast.USub: operator.neg}


def _eval(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval(node.left), _eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval(node.operand))
    raise ValueError(f"unsupported expression: {ast.dump(node)}")


@tool
def calculator(expression: str) -> str:
    """Evaluate an arithmetic expression, e.g. '1200 * 0.18 + 40'."""
    try:
        return str(_eval(ast.parse(expression, mode="eval").body))
    except Exception as e:
        return f"error: {e}"


@tool
async def fetch_url(url: str) -> str:
    """HTTP GET a URL and return the first 2000 characters of the body."""
    try:
        async with _client() as client:
            r = await client.get(url)
            return f"status={r.status_code}\n{r.text[:2000]}"
    except httpx.HTTPError as e:
        return f"error: {e}"


@tool
async def lookup_ticket(ticket_id: str) -> str:
    """Fetch a support ticket (e.g. 'T-101') from the internal tickets REST API."""
    base = os.environ.get("TICKETS_API_URL", "http://localhost:8000")
    try:
        async with _client() as client:
            r = await client.get(f"{base}/tickets/{ticket_id}")
            return r.text if r.status_code == 200 else f"error: ticket {ticket_id} returned {r.status_code}"
    except httpx.HTTPError as e:
        return f"error: {e}"


TOOLS = [sql_query, calculator, fetch_url, lookup_ticket]
