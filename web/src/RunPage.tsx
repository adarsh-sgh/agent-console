import { FormEvent, useState } from "react";
import { fetchStream, useRun } from "@shared";
import { Trace } from "./Trace";

const EXAMPLES = [
  "Which customers generated the most revenue?",
  "What's the status of ticket T-103?",
  "What is 1200 * 0.18 + 40?",
];

const stream = fetchStream("/api/runs");

export function RunPage() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const { steps, running, error, ask } = useRun(stream);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim()) void ask(question.trim());
  };

  return (
    <section>
      <form onSubmit={submit} className="flex gap-2">
        <input
          aria-label="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={running}
          className="flex-1 rounded border border-line bg-card p-2.5 text-text focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={running} className="btn">{running ? "Running…" : "Run"}</button>
      </form>
      <div className="mt-2.5 mb-5 flex flex-wrap gap-1.5">
        {EXAMPLES.map((q) => (
          <button key={q} type="button" onClick={() => setQuestion(q)} disabled={running} className="btn text-xs">{q}</button>
        ))}
      </div>
      {error && <p role="alert" className="text-error">{error}</p>}
      {steps[0]?.llm && <p className="mb-1.5 text-xs text-dim">model: {steps[0].llm}</p>}
      <Trace steps={steps} />
    </section>
  );
}
