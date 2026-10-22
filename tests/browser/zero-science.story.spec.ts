import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import type { Page, BrowserContext, Locator } from "@playwright/test";
import type { Campaign, CampaignView } from "../../shared/campaign";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { expectReadingTarget } from "./story-helpers/reading-target";
import { distance } from "../../shared/galaxy";
import { routePreview } from "../../shared/travel";
import { login, grantDeveloper } from "./helpers";
import { admissionAt, scheduledAt } from "./story-helpers/admission-clock.mjs";
import { fleetStoryPrefix } from "./story-helpers/fleet-clock.mjs";
const button = (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true });
const panel = (p: Page) =>
  p.getByRole("region", { name: "Fleet preparation", exact: true });
const manifest = (p: Page) =>
  panel(p).getByRole("region", { name: "Fleet manifest and orders" });
const orders = (p: Page) =>
  panel(p).getByRole("region", { name: "Accepted fleet orders" });
const inspector = (p: Page) =>
  p.getByRole("complementary", { name: "Selected system" });
const aliases = [
  "Fleet marshal",
  "Independent marshal",
  "Outer witness",
  "Fourth envoy",
];
async function rail(p: Page) {
  const r = await panel(p).locator("footer").boundingBox();
  expect(r).not.toBeNull();
  expect(r!.y).toBeGreaterThanOrEqual(0);
  expect(r!.y + r!.height).toBeLessThanOrEqual(p.viewportSize()!.height);
}
async function read(p: Page, target: Locator) {
  await rail(p);
  await manifest(p).focus();
  await target.scrollIntoViewIfNeeded();
  const a = await manifest(p).boundingBox(),
    b = await target.boundingBox();
  expect(b!.y).toBeGreaterThanOrEqual(a!.y);
  expect(b!.y + b!.height).toBeLessThanOrEqual(a!.y + a!.height);
}
test("Live zero science after orbital loss preserves private research", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-zero-science",
    title: "Recover research after losing orbital science",
    inventory: ["UX-07", "UX-08", "UX-09", "UX-14", "UX-15", "UX-16"],
    description:
      "Four independently authenticated commanders use real fleet controls after100 earned ticks. An escape and rival route produce actual orbital loss, zero science and retained surface control. Owner and peer recover private research through reload. Fixed catalogue/domain clocks are explicit harness controls; budgets are220 ticks,240 seconds and16 captures per viewport. Rules remain under review; this does not certify managed encryption or hosted scheduling.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let id = "",
    url = "";
  const campaignName = `${fleetStoryPrefix}zero science ${info.project.name}`;
  const views = () =>
    pages.slice(0, 2).map((page, i) => ({
      page,
      player: aliases[i],
      surface: "game" as const,
    }));
  const require = createRequire(
    new URL("../../functions/package.json", import.meta.url),
  );
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const db = require("firebase-admin/firestore").getFirestore();
  const { provider, unwrap } = require("./lib/shared/crypto.js"),
    { context } = require("./lib/functions/src/campaigns.js"),
    { settleCampaignTicks } = require("./lib/functions/src/production.js");
  const canonical = async (): Promise<Campaign> => {
    const h = await db.doc(`campaignStates/${id}`).get();
    return provider("mock").open(
      h.get("envelope"),
      h.get("canonicalKey"),
      context(id, h.get("revision"), "canonical", 1),
    );
  };
  const published = async (seat: number): Promise<CampaignView> => {
    const s = await canonical(),
      uid = s.seats[seat].uid,
      h = await db.doc(`campaignViews/${id}/members/${uid}`).get(),
      key = await db.doc(`campaignKeys/${id}/members/${uid}`).get(),
      ctx = context(id, h.get("revision"), `member:${uid}`, 1);
    return provider("mock").open(
      h.get("envelope"),
      await unwrap(h.get("grant"), key.get("kek"), uid, ctx, "mock"),
      ctx,
    );
  };
  try {
    for (let i = 0; i < 4; i++)
      await story.harness(
        `identity-${i + 1}`,
        "Ordinary emulator sign-in and identity save, with explicit developer entitlement and fixed browser Date; timers continue normally.",
        async () => {
          const ctx = await browser.newContext({
            viewport: info.project.use.viewport,
            baseURL: info.project.use.baseURL,
            deviceScaleFactor: 1,
            locale: "en-US",
            timezoneId: "UTC",
            colorScheme: "dark",
            reducedMotion: "reduce",
          });
          contexts.push(ctx);
          const page = await ctx.newPage();
          pages.push(page);
          page.on("pageerror", (error) => errors.push(error.message));
          const email = `fleet-story-${info.project.name}-${i}-${Date.now()}@example.test`;
          await login(page, email);
          await page.getByLabel("Commander name").fill(aliases[i]);
          await button(page, "Save identity").click();
          await expect(page.getByRole("status")).toContainText(
            "Identity saved",
          );
          await grantDeveloper(email);
          await button(page, "Close").click();
          await button(page, "Play").click();
          await page.clock.setFixedTime(admissionAt);
        },
      );
    for (let i = 0; i < 4; i++)
      await story.harness(
        `admit-${i + 1}`,
        "Create/join through ordinary campaign controls. Fixed catalogue and admission clock are test controls; no seat, message or command outcome is injected.",
        async () => {
          const page = pages[i];
          if (!i) {
            await button(page, "Create campaign").click();
            await page.getByLabel("Campaign name").fill(campaignName);
            await button(page, "Create galaxy").click();
            await expect(
              page.getByRole("heading", {
                name: "Choose your faction",
                exact: true,
              }),
            ).toBeVisible();
            url = page.url();
            id = new URL(url).searchParams.get("campaign")!;
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
          await button(page, "Claim your seat").click();
          await expect(
            page.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
        },
      );
    await story.harness(
      "scheduler-delivery",
      "Advance the designated browser/domain clock to 12:15 UTC and deliver the actual emulator Scheduler HTTP request. This does not certify hosted scheduling.",
      async () => {
        for (const page of pages) await page.clock.setFixedTime(scheduledAt);
        const response = await request.post(
          "http://127.0.0.1:15001/demo-clusterii/us-central1/startScheduledCampaigns-0",
          {
            headers: {
              "X-CloudScheduler-JobName": "emulator-admission-story",
              "X-CloudScheduler-ScheduleTime": new Date(
                scheduledAt,
              ).toISOString(),
            },
          },
        );
        expect(response.ok()).toBe(true);
        for (const page of pages) {
          expect((await canonical()).phase).toBe("active");
          await expect(
            page.getByText(
              "Contact markers show acquired positions from loaded records.",
              { exact: true },
            ),
          ).toBeVisible();
        }
      },
    );

    const owner = pages[0],
      peer = pages[1];
    const settle = async (target: number) => {
      expect(target).toBeLessThanOrEqual(220);
      const state = await canonical(),
        previous = state.economy!.tick;
      const due = scheduledAt + target * 900000;
      for (const p of pages) await p.clock.setFixedTime(due);
      let count = 0,
        batch: number;
      do {
        batch = await settleCampaignTicks(id, () => due);
        count += batch;
      } while (batch === 96);
      expect(count).toBe(target - previous);
      expect(await settleCampaignTicks(id, () => due)).toBe(0);
    };
    await story.harness(
      "earn-navigation",
      "Deliver100 real leased ticks in bounded batches. No levels, balances, forces or ownership are injected; this is not hosted scheduling.",
      () => settle(100),
    );
    const prepared = await Promise.all([0, 1, 2, 3].map(published));
    const homes = prepared.map((v) => v.own.home!),
      stars = prepared[0].stars;
    const star = (id: string) => stars.find((s) => s.id === id)!;
    expect(prepared[0].economy!.research.levels.navigation).toBe(3);
    const pending = [{ id: homes[1], path: [] as string[], cost: 0 }],
      seen = new Set<string>();
    let route: string[] | undefined;
    while (pending.length) {
      pending.sort((a, b) => a.cost - b.cost);
      const current = pending.shift()!;
      if (seen.has(current.id)) continue;
      seen.add(current.id);
      if (current.id === homes[0]) {
        route = current.path;
        break;
      }
      for (const candidate of stars) {
        if (
          seen.has(candidate.id) ||
          (homes.includes(candidate.id) && candidate.id !== homes[0])
        )
          continue;
        const length = distance(star(current.id), candidate);
        if (length <= 30)
          pending.push({
            id: candidate.id,
            path: [...current.path, candidate.id],
            cost: current.cost + Math.ceil(length / 2) + 1,
          });
      }
    }
    expect(route).toBeDefined();
    const legs = routePreview(stars, homes[1], route!, 3);
    expect(legs.every((l) => l.reachable)).toBe(true);
    const travel = legs.reduce((n, l) => n + l.ticks + 1, 0);
    expect(travel).toBeLessThanOrEqual(104);
    const escape = stars
      .filter(
        (s) =>
          !homes.includes(s.id) &&
          !route!.includes(s.id) &&
          distance(s, star(homes[0])) <= 30,
      )
      .sort(
        (a, b) => distance(a, star(homes[0])) - distance(b, star(homes[0])),
      )[0];
    expect(escape).toBeDefined();
    const privateCheck = {
      spec: "Each authenticated projection omits the other commander's private order IDs; no application errors occur.",
      check: async () => {
        expect(errors).toEqual([]);
        const state = await canonical();
        for (const seat of [0, 1]) {
          const own = await published(seat);
          for (const order of state.military?.orders ?? [])
            if (order.uid !== state.seats[seat].uid)
              expect(JSON.stringify(own.military)).not.toContain(order.id);
        }
      },
    };
    for (let seat = 0; seat < 2; seat++) {
      const p = pages[seat];
      await story.step(`form-${seat}`, {
        actor: aliases[seat],
        description:
          "Use the actual home-system fleet controls to reserve all160 earned fighters. The other commander's order remains private.",
        action: async () => {
          await inspector(p)
            .getByRole("button", { name: "Fleets · 0", exact: true })
            .click();
          await panel(p).getByLabel("Fighters", { exact: true }).fill("160");
          await panel(p).getByLabel("Infantry", { exact: true }).fill("0");
          await button(p, "Form fleet").focus();
          await expectReadingTarget(button(p, "Form fleet"));
          await button(p, "Form fleet").press("Enter");
        },
        acknowledgement: {
          spec: "A real receipt accepts160 fighters for tick101.",
          check: async () => {
            await expect(
              panel(p)
                .getByRole("status")
                .filter({ hasText: "Fleet order accepted." }),
            ).toBeVisible();
            await expect(orders(p)).toContainText(
              "Form · 160 fighters · 0 infantry · tick 101",
            );
            await read(p, orders(p));
          },
        },
        verifications: [privateCheck],
        views: [{ page: p, player: aliases[seat], surface: "game" }],
      });
    }
    await story.harness(
      "form-at-101",
      "Real leased settlement forms both fleets once; repeat delivery does no work.",
      () => settle(101),
    );
    await story.step("formed-fleets", {
      actor: aliases[0],
      description:
        "Select each acknowledged fleet with the keyboard and read its actual160-fighter complement.",
      action: async () => {
        for (const p of [owner, peer]) {
          const f = panel(p).getByRole("button", {
            name: /^Fleet [0-9]+$/,
            exact: true,
          });
          await expect(f).toHaveCount(1);
          await f.focus();
          await f.press("Enter");
          await read(
            p,
            manifest(p).getByRole("status").filter({ hasText: "Fleet formed" }),
          );
        }
      },
      acknowledgement: {
        spec: "Both players see the settled formation outcome.",
        check: async () => {
          for (const p of [owner, peer])
            await expect(
              manifest(p)
                .getByRole("status")
                .filter({ hasText: "Fleet formed" }),
            ).toHaveText("Fleet formed · 160 fighters · 0 infantry.");
        },
      },
      verifications: [privateCheck],
      views: views(),
    });
    const routeIds: string[] = [];
    for (let seat = 0; seat < 2; seat++) {
      const p = pages[seat],
        waypoints = seat === 0 ? [escape.id] : route!;
      const planner = p.getByRole("region", {
        name: "Fleet route planner",
        exact: true,
      });
      const send = planner.getByRole("button", {
        name: "Send fleet",
        exact: true,
      });
      await story.step(`preview-route-${seat}`, {
        actor: aliases[seat],
        description:
          seat === 0
            ? "Plot an escape to a neutral star without a science station."
            : "Plot a seven-leg route through the actual catalogue toward the other commander's home.",
        action: async () => {
          await button(p, "Plot route").focus();
          await button(p, "Plot route").press("Enter");
          for (const id of waypoints) {
            const name = star(id).name;
            await planner
              .getByRole("searchbox", { name: "Find a waypoint" })
              .fill(name);
            const add = planner.getByRole("button", {
              name: `Add ${name} waypoint`,
              exact: true,
            });
            await add.focus();
            await add.press("Enter");
          }
          await send.focus();
        },
        acknowledgement: {
          spec: "Reachable legs enable commitment; range30 and speed2 remain distinct.",
          check: async () => {
            await expect(planner).toContainText(
              "Range 30 ly per leg · Speed 2 ly/tick",
            );
            await expect(send).toBeEnabled();
            await expectReadingTarget(send);
          },
        },
        verifications: [privateCheck],
        views: [{ page: p, player: aliases[seat], surface: "game" }],
      });
      await story.step(`commit-route-${seat}`, {
        actor: aliases[seat],
        description:
          "Confirm the original route with Enter and read the authoritative scheduled departure acknowledgement.",
        action: async () => {
          await send.press("Enter");
        },
        acknowledgement: {
          spec: "The server accepts the route and retains its exact waypoints for tick102.",
          check: async () => {
            await expect(
              planner
                .getByRole("status")
                .filter({ hasText: "Route accepted ·" }),
            ).toBeVisible();
            const state = await canonical(),
              uid = state.seats[seat].uid;
            const order = state.military!.orders.find(
              (o) => o.uid === uid && o.waypoints,
            )!;
            expect(order.waypoints).toEqual(waypoints);
            expect(order.effectiveTick).toBe(102);
            routeIds.push(order.id);
            expect(
              (
                await db
                  .doc(`campaignReceipts/${uid}/results/${order.id}`)
                  .get()
              ).get("status"),
            ).toBe("accepted");
          },
        },
        verifications: [privateCheck],
        views: [{ page: p, player: aliases[seat], surface: "game" }],
      });
    }
    const through = 103 + travel;
    await story.harness(
      "travel-and-capture",
      "Deliver bounded real leased travel/combat/production ticks. The peer captures orbit; no battle outcome is injected.",
      () => settle(through),
    );
    const lost = await published(0),
      won = await published(1);
    const science = (p: Page) =>
      p.getByRole("region", { name: "Science progress", exact: true });
    const research = (p: Page) =>
      p.getByRole("region", { name: "Research selection", exact: true });
    const readingChecks = () => [
      privateCheck,
      {
        spec: "The owner retains surface control but no opposing orbital values; zero output freezes research while the rival gains science.",
        check: async () => {
          const own = await published(0),
            other = await published(1),
            holding = own.holdings.find((h) => h.starId === homes[0])!;
          expect(holding).toMatchObject({ orbit: "Unknown", surface: "You" });
          for (const field of ["fighters", "camps", "stations", "escrowMilli"])
            expect(holding).not.toHaveProperty(field);
          expect(
            other.holdings.find((h) => h.starId === homes[0]),
          ).toMatchObject({ orbit: "You", surface: "Unknown", stations: 1 });
          expect(own.economy!.ledger!.scienceMilli).toBe(0);
          expect(other.economy!.ledger!.scienceMilli).toBeGreaterThan(1400);
          expect(
            own.military!.fleets.find((f) => f.starId === escape.id)!.fighters,
          ).toBe(160);
          expect(JSON.stringify(other.military)).not.toContain(routeIds[0]);
        },
      },
    ];
    for (const [suffix, tick] of [
      ["lost-orbit", through],
      ["still-unfunded", through + 1],
    ] as const) {
      if (tick > through)
        await story.harness(
          "zero-next-tick",
          "Deliver one further real tick and repeat it; zero science must retain the same research state.",
          () => settle(tick),
        );
      await story.step(suffix, {
        actor: aliases[0],
        description:
          "Reload both accounts, then use keyboard navigation to read persisted science production and research progress after orbital loss.",
        action: async () => {
          for (const p of [owner, peer]) {
            await p.reload();
            await button(p, "Economy").focus();
            await button(p, "Economy").press("Enter");
            const reading = p.getByRole("region", {
              name: "Production ledger",
              exact: true,
            });
            await reading.focus();
            await science(p).evaluate((e) =>
              e.scrollIntoView({ block: "center" }),
            );
          }
        },
        acknowledgement: {
          spec: "Both players recover the settled tick and their own distinct science ledger.",
          check: async () => {
            for (const [seat, p] of [owner, peer].entries()) {
              const v = await published(seat);
              expect(v.production!.tick).toBe(tick);
              const earned = p
                .locator('dl[aria-label="Last production"] dt')
                .filter({ hasText: /^Science earned$/ })
                .locator("..");
              await expect(earned.locator("dd")).toHaveText(
                (v.economy!.ledger!.scienceMilli / 1000).toLocaleString(
                  "en-US",
                ),
              );
              await expectReadingTarget(earned, false);
              await expectReadingTarget(science(p), false);
            }
            expect((await published(0)).economy!.research).toEqual(
              lost.economy!.research,
            );
          },
        },
        verifications: readingChecks(),
        views: views(),
      });
    }
    await story.step("no-completion-estimate", {
      actor: aliases[0],
      description:
        "Open the real forecast with the keyboard. Read why no completion date is available at zero science.",
      action: async () => {
        const summary = research(owner).locator("details.forecast > summary");
        await summary.focus();
        await summary.press("Enter");
        const body = research(owner).getByRole("region", {
          name: "Research forecast details",
        });
        await body.focus();
        await body.press("Home");
      },
      acknowledgement: {
        spec: "The forecast states zero-rate explicitly and invents no ETA.",
        check: async () => {
          const forecast = research(owner).locator("details.forecast");
          await expect(forecast).toContainText(
            "The last completed tick produced no science. No completion at that rate.",
          );
          await expectReadingTarget(
            forecast.getByText(
              "The last completed tick produced no science. No completion at that rate.",
              { exact: true },
            ),
            false,
          );
          await expectReadingTarget(
            research(owner).locator("button[type=submit]"),
          );
        },
      },
      verifications: readingChecks(),
      views: [{ page: owner, player: aliases[0], surface: "game" }],
    });
    await story.step("close-economy", {
      actor: aliases[0],
      description:
        "Close Economy with Escape and return keyboard focus to its opening control.",
      action: async () => {
        await owner.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "The panel closes and Economy is focused and fully usable.",
        check: async () => {
          await expect(research(owner)).toHaveCount(0);
          await expect(button(owner, "Economy")).toBeFocused();
          await expectReadingTarget(button(owner, "Economy"));
        },
      },
      verifications: readingChecks(),
      views: [{ page: owner, player: aliases[0], surface: "game" }],
    });
  } finally {
    for (const c of contexts) await c.close();
  }
});
