import { useEffect, useState } from "react";
import { fetchRuns, type Run } from "@shared";
import { Trace } from "./Trace";

const STATUS: Record<string, string> = { done: "bg-ok/25 text-ok", error: "bg-error/25 text-error" };

export function HistoryPage() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns().then(setRuns).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert" className="text-error">{error}</p>;
  if (!runs) return <p>Loading…</p>;
  if (runs.length === 0) return <p>No runs yet.</p>;

  return (
    <ul className="list-none divide-y divide-line p-0">
      {runs.map((r) => (
        <li key={r.id} className="py-1.5">
          <button
            type="button"
            aria-expanded={open === r.id}
            onClick={() => setOpen(open === r.id ? null : r.id)}
            className="flex w-full cursor-pointer items-baseline gap-3 text-left"
          >
            <span className={`rounded px-1.5 py-0.5 text-[0.7rem] ${STATUS[r.status] ?? "bg-line"}`}>{r.status}</span>
            <strong>{r.question}</strong>
            <time className="ml-auto text-xs text-dim">{new Date(r.createdAt).toLocaleString()}</time>
          </button>
          {open === r.id && <Trace steps={r.steps} />}
        </li>
      ))}
    </ul>
  );
}
