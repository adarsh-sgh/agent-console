import { fetchRuns, xhrStream, type Run, type RunStream } from "@shared";

// A device can't reach the host's localhost: set EXPO_PUBLIC_GATEWAY_URL to the LAN IP.
export const GATEWAY = process.env.EXPO_PUBLIC_GATEWAY_URL ?? "http://localhost:4000";

export const runStream: RunStream = xhrStream(`${GATEWAY}/api/runs`);
export const loadRuns = (): Promise<Run[]> => fetchRuns(`${GATEWAY}/graphql`);
