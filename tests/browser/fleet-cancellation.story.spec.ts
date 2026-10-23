import { openForces, expectStationedCount } from "./galaxy-navigation";
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
test("Live fleet cancellation preserves drafts and releases private reservations", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-fleet-cancellation",
    title: "Review, keep and cancel a fleet order",
    inventory: ["UX-08", "UX-14", "UX-16"],
    description:
      "Four independent commanders enter through actual authenticated controls. The owner reviews and keeps an accepted formation, preserves a separate unsubmitted draft, then cancels with one authoritative receipt. Released forces never execute at the cancelled boundary. Owner and independent-player views show private reservations and recovery. Explicit domain clocks are harness controls; this does not certify cutoff-edge timing, managed keys or hosted cadence.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let id = "",
    url = "";
  const writes: { p: string; d: Record<string, unknown> }[] = [];
  const campaignName = `${fleetStoryPrefix}cancel ${info.project.name}`;
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
          if (i === 0)
            await ctx.routeWebSocket(/127\.0\.0\.1:19000/, (ws) => {
              const server = ws.connectToServer();
              ws.onClose(() => server.close());
              ws.onMessage((raw) => {
                let frame;
                try {
                  frame = JSON.parse(String(raw));
                } catch {}
                if (
                  frame?.d?.a === "p" &&
                  frame.d.b?.d?.kind === "fleet.cancel"
                ) {
                  writes.push(frame.d.b);
                }
                server.send(raw);
              });
              server.onMessage((raw) => ws.send(raw));
            });
          const page = await ctx.newPage();
          pages.push(page);
          page.on("pageerror", (error) => errors.push(error.message));
          const email = `cancel-story-${info.project.name}-${i}-${Date.now()}@example.test`;
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
          s.systems[home].fighters + fleets.reduce((n, f) => n + f.fighters, 0),
        infantry:
          s.systems[home].infantry + fleets.reduce((n, f) => n + f.infantry, 0),
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
        "Open each commander's own fleet preparation. Enter four fighters and an over-capacity infantry complement before committing anything.",
      action: async () => {
        for (const p of [owner, peer]) await openForces(p, 0);
        await panel(owner).getByLabel("Fighters", { exact: true }).fill("4");
        await panel(owner).getByLabel("Infantry", { exact: true }).fill("41");
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
        "Reduce infantry to the supported eighteen and inspect the ready formation.",
      action: async () => {
        await panel(owner).getByLabel("Infantry", { exact: true }).fill("18");
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
        "Confirm formation with Enter. The authoritative receipt reserves four fighters and eighteen infantry for tick one, without moving them yet.",
      action: async () => {
        await button(owner, "Form fleet").press("Enter");
      },
      acknowledgement: {
        spec: "The service acknowledges the formation and publishes its exact waiting complement.",
        check: async () => {
          await expect(ack()).toBeVisible();
          await expect(orders(owner)).toContainText(
            "Form · 4 fighters · 18 infantry · tick 1",
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
              fighters: 4,
              infantry: 18,
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
        await openForces(owner, 0);
        await read(owner, orders(owner));
      },
      acknowledgement: {
        spec: "The same accepted order and reserved complement return from persistence.",
        check: async () =>
          await expect(orders(owner)).toContainText(
            "Form · 4 fighters · 18 infantry · tick 1",
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
    const draft = panel(owner).getByLabel("Fighters", { exact: true });
    const cancelStatus = () =>
      panel(owner).locator("footer").getByRole("status");
    await story.step("review-cancellation", {
      actor: aliases[0],
      description:
        "Start a separate three-fighter draft, then inspect cancellation of the accepted four-fighter/eighteen-infantry order. The reservation stays intact until confirmed.",
      action: async () => {
        await draft.fill("3");
        await orders(owner)
          .getByRole("button", {
            name: "Review cancellation · order 1",
            exact: true,
          })
          .focus();
        await owner.keyboard.press("Enter");
        await read(owner, orders(owner));
      },
      acknowledgement: {
        spec: "The fixed rail names the original formation and tick; both Keep order and Cancel fleet order are available.",
        check: async () => {
          await expect(panel(owner).locator("footer")).toContainText(
            "Cancel the formation order for tick 1?",
          );
          await expect(button(owner, "Keep order")).toBeEnabled();
          await expect(button(owner, "Cancel fleet order")).toBeEnabled();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Review creates no command and preserves the unrelated three-fighter draft and original reservation.",
          check: async () => {
            expect(await canonical()).toEqual(reserved!);
            expect(writes).toEqual([]);
            await expect(draft).toHaveValue("3");
          },
        },
      ],
      views: views(),
    });
    await story.step("keep-order", {
      actor: aliases[0],
      description:
        "Choose Keep order with Enter. Return to the original draft without cancelling anything.",
      action: async () => {
        await button(owner, "Keep order").focus();
        await owner.keyboard.press("Enter");
        await read(owner, orders(owner));
      },
      acknowledgement: {
        spec: "The accepted formation remains scheduled and the normal formation commitment returns.",
        check: async () => {
          await expect(orders(owner)).toContainText(
            "Form · 4 fighters · 18 infantry · tick 1",
          );
          await expect(button(owner, "Cancel fleet order")).toHaveCount(0);
          await expect(button(owner, "Form fleet")).toBeEnabled();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Keep order adds no revision or cancellation; draft stays three fighters.",
          check: async () => {
            expect(await canonical()).toEqual(reserved!);
            expect(writes).toEqual([]);
            await expect(draft).toHaveValue("3");
          },
        },
      ],
      views: views(),
    });
    let cancelled: Campaign,
      cancelId = "";
    await story.step("cancel-formation", {
      actor: aliases[0],
      description:
        "Review the same accepted order again and confirm cancellation with Enter. Read the actual service acknowledgement and released reservation.",
      action: async () => {
        await orders(owner)
          .getByRole("button", {
            name: "Review cancellation · order 1",
            exact: true,
          })
          .click();
        await button(owner, "Cancel fleet order").focus();
        await owner.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The authoritative cancellation returns focus to Accepted orders and reports that no forces moved.",
        check: async () => {
          await expect(cancelStatus()).toHaveText(
            "Fleet order cancelled. Reservations released; no forces moved.",
          );
          await expect(
            orders(owner).getByRole("heading", {
              name: "Accepted orders",
              exact: true,
            }),
          ).toBeFocused();
          await expect(orders(owner)).toContainText(
            "No fleet orders are waiting.",
          );
          await read(owner, orders(owner));
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Exactly one accepted cancellation revision clears the original order and preserves every garrison/fleet; its receipt is bound to the actual encrypted request.",
          check: async () => {
            cancelled = await canonical();
            expect(cancelled.revision).toBe(reserved!.revision + 1);
            expect(cancelled.systems).toEqual(reserved!.systems);
            expect(cancelled.military!.fleets).toEqual(
              reserved!.military!.fleets,
            );
            expect(cancelled.military!.orders).toEqual([]);
            expect(totals(cancelled)).toEqual(totals(initial));
            await expect.poll(() => writes.length).toBeGreaterThan(0);
            expect(new Set(writes.map((w) => w.p)).size).toBe(1);
            for (const w of writes) expect(w.d).toEqual(writes[0].d);
            cancelId = writes[0].p.split("/").at(-1)!;
            expect(cancelId).not.toBe(formId);
            const receipt = (
              await db.doc(`campaignReceipts/${uid}/results/${cancelId}`).get()
            ).data();
            const {
              commandDigest,
            } = require("./lib/shared/command-receipt.js");
            expect(receipt).toMatchObject({
              status: "accepted",
              gameId: id,
              revision: cancelled.revision,
              requestDigest: await commandDigest(
                writes[0].p.replace(/^\//, ""),
                writes[0].d,
              ),
            });
            await expect(draft).toHaveValue("3");
            await expect(
              panel(owner).locator("#fighter-availability"),
            ).toHaveText("20 available · 0 reserved");
          },
        },
      ],
      views: views(),
    });
    await story.step("released-draft", {
      actor: aliases[0],
      description:
        "Inspect the preserved three-fighter draft and the returned availability after cancellation, without submitting a replacement formation.",
      action: async () => {
        await read(owner, panel(owner).locator(".counts"));
        await button(owner, "Form fleet").focus();
      },
      acknowledgement: {
        spec: "Formation is enabled with three fighters, zero infantry and no reserved units.",
        check: async () => {
          await expect(draft).toHaveValue("3");
          await expect(
            panel(owner).getByLabel("Infantry", { exact: true }),
          ).toHaveValue("0");
          await expect(button(owner, "Form fleet")).toBeEnabled();
          await expect(button(owner, "Form fleet")).toBeFocused();
          await expect(
            panel(owner).locator("#fighter-availability"),
          ).toHaveText("20 available · 0 reserved");
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Draft inspection cannot create a replacement order or change balances/forces.",
          check: async () => expect(await canonical()).toEqual(cancelled!),
        },
      ],
      views: views(),
    });
    await story.step("reload-cancelled", {
      actor: aliases[0],
      description:
        "Reload the exact campaign and inspect its confirmed absence of accepted fleet orders. The unsubmitted draft is not claimed as a persisted command.",
      action: async () => {
        await owner.goto(url);
        await openForces(owner, 0);
        await read(owner, orders(owner));
      },
      acknowledgement: {
        spec: "Confirmed released reservations recover from persistence.",
        check: async () => {
          await expect(orders(owner)).toContainText(
            "No fleet orders are waiting.",
          );
          await expect(
            panel(owner).locator("#fighter-availability"),
          ).toHaveText("20 available · 0 reserved");
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Reload does not re-create the cancelled order or append a new revision.",
          check: async () => expect(await canonical()).toEqual(cancelled!),
        },
      ],
      views: views(),
    });
    let settled: Campaign;
    await story.harness(
      "cancelled-boundary",
      "Advance to the cancelled formation's real boundary and invoke the production leased tick service, then repeat delivery. Only ordinary production may occur; no formation is injected.",
      async () => {
        const next = cancelled!.economy!.nextTickAt;
        for (const p of pages) await p.clock.setFixedTime(next);
        expect(await settleCampaignTicks(id, () => next)).toBe(1);
        settled = await canonical();
        expect(await settleCampaignTicks(id, () => next)).toBe(0);
        expect(await canonical()).toEqual(settled);
      },
    );
    await story.step("cancelled-order-never-executes", {
      actor: aliases[0],
      description:
        "Inspect the next confirmed tick: no fleet appears, and both commanders retain their own produced forces.",
      action: async () => {
        await read(owner, panel(owner).locator(".counts"));
      },
      acknowledgement: {
        spec: "The accepted cancellation remains effective past the original execution boundary.",
        check: async () => {
          await expect(orders(owner)).toContainText(
            "No fleet orders are waiting.",
          );
          await expect(
            panel(owner).getByRole("button", { name: /^Fleet [0-9]+$/ }),
          ).toHaveCount(0);
          await expect(panel(owner)).not.toContainText("Fleet formed");
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "No formation outcome or force movement exists; only the real production ledger increases totals and repeated delivery is a complete no-op.",
          check: async () => {
            const s = await canonical();
            expect(s).toEqual(settled!);
            expect(Object.values(s.military!.fleets)).toEqual([]);
            expect(s.military!.orders).toEqual([]);
            expect(s.military!.ledger[uid] ?? []).toEqual([]);
            const output = s.economy!.ledger[uid];
            expect(totals(s)).toEqual({
              fighters: totals(cancelled!).fighters + output.fighters,
              infantry: totals(cancelled!).infantry + output.infantry,
            });
            expect(
              (
                await db
                  .doc(`campaignReceipts/${uid}/results/${cancelId}`)
                  .get()
              ).get("revision"),
            ).toBe(cancelled!.revision);
          },
        },
      ],
      views: views(),
    });
    await story.step("return-to-system", {
      actor: aliases[0],
      description:
        "Return to the galaxy with Enter and confirm the system has no fleet marker.",
      action: async () => {
        await button(owner, "Back to system").focus();
        await owner.keyboard.press("Enter");
        await expect(button(owner, "View forces")).toBeFocused();
        await button(owner, "Back to galaxy").focus();
        await owner.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "Focus returns to Inspect system after closing the expanded scene and no owned fleet marker exists.",
        check: async () => {
          await expect(
            inspector(owner).getByRole("button", {
              name: "Inspect system",
              exact: true,
            }),
          ).toBeFocused();
          await expectStationedCount(owner, 0);
          await expect(
            owner.getByLabel(/1 of your fleets stationed at/),
          ).toHaveCount(0);
        },
      },
      verifications: [
        {
          spec: "Navigation preserves settled forces and no application error occurred.",
          check: async () => {
            expect(await canonical()).toEqual(settled!);
            expect(errors).toEqual([]);
          },
        },
      ],
      views: views(),
    });
  } finally {
    for (const c of contexts) await c.close();
  }
});
