"""LangGraph ReAct loop: reason (LLM) -> act (tools) -> observe -> reason ... until no tool call."""
import json
import os
from typing import AsyncIterator, Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, START, MessagesState, StateGraph

from . import tracing
from .llm import build_llm
from .tools import TOOLS

MAX_STEPS = int(os.environ.get("MAX_STEPS", "6"))
TOOLS_BY_NAME = {t.name: t for t in TOOLS}

SYSTEM_PROMPT = (
    "You are an operations assistant with tools over a small business database, a tickets API, "
    "a calculator and HTTP fetch. Think briefly about which tool answers the question, call it, "
    "then answer from the observation. Cite concrete numbers. Stop calling tools once you can answer."
)


class AgentState(MessagesState):
    steps: int


def build_graph(llm: BaseChatModel | None = None):
    model = (llm or build_llm()).bind_tools(TOOLS)

    async def reason(state: AgentState) -> dict:
        reply = await model.ainvoke([SystemMessage(SYSTEM_PROMPT), *state["messages"]])
        return {"messages": [reply], "steps": state.get("steps", 0) + 1}

    async def act(state: AgentState) -> dict:
        last: AIMessage = state["messages"][-1]
        results = []
        for call in last.tool_calls:
            tool = TOOLS_BY_NAME.get(call["name"])
            out = await tool.ainvoke(call["args"]) if tool else f"error: unknown tool {call['name']}"
            results.append(ToolMessage(content=str(out), tool_call_id=call["id"], name=call["name"]))
        return {"messages": results}

    def route(state: AgentState) -> Literal["act", "__end__"]:
        last = state["messages"][-1]
        if isinstance(last, AIMessage) and last.tool_calls and state["steps"] < MAX_STEPS:
            return "act"
        return END

    g = StateGraph(AgentState)
    g.add_node("reason", reason)
    g.add_node("act", act)
    g.add_edge(START, "reason")
    g.add_conditional_edges("reason", route)
    g.add_edge("act", "reason")
    return g.compile()


def _text(content) -> str:
    # Anthropic returns a list of content blocks; the fake model returns a str.
    if isinstance(content, str):
        return content
    return "".join(b.get("text", "") for b in content if isinstance(b, dict))


async def run_agent(question: str, llm: BaseChatModel | None = None,
                    run_id: str | None = None) -> AsyncIterator[dict]:
    """Yield one event per reasoning step, tool call, observation and the final answer."""
    graph = build_graph(llm)
    config = {"callbacks": tracing.callbacks(), "run_name": "agent-console",
              "metadata": {"langfuse_session_id": run_id} if run_id else {}}
    stream = graph.astream({"messages": [HumanMessage(question)], "steps": 0},
                           config=config, stream_mode="updates")
    try:
        async for update in stream:
            for node, delta in update.items():
                for msg in delta["messages"]:
                    if isinstance(msg, AIMessage):
                        text = _text(msg.content)
                        if msg.tool_calls:
                            if text:
                                yield {"type": "thought", "content": text}
                            for call in msg.tool_calls:
                                yield {"type": "tool_call", "id": call["id"], "tool": call["name"],
                                       "args": call["args"]}
                        else:
                            yield {"type": "final", "content": text}
                    elif isinstance(msg, ToolMessage):
                        yield {"type": "observation", "id": msg.tool_call_id, "tool": msg.name,
                               "content": str(msg.content)}
    finally:
        tracing.flush()


def to_sse(event: dict) -> str:
    return f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"
