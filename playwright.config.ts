import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: {
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, timeout: 20000 },
  },
  use: {
    baseURL: "http://127.0.0.1:4173/clusterii/pr4/",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "PUBLIC_BASE_PATH=/clusterii/pr4 PUBLIC_EMULATORS=true bun run build && node scripts/serve-pages.mjs /clusterii/pr4 4173",
    url: "http://127.0.0.1:4173/clusterii/pr4/",
    reuseExistingServer: !process.env.CI,
  },
});
