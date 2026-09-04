import { FormEvent, useState } from "react";
import { Trace } from "./Trace";
import { useRun } from "./useRun";

const EXAMPLES = [
  "Which customers generated the most revenue?",
  "What's the status of ticket T-103?",
  "What is 1200 * 0.18 + 40?",
];

export function RunPage() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const { steps, running, error, ask } = useRun();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim()) void ask(question.trim());
  };

  return (
    <section>
      <form onSubmit={submit} className="ask">
        <input
          aria-label="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={running}
        />
        <button type="submit" disabled={running}>{running ? "Running…" : "Run"}</button>
      </form>
      <div className="examples">
        {EXAMPLES.map((q) => (
          <button key={q} type="button" onClick={() => setQuestion(q)} disabled={running}>{q}</button>
        ))}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {steps[0]?.llm && <p className="meta">model: {steps[0].llm}</p>}
      <Trace steps={steps} />
    </section>
  );
}
