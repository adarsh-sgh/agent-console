import type { Step } from "./types";

const fmtArgs = (args: Step["args"]) => (typeof args === "string" ? args : JSON.stringify(args ?? {}));

export function Trace({ steps }: { steps: Step[] }) {
  const visible = steps.filter((s) => !["run_started", "run_finished"].includes(s.type));
  if (visible.length === 0) return null;
  return (
    <ol className="trace" aria-label="reasoning trace">
      {visible.map((s, i) => (
        <li key={i} className={`step ${s.type}`}>
          <span className="label">{s.type.replace("_", " ")}</span>
          {s.type === "tool_call" && (
            <code>
              {s.tool}({fmtArgs(s.args)})
            </code>
          )}
          {s.type === "observation" && <pre>{s.content}</pre>}
          {(s.type === "thought" || s.type === "final" || s.type === "error") && <p>{s.content}</p>}
        </li>
      ))}
    </ol>
  );
}
