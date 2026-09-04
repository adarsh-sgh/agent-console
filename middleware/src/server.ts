import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp({
  agentUrl: process.env.AGENT_URL ?? "http://localhost:8000",
  internalToken: process.env.INTERNAL_TOKEN,
});
app.listen(port, () => console.log(`gateway listening on :${port} (GraphQL at /graphql)`));
