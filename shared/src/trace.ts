import type { Step } from "./types";

const TRANSPORT = ["run_started", "run_finished"];

/** Frames that carry stream bookkeeping, not reasoning, are not part of the trace. */
export const visibleSteps = (steps: Step[]) => steps.filter((s) => !TRANSPORT.includes(s.type));

export const stepLabel = (type: Step["type"]) => type.replace("_", " ");

/** The gateway sends args as a JSON string, the SSE stream as an object. */
export const formatArgs = (args: Step["args"]) =>
  typeof args === "string" ? args : JSON.stringify(args ?? {});

export const toolCallText = (step: Step) => `${step.tool}(${formatArgs(step.args)})`;

export const stepBody = (step: Step): string | null => {
  if (step.type === "tool_call") return toolCallText(step);
  return step.content ?? null;
};
