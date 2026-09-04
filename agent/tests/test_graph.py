"""End-to-end over the compiled LangGraph with the fake LLM: question -> events."""
import pytest

from agent_console.graph import run_agent


async def collect(question):
    return [ev async for ev in run_agent(question)]


async def test_sql_question_runs_reason_act_observe_answer():
    events = await collect("Which customers generated the most revenue?")
    assert [e["type"] for e in events] == ["thought", "tool_call", "observation", "final"]
    assert events[1]["tool"] == "sql_query" and "SELECT" in events[1]["args"]["query"]
    assert '"Umbrella"' in events[2]["content"]
    assert "Umbrella, revenue=2500" in events[3]["content"]  # paid orders only; the pending one is excluded


async def test_ticket_question_hits_rest_tool_over_asgi():
    events = await collect("What's the status of ticket T-103?")
    assert events[1]["tool"] == "lookup_ticket" and events[1]["args"] == {"ticket_id": "T-103"}
    assert events[-1]["content"] == "Ticket T-103 (high priority, in_progress) for Umbrella: Export job stuck at 99%"


async def test_calculator_and_tool_errors_are_observations_not_crashes():
    ok = await collect("what is 1200 * 0.18 + 40")
    assert ok[1]["tool"] == "calculator" and ok[-1]["content"].startswith("Result: 256.0")

    bad = await collect("Show ticket T-999")
    assert bad[2]["content"].startswith("error: ticket T-999 returned 404")
    assert bad[-1]["type"] == "final" and "failed" in bad[-1]["content"]


async def test_no_tool_needed_returns_final_only():
    events = await collect("hello there")
    assert [e["type"] for e in events] == ["final"]
