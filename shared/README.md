# @agent-console/shared

Everything about a run that is not a rendered element: the step/run types, the SSE
parser and its two transports, the `useRun` hook, the GraphQL history query, and the
formatting the trace list needs.

Source-only on purpose — no build step and no `node_modules`. Each app aliases
`@shared` to `src/` (Vite `resolve.alias`, Metro `watchFolders` + `extraNodeModules`)
so `react` resolves from the app and there is exactly one copy of it. Nothing here
imports `react-dom` or `react-native`, so both viewers can render the same data with
their own primitives.
