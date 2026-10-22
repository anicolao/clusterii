import { createRequire } from "node:module";
import type {
  Page,
  BrowserContext,
  Locator,
  WebSocketRoute,
} from "@playwright/test";
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
test("Live fleet reorganization recovers one private split and conserves forces", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-fleet-reorganization",
    title: "Recover a split and recombine private forces",
    inventory: ["UX-08", "UX-14", "UX-16"],
    description:
      "Four independent commanders enter through actual authenticated controls. Formation supplies real forces; a withheld split survives reload with one command identity, then leased settlement splits and recombines the complement once. Owner and other-player views show private orders and outcomes. Fixed catalogue/domain clocks are explicit harness controls. Development transport capacity and tick rules remain under review; this does not certify travel, managed encryption or hosted scheduling.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let id = "",
    url = "";
  let holding = false;
  const writes: { p: string; d: Record<string, unknown> }[] = [],
    held: {
      server: WebSocketRoute;
      raw: string | Buffer;
      active: () => boolean;
    }[] = [];
  const campaignName = `${fleetStoryPrefix}reorganization ${info.project.name}`;
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
              let active = true;
              ws.onClose(() => {
                active = false;
                server.close();
              });
              ws.onMessage((raw) => {
                let frame;
                try {
                  frame = JSON.parse(String(raw));
                } catch {}
                if (
                  frame?.d?.a === "p" &&
                  frame.d.b?.d?.kind === "fleet.split"
                ) {
                  writes.push(frame.d.b);
                  if (holding) {
                    held.push({ server, raw, active: () => active });
                    return;
                  }
                }
                server.send(raw);
              });
              server.onMessage((raw) => ws.send(raw));
            });
          const page = await ctx.newPage();
          pages.push(page);
          page.on("pageerror", (error) => errors.push(error.message));
          const email = `reorganization-story-${info.project.name}-${i}-${Date.now()}@example.test`;
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
        for (const p of [owner, peer])
          await inspector(p)
            .getByRole("button", { name: "Fleets · 0", exact: true })
            .click();
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
        await inspector(owner)
          .getByRole("button", { name: "Fleets · 0", exact: true })
          .click();
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
        spec: "The confirmed fleet contains four fighters and eighteen infantry and can be disbanded.",
        check: async () => {
          await expect(outcome("Fleet formed")).toHaveText(
            "Fleet formed · 4 fighters · 18 infantry.",
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
              fighters: 4,
              infantry: 18,
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
    await story.step("invalid-split", {
      actor: aliases[0],
      description:
        "Select Split and try to leave eighteen infantry with only one fighter. The draft explains the capacity constraint before submission.",
      action: async () => {
        await button(owner, "Split").click();
        await panel(owner)
          .getByLabel("Fighters to split", { exact: true })
          .fill("3");
        await panel(owner)
          .getByLabel("Infantry to split", { exact: true })
          .fill("0");
      },
      acknowledgement: {
        spec: "Split is disabled because both complements must retain transport capacity.",
        check: async () => {
          await expect(button(owner, "Split fleet")).toBeDisabled();
          await expect(panel(owner)).toContainText(
            "Both fleets need a fighter and enough transport capacity for their infantry.",
          );
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Invalid draft creates no order or canonical mutation.",
          check: async () => expect(await canonical()).toEqual(formed!),
        },
      ],
      views: views(),
    });
    await story.step("review-split", {
      actor: aliases[0],
      description:
        "Choose one fighter and eight infantry for the new fleet; review the three fighters and ten infantry retained by the original fleet.",
      action: async () => {
        await panel(owner)
          .getByLabel("Fighters to split", { exact: true })
          .fill("1");
        await panel(owner)
          .getByLabel("Infantry to split", { exact: true })
          .fill("8");
        await button(owner, "Split fleet").focus();
      },
      acknowledgement: {
        spec: "The focused keyboard commitment matches both final complements.",
        check: async () => {
          await expect(button(owner, "Split fleet")).toBeEnabled();
          await expect(button(owner, "Split fleet")).toBeFocused();
          await expect(panel(owner)).toContainText(
            "New fleet: 1 fighters · 8 infantry.",
          );
          await expect(panel(owner)).toContainText(
            "retains 3 fighters · 10 infantry.",
          );
        },
      },
      verifications: checks(),
      views: views(),
    });
    await story.harness(
      "withhold-split",
      "Hold only fleet.split RTDB writes before actual ingress. No identity, payload, canonical state or receipt is altered.",
      async () => {
        holding = true;
      },
    );
    await story.step("pending-split", {
      actor: aliases[0],
      description:
        "Confirm Split with Enter. Delivery is withheld, so the original complement remains aboard while the command awaits acknowledgement.",
      action: async () => {
        await button(owner, "Split fleet").press("Enter");
      },
      acknowledgement: {
        spec: "The unacknowledged split disables repeat commitment.",
        check: async () => {
          await expect.poll(() => writes.length).toBeGreaterThan(0);
          await expect(button(owner, "Split fleet")).toBeDisabled();
          await expect(panel(owner).locator("footer")).toContainText(
            "Awaiting acknowledgement",
          );
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Withheld split has no effect.",
          check: async () => expect(await canonical()).toEqual(formed!),
        },
      ],
      views: views(),
    });
    await story.step("reload-pending-split", {
      actor: aliases[0],
      description:
        "Reload the uncertain order and inspect its original selected fleet and one-fighter/eight-infantry split.",
      action: async () => {
        await owner.reload();
      },
      acknowledgement: {
        spec: "Recovery opens the original split, retaining its exact proposed complement and disabled commitment.",
        check: async () => {
          await expect(panel(owner)).toBeVisible();
          await expect(
            panel(owner).getByLabel("Fighters to split", { exact: true }),
          ).toHaveValue("1");
          await expect(
            panel(owner).getByLabel("Infantry to split", { exact: true }),
          ).toHaveValue("8");
          await expect(button(owner, "Split fleet")).toBeDisabled();
          await expect.poll(() => writes.length).toBeGreaterThanOrEqual(2);
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Retransmissions keep one command path and identical encrypted payload; reload neither reserves nor duplicates forces.",
          check: async () => {
            expect(new Set(writes.map((w) => w.p)).size).toBe(1);
            for (const w of writes) expect(w.d).toEqual(writes[0].d);
            expect(await canonical()).toEqual(formed!);
          },
        },
      ],
      views: views(),
    });
    await story.harness(
      "restore-split",
      "Release retained writes on the live connection to the real service; repeated transport frames retain their original identity and payload.",
      async () => {
        holding = false;
        for (const h of held) if (h.active()) h.server.send(h.raw);
      },
    );
    let splitting: Campaign,
      splitId = "",
      split: Campaign,
      childId = "",
      childName = "";
    await story.step("accepted-split", {
      actor: aliases[0],
      description:
        "Read the actual split receipt and scheduled complement after transport returns.",
      action: async () => {},
      acknowledgement: {
        spec: "One split is accepted for tick two.",
        check: async () => {
          await expect(panel(owner).locator("footer")).toContainText(
            "Reorganization accepted. Execution scheduled.",
          );
          await expect(orders(owner)).toContainText(
            "Split · 1 fighters · 8 infantry · tick 2",
          );
          await read(owner, orders(owner));
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "One logical accepted command adds exactly one revision and reservation, without changing garrisons or fleets.",
          check: async () => {
            splitting = await canonical();
            expect(splitting.revision).toBe(formed!.revision + 1);
            expect(splitting.systems).toEqual(formed!.systems);
            expect(splitting.military!.fleets).toEqual(
              formed!.military!.fleets,
            );
            expect(splitting.military!.orders).toHaveLength(1);
            const o = splitting.military!.orders[0];
            splitId = o.id;
            expect(o).toMatchObject({
              uid,
              fleetId,
              reorganization: "split",
              fighters: 1,
              infantry: 8,
              effectiveTick: 2,
            });
            expect(writes[0].p.split("/").at(-1)).toBe(splitId);
            expect(
              (
                await db.doc(`campaignReceipts/${uid}/results/${splitId}`).get()
              ).get("status"),
            ).toBe("accepted");
          },
        },
      ],
      views: views(),
    });
    await story.harness(
      "settle-split",
      "Deliver tick two through the real leased service; repeat delivery must leave the complete canonical state unchanged.",
      async () => {
        const next = splitting!.economy!.nextTickAt;
        for (const p of pages) await p.clock.setFixedTime(next);
        expect(await settleCampaignTicks(id, () => next)).toBe(1);
        split = await canonical();
        expect(await settleCampaignTicks(id, () => next)).toBe(0);
        expect(await canonical()).toEqual(split);
        childId = Object.keys(split.military!.fleets).find(
          (k) => k !== fleetId,
        )!;
        childName = `Fleet ${split.military!.fleets[childId].number}`;
      },
    );
    await story.step("split-fleets", {
      actor: aliases[0],
      description:
        "Read the completed split and select the new fleet with Enter; private forces remain absent from the other commander's projection.",
      action: async () => {
        await expect(outcome("Fleet split")).toBeVisible();
        await button(owner, childName).focus();
        await button(owner, childName).press("Enter");
        await read(owner, outcome("Fleet split"));
      },
      acknowledgement: {
        spec: "The original fleet retains three fighters/ten infantry and the new fleet holds one/eight.",
        check: async () => {
          await expect(
            panel(owner).getByRole("button", { name: /^Fleet [0-9]+$/ }),
          ).toHaveCount(2);
          await expect(outcome("Fleet split")).toContainText(
            "1 fighters · 8 infantry",
          );
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Exactly one matching split ledger and new fleet conserve forces plus recorded production, with no pending order.",
          check: async () => {
            const s = await canonical();
            expect(s).toEqual(split!);
            expect(s.military!.fleets[fleetId]).toMatchObject({
              fighters: 3,
              infantry: 10,
            });
            expect(s.military!.fleets[childId]).toMatchObject({
              uid,
              starId: home,
              fighters: 1,
              infantry: 8,
            });
            expect(s.military!.orders).toEqual([]);
            expect(s.military!.ledger[uid]).toHaveLength(1);
            expect(s.military!.ledger[uid][0]).toMatchObject({
              id: splitId,
              result: "split",
              fleetId,
              targetFleetId: childId,
            });
            const output = s.economy!.ledger[uid];
            expect(totals(s)).toEqual({
              fighters: totals(formed!).fighters + output.fighters,
              infantry: totals(formed!).infantry + output.infantry,
            });
          },
        },
      ],
      views: views(),
    });
    await story.step("choose-recipient", {
      actor: aliases[0],
      description:
        "Open Merge, inspect its required recipient, and use the actual receiving-fleet control to choose the original fleet.",
      action: async () => {
        await button(owner, "Merge").click();
        await expect(button(owner, "Merge fleets")).toBeDisabled();
        await panel(owner)
          .getByRole("combobox", { name: "Receiving fleet" })
          .selectOption({ label: `${fleetName} · 3 fighters · 10 infantry` });
        await button(owner, "Merge fleets").focus();
      },
      acknowledgement: {
        spec: "The selected receiving fleet makes keyboard merge available.",
        check: async () => {
          await expect(button(owner, "Merge fleets")).toBeEnabled();
          await expect(button(owner, "Merge fleets")).toBeFocused();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Choosing a recipient cannot move forces.",
          check: async () => expect(await canonical()).toEqual(split!),
        },
      ],
      views: views(),
    });
    let merging: Campaign,
      mergeId = "",
      merged: Campaign;
    await story.step("accepted-merge", {
      actor: aliases[0],
      description:
        "Confirm merge with Enter and inspect the tick-three acknowledgement.",
      action: async () => {
        await button(owner, "Merge fleets").press("Enter");
      },
      acknowledgement: {
        spec: "Merge is accepted for the child's complete complement.",
        check: async () => {
          await expect(panel(owner).locator("footer")).toContainText(
            "Reorganization accepted. Execution scheduled.",
          );
          await expect(orders(owner)).toContainText(
            "Merge · 1 fighters · 8 infantry · tick 3",
          );
          await read(owner, orders(owner));
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "One accepted merge reserves both fleets without moving any units.",
          check: async () => {
            merging = await canonical();
            expect(merging.revision).toBe(split!.revision + 1);
            expect(merging.systems).toEqual(split!.systems);
            expect(merging.military!.fleets).toEqual(split!.military!.fleets);
            expect(merging.military!.orders).toHaveLength(1);
            const o = merging.military!.orders[0];
            mergeId = o.id;
            expect(o).toMatchObject({
              uid,
              fleetId: childId,
              targetFleetId: fleetId,
              reorganization: "merge",
              fighters: 1,
              infantry: 8,
              effectiveTick: 3,
            });
            expect(
              (
                await db.doc(`campaignReceipts/${uid}/results/${mergeId}`).get()
              ).get("status"),
            ).toBe("accepted");
          },
        },
      ],
      views: views(),
    });
    await story.step("reserved-recipient", {
      actor: aliases[0],
      description:
        "Inspect the receiving fleet: its existing merge reservation prevents a competing disband.",
      action: async () => {
        await button(owner, fleetName).click();
        await button(owner, "Disband").click();
      },
      acknowledgement: {
        spec: "The receiving fleet cannot be disbanded while reserved.",
        check: async () =>
          expect(button(owner, "Disband fleet")).toBeDisabled(),
      },
      verifications: [
        ...checks(),
        {
          spec: "Inspecting the reserved recipient changes no canonical facts.",
          check: async () => expect(await canonical()).toEqual(merging!),
        },
      ],
      views: views(),
    });
    await story.step("reload-merge", {
      actor: aliases[0],
      description:
        "Reload the accepted merge and reselect its source fleet, retaining the exact reservation.",
      action: async () => {
        await owner.goto(url);
        await inspector(owner)
          .getByRole("button", { name: "Fleets · 2", exact: true })
          .click();
        await button(owner, childName).click();
        await button(owner, "Merge").click();
        await read(owner, orders(owner));
      },
      acknowledgement: {
        spec: "The same merge order returns from persistence.",
        check: async () =>
          expect(orders(owner)).toContainText(
            "Merge · 1 fighters · 8 infantry · tick 3",
          ),
      },
      verifications: [
        ...checks(),
        {
          spec: "Reload adds no command, revision or force movement.",
          check: async () => expect(await canonical()).toEqual(merging!),
        },
      ],
      views: views(),
    });
    await story.harness(
      "settle-merge",
      "Deliver the third boundary through the real leased tick service, then repeat it. No result is injected.",
      async () => {
        const next = merging!.economy!.nextTickAt;
        for (const p of pages) await p.clock.setFixedTime(next);
        expect(await settleCampaignTicks(id, () => next)).toBe(1);
        merged = await canonical();
        expect(await settleCampaignTicks(id, () => next)).toBe(0);
        expect(await canonical()).toEqual(merged);
      },
    );
    await story.step("merged-fleet", {
      actor: aliases[0],
      description:
        "Read the final merge result. Focus follows the surviving recipient and the complete complement is reunited.",
      action: async () => {
        await expect(
          panel(owner).getByRole("heading", { name: fleetName, exact: true }),
        ).toBeFocused();
        await read(owner, outcome("Fleets merged"));
      },
      acknowledgement: {
        spec: "One fleet remains and its final result no longer claims a future execution.",
        check: async () => {
          await expect(
            panel(owner).getByRole("button", { name: /^Fleet [0-9]+$/ }),
          ).toHaveCount(1);
          await expect(outcome("Fleets merged")).toBeVisible();
          await expect(panel(owner)).not.toContainText("Execution scheduled.");
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "One matching merge ledger retires the child, conserves the full complement and adds only actual production to total forces.",
          check: async () => {
            const s = await canonical();
            expect(s).toEqual(merged!);
            expect(Object.keys(s.military!.fleets)).toEqual([fleetId]);
            expect(s.military!.fleets[fleetId]).toMatchObject({
              fighters: 4,
              infantry: 18,
            });
            expect(s.military!.orders).toEqual([]);
            expect(s.military!.ledger[uid]).toHaveLength(1);
            expect(s.military!.ledger[uid][0]).toMatchObject({
              id: mergeId,
              fleetId: childId,
              targetFleetId: fleetId,
              result: "merged",
            });
            const output = s.economy!.ledger[uid];
            expect(totals(s)).toEqual({
              fighters: totals(split!).fighters + output.fighters,
              infantry: totals(split!).infantry + output.infantry,
            });
          },
        },
      ],
      views: views(),
    });
    await story.step("return-to-galaxy", {
      actor: aliases[0],
      description:
        "Return to the actual galaxy with Enter and inspect the single stationed fleet marker.",
      action: async () => {
        await button(owner, "Back to system").focus();
        await button(owner, "Back to system").press("Enter");
      },
      acknowledgement: {
        spec: "Focus returns to Fleets · 1 and the owned map marker confirms one stationed fleet.",
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
          spec: "Final navigation preserves exact settled state and has no application errors.",
          check: async () => {
            expect(await canonical()).toEqual(merged!);
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
