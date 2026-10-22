import { test, expect, beforeAll, afterAll } from "bun:test";
import { chromium, type Browser, type Page } from "@playwright/test";
import { emulatorAsset } from "./browser/story-helpers/emulator-auth-assets";
import { stableImage } from "./browser/story-helpers/stable-image";
import { captureReady } from "./browser/story-helpers/capture-ready";
import { assertScreenFit } from "./browser/story-helpers/screen-fit";
import { textLayout } from "./browser/story-helpers/text-layout";
// Isolated tests of the browser-test tooling, not player/service acceptance.
let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});
async function fixture(html: string, run: (page: Page) => Promise<void>) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  try {
    await page.setContent(
      `<style>body{margin:0}button{width:80px;height:48px}</style>${html}`,
    );
    await run(page);
  } finally {
    await page.close();
  }
}
test("capture waits for the finite effect and its final outcome", async () => {
  await fixture("<button>Commit</button>", async (page) => {
    await page.evaluate(() => {
      const button = document.querySelector("button")!;
      button
        .animate([{ opacity: 0 }, { opacity: 1 }], { duration: 60 })
        .finished.then(() => {
          button.textContent = "Accepted";
        });
    });
    await page.evaluate(captureReady, []);
    expect(await page.locator("button").textContent()).toBe("Accepted");
  });
});
test("stable capture rejects infinite and paused motion instead of hiding it", async () => {
  for (const paused of [false, true])
    await fixture("<button>Commit</button>", async (page) => {
      await page.evaluate((paused) => {
        const effect = document
          .querySelector("button")!
          .animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 500,
            iterations: paused ? 1 : Infinity,
          });
        if (paused) effect.pause();
      }, paused);
      await expect(page.evaluate(captureReady, [])).rejects.toThrow(
        paused ? "paused animation" : "infinite animation",
      );
    });
});
test("undecodable visible images fail readiness", async () => {
  await fixture(
    '<img width="50" height="50" src="data:image/png;base64,YmFk">',
    async (page) => {
      await expect(page.evaluate(captureReady, [])).rejects.toThrow();
    },
  );
});
test("geometry rejects undersized, overlapping and out-of-viewport controls", async () => {
  for (const [html, message] of [
    ['<button style="width:20px">Bad</button>', "under 44px"],
    [
      '<button style="position:absolute;left:0">One</button><button style="position:absolute;left:20px">Two</button>',
      "occluded",
    ],
    [
      '<button style="position:absolute;top:900px">Gone</button>',
      "outside viewport",
    ],
  ] as const)
    await fixture(html, async (page) => {
      await expect(
        page.evaluate(assertScreenFit, { surface: "game" as const }),
      ).rejects.toThrow(message);
    });
});
test("bounded scroll is allowed without moving the primary action or document", async () => {
  await fixture(
    '<div style="height:100px;overflow:auto"><div style="height:500px"><button>First</button><button style="margin-top:400px">Last</button></div></div><button>Commit</button>',
    async (page) => {
      await page.evaluate(assertScreenFit, { surface: "game" as const });
      expect(
        await page.evaluate(() => document.querySelector("div")!.scrollTop),
      ).toBe(0);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    },
  );
});

test("closed disclosure contents are inactive despite retained layout, but opened controls are audited", async () => {
  await fixture(
    '<details open><summary style="height:48px">Development controls</summary><button style="width:20px">Invalid target</button></details>',
    async (page) => {
      const retained = await page.evaluate(() => {
        const control = document.querySelector("button")!;
        control.getBoundingClientRect();
        document.querySelector("details")!.open = false;
        return {
          width: control.getBoundingClientRect().width,
          visible: control.checkVisibility({
            visibilityProperty: true,
            contentVisibilityAuto: true,
          }),
        };
      });
      expect(retained.width).toBe(20);
      expect(retained.visible).toBe(false);
      await page.evaluate(assertScreenFit, { surface: "game" as const });
      await page.locator("summary").click();
      await expect(
        page.evaluate(assertScreenFit, { surface: "game" as const }),
      ).rejects.toThrow("under 44px");
    },
  );
});
test("disclosure summaries are audited as real keyboard controls", async () => {
  await fixture(
    '<details><summary style="width:20px;height:20px">Open</summary><button>Hidden</button></details>',
    async (page) => {
      await expect(
        page.evaluate(assertScreenFit, { surface: "game" as const }),
      ).rejects.toThrow("under 44px");
    },
  );
});

