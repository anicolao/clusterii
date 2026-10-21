import { test, expect, beforeAll, afterAll } from "bun:test";
import { chromium, type Browser, type Page } from "@playwright/test";
import { captureReady } from "./browser/story-helpers/capture-ready";
import { assertScreenFit } from "./browser/story-helpers/screen-fit";
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
    await page.evaluate(captureReady);
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
      await expect(page.evaluate(captureReady)).rejects.toThrow(
        paused ? "paused animation" : "infinite animation",
      );
    });
});
test("undecodable visible images fail readiness", async () => {
  await fixture(
    '<img width="50" height="50" src="data:image/png;base64,YmFk">',
    async (page) => {
      await expect(page.evaluate(captureReady)).rejects.toThrow();
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
