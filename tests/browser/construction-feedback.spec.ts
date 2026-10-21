import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("construction feedback stays scoped after join and research acknowledgements", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(90000);
  const contexts = [],
    pages = [];
  let url = "";
  try {
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
      const email = `construction-complete-ui-${i}-${Date.now()}@example.test`;
      await login(page, email);
      await page
        .getByLabel("Commander name")
        .fill(`Construction envoy ${i + 1}`);
      await page.getByRole("button", { name: "Save identity" }).click();
      await expect(page.getByRole("status")).toContainText("Identity saved");
      await grantDeveloper(email);
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: "Play", exact: true }).click();
    }
    for (let i = 0; i < 4; i++) {
      const page = pages[i];
      if (i === 0) {
        await page
          .getByRole("button", { name: "Create campaign", exact: true })
          .click();
        await page
          .getByLabel("Campaign name")
          .fill(`Construction dawn ${Date.now()}`);
        await page.getByRole("button", { name: "Create galaxy" }).click();
        await expect(
          page.getByRole("heading", { name: "Choose your faction" }),
        ).toBeVisible();
        url = page.url();
      } else await page.goto(url);
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
        .check();
      await page.getByRole("button", { name: "Claim your seat" }).click();
      await expect(page.getByText("Your seat is confirmed.")).toBeVisible();
    }
    // Focused feedback regression: ordinary UI admission, real start service with a test clock.
    const require = createRequire(
      new URL("../../functions/package.json", import.meta.url),
    );
    const admin = require("firebase-admin/app");
    if (!admin.getApps().length)
      admin.initializeApp({ projectId: "demo-clusterii" });
    const db = require("firebase-admin/firestore").getFirestore();
    const id = new URL(url).searchParams.get("campaign");
    expect(id).toBeTruthy();
    const head = await db.doc(`campaignStates/${id}`).get();
    expect(head.exists).toBe(true);
    const start = head.get("startAt");
    expect(Number.isSafeInteger(start)).toBe(true);
    const { startDueCampaign } = require("./lib/functions/src/campaigns.js");
    await startDueCampaign(id, start);
    const page = pages[0];
    await expect(
      page.getByText("Campaign begun", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Develop", exact: true }).click();
    const panel = page.getByRole("dialog", {
      name: "System construction panel",
    });
    await expect(panel).not.toContainText("Your seat is confirmed.");
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      const action = panel.getByRole("button", {
        name: "Build market",
        exact: true,
      });
      const box = await action.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      await geometry(page, panel);
      await panel
        .getByRole("region", { name: "Construction details" })
        .evaluate((el) => el.scrollTo(0, 0));
      await page.screenshot({
        path: info.outputPath(`construction-ready-${label}.png`),
      });
    }
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Economy", exact: true }).click();
    const economy = page.getByRole("dialog", { name: "Empire economy panel" });
    await economy.getByRole("radio", { name: /investing/i }).check();
    await economy
      .getByRole("button", { name: "Queue investing", exact: true })
      .click();
    await expect(economy).toContainText("Research order accepted.");
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    expect(await settleCampaignTicks(id, () => start + 900000)).toBe(1);
    await expect(
      economy.getByRole("status", { name: "Applied research order" }),
    ).toContainText("investing applied at tick 1");
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      await economy
        .getByRole("radio", { name: /investing/ })
        .scrollIntoViewIfNeeded();
      await economy.getByRole("radio", { name: /investing/ }).focus();
      const tracks = [
        "scanning",
        "navigation",
        "terraforming",
        "investing",
        "formations",
        "melee",
        "recruiting",
        "innovation",
      ];
      for (let step = 1; step <= 8; step++) {
        await page.keyboard.press("ArrowDown");
        const track = tracks[(3 + step) % 8];
        await expect(
          economy.getByRole("radio", { name: new RegExp(track) }),
        ).toBeChecked();
        const box = await economy
          .getByRole("button", { name: `Queue ${track}`, exact: true })
          .boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        const radio = economy.getByRole("radio", { name: new RegExp(track) });
        expect(
          await radio.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return [
              [r.left + 1, r.top + 1],
              [r.right - 1, r.bottom - 1],
            ].every(([x, y]) => {
              const top = document.elementFromPoint(x, y);
              return top === el || (!!top && el.contains(top));
            });
          }),
        ).toBe(true);
        const action = economy.getByRole("button", {
          name: `Queue ${track}`,
          exact: true,
        });
        expect(
          await action.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return [
              [r.left + 1, r.top + 1],
              [r.right - 1, r.bottom - 1],
            ].every(([x, y]) => {
              const top = document.elementFromPoint(x, y);
              return top === el || (!!top && el.contains(top));
            });
          }),
        ).toBe(true);
      }
      await page.screenshot({
        path: info.outputPath(`economy-settled-${label}.png`),
      });
      await geometry(page, economy);
      await economy
        .getByRole("region", { name: "Production ledger" })
        .evaluate((el) => el.scrollTo(0, 0));
      await geometry(page, economy);
    }
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Develop", exact: true }).click();
    await expect(panel).not.toContainText("Research order accepted.");
    await panel
      .getByRole("button", { name: "Build market", exact: true })
      .click();
    await expect(panel).toContainText("Construction order accepted.");
    await expect(panel.locator("header")).toContainText("96.8");
    await panel.getByRole("button", { name: /Cancel Market/i }).click();
    await expect(panel).toContainText("Cancellation accepted.");
  } finally {
    for (const context of contexts) await context.close();
  }
});
