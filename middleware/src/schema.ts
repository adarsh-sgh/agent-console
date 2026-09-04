import { createSchema } from "graphql-yoga";
import type { AgentClient, Run, Step } from "./agentClient.js";

export const typeDefs = /* GraphQL */ `
  type Step {
    type: String!
    content: String
    tool: String
    args: String
    id: String
  }
  type Run {
    id: ID!
    question: String!
    answer: String
    status: String!
    createdAt: String!
    steps: [Step!]!
  }
  type Query {
    runs(limit: Int = 50): [Run!]!
    run(id: ID!): Run
  }
`;

const toStep = (s: Step) => ({ ...s, args: s.args ? JSON.stringify(s.args) : null });
const toRun = (r: Run) => ({ ...r, createdAt: r.created_at, steps: r.steps.map(toStep) });

export function buildSchema(agent: AgentClient) {
  return createSchema({
    typeDefs,
    resolvers: {
      Query: {
        runs: async (_: unknown, { limit }: { limit: number }) => (await agent.listRuns(limit)).map(toRun),
        run: async (_: unknown, { id }: { id: string }) => {
          const r = await agent.getRun(id);
          return r && toRun(r);
        },
      },
    },
  });
}
