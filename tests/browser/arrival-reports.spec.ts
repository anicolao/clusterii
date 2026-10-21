import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary commanders recover orbital occupation and conquest reports", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(600000);
  const contexts = [],
    pages = [];
  let url = "";
  try {
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      pages.push(page);
      const email = `arrival-ui-${i}-${Date.now()}@example.test`;
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
          .fill(`Arrival horizon ${Date.now()}`);
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
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    const { provider } = require("./lib/shared/crypto.js");
    const { context } = require("./lib/functions/src/campaigns.js");
    async function canonical() {
      const h = await db.doc(`campaignStates/${id}`).get();
      return provider("mock").open(
        h.get("envelope"),
        h.get("canonicalKey"),
        context(id, h.get("revision"), "canonical", 1),
      );
    }
    let tick = 0;
    async function advance(count: number) {
      const target = tick + count;
      while (tick < target) {
        const settled = await settleCampaignTicks(
          id,
          () => start + target * 900000,
        );
        expect(settled).toBeGreaterThan(0);
        tick += settled;
      }
      expect(tick).toBe(target);
    }
    const inspector = page.getByRole("complementary", {
      name: "Selected system",
    });
    async function research(target: string) {
      await inspector
        .getByRole("button", { name: "Economy", exact: true })
        .click();
      const panel = page.getByRole("region", {
        name: "Research selection",
        exact: true,
      });
      await panel
        .getByRole("radio", { name: new RegExp(`^${target}`) })
        .check();
      await panel
        .getByRole("button", { name: `Queue ${target}`, exact: true })
        .click();
      await expect(panel).toContainText("Research order accepted");
      await page
        .getByRole("button", { name: "Return to galaxy", exact: true })
        .click();
    }
    await advance(90);
    await research("formations");
    await advance(120);
    await research("melee");
    await advance(120);
    let state = await canonical();
    const uid = state.seats[0].uid,
      home = state.seats[0].home,
      target = state.seats[1].home;
    // The second ordinary player confirms their home in their own interface.
    const targetStar = state.galaxy.stars.find((s: any) => s.id === target);
    await expect(
      pages[1].getByRole("complementary", { name: "Selected system" }),
    ).toContainText(targetStar.name);
    // Route planning uses only the public catalogue and our own navigation.
    const range = state.economy.research[uid].levels.navigation * 10;
    const paths = new Map<string, string[]>([[home, []]]),
      queue = [home];
    for (const from of queue) {
      const a = state.galaxy.stars.find((s: any) => s.id === from);
      for (const b of state.galaxy.stars) {
        if (
          paths.has(b.id) ||
          (state.galaxy.homes.includes(b.id) && b.id !== target) ||
          Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > range
        )
          continue;
        paths.set(b.id, [...paths.get(from)!, b.id]);
        queue.push(b.id);
      }
    }
    const route = paths.get(target)!;
    expect(route).toBeTruthy();
    expect(route.length).toBeLessThanOrEqual(16);
    const panel = page.getByRole("region", {
      name: "Fleet preparation",
      exact: true,
    });
    async function form(fighters: number, infantry: number) {
      await inspector.getByRole("button", { name: /Fleets/ }).click();
      await panel
        .getByLabel("Fighters", { exact: true })
        .fill(String(fighters));
      await panel
        .getByLabel("Infantry", { exact: true })
        .fill(String(infantry));
      await panel
        .getByRole("button", { name: "Form fleet", exact: true })
        .click();
      await expect(
        panel.getByRole("region", { name: "Accepted fleet orders" }),
      ).toContainText(`${fighters} fighters · ${infantry} infantry`);
      await advance(1);
      state = await canonical();
      const number = Math.max(
        ...Object.values(state.military.fleets)
          .filter((f: any) => f.uid === uid)
          .map((f: any) => f.number),
      );
      await panel
        .getByRole("button", { name: `Fleet ${number}`, exact: true })
        .click();
      return number;
    }
    async function send(number: number, waypoints: string[] = route) {
      await panel
        .getByRole("button", { name: "Plot route", exact: true })
        .click();
      const planner = page.getByRole("region", {
        name: "Fleet route planner",
        exact: true,
      });
      const replan = planner.getByRole("button", {
        name: "Plan another route",
        exact: true,
      });
      if (await replan.isVisible()) await replan.click();
      const remove = planner.getByRole("button", {
        name: "Remove waypoint 1",
        exact: true,
      });
      while (await remove.count()) await remove.click();
      for (const starId of waypoints) {
        const name = state.galaxy.stars.find((s: any) => s.id === starId).name;
        await planner
          .getByRole("searchbox", { name: "Find a waypoint" })
          .fill(name);
        await planner
          .getByRole("button", { name: `Add ${name} waypoint`, exact: true })
          .click();
      }
      await planner
        .getByRole("button", { name: "Send fleet", exact: true })
        .click();
      await expect(planner.locator("footer").getByRole("status")).toContainText(
        "Route accepted",
      );
      await planner.getByRole("button", { name: "Back to fleets" }).click();
      await panel.getByRole("button", { name: "Back to system" }).click();
      await advance(1);
      state = await canonical();
      let fleet = Object.values(state.military.fleets).find(
        (f: any) => f.uid === uid && f.number === number,
      ) as any;
      while (fleet?.travel) {
        await advance(Math.max(1, fleet.travel.arrivalTick - tick));
        state = await canonical();
        fleet = Object.values(state.military.fleets).find(
          (f: any) => f.uid === uid && f.number === number,
        );
      }
    }
    const first = await form(Math.floor(state.systems[home].fighters * 0.9), 0);
    await send(first);
    state = await canonical();
    expect(state.systems[target].orbit).toBe(uid);
    expect(state.systems[target].surface).toBe(state.seats[1].uid);
    const open = inspector.getByRole("button", {
      name: "Arrival reports",
      exact: true,
    });
    await open.click();
    const reports = page.getByRole("region", {
      name: "Arrival reports",
      exact: true,
    });
    await expect(
      reports.getByRole("heading", { name: "Orbit secured", exact: true }),
    ).toBeVisible();
    await expect(reports).toContainText("Surface remains Fleet envoy 2-held");
    await expect(reports).toContainText("The held balance is private");
    async function evidence(phase: string) {
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 720],
        ["4k", 3840, 2160],
      ] as const) {
        await page.setViewportSize({ width, height });
        const action = reports.getByRole("button", {
          name: "Inspect surface",
          exact: true,
        });
        const box = await action.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        await geometry(page, reports);
        await reports
          .getByRole("region", { name: "Arrival report details" })
          .evaluate((el) => el.scrollTo(0, 0));
        await page.screenshot({
          path: info.outputPath(`arrival-${phase}-${label}.png`),
        });
      }
    }
    await evidence("occupation");
    await page.keyboard.press("Escape");
    await expect(open).toBeFocused();
    await page.reload();
    await open.click();
    await expect(
      reports.getByRole("heading", { name: "Orbit secured", exact: true }),
    ).toBeVisible();
    await reports
      .getByRole("button", { name: "Inspect surface", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      inspector.getByRole("region", { name: "System details" }),
    ).toBeFocused();
    await expect(inspector).toContainText(targetStar.name);
    // Return to our real home before forming the second wave.
    await inspector
      .getByRole("button", { name: "Systems list", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Center home", exact: true })
      .click();
    state = await canonical();
    const available = state.systems[home];
    const second = await form(
      available.fighters,
      Math.min(available.infantry, available.fighters * 10),
    );
    // Intermediate neutral surfaces receive automatic landings. Load those
    // same troops again through the ordinary cargo interface before each leg.
    for (const [index, starId] of route.entries()) {
      if (index > 0) {
        await inspector.getByRole("button", { name: /Fleets/ }).click();
        await panel
          .getByRole("button", { name: `Fleet ${second}`, exact: true })
          .click();
        const fleet = Object.values(state.military.fleets).find(
          (f: any) => f.uid === uid && f.number === second,
        ) as any;
        if (!fleet.infantry) {
          const infantry = state.systems[fleet.starId].infantry;
          expect(infantry).toBeGreaterThan(0);
          await panel
            .getByRole("button", { name: "Load", exact: true })
            .click();
          await panel
            .getByLabel("Infantry to load", { exact: true })
            .fill(String(infantry));
          await panel
            .getByRole("button", { name: "Load infantry", exact: true })
            .click();
          await expect(
            panel.getByRole("region", { name: "Accepted fleet orders" }),
          ).toContainText("Load");
          await advance(1);
          await expect(panel).toContainText(`${infantry} infantry loaded.`);
          state = await canonical();
          expect(state.military.fleets[fleet.id].infantry).toBe(infantry);
        }
      }
      await send(second, [starId]);
      state = await canonical();
    }
    state = await canonical();
    expect(state.systems[target].surface).toBe(uid);
    expect(state.systems[target].escrowMilli).toBe(0);
    const released = state.military.arrivals[uid].find(
      (r: any) => r.starId === target,
    ).detail.releasedEscrowMilli;
    expect(released).toBeGreaterThan(0);
    await open.click();
    // A new report does not replace the record already being read.
    await expect(
      reports.getByRole("heading", { name: "Orbit secured", exact: true }),
    ).toBeVisible();
    await reports
      .getByRole("button", {
        name: `${targetStar.name} · tick ${tick}`,
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      reports.getByRole("heading", { name: "System secured", exact: true }),
    ).toBeVisible();
    await expect(reports).toContainText(
      `${released / 1000} held credits released to you once.`,
    );
    await evidence("conquest");
    const defender = pages[1];
    await defender
      .getByRole("button", { name: "Arrival reports", exact: true })
      .click();
    const defenderReport = defender.getByRole("region", {
      name: "Arrival reports",
      exact: true,
    });
    await expect(defenderReport).toContainText("Arrival resolved");
    await expect(defenderReport).toContainText(
      "This report records no credit release to you",
    );
    await expect(defenderReport).not.toContainText(
      `${released / 1000} held credits`,
    );
    await defenderReport
      .locator("summary")
      .filter({ hasText: "Losses and effectiveness" })
      .click();
    await expect(defenderReport).toContainText("Your melee: 1");
    await defender.screenshot({
      path: info.outputPath("arrival-defeat-desktop.png"),
    });
    await advance(1);
    state = await canonical();
    expect(state.economy.ledger[uid].releasedEscrowMilli).toBe(0);
    await page.reload();
    await open.click();
    await expect(reports).toContainText(
      `${released / 1000} held credits released to you once.`,
    );
  } finally {
    for (const context of contexts) await context.close();
  }
});
test("arrival report lab preserves losses through recovery and reduced motion", async ({
  page,
}) => {
  await page.goto("dev/animations/");
  await page.getByLabel("Scenario", { exact: true }).selectOption("arrivals");
  const standard = page.getByRole("region", {
      name: "Standard motion comparison",
    }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [time, copy] of [
    ["0", "No arrival reports"],
    ["1200", "Orbit secured"],
    ["2400", "History could not be recovered"],
    ["3400", "System secured"],
  ]) {
    await page.getByLabel(/Inspect frame/).fill(time);
    for (const region of [standard, reduced])
      await expect(region).toContainText(copy);
    expect(
      await standard
        .getByRole("region", { name: "Arrival report details" })
        .innerText(),
    ).toBe(
      await reduced
        .getByRole("region", { name: "Arrival report details" })
        .innerText(),
    );
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel(/Inspect frame/)).toHaveValue("0");
});
