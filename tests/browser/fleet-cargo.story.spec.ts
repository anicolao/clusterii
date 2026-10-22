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
test("Live fleet cargo transfers conserve private forces through reload", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-fleet-cargo",
    title: "Unload, recover and reload fleet cargo",
    inventory: ["UX-08", "UX-14", "UX-16"],
    description:
      "Four independent commanders enter through actual authenticated controls. Formation establishes a fleet; unload and load reserve infantry and move it once at leased settlement. Owner and other-player views show private orders and outcomes. Fixed catalogue/domain clocks are explicit harness controls. Development transport capacity and tick rules remain under review; this does not certify travel, managed encryption or hosted scheduling.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let id = "",
    url = "";
  const campaignName = `${fleetStoryPrefix}cargo ${info.project.name}`;
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
    let previous = formed!;
    for (const [operation, quantity, invalid, tick, remaining] of [
      ["Unload", 5, 21, 2, 15],
      ["Load", 3, 6, 3, 18],
    ] as const) {
      const key = operation.toLowerCase(),
        commit = button(owner, `${operation} infantry`),
        field = panel(owner).getByRole("spinbutton", {
          name: /^Infantry to (load|unload)$/,
        }),
        footer = panel(owner).locator("footer").getByRole("status");
      await story.step(`${key}-capacity`, {
        actor: aliases[0],
        description: `Choose ${operation.toLowerCase()} and inspect a quantity beyond the available cargo or capacity. No order is issued.`,
        action: async () => {
          await button(owner, fleetName).click();
          await button(owner, operation).click();
          await field.fill(String(invalid));
          await read(owner, field);
        },
        acknowledgement: {
          spec: "The production control rejects the excess quantity before submission.",
          check: async () => expect(commit).toBeDisabled(),
        },
        verifications: [
          ...checks(),
          {
            spec: "Invalid cargo input creates no revision, reservation or unit movement.",
            check: async () => expect(await canonical()).toEqual(previous),
          },
        ],
        views: views(),
      });
      await story.step(`${key}-preview`, {
        actor: aliases[0],
        description: `Review ${quantity} infantry for ${operation.toLowerCase()} and focus the fixed commitment control.`,
        action: async () => {
          await field.fill(String(quantity));
          await read(owner, field);
          await commit.focus();
        },
        acknowledgement: {
          spec: "The valid cargo order is enabled and keyboard focused.",
          check: async () => {
            await expect(commit).toBeEnabled();
            await expect(commit).toBeFocused();
          },
        },
        verifications: checks(),
        views: views(),
      });
      let accepted: Campaign,
        orderId = "";
      await story.step(`${key}-accepted`, {
        actor: aliases[0],
        description: `Confirm ${operation.toLowerCase()} with Enter. The acknowledged reservation waits for tick ${tick}; infantry has not moved.`,
        action: async () => {
          await commit.press("Enter");
        },
        acknowledgement: {
          spec: "The service acknowledges the exact transfer and scheduled tick.",
          check: async () => {
            await expect(footer).toHaveText(
              "Cargo order accepted. Transfer scheduled.",
            );
            await expect(orders(owner)).toContainText(
              `${operation} · ${quantity} infantry · tick ${tick}`,
            );
            await read(owner, orders(owner));
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "One accepted receipt and revision reserve the transfer; all garrisons and fleets are unchanged.",
            check: async () => {
              accepted = await canonical();
              expect(accepted.revision).toBe(previous.revision + 1);
              expect(accepted.systems).toEqual(previous.systems);
              expect(accepted.military!.fleets).toEqual(
                previous.military!.fleets,
              );
              expect(accepted.military!.orders).toHaveLength(1);
              const order = accepted.military!.orders[0];
              orderId = order.id;
              expect(order).toMatchObject({
                uid,
                fleetId,
                starId: home,
                cargo: key,
                infantry: quantity,
                effectiveTick: tick,
              });
              const receipt = await db
                .doc(`campaignReceipts/${uid}/results/${orderId}`)
                .get();
              expect(receipt.get("status")).toBe("accepted");
              expect(receipt.get("revision")).toBe(accepted.revision);
              expect(totals(accepted)).toEqual(totals(previous));
            },
          },
        ],
        views: views(),
      });
      await story.step(`${key}-reload`, {
        actor: aliases[0],
        description:
          "Reload the exact campaign and recover the same private accepted cargo order.",
        action: async () => {
          await owner.goto(url);
          await inspector(owner)
            .getByRole("button", { name: "Fleets · 1", exact: true })
            .click();
          await button(owner, fleetName).click();
          await button(owner, operation).click();
          await read(owner, orders(owner));
        },
        acknowledgement: {
          spec: "The original quantity and settlement tick return from authoritative persistence.",
          check: async () =>
            expect(orders(owner)).toContainText(
              `${operation} · ${quantity} infantry · tick ${tick}`,
            ),
        },
        verifications: [
          ...checks(),
          {
            spec: "Reload creates no new command, revision or transfer.",
            check: async () => expect(await canonical()).toEqual(accepted!),
          },
        ],
        views: views(),
      });
      let settled: Campaign;
      await story.harness(
        `${key}-settlement`,
        "Advance the explicitly labelled domain clock and deliver the real leased tick, then repeat delivery. No cargo, production or outcome is injected; hosted cadence remains unverified.",
        async () => {
          const next = accepted!.economy!.nextTickAt;
          for (const p of pages) await p.clock.setFixedTime(next);
          expect(await settleCampaignTicks(id, () => next)).toBe(1);
          settled = await canonical();
          expect(await settleCampaignTicks(id, () => next)).toBe(0);
          expect(await canonical()).toEqual(settled);
        },
      );
      await story.step(`${key}-settled`, {
        actor: aliases[0],
        description: `Read the confirmed ${quantity}-infantry transfer. The fleet now carries ${remaining} infantry; other commanders receive no private order or ledger.`,
        action: async () => {
          await expect(outcome(`Infantry ${key}ed`)).toBeVisible();
          await read(owner, outcome(`Infantry ${key}ed`));
        },
        acknowledgement: {
          spec: "The matching authoritative result replaces the scheduled transfer and clears the reservation.",
          check: async () => {
            await expect(outcome(`Infantry ${key}ed`)).toHaveText(
              `Infantry ${key}ed · ${quantity} infantry.`,
            );
            await expect(panel(owner)).not.toContainText("Transfer scheduled.");
            await expect(orders(owner)).toContainText(
              "No fleet orders are waiting.",
            );
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "Exactly one matching ledger transfers infantry between fleet and surface; only recorded production changes combined forces.",
            check: async () => {
              const state = await canonical();
              expect(state).toEqual(settled!);
              expect(state.military!.orders).toEqual([]);
              expect(Object.keys(state.military!.fleets)).toEqual([fleetId]);
              expect(state.military!.fleets[fleetId]).toMatchObject({
                fighters: 2,
                infantry: remaining,
                starId: home,
              });
              expect(state.military!.ledger[uid]).toHaveLength(1);
              expect(state.military!.ledger[uid][0]).toMatchObject({
                id: orderId,
                fleetId,
                result: `${key}ed`,
                infantry: quantity,
              });
              const output = state.economy!.ledger[uid];
              expect(totals(state)).toEqual({
                fighters: totals(previous).fighters + output.fighters,
                infantry: totals(previous).infantry + output.infantry,
              });
              expect(state.systems[home].infantry).toBe(
                previous.systems[home].infantry +
                  output.infantry +
                  (operation === "Unload" ? quantity : -quantity),
              );
            },
          },
        ],
        views: views(),
      });
      previous = settled!;
    }
    await story.step("recover-loaded-fleet", {
      actor: aliases[0],
      description:
        "Reload the final loaded fleet and return to the galaxy using the keyboard.",
      action: async () => {
        await owner.goto(url);
        await inspector(owner)
          .getByRole("button", { name: "Fleets · 1", exact: true })
          .click();
        await expect(outcome("Infantry loaded")).toBeVisible();
        await button(owner, "Back to system").focus();
        await button(owner, "Back to system").press("Enter");
      },
      acknowledgement: {
        spec: "The stationed fleet marker remains and the opener regains focus.",
        check: async () => {
          await expect(
            inspector(owner).getByRole("button", {
              name: "Fleets · 1",
              exact: true,
            }),
          ).toBeFocused();
          await expect(
            owner.getByLabel(/1 of your fleets stationed at/),
          ).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "Reload preserves the final conserved forces without another effect or application error.",
          check: async () => {
            expect(await canonical()).toEqual(previous);
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
