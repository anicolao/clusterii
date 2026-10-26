import { createRequire } from "node:module";
import type { Page, BrowserContext } from "@playwright/test";
import type { Campaign } from "../../../shared/campaign";
import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { login, grantDeveloper } from "../../browser/helpers";
import {
  admissionAt,
  scheduledAt,
  admissionPrefix,
} from "../../browser/story-helpers/admission-clock.mjs";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Return briefing", exact: true });
const save = (page: Page) =>
  panel(page).getByRole("button", {
    name: "Save visit and return to galaxy",
    exact: true,
  });
const open = async (page: Page) => {
  await button(page, "History").click();
  await button(page, "Since your last visit").click();
};
const aliases = [
  "Returning envoy",
  "Independent envoy",
  "Outer witness",
  "Fourth envoy",
];
test("Live return briefing recovers authorized activity and saves only the reviewed private period", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(300000);
  const story = new TestStepHelper(info, {
    id: "live-return-briefing",
    title: "Return to a complete private briefing without losing new activity",
    inventory: ["UX-12", "UX-14", "UX-16"],
    description:
      "Independent commanders inspect their authorized production history. A returning commander recovers a paged period, keeps their reading position when new activity arrives, saves only the reviewed period and inspects the remaining report. Visits belong to authoritative player identities. The development mock provider uses real encrypted commands and grants. Domain clocks and actual service delivery are explicitly labelled controls, not hosted certification. Interrupted visit and managed-key stories remain separate coverage.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let url = "",
    id = "";
  const campaignName = `${admissionPrefix}briefing ${info.project.name}`;
  const view = (i: number) => ({
    page: pages[i],
    player: aliases[i],
    surface: "game" as const,
  });
  const views = () => [view(0), view(1), view(2)];
  const noErrors = {
    spec: "No viewpoint has an uncaught application error.",
    check: async () => expect(errors).toEqual([]),
  };
  const require = createRequire(
    new URL("../../../functions/package.json", import.meta.url),
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
    const state = await canonical(),
      uid = state.seats[seat].uid;
    const h = await db.doc(`campaignViews/${id}/members/${uid}`).get(),
      key = await db.doc(`campaignKeys/${id}/members/${uid}`).get(),
      ctx = context(id, h.get("revision"), `member:${uid}`, 1);
    return provider("mock").open(
      h.get("envelope"),
      await unwrap(h.get("grant"), key.get("kek"), uid, ctx, "mock"),
      ctx,
    );
  };
  const rail = async (page: Page) => {
    const b = await panel(page).locator("footer").boundingBox();
    expect(b).not.toBeNull();
    expect(b!.y).toBeGreaterThanOrEqual(0);
    expect(b!.y + b!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  };
  const privateVisits = {
    spec: "Each actual member projection carries only its own checkpoint; no other player's visit map is serialized.",
    check: async () => {
      const state = await canonical();
      for (let i = 0; i < 3; i++) {
        const v = await published(i);
        expect(v.lastVisit).toEqual(state.visits![state.seats[i].uid]);
        expect(JSON.stringify(v)).not.toContain('"visits"');
      }
    },
  };
  const checks = () => [noErrors, privateVisits];
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
          const email = `briefing-story-${info.project.name}-${i}-${Date.now()}@example.test`;
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

    const page = pages[0],
      peer = pages[1],
      witness = pages[2];
    const initial = await canonical();
    await story.harness(
      "twelve-confirmed-ticks",
      "Advance the declared browser/domain clock and deliver twelve production boundaries through the real leased service; no history, balances or checkpoint is injected.",
      async () => {
        for (const p of pages)
          await p.clock.setFixedTime(scheduledAt + 12 * 900000 + 1);
        let n = 0;
        while (n < 12) {
          const applied = await settleCampaignTicks(
            id,
            () => scheduledAt + 12 * 900000,
          );
          expect(applied).toBeGreaterThan(0);
          n += applied;
        }
        expect(n).toBe(12);
      },
    );
    const period = await canonical();
    await story.step("return-to-campaign", {
      actor: aliases[0],
      description:
        "Return through the campaign directory. The briefing identifies the confirmed period but refuses to save while earlier authorized records are missing. Other commanders open their own briefings.",
      action: async () => {
        await button(page, "Campaigns").click();
        await page
          .getByRole("button")
          .filter({ has: page.getByText(campaignName, { exact: true }) })
          .click();
        for (const p of [peer, witness]) await open(p);
      },
      acknowledgement: {
        spec: "All three briefings name tick 12 and require earlier records before saving.",
        check: async () => {
          for (const p of [page, peer, witness]) {
            await expect(panel(p)).toContainText(
              "From tick 0 through confirmed tick 12",
            );
            await expect(save(p)).toBeDisabled();
          }
          await expect(
            page.getByRole("dialog", {
              name: "Return briefing panel",
              exact: true,
            }),
          ).toBeFocused();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Reading opens no command and changes no canonical state or visit.",
          check: async () => expect(await canonical()).toEqual(period),
        },
      ],
      views: views(),
    });
    await story.step("recover-complete-period", {
      actor: "Each commander",
      description:
        "Recover earlier authorized activity before making claims about change. Twelve distinct production reports become available to each player.",
      action: async () => {
        for (const p of [page, peer, witness])
          await panel(p)
            .getByRole("button", {
              name: "Recover earlier activity",
              exact: true,
            })
            .click();
      },
      acknowledgement: {
        spec: "All twelve reports are recovered and Save visit becomes available.",
        check: async () => {
          for (const p of [page, peer, witness]) {
            await expect(save(p)).toBeEnabled();
            await expect(
              panel(p)
                .getByRole("region", { name: "Economy", exact: true })
                .locator("article"),
            ).toHaveCount(12);
          }
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "History recovery preserves every checkpoint, balance and revision.",
          check: async () => expect(await canonical()).toEqual(period),
        },
      ],
      views: [
        { ...view(0), primary: [save(page)] },
        { ...view(1), primary: [save(peer)] },
        { ...view(2), primary: [save(witness)] },
      ],
    });
    let scroll = 0;
    await story.step("read-later-production", {
      actor: aliases[0],
      description:
        "Use the bounded reading panel to reach Tick 12 production while the commitment rail stays visible.",
      action: async () => {
        await rail(page);
        const reading = panel(page).getByRole("region", {
          name: "Briefing details",
          exact: true,
        });
        await reading.focus();
        await page.keyboard.press("End");
        const target = button(page, "Inspect Tick 12 production");
        await target.scrollIntoViewIfNeeded();
        await target.focus();
      },
      acknowledgement: {
        spec: "The last report's inspection control has keyboard focus.",
        check: async () =>
          expect(button(page, "Inspect Tick 12 production")).toBeFocused(),
      },
      verifications: [
        ...checks(),
        {
          spec: "The reading pane scrolls without moving the document or hiding the primary action.",
          check: async () => {
            const reading = panel(page).getByRole("region", {
              name: "Briefing details",
              exact: true,
            });
            scroll = await reading.evaluate((el) => el.scrollTop);
            expect(scroll).toBeGreaterThan(0);
            await rail(page);
            const b = await reading.boundingBox(),
              t = await button(
                page,
                "Inspect Tick 12 production",
              ).boundingBox();
            expect(t!.y).toBeGreaterThanOrEqual(b!.y);
            expect(t!.y + t!.height).toBeLessThanOrEqual(b!.y + b!.height);
          },
        },
      ],
      views: views(),
    });
    await story.harness(
      "new-production-arrives",
      "Deliver the thirteenth real tick while the player reads the prior period. The service publishes new state; the test does not replace the open snapshot.",
      async () => {
        for (const p of pages)
          await p.clock.setFixedTime(scheduledAt + 13 * 900000 + 1);
        expect(
          await settleCampaignTicks(id, () => scheduledAt + 13 * 900000),
        ).toBe(1);
      },
    );
    const newer = await canonical();
    await story.step("retain-reading-position", {
      actor: aliases[0],
      description:
        "Notice New activity without silently advancing the reviewed period or moving the reading position.",
      action: async () => {},
      acknowledgement: {
        spec: "New activity is available while the open briefing still ends at tick 12.",
        check: async () => {
          await expect(button(page, "New activity")).toBeVisible();
          await expect(panel(page)).toContainText("through confirmed tick 12");
          await expect(panel(page)).not.toContainText(
            "through confirmed tick 13",
          );
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "The original scroll offset and all private visits remain unchanged.",
          check: async () => {
            expect(
              await panel(page)
                .getByRole("region", { name: "Briefing details", exact: true })
                .evaluate((el) => el.scrollTop),
            ).toBe(scroll);
            expect(newer.visits).toEqual(initial.visits);
            await rail(page);
          },
        },
      ],
      views: views(),
    });
    await story.step("save-reviewed-period", {
      actor: aliases[0],
      description:
        "Save the reviewed period with Enter. Confirmation returns to the galaxy; other commanders retain their independent periods.",
      action: async () => {
        await expect(save(page)).toBeEnabled();
        await save(page).focus();
        await expect(save(page)).toBeFocused();
        await page.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The service accepts the visit and restores focus to History.",
        check: async () => {
          await expect(panel(page)).toHaveCount(0);
          await expect(button(page, "History")).toBeFocused();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Exactly one revision records only this commander's tick-12 source; wallets, military state and every other visit remain unchanged.",
          check: async () => {
            const state = await canonical(),
              uid = state.seats[0].uid;
            expect(state.revision).toBe(newer.revision + 1);
            expect(state.visits![uid]).toMatchObject({
              tick: 12,
              revision: period.revision,
            });
            for (const seat of state.seats.slice(1))
              expect(state.visits![seat.uid]).toEqual(
                initial.visits![seat.uid],
              );
            expect(state.empires).toEqual(newer.empires);
            expect(state.military).toEqual(newer.military);
            expect(state.diplomacy).toEqual(newer.diplomacy);
          },
        },
      ],
      views: views(),
    });
    const saved = await canonical();
    await story.step("reload-unreviewed-activity", {
      actor: aliases[0],
      description:
        "Reload and open the remaining activity. Tick 13 remains unreviewed because saving the older snapshot did not consume it.",
      action: async () => {
        await page.reload();
        await open(page);
      },
      acknowledgement: {
        spec: "The recovered private period contains only Tick 13 production.",
        check: async () => {
          await expect(panel(page)).toContainText(
            "From tick 12 through confirmed tick 13",
          );
          await expect(
            panel(page)
              .getByRole("region", { name: "Economy", exact: true })
              .locator("article"),
          ).toHaveCount(1);
          await expect(
            button(page, "Inspect Tick 13 production"),
          ).toBeVisible();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Reload does not repeat the visit command or alter any state.",
          check: async () => expect(await canonical()).toEqual(saved),
        },
      ],
      views: views(),
    });
    await story.step("inspect-report-subject", {
      actor: aliases[0],
      description:
        "Inspect Tick 13 production through its real report control and read the current economy without marking a further visit.",
      action: async () => {
        await button(page, "Inspect Tick 13 production").focus();
        await page.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The Empire economy opens on confirmed tick 13.",
        check: async () => {
          await expect(
            page.getByRole("region", { name: "Empire economy", exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText("Confirmed tick 13", { exact: true }),
          ).toBeVisible();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Inspection preserves the last visit and all canonical state.",
          check: async () => expect(await canonical()).toEqual(saved),
        },
      ],
      views: views(),
    });
    await story.step("acknowledge-latest", {
      actor: aliases[0],
      description:
        "Return from the inspected subject and explicitly save the remaining confirmed period.",
      action: async () => {
        await button(page, "Return to galaxy").click();
        await open(page);
        await expect(save(page)).toBeEnabled();
        await save(page).focus();
        await expect(save(page)).toBeFocused();
        await page.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The latest visit is acknowledged and the galaxy regains History focus.",
        check: async () => {
          await expect(panel(page)).toHaveCount(0);
          await expect(button(page, "History")).toBeFocused();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Only the returning commander advances to tick 13, in one additional revision.",
          check: async () => {
            const state = await canonical();
            expect(state.revision).toBe(saved.revision + 1);
            expect(state.visits![state.seats[0].uid].tick).toBe(13);
            for (const seat of state.seats.slice(1))
              expect(state.visits![seat.uid]).toEqual(
                initial.visits![seat.uid],
              );
            expect(state.empires).toEqual(saved.empires);
          },
        },
      ],
      views: views(),
    });
    const final = await canonical();
    await story.step("continue-without-repeat-briefing", {
      actor: aliases[0],
      description:
        "Return through the named Continue action. No new briefing is forced after all confirmed activity was explicitly acknowledged.",
      action: async () => {
        await page.goto("./");
        await button(page, `Continue ${campaignName}`).click();
      },
      acknowledgement: {
        spec: "The galaxy heading receives focus without a repeat briefing.",
        check: async () => {
          await expect(panel(page)).toHaveCount(0);
          await expect(page.locator("#galaxy-heading")).toBeFocused();
        },
      },
      verifications: [
        ...checks(),
        {
          spec: "Re-entry has no canonical effect and other commanders keep their earlier checkpoints.",
          check: async () => expect(await canonical()).toEqual(final),
        },
      ],
      views: views(),
    });
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
