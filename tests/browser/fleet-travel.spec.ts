import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary commanders preview, send and recover a real fleet route", async ({
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
      const email = `travel-ui-${i}-${Date.now()}@example.test`;
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
          .fill(`Travel horizon ${Date.now()}`);
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
    const source = panel.getByRole("button", { name: /^Fleet [0-9]+$/ });
    const fleetName = await source.innerText();
    await source.click();
    await panel
      .getByRole("button", { name: "Plot route", exact: true })
      .click();
    const planner = page.getByRole("region", {
        name: "Fleet route planner",
        exact: true,
      }),
      details = planner.getByRole("region", {
        name: "Route details",
        exact: true,
      });
    await expect(details).toBeFocused();
    await expect(planner.locator("footer")).not.toContainText("Fleet formed");
    const catalogue = planner.getByRole("region", {
      name: "Waypoint catalogue",
    });
    const targetLabel = await catalogue
      .locator("button")
      .evaluateAll((buttons) => buttons[0].getAttribute("aria-label")!);
    const target = targetLabel.slice(4, -9);
    await planner
      .getByRole("searchbox", { name: "Find a waypoint" })
      .fill(target);
    await planner
      .getByRole("button", { name: targetLabel, exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      planner.getByRole("list", { name: "Route waypoints" }),
    ).toContainText(target);
    await planner.getByRole("searchbox", { name: "Find a waypoint" }).fill("");
    const distantLabel = await catalogue
      .locator("button")
      .evaluateAll((buttons) =>
        buttons
          .find((b) => b.textContent?.includes("Beyond range"))!
          .getAttribute("aria-label")!,
      );
    await planner
      .getByRole("searchbox", { name: "Find a waypoint" })
      .fill(distantLabel.slice(4, -9));
    await planner
      .getByRole("button", { name: distantLabel, exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      planner.getByRole("button", { name: "Send fleet", exact: true }),
    ).toBeDisabled();
    await expect(planner.locator("footer")).toContainText(
      "exceeds navigation range",
    );
    await planner
      .getByRole("button", { name: "Move waypoint 2 earlier" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      planner
        .getByRole("list", { name: "Route waypoints" })
        .locator("li")
        .nth(0),
    ).toContainText(distantLabel.slice(4, -9));
    await planner
      .getByRole("button", { name: "Move waypoint 1 later" })
      .focus();
    await page.keyboard.press("Enter");
    await planner.getByRole("button", { name: "Remove waypoint 2" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      planner.getByRole("button", { name: "Send fleet", exact: true }),
    ).toBeEnabled();
    await planner.getByRole("button", { name: "Back to fleets" }).click();
    await expect(
      panel.getByRole("button", { name: "Plot route" }),
    ).toBeFocused();
    await panel.getByRole("button", { name: "Plot route" }).click();
    await expect(
      planner.getByRole("list", { name: "Route waypoints" }),
    ).toContainText(target);
    await planner
      .getByRole("searchbox", { name: "Find a waypoint" })
      .fill(target);
    async function evidence(phase: string) {
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 720],
        ["4k", 3840, 2160],
      ] as const) {
        await page.setViewportSize({ width, height });
        const action = planner.getByRole("button", {
          name: phase === "arrived" ? "Plan another route" : "Send fleet",
          exact: true,
        });
        const box = await action.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        await geometry(page, planner);
        await details.evaluate((el) => el.scrollTo(0, 0));
        await page.screenshot({
          path: info.outputPath(`fleet-route-${phase}-${label}.png`),
        });
      }
    }
    await evidence("draft");
    await planner
      .getByRole("button", { name: "Send fleet", exact: true })
      .click();
    await expect(planner.locator("footer").getByRole("status")).toHaveText(
      "Route accepted. Departure scheduled.",
    );
    await expect(details.getByRole("status")).toContainText("departure tick 2");
    await page.reload();
    await inspector.getByRole("button", { name: /Fleets/ }).click();
    await panel.getByRole("button", { name: fleetName, exact: true }).click();
    await panel.getByRole("button", { name: "Plot route" }).click();
    await expect(details.getByRole("status")).toContainText("Route accepted");
    expect(await settleCampaignTicks(id, () => start + 1800000)).toBe(1);
    await expect(details.getByRole("status")).toContainText("Traveling");
    await expect(
      planner.getByRole("button", { name: "Send fleet" }),
    ).toBeDisabled();
    await evidence("traveling");
    const arrivalText = await details.getByRole("status").innerText();
    const arrivalTick = Number(arrivalText.match(/arrival tick (\d+)/)![1]);
    expect(arrivalTick).toBeGreaterThan(2);
    expect(
      await settleCampaignTicks(id, () => start + arrivalTick * 900000),
    ).toBe(arrivalTick - 2);
    await expect(
      details.getByRole("status").filter({ hasText: "Arrived at" }),
    ).toContainText(target);
    await expect(
      details.getByRole("article", { name: "Arrival report" }),
    ).toContainText("infantry, including the surface");
    await evidence("arrived");
    // A second order stays mounted from receipt to settlement, proving that a
    // departure acknowledgement is replaced by its matching final outcome.
    await planner.getByRole("button", { name: "Plan another route" }).click();
    const nextLabel = await catalogue
      .locator("button")
      .evaluateAll((buttons) => buttons[0].getAttribute("aria-label")!);
    await planner
      .getByRole("searchbox", { name: "Find a waypoint" })
      .fill(nextLabel.slice(4, -9));
    await planner.getByRole("button", { name: nextLabel, exact: true }).click();
    await planner
      .getByRole("button", { name: "Send fleet", exact: true })
      .click();
    await expect(planner.locator("footer").getByRole("status")).toContainText(
      "Route accepted",
    );
    expect(
      await settleCampaignTicks(id, () => start + (arrivalTick + 1) * 900000),
    ).toBe(1);
    await expect(planner.locator("footer").getByRole("status")).toContainText(
      "Fleet departed",
    );
    const nextTick = Number(
      (await details.getByRole("status").innerText()).match(
        /arrival tick (\d+)/,
      )![1],
    );
    expect(await settleCampaignTicks(id, () => start + nextTick * 900000)).toBe(
      nextTick - arrivalTick - 1,
    );
    await expect(planner.locator("footer").getByRole("status")).toHaveText(
      "Fleet arrived. Review its surviving forces and system control.",
    );

    await planner.getByRole("button", { name: "Back to fleets" }).click();
    await expect(
      panel.getByRole("button", { name: "Plot route" }),
    ).toBeFocused();
    await expect(panel).toContainText(`Stationed at ${nextLabel.slice(4, -9)}`);
    await page.reload();
    await inspector.getByRole("button", { name: /Fleets/ }).click();
    await panel.getByRole("button", { name: fleetName, exact: true }).click();
    await expect(panel).toContainText(`Stationed at ${nextLabel.slice(4, -9)}`);
  } finally {
    for (const context of contexts) await context.close();
  }
});

test("route lab retains the same real departure and arrival under reduced motion", async ({
  page,
}) => {
  await page.goto("dev/animations/");
  await page.getByLabel("Scenario", { exact: true }).selectOption("travel");
  const standard = page.getByRole("region", {
      name: "Standard motion comparison",
    }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [time, copy] of [
    ["0", "Awaiting acknowledgement"],
    ["1200", "connection was interrupted"],
    ["2400", "Route accepted"],
    ["3400", "Traveling"],
    ["5000", "Arrived at"],
  ]) {
    await page.getByLabel(/Inspect frame/).fill(time);
    for (const region of [standard, reduced])
      await expect(region).toContainText(copy);
    expect(
      await standard
        .getByRole("region", { name: "Route details", exact: true })
        .innerText(),
    ).toBe(
      await reduced
        .getByRole("region", { name: "Route details", exact: true })
        .innerText(),
    );
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel(/Inspect frame/)).toHaveValue("0");
});
