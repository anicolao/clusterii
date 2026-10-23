import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  getDoc,
  doc,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import type { Page, BrowserContext, Locator } from "@playwright/test";
import type { Campaign, CampaignView } from "../../../shared/campaign";
import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { settlementTiming } from "../../browser/story-helpers/settlement-timing";
import { expectReadingTarget } from "../../browser/story-helpers/reading-target";
import { readCampaignHistory } from "../../../src/lib/campaign-history";
import { arrivalRecords } from "../../../src/lib/arrival-reports";
import { distance } from "../../../shared/galaxy";
import { routePreview } from "../../../shared/travel";
import {
  openForces,
  openGalaxyCommand,
  inspectLayer,
} from "../../browser/galaxy-navigation";
import { login, grantDeveloper } from "../../browser/helpers";
import {
  admissionAt,
  scheduledAt,
} from "../../browser/story-helpers/admission-clock.mjs";
import { fleetStoryPrefix } from "../../browser/story-helpers/fleet-clock.mjs";
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
  const needsScroll = await target.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const panel = element.closest('[aria-label="Fleet manifest and orders"]')!;
    const bounds = panel.getBoundingClientRect();
    return (
      box.top < bounds.top ||
      box.bottom > bounds.bottom ||
      box.left < bounds.left ||
      box.right > bounds.right
    );
  });
  if (needsScroll) await target.scrollIntoViewIfNeeded();
  await expectReadingTarget(target, false);
  const a = await manifest(p).boundingBox(),
    b = await target.boundingBox();
  expect(b!.y).toBeGreaterThanOrEqual(a!.y);
  expect(b!.y + b!.height).toBeLessThanOrEqual(a!.y + a!.height);
}
test("Open a contextual arrival report and recover its recorded surface", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "contextual-aftermath",
    title: "Inspect an authorized aftermath from its system",
    inventory: [
      "UX-04",
      "UX-06",
      "UX-07",
      "UX-08",
      "UX-09",
      "UX-14",
      "UX-15",
      "UX-16",
    ],
    description:
      "Four independently authenticated commanders use real fleet controls after100 earned ticks. An escape and rival route produce actual orbital loss and retained surface control. Both recipients open their own immutable report from the selected system, restore context and inspect current surface through reload. Fixed catalogue/domain clocks are explicit harness controls; budgets are220 ticks,240 seconds and24 captures per viewport. Rules remain under review; this does not certify managed encryption or hosted scheduling.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let id = "",
    url = "";
  const campaignName = `${fleetStoryPrefix}contextual aftermath ${info.project.name}`;
  const views = () =>
    pages.slice(0, 2).map((page, i) => ({
      page,
      player: aliases[i],
      surface: "game" as const,
    }));
  const require = createRequire(
    new URL("../../../functions/package.json", import.meta.url),
  );
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const db = require("firebase-admin/firestore").getFirestore();
  const auth = require("firebase-admin/auth").getAuth();
  const readers: {
    app: ReturnType<typeof initializeApp>;
    uid: string;
    db: ReturnType<typeof getFirestore>;
    functions: ReturnType<typeof getFunctions>;
  }[] = [];
  const timing = settlementTiming(
    db,
    info.outputPath("settlement-timing.jsonl"),
  );
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
  const published = async (actor: number): Promise<CampaignView> => {
    const reader = readers[actor],
      uid = reader.uid;
    const h = (
      await getDoc(doc(reader.db, "campaignViews", id, "members", uid))
    ).data()!;
    const access = (
      await httpsCallable<{ gameId: string }, { kek: string }>(
        reader.functions,
        "campaignKey",
      )({ gameId: id })
    ).data;
    const ctx = context(id, h.revision, `member:${uid}`, h.envelope.epoch);
    return provider("mock").open(
      h.envelope,
      await unwrap(h.grant, access.kek, uid, ctx, "mock"),
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
          // Separate authenticated SDK reader for this exact real login, as in
          // feature004. Admin only mints the emulator session; reads use rules
          // and the actual campaignKey callable, never canonical seat ordering.
          const user = await auth.getUserByEmail(email);
          const app = initializeApp(
            { projectId: "demo-clusterii", apiKey: "demo-key" },
            crypto.randomUUID(),
          );
          const client = getAuth(app);
          connectAuthEmulator(client, "http://127.0.0.1:19099", {
            disableWarnings: true,
          });
          await signInWithCustomToken(
            client,
            await auth.createCustomToken(user.uid),
          );
          expect(client.currentUser!.uid).toBe(user.uid);
          const clientDb = getFirestore(app);
          connectFirestoreEmulator(clientDb, "127.0.0.1", 18080);
          const functions = getFunctions(app);
          connectFunctionsEmulator(functions, "127.0.0.1", 15001);
          readers.push({ app, uid: user.uid, db: clientDb, functions });
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

    expect(new Set(readers.map((r) => r.uid)).size).toBe(4);
    const admitted = await canonical();
    for (const reader of readers)
      expect(admitted.seats.filter((s) => s.uid === reader.uid)).toHaveLength(
        1,
      );
    const owner = pages[0],
      peer = pages[1];
    const settle = async (target: number) => {
      expect(target).toBeLessThanOrEqual(220);
      const state = await timing.span("canonical", canonical),
        previous = state.economy!.tick;
      const due = scheduledAt + target * 900000;
      for (const p of pages.filter((p) => !p.isClosed()))
        await timing.span("clock", () => p.clock.setFixedTime(due));
      let count = 0,
        batch: number;
      do {
        batch = await timing.span("batch", () =>
          settleCampaignTicks(id, () => due),
        );
        count += batch;
      } while (batch === 96);
      expect(count).toBe(target - previous);
      expect(
        await timing.span("repeat", () => settleCampaignTicks(id, () => due)),
      ).toBe(0);
    };
    await story.harness(
      "leave-campaign-during-elapsed-time",
      "Both captured players return through ordinary Campaigns controls while time passes; setup-only witnesses close after admission. No service delivery or authorization is bypassed.",
      async () => {
        for (const p of [owner, peer]) await button(p, "Campaigns").click();
        for (const context of contexts.slice(2)) await context.close();
      },
    );
    await story.harness(
      "earn-navigation",
      "Deliver100 real leased ticks in bounded batches. No levels, balances, forces or ownership are injected; this is not hosted scheduling.",
      () => settle(100),
    );
    await story.harness(
      "recover-earned-campaign",
      "Both real saved identities reopen the exact campaign after elapsed-time settlement.",
      async () => {
        for (const p of [owner, peer]) {
          await p.goto(url);
          await expect(inspector(p)).toBeVisible();
        }
      },
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
      spec: "Actual owner SDK reads and campaignKey grants succeed; foreign private reads are denied and returned projections omit foreign order IDs.",
      check: async () => {
        expect(errors).toEqual([]);
        const state = await canonical();
        for (const seat of [0, 1]) {
          const own = await published(seat);
          for (const order of state.military?.orders ?? [])
            if (order.uid !== readers[seat].uid)
              expect(JSON.stringify(own.military)).not.toContain(order.id);
          await expect(
            getDoc(
              doc(
                readers[seat].db,
                "campaignViews",
                id,
                "members",
                readers[1 - seat].uid,
              ),
            ),
          ).rejects.toMatchObject({ code: "permission-denied" });
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
          await openForces(p, 0, true);
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
              uid = readers[seat].uid;
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
    const recordedReport = async (actor: number) => {
      const r = readers[actor];
      const page = await readCampaignHistory(r.db, r.functions, id, r.uid);
      const entry = arrivalRecords(page.records).find(
        (r) => r.report.starId === homes[0],
      );
      expect(
        entry,
        "The recent authenticated immutable history contains the actual capture",
      ).toBeDefined();
      return entry!.report;
    };
    const reports = await Promise.all([recordedReport(0), recordedReport(1)]);
    expect(reports.every(Boolean)).toBe(true);
    expect(reports[0].tick).toBe(reports[1].tick);
    const reportTick = reports[0].tick;
    const reportPanel = (p: Page) =>
      p.getByRole("dialog", { name: "Arrival reports panel", exact: true });
    const contextControl = (p: Page) =>
      inspector(p).getByRole("button", {
        name: `Arrival report · tick ${reportTick}`,
        exact: true,
      });
    const reportBody = (p: Page) =>
      reportPanel(p).getByRole("region", {
        name: "Arrival report details",
        exact: true,
      });
    const footers = async (p: Page) => {
      for (const name of ["Back to system", "Inspect surface"])
        await expectReadingTarget(
          reportPanel(p).getByRole("button", { name, exact: true }),
        );
    };
    const selectHome = async (p: Page) => {
      await openGalaxyCommand(p, "Systems list", true);
      await p
        .getByLabel("Find a system", { exact: true })
        .fill(star(homes[0]).name);
      const select = button(
        p,
        `Select ${star(homes[0]).name}, ${star(homes[0]).class} class`,
      );
      await select.focus();
      await select.press("Enter");
      await inspectLayer(p, "Orbit");
    };
    const reportChecks = [
      privateCheck,
      {
        spec: "Each recipient reads only its own persisted losses; split ownership still redacts opposing layer quantities.",
        check: async () => {
          const current = await Promise.all([published(0), published(1)]);
          for (const [i, p] of [owner, peer].entries()) {
            expect(await recordedReport(i)).toEqual(reports[i]);
            const losses = reportPanel(p).locator("dl.losses");
            await expect(losses.locator("dd")).toHaveText([
              String(reports[i].fightersBefore - reports[i].fightersAfter),
              String(reports[i].fightersAfter),
              String(reports[i].infantryBefore - reports[i].infantryAfter),
              String(reports[i].infantryAfter),
            ]);
            await footers(p);
          }
          const retained = current[0].holdings.find(
            (h) => h.starId === homes[0],
          )!;
          expect(retained).toMatchObject({ orbit: "Unknown", surface: "You" });
          for (const field of ["fighters", "camps", "stations", "escrowMilli"])
            expect(retained).not.toHaveProperty(field);
          expect(
            current[1].holdings.find((h) => h.starId === homes[0]),
          ).toMatchObject({ orbit: "You", surface: "Unknown" });
        },
      },
    ];
    await story.step("select-contested-system", {
      actor: aliases[0],
      description:
        "Both recipients reload their real campaign and use the factual systems list to inspect the contested home. No report is invented for an unobserved system.",
      action: async () => {
        for (const p of [owner, peer]) {
          await p.reload();
          await selectHome(p);
        }
      },
      acknowledgement: {
        spec: "The authorized system exposes its recorded arrival tick and selected Orbit control.",
        check: async () => {
          for (const p of [owner, peer]) {
            await expect(contextControl(p)).toBeVisible();
            await contextControl(p).focus();
            await expectReadingTarget(contextControl(p));
            await expect(
              inspector(p).getByRole("button", {
                name: /^Inspect Orbit · owner /,
              }),
            ).toHaveAttribute("aria-expanded", "true");
          }
        },
      },
      verifications: [privateCheck],
      views: views(),
    });
    await story.step("open-recorded-aftermath", {
      actor: aliases[0],
      description:
        "Open the selected system's actual report with Enter. Each player sees its own outcome and an explicit historical timestamp.",
      action: async () => {
        for (const p of [owner, peer]) await contextControl(p).press("Enter");
      },
      acknowledgement: {
        spec: "Surface held and Orbit secured are the two recipient-specific outcomes of the same persisted tick.",
        check: async () => {
          for (const [i, p] of [owner, peer].entries()) {
            const heading = reportPanel(p).getByRole("heading", {
              name: i ? "Orbit secured" : "Surface held",
              exact: true,
            });
            await expect(heading).toBeVisible();
            await expectReadingTarget(heading, false);
            await expectReadingTarget(
              reportPanel(p).getByText(
                `Recorded outcome at tick ${reportTick}. Current control may differ.`,
                { exact: true },
              ),
              false,
            );
            await expect(
              reportPanel(p).getByRole("button", {
                name: `${star(homes[0]).name} · tick ${reportTick}`,
                exact: true,
              }),
            ).toHaveAttribute("aria-pressed", "true");
          }
        },
      },
      verifications: reportChecks,
      views: views(),
    });
    await story.harness(
      "next-authoritative-tick",
      "Deliver one additional leased production tick while reports remain open. Repeated delivery must settle zero further ticks; this is an explicit scheduler harness, not elapsed-time inference.",
      () => settle(through + 1),
    );
    const settledAfterUpdate = await canonical();
    await story.step("retain-record-during-update", {
      actor: aliases[0],
      description:
        "Read the same outcome while the campaign advances. Current facts update without rewriting the selected historical report.",
      action: async () => {
        for (const p of [owner, peer]) await reportBody(p).focus();
      },
      acknowledgement: {
        spec: "Both authorized current projections acknowledge the next tick and both selected report identities remain unchanged.",
        check: async () => {
          for (const [i, p] of [owner, peer].entries()) {
            expect((await published(i)).production!.tick).toBe(through + 1);
            await expect(
              reportPanel(p).getByRole("button", {
                name: `${star(homes[0]).name} · tick ${reportTick}`,
                exact: true,
              }),
            ).toHaveAttribute("aria-pressed", "true");
          }
        },
      },
      verifications: reportChecks,
      views: views(),
    });
    await story.step("restore-system-context", {
      actor: aliases[0],
      description:
        "Escape returns both commanders to the same system and selected Orbit layer, with keyboard focus on the exact contextual opener.",
      action: async () => {
        for (const p of [owner, peer]) await p.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "The report closes, selected layer is retained and the contextual opener is focused and entirely usable.",
        check: async () => {
          for (const p of [owner, peer]) {
            await expect(reportPanel(p)).toHaveCount(0);
            await expect(contextControl(p)).toBeFocused();
            await expectReadingTarget(contextControl(p));
            await expect(
              inspector(p).getByRole("button", {
                name: /^Inspect Orbit · owner /,
              }),
            ).toHaveAttribute("aria-expanded", "true");
          }
        },
      },
      verifications: [privateCheck],
      views: views(),
    });
    await story.step("inspect-current-surface", {
      actor: aliases[0],
      description:
        "Reopen the immutable report, then follow Inspect surface to the actual current layer. This navigation does not issue another gameplay command.",
      action: async () => {
        for (const p of [owner, peer]) {
          await contextControl(p).press("Enter");
          const inspect = reportPanel(p).getByRole("button", {
            name: "Inspect surface",
            exact: true,
          });
          await footers(p);
          await inspect.focus();
          await inspect.press("Enter");
        }
      },
      acknowledgement: {
        spec: "The current surface instrument is selected and its bounded details receive focus.",
        check: async () => {
          for (const p of [owner, peer]) {
            await expect(reportPanel(p)).toHaveCount(0);
            await expect(
              inspector(p).getByRole("button", {
                name: /^Inspect Surface · owner /,
              }),
            ).toHaveAttribute("aria-expanded", "true");
            await expect(
              inspector(p).getByRole("region", {
                name: "System details",
                exact: true,
              }),
            ).toBeFocused();
          }
        },
      },
      verifications: [privateCheck],
      views: views(),
    });
    await story.step("recover-report-normal-motion", {
      actor: aliases[0],
      description:
        "Reload with normal motion, reselect the real system and reopen the same authorized record. Let the actual finite report effects finish without fast-forwarding.",
      action: async () => {
        for (const p of [owner, peer]) {
          await p.emulateMedia({ reducedMotion: "no-preference" });
          await p.reload();
          await selectHome(p);
          await contextControl(p).focus();
          await contextControl(p).press("Enter");
        }
      },
      acknowledgement: {
        spec: "Recovery retains the exact report and normal-motion preference; it creates no new arrival or admission.",
        check: async () => {
          for (const p of [owner, peer]) {
            expect(
              await p.evaluate(
                () => matchMedia("(prefers-reduced-motion: reduce)").matches,
              ),
            ).toBe(false);
            await expect(
              reportPanel(p).getByRole("button", {
                name: `${star(homes[0]).name} · tick ${reportTick}`,
                exact: true,
              }),
            ).toHaveAttribute("aria-pressed", "true");
          }
          const state = await canonical();
          expect(state.revision).toBe(settledAfterUpdate.revision);
          expect(state.military).toEqual(settledAfterUpdate.military);
          expect(state.seats).toHaveLength(4);
        },
      },
      verifications: reportChecks,
      views: views().map((v) => ({ ...v, normalMotion: true })),
    });
  } finally {
    for (const c of contexts) await c.close();
    for (const reader of readers) await deleteApp(reader.app);
  }
});
