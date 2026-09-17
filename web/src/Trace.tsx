import { stepBody, stepLabel, visibleSteps, type Step } from "@shared";

export function Trace({ steps }: { steps: Step[] }) {
  const visible = visibleSteps(steps);
  if (visible.length === 0) return null;
  return (
    <ol className="trace" aria-label="reasoning trace">
      {visible.map((s, i) => (
        <li key={i} className={`step ${s.type}`}>
          <span className="label">{stepLabel(s.type)}</span>
          {s.type === "tool_call" && <code>{stepBody(s)}</code>}
          {s.type === "observation" && <pre>{s.content}</pre>}
          {(s.type === "thought" || s.type === "final" || s.type === "error") && <p>{s.content}</p>}
        </li>
      ))}
    </ol>
  );
}
