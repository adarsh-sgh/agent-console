# agent-console

A small full-stack LLM agent you can watch think. A LangGraph ReAct agent (reason → tool call → observe, looped) answers questions over a sample business DB, a tickets REST API, a calculator and HTTP fetch. Every step streams to the viewer over SSE as it happens; finished runs are persisted and browsable through a GraphQL history page. Two viewers render the same trace — a React web app and an Expo React Native app — from one shared TypeScript package. Runs with Claude (`claude-sonnet-5` via `langchain-anthropic`) when `ANTHROPIC_API_KEY` is set, and with a deterministic scripted LLM otherwise, so the demo and the tests need no key.

```
 web viewer (React/Vite/Tailwind :5173)   mobile viewer (Expo / React Native)
   └───────────────┬────────────────────────┘
                   │  shared/: step + run types · SSE parser · useRun hook · trace formatting · palette
                   │  POST /api/runs (SSE)  ·  POST /graphql
                   ▼
 Express gateway (:4000) ── graphql-yoga schema: runs / run(id)
   │  + X-Internal-Token
   ▼
 FastAPI (:8000) ── POST /runs → SSE   GET /runs   GET /tickets/{id}
   │
   ▼
 LangGraph:  reason ──tool_calls?──▶ act ──▶ reason … ──▶ END
   LLM: ChatAnthropic | FakeChatModel     tools: sql_query · calculator · fetch_url · lookup_ticket
   tracing: Langfuse callback (no-op unless keys set)
   storage: SQLite (sample tables) · run history: SQLite by default, MongoDB when MONGO_URL is set
```

## Run

```
make setup        # python venv + npm install across agent/shared/middleware/web/mobile (Python >= 3.10, Node >= 20)
make dev          # agent :8000, gateway :4000, web :5173
make test         # pytest e2e over the graph + API, supertest on the gateway, Vitest/RTL on the web UI, jest on mobile
```

Open http://localhost:5173. Copy `.env.example` to `.env` and export it to use real Claude or Langfuse.

### Mobile

```
make mobile                                            # Expo dev server; scan the QR code with Expo Go
EXPO_PUBLIC_GATEWAY_URL=http://192.168.1.x:4000 make mobile   # a phone can't reach the host's localhost
make bundle-mobile                                     # Metro bundle check, no simulator needed
```

The app has two screens: run history from the gateway's GraphQL schema, and a trace that streams
step by step when you pick a run or type a new question. React Native has no streaming `fetch` body,
so it reads the same SSE frames off `XMLHttpRequest` progress events — the parser, the `useRun` hook
and the trace formatting come from `shared/`. It is verified here by `npx tsc --noEmit`,
the jest test and a full `npx expo export` bundle; it has not been run on a simulator or device.

### MongoDB run history

Run history goes to SQLite unless `MONGO_URL` is set:

```
docker compose up -d mongo
MONGO_URL=mongodb://localhost:27017 make agent
```

`make test-agent` runs the store contract against SQLite and skips the MongoDB case
unless `MONGO_URL` points at a server. CI starts a `mongo:8` service and sets `MONGO_URL`,
so both backends are exercised on every push.

## Design decisions

- **Hand-written graph, not `create_react_agent`.** Two nodes (`reason`, `act`) and one conditional edge make the loop explicit, and `stream_mode="updates"` gives one event per node so the UI can show thought / tool call / observation / final without parsing model output.
- **LLM is an injected `BaseChatModel`.** `FakeChatModel` keyword-routes to a tool and answers from the observation. The same graph, FastAPI stream and tests run against either model; swapping providers is one env var.
- **SSE over a POST, hand-rolled on both ends.** The browser can't POST with `EventSource`, so the UI reads `fetch` body chunks and splits on blank lines; FastAPI writes `event:`/`data:` frames from a generator. The gateway just pipes bytes.
- **`shared/` is source, not a build artifact.** It holds everything about a run that isn't a rendered element, and each app aliases `@shared` to its `src/` (Vite `resolve.alias`, Metro `watchFolders`). No build step to keep in sync, and `react` always resolves from the app, so there is one copy of it. The split falls where the platforms genuinely differ: transports and primitives are per-app, the data model and formatting are not.
- **One palette, two styling systems.** `shared/src/theme.ts` holds the colours; the web app feeds them to Tailwind v4 through `@config` (`bg-card`, `text-accent`, `border-line` …) and the Expo app builds its `StyleSheet` from the same object. Web styling is utility classes in the components plus one `@apply`'d `.btn`; step types map to a tone class (`thought` dim italic, `final` green, `error` red) instead of per-type CSS selectors.
- **Gateway owns the trust boundary.** Express adds `X-Internal-Token` so the agent service is never called directly by the browser; the GraphQL layer is read-only over history and is the place a schema for multiple backends would grow.
- **Storage is one `RunStore` interface, two backends.** SQLite keeps the demo keyless and dependency-free; `MONGO_URL` swaps in MongoDB, where a run is one document and its steps nest as an array instead of a JSON blob. The sample business tables the SQL tool queries stay in SQLite either way — they are the agent's subject matter, not its state.
- **Tool errors are observations.** A 404 ticket or a bad SQL statement comes back as `error: …` text so the model can recover, instead of aborting the run.

## Next

- Human-in-the-loop: pause before `fetch_url` and let the user approve from the trace.
- LangGraph checkpointer (SQLite) so a run can be resumed and forked from any step.
- Token/latency per step in the trace, pulled from the Langfuse trace.
