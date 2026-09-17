import { useCallback, useState } from "react";
import type { RunStream } from "./sse";
import type { Step } from "./types";

/** Drives one run: steps accumulate in arrival order so the UI can render as they land. */
export function useRun(stream: RunStream) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (question: string) => {
    setSteps([]);
    setError(null);
    setRunning(true);
    try {
      await stream(question, (step) => setSteps((prev) => [...prev, step]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [stream]);

  return { steps, running, error, ask };
}
