import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary UI construction completes through real settlement with an explicit test clock", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(18 * 60 * 1000);
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
    const remaining = 900000 - (Date.now() % 900000) + 100;
    console.log(
      `Construction completion journey: waiting ${Math.ceil(remaining / 1000)}s for actual start.`,
    );
    await new Promise((r) => setTimeout(r, remaining));
    const response = await request.post(
      "http://127.0.0.1:15001/demo-clusterii/us-central1/startScheduledCampaigns-0",
      {
        headers: {
          "X-CloudScheduler-JobName": "emulator-construction-completion",
          "X-CloudScheduler-ScheduleTime": new Date().toISOString(),
        },
      },
    );
    expect(response.ok()).toBe(true);
    const page = pages[0];
    await expect(
      page.getByText("Campaign begun", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Develop", exact: true }).click();
    const panel = page.getByRole("dialog", {
      name: "System construction panel",
    });
    await panel.getByRole("radio", { name: /Training camp/ }).check();
    await panel
      .getByRole("button", { name: "Build training camp", exact: true })
      .click();
    await expect(panel).toContainText("Construction order accepted.");
    await expect(panel.locator("header")).toContainText("131");
    await expect(panel).toContainText("Queued · eligible tick 1");
    // Test clock drives the actual service on this ordinary UI campaign; no state is seeded or rewritten.
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
    expect(head.get("phase")).toBe("active");
    const start = head.get("startAt");
    expect(Number.isSafeInteger(start)).toBe(true);
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    expect(await settleCampaignTicks(id, () => start + 5 * 900000)).toBe(5);
    expect(await settleCampaignTicks(id, () => start + 5 * 900000)).toBe(0);
    await expect(panel).toContainText("Training camp · completed");
    await expect(panel.locator("header")).toContainText("145");
    await expect(
      panel.getByRole("radio", { name: /Training camp/ }),
    ).toHaveAccessibleName(/2 completed/);
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      const action = panel.getByRole("button", {
        name: "Build training camp",
        exact: true,
      });
      const box = await action.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      await geometry(page, panel);
      await panel
        .getByRole("region", { name: "Construction details" })
        .evaluate((el) => el.scrollTo(0, el.scrollHeight));
      const path = info.outputPath(`construction-completed-${label}.png`);
      await page.screenshot({ path });
      await info.attach(label, { path, contentType: "image/png" });
    }
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Develop", exact: true }),
    ).toBeFocused();
    await page.reload();
    await page.getByRole("button", { name: "Develop", exact: true }).click();
    await expect(panel).toContainText("Training camp · completed");
    await expect(panel.locator("header")).toContainText("145");
    for (const peer of pages.slice(1)) {
      await peer.getByRole("button", { name: "Economy", exact: true }).click();
      const economy = peer.getByRole("dialog", {
        name: "Empire economy panel",
      });
      await expect(economy).toContainText("Market dividends included");
      await expect(economy.locator(".balance strong")).toHaveText("216.3");
    }
  } finally {
    for (const context of contexts) await context.close();
  }
});
