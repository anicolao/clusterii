import { acknowledgeCampaignStart, openGalaxyCommand, openForces } from "./galaxy-navigation";
import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary observers recover acquired and last-seen fleet contacts", async ({
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
      const email = `contact-ui-${i}-${Date.now()}@example.test`;
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
          .fill(`Contact horizon ${Date.now()}`);
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
    await openForces(page, 0);
    const panel = page.getByRole("region", {
      name: "Fleet preparation",
      exact: true,
    });
    await expect(panel.getByText("Your seat is confirmed.")).toHaveCount(0);
    await panel.getByLabel("Fighters", { exact: true }).fill("4");
    await panel.getByLabel("Infantry", { exact: true }).fill("6");
    await panel
      .getByRole("button", { name: "Form fleet", exact: true })
      .click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("4 fighters · 6 infantry");
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    expect(await settleCampaignTicks(id, () => start + 900000)).toBe(1);
    const { provider } = require("./lib/shared/crypto.js"),
      { context } = require("./lib/functions/src/campaigns.js");
    const snapshot = await db.doc(`campaignStates/${id}`).get();
    const canonical = await provider("mock").open(
      snapshot.get("envelope"),
      snapshot.get("canonicalKey"),
      context(id, snapshot.get("revision"), "canonical", 1),
    );
    const fleet = Object.values(canonical.military.fleets)[0] as {
      id: string;
      starId: string;
    };
    const {
        observationDraw,
      } = require("./lib/functions/src/observation-random.js"),
      {
        detectionProbability,
        drawRange,
      } = require("./lib/shared/observations.js"),
      { distance } = require("./lib/shared/galaxy.js");
    const source = canonical.galaxy.stars.find(
        (s: { id: string }) => s.id === canonical.seats[1].home,
      ),
      target = canonical.galaxy.stars.find(
        (s: { id: string }) => s.id === fleet.starId,
      );
    const probability = detectionProbability(1, distance(source, target));
    const hit = (tick: number) =>
      observationDraw(
        canonical.seed,
        id,
        canonical.seats[1].uid,
        `fleet:${fleet.id}`,
        tick,
      ) /
        drawRange <
      probability;
    const acquiredTick = Array.from({ length: 94 }, (_, i) => i + 2).find(hit)!;
    expect(acquiredTick).toBeDefined();
    expect(
      await settleCampaignTicks(id, () => start + acquiredTick * 900000),
    ).toBe(acquiredTick - 1);
    const observer = pages[1];
    const open = observer.getByRole("button", {
      name: "Fleet contacts",
      exact: true,
    });
    await openGalaxyCommand(observer, "Fleet contacts");
    const contacts = observer.getByRole("region", {
      name: "Fleet contacts",
      exact: true,
    });
    await expect(
      contacts.getByRole("article", { name: "Selected fleet contact" }),
    ).toContainText(`Observed tick ${acquiredTick}`);
    await expect(contacts).toContainText("Current tick observation");
    await expect(contacts).toContainText("Route and destination are private");
    const details = contacts.getByRole("region", {
      name: "Contact details",
      exact: true,
    });
    async function evidence(phase: string) {
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 720],
        ["4k", 3840, 2160],
      ] as const) {
        await observer.setViewportSize({ width, height });
        const back = contacts.getByRole("button", { name: "Back to galaxy" });
        const box = await back.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        await geometry(observer, contacts);
        await details.evaluate((el) => el.scrollTo(0, 0));
        await observer.screenshot({
          path: info.outputPath(`fleet-contacts-${phase}-${label}.png`),
        });
      }
    }
    await evidence("current");
    const missedTick = Array.from(
      { length: 94 },
      (_, i) => i + acquiredTick + 1,
    ).find((t) => !hit(t))!;
    expect(missedTick).toBeDefined();
    expect(
      await settleCampaignTicks(id, () => start + missedTick * 900000),
    ).toBe(missedTick - acquiredTick);
    await expect(contacts).toContainText("Last seen; current position unknown");
    await contacts
      .getByRole("button", { name: "Refresh observations" })
      .click();
    // Wait for the refreshed history head before enumerating its controls.
    // The prior observed tick already matches while the request is pending.
    await expect(
      contacts.getByRole("button", { name: "Refresh observations" }),
    ).toHaveCount(0);
    await expect(
      contacts.getByText("Loading authorized contact records…", { exact: true }),
    ).toHaveCount(0);
    await expect(contacts.getByRole("alert")).toHaveCount(0);
    await expect(
      contacts.getByRole("article", { name: "Selected fleet contact" }),
    ).toContainText(`Observed tick ${missedTick - 1}`);
    await evidence("last-seen");
    await contacts.getByRole("button", { name: "Back to galaxy" }).click();
    await expect(open).toBeFocused();
    await observer.reload();
    await openGalaxyCommand(observer, "Fleet contacts");
    await expect(contacts).toContainText("Last seen; current position unknown");
    await expect(
      contacts.getByRole("article", { name: "Selected fleet contact" }),
    ).toContainText(`Observed tick ${missedTick - 1}`);
    await observer.keyboard.press("Escape");
    await expect(open).toBeFocused();
  } finally {
    for (const context of contexts) await context.close();
  }
});
test("fleet contact lab preserves exact acquired facts under replay and reduced motion", async ({
  page,
}) => {
  await page.goto("dev/animations/");
  await page.getByLabel("Scenario", { exact: true }).selectOption("contacts");
  const standard = page.getByRole("region", {
      name: "Standard motion comparison",
    }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [time, copy] of [
    ["0", "No fleet contacts"],
    ["1200", "Current tick observation"],
    ["3400", "Last seen; current position unknown"],
  ]) {
    await page.getByLabel(/Inspect frame/).fill(time);
    for (const region of [standard, reduced])
      await expect(region).toContainText(copy);
    expect(
      await standard
        .getByRole("region", { name: "Contact details", exact: true })
        .innerText(),
    ).toBe(
      await reduced
        .getByRole("region", { name: "Contact details", exact: true })
        .innerText(),
    );
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel(/Inspect frame/)).toHaveValue("0");
});
