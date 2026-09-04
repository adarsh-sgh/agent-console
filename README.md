# agent-console

A small full-stack LLM agent you can watch think. A LangGraph ReAct agent (reason → tool call → observe, looped) answers questions over a sample business DB, a tickets REST API, a calculator and HTTP fetch. Every step streams to the browser over SSE as it happens; finished runs are persisted and browsable through a GraphQL history page. Runs with Claude (`claude-sonnet-5` via `langchain-anthropic`) when `ANTHROPIC_API_KEY` is set, and with a deterministic scripted LLM otherwise, so the demo and the tests need no key.

```
 browser (React/Vite :5173)
   │  POST /api/runs (SSE)          POST /graphql
   ▼                                   ▼
 Express gateway (:4000) ── graphql-yoga schema: runs / run(id)
   │  + X-Internal-Token
   ▼
 FastAPI (:8000) ── POST /runs → SSE   GET /runs   GET /tickets/{id}
   │
   ▼
 LangGraph:  reason ──tool_calls?──▶ act ──▶ reason … ──▶ END
   LLM: ChatAnthropic | FakeChatModel     tools: sql_query · calculator · fetch_url · lookup_ticket
   tracing: Langfuse callback (no-op unless keys set)     storage: SQLite (sample tables + runs)
```

## Run

```
make setup        # python venv + npm install (Python >= 3.10, Node >= 20)
make dev          # agent :8000, gateway :4000, web :5173
make test         # pytest e2e over the graph + API, supertest on the gateway, Vitest/RTL on the UI
```

Open http://localhost:5173. Copy `.env.example` to `.env` and export it to use real Claude or Langfuse.

## Design decisions

- **Hand-written graph, not `create_react_agent`.** Two nodes (`reason`, `act`) and one conditional edge make the loop explicit, and `stream_mode="updates"` gives one event per node so the UI can show thought / tool call / observation / final without parsing model output.
- **LLM is an injected `BaseChatModel`.** `FakeChatModel` keyword-routes to a tool and answers from the observation. The same graph, FastAPI stream and tests run against either model; swapping providers is one env var.
- **SSE over a POST, hand-rolled on both ends.** The browser can't POST with `EventSource`, so the UI reads `fetch` body chunks and splits on blank lines; FastAPI writes `event:`/`data:` frames from a generator. The gateway just pipes bytes.
- **Gateway owns the trust boundary.** Express adds `X-Internal-Token` so the agent service is never called directly by the browser; the GraphQL layer is read-only over history and is the place a schema for multiple backends would grow.
- **Tool errors are observations.** A 404 ticket or a bad SQL statement comes back as `error: …` text so the model can recover, instead of aborting the run.

## Next

- Human-in-the-loop: pause before `fetch_url` and let the user approve from the trace.
- LangGraph checkpointer (SQLite) so a run can be resumed and forked from any step.
- Token/latency per step in the trace, pulled from the Langfuse trace.
