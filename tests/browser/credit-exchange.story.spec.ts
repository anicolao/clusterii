import { createRequire } from "node:module";
import type {
  Page,
  BrowserContext,
  WebSocketRoute,
  Locator,
} from "@playwright/test";
import type { Campaign } from "../../shared/campaign";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import { admissionAt, scheduledAt } from "./story-helpers/admission-clock.mjs";
import { creditStoryPrefix } from "./story-helpers/credit-clock.mjs";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Credit offers", exact: true });
const ack = (page: Page) =>
  panel(page).getByRole("group", { name: "Exchange acknowledgement" });
const aliases = [
  "Exchange sender",
  "Exchange recipient",
  "Outer witness",
  "Fourth envoy",
];
const open = async (page: Page) => {
  await button(page, "Economy").click();
  await button(page, "Credit offers").click();
};
const readTarget = async (page: Page, status: Locator) => {
  // Prove commitment remains available before moving the bounded reading pane.
  const footer = await panel(page).locator("footer").boundingBox();
  expect(footer).not.toBeNull();
  expect(footer!.y).toBeGreaterThanOrEqual(0);
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  const reading = panel(page).getByRole("region", {
    name: "Offer details",
    exact: true,
  });
  await reading.focus();

  await status.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const outer = await reading.boundingBox(),
        inner = await status.boundingBox();
      return (
        !!outer &&
        !!inner &&
        inner.y >= outer.y &&
        inner.y + inner.height <= outer.y + outer.height
      );
    })
    .toBe(true);
};
const readStatus = async (page: Page, name: string) => {
  await readTarget(
    page,
    panel(page).getByRole("status", { name, exact: true }),
  );
};
const credits = (n: number) =>
  (n / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
for (const interrupted of [false, true])
  test(`Live credit exchange ${interrupted ? "recovers an interrupted offer" : "settles and withdraws exact terms"}`, async ({
    browser,
    request,
  }, info) => {
    test.setTimeout(300000);
    const story = new TestStepHelper(info, {
      id: `credit-exchange-${interrupted ? "recovery" : "ordinary"}`,
      title: interrupted
        ? "Recover the same private credit commitment after interruption"
        : "Exchange exact credits and withdraw a second offer",
      inventory: ["UX-11", "UX-14", "UX-16"],
      description:
        "Four independent authenticated commanders enter a real development campaign. Sender, recipient and outsider inspect private credit commitments, reservations and authoritative outcomes. The development mock provider exercises real encrypted ingress, canonical persistence and recipient grants. Fixed domain clocks and tick-service delivery are explicit harness controls. Eight-tick expiry and settlement ordering remain proposed rules, not owner approval. Managed-key and hosted acceptance remain separate.",
    });
    const contexts: BrowserContext[] = [],
      pages: Page[] = [],
      errors: string[] = [];
    let holding = false,
      url = "",
      id = "";
    const writes: { p: string; d: Record<string, unknown> }[] = [];
    const held: {
      server: WebSocketRoute;
      raw: string | Buffer;
      active: () => boolean;
    }[] = [];
    const noErrors = {
      spec: "No player viewpoint has an uncaught application error.",
      check: async () => expect(errors).toEqual([]),
    };
    const view = (i: number) => ({
      page: pages[i],
      player: aliases[i],
      surface: "game" as const,
    });
    const views = () => [view(0), view(1), view(2)];
    const require = createRequire(
      new URL("../../functions/package.json", import.meta.url),
    );
    const admin = require("firebase-admin/app");
    if (!admin.getApps().length)
      admin.initializeApp({ projectId: "demo-clusterii" });
    const db = require("firebase-admin/firestore").getFirestore();
    const { provider, unwrap } = require("./lib/shared/crypto.js");
    const { context } = require("./lib/functions/src/campaigns.js");
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
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
      const h = await db.doc(`campaignViews/${id}/members/${uid}`).get();
      const key = await db.doc(`campaignKeys/${id}/members/${uid}`).get();
      const ctx = context(id, h.get("revision"), `member:${uid}`, 1);
      return provider("mock").open(
        h.get("envelope"),
        await unwrap(h.get("grant"), key.get("kek"), uid, ctx, "mock"),
        ctx,
      );
    };
    const privateTerms = {
      spec: "The outsider receives no private offers, outcomes, identifiers or amounts in their actual serialized member projection.",
      check: async () => {
        const state = await canonical(),
          projected = await published(2);
        expect(projected.trades.offers).toEqual([]);
        expect(projected.trades.ledger).toEqual([]);
        const serialized = JSON.stringify(projected);
        for (const offer of [...state.trades!.offers, ...state.trades!.ledger])
          expect(serialized).not.toContain(offer.id);
        expect(serialized).not.toContain('"giveMilli"');
        expect(serialized).not.toContain('"requestMilli"');
        await expect(
          panel(pages[2]).getByRole("button", { name: /^(From|To) Exchange/ }),
        ).toHaveCount(0);
        await expect(panel(pages[2])).not.toContainText("10.001 credits");
        await expect(panel(pages[2])).not.toContainText("2.002 credits");
      },
    };
    const wallets = (state: Campaign) =>
      state.seats.map((s) => state.empires[s.uid].creditsMilli);
    const total = (state: Campaign) =>
      wallets(state).reduce((a, b) => a + b, 0) +
      state.trades!.offers.reduce(
        (sum, o) =>
          sum + o.giveMilli + (o.state === "accepted" ? o.requestMilli : 0),
        0,
      );
    const visibleWallets = {
      spec: "Every illustrated available balance matches that player's authoritative wallet.",
      check: async () => {
        const state = await canonical();
        for (let i = 0; i < 3; i++)
          await expect(panel(pages[i]).locator(".balance")).toHaveText(
            `Available: ${credits(wallets(state)[i])} credits`,
          );
      },
    };
    const checks = () => [noErrors, privateTerms, visibleWallets];
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
                    frame.d.b?.d?.kind === "trade.offer"
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
            const email = `credit-${interrupted}-${info.project.name}-${i}-${Date.now()}@example.test`;
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
              await page
                .getByLabel("Campaign name")
                .fill(
                  `${creditStoryPrefix}${interrupted ? "recovery" : "ordinary"} ${info.project.name}`,
                );
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
      const sender = pages[0],
        recipient = pages[1];
      await story.harness(
        "trade-domain-clock",
        "Only named credit-story campaigns admit exchange commands one millisecond after the latest confirmed tick boundary. Tick advancement below invokes the real settlement service; no balances, offers, receipts or outcomes are injected.",
        async () => {
          for (const page of pages)
            await page.clock.setFixedTime(scheduledAt + 1);
          const state = await canonical();
          expect(state.economy!.tick).toBe(0);
          expect(total(state)).toBe(800000);
        },
      );
      await story.step("compose", {
        actor: aliases[0],
        description:
          "Offer 10.001 credits to Exchange recipient in return for 2.002; each observer opens their own private exchange instrument.",
        action: async () => {
          for (const page of pages.slice(0, 3)) await open(page);
          await panel(sender)
            .getByLabel("Other commander")
            .selectOption({ label: aliases[1] });
          await panel(sender).getByLabel("Credits you offer").fill("10.001");
          await panel(sender).getByLabel("Credits you request").fill("2.002");
        },
        acknowledgement: {
          spec: "The exact affordable terms are ready to share; no command has reserved funds yet.",
          check: async () => {
            await expect(button(sender, "Share credit offer")).toBeEnabled();
            expect((await canonical()).trades!.offers).toEqual([]);
          },
        },
        verifications: checks(),
        views: [
          { ...view(0), primary: [button(sender, "Share credit offer")] },
          view(1),
          view(2),
        ],
      });
      const before = await canonical();
      if (interrupted) {
        await story.harness(
          "withhold-offer-delivery",
          "Withhold only the sender's real trade.offer transport frames. Preserve the encrypted bytes and logical command identity; do not fabricate any acknowledgement.",
          async () => {
            holding = true;
          },
        );
        await story.step("uncertain-commitment", {
          actor: aliases[0],
          description:
            "Commit the exact terms and inspect the unacknowledged state while the other players still have no offer.",
          action: async () => {
            await button(sender, "Share credit offer").focus();
            await sender.keyboard.press("Enter");
          },
          acknowledgement: {
            spec: "The UI explicitly awaits acknowledgement, focuses its status and disables repeat submission.",
            check: async () => {
              await expect.poll(() => writes.length).toBeGreaterThanOrEqual(1);
              await expect(ack(sender)).toBeFocused();
              await expect(button(sender, "Awaiting receipt")).toBeDisabled();
              expect(
                await button(sender, "Awaiting receipt").evaluate((element) => {
                  const bounds = element.getBoundingClientRect();
                  const range = document.createRange();
                  range.selectNodeContents(element);
                  const lines = [...range.getClientRects()];
                  return (
                    lines.length === 1 &&
                    lines.every(
                      (rect) =>
                        rect.left >= bounds.left &&
                        rect.right <= bounds.right &&
                        rect.top >= bounds.top &&
                        rect.bottom <= bounds.bottom,
                    )
                  );
                }),
                "Pending receipt label stays on one readable line inside its button",
              ).toBe(true);
            },
          },
          verifications: [
            ...checks(),
            {
              spec: "Undelivered terms leave canonical revision and all wallets unchanged.",
              check: async () => {
                const state = await canonical();
                expect(state.revision).toBe(before.revision);
                expect(wallets(state)).toEqual(wallets(before));
              },
            },
          ],
          views: views(),
        });
        await story.step("reload-pending", {
          actor: aliases[0],
          description:
            "Reload while delivery is withheld; recover the exact terms and original pending command without creating a replacement.",
          action: async () => {
            await sender.reload();
          },
          acknowledgement: {
            spec: "The exchange instrument reopens with the preserved 10.001 / 2.002 draft and awaiting state.",
            check: async () => {
              await expect(panel(sender)).toBeVisible();
              await expect(
                panel(sender).getByLabel("Credits you offer"),
              ).toHaveValue("10.001");
              await expect(
                panel(sender).getByLabel("Credits you request"),
              ).toHaveValue("2.002");
              await expect(button(sender, "Awaiting receipt")).toBeDisabled();
              expect(
                await button(sender, "Awaiting receipt").evaluate((element) => {
                  const bounds = element.getBoundingClientRect();
                  const range = document.createRange();
                  range.selectNodeContents(element);
                  const lines = [...range.getClientRects()];
                  return (
                    lines.length === 1 &&
                    lines.every(
                      (rect) =>
                        rect.left >= bounds.left &&
                        rect.right <= bounds.right &&
                        rect.top >= bounds.top &&
                        rect.bottom <= bounds.bottom,
                    )
                  );
                }),
                "Pending receipt label stays on one readable line inside its button",
              ).toBe(true);
              await expect.poll(() => writes.length).toBeGreaterThanOrEqual(2);
              await readTarget(
                sender,
                panel(sender).getByLabel("Credits you request"),
              );
            },
          },
          verifications: [
            ...checks(),
            {
              spec: "Retransmissions use one path and identical encrypted payload, with no admitted revision or reservation.",
              check: async () => {
                expect(new Set(writes.map((w) => w.p)).size).toBe(1);
                for (const write of writes)
                  expect(write.d).toEqual(writes[0].d);
                expect((await canonical()).revision).toBe(before.revision);
                expect(total(await canonical())).toBe(800000);
              },
            },
          ],
          views: views(),
        });
        await story.harness(
          "restore-offer-delivery",
          "Release the retained frames on the live connection to the actual ingress service; duplicate transport frames retain the same logical command and payload.",
          async () => {
            holding = false;
            for (const item of held)
              if (item.active()) item.server.send(item.raw);
          },
        );
      }
      await story.step("offer-shared", {
        actor: aliases[0],
        description: interrupted
          ? "Read the recovered command's authoritative acknowledgement and one reservation."
          : "Share the exact offer using the keyboard and inspect its authoritative reservation.",
        action: async () => {
          if (interrupted) await ack(sender).focus();
          else {
            await button(sender, "Share credit offer").focus();
            await sender.keyboard.press("Enter");
          }
        },
        acknowledgement: {
          spec: "Offer shared acknowledges admitted terms and the recipient receives a private open offer.",
          check: async () => {
            await expect(ack(sender)).toContainText("Offer shared");
            await expect(
              button(recipient, `From ${aliases[0]} · open`),
            ).toBeVisible();
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "One receipt and one revision reserve exactly 10.001 credits, conserving all available plus reserved funds.",
            check: async () => {
              const state = await canonical();
              expect(state.revision).toBe(before.revision + 1);
              expect(wallets(state)).toEqual([189999, 200000, 200000, 200000]);
              expect(total(state)).toBe(800000);
              expect(state.trades!.offers).toHaveLength(1);
              const commandId = writes[0].p.split("/").at(-1)!;
              const receipt = await db
                .doc(
                  `campaignReceipts/${state.seats[0].uid}/results/${commandId}`,
                )
                .get();
              expect(receipt.get("status")).toBe("accepted");
              expect(state.trades!.offers[0].id).toBe(`offer:0:${commandId}`);
              for (const write of writes) {
                expect(write.p).toBe(writes[0].p);
                expect(write.d).toEqual(writes[0].d);
              }
            },
          },
        ],
        views: views(),
      });
      await story.step("review-terms", {
        actor: aliases[1],
        description:
          "Read the named counterpart and both exact amounts before accepting; the outsider remains excluded.",
        action: async () => {
          await button(recipient, `From ${aliases[0]} · open`).click();
        },
        acknowledgement: {
          spec: "The recipient can accept these exact private terms.",
          check: async () => {
            await expect(button(recipient, "Accept exact terms")).toBeEnabled();
            await expect(
              panel(recipient).getByRole("region", { name: "Offer review" }),
            ).toContainText("10.001 credits");
            await expect(panel(recipient)).toContainText("2.002 credits");
            await readTarget(
              recipient,
              panel(recipient)
                .getByRole("region", { name: "Offer review" })
                .locator("dl"),
            );
          },
        },
        verifications: checks(),
        views: [
          view(0),
          { ...view(1), primary: [button(recipient, "Accept exact terms")] },
          view(2),
        ],
      });
      await story.step("accept-terms", {
        actor: aliases[1],
        description:
          "Accept the exact terms with Enter. Both reservations await the same confirmed tick; neither side has transferred yet.",
        action: async () => {
          await button(recipient, "Accept exact terms").focus();
          await recipient.keyboard.press("Enter");
        },
        acknowledgement: {
          spec: "Both players see settlement scheduled for tick 1.",
          check: async () => {
            for (const page of [sender, recipient])
              await expect(
                panel(page).getByRole("status", { name: "Offer schedule" }),
              ).toContainText("scheduled for tick 1");
            for (const page of [sender, recipient])
              await readStatus(page, "Offer schedule");
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "Acceptance reserves 2.002 once and conserves 800 credits across four wallets and reservations.",
            check: async () => {
              const state = await canonical();
              expect(state.revision).toBe(before.revision + 2);
              expect(wallets(state)).toEqual([189999, 197998, 200000, 200000]);
              expect(total(state)).toBe(800000);
              expect(state.trades!.offers[0].state).toBe("accepted");
            },
          },
        ],
        views: views(),
      });
      const accepted = await canonical();
      await story.harness(
        "settlement-tick",
        "Advance browser Date to the first tick and invoke the real leased tick service at that boundary. Delivery changes the clock, not the resolver or resulting balances.",
        async () => {
          for (const page of pages)
            await page.clock.setFixedTime(scheduledAt + 900001);
          expect(
            await settleCampaignTicks(id, () => scheduledAt + 900000),
          ).toBe(1);
        },
      );
      await story.step("settled", {
        actor: "Sender and recipient",
        description:
          "Read the confirmed atomic exchange. Matching acknowledgement replaces the earlier schedule, and the outsider sees only their own balance.",
        action: async () => {
          await ack(sender).focus();
        },
        acknowledgement: {
          spec: "Both participants see Offer settled and Both sides transferred once, with no future-scheduled acknowledgement.",
          check: async () => {
            for (const page of [sender, recipient]) {
              await expect(
                panel(page).getByRole("status", { name: "Offer outcome" }),
              ).toContainText("Both sides transferred once");
              await expect(ack(page)).toContainText("Offer settled");
              await expect(ack(page)).not.toContainText("scheduled");
              await readStatus(page, "Offer outcome");
            }
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "Settlement transfers each reserved amount once; the only new credits are separately accounted production, with no trade dividend.",
            check: async () => {
              const state = await canonical();
              expect(state.trades!.offers).toEqual([]);
              expect(state.trades!.ledger).toHaveLength(1);
              expect(state.trades!.ledger[0].result).toBe("settled");
              const produced = state.seats.map(
                (s) => state.economy!.ledger[s.uid].creditsMilli,
              );
              expect(wallets(state)).toEqual(
                wallets(accepted).map(
                  (n, i) =>
                    n + produced[i] + (i === 0 ? 2002 : i === 1 ? 10001 : 0),
                ),
              );
              expect(total(state)).toBe(
                800000 + produced.reduce((a, b) => a + b, 0),
              );
              for (const s of state.seats)
                expect(
                  state.economy!.ledger[s.uid].marketDividendsMilli ?? 0,
                ).toBe(0);
            },
          },
        ],
        views: views(),
      });
      const settled = await canonical();
      await story.harness(
        "repeat-tick",
        "Redeliver the same tick boundary to the real service and require zero additional effects.",
        async () => {
          expect(
            await settleCampaignTicks(id, () => scheduledAt + 900000),
          ).toBe(0);
          expect(await canonical()).toEqual(settled);
        },
      );
      if (!interrupted) {
        await story.step("second-offer", {
          actor: aliases[0],
          description:
            "Share a second exact offer, reserving only its offered amount.",
          action: async () => {
            await button(sender, "New offer").click();
            await panel(sender)
              .getByLabel("Other commander")
              .selectOption({ label: aliases[1] });
            await panel(sender).getByLabel("Credits you offer").fill("10.001");
            await panel(sender).getByLabel("Credits you request").fill("2.002");
            await button(sender, "Share credit offer").click();
          },
          acknowledgement: {
            spec: "The second offer is acknowledged and can be withdrawn.",
            check: async () => {
              await expect(ack(sender)).toContainText("Offer shared");
              await expect(button(sender, "Withdraw offer")).toBeEnabled();
            },
          },
          verifications: [
            ...checks(),
            {
              spec: "The new identity reserves only another 10.001 and preserves total credits.",
              check: async () => {
                const state = await canonical();
                expect(total(state)).toBe(total(settled));
                expect(wallets(state)[0]).toBe(wallets(settled)[0] - 10001);
                expect(state.trades!.offers[0].id).not.toBe(
                  settled.trades!.ledger[0].id,
                );
              },
            },
          ],
          views: views(),
        });
        await story.step("withdraw", {
          actor: aliases[0],
          description:
            "Withdraw before the recipient accepts; both parties inspect the scheduled refund.",
          action: async () => {
            await button(recipient, `From ${aliases[0]} · open`).click();
            await button(sender, "Withdraw offer").focus();
            await sender.keyboard.press("Enter");
          },
          acknowledgement: {
            spec: "Withdrawal is authoritatively scheduled for tick 2.",
            check: async () => {
              for (const page of [sender, recipient])
                await expect(
                  panel(page).getByRole("status", { name: "Offer schedule" }),
                ).toContainText("Withdrawal is scheduled for tick 2");
              for (const page of [sender, recipient])
                await readStatus(page, "Offer schedule");
            },
          },
          verifications: [
            ...checks(),
            {
              spec: "Scheduled withdrawal retains the reservation until the confirmed refund tick.",
              check: async () => {
                const state = await canonical();
                expect(state.trades!.offers[0].state).toBe("withdrawing");
                expect(total(state)).toBe(total(settled));
                expect(wallets(state)[0]).toBe(wallets(settled)[0] - 10001);
              },
            },
          ],
          views: views(),
        });
        const withdrawing = await canonical();
        await story.harness(
          "refund-tick",
          "Deliver tick 2 through the real service; withdrawal returns the issuer reservation and never transfers the requested side.",
          async () => {
            for (const page of pages)
              await page.clock.setFixedTime(scheduledAt + 1800001);
            expect(
              await settleCampaignTicks(id, () => scheduledAt + 1800000),
            ).toBe(1);
          },
        );
        await story.step("withdrawn", {
          actor: "Sender and recipient",
          description:
            "Inspect the confirmed refund and separate production increments in both wallets.",
          action: async () => {
            await ack(sender).focus();
          },
          acknowledgement: {
            spec: "Both parties read Offer withdrawn and reservation return.",
            check: async () => {
              for (const page of [sender, recipient])
                await expect(
                  panel(page).getByRole("status", { name: "Offer outcome" }),
                ).toContainText("Reserved credits returned to their owners");
              await expect(ack(sender)).toContainText("Offer withdrawn");
              for (const page of [sender, recipient])
                await readStatus(page, "Offer outcome");
            },
          },
          verifications: [
            ...checks(),
            {
              spec: "Only the sender's exact reservation returns; production accounts for every other balance change.",
              check: async () => {
                const state = await canonical();
                expect(state.trades!.offers).toEqual([]);
                expect(state.trades!.ledger[0].result).toBe("withdrawn");
                const produced = state.seats.map(
                  (s) => state.economy!.ledger[s.uid].creditsMilli,
                );
                expect(wallets(state)).toEqual(
                  wallets(withdrawing).map(
                    (n, i) => n + produced[i] + (i === 0 ? 10001 : 0),
                  ),
                );
                expect(total(state)).toBe(
                  total(settled) + produced.reduce((a, b) => a + b, 0),
                );
              },
            },
          ],
          views: views(),
        });
      }
      const final = await canonical();
      await story.step("reload-outcome", {
        actor: aliases[0],
        description:
          "Reload, reopen private offers and inspect the exact recorded outcome without another transfer or reservation.",
        action: async () => {
          await sender.reload();
          await open(sender);
          await button(
            sender,
            `${interrupted ? "settled" : "withdrawn"} · ${aliases[1]} · tick ${interrupted ? 1 : 2}`,
          ).click();
        },
        acknowledgement: {
          spec: "The authoritative recorded outcome returns after reload.",
          check: async () => {
            await expect(
              panel(sender).getByRole("status", { name: "Offer outcome" }),
            ).toContainText(`Offer ${interrupted ? "settled" : "withdrawn"}`);
            await readStatus(sender, "Offer outcome");
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "Reload preserves canonical revision, all wallets and private recipient grants without new effects.",
            check: async () => {
              expect(await canonical()).toEqual(final);
            },
          },
        ],
        views: views(),
      });
      await story.step("keyboard-return", {
        actor: aliases[0],
        description:
          "Escape closes the nested instrument and restores focus to Credit offers in the economy.",
        action: async () => {
          await sender.keyboard.press("Escape");
        },
        acknowledgement: {
          spec: "Credit offers regains keyboard focus.",
          check: async () =>
            expect(button(sender, "Credit offers")).toBeFocused(),
        },
        verifications: [
          noErrors,
          {
            spec: "The exchange instrument closes without changing canonical balances.",
            check: async () => {
              await expect(panel(sender)).not.toBeVisible();
              expect(wallets(await canonical())).toEqual(wallets(final));
            },
          },
        ],
        views: [view(0)],
      });
    } finally {
      for (const ctx of contexts) await ctx.close();
    }
  });
