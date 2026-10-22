import { defineConfig } from "@playwright/test";
import { rendererArgs } from "./playwright.stories.config";
export default defineConfig({
  testDir: "tests/diagnostics",
  testMatch: "admission-frame.probe.ts",
  workers: 1,
  retries: 0,
  timeout: 120000,
  outputDir: "test-results/admission-probe",
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:4173/clusterii/pr4/",
    viewport: { width: 393, height: 852 },
    actionTimeout: 10000,
    navigationTimeout: 10000,
    launchOptions: { args: rendererArgs },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command:
      "PUBLIC_BASE_PATH=/clusterii/pr4 PUBLIC_EMULATORS=true bun run build && node scripts/serve-pages.mjs /clusterii/pr4 4173",
    url: "http://127.0.0.1:4173/clusterii/pr4/",
    reuseExistingServer: false,
  },
});
