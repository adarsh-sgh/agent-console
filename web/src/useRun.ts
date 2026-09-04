import { useCallback, useState } from "react";
import { readSSE } from "./sse";
import type { Step } from "./types";

export function useRun() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (question: string) => {
    setSteps([]);
    setError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`gateway responded ${res.status}`);
      await readSSE(res, (ev) => setSteps((prev) => [...prev, ev as Step]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, []);

  return { steps, running, error, ask };
}
