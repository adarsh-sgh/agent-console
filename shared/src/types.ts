export type StepType =
  | "run_started" | "thought" | "tool_call" | "observation" | "final" | "error" | "run_finished";

export interface Step {
  type: StepType;
  content?: string;
  tool?: string;
  args?: Record<string, unknown> | string | null;
  id?: string;
  run_id?: string;
  status?: string;
  llm?: string;
}

export interface Run {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
  steps: Step[];
}
