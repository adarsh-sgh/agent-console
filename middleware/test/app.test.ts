// Full request flow through the gateway against a stub of the Python agent.
import http from "node:http";
import { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const run = {
  id: "abc123", question: "revenue?", answer: "Query returned 2 rows", status: "done",
  created_at: "2026-09-05T10:00:00Z",
  steps: [
    { type: "thought", content: "use sql" },
    { type: "tool_call", id: "call_1", tool: "sql_query", args: { query: "SELECT 1" } },
    { type: "observation", id: "call_1", tool: "sql_query", content: "[{\"1\":1}]" },
    { type: "final", content: "Query returned 2 rows" },
  ],
};

let seenHeaders: http.IncomingHttpHeaders = {};
const stub = http.createServer((req, res) => {
  seenHeaders = req.headers;
  if (req.method === "POST" && req.url === "/runs") {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write('event: run_started\ndata: {"type":"run_started","run_id":"abc123"}\n\n');
    setTimeout(() => res.end('event: final\ndata: {"type":"final","content":"42"}\n\n'), 20);
  } else if (req.url?.startsWith("/runs/missing")) {
    res.writeHead(404).end("{}");
  } else if (req.url?.startsWith("/runs")) {
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify([run]));
  } else res.writeHead(500).end();
});

let app: ReturnType<typeof createApp>;
beforeAll(async () => {
  await new Promise<void>((r) => stub.listen(0, r));
  const { port } = stub.address() as AddressInfo;
  app = createApp({ agentUrl: `http://127.0.0.1:${port}`, internalToken: "t0k" });
});
afterAll(() => stub.close());

describe("gateway", () => {
  it("proxies the SSE stream and forwards the internal token", async () => {
    const res = await request(app).post("/api/runs").send({ question: "what is 6*7" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(res.text).toContain('data: {"type":"run_started"');
    expect(res.text).toContain('"content":"42"');
    expect(seenHeaders["x-internal-token"]).toBe("t0k");

    expect((await request(app).post("/api/runs").send({})).status).toBe(400);
  });

  it("serves run history over GraphQL", async () => {
    const query = `{ runs(limit: 5) { id question answer status createdAt steps { type tool args } }
                    run(id: "missing") { id } }`;
    const res = await request(app).post("/graphql").send({ query });
    expect(res.status).toBe(200);
    const { runs, run: missing } = res.body.data;
    expect(missing).toBeNull();
    expect(runs[0]).toMatchObject({ id: "abc123", status: "done", createdAt: run.created_at });
    expect(runs[0].steps[1]).toEqual({ type: "tool_call", tool: "sql_query", args: '{"query":"SELECT 1"}' });
  });
});
