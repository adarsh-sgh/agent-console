import { useState } from "react";
import { HistoryPage } from "./HistoryPage";
import { RunPage } from "./RunPage";

type Tab = "run" | "history";

export default function App() {
  const [tab, setTab] = useState<Tab>("run");
  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-4 flex items-baseline gap-6">
        <h1 className="m-0 font-mono text-lg">agent-console</h1>
        <nav>
          {(["run", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-current={tab === t}
              onClick={() => setTab(t)}
              className="cursor-pointer border-b-2 border-transparent px-1.5 py-1 text-dim aria-[current=true]:border-ok aria-[current=true]:text-text"
            >
              {t}
            </button>
          ))}
        </nav>
      </header>
      {tab === "run" ? <RunPage /> : <HistoryPage />}
    </main>
  );
}
