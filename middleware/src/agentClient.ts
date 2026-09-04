// Thin HTTP client for the Python agent service; adds the internal auth header.
export interface AgentConfig {
  agentUrl: string;
  internalToken?: string;
}

export interface Step {
  type: string;
  content?: string;
  tool?: string;
  args?: Record<string, unknown>;
  id?: string;
}

export interface Run {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  steps: Step[];
  created_at: string;
}

export function agentClient(cfg: AgentConfig) {
  const headers = (extra: Record<string, string> = {}) => ({
    ...(cfg.internalToken ? { "X-Internal-Token": cfg.internalToken } : {}),
    ...extra,
  });

  return {
    startRun: (question: string) =>
      fetch(`${cfg.agentUrl}/runs`, {
        method: "POST",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ question }),
      }),
    listRuns: async (limit: number): Promise<Run[]> => {
      const r = await fetch(`${cfg.agentUrl}/runs?limit=${limit}`, { headers: headers() });
      if (!r.ok) throw new Error(`agent responded ${r.status}`);
      return (await r.json()) as Run[];
    },
    getRun: async (id: string): Promise<Run | null> => {
      const r = await fetch(`${cfg.agentUrl}/runs/${encodeURIComponent(id)}`, { headers: headers() });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`agent responded ${r.status}`);
      return (await r.json()) as Run;
    },
  };
}

export type AgentClient = ReturnType<typeof agentClient>;
