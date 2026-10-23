import { acknowledgeCampaignStart, openGalaxyCommand, openObservation } from "./galaxy-navigation";
import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary commanders inspect current, unknown and historical stellar observations", async ({
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
      const email = `observation-ui-${i}-${Date.now()}@example.test`;
      await login(page, email);
      await page
        .getByLabel("Commander name")
        .fill(`Observation envoy ${i + 1}`);
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
          .fill(`Observation horizon ${Date.now()}`);
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
    await acknowledgeCampaignStart(page);
    const inspector = page.getByRole("complementary", {
      name: "Selected system",
    });
    await openObservation(page);
    const observation = inspector.getByRole("region", {
      name: "Stellar observation",
    });
    await expect(observation).toContainText(
      "Unknown · no observation acquired",
    );
    const { provider } = require("./lib/shared/crypto.js");
    const { context } = require("./lib/functions/src/campaigns.js");
    const canonical = async () => {
      const snap = await db.doc(`campaignStates/${id}`).get();
      return provider("mock").open(
        snap.get("envelope"),
        snap.get("canonicalKey"),
        context(id, snap.get("revision"), "canonical", 1),
      );
    };
    const initial = await canonical();
    const uid = initial.seats[0].uid;
    const home = initial.galaxy.stars.find(
      (star: { id: string }) => star.id === initial.seats[0].home,
    );
    const nearby = initial.galaxy.stars.find(
      (star: { id: string; x: number; y: number; z: number }) =>
        star.id !== home.id &&
        Math.hypot(star.x - home.x, star.y - home.y, star.z - home.z) <= 10,
    );
    expect(nearby).toBeTruthy();
    const select = async (name: string) => {
      await openGalaxyCommand(page, "Systems list");
      await page.getByLabel("Find a system").fill(name);
      await page
        .getByRole("button", {
          name: `Select ${name}, ${(await canonical()).galaxy.stars.find((star: { name: string }) => star.name === name).class} class`,
          exact: true,
        })
        .click();
      await expect(inspector.getByRole("heading", { level: 2 })).toContainText(
        name,
      );
      await openObservation(page);
    };
    await select(nearby.name);
    await expect(observation).toContainText(
      "Unknown · no observation acquired",
    );
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    expect(await settleCampaignTicks(id, () => start + 900000)).toBe(1);
    await expect(
      observation.getByRole("status", { name: "Observation age" }),
    ).toHaveText("Current observation · tick 1");
    await expect(observation).toContainText("Unclaimed");
    await expect(observation).toContainText("100% acquisition probability");
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      const tab = inspector.getByRole("button", {
        name: "Return to system",
        exact: true,
      });
      const box = await tab.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      const details = inspector.getByRole("region", { name: "System details" });
      await details.evaluate((el) => el.scrollTo(0, 0));
      const ageBox = await observation
        .getByRole("status", { name: "Observation age" })
        .boundingBox();
      expect(ageBox!.y).toBeGreaterThanOrEqual(box!.y + box!.height);
      expect(ageBox!.y + ageBox!.height).toBeLessThanOrEqual(height);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight &&
            document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const bounds = await details.boundingBox();
      // Navigation must leave enough room for the pinned age and readable detail.
      expect(bounds!.height).toBeGreaterThanOrEqual(ageBox!.height * 2);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      await details.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      const pinned = await observation
        .getByRole("status", { name: "Observation age" })
        .boundingBox();
      expect(pinned!.y).toBeGreaterThanOrEqual(bounds!.y - 1);
      expect(pinned!.y + pinned!.height).toBeLessThanOrEqual(
        bounds!.y + bounds!.height,
      );
      await geometry(page, inspector);
      await inspector
        .getByRole("region", { name: "System details" })
        .evaluate((el) => el.scrollTo(0, 0));
      await page.screenshot({
        path: info.outputPath(`observation-current-${label}.png`),
      });
    }
    const after = await canonical();
    const unknown = after.galaxy.stars.find(
      (star: { id: string }) => !after.intelligence.reports[uid][star.id],
    );
    expect(unknown).toBeTruthy();
    await select(unknown.name);
    await expect(observation).toContainText(
      "Unknown · no observation acquired",
    );
    await expect(
      observation.getByText("Stationed fighters", { exact: true }),
    ).toHaveCount(0);
    // Use the actual private report set after settlement; never inject scan outcomes.
    let staleId: string | undefined,
      current = after;
    for (let tick = 2; tick <= 8 && !staleId; tick++) {
      expect(await settleCampaignTicks(id, () => start + tick * 900000)).toBe(
        1,
      );
      current = await canonical();
      staleId = Object.keys(current.intelligence.reports[uid]).find(
        (key) => current.intelligence.reports[uid][key][0] < tick,
      );
    }
    expect(staleId).toBeTruthy();
    const stale = current.galaxy.stars.find(
        (star: { id: string }) => star.id === staleId,
      ),
      observedAt = current.intelligence.reports[uid][staleId!][0];
    await select(stale.name);
    await expect(
      observation.getByRole("status", { name: "Observation age" }),
    ).toContainText("Last observed");
    await expect(observation).toContainText("These are historical facts.");
    await page.reload();
    await openObservation(page);
    await select(stale.name);
    await expect(
      observation.getByRole("status", { name: "Observation age" }),
    ).toContainText(`tick ${observedAt}`);
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      await inspector
        .getByRole("region", { name: "System details" })
        .evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.screenshot({
        path: info.outputPath(`observation-stale-${label}.png`),
      });
    }
  } finally {
    for (const context of contexts) await context.close();
  }
});

test("observation lab preserves historical facts across replay and reduced motion", async ({
  page,
}, info) => {
  await page.goto("dev/animations/");
  await page
    .getByLabel("Scenario", { exact: true })
    .selectOption("observation");
  const seek = page.getByLabel(/Inspect frame/),
    standard = page.getByRole("region", { name: "Standard motion comparison" }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [time, age] of [
    ["0", "Unknown · no observation acquired"],
    ["1200", "Current observation · tick 1"],
    ["3400", "Last observed 1 tick ago · tick 1"],
  ] as const) {
    await seek.fill(time);
    for (const panel of [standard, reduced])
      await expect(panel).toContainText(age);
  }
  expect(await standard.locator("dl").innerText()).toBe(
    await reduced.locator("dl").innerText(),
  );
  await seek.fill("1200");
  const facts = await standard.locator("dl").innerText();
  await seek.fill("3400");
  expect(await standard.locator("dl").innerText()).toBe(facts);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(standard).toContainText("Unknown · no observation acquired");
  for (const [label, width, height] of [
    ["phone", 393, 852],
    ["desktop", 1440, 1000],
    ["short", 1280, 720],
    ["4k", 3840, 2160],
  ] as const) {
    await page.setViewportSize({ width, height });
    await seek.fill("3400");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await standard.screenshot({
      path: info.outputPath(`observation-lab-${label}.png`),
    });
  }
});
