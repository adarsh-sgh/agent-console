import type { Run } from "./types";

export const RUNS_QUERY =
  `{ runs(limit: 50) { id question answer status createdAt steps { type content tool args id } } }`;

/** Run history from the Express gateway's graphql-yoga schema. */
export async function fetchRuns(endpoint = "/graphql"): Promise<Run[]> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: RUNS_QUERY }),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data.runs;
}
