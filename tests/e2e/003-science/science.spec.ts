import {
  inspectLedgerMotion,
  openScienceResource,
  scienceResourceOpener,
} from "./ledger-journey";
import { expectReadingTarget } from "../../browser/story-helpers/reading-target";
import { createRequire } from "node:module";
import type { BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { login, grantDeveloper } from "../../browser/helpers";
import {
  admissionAt,
  scheduledAt,
} from "../../browser/story-helpers/admission-clock.mjs";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
test("Inspect authoritative science rate and recover earned output", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "science-rate-sources",
    title: "Read science capacity separately from delivered output",
    inventory: ["UX-03", "UX-08", "UX-16"],
    description:
      "Four ordinary players start a real campaign. The owner opens the private science source ledger, queues Innovation and recovers the earned new capacity separately from delivered science. Demo catalogue/admission/research clock and leased tick delivery are explicitly labelled harness controls; no stored state is injected.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [];
  const emails = Array.from(
    { length: 4 },
    (_, i) => `science-${info.project.name}-${Date.now()}-${i}@example.test`,
  );
  const name = `Scheduled story research orders science ${info.project.name}`;
  const aliases = ["Chart envoy", "Tidal envoy", "Night envoy", "Solar envoy"];
  const keyboard = async (page: Page, name: string) => {
    await button(page, name).focus();
    await page.keyboard.press("Enter");
  };
  const acknowledgeStart = async (page: Page) => {
    await keyboard(page, "Roster");
    const roster = page.getByRole("region", {
      name: "Campaign roster",
      exact: true,
    });
    await expect(roster.getByRole("status")).toContainText("Began");
    await expect(
      roster.getByRole("heading", {
        name: "4 / 4 empires assembled",
        exact: true,
      }),
    ).toBeVisible();
    await keyboard(page, "Close roster");
    await expect(
      page.getByText("Your knowledge of this system", { exact: true }),
    ).toBeVisible();
  };
  let campaignUrl = "",
    campaignId = "";
  try {
    for (let i = 0; i < 4; i++)
      await story.harness(
        `identity-${i + 1}`,
        "Ordinary Google emulator sign-in and acknowledged identity save; development entitlement is a labelled fixture.",
        async () => {
          const context = await browser.newContext({
            viewport: info.project.use.viewport,
            baseURL: info.project.use.baseURL,
            deviceScaleFactor: 1,
            locale: "en-US",
            timezoneId: "UTC",
            colorScheme: "dark",
            reducedMotion: "reduce",
          });
          contexts.push(context);
          const page = await context.newPage();
          pages.push(page);
          await login(page, emails[i]);
          await page.getByLabel("Commander name").fill(aliases[i]);
          await keyboard(page, "Save identity");
          await expect(
            page.getByRole("status").filter({ hasText: "Identity saved" }),
          ).toBeVisible();
          await grantDeveloper(emails[i]);
          await keyboard(page, "Close");
          await keyboard(page, "Play");
          await page.clock.setFixedTime(admissionAt);
        },
      );
    for (let i = 0; i < 4; i++)
      await story.harness(
        `admit-${i + 1}`,
        "Actual create/join controls and accepted seat; catalogue and admission time are fixed by the demo-only loader, never injected state.",
        async () => {
          const page = pages[i];
          if (i === 0) {
            await keyboard(page, "Create campaign");
            await page.getByLabel("Campaign name").fill(name);
            await keyboard(page, "Create galaxy");
            await expect(
              page.getByRole("heading", {
                name: "Choose your faction",
                exact: true,
              }),
            ).toBeVisible();
            campaignUrl = page.url();
            campaignId = new URL(campaignUrl).searchParams.get("campaign")!;
          } else await page.goto(campaignUrl);
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
          await keyboard(page, "Claim your seat");
          await expect(
            page.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
        },
      );
    await story.harness(
      "scheduled-start",
      "Deliver the real Scheduler HTTP request at the designated browser/domain boundary; no campaign or membership writes. This is not hosted cadence certification.",
      async () => {
        for (const page of pages) await page.clock.setFixedTime(scheduledAt);
        const result = await request.post(
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
        expect(result.ok()).toBe(true);
        for (const page of pages) await acknowledgeStart(page);
      },
    );
    const [owner, peer] = pages;
    const ledger = (page: Page) =>
      page.getByRole("region", { name: "Science sources", exact: true });
    const rateButton = scienceResourceOpener;
    const openRate = openScienceResource;
    const readTotals = async (page: Page) => {
      await page
        .getByRole("region", { name: "Science source ledger", exact: true })
        .focus();
      await page.keyboard.press("End");
    };
    const ownerView = {
      page: owner,
      player: aliases[0],
      surface: "game" as const,
      primary: [button(owner, "Return to galaxy")],
    };
    const peerView = {
      page: peer,
      player: aliases[1],
      surface: "game" as const,
      primary: [button(peer, "Return to galaxy")],
    };
    const railClearance = async (page: Page, stage: string) => {
      const panel = await page
        .getByRole("dialog", {
          name: "Empire economy panel",
          exact: true,
        })
        .boundingBox();
      const rail = await page.locator(".command-rail").boundingBox();
      expect(panel).not.toBeNull();
      expect(rail).not.toBeNull();
      expect(panel!.y).toBeGreaterThanOrEqual(rail!.y + rail!.height);
      await info.attach(`science-rail-${stage}`, {
        body: JSON.stringify({
          viewport: info.project.name,
          stage,
          panel,
          rail,
        }),
        contentType: "application/json",
      });
    };
    let ownerSource = "",
      peerSource = "";
    await story.step("read-campaign-resource-rail", {
      actor: aliases[0],
      description:
        "Read the scheduled next tick beside the campaign, with roster and campaign navigation retained. Phone uses one resource entry to the existing ledgers.",
      action: async () => {
        await rateButton(owner).focus();
      },
      acknowledgement: {
        spec: "The real active campaign exposes its resource opener and next scheduled tick.",
        check: async () => {
          await expect(rateButton(owner)).toBeFocused();
          await expect(owner.locator(".command-rail")).toContainText(
            "Next tick",
          );
        },
      },
      verifications: [
        {
          spec: "The rail and each named navigation control fit without automatic scrolling; the phone rail leaves more room for the chart.",
          check: async () => {
            for (const control of [
              rateButton(owner),
              button(owner, "Roster"),
              button(owner, "Campaigns"),
            ])
              await expectReadingTarget(control);
            if (info.project.name === "phone") {
              const rail = await owner.locator(".command-rail").boundingBox();
              await info.attach("phone-rail-layout", {
                body: JSON.stringify(
                  await owner
                    .locator(".command-rail")
                    .evaluate((el) =>
                      Array.from(el.children).map((child) => ({
                        className: child.className,
                        bounds: child.getBoundingClientRect().toJSON(),
                        lineHeight: getComputedStyle(child).lineHeight,
                        gridRow: getComputedStyle(child).gridRow,
                        gridColumn: getComputedStyle(child).gridColumn,
                      })),
                    ),
                ),
                contentType: "application/json",
              });
              expect(rail!.height).toBeLessThan(100);
              await expectReadingTarget(owner.locator(".phone-tick"), false);
            }
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [rateButton(owner)],
        },
      ],
    });
    if (info.project.name === "phone")
      await story.step("open-credit-ledger", {
        actor: aliases[0],
        description:
          "Use the compact Resources control by keyboard to read the actual available credit balance and first-production status, then Escape returns to the same opener.",
        action: async () => {
          await rateButton(owner).press("Enter");
        },
        acknowledgement: {
          spec: "The existing credit ledger reports available200 and pending first production; it is not a synthetic combined ledger.",
          check: async () => {
            const credits = owner.getByRole("region", {
              name: "Production ledger",
              exact: true,
            });
            await expect(credits.locator(".balance span")).toHaveText(
              "Available credits",
            );
            await expect(credits.locator(".balance strong")).toHaveText("200");
            await expect(credits).toContainText("First production pending");
          },
        },
        verifications: [
          {
            spec: "Credits, science access and Return remain contained and keyboard reachable.",
            check: async () => {
              await expectReadingTarget(owner.locator(".balance"), false);
              await expectReadingTarget(
                button(owner, "Inspect science per tick"),
              );
              await expectReadingTarget(button(owner, "Return to galaxy"));
            },
          },
        ],
        views: [
          {
            page: owner,
            player: aliases[0],
            surface: "game",
            primary: [button(owner, "Return to galaxy")],
          },
        ],
      });
    if (info.project.name === "phone")
      await story.harness(
        "close-credit-reading",
        "Ordinary Escape dismisses only the local reading panel; no command is sent.",
        async () => {
          await owner.keyboard.press("Escape");
          await expect(rateButton(owner)).toBeFocused();
        },
      );
    await story.step("inspect-private-sources", {
      actor: aliases[0],
      description:
        "Open the real per-tick rail control on both independent accounts. Current capacity exists before the first delivered output.",
      action: async () => {
        await openRate(owner);
        await openRate(peer);
      },
      acknowledgement: {
        spec: "Both authorized ledgers acknowledge tick0, current1.4 capacity and their own completed station.",
        check: async () => {
          for (const page of [owner, peer]) {
            await expect(ledger(page).getByRole("status")).toContainText(
              "Confirmed tick 0",
            );
            await expect(ledger(page).locator(".rate")).toHaveText(
              "+1.4 / tick",
            );
            await expect(ledger(page).locator("article")).toHaveCount(1);
            await railClearance(
              page,
              page === owner ? "initial-owner" : "initial-peer",
            );
            await expect(
              ledger(page).getByRole("heading", { name: "Science per tick" }),
            ).toBeFocused();
          }
        },
      },
      verifications: [
        {
          spec: "The two ordinary views name different owned orbital sources, and no historical output is substituted for capacity.",
          check: async () => {
            ownerSource = await ledger(owner).locator("article h4").innerText();
            peerSource = await ledger(peer).locator("article h4").innerText();
            expect(ownerSource).not.toBe(peerSource);
            await expect(ledger(peer).locator("article")).not.toContainText(
              ownerSource,
            );
            await expect(ledger(owner)).toContainText(
              "First production pending",
            );
          },
        },
      ],
      views: [
        {
          ...ownerView,
          primary: [...ownerView.primary, ledger(owner).locator("article")],
        },
        {
          ...peerView,
          primary: [...peerView.primary, ledger(peer).locator("article")],
        },
      ],
    });
    await story.step("commit-innovation", {
      actor: aliases[0],
      description:
        "Return to the same galaxy and queue Innovation through ordinary research controls. Capacity remains1.4 until the level is earned.",
      action: async () => {
        await keyboard(owner, "Return to galaxy");
        await expect(rateButton(owner)).toBeFocused();
        if (info.project.name === "phone") await keyboard(owner, "More");
        await keyboard(owner, "Economy");
        const radio = owner.getByRole("radio", { name: /^innovation/ });
        await radio.focus();
        await owner.keyboard.press("Space");
        await expect(radio).toBeChecked();
        await keyboard(owner, "Queue innovation");
      },
      acknowledgement: {
        spec: "The actual research receipt accepts Innovation for tick1.",
        check: async () => {
          await expect(
            owner
              .getByRole("region", { name: "Research selection", exact: true })
              .getByRole("status"),
          ).toContainText("Research order accepted");
        },
      },
      verifications: [
        {
          spec: "The peer remains at its own initial rate and source while the owner order is accepted.",
          check: async () => {
            await expect(ledger(peer).locator(".rate")).toHaveText(
              "+1.4 / tick",
            );
            await expect(ledger(peer).locator("article h4")).toHaveText(
              peerSource,
            );
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Return to galaxy")],
        },
      ],
    });
    const require = createRequire(
      new URL("../../../functions/package.json", import.meta.url),
    );
    const admin = require("firebase-admin/app");
    if (!admin.getApps().length)
      admin.initializeApp({ projectId: "demo-clusterii" });
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    const auth = require("firebase-admin/auth").getAuth();
    const ownerUid = (await auth.getUserByEmail(emails[0])).uid,
      peerUid = (await auth.getUserByEmail(emails[1])).uid;
    expect(ownerUid).not.toBe(peerUid);
    const db = require("firebase-admin/firestore").getFirestore();
    const { provider } = require("./lib/shared/crypto.js");
    const { context } = require("./lib/functions/src/campaigns.js");
    const canonical = async () => {
      const head = await db.doc(`campaignStates/${campaignId}`).get();
      return provider("mock").open(
        head.get("envelope"),
        head.get("canonicalKey"),
        context(campaignId, head.get("revision"), "canonical", 1),
      );
    };
    const admitted = await canonical();
    expect(
      admitted.seats.some((seat: { uid: string }) => seat.uid === ownerUid),
    ).toBe(true);
    expect(
      admitted.seats.some((seat: { uid: string }) => seat.uid === peerUid),
    ).toBe(true);
    const order = admitted.economy.research[ownerUid].orders[0];
    expect(order.target).toBe("innovation");
    expect(order.effectiveTick).toBe(1);
    await story.harness(
      "deliver-earned-level",
      "Existing guarded demo clock and fifteen real leased ticks, concurrent/repeated delivery. No levels, resources or private projections injected; not hosted Scheduler certification.",
      async () => {
        const due = scheduledAt + 15 * 900000;
        for (const page of pages) await page.clock.setFixedTime(due + 1);
        const deliveries = await Promise.all([
          settleCampaignTicks(campaignId, () => due),
          settleCampaignTicks(campaignId, () => due),
        ]);
        expect(deliveries.reduce((a: number, b: number) => a + b, 0)).toBe(15);
        expect(await settleCampaignTicks(campaignId, () => due)).toBe(0);
        const result = await canonical();
        expect(result.economy.research[ownerUid].levels.innovation).toBe(1);
        expect(result.economy.research[ownerUid].lastApplied.id).toBe(order.id);
        expect(result.economy.ledger[ownerUid].scienceMilli).toBe(1400);
      },
    );
    await story.step("read-earned-capacity", {
      actor: aliases[0],
      description:
        "Reload both accounts and inspect the earned new rate separately from tick15 output. The peer retains its independent sources and rate.",
      action: async () => {
        for (const page of [owner, peer]) {
          await page.reload();
          await openRate(page);
          await readTotals(page);
        }
      },
      acknowledgement: {
        spec: "Authoritative tick15 supplies owner1.404 capacity while last delivered science is1.4; peer remains1.4.",
        check: async () => {
          for (const page of [owner, peer])
            await expect(ledger(page).getByRole("status")).toContainText(
              "Confirmed tick 15",
            );
          await expect(ledger(owner).locator(".rate")).toHaveText(
            "+1.404 / tick",
          );
          await expect(ledger(peer).locator(".rate")).toHaveText("+1.4 / tick");
          await expect(
            ledger(owner)
              .locator("dl > div")
              .filter({ hasText: "Last delivered science" }),
          ).toHaveText("Last delivered science 1.4");
        },
      },
      verifications: [
        {
          spec: "Source identity and peer ownership remain isolated through reload; lower totals stay inside the reading viewport.",
          check: async () => {
            await expect(ledger(owner).locator("article h4")).toHaveText(
              ownerSource,
            );
            await expect(ledger(peer).locator("article h4")).toHaveText(
              peerSource,
            );
            for (const page of [owner, peer]) {
              await railClearance(
                page,
                page === owner ? "earned-owner" : "earned-peer",
              );
              const bounds = await ledger(page)
                .locator("dl > div")
                .filter({ hasText: "Last delivered science" })
                .evaluate((el) => {
                  const r = el.getBoundingClientRect(),
                    p = el.closest('[role="region"]')!.getBoundingClientRect();
                  return (
                    r.top >= p.top &&
                    r.bottom <= p.bottom &&
                    r.top >= 0 &&
                    r.bottom <= innerHeight
                  );
                });
              expect(bounds).toBe(true);
            }
          },
        },
      ],
      views: [ownerView, peerView],
    });
    const earnedBeforeReading = await canonical();
    await inspectLedgerMotion(
      story,
      "earned",
      [
        {
          page: owner,
          name: aliases[0],
          tick: 15,
          rate: 1404,
          delivered: 1400,
          sources: [ownerSource],
        },
        {
          page: peer,
          name: aliases[1],
          tick: 15,
          rate: 1400,
          delivered: 1400,
          sources: [peerSource],
        },
      ],
      async () => {
        expect(await canonical()).toEqual(earnedBeforeReading);
      },
    );
    await story.harness(
      "deliver-following-tick",
      "One real leased following tick applies the already-earned Innovation level; repeated delivery remains empty.",
      async () => {
        const due = scheduledAt + 16 * 900000;
        for (const page of pages) await page.clock.setFixedTime(due + 1);
        expect(await settleCampaignTicks(campaignId, () => due)).toBe(1);
        expect(await settleCampaignTicks(campaignId, () => due)).toBe(0);
      },
    );
    await story.step("recover-delivered-rate", {
      actor: aliases[0],
      description:
        "Recover tick16 after reload, read the actual1.404 delivery, then retain the same authoritative source and current rate.",
      action: async () => {
        await owner.reload();
        await openRate(owner);
        await readTotals(owner);
      },
      acknowledgement: {
        spec: "The new rate is now also the actual delivered output at confirmed tick16.",
        check: async () => {
          await expect(ledger(owner).getByRole("status")).toContainText(
            "Confirmed tick 16",
          );
          await expect(
            ledger(owner)
              .locator("dl > div")
              .filter({ hasText: "Last delivered science" }),
          ).toHaveText("Last delivered science 1.404");
        },
      },
      verifications: [
        {
          spec: "Reload preserves source ownership and does not alter the accepted command identity.",
          check: async () => {
            await railClearance(owner, "delivered-owner");
            await expect(ledger(owner).locator("article h4")).toHaveText(
              ownerSource,
            );
            expect(
              (await canonical()).economy.research[ownerUid].lastApplied.id,
            ).toBe(order.id);
          },
        },
      ],
      views: [ownerView],
    });
  } finally {
    for (const context of contexts) await context.close();
  }
});
