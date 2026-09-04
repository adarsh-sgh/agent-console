import { useEffect, useState } from "react";
import { Trace } from "./Trace";
import type { Run } from "./types";

const QUERY = `{ runs(limit: 50) { id question answer status createdAt steps { type content tool args id } } }`;

export async function fetchRuns(): Promise<Run[]> {
  const res = await fetch("/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY }),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data.runs;
}

export function HistoryPage() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns().then(setRuns).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!runs) return <p>Loading…</p>;
  if (runs.length === 0) return <p>No runs yet.</p>;

  return (
    <ul className="history">
      {runs.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)}>
            <span className={`status ${r.status}`}>{r.status}</span>
            <strong>{r.question}</strong>
            <time>{new Date(r.createdAt).toLocaleString()}</time>
          </button>
          {open === r.id && <Trace steps={r.steps} />}
        </li>
      ))}
    </ul>
  );
}
