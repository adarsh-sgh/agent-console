"""Deterministic stand-in for Claude so tests and the demo run with no API key.

Picks a tool from keywords in the question, then answers from the observation."""
import json
import re
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult


def _plan(question: str) -> tuple[str, dict] | None:
    q = question.lower()
    if m := re.search(r"\b(t-\d+)\b", q):
        return "lookup_ticket", {"ticket_id": m.group(1).upper()}
    if m := re.search(r"https?://\S+", question):
        return "fetch_url", {"url": m.group(0).rstrip(".,)")}
    if "revenue" in q or "orders" in q:
        return "sql_query", {"query": "SELECT c.name, SUM(o.amount_usd) AS revenue FROM orders o "
                                      "JOIN customers c ON c.id=o.customer_id WHERE o.status='paid' "
                                      "GROUP BY c.name ORDER BY revenue DESC"}
    if "customer" in q:
        return "sql_query", {"query": "SELECT name, country, plan FROM customers"}
    if re.search(r"\d\s*[-+*/%]\s*\d", q):
        return "calculator", {"expression": re.sub(r"[^\d\s.+\-*/%()]", "", question).strip()}
    return None


class FakeChatModel(BaseChatModel):
    """One tool call max, then a final answer that quotes the observation."""

    @property
    def _llm_type(self) -> str:
        return "fake-react"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "FakeChatModel":
        return self

    def _generate(self, messages: list[BaseMessage], stop=None, run_manager=None, **kwargs) -> ChatResult:
        question = next(m.content for m in messages if isinstance(m, HumanMessage))
        last = messages[-1]
        if isinstance(last, ToolMessage):
            msg = AIMessage(content=self._answer(str(last.content), question))
        elif plan := _plan(str(question)):
            name, args = plan
            msg = AIMessage(content=f"I should use {name} to answer this.",
                            tool_calls=[{"name": name, "args": args, "id": f"call_{name}"}])
        else:
            msg = AIMessage(content="I can answer that without tools: I'm a scripted demo model, "
                                    "so I only know how to route questions about tickets, revenue, "
                                    "customers, URLs and arithmetic.")
        return ChatResult(generations=[ChatGeneration(message=msg)])

    @staticmethod
    def _answer(observation: str, question: str) -> str:
        if observation.startswith("error:"):
            return f"The tool failed: {observation}"
        try:
            data = json.loads(observation)
        except ValueError:
            return f"Here is what I found:\n{observation[:500]}"
        if isinstance(data, list):
            lines = [", ".join(f"{k}={v}" for k, v in row.items()) for row in data]
            return f"Query returned {len(data)} rows:\n" + "\n".join(lines)
        if isinstance(data, dict) and "subject" in data:
            return (f"Ticket {data['id']} ({data['priority']} priority, {data['status']}) for "
                    f"{data.get('customer')}: {data['subject']}")
        return f"Result: {observation}"
