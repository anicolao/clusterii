import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary commanders cancel an acknowledged fleet order without losing their draft", async ({
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
      const email = `cancellation-ui-${i}-${Date.now()}@example.test`;
      await login(page, email);
      await page.getByLabel("Commander name").fill(`Fleet envoy ${i + 1}`);
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
          .fill(`Cancellation horizon ${Date.now()}`);
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
    // Ordinary UI admission, real start service with an explicit test clock.
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
    const inspector = page.getByRole("complementary", {
      name: "Selected system",
    });
    await inspector.getByRole("button", { name: /Fleets · 0/ }).click();
    const panel = page.getByRole("region", {
      name: "Fleet preparation",
      exact: true,
    });
    await expect(panel.getByText("Your seat is confirmed.")).toHaveCount(0);
    await panel.getByLabel("Fighters", { exact: true }).fill("4");
    await panel.getByLabel("Infantry", { exact: true }).fill("18");
    await panel
      .getByRole("button", { name: "Form fleet", exact: true })
      .click();
    const orders = panel.getByRole("region", { name: "Accepted fleet orders" });
    await expect(orders).toContainText("4 fighters · 18 infantry");
    await page.reload();
    await inspector.getByRole("button", { name: /Fleets · 0/ }).click();
    await panel.getByLabel("Fighters", { exact: true }).fill("3");
    await orders.getByRole("button", { name: /Review cancellation/ }).click();
    async function capture(phase: string, actionName: string) {
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 720],
        ["4k", 3840, 2160],
      ] as const) {
        await page.setViewportSize({ width, height });
        const action = panel.getByRole("button", {
            name: actionName,
            exact: true,
          }),
          box = await action.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        await geometry(page, panel);
        await panel
          .getByRole("region", { name: "Fleet manifest and orders" })
          .evaluate((el) => el.scrollTo(0, el.scrollHeight));
        await page.screenshot({
          path: info.outputPath(`fleet-cancellation-${phase}-${label}.png`),
        });
      }
    }
    await capture("review", "Cancel fleet order");
    await panel
      .getByRole("button", { name: "Keep order", exact: true })
      .click();
    await expect(orders).toContainText("4 fighters · 18 infantry");
    await orders.getByRole("button", { name: /Review cancellation/ }).click();
    await panel
      .getByRole("button", { name: "Cancel fleet order", exact: true })
      .click();
    await expect(panel.locator("footer").getByRole("status")).toHaveText(
      "Fleet order cancelled. Reservations released; no forces moved.",
    );
    await expect(orders).toContainText("No fleet orders are waiting.");
    await expect(
      orders.getByRole("heading", { name: "Accepted orders" }),
    ).toBeFocused();
    await expect(panel.getByLabel("Fighters", { exact: true })).toHaveValue(
      "3",
    );
    await expect(panel.locator("#fighter-availability")).toHaveText(
      "20 available · 0 reserved",
    );
    await capture("cancelled", "Form fleet");
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    expect(await settleCampaignTicks(id, () => start + 900000)).toBe(1);
    await expect(
      panel.getByRole("button", { name: /^Fleet [0-9]+$/ }),
    ).toHaveCount(0);
    await page.reload();
    await inspector.getByRole("button", { name: /Fleets · 0/ }).click();
    await expect(orders).toContainText("No fleet orders are waiting.");
  } finally {
    for (const context of contexts) await context.close();
  }
});

test("cancellation lab preserves released reservations in both motion modes", async ({
  page,
}) => {
  await page.goto("dev/animations/");
  await page
    .getByLabel("Scenario", { exact: true })
    .selectOption("fleet-cancel");
  const standard = page.getByRole("region", {
      name: "Standard motion comparison",
    }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [time, copy] of [
    ["0", "Awaiting acknowledgement"],
    ["1200", "connection was interrupted"],
    ["2400", "Fleet order cancelled"],
  ]) {
    await page.getByLabel(/Inspect frame/).fill(time);
    for (const region of [standard, reduced]) {
      await expect(region).toContainText(copy);
      await expect(
        region.getByRole("region", { name: "Accepted fleet orders" }),
      ).toContainText(
        time === "2400"
          ? "No fleet orders are waiting."
          : "Form · 2 fighters · 10 infantry",
      );
    }
    expect(
      await standard
        .getByRole("region", { name: "Fleet manifest and orders" })
        .innerText(),
    ).toBe(
      await reduced
        .getByRole("region", { name: "Fleet manifest and orders" })
        .innerText(),
    );
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel(/Inspect frame/)).toHaveValue("0");
});
