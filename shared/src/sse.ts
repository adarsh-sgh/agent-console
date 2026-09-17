import type { Step } from "./types";

/** Feed it SSE text as it arrives; it emits one parsed event per `data:` block. */
export function createSSEParser(onEvent: (data: unknown) => void) {
  let buf = "";
  return (chunk: string) => {
    buf += chunk;
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
      if (data) onEvent(JSON.parse(data));
    }
  };
}

/** Starts a run and resolves when the stream ends. The two implementations differ only in transport. */
export type RunStream = (question: string, onStep: (step: Step) => void) => Promise<void>;

/** Web: `EventSource` can't POST, so read the fetch body as bytes. */
export function fetchStream(url: string): RunStream {
  return async (question, onStep) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(`gateway responded ${res.status}`);
    if (!res.body) throw new Error("response has no body");
    const push = createSSEParser((e) => onStep(e as Step));
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      push(decoder.decode(value ?? new Uint8Array(), { stream: !done }));
      if (done) return;
    }
  };
}

/** React Native: `fetch` has no readable body there, but XHR exposes the response as it grows. */
export function xhrStream(url: string): RunStream {
  return (question, onStep) =>
    new Promise((resolve, reject) => {
      const push = createSSEParser((e) => onStep(e as Step));
      let sent = 0;
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Content-Type", "application/json");
      const drain = () => {
        const text = xhr.responseText ?? "";
        push(text.slice(sent));
        sent = text.length;
      };
      xhr.onprogress = drain;
      xhr.onload = () => {
        if (xhr.status >= 400) return reject(new Error(`gateway responded ${xhr.status}`));
        drain();
        resolve();
      };
      xhr.onerror = () => reject(new Error("network error"));
      xhr.send(JSON.stringify({ question }));
    });
}
