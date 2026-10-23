import { createRequire } from "node:module";
import type { Page, BrowserContext } from "@playwright/test";
import type { Campaign } from "../../../shared/campaign";
import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { login, grantDeveloper } from "../../browser/helpers";
import { openForces } from "../../browser/galaxy-navigation";
import {
  admissionAt,
  scheduledAt,
} from "../../browser/story-helpers/admission-clock.mjs";
import { fleetStoryPrefix } from "../../browser/story-helpers/fleet-clock.mjs";
const aliases = [
  "Route marshal",
  "Independent marshal",
  "Outer witness",
  "Fourth envoy",
];
const button = (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true });
test("Review confirmed forces before acknowledged dispatch and recovery", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "route-force-review",
    title: "Review the forces sent and left behind",
    inventory: ["UX-08", "UX-14", "UX-16"],
    description:
      "Ordinary authenticated formation and dispatch with actual leased settlement. Fixed catalogue/domain clock and Scheduler delivery are labelled harness controls, never injected forces. Owner and peer authorized projections corroborate private forces; hosted scheduling and managed crypto remain outside this development journey.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [],
    uids: string[] = [];
  let id = "",
    url = "";
  const campaignName = fleetStoryPrefix + "force review " + info.project.name;
  const require = createRequire(
    new URL("../../../functions/package.json", import.meta.url),
  );
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const auth = require("firebase-admin/auth").getAuth(),
    db = require("firebase-admin/firestore").getFirestore();
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
  const published = async (uid: string) => {
    const h = await db.doc(`campaignViews/${id}/members/${uid}`).get(),
      k = await db.doc(`campaignKeys/${id}/members/${uid}`).get(),
      ctx = context(id, h.get("revision"), `member:${uid}`, 1);
    return provider("mock").open(
      h.get("envelope"),
      await unwrap(h.get("grant"), k.get("kek"), uid, ctx, "mock"),
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
          uids.push((await auth.getUserByEmail(email)).uid);
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

    expect(new Set(uids).size).toBe(4);
    const owner = pages[0],
      peer = pages[1],
      uid = uids[0],
      initial = await canonical();
    for (const actor of uids)
      expect(initial.seats.filter((s) => s.uid === actor)).toHaveLength(1);
    const home = initial.seats.find((s) => s.uid === uid)!.home!;
    const panel = owner.getByRole("region", {
      name: "Fleet preparation",
      exact: true,
    });
    const planner = owner.getByRole("region", {
      name: "Fleet route planner",
      exact: true,
    });
    const review = planner.getByRole("region", {
      name: "Confirmed route forces",
      exact: true,
    });
    const send = planner.getByRole("button", {
      name: "Send fleet",
      exact: true,
    });
    const views = () => [
      { page: owner, player: aliases[0], surface: "game" as const },
      { page: peer, player: aliases[1], surface: "game" as const },
    ];
    let reserved: Campaign,
      formed: Campaign,
      accepted: Campaign,
      fleetId = "",
      fleetName = "",
      targetName = "";
    const privacy = {
      spec: "Independent commander receives no owner's fleet, route order or private complement.",
      check: async () => {
        const v = await published(uids[1]);
        expect(v.military.fleets).toEqual([]);
        expect(v.military.orders).toEqual([]);
        expect(errors).toEqual([]);
      },
    };
    await story.step("reserve-real-complement", {
      actor: aliases[0],
      description:
        "Form two fighters carrying twenty infantry through the actual preparation controls.",
      action: async () => {
        await openForces(peer, 0);
        await openForces(owner, 0);
        await panel.getByLabel("Fighters", { exact: true }).fill("2");
        await panel.getByLabel("Infantry", { exact: true }).fill("20");
        await button(owner, "Form fleet").focus();
        await button(owner, "Form fleet").press("Enter");
      },
      acknowledgement: {
        spec: "Authoritative formation receipt reserves the complement without moving the garrison.",
        check: async () => {
          await expect(
            panel
              .getByRole("status")
              .filter({ hasText: "Fleet order accepted." }),
          ).toBeVisible();
          reserved = await canonical();
          expect(reserved.systems).toEqual(initial.systems);
          expect(reserved.military!.orders).toHaveLength(1);
          const o = reserved.military!.orders[0];
          expect(o).toMatchObject({ uid, fighters: 2, infantry: 20 });
          expect(
            (await db.doc(`campaignReceipts/${uid}/results/${o.id}`).get()).get(
              "status",
            ),
          ).toBe("accepted");
        },
      },
      verifications: [privacy],
      views: views(),
    });
    await story.harness(
      "leased-formation",
      "One real tick, concurrent and repeated deliveries; no state injection or hosted scheduling claim.",
      async () => {
        const now = reserved!.economy!.nextTickAt;
        for (const p of pages) await p.clock.setFixedTime(now);
        const counts = await Promise.all([
          settleCampaignTicks(id, () => now),
          settleCampaignTicks(id, () => now),
        ]);
        expect(counts.reduce((a: number, b: number) => a + b, 0)).toBe(1);
        formed = await canonical();
        expect(await settleCampaignTicks(id, () => now)).toBe(0);
        expect(await canonical()).toEqual(formed);
      },
    );
    await story.step("review-confirmed-forces", {
      actor: aliases[0],
      description:
        "Select the formed fleet and review capacity and the exact origin garrison before planning.",
      action: async () => {
        await expect(
          panel
            .getByRole("status")
            .filter({ hasText: "Fleet formed · 2 fighters · 20 infantry." }),
        ).toBeVisible();
        const pick = panel.getByRole("button", { name: /^Fleet [0-9]+$/ });
        fleetName = await pick.innerText();
        await pick.focus();
        await pick.press("Enter");
        await button(owner, "Plot route").focus();
        await button(owner, "Plot route").press("Enter");
        await review
          .getByRole("region", { name: "Fleet transport manifest" })
          .scrollIntoViewIfNeeded();
      },
      acknowledgement: {
        spec: "The review shows actual formed forces and capacity; garrison excludes the fleet exactly once.",
        check: async () => {
          fleetId = Object.values(formed!.military!.fleets).find(
            (f) => f.uid === uid,
          )!.id;
          await expect(review).toContainText("20 / 20 infantry");
          await expect(review).toContainText(
            formed!.systems[home].fighters + " fighters",
          );
          await expect(review).toContainText(
            formed!.systems[home].infantry + " infantry",
          );
          expect(formed!.systems[home].fighters + 2).toBe(
            initial.systems[home].fighters +
              formed!.economy!.ledger[uid].fighters,
          );
          expect(formed!.systems[home].infantry + 20).toBe(
            initial.systems[home].infantry +
              formed!.economy!.ledger[uid].infantry,
          );
          await expect(send).toBeDisabled();
          await expect(
            owner.locator(".command-rail .commander-presence"),
          ).toBeHidden();
        },
      },
      verifications: [
        privacy,
        {
          spec: "Review fits its bounded reading region while commitment actions stay in the viewport.",
          check: async () => {
            const a = await review
                .getByRole("region", { name: "Fleet transport manifest" })
                .boundingBox(),
              b = await planner
                .getByRole("region", { name: "Route details", exact: true })
                .boundingBox();
            expect(a!.y).toBeGreaterThanOrEqual(b!.y);
            expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + b!.height);
            const r = await planner.locator("footer").boundingBox();
            expect(r!.y + r!.height).toBeLessThanOrEqual(
              owner.viewportSize()!.height,
            );
          },
        },
      ],
      views: views(),
    });
    await story.step("read-origin-defense", {
      actor: aliases[0],
      description:
        "Read the independently authorized origin layers and other own stationed fleets before sending.",
      action: async () => {
        const target = review.getByRole("region", {
          name: "Confirmed origin defense",
        });
        await planner
          .getByRole("region", { name: "Route details", exact: true })
          .focus();
        await target.scrollIntoViewIfNeeded();
      },
      acknowledgement: {
        spec: "Both current garrison counts and the concurrent-order qualification are fully readable in the bounded region.",
        check: async () => {
          const target = review.getByRole("region", {
            name: "Confirmed origin defense",
          });
          await expect(target).toContainText(
            formed!.systems[home].fighters + " fighters",
          );
          await expect(target).toContainText(
            formed!.systems[home].infantry + " infantry",
          );
          const a = await target.boundingBox(),
            b = await planner
              .getByRole("region", { name: "Route details", exact: true })
              .boundingBox();
          expect(a!.y).toBeGreaterThanOrEqual(b!.y);
          expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + b!.height);
          expect(await canonical()).toEqual(formed!);
        },
      },
      verifications: [privacy],
      views: views(),
    });
    await story.step("choose-real-waypoint", {
      actor: aliases[0],
      description:
        "Choose an actually reachable catalogue destination, review the commitment without issuing an order.",
      action: async () => {
        await planner
          .getByRole("button", { name: "Edit route", exact: true })
          .click();
        const catalogue = planner.getByRole("region", {
          name: "Waypoint catalogue",
        });
        const label = await catalogue
          .getByRole("button")
          .evaluateAll((bs) =>
            bs
              .find((b) => b.textContent?.includes("Within range"))
              ?.getAttribute("aria-label"),
          );
        expect(label).toBeTruthy();
        targetName = label!.slice(4, -9);
        await planner.getByRole("searchbox").fill(targetName);
        await button(owner, label!).focus();
        await button(owner, label!).press("Enter");
        await planner
          .getByRole("region", { name: "Route editing", exact: true })
          .getByRole("button", { name: "Review route", exact: true })
          .click();
        await send.focus();
      },
      acknowledgement: {
        spec: "Send becomes available while confirmed remaining-defense counts remain visible.",
        check: async () => {
          await expect(send).toBeEnabled();
          await expect(
            planner.getByLabel("Origin defense review"),
          ).toContainText(formed!.systems[home].fighters + " fighters");
          expect(await canonical()).toEqual(formed!);
        },
      },
      verifications: [privacy],
      views: views(),
    });
    await story.step("edit-multiple-waypoints", {
      actor: aliases[0],
      description:
        "Add another actual reachable waypoint and inspect both editable legs without issuing a command.",
      action: async () => {
        await planner
          .getByRole("button", { name: "Edit route", exact: true })
          .click();
        const editor = planner.getByRole("region", {
          name: "Route editing",
          exact: true,
        });
        await editor.getByRole("searchbox").fill("");
        const originName = initial.galaxy.stars.find(
          (s) => s.id === home,
        )!.name;
        const label = await editor
          .getByRole("region", { name: "Waypoint catalogue" })
          .getByRole("button")
          .evaluateAll(
            (bs, excluded) =>
              bs
                .find(
                  (b) =>
                    b.textContent?.includes("Within range") &&
                    !excluded.includes(b.getAttribute("aria-label") ?? ""),
                )
                ?.getAttribute("aria-label"),
            [
              "Add " + originName + " waypoint",
              "Add " + targetName + " waypoint",
            ],
          );
        expect(label).toBeTruthy();
        await editor.getByRole("button", { name: label!, exact: true }).focus();
        await owner.keyboard.press("Enter");
        await editor
          .getByRole("button", { name: "Move waypoint 2 earlier", exact: true })
          .focus();
      },
      acknowledgement: {
        spec: "Two actual waypoints are retained as unsent intent; no service revision changes.",
        check: async () => {
          await expect(
            planner
              .getByRole("list", { name: "Route waypoints" })
              .getByRole("listitem"),
          ).toHaveCount(2);
          expect(await canonical()).toEqual(formed!);
        },
      },
      verifications: [privacy],
      views: views(),
    });
    await story.step("reorder-remove-waypoint", {
      actor: aliases[0],
      description:
        "Move the second leg earlier and back, remove it, then return to the original route review.",
      action: async () => {
        const editor = planner.getByRole("region", {
          name: "Route editing",
          exact: true,
        });
        for (const name of [
          "Move waypoint 2 earlier",
          "Move waypoint 1 later",
        ]) {
          const c = editor.getByRole("button", { name, exact: true });
          await c.focus();
          await owner.keyboard.press("Enter");
        }
        await editor
          .getByRole("button", { name: "Remove waypoint 2", exact: true })
          .focus();
        await owner.keyboard.press("Enter");
        await editor
          .getByRole("button", { name: "Review route", exact: true })
          .click();
      },
      acknowledgement: {
        spec: "All edits remain local, the original destination survives and Edit route regains focus.",
        check: async () => {
          expect(await canonical()).toEqual(formed!);
          await expect(
            planner.getByRole("button", { name: "Edit route", exact: true }),
          ).toBeFocused();
          await expect(send).toBeEnabled();
        },
      },
      verifications: [privacy],
      views: views(),
    });
    await story.step("review-normal-motion", {
      actor: aliases[0],
      description:
        "Read the same confirmed route with normal motion preference and settled finite effects; no fast-forward.",
      action: async () => {
        await owner.emulateMedia({ reducedMotion: "no-preference" });
        await send.focus();
      },
      acknowledgement: {
        spec: "Actual media and root preference allow normal motion, with identical authoritative state.",
        check: async () => {
          expect(
            await owner.evaluate(
              () => matchMedia("(prefers-reduced-motion: reduce)").matches,
            ),
          ).toBe(false);
          await expect(owner.locator("html")).toHaveAttribute(
            "data-reduce-motion",
            "false",
          );
          expect(await canonical()).toEqual(formed!);
        },
      },
      verifications: [privacy],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          normalMotion: true,
          primary: [send],
        },
      ],
    });
    await owner.emulateMedia({ reducedMotion: "reduce" });
    await story.step("acknowledge-dispatch", {
      actor: aliases[0],
      description:
        "Send with Enter and read the real accepted route before any departure.",
      action: async () => {
        await send.press("Enter");
      },
      acknowledgement: {
        spec: "An authoritative receipt schedules departure without subtracting forces again.",
        check: async () => {
          await expect(
            planner.locator("footer").getByRole("status"),
          ).toHaveText("Route accepted. Departure scheduled.");
          accepted = await canonical();
          expect(accepted.systems).toEqual(formed!.systems);
          expect(accepted.military!.fleets).toEqual(formed!.military!.fleets);
          expect(accepted.military!.orders).toHaveLength(1);
          const o = accepted.military!.orders[0];
          expect(o.fleetId).toBe(fleetId);
          expect(
            (await db.doc(`campaignReceipts/${uid}/results/${o.id}`).get()).get(
              "status",
            ),
          ).toBe("accepted");
        },
      },
      verifications: [privacy],
      views: views(),
    });
    await story.step("recover-same-dispatch", {
      actor: aliases[0],
      description:
        "Reload the same campaign and inspect the same accepted fleet and destination without sending again.",
      action: async () => {
        await owner.goto(url);
        await openForces(owner, 1);
        await button(owner, fleetName).click();
        await button(owner, "Plot route").click();
        await planner
          .getByRole("list", { name: "Route waypoints" })
          .scrollIntoViewIfNeeded();
      },
      acknowledgement: {
        spec: "The accepted destination and immutable order return; no duplicate revision or forces.",
        check: async () => {
          await expect(
            planner.getByRole("list", { name: "Route waypoints" }),
          ).toContainText(targetName);
          await expect(
            planner
              .getByRole("status")
              .filter({ hasText: "Route accepted · departure tick" }),
          ).toBeVisible();
          expect(await canonical()).toEqual(accepted!);
        },
      },
      verifications: [privacy],
      views: views(),
    });
  } finally {
    for (const c of contexts) await c.close();
  }
});
