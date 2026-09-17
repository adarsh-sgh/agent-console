import { useEffect, useState } from "react";
import { fetchRuns, type Run } from "@shared";
import { Trace } from "./Trace";

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
