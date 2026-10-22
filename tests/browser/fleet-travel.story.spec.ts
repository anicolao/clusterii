import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import type { Page, BrowserContext, Locator } from "@playwright/test";
import type { Campaign } from "../../shared/campaign";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
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
test("Live fleet travel and arrival preserve private forces through recovery", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-fleet-travel",
    title: "Plot, recover and follow an authoritative fleet arrival",
    inventory: ["UX-08", "UX-09", "UX-14", "UX-16"],
    description:
      "Four independent commanders enter through actual authenticated controls. Formation establishes a fleet; a route preview becomes an acknowledged departure and authoritative arrival. Owner and other-player views show private orders and outcomes. Fixed catalogue/domain clocks are explicit harness controls. Development transport capacity and tick rules remain under review; this does not certify interrupted route-draft recovery, managed encryption or hosted scheduling.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let id = "",
    url = "";
  const campaignName = `${fleetStoryPrefix}route ${info.project.name}`;
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
  const published = async (seat: number) => {
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
  const checks = () => [
    {
      spec: "Both fixed action rails are visible before scrolling and no application error occurred.",
      check: async () => {
        expect(errors).toEqual([]);
        for (const p of pages.slice(0, 2)) await rail(p);
      },
    },
    {
      spec: "Other commanders have no owner fleet, private order or ledger in their actual member projections.",
      check: async () => {
        const s = await canonical();
        for (const seat of [1, 2]) {
          const v = await published(seat);
          expect(v.military.fleets).toEqual([]);
          expect(v.military.orders).toEqual([]);
          expect(v.military.ledger).toEqual([]);
          for (const o of s.military?.orders ?? [])
            expect(JSON.stringify(v)).not.toContain(o.id);
        }
        await expect(orders(pages[1])).toContainText(
          "No fleet orders are waiting.",
        );
        await expect(
          panel(pages[1]).getByRole("button", { name: /^Fleet [0-9]+$/ }),
        ).toHaveCount(0);
      },
    },
  ];
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
      peer = pages[1],
      initial = await canonical(),
      uid = initial.seats[0].uid,
      home = Object.entries(initial.systems).find(
        ([, s]) => s.orbit === uid && s.surface === uid,
      )![0];
    const totals = (s: Campaign) => {
      const fleets = Object.values(s.military?.fleets ?? {}).filter(
        (f) => f.uid === uid,
      );
      return {
        fighters:
          Object.values(s.systems)
            .filter((x) => x.orbit === uid)
            .reduce((n, x) => n + x.fighters, 0) +
          fleets.reduce((n, f) => n + f.fighters, 0),
        infantry:
          Object.values(s.systems)
            .filter((x) => x.surface === uid)
            .reduce((n, x) => n + x.infantry, 0) +
          fleets.reduce((n, f) => n + f.infantry, 0),
      };
    };
    const outcome = (copy: string) =>
      manifest(owner).getByRole("status").filter({ hasText: copy });
    const ack = () =>
      panel(owner)
        .getByRole("status")
        .filter({ hasText: "Fleet order accepted." });
    await story.step("inspect-formation", {
      actor: aliases[0],
      description:
        "Open each commander's own fleet preparation. Enter two fighters and an over-capacity infantry complement before committing anything.",
      action: async () => {
        for (const p of [owner, peer])
          await inspector(p)
            .getByRole("button", { name: "Fleets · 0", exact: true })
            .click();
        await panel(owner).getByLabel("Fighters", { exact: true }).fill("2");
        await panel(owner).getByLabel("Infantry", { exact: true }).fill("21");
      },
      acknowledgement: {
        spec: "The actual capacity constraint disables formation without a command.",
        check: async () => {
          await expect(button(owner, "Form fleet")).toBeDisabled();
          await expect(panel(owner)).toContainText(
            "Each fighter carries up to ten infantry.",
          );
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Invalid input does not change canonical state or reserve forces.",
          check: async () => expect(await canonical()).toEqual(initial),
        },
      ],
      views: views(),
    });
    await story.step("choose-complement", {
      actor: aliases[0],
      description:
        "Reduce infantry to the supported twenty and inspect the ready formation.",
      action: async () => {
        await panel(owner).getByLabel("Infantry", { exact: true }).fill("20");
        await button(owner, "Form fleet").focus();
      },
      acknowledgement: {
        spec: "Formation is enabled and focused for keyboard confirmation.",
        check: async () => {
          await expect(button(owner, "Form fleet")).toBeEnabled();
          await expect(button(owner, "Form fleet")).toBeFocused();
        },
      },
      verifications: checks(),
      views: views(),
    });
    let formId = "",
      reserved: Campaign;
    await story.step("reserve-formation", {
      actor: aliases[0],
      description:
        "Confirm formation with Enter. The authoritative receipt reserves two fighters and twenty infantry for tick one, without moving them yet.",
      action: async () => {
        await button(owner, "Form fleet").press("Enter");
      },
      acknowledgement: {
        spec: "The service acknowledges the formation and publishes its exact waiting complement.",
        check: async () => {
          await expect(ack()).toBeVisible();
          await expect(orders(owner)).toContainText(
            "Form · 2 fighters · 20 infantry · tick 1",
          );
          await read(owner, orders(owner));
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "One accepted receipt and revision reserve the original forces without creating a fleet or moving the garrison.",
          check: async () => {
            reserved = await canonical();
            expect(reserved.revision).toBe(initial.revision + 1);
            expect(reserved.systems).toEqual(initial.systems);
            expect(Object.values(reserved.military!.fleets)).toEqual([]);
            expect(reserved.military!.orders).toHaveLength(1);
            const order = reserved.military!.orders[0];
            expect(order).toMatchObject({
              uid,
              starId: home,
              fighters: 2,
              infantry: 20,
              fleetId: null,
              effectiveTick: 1,
            });
            formId = order.id;
            expect(
              (
                await db.doc(`campaignReceipts/${uid}/results/${formId}`).get()
              ).get("status"),
            ).toBe("accepted");
            expect(totals(reserved)).toEqual(totals(initial));
          },
        },
      ],
      views: views(),
    });
    await story.step("reload-formation", {
      actor: aliases[0],
      description:
        "Reload the owner account and reopen its exact campaign's home-system fleet panel.",
      action: async () => {
        await owner.goto(url);
        await inspector(owner)
          .getByRole("button", { name: "Fleets · 0", exact: true })
          .click();
        await read(owner, orders(owner));
      },
      acknowledgement: {
        spec: "The same accepted order and reserved complement return from persistence.",
        check: async () =>
          await expect(orders(owner)).toContainText(
            "Form · 2 fighters · 20 infantry · tick 1",
          ),
      },
      verifications: [
        ...checks(),
        {
          spec: "Reload adds no revision, order or effect.",
          check: async () => expect(await canonical()).toEqual(reserved!),
        },
      ],
      views: views(),
    });
    let formed: Campaign,
      fleetId = "",
      fleetName = "";
    await story.harness(
      "settle-formation",
      "Advance the explicit domain clock once and invoke the real leased tick service. Repeat delivery must do no work; no fleet or outcome is injected.",
      async () => {
        const next = reserved!.economy!.nextTickAt;
        for (const p of pages) await p.clock.setFixedTime(next);
        expect(await settleCampaignTicks(id, () => next)).toBe(1);
        formed = await canonical();
        expect(await settleCampaignTicks(id, () => next)).toBe(0);
        expect(await canonical()).toEqual(formed);
      },
    );
    await story.step("formed-fleet", {
      actor: aliases[0],
      description:
        "Read the authoritative formation result and select the new fleet with the keyboard. The other commander still sees only their own forces.",
      action: async () => {
        await expect(outcome("Fleet formed")).toBeVisible();
        const f = panel(owner).getByRole("button", { name: /^Fleet [0-9]+$/ });
        await f.focus();
        await f.press("Enter");
        await read(owner, outcome("Fleet formed"));
      },
      acknowledgement: {
        spec: "The confirmed fleet contains two fighters and twenty infantry and can be disbanded.",
        check: async () => {
          await expect(outcome("Fleet formed")).toHaveText(
            "Fleet formed · 2 fighters · 20 infantry.",
          );
          await expect(button(owner, "Disband fleet")).toBeEnabled();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Units move from garrison to exactly one fleet; only this tick's recorded production changes empire totals.",
          check: async () => {
            const s = await canonical();
            expect(s).toEqual(formed!);
            const fs = Object.values(s.military!.fleets);
            expect(fs).toHaveLength(1);
            const f = fs[0];
            fleetId = f.id;
            fleetName = `Fleet ${f.number}`;
            expect(f).toMatchObject({
              uid,
              starId: home,
              fighters: 2,
              infantry: 20,
              formedTick: 1,
            });
            expect(s.military!.orders).toEqual([]);
            expect(s.military!.ledger[uid]).toHaveLength(1);
            expect(s.military!.ledger[uid][0]).toMatchObject({
              id: formId,
              fleetId,
              result: "formed",
            });
            const output = s.economy!.ledger[uid];
            expect(totals(s)).toEqual({
              fighters: totals(initial).fighters + output.fighters,
              infantry: totals(initial).infantry + output.infantry,
            });
            await expect(
              panel(owner).getByRole("heading", {
                name: fleetName,
                exact: true,
              }),
            ).toBeVisible();
            await expect(button(owner, fleetName)).toHaveAttribute(
              "aria-pressed",
              "true",
            );
          },
        },
      ],
      views: views(),
    });
    const planner = owner.getByRole("region", {
        name: "Fleet route planner",
        exact: true,
      }),
      details = planner.getByRole("region", {
        name: "Route details",
        exact: true,
      }),
      catalogue = planner.getByRole("region", { name: "Waypoint catalogue" }),
      routeList = planner.getByRole("list", { name: "Route waypoints" }),
      send = planner.getByRole("button", { name: "Send fleet", exact: true });
    const routeRail = async () => {
      const r = await planner.locator("footer").boundingBox();
      expect(r!.y).toBeGreaterThanOrEqual(0);
      expect(r!.y + r!.height).toBeLessThanOrEqual(
        owner.viewportSize()!.height,
      );
    };
    const routeRead = async (target: Locator) => {
      await routeRail();
      await details.focus();
      await target.scrollIntoViewIfNeeded();
      const a = await details.boundingBox(),
        b = await target.boundingBox();
      expect(b!.y).toBeGreaterThanOrEqual(a!.y);
      expect(b!.y + b!.height).toBeLessThanOrEqual(a!.y + a!.height);
    };
    const routeChecks = () => [
      {
        spec: "The route commitment rail is visible before scrolling, and other commanders receive no private route, fleet complement or arrival report.",
        check: async () => {
          await routeRail();
          await rail(peer);
          expect(errors).toEqual([]);
          for (const seat of [1, 2]) {
            const v = await published(seat);
            expect(v.military.fleets).toEqual([]);
            expect(v.military.orders).toEqual([]);
            expect(v.military.ledger).toEqual([]);
            expect(v.military.arrivals ?? []).toEqual([]);
          }
          await expect(orders(peer)).toContainText(
            "No fleet orders are waiting.",
          );
        },
      },
    ];
    let targetName = "",
      targetId = "",
      distance = 0,
      duration = 0;
    await story.step("open-route", {
      actor: aliases[0],
      description:
        "Open the fleet route planner with the keyboard. Range limits each leg; speed determines its travel duration.",
      action: async () => {
        await button(owner, "Plot route").focus();
        await button(owner, "Plot route").press("Enter");
      },
      acknowledgement: {
        spec: "The real route details gain focus and show distinct range and speed.",
        check: async () => {
          await expect(details).toBeFocused();
          await expect(planner).toContainText(
            "Range 10 ly per leg · Speed 2 ly/tick",
          );
          await expect(send).toBeDisabled();
        },
      },
      verifications: routeChecks(),
      views: views(),
    });
    await story.step("choose-waypoint", {
      actor: aliases[0],
      description:
        "Select the nearest displayed within-range destination through its ordinary catalogue control and read the route preview.",
      action: async () => {
        const label = await catalogue
          .getByRole("button")
          .evaluateAll((buttons) =>
            buttons
              .find((b) => b.textContent?.includes("Within range"))
              ?.getAttribute("aria-label"),
          );
        expect(label).toBeTruthy();
        targetName = label!.slice(4, -9);
        await planner
          .getByRole("searchbox", { name: "Find a waypoint" })
          .fill(targetName);
        const add = planner.getByRole("button", { name: label!, exact: true });
        await add.focus();
        await add.press("Enter");
        await routeRead(routeList);
      },
      acknowledgement: {
        spec: "A draft leg shows catalogue distance and speed-derived duration, and enables commitment.",
        check: async () => {
          await expect(routeList).toContainText(targetName);
          await expect(send).toBeEnabled();
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "Preview adds no command or movement; exact public coordinates satisfy range independently of the speed-derived tick count.",
          check: async () => {
            expect(await canonical()).toEqual(formed!);
            const stars = formed!.galaxy.stars,
              from = stars.find((x) => x.id === home)!,
              to = stars.find((x) => x.name === targetName)!;
            targetId = to.id;
            distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
            expect(distance).toBeGreaterThan(0);
            expect(distance).toBeLessThanOrEqual(10);
            duration = Math.max(1, Math.ceil(distance / 2));
            await expect(routeList).toContainText(
              `${distance.toFixed(2)} ly · ${duration} ticks`,
            );
          },
        },
      ],
      views: views(),
    });
    await story.step("reject-distant-leg", {
      actor: aliases[0],
      description:
        "Add a displayed beyond-range waypoint. Inspect the range remedy before issuing any route.",
      action: async () => {
        await planner
          .getByRole("searchbox", { name: "Find a waypoint" })
          .fill("");
        const label = await catalogue
          .getByRole("button")
          .evaluateAll((buttons) =>
            buttons
              .find((b) => b.textContent?.includes("Beyond range"))
              ?.getAttribute("aria-label"),
          );
        expect(label).toBeTruthy();
        await planner
          .getByRole("searchbox", { name: "Find a waypoint" })
          .fill(label!.slice(4, -9));
        await planner
          .getByRole("button", { name: label!, exact: true })
          .click();
        await routeRead(routeList);
      },
      acknowledgement: {
        spec: "The out-of-range leg disables Send fleet with a specific range remedy.",
        check: async () => {
          await expect(send).toBeDisabled();
          await expect(planner.locator("footer")).toContainText(
            "exceeds navigation range",
          );
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "Invalid routing preserves the exact canonical forces and orders.",
          check: async () => expect(await canonical()).toEqual(formed!),
        },
      ],
      views: views(),
    });
    await story.step("repair-route", {
      actor: aliases[0],
      description:
        "Reorder the distant leg with keyboard controls, restore its position, then remove it. Return to fleets and reopen the planner to retain the valid draft.",
      action: async () => {
        for (const name of [
          "Move waypoint 2 earlier",
          "Move waypoint 1 later",
          "Remove waypoint 2",
        ]) {
          const b = planner.getByRole("button", { name, exact: true });
          await b.focus();
          await b.press("Enter");
        }
        await button(owner, "Back to fleets").click();
        await expect(button(owner, "Plot route")).toBeFocused();
        await button(owner, "Plot route").press("Enter");
        await planner
          .getByRole("searchbox", { name: "Find a waypoint" })
          .fill(targetName);
        await routeRead(routeList);
        await send.focus();
      },
      acknowledgement: {
        spec: "The retained single-leg draft is ready for keyboard commitment.",
        check: async () => {
          await expect(routeList.locator("li")).toHaveCount(1);
          await expect(routeList).toContainText(targetName);
          await expect(send).toBeEnabled();
          await expect(send).toBeFocused();
        },
      },
      verifications: routeChecks(),
      views: views(),
    });
    const routeHelp = planner.locator("details.route-rules"),
      helpSummary = routeHelp.locator("summary");
    await story.step("read-contextual-route-rules", {
      actor: aliases[0],
      description:
        "Read the route rules beside the unsent plan. Range and speed are distinct; opening help does not pause the campaign or send the fleet.",
      action: async () => {
        await routeRead(helpSummary);
        await helpSummary.focus();
        await helpSummary.press("Enter");
        await routeRead(helpSummary);
      },
      acknowledgement: {
        spec: "The contextual guide expands through keyboard input and explains actual shared range, speed and proposed development rules.",
        check: async () => {
          await expect(routeHelp).toHaveAttribute("open", "");
          await expect(routeHelp).toContainText(
            "Navigation level 1 reaches 10 light years per leg.",
          );
          await expect(routeHelp).toContainText(
            "Fleets travel 2 light years per tick.",
          );
          await expect(routeHelp).toContainText(
            "Development rules remain under review.",
          );
          await expect(helpSummary).toBeFocused();
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "The reading panel remains bounded, and help changes neither the exact unsent route nor the complete authoritative state.",
          check: async () => {
            await expect(routeList.locator("li")).toHaveCount(1);
            await expect(routeList).toContainText(targetName);
            expect(await canonical()).toEqual(formed!);
            const b = await details.boundingBox();
            expect(b!.y + b!.height).toBeLessThanOrEqual(
              owner.viewportSize()!.height,
            );
          },
        },
      ],
      views: views(),
    });
    await story.step("return-from-route-rules", {
      actor: aliases[0],
      description:
        "Read the final arrival warning within the bounded panel, then close help with the keyboard and return to the unchanged draft.",
      action: async () => {
        await routeRead(
          routeHelp.getByRole("heading", { name: "Arrival and uncertainty" }),
        );
        await helpSummary.focus();
        await helpSummary.press("Enter");
        await routeRead(routeList);
        await send.focus();
      },
      acknowledgement: {
        spec: "Help closes without discarding the route; the same draft is ready for deliberate commitment.",
        check: async () => {
          await expect(routeHelp).not.toHaveAttribute("open", "");
          await expect(routeList.locator("li")).toHaveCount(1);
          await expect(routeList).toContainText(targetName);
          await expect(send).toBeFocused();
          await expect(send).toBeEnabled();
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "Reading and closing contextual help sends no gameplay command and reveals no private facts to another commander.",
          check: async () => expect(await canonical()).toEqual(formed!),
        },
      ],
      views: views(),
    });
    await story.step("discard-uncommitted-route", {
      actor: aliases[0],
      description:
        "Discard the selected fleet's unsent route with the keyboard. This is a local draft decision, not cancellation of an accepted order.",
      action: async () => {
        const discard = planner.getByRole("button", {
          name: "Discard draft",
          exact: true,
        });
        await routeRead(discard);
        await discard.focus();
        await discard.press("Enter");
      },
      acknowledgement: {
        spec: "The editor confirms local discard, clears the route and returns keyboard focus to waypoint search.",
        check: async () => {
          await expect(
            planner.getByRole("status").filter({ hasText: "Draft discarded." }),
          ).toHaveText("Draft discarded. No fleet order was sent.");
          await expect(routeList.locator("li")).toHaveCount(0);
          await expect(
            planner.getByRole("searchbox", { name: "Find a waypoint" }),
          ).toBeFocused();
          await expect(send).toBeDisabled();
          await expect(button(owner, "Discard draft")).toBeDisabled();
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "Discard neither issues a command nor changes any authoritative force, order, balance or revision.",
          check: async () => expect(await canonical()).toEqual(formed!),
        },
      ],
      views: views(),
    });
    await story.step("reopen-cleared-route", {
      actor: aliases[0],
      description:
        "Return to fleets and reopen the planner. The discarded route stays empty; select the original destination again as a new draft.",
      action: async () => {
        await button(owner, "Back to fleets").click();
        await expect(button(owner, "Plot route")).toBeFocused();
        await button(owner, "Plot route").press("Enter");
        await expect(routeList.locator("li")).toHaveCount(0);
        await expect(send).toBeDisabled();
        await planner
          .getByRole("searchbox", { name: "Find a waypoint" })
          .fill(targetName);
        await button(owner, `Add ${targetName} waypoint`).click();
        await routeRead(routeList);
        await send.focus();
      },
      acknowledgement: {
        spec: "Only the newly selected destination is ready to send; no stale discard notice accompanies it.",
        check: async () => {
          await expect(routeList.locator("li")).toHaveCount(1);
          await expect(routeList).toContainText(targetName);
          await expect(planner).not.toContainText("Draft discarded.");
          await expect(send).toBeEnabled();
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "Replanning preserves canonical state and has the same result with normal motion.",
          check: async () => {
            await owner.emulateMedia({ reducedMotion: "no-preference" });
            expect(await canonical()).toEqual(formed!);
            await expect(routeList).toContainText(targetName);
            await owner.emulateMedia({ reducedMotion: "reduce" });
          },
        },
      ],
      views: views(),
    });
    let accepted: Campaign,
      routeId = "";
    await story.step("accept-route", {
      actor: aliases[0],
      description:
        "Commit the route with Enter. The authoritative acknowledgement schedules departure without moving the fleet.",
      action: async () => {
        await send.press("Enter");
      },
      acknowledgement: {
        spec: "The route receipt publishes departure tick two and the selected destination.",
        check: async () => {
          await expect(
            planner.locator("footer").getByRole("status"),
          ).toHaveText("Route accepted. Departure scheduled.");
          await expect(details.getByRole("status")).toContainText(
            "departure tick 2",
          );
          await routeRead(routeList);
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "One accepted receipt and revision retain the full fleet until departure.",
          check: async () => {
            accepted = await canonical();
            expect(accepted.revision).toBe(formed!.revision + 1);
            expect(accepted.systems).toEqual(formed!.systems);
            expect(accepted.military!.fleets).toEqual(formed!.military!.fleets);
            expect(accepted.military!.orders).toHaveLength(1);
            const o = accepted.military!.orders[0];
            routeId = o.id;
            expect(o).toMatchObject({
              uid,
              fleetId,
              waypoints: [targetId],
              effectiveTick: 2,
              fighters: 2,
              infantry: 20,
            });
            const receipt = await db
              .doc(`campaignReceipts/${uid}/results/${routeId}`)
              .get();
            expect(receipt.get("status")).toBe("accepted");
            expect(receipt.get("revision")).toBe(accepted.revision);
          },
        },
      ],
      views: views(),
    });
    await expect(button(owner, "Discard draft")).toHaveCount(0);
    await story.step("recover-route", {
      actor: aliases[0],
      description:
        "Reload the exact campaign and reopen the original fleet's accepted route, without issuing a replacement command.",
      action: async () => {
        await owner.goto(url);
        await inspector(owner)
          .getByRole("button", { name: "Fleets · 1", exact: true })
          .click();
        await button(owner, fleetName).click();
        await button(owner, "Plot route").click();
        await routeRead(routeList);
      },
      acknowledgement: {
        spec: "The same accepted destination and departure tick return from persistence.",
        check: async () => {
          await expect(details.getByRole("status")).toContainText(
            "departure tick 2",
          );
          await expect(routeList).toContainText(targetName);
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "Reload neither duplicates the route nor changes forces; accepted routes cannot be discarded as drafts.",
          check: async () => expect(await canonical()).toEqual(accepted!),
        },
      ],
      views: views(),
    });
    let departed: Campaign, settled: Campaign;
    let productionFighters = 0,
      productionInfantry = 0;
    const tick = async (next: number) => {
      for (const p of pages) await p.clock.setFixedTime(next);
      expect(await settleCampaignTicks(id, () => next)).toBe(1);
      const s = await canonical();
      productionFighters += s.economy!.ledger[uid].fighters;
      productionInfantry += s.economy!.ledger[uid].infantry;
      expect(await settleCampaignTicks(id, () => next)).toBe(0);
      expect(await canonical()).toEqual(s);
      return s;
    };
    await story.harness(
      "depart",
      "Advance the labelled domain clock and invoke actual leased settlement. Repeat delivery must leave the full canonical state unchanged; no travel state is injected.",
      async () => {
        departed = await tick(accepted!.economy!.nextTickAt);
      },
    );
    await story.step("traveling", {
      actor: aliases[0],
      description:
        "Read the authoritative departure and scheduled arrival. A traveling fleet cannot receive another route.",
      action: async () => {
        await expect(details.getByRole("status")).toContainText("Traveling");
        await routeRead(details.getByRole("status"));
      },
      acknowledgement: {
        spec: "The fleet is traveling with a speed-derived arrival tick and disabled commitment.",
        check: async () => {
          await expect(details.getByRole("status")).toContainText(
            `arrival tick ${2 + duration}`,
          );
          await expect(send).toBeDisabled();
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "Departure conserves the complete fleet and its original route identity.",
          check: async () => {
            const s = await canonical();
            expect(s).toEqual(departed!);
            expect(s.military!.fleets[fleetId]).toMatchObject({
              fighters: 2,
              infantry: 20,
              travel: {
                commandId: routeId,
                status: "traveling",
                from: home,
                to: targetId,
                departureTick: 2,
                arrivalTick: 2 + duration,
              },
            });
            expect(totals(s)).toEqual({
              fighters: totals(formed!).fighters + productionFighters,
              infantry: totals(formed!).infantry + productionInfantry,
            });
          },
        },
      ],
      views: views(),
    });
    await story.harness(
      "arrive",
      "Deliver each due boundary through the real leased service, checking repeat delivery and recording actual production. This accelerated domain-clock journey does not certify hosted cadence or batch catch-up.",
      async () => {
        settled = departed!;
        for (let i = 0; i < duration; i++)
          settled = await tick(settled.economy!.nextTickAt);
      },
    );
    await story.step("arrival-report", {
      actor: aliases[0],
      description:
        "Read the resolved arrival and resulting orbit/surface control. Landed infantry remains part of the commander's conserved forces.",
      action: async () => {
        await expect(details.getByRole("status")).toContainText("Arrived at");
        await routeRead(
          details.getByRole("article", { name: "Arrival report" }),
        );
      },
      acknowledgement: {
        spec: "The authoritative arrival names the destination, forces and resulting control.",
        check: async () => {
          await expect(details.getByRole("status")).toContainText(targetName);
          await expect(
            details.getByRole("article", { name: "Arrival report" }),
          ).toContainText("infantry, including the surface");
          await expect(button(owner, "Plan another route")).toBeEnabled();
        },
      },
      verifications: [
        ...routeChecks(),
        {
          spec: "A single arrival retains all forces across fleet and newly controlled surface, with only actual production added.",
          check: async () => {
            const s = await canonical();
            expect(s).toEqual(settled!);
            expect(s.military!.orders).toEqual([]);
            expect(s.military!.fleets[fleetId]).toMatchObject({
              starId: targetId,
              fighters: 2,
              infantry: 0,
            });
            expect(s.systems[targetId]).toMatchObject({
              orbit: uid,
              surface: uid,
              infantry: 20,
            });
            const reports = s.military!.arrivals![uid];
            expect(reports).toHaveLength(1);
            expect(reports[0]).toMatchObject({
              starId: targetId,
              tick: 2 + duration,
              contested: false,
              fightersBefore: 2,
              fightersAfter: 2,
              infantryBefore: 20,
              infantryAfter: 20,
            });
            expect(totals(s)).toEqual({
              fighters: totals(formed!).fighters + productionFighters,
              infantry: totals(formed!).infantry + productionInfantry,
            });
          },
        },
      ],
      views: views(),
    });
    await story.step("recover-arrival", {
      actor: aliases[0],
      description:
        "Return to fleet preparation, recover the destination after reload and inspect the same stationed fleet with the keyboard.",
      action: async () => {
        await button(owner, "Back to fleets").focus();
        await button(owner, "Back to fleets").press("Enter");
        await expect(button(owner, "Plot route")).toBeFocused();
        await owner.goto(url);
        await inspector(owner)
          .getByRole("button", { name: /Fleets ·/ })
          .click();
        await button(owner, fleetName).focus();
        await button(owner, fleetName).press("Enter");
        await read(owner, panel(owner).locator("dl"));
      },
      acknowledgement: {
        spec: "The recovered fleet is stationed at the destination with its surviving complement.",
        check: async () => {
          await expect(panel(owner)).toContainText(
            `Stationed at ${targetName}`,
          );
          await expect(button(owner, fleetName)).toHaveAttribute(
            "aria-pressed",
            "true",
          );
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Final reload preserves the exact settled state and receipt identity.",
          check: async () => expect(await canonical()).toEqual(settled!),
        },
      ],
      views: views(),
    });
    const archive = (p: Page) =>
      p.getByRole("region", { name: "Arrival reports", exact: true });
    const body = (p: Page) =>
      archive(p).getByRole("region", {
        name: "Arrival report details",
        exact: true,
      });
    const archiveChecks = [
      {
        spec: "Reading arrival history preserves the single canonical outcome and private recipient projections; both return rails stay visible before scrolling.",
        check: async () => {
          expect(await canonical()).toEqual(settled!);
          const own = await published(0);
          expect(own.military.arrivals).toHaveLength(1);
          expect(own.military.arrivals[0]).toMatchObject({
            starId: targetId,
            tick: 2 + duration,
            fightersBefore: 2,
            fightersAfter: 2,
            infantryBefore: 20,
            infantryAfter: 20,
          });
          for (const seat of [1, 2]) {
            const v = await published(seat);
            expect(v.military.arrivals ?? []).toEqual([]);
            expect(v.military.fleets).toEqual([]);
            expect(v.military.orders).toEqual([]);
          }
          for (const p of [owner, peer]) {
            await expect(
              archive(p).getByRole("button", {
                name: "Back to galaxy",
                exact: true,
              }),
            ).toBeInViewport({ ratio: 1 });
            const b = await archive(p).locator("footer").boundingBox();
            expect(b!.y).toBeGreaterThanOrEqual(0);
            expect(b!.y + b!.height).toBeLessThanOrEqual(
              p.viewportSize()!.height,
            );
          }
          expect(errors).toEqual([]);
        },
      },
    ];
    const archiveViews = () =>
      [owner, peer].map((page, i) => ({
        page,
        player: aliases[i],
        surface: "game" as const,
        primary: [
          archive(page).getByRole("button", {
            name: "Back to galaxy",
            exact: true,
          }),
        ],
      }));
    const confirmArchives = async () => {
      await expect(
        archive(owner).getByRole("heading", {
          name: "System secured",
          exact: true,
        }),
      ).toBeVisible();
      await expect(archive(owner).locator(".system-name")).toHaveText(
        targetName,
      );
      await expect(
        archive(owner)
          .getByRole("group", { name: "Recorded arrivals" })
          .getByRole("button", {
            name: `${targetName} · tick ${2 + duration}`,
            exact: true,
          }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(archive(peer)).toContainText(
        "No arrival reports in the records loaded.",
      );
      await expect(
        archive(peer)
          .getByRole("group", { name: "Recorded arrivals" })
          .getByRole("button"),
      ).toHaveCount(0);
    };
    await story.step("open-private-arrival-archives", {
      actor: aliases[0],
      description:
        "Both commanders open their own arrival archive. The owner recovers the secured system; the uninvolved commander receives no private arrival report.",
      action: async () => {
        for (const p of [owner, peer]) {
          await button(p, "Back to system").click();
          await inspector(p)
            .getByRole("button", { name: "Arrival reports", exact: true })
            .focus();
          await inspector(p)
            .getByRole("button", { name: "Arrival reports", exact: true })
            .press("Enter");
        }
      },
      acknowledgement: {
        spec: "Authorized history selects the owner's recorded arrival and acknowledges an empty archive to the other commander.",
        check: confirmArchives,
      },
      verifications: archiveChecks,
      views: archiveViews(),
    });
    for (const part of [
      {
        id: "losses",
        target: archive(owner).locator(".losses"),
        description:
          "Read the recorded zero losses and surviving complement through the bounded, keyboard-focusable report body.",
      },
      {
        id: "control",
        target: archive(owner).locator(".control"),
        description:
          "Read separately recorded orbit and surface control; both layers belong to the arriving commander at this tick.",
      },
    ])
      await story.step(`read-arrival-${part.id}`, {
        actor: aliases[0],
        description: part.description,
        action: async () => {
          await archiveChecks[0].check();
          await body(owner).focus();
          await part.target.scrollIntoViewIfNeeded();
          const before = {
            section: await part.target.boundingBox(),
            panel: await body(owner).boundingBox(),
          };
          const { section: b, panel: a } = before;
          if (b!.y < a!.y || b!.y + b!.height > a!.y + a!.height)
            await part.target.evaluate((element) =>
              element.scrollIntoView({
                block: "center",
                inline: "nearest",
                behavior: "instant",
              }),
            );
          const path = info.outputPath(`arrival-${part.id}-scroll-bounds.json`);
          await mkdir(dirname(path), { recursive: true });
          await writeFile(
            path,
            JSON.stringify({
              before,
              after: {
                section: await part.target.boundingBox(),
                panel: await body(owner).boundingBox(),
              },
            }),
          );
          await info.attach(`arrival-${part.id}-scroll-bounds`, {
            path,
            contentType: "application/json",
          });
        },
        acknowledgement: {
          spec: "The named report facts are fully visible inside the bounded panel and match the single authoritative outcome.",
          check: async () => {
            await expect(part.target).toBeInViewport({ ratio: 1 });
            const a = await body(owner).boundingBox(),
              b = await part.target.boundingBox();
            expect(b!.y).toBeGreaterThanOrEqual(a!.y);
            expect(b!.y + b!.height).toBeLessThanOrEqual(a!.y + a!.height);
            for (const [label, value] of [
              ["Your fighters lost", "0"],
              ["Your fighters remaining", "2"],
              ["Your infantry lost", "0"],
              ["Your infantry remaining", "20"],
              ["Orbit", "You"],
              ["Surface", "You"],
            ])
              await expect(
                archive(owner)
                  .locator("dt")
                  .filter({ hasText: new RegExp(`^${label}$`) })
                  .locator("+ dd"),
              ).toHaveText(value);
            await expect(body(owner)).toBeFocused();
          },
        },
        verifications: archiveChecks,
        views: archiveViews(),
      });
    await story.step("read-arrival-resolution-boundaries", {
      actor: aliases[0],
      description:
        "Open Participants and resolution with the keyboard to read the recorded order, private opposing-force boundary and development-rule disclosure.",
      action: async () => {
        await archiveChecks[0].check();
        const summary = archive(owner)
          .locator("summary")
          .filter({ hasText: "Participants and resolution" });
        await summary.focus();
        await summary.press("Enter");
        const section = summary.locator("..");
        await section.scrollIntoViewIfNeeded();
        const before = {
          section: await section.boundingBox(),
          panel: await body(owner).boundingBox(),
        };
        await section.evaluate((element) =>
          element.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "instant",
          }),
        );
        const path = info.outputPath("arrival-disclosure-scroll-bounds.json");
        await mkdir(dirname(path), { recursive: true });
        await writeFile(
          path,
          JSON.stringify({
            before,
            after: {
              section: await section.boundingBox(),
              panel: await body(owner).boundingBox(),
            },
          }),
        );
        await info.attach("arrival-disclosure-scroll-bounds", {
          path,
          contentType: "application/json",
        });
      },
      acknowledgement: {
        spec: "The expanded resolution explanation is visible and identifies proposed development rules without revealing opposing forces.",
        check: async () => {
          const details = archive(owner)
            .locator("summary")
            .filter({ hasText: "Participants and resolution" })
            .locator("..");
          await expect(details).toHaveAttribute("open", "");
          await expect(details).toBeInViewport({ ratio: 1 });
          await expect(details).toContainText(
            "Opposing force counts and effectiveness are private.",
          );
          await expect(details).toContainText(
            "Development combat rules remain under review.",
          );
          const a = await body(owner).boundingBox(),
            b = await details.boundingBox();
          expect(b!.y).toBeGreaterThanOrEqual(a!.y);
          expect(b!.y + b!.height).toBeLessThanOrEqual(a!.y + a!.height);
        },
      },
      verifications: archiveChecks,
      views: archiveViews(),
    });
    await story.step("reload-private-arrival-archives", {
      actor: aliases[0],
      description:
        "Reload both independent sessions and reopen their own archives with the keyboard. Stored outcomes survive; unrelated players still receive no report.",
      action: async () => {
        for (const p of [owner, peer]) {
          await p.reload();
          await inspector(p)
            .getByRole("button", { name: "Arrival reports", exact: true })
            .focus();
          await inspector(p)
            .getByRole("button", { name: "Arrival reports", exact: true })
            .press("Enter");
        }
      },
      acknowledgement: {
        spec: "The same recorded destination/tick returns only to its recipient after loss of local panel state.",
        check: confirmArchives,
      },
      verifications: [
        ...archiveChecks,
        {
          spec: "Normal and reduced motion retain the same authoritative history and recipient outcomes.",
          check: async () => {
            for (const p of [owner, peer])
              await p.emulateMedia({ reducedMotion: "no-preference" });
            await confirmArchives();
            await archiveChecks[0].check();
            for (const p of [owner, peer])
              await p.emulateMedia({ reducedMotion: "reduce" });
          },
        },
      ],
      views: archiveViews(),
    });
    await story.step("close-arrival-archives-by-keyboard", {
      actor: aliases[0],
      description:
        "Both commanders close the archive with Escape and return to the opening Arrival reports control.",
      action: async () => {
        for (const p of [owner, peer]) await p.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "Both archive panels close and focus returns to each player's Arrival reports control.",
        check: async () => {
          for (const p of [owner, peer]) {
            await expect(archive(p)).toHaveCount(0);
            await expect(
              inspector(p).getByRole("button", {
                name: "Arrival reports",
                exact: true,
              }),
            ).toBeFocused();
          }
        },
      },
      verifications: [
        {
          spec: "Keyboard dismissal changes no canonical outcome or receipt.",
          check: async () => expect(await canonical()).toEqual(settled!),
        },
      ],
      views: views(),
    });
  } finally {
    for (const c of contexts) await c.close();
  }
});
