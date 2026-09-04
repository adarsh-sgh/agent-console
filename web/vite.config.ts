/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const gateway = process.env.GATEWAY_URL ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": gateway, "/graphql": gateway } },
  test: { environment: "jsdom", setupFiles: ["src/test/setup.ts"], globals: true },
});
