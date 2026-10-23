import { acknowledgeCampaignStart, openConstruction, openGalaxyCommand } from "./galaxy-navigation";
import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("market allocation preserves drafts, acknowledges orders and changes dividends after the frozen tick", async ({
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
    await acknowledgeCampaignStart(page);
    await openConstruction(page, "Orbit");
    const construction = page.getByRole("dialog", {
      name: "System construction panel",
    });
    await construction.getByRole("radio", { name: /Training camp/ }).check();
    await construction
      .getByRole("button", { name: "Build training camp", exact: true })
      .click();
    await expect(construction).toContainText("Construction order accepted.");
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    expect(await settleCampaignTicks(id, () => start + 4 * 900000)).toBe(4);
    const investor = pages[1];
    await openGalaxyCommand(investor, "Economy");
    await investor
      .getByRole("button", { name: "Market focus", exact: true })
      .click();
    const panel = investor.getByRole("region", {
      name: "Market focus",
      exact: true,
    });
    await expect(
      panel.getByRole("heading", { name: "Market focus", exact: true }),
    ).toBeFocused();
    await expect(
      panel.getByRole("button", { name: "Apply focus", exact: true }),
    ).toBeDisabled();
    await panel.getByLabel("Market points", { exact: true }).fill("100");
    await expect(panel).toContainText("75 over allocation");
    await expect(
      panel.getByRole("button", { name: "Apply focus", exact: true }),
    ).toBeDisabled();
    for (const name of ["Training camp", "Base", "Space station"])
      await panel.getByLabel(`${name} points`, { exact: true }).fill("0");
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await investor.setViewportSize({ width, height });
      const action = panel.getByRole("button", {
        name: "Apply focus",
        exact: true,
      });
      const box = await action.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      await geometry(investor, panel);
      for (const input of await panel.locator('input[type="number"]').all())
        expect(
          await input.evaluate((el) => {
            const node = el as HTMLInputElement,
              css = getComputedStyle(node),
              ctx = document.createElement("canvas").getContext("2d")!;
            ctx.font = css.font;
            return (
              ctx.measureText(node.value).width +
                parseFloat(css.paddingLeft) +
                parseFloat(css.paddingRight) +
                20 <=
              node.getBoundingClientRect().width
            );
          }),
        ).toBe(true);
      await panel
        .getByRole("region", { name: "Focus allocation details" })
        .evaluate((el) => el.scrollTo(0, 0));
      await investor.screenshot({
        path: info.outputPath(`focus-draft-${label}.png`),
      });
    }
    await panel
      .getByRole("button", { name: "Apply focus", exact: true })
      .click();
    await expect(panel).toContainText("Focus order accepted.");
    await expect(panel).toContainText("Applies tick 5 · dividends from tick 6");
    await investor.reload();
    await openGalaxyCommand(investor, "Economy");
    await investor
      .getByRole("button", { name: "Market focus", exact: true })
      .click();
    await expect(
      panel.getByLabel("Market points", { exact: true }),
    ).toHaveValue("100");
    await expect(panel).toContainText("Applies tick 5");
    expect(await settleCampaignTicks(id, () => start + 5 * 900000)).toBe(1);
    expect(await settleCampaignTicks(id, () => start + 5 * 900000)).toBe(0);
    await expect(
      panel.getByRole("status", { name: "Applied market focus" }),
    ).toContainText("Focus applied at tick 5");
    await expect(
      panel.getByRole("region", { name: "Confirmed market income" }),
    ).toContainText("2.3");
    await panel
      .getByRole("button", { name: "Back to economy", exact: true })
      .click();
    await expect(
      investor.getByRole("button", { name: "Market focus", exact: true }),
    ).toBeFocused();
    const economy = investor.getByRole("dialog", {
      name: "Empire economy panel",
    });
    await expect(economy.locator(".balance strong")).toHaveText("216.3");
    await expect(economy).toContainText("Market dividends included");
    await construction
      .getByRole("button", { name: "Build training camp", exact: true })
      .click();
    await expect(construction).toContainText("Queued · eligible tick 6");
    expect(await settleCampaignTicks(id, () => start + 10 * 900000)).toBe(5);
    await expect(economy.locator(".balance strong")).toHaveText("230.3");
    await expect(economy).not.toContainText("Market dividends included");
    await investor
      .getByRole("button", { name: "Market focus", exact: true })
      .click();
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await investor.setViewportSize({ width, height });
      await panel
        .getByRole("region", { name: "Focus allocation details" })
        .evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await investor.screenshot({
        path: info.outputPath(`focus-applied-${label}.png`),
      });
    }
  } finally {
    for (const context of contexts) await context.close();
  }
});

test("market focus lab replays accepted and applied allocations with equal reduced-motion outcomes", async ({
  page,
}, info) => {
  await page.goto("dev/animations/");
  await page
    .getByLabel("Scenario", { exact: true })
    .selectOption("market-focus");
  const seek = page.getByLabel(/Inspect frame/);
  const standard = page.getByRole("region", {
      name: "Standard motion comparison",
    }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [at, text] of [
    ["0", "Awaiting acknowledgement"],
    ["1200", "connection was interrupted"],
    ["2400", "Focus order accepted"],
    ["3400", "Focus applied at tick 1"],
  ] as const) {
    await seek.fill(at);
    for (const panel of [standard, reduced])
      await expect(panel).toContainText(text);
  }
  for (const panel of [standard, reduced])
    await expect(
      panel.getByLabel("Market points", { exact: true }),
    ).toHaveValue("40");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    standard.getByLabel("Market points", { exact: true }),
  ).toHaveValue("25");
  for (const [label, width, height] of [
    ["phone", 393, 852],
    ["desktop", 1440, 1000],
    ["short", 1280, 720],
    ["4k", 3840, 2160],
  ] as const) {
    await page.setViewportSize({ width, height });
    await seek.fill("3400");
    await expect(standard).toContainText("Focus applied at tick 1");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await standard.screenshot({
      path: info.outputPath(`focus-lab-${label}.png`),
    });
  }
});
