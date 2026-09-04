import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const sse = (events: object[]) =>
  new Response(events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });

afterEach(() => vi.restoreAllMocks());

describe("agent-console UI", () => {
  it("streams a run and renders thought, tool call, observation and answer", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      sse([
        { type: "run_started", run_id: "r1" },
        { type: "thought", content: "I should use calculator." },
        { type: "tool_call", id: "c1", tool: "calculator", args: { expression: "6*7" } },
        { type: "observation", id: "c1", tool: "calculator", content: "42" },
        { type: "final", content: "The answer is 42." },
        { type: "run_finished", run_id: "r1", status: "done" },
      ]),
    );
    render(<App />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("question"));
    await user.type(screen.getByLabelText("question"), "what is 6*7");
    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByText("The answer is 42.")).toBeInTheDocument();
    expect(screen.getByText("I should use calculator.")).toBeInTheDocument();
    expect(screen.getByText('calculator({"expression":"6*7"})')).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/runs");
    expect(JSON.parse(init!.body as string)).toEqual({ question: "what is 6*7" });
  });

  it("loads run history over GraphQL and expands a run's trace", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: {
          runs: [{
            id: "r9", question: "ticket T-103?", answer: "in progress", status: "done",
            createdAt: "2026-09-05T10:00:00Z",
            steps: [
              { type: "tool_call", id: "c1", tool: "lookup_ticket", args: '{"ticket_id":"T-103"}' },
              { type: "final", content: "in progress" },
            ],
          }],
        },
      }),
    );
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "history" }));
    await user.click(await screen.findByText("ticket T-103?"));
    await waitFor(() => expect(screen.getByText('lookup_ticket({"ticket_id":"T-103"})')).toBeInTheDocument());
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });
});
