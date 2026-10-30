import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const runtimeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
const isGitHubPages = runtimeProcess?.env?.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGitHubPages ? "/AI---File-Explore/" : "/",
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1"
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: "es2022"
  }
});
