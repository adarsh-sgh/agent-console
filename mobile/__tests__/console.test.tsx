/** Full mobile flow: GraphQL history renders, tapping a run streams its trace step by step. */
import { fireEvent, render } from "@testing-library/react-native";
import type { Run, Step } from "@shared";
import { Console } from "../src/Console";

const run: Run = {
  id: "r1", question: "ticket T-103?", answer: "in progress", status: "done",
  createdAt: "2026-09-05T10:00:00Z", steps: [],
};

const streamed: Step[] = [
  { type: "run_started", run_id: "r2" },
  { type: "thought", content: "Look up the ticket." },
  { type: "tool_call", id: "c1", tool: "lookup_ticket", args: { ticket_id: "T-103" } },
  { type: "observation", id: "c1", tool: "lookup_ticket", content: "in_progress" },
  { type: "final", content: "Ticket T-103 is in progress." },
  { type: "run_finished", run_id: "r2", status: "done" },
];

test("lists run history and streams the picked run's trace", async () => {
  const asked: string[] = [];
  const stream = async (question: string, onStep: (s: Step) => void) => {
    asked.push(question);
    streamed.forEach(onStep);
  };

  const ui = await render(<Console loadRuns={async () => [run]} stream={stream} />);
  await fireEvent.press(await ui.findByText("ticket T-103?"));

  expect(asked).toEqual(["ticket T-103?"]);
  expect(await ui.findByText("Ticket T-103 is in progress.")).toBeTruthy();
  expect(ui.getByText("Look up the ticket.")).toBeTruthy();
  expect(ui.getByText('lookup_ticket({"ticket_id":"T-103"})')).toBeTruthy();
  expect(ui.getByText("in_progress")).toBeTruthy();
  expect(ui.queryByText("run started")).toBeNull(); // transport frames stay out of the trace
});
