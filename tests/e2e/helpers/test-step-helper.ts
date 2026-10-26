import {
  test,
  expect,
  type Page,
  type TestInfo,
  type Locator,
} from "@playwright/test";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { release } from "node:os";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { storySnapshotName, outputDirectory } from "./story-paths.mjs";
import {
  pinnedRenderer,
  rendererArgs,
} from "../../../playwright.stories.config";
import { stableImage } from "../../browser/story-helpers/stable-image";
import { textLayout } from "../../browser/story-helpers/text-layout";
import {
  captureReady,
  type MotionFrame,
} from "../../browser/story-helpers/capture-ready";
import { assertScreenFit } from "../../browser/story-helpers/screen-fit";
export const CAPTURE_BUDGET = 10000;
export const STEP_BUDGET = 30000;
export type Verification = { spec: string; check: () => Promise<unknown> };
export type StoryView = {
  page: Page | (() => Page);
  player: string;
  surface: "game" | "document";
  primary?: Locator[];
  motionInspection?: MotionFrame[];
  verifications?: Verification[];
  captureVerifications?: Verification[];
};
interface Metadata {
  id: string;
  title: string;
  description: string;
  inventory: string[];
}
interface Entry {
  id: string;
  description: string;
  actor: string;
  kind: "player" | "harness";
  acknowledgement: string;
  verifications: string[];
  views: { player: string; image: string; verifications: string[] }[];
}
interface Story {
  metadata: Metadata;
  entries: Entry[];
  ids: Set<string>;
  folder: string;
  renderer?: Record<string, unknown>;
}
const stories = new WeakMap<TestInfo, Story>();
const owners = new Map<string, string>();
const safe = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
const mode = () => process.env.CLUSTER_STORY_MODE ?? "verify";
const platform = () => `${process.platform}-${process.arch}`;
function fontsDigest() {
  const hash = createHash("sha256");
  for (const family of ["atkinson-hyperlegible", "cormorant-garamond"]) {
    const folder = resolve(`node_modules/@fontsource/${family}/files`);
    for (const name of readdirSync(folder)
      .filter((name) => name.endsWith(".woff2"))
      .sort()) {
      hash.update(name);
      hash.update(readFileSync(join(folder, name)));
    }
  }
  return hash.digest("hex");
}
const fontHash = fontsDigest();
function renderer(page: Page, info: TestInfo) {
  return {
    platform: platform(),
    rendererArgs,
    environment:
      process.platform === "linux"
        ? process.env.CLUSTER_PINNED_RENDERER
        : release(),
    browser: page.context().browser()?.version(),
    playwright: JSON.parse(
      readFileSync(
        resolve("node_modules/@playwright/test/package.json"),
        "utf8",
      ),
    ).version,
    fonts: fontHash,
    viewport: page.viewportSize(),
    locale: info.project.use.locale,
    timezone: info.project.use.timezoneId,
    dpr: info.project.use.deviceScaleFactor,
    motion: info.project.use.contextOptions?.reducedMotion,
  };
}
async function exactPixels(actual: Buffer, expected: Buffer) {
  const [a, b] = await Promise.all(
    [actual, expected].map((buffer) =>
      sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  return (
    a.info.width === b.info.width &&
    a.info.height === b.info.height &&
    a.data.equals(b.data)
  );
}
/** Actions, acknowledged facts and every player view form one ordered narrative. */
export class TestStepHelper {
  private story: Story;
  constructor(
    private info: TestInfo,
    metadata: Metadata,
  ) {
    if (!["verify", "generate"].includes(mode()))
      throw new Error("CLUSTER_STORY_MODE must be verify or generate");
    if (info.config.updateSnapshots !== "none")
      throw new Error(
        "Use the separate story generation command; Playwright snapshot updating is forbidden",
      );
    if (metadata.id !== safe(metadata.id))
      throw new Error("Story IDs must use stable lowercase slugs");
    if (
      process.platform === "linux" &&
      process.env.CLUSTER_PINNED_RENDERER !== pinnedRenderer
    )
      throw new Error(
        "Linux stories require the pinned renderer workflow/container",
      );
    const existing = stories.get(info);
    if (existing && existing.metadata.id !== metadata.id)
      throw new Error("One ordered story owns each test");
    this.story = existing ?? {
      metadata,
      entries: [],
      ids: new Set(),
      folder: resolve(
        outputDirectory(metadata.id, info.project.name, platform()),
      ),
    };
    const owner = owners.get(this.story.folder);
    if (owner && owner !== info.testId)
      throw new Error(
        "Distinct tests must not share an illustrated output directory",
      );
    owners.set(this.story.folder, info.testId);
    stories.set(info, this.story);
    mkdirSync(this.story.folder, { recursive: true });
  }
  async step(
    id: string,
    options: {
      description: string;
      actor: string;
      action: () => Promise<unknown>;
      acknowledgement: Verification;
      verifications: Verification[];
      views: StoryView[];
    },
  ) {
    if (!options.views.length || !options.verifications.length)
      throw new Error(
        "A player step needs named assertions and at least one viewpoint",
      );
    this.claim(id);
    await test.step(
      options.description,
      async () => {
        await test.step(`${options.actor}: player action`, options.action);
        await test.step(
          options.acknowledgement.spec,
          options.acknowledgement.check,
        );
        for (const check of options.verifications)
          await test.step(check.spec, check.check);
        const entry: Entry = {
          id,
          description: options.description,
          actor: options.actor,
          kind: "player",
          acknowledgement: options.acknowledgement.spec,
          verifications: options.verifications.map((v) => v.spec),
          views: [],
        };
        for (const [index, view] of options.views.entries()) {
          const page =
            typeof view.page === "function" ? view.page() : view.page;
          for (const check of view.verifications ?? [])
            await test.step(`${view.player}: ${check.spec}`, check.check);
          const stem = `${String(this.story.entries.length + 1).padStart(3, "0")}-${id}-${index + 1}-${safe(view.player)}.png`;
          await test.step(
            `${view.player}: settled, contained, exact capture`,
            async () => {
              await page.bringToFront();
              await page.mouse.move(0, 0);
              for (const primary of view.primary ?? []) {
                await expect(primary).toBeVisible();
                const box = await primary.boundingBox(),
                  viewport = page.viewportSize()!;
                expect(box).not.toBeNull();
                expect(box!.x).toBeGreaterThanOrEqual(0);
                expect(box!.y).toBeGreaterThanOrEqual(0);
                expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
                expect(box!.y + box!.height).toBeLessThanOrEqual(
                  viewport.height,
                );
              }
              await page.evaluate(captureReady, view.motionInspection ?? []);
              await page.evaluate(assertScreenFit, { surface: view.surface });
              expect(
                await page.evaluate(() => ({
                  dpr: devicePixelRatio,
                  locale: navigator.language,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches,
                })),
                "Actual page renderer matches the declared capture environment",
              ).toEqual({
                dpr: 1,
                locale: "en-US",
                timezone: "UTC",
                reducedMotion: true,
              });
              const settings = renderer(page, this.info);
              this.story.renderer = settings;
              const name = storySnapshotName(
                this.story.metadata.id,
                this.info.project.name,
                platform(),
                stem,
              );
              const baseline = this.info.snapshotPath(...name),
                manifest = join(dirname(baseline), "renderer.json");
              if (mode() === "verify") {
                if (!existsSync(baseline) || !existsSync(manifest))
                  throw new Error(
                    `Missing reviewed baseline/renderer: ${baseline}. Generate candidates separately; verification never writes expected images.`,
                  );
                expect(
                  settings,
                  "Pinned renderer must match the reviewed baseline",
                ).toEqual(JSON.parse(readFileSync(manifest, "utf8")));
              }
              const renderSamples: unknown[] = [];
              const sampleRender = async () => {
                if (process.env.CLUSTER_RENDER_TELEMETRY === "1")
                  renderSamples.push(
                    await page.evaluate(
                      () =>
                        (
                          window as unknown as {
                            __clusterRenderSample?: () => unknown;
                          }
                        ).__clusterRenderSample?.() ?? null,
                    ),
                  );
              };
              const capture = async () => {
                for (const check of view.captureVerifications ?? [])
                  await test.step(
                    `${view.player}: before PNG: ${check.spec}`,
                    check.check,
                  );
                const image = await page.screenshot({
                  animations: "allow",
                  caret: "hide",
                  fullPage: false,
                });
                for (const check of view.captureVerifications ?? [])
                  await test.step(
                    `${view.player}: after PNG: ${check.spec}`,
                    check.check,
                  );
                return image;
              };
              const image = await stableImage(capture, exactPixels);
              // Diagnostic observation follows the completed stable capture only.
              await sampleRender();
              writeFileSync(join(this.story.folder, stem), image);
              if (process.env.CLUSTER_RENDER_TELEMETRY === "1") {
                writeFileSync(
                  join(
                    this.story.folder,
                    stem.replace(/\.png$/, ".render.json"),
                  ),
                  JSON.stringify(renderSamples, null, 2),
                );
              }

              // Observe after capture: diagnostics cannot change the captured pixels.
              // Preserve this for passing and failing views, independently of baselines.
              writeFileSync(
                join(this.story.folder, stem.replace(/\.png$/, ".layout.json")),
                JSON.stringify(await page.evaluate(textLayout), null, 2),
              );
              await this.info.attach(`${id} — ${view.player}`, {
                body: image,
                contentType: "image/png",
              });
              if (process.env.CLUSTER_RENDER_TELEMETRY === "1" &&
                  stem === "034-close-arrival-archives-by-keyboard-2-independent-marshal.png") {
                const probe = async (hide: boolean) => page.evaluate((value) =>
                  (window as unknown as {__clusterCoreProbe: (hide: boolean) => unknown}).__clusterCoreProbe(value), hide);
                const states: unknown[] = [];
                try {
                  states.push(await probe(true));
                  const hidden = await stableImage(capture, exactPixels);
                  writeFileSync(join(this.story.folder, stem.replace(/\.png$/, ".core-hidden.png")), hidden);
                } finally {
                  states.push(await probe(false));
                  writeFileSync(join(this.story.folder, stem.replace(/\.png$/, ".core-probe.json")), JSON.stringify(states,null,2));
                }
              }
              if (mode() === "verify") {
                const identical = await exactPixels(
                  image,
                  readFileSync(baseline),
                );
                if (!identical)
                  expect(image).toMatchSnapshot(name, {
                    maxDiffPixels: 0,
                    threshold: 0,
                  });
                expect(
                  identical,
                  "Every decoded RGBA byte matches; no ignored antialias differences",
                ).toBe(true);
              }
            },
            { timeout: CAPTURE_BUDGET },
          );
          entry.views.push({
            player: view.player,
            image: stem,
            verifications: [
              ...(view.verifications ?? []).map((v) => v.spec),
              ...(view.captureVerifications ?? []).map((v) => v.spec),
              ...(view.motionInspection ?? []).map(
                (frame) =>
                  `Explicit paused motion: ${frame.selector}, ${frame.count} animation(s), ${frame.time}/${frame.duration} ms; unchanged exact comparison.`,
              ),
            ],
          });
        }
        this.story.entries.push(entry);
      },
      { timeout: STEP_BUDGET },
    );
  }
  async harness(
    id: string,
    description: string,
    run:
      | (() => Promise<unknown>)
      | readonly { description: string; run: () => Promise<unknown> }[],
  ) {
    this.claim(id);
    const controls = typeof run === "function" ? [{ description, run }] : run;
    if (
      !controls.length ||
      controls.some((control) => !control.description.trim()) ||
      new Set(controls.map((control) => control.description)).size !==
        controls.length
    )
      throw new Error(
        "Harness controls require distinct nonempty descriptions",
      );
    // Each independent setup operation has the existing bounded step budget.
    // The enclosing test deadline remains unchanged; no unbounded retry group.
    for (const control of controls)
      await test.step(`Harness control: ${control.description}`, control.run, {
        timeout: STEP_BUDGET,
      });
    this.story.entries.push({
      id,
      description,
      actor: "Test harness",
      kind: "harness",
      acknowledgement:
        "Explicit test control; not a player action or hosted-service certification.",
      verifications:
        typeof run === "function"
          ? []
          : controls.map((control) => control.description),
      views: [],
    });
  }
  private claim(id: string) {
    if (id !== safe(id) || this.story.ids.has(id))
      throw new Error(`Invalid or duplicate story step: ${id}`);
    this.story.ids.add(id);
  }
}
export async function finishStory(info: TestInfo) {
  const story = stories.get(info);
  if (!story) return;
  const data = {
    ...story.metadata,
    source: {
      commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      dirty: Boolean(
        execFileSync(
          "git",
          ["status", "--porcelain", "--untracked-files=normal"],
          { encoding: "utf8" },
        ).trim(),
      ),
      spec: info.file.replace(process.cwd() + "/", ""),
      specSha256: createHash("sha256")
        .update(readFileSync(info.file))
        .digest("hex"),
    },
    mode: mode(),
    status: info.status,
    project: info.project.name,
    platform: platform(),
    renderer: story.renderer,
    steps: story.entries,
  };
  writeFileSync(
    join(story.folder, info.status === "passed" ? "story.json" : "FAILED.json"),
    JSON.stringify(data, null, 2) + "\n",
  );
  if (info.status !== "passed") return;
  writeFileSync(
    join(story.folder, "renderer.json"),
    JSON.stringify(story.renderer, null, 2) + "\n",
  );
  const title =
    mode() === "generate"
      ? "BASELINE CANDIDATES — generation, not verification"
      : "Exact comparison passed";
  const parts = [
    `# ${story.metadata.title}`,
    `**${title}.** ${info.project.name} · ${platform()}. Inventory: ${story.metadata.inventory.join(", ")}.`,
    story.metadata.description,
  ];
  for (const [index, entry] of story.entries.entries()) {
    parts.push(
      `## ${index + 1}. ${entry.description}`,
      `Actor: **${entry.actor}**. ${entry.kind === "harness" ? "**Harness control; not a player action.**" : ""}`,
      `Acknowledged outcome: ${entry.acknowledgement}`,
    );
    if (entry.verifications.length)
      parts.push(entry.verifications.map((v) => `- [x] ${v}`).join("\n"));
    for (const view of entry.views)
      parts.push(
        `### Viewpoint: ${view.player}`,
        view.verifications.map((v) => `- [x] ${v}`).join("\n"),
        `[![${entry.description} — ${view.player}](${view.image})](${view.image})`,
      );
  }
  writeFileSync(
    join(story.folder, "README.md"),
    parts
      .filter(Boolean)
      .map((part) => part.trimEnd())
      .join("\n\n") + "\n",
  );
  await info.attach("Illustrated story", {
    path: join(story.folder, "README.md"),
    contentType: "text/markdown",
  });
}
