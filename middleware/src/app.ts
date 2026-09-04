// Express gateway: proxies the SSE run stream to the agent and exposes run history over GraphQL.
import express from "express";
import { createYoga } from "graphql-yoga";
import { Readable } from "node:stream";
import { agentClient, type AgentConfig } from "./agentClient.js";
import { buildSchema } from "./schema.js";

export function createApp(cfg: AgentConfig) {
  const agent = agentClient(cfg);
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.post("/api/runs", async (req, res) => {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    if (!question) return res.status(400).json({ error: "question is required" });

    let upstream: Response;
    try {
      upstream = await agent.startRun(question);
    } catch (e) {
      return res.status(502).json({ error: `agent unreachable: ${(e as Error).message}` });
    }
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: `agent responded ${upstream.status}` });
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders();
    // Pipe SSE bytes straight through; the browser parses them.
    Readable.fromWeb(upstream.body as import("node:stream/web").ReadableStream).pipe(res);
  });

  const yoga = createYoga({ schema: buildSchema(agent), graphqlEndpoint: "/graphql" });
  app.use(yoga.graphqlEndpoint, yoga);
  return app;
}
