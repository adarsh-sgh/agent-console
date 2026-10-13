/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const gateway = process.env.GATEWAY_URL ?? "http://localhost:4000";
const shared = fileURLToPath(new URL("../shared/src", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @shared is compiled from source; dedupe keeps React single-copy across the alias.
  resolve: { alias: { "@shared": shared }, dedupe: ["react", "react-dom"] },
  server: { port: 5173, proxy: { "/api": gateway, "/graphql": gateway }, fs: { allow: [".."] } },
  test: { environment: "jsdom", setupFiles: ["src/test/setup.ts"], globals: true },
});
