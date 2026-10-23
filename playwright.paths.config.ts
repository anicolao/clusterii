import { defineConfig } from "@playwright/test";
import stories from "./playwright.stories.config";

// TestInfo metadata only: no page/context/browser fixture, web server or emulator.
export default defineConfig({
  ...stories,
  testMatch: "tooling/baseline-paths.spec.ts",
  grep: undefined,
  webServer: undefined,
  outputDir: "test-results/baseline-paths",
  reporter: "line",
  use: {},
});
