import {
  test,
  expect,
  type BrowserContext,
  type Request,
} from "@playwright/test";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { login, grantDeveloper } from "../browser/helpers";
import { rendererArgs } from "../../playwright.stories.config";

test("single admission-only frame and timer discrimination", async ({
  browser,
}, info) => {
  const file = info.outputPath("redacted-timing.jsonl");
  mkdirSync(dirname(file), { recursive: true });
  const started = performance.now();
  let markers = 0,
    samples = 0,
    phase = "setup";
  const record = (kind: string, data: object = {}) => {
    if (kind === "sample" ? samples++ >= 16 : markers++ >= 64) return;
    appendFileSync(
      file,
      JSON.stringify({
        kind,
        elapsedMs: performance.now() - started,
        ...data,
      }) + "\n",
    );
  };
  record("environment", {
    source: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    specSha256: createHash("sha256")
      .update(readFileSync(import.meta.filename))
      .digest("hex"),
    browser: browser.version(),
    platform: process.platform,
    architecture: process.arch,
    rendererArgs,
    viewport: { width: 393, height: 852 },
    clock: "ordinary-unmodified",
    totalBudgetMs: 120000,
    actionBudgetMs: 10000,
  });
  if (
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080" ||
    info.project.use.baseURL !== "http://127.0.0.1:4173/clusterii/pr4/"
  )
    throw new Error(
      "Admission probe requires the loopback demo emulator cohort",
    );
  const contexts: BrowserContext[] = [],
    pages = [];
  let failed = false;
  try {
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
        baseURL: info.project.use.baseURL,
        deviceScaleFactor: 1,
        locale: "en-US",
        timezoneId: "UTC",
        colorScheme: "dark",
        reducedMotion: "reduce",
      });
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
      const email = `admission-frame-${i}-${Date.now()}@example.test`;
      await login(page, email);
      await page.getByLabel("Commander name").fill(`Probe commander ${i + 1}`);
      await page
        .getByRole("button", { name: "Save identity", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText("Identity saved");
      await grantDeveloper(email);
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      record("identity-ready", { ordinal: i + 1 });
    }
    const target = pages[3],
      requests = new WeakMap<Request, number>();
    const endpoint = (request: Request) => {
      const name = new URL(request.url()).pathname.split("/").at(-1);
      return request.method() === "POST" &&
        ["campaignKey", "campaignSecurity"].includes(name ?? "")
        ? name
        : null;
    };
    target.on("request", (request) => {
      const name = endpoint(request);
      if (!name) return;
      requests.set(request, performance.now());
      record("request-start", { endpoint: name });
    });
    target.on("requestfinished", async (request) => {
      const name = endpoint(request);
      if (!name) return;
      record("response-finished", {
        endpoint: name,
        durationMs:
          performance.now() - (requests.get(request) ?? performance.now()),
        status: (await request.response())?.status(),
      });
    });
    target.on("requestfailed", (request) => {
      const name = endpoint(request);
      if (name) record("request-failed", { endpoint: name });
    });
    await target.exposeBinding("admissionSample", (_source, sample) =>
      record("sample", sample),
    );
    await target.addInitScript(() => {
      let running = false,
        started = 0,
        frames = 0,
        timers = 0,
        count = 0,
        raf = 0,
        timer = 0,
        lastFrameMs: number | null = null;
      const sample = () => {
        const input = document.querySelector<HTMLInputElement>(
          'input[name="faction"][value="dracon"]',
        );
        const box = input?.getBoundingClientRect(),
          style = input ? getComputedStyle(input) : null;
        const clips = [];
        for (
          let parent = input?.parentElement;
          parent && clips.length < 8;
          parent = parent.parentElement
        ) {
          const css = getComputedStyle(parent);
          if (
            /(auto|scroll|hidden|clip)/.test(
              `${css.overflowX} ${css.overflowY}`,
            )
          )
            clips.push({
              box: parent.getBoundingClientRect().toJSON(),
              x: css.overflowX,
              y: css.overflowY,
            });
        }
        const hits = box
          ? [
              [box.x + box.width / 2, box.y + box.height / 2],
              [box.x + 1, box.y + 1],
              [box.right - 1, box.y + 1],
              [box.x + 1, box.bottom - 1],
              [box.right - 1, box.bottom - 1],
            ].map(([x, y]) => {
              const hit = document.elementFromPoint(x, y);
              return hit === input
                ? "target"
                : hit && input?.closest("label")?.contains(hit)
                  ? "label"
                  : hit
                    ? "other"
                    : "none";
            })
          : [];
        void (window as any).admissionSample({
          browserElapsedMs: performance.now() - started,
          frames,
          timers,
          lastFrameMs,
          visibility: document.visibilityState,
          connected: input?.isConnected ?? false,
          disabled: input?.matches(":disabled") ?? null,
          box: box?.toJSON() ?? null,
          display: style?.display ?? null,
          visibilityStyle: style?.visibility ?? null,
          clips,
          hits,
        });
      };
      const frame = () => {
        if (!running) return;
        frames++;
        lastFrameMs = performance.now() - started;
        raf = requestAnimationFrame(frame);
      };
      const timerTick = () => {
        if (!running) return;
        timers++;
        if ((timers === 1 || timers % 7 === 0) && count++ < 16) sample();
        if (performance.now() - started >= 11000) {
          stop();
          return;
        }
        timer = window.setTimeout(timerTick, 100);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
      (window as any).admissionProbe = {
        start: () => {
          running = true;
          started = performance.now();
          raf = requestAnimationFrame(frame);
          timer = window.setTimeout(timerTick, 100);
        },
        stop: () => {
          stop();
          return {
            frames,
            timers,
            browserElapsedMs: performance.now() - started,
            lastFrameMs,
          };
        },
      };
    });
    let url = "";
    for (let i = 0; i < 4; i++) {
      const page = pages[i];
      phase = `admission-${i + 1}`;
      if (!i) {
        await page
          .getByRole("button", { name: "Create campaign", exact: true })
          .click();
        await page
          .getByLabel("Campaign name")
          .fill(`Admission probe ${Date.now()}`);
        await page
          .getByRole("button", { name: "Create galaxy", exact: true })
          .click();
        await expect(
          page.getByRole("heading", {
            name: "Choose your faction",
            exact: true,
          }),
        ).toBeVisible();
        url = page.url();
      } else await page.goto(url);
      if (i === 3) {
        record("sampler-arm-start");
        await page.evaluate(() => (window as any).admissionProbe.start());
        record("sampler-armed");
        phase = "target-action";
        record("action-start");
      }
      await page
        .getByRole("radio", {
          name: new RegExp(
            [
              "Heliac Assembly",
              "Pelagic Concord",
              "Vesper Synod",
              "Dracon League",
            ][i],
          ),
        })
        .check({ timeout: 10000 });
      if (i === 3) {
        record("action-complete");
        record(
          "sampler-stop",
          await page.evaluate(() => (window as any).admissionProbe.stop()),
        );
      }
      await page
        .getByRole("button", { name: "Claim your seat", exact: true })
        .click();
      await expect(
        page.getByText("Your seat is confirmed.", { exact: true }),
      ).toBeVisible();
      record("admitted", { ordinal: i + 1 });
    }
    record("outcome", { result: "passed-negative-reproduction" });
  } catch (error) {
    failed = true;
    record("outcome", { result: "failed", phase });
    throw error;
  } finally {
    for (const context of contexts) {
      try {
        await context.close();
      } catch (error) {
        if (!failed) throw error;
      }
    }
  }
});
