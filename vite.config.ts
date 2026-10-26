import { renderTelemetryPlugin } from "./tests/e2e/helpers/render-telemetry-plugin.mjs";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    renderTelemetryPlugin(process.env.CLUSTER_RENDER_TELEMETRY === "1"),
    sveltekit(),
  ],
  define: {
    __CLUSTER_EMULATORS__: JSON.stringify(
      process.env.PUBLIC_EMULATORS === "true",
    ),
  },
});
