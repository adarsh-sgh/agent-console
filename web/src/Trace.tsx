import { stepBody, stepLabel, visibleSteps, type Step, type StepType } from "@shared";

const TONE: Partial<Record<StepType, string>> = {
  thought: "italic text-dim",
  final: "whitespace-pre-wrap text-ok",
  error: "text-error",
};

export function Trace({ steps }: { steps: Step[] }) {
  const visible = visibleSteps(steps);
  if (visible.length === 0) return null;
  return (
    <ol className="m-0 list-none border-l-2 border-line p-0" aria-label="reasoning trace">
      {visible.map((s, i) => (
        <li key={i} className="py-2 pl-4">
          <span className="block text-[0.7rem] tracking-wider text-dim uppercase">{stepLabel(s.type)}</span>
          {s.type === "tool_call" && <code className="text-accent">{stepBody(s)}</code>}
          {s.type === "observation" && (
            <pre className="my-1 max-h-60 overflow-auto rounded bg-card p-2 text-xs">{s.content}</pre>
          )}
          {s.type in TONE && <p className={`my-1 ${TONE[s.type]}`}>{s.content}</p>}
        </li>
      ))}
    </ol>
  );
}
