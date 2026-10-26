import { defineConfig } from "@playwright/test";
export const pinnedRenderer =
  "mcr.microsoft.com/playwright:v1.61.1-noble@sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321";
export const rendererArgs = [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--num-raster-threads=2",
  "--disable-skia-runtime-opts",
  "--run-all-compositor-stages-before-draw",
  "--disable-checker-imaging",
  "--disable-partial-raster",
  "--disable-gpu-rasterization",
  "--disable-gpu",
];
export default defineConfig({
  testDir: "tests",
  testMatch: [
    /browser\/[^/]+\.story\.spec\.ts$/,
    /e2e\/\d{3}-[^/]+\/[^/]+\.spec\.ts$/,
  ],
  workers: 1,
  retries: 0,
  timeout: 90000,
  outputDir: "test-results/stories",
  updateSnapshots: "none",
  snapshotPathTemplate: "{testDir}/{arg}{ext}",
  grep: process.env.CLUSTER_STORY_FILTER
    ? new RegExp(process.env.CLUSTER_STORY_FILTER)
    : undefined,
  expect: {
    timeout: 10000,
    toMatchSnapshot: { maxDiffPixels: 0, threshold: 0 },
  },
  use: {
    baseURL: "http://127.0.0.1:4173/clusterii/pr4/",
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    contextOptions: { reducedMotion: "reduce" },
    actionTimeout: 10000,
    navigationTimeout: 10000,
    trace: {
      mode: "retain-on-failure",
      screenshots: false,
      snapshots: true,
      sources: true,
    },
    screenshot: "off",
    launchOptions: { args: rendererArgs },
  },
  projects: [
    ["phone", 393, 852],
    ["desktop", 1440, 1000],
    ["large", 3840, 2160],
    ["short", 1280, 720],
  ].map(([name, width, height]) => ({
    name: String(name),
    use: { viewport: { width: Number(width), height: Number(height) } },
  })),
  webServer: {
    command:
      "PUBLIC_BASE_PATH=/clusterii/pr4 PUBLIC_EMULATORS=true bun run build && node scripts/serve-pages.mjs /clusterii/pr4 4173",
    url: "http://127.0.0.1:4173/clusterii/pr4/",
    reuseExistingServer: false,
  },
});