test("overlap compares painted portions inside a bounded reading panel", async () => {
  await fixture(
    '<div style="height:60px;overflow:auto"><button style="height:80px">Record</button></div><button>Latest</button>',
    async (page) => {
      await page.evaluate(assertScreenFit, { surface: "game" as const });
      expect(await page.locator("div").evaluate((e) => e.scrollTop)).toBe(0);
    },
  );
});

test("actual-frame stability never selects pixels using a baseline", async () => {
  const expected = Buffer.from("expected"),
    wrong = Buffer.from("stable-wrong");
  const frames = [expected, wrong, wrong];
  let count = 0;
  const image = await stableImage(
    async () => frames[count++],
    async (a, b) => a.equals(b),
  );
  expect(count).toBe(3);
  expect(image.equals(wrong)).toBe(true);
  expect(image.equals(expected)).toBe(false);
});
test("actual-frame stability rejects oscillation after its bounded frame budget", async () => {
  let count = 0;
  await expect(
    stableImage(
      async () => Buffer.from(String(count++ % 2)),
      async (a, b) => a.equals(b),
    ),
  ).rejects.toThrow("six consecutive frames");
  expect(count).toBe(6);
});

test("pinned emulator UI assets never replace provider responses or production assets", () => {
  const asset =
      "https://unpkg.com/material-components-web@10/dist/material-components-web.min.js",
    frame =
      "http://127.0.0.1:19099/emulator/auth/handler?providerId=google.com";
  expect(emulatorAsset(asset, frame)?.contentType).toBe(
    "application/javascript",
  );
  for (const [url, page] of [
    [asset, "https://clusterii-20261020.firebaseapp.com/__/auth/handler"],
    [asset, "http://127.0.0.1:4173/clusterii/pr4/"],
    [asset.replace("@10/", "@11/"), frame],
    [
      "http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp",
      frame,
    ],
  ])
    expect(emulatorAsset(url, page)).toBeUndefined();
});

test("explicit animation inspection validates exact paused count, time and duration", async () => {
  await fixture('<button id="sample">Inspect</button>', async (page) => {
    await page.evaluate(() => {
      const animation = document
        .querySelector("button")!
        .animate([{ opacity: 0.5 }, { opacity: 1 }], {
          duration: 180,
          fill: "both",
        });
      animation.pause();
      animation.currentTime = 90;
    });
    const frame = { selector: "#sample", count: 1, time: 90, duration: 180 };
    await page.evaluate(captureReady, [frame]);
    for (const change of [
      { time: 91 },
      { duration: 181 },
      { count: 2 },
      { selector: "#missing" },
    ])
      await expect(
        page.evaluate(captureReady, [{ ...frame, ...change }]),
      ).rejects.toThrow("Explicit motion");
    await page.evaluate(() => {
      const extra = document.body.animate([{ opacity: 0.5 }, { opacity: 1 }], {
        duration: 180,
      });
      extra.pause();
      extra.currentTime = 90;
    });
    await expect(page.evaluate(captureReady, [frame])).rejects.toThrow(
      "undeclared paused animation",
    );
  });
});

test("identity raster diagnostics exclude galaxy text, retain identity ancestry and report bounds", async () => {
  await fixture(
    `<section aria-label="Galaxy">${"<span>Stellar label</span>".repeat(2000)}</section><section aria-label="Your identity" style="position:fixed;top:0"><p>The face your allies trust. The name your rivals remember.</p></section>`,
    async (page) => {
      const before = await page.screenshot();
      const evidence = await page.evaluate(textLayout);
      expect(evidence.scope).toBe("identity-raster");
      expect(evidence.applicable).toBe(true);
      expect(evidence.truncated).toBe(false);
      expect(evidence.visited).toBe(1);
      expect(evidence.texts).toHaveLength(1);
      expect(evidence.texts[0].text).toBe(
        "The face your allies trust. The name your rivals remember.",
      );
      expect(evidence.texts[0].ancestors.length).toBeGreaterThan(2);
      expect(await page.screenshot()).toEqual(before);
      await page
        .locator('section[aria-label="Your identity"]')
        .evaluate((el) => el.remove());
      expect(await page.evaluate(textLayout)).toMatchObject({
        applicable: false,
        visited: 0,
        texts: [],
        truncated: false,
      });
    },
  );
  await fixture(
    `<section aria-label="Your identity" style="position:fixed;top:0">${"<span style='position:absolute;top:0'>Visible</span>".repeat(200)}</section>`,
    async (page) => {
      const evidence = await page.evaluate(textLayout);
      expect(evidence.texts).toHaveLength(128);
      expect(evidence.truncated).toBe(true);
    },
  );
});
