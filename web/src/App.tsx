import { useState } from "react";
import { HistoryPage } from "./HistoryPage";
import { RunPage } from "./RunPage";

type Tab = "run" | "history";

export default function App() {
  const [tab, setTab] = useState<Tab>("run");
  return (
    <main>
      <header>
        <h1>agent-console</h1>
        <nav>
          {(["run", "history"] as Tab[]).map((t) => (
            <button key={t} type="button" aria-current={tab === t} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
      </header>
      {tab === "run" ? <RunPage /> : <HistoryPage />}
    </main>
  );
}
