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
import { constructionStoryPrefix } from "./story-helpers/construction-clock.mjs";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: "System construction", exact: true });
const commitment = (page: Page) =>
  panel(page).getByRole("group", { name: "Construction commitment" });
const aliases = [
  "Builder envoy",
  "Independent builder",
  "Outer witness",
  "Fourth envoy",
];
const rail = async (page: Page) => {
  const b = await commitment(page).boundingBox();
  expect(b).not.toBeNull();
  expect(b!.y).toBeGreaterThanOrEqual(0);
  expect(b!.y + b!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(
    await commitment(page)
      .locator("button")
      .evaluateAll((elements) =>
        elements.every((element) => {
          const bounds = element.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          return [...range.getClientRects()].every(
            (r) =>
              r.left >= bounds.left &&
              r.right <= bounds.right &&
              r.top >= bounds.top &&
              r.bottom <= bounds.bottom,
          );
        }),
      ),
    "Commitment action lettering stays inside its actual button",
  ).toBe(true);
};
const read = async (page: Page, target: Locator) => {
  await rail(page);
  const region = panel(page).getByRole("region", {
    name: "Construction details",
  });
  await region.focus();
  await target.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const a = await region.boundingBox(),
        b = await target.boundingBox();
      return !!a && !!b && b.y >= a.y && b.y + b.height <= a.y + a.height;
    })
    .toBe(true);
};
for (const interrupted of [false, true])
  test(`Live construction ${interrupted ? "recovers an interrupted reservation" : "completes and cancels developments"}`, async ({
    browser,
    request,
  }, info) => {
    test.setTimeout(300000);
    const story = new TestStepHelper(info, {
      id: `live-construction-${interrupted ? "recovery" : "ordinary"}`,
      title: interrupted
        ? "Recover one construction commitment and settle its outcome"
        : "Reserve, complete and cancel developments",
      inventory: ["UX-05", "UX-14", "UX-16"],
      description:
        "Four independent players enter a real development campaign. Owner and other-player views show reservation, queued work, completion and cancellation. Encrypted mock ingress, canonical state, private grants and tick settlement are real. Fixed domain time and withheld delivery are explicitly labelled test controls. Construction price, four-advance duration, refunds and dividends remain proposed development rules; managed-key, hosted and all-layer acceptance remain separate.",
    });
    const contexts: BrowserContext[] = [],
      pages: Page[] = [],
      errors: string[] = [];
    let url = "",
      id = "",
      holding = false;
    const writes: { p: string; d: Record<string, unknown> }[] = [],
      held: {
        server: WebSocketRoute;
        raw: string | Buffer;
        active: () => boolean;
      }[] = [];
    const campaignName = `${constructionStoryPrefix}${interrupted ? "recovery" : "ordinary"} ${info.project.name}`;
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
      const state = await canonical(),
        uid = state.seats[seat].uid,
        h = await db.doc(`campaignViews/${id}/members/${uid}`).get(),
        key = await db.doc(`campaignKeys/${id}/members/${uid}`).get(),
        ctx = context(id, h.get("revision"), `member:${uid}`, 1);
      return provider("mock").open(
        h.get("envelope"),
        await unwrap(h.get("grant"), key.get("kek"), uid, ctx, "mock"),
        ctx,
      );
    };
    const wallets = (state: Campaign) =>
      state.seats.map((s) => state.empires[s.uid].creditsMilli);
    const checks = () => [
      {
        spec: "Both commitment rails remain visible before scrolling and no player has an uncaught application error.",
        check: async () => {
          expect(errors).toEqual([]);
          for (const p of pages.slice(0, 2)) await rail(p);
        },
      },
      {
        spec: "Other players receive no owner construction orders, cancellation IDs, paid costs or ledger in their serialized private projection.",
        check: async () => {
          const state = await canonical();
          for (const seat of [1, 2]) {
            const v = await published(seat);
            expect(v.construction?.orders ?? []).toEqual([]);
            expect(v.construction?.cancellations ?? []).toEqual([]);
            expect(v.construction?.ledger ?? []).toEqual([]);
            const serialized = JSON.stringify(v);
            for (const o of [
              ...(state.construction?.orders ?? []),
              ...Object.values(state.construction?.ledger ?? {}).flat(),
              ...(state.construction?.cancellations ?? []),
            ])
              expect(serialized).not.toContain(o.id);
            expect(serialized).not.toContain('"paidMilli"');
          }
          await expect(panel(pages[1])).toContainText(
            "No construction queued.",
          );
        },
      },
      {
        spec: "Visible available balances equal each player's authoritative wallet.",
        check: async () => {
          const state = await canonical();
          for (let i = 0; i < 2; i++)
            await expect(panel(pages[i]).locator("header strong")).toHaveText(
              (wallets(state)[i] / 1000).toLocaleString("en-US", {
                maximumFractionDigits: 3,
              }),
            );
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
                    frame.d.b?.d?.kind === "construction.build"
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
            const email = `construction-story-${interrupted}-${info.project.name}-${i}-${Date.now()}@example.test`;
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
        uid = initial.seats[0].uid;
      const home = Object.entries(initial.systems).find(
        ([, s]) => s.orbit === uid && s.surface === uid,
      )![0];
      await story.step("inspect-development", {
        actor: aliases[0],
        description:
          "Inspect the actual home system and choose an orbital training camp. The other commander reviews their own construction panel.",
        action: async () => {
          for (const p of [owner, peer]) await button(p, "Develop").click();
          await rail(owner);
          await panel(owner)
            .getByRole("radio", { name: /Training camp/ })
            .check();
        },
        acknowledgement: {
          spec: "The development quote shows69 credits and131 after reservation, with one completed training camp.",
          check: async () => {
            await expect(commitment(owner)).toContainText("69");
            await expect(commitment(owner)).toContainText("131");
            await expect(
              panel(owner).getByRole("radio", { name: /Training camp/ }),
            ).toHaveAccessibleName(/1 completed · 0 queued/);
          },
        },
        verifications: checks(),
        views: views(),
      });
      if (interrupted) {
        await story.harness(
          "withhold-build-delivery",
          "Hold only construction.build transport frames before actual ingress. No state, receipts or command payload is modified.",
          async () => {
            holding = true;
          },
        );
        await story.step("pending-build", {
          actor: aliases[0],
          description:
            "Submit the training camp with Enter and observe the uncertain commitment.",
          action: async () => {
            await button(owner, "Build training camp").focus();
            await owner.keyboard.press("Enter");
          },
          acknowledgement: {
            spec: "The original command awaits acknowledgement and repeat submission is disabled.",
            check: async () => {
              await expect.poll(() => writes.length).toBeGreaterThan(0);
              await expect(
                button(owner, "Awaiting acknowledgement…"),
              ).toBeDisabled();
              await expect(commitment(owner)).toBeFocused();
            },
          },
          verifications: [
            ...checks(),
            {
              spec: "Withheld delivery has no canonical effect or debit.",
              check: async () => expect(await canonical()).toEqual(initial),
            },
          ],
          views: views(),
        });
        await story.step("recover-pending", {
          actor: aliases[0],
          description:
            "Reload and recover the original pending construction command.",
          action: async () => {
            await owner.reload();
          },
          acknowledgement: {
            spec: "The construction panel returns with the original training camp selected and pending commitment disabled.",
            check: async () => {
              await expect(panel(owner)).toBeVisible();
              await expect(
                panel(owner).getByRole("radio", { name: /Training camp/ }),
              ).toBeChecked();
              await expect(
                button(owner, "Awaiting acknowledgement…"),
              ).toBeDisabled();
              await expect.poll(() => writes.length).toBeGreaterThanOrEqual(2);
            },
          },
          verifications: [
            ...checks(),
            {
              spec: "Retries retain one command path and identical encrypted payload, with no reservation yet.",
              check: async () => {
                expect(new Set(writes.map((w) => w.p)).size).toBe(1);
                for (const w of writes) expect(w.d).toEqual(writes[0].d);
                expect(await canonical()).toEqual(initial);
              },
            },
          ],
          views: views(),
        });
        await story.harness(
          "restore-build-delivery",
          "Release retained frames on the live connection to the real service. Replayed frames keep the same logical identity and envelope.",
          async () => {
            holding = false;
            for (const h of held) if (h.active()) h.server.send(h.raw);
          },
        );
      }
      await story.step("reserve-build", {
        actor: aliases[0],
        description:
          "Read the authoritative construction acknowledgement and credit reservation.",
        action: async () => {
          if (!interrupted) {
            await button(owner, "Build training camp").focus();
            await owner.keyboard.press("Enter");
          }
        },
        acknowledgement: {
          spec: "Construction order accepted accompanies a queued camp eligible at tick1.",
          check: async () => {
            await expect(commitment(owner)).toContainText(
              "Construction order accepted.",
            );
            await expect(panel(owner)).toContainText(
              "Queued · eligible tick 1",
            );
            await read(
              owner,
              panel(owner).getByText(/Queued · eligible tick 1/),
            );
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "Exactly one command revision reserves69 credits; the orbital count and every other wallet are unchanged.",
            check: async () => {
              const s = await canonical();
              expect(s.revision).toBe(initial.revision + 1);
              expect(s.construction!.orders).toHaveLength(1);
              expect(s.construction!.orders[0]).toMatchObject({
                uid,
                starId: home,
                type: "camp",
                paidMilli: 69000,
                effectiveTick: 1,
                progress: 0,
              });
              expect(wallets(s)).toEqual([131000, 200000, 200000, 200000]);
              expect(s.systems).toEqual(initial.systems);
              const original = writes[0];
              const commandId = original.p.split("/").at(-1)!;
              expect(s.construction!.orders[0].id).toBe(commandId);
              const receipt = await db
                .doc(`campaignReceipts/${uid}/results/${commandId}`)
                .get();
              expect(receipt.get("status")).toBe("accepted");
              for (const write of writes) {
                expect(write.p).toBe(original.p);
                expect(write.d).toEqual(original.d);
              }
            },
          },
        ],
        views: views(),
      });
      const reserved = await canonical();
      await story.step("reload-reservation", {
        actor: aliases[0],
        description:
          "Reload the accepted work and reopen Develop to recover the same queue and balance.",
        action: async () => {
          await owner.reload();
          if (!(await panel(owner).isVisible()))
            await button(owner, "Develop").click();
        },
        acknowledgement: {
          spec: "The persisted queue remains eligible at tick1 with131 credits available.",
          check: async () => {
            await expect(panel(owner)).toContainText(
              "Queued · eligible tick 1",
            );
            await read(
              owner,
              panel(owner).getByText(/Queued · eligible tick 1/),
            );
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "Reload creates no command, revision or additional debit.",
            check: async () => expect(await canonical()).toEqual(reserved),
          },
        ],
        views: views(),
      });
      const settle = async (tick: number) => {
        for (const p of pages)
          await p.clock.setFixedTime(scheduledAt + tick * 900000 + 1);
        expect(
          await settleCampaignTicks(id, () => scheduledAt + tick * 900000),
        ).toBe(tick - (await Promise.resolve(lastTick)));
        lastTick = tick;
        const before = await canonical();
        expect(
          await settleCampaignTicks(id, () => scheduledAt + tick * 900000),
        ).toBe(0);
        expect(await canonical()).toEqual(before);
      };
      let lastTick = 0;
      await story.harness(
        "advance-to-completion",
        "Deliver five explicit production boundaries through the actual leased tick service. The first starts the build, four subsequent advances finish it; repeat delivery must change nothing.",
        async () => {
          await settle(5);
        },
      );
      await story.step("completed-build", {
        actor: aliases[0],
        description:
          "Inspect the settled training camp and the other commander's unchanged private queue.",
        action: async () => {
          await read(
            owner,
            panel(owner).getByText("Training camp · completed", {
              exact: true,
            }),
          );
        },
        acknowledgement: {
          spec: "The authoritative completion appears and the camp count is two.",
          check: async () => {
            await expect(panel(owner)).toContainText(
              "Training camp · completed",
            );
            await expect(commitment(owner)).not.toContainText("queue advances");
            await expect(
              panel(owner).getByRole("radio", { name: /Training camp/ }),
            ).toHaveAccessibleName(/2 completed · 0 queued/);
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "Five ticks produce the exact reserved-owner and dividend-recipient balances, with one completed camp and no queued work.",
            check: async () => {
              const s = await canonical();
              expect(wallets(s)).toEqual([145000, 216300, 216300, 216300]);
              expect(s.systems[home].camps).toBe(
                initial.systems[home].camps + 1,
              );
              expect(s.construction!.orders).toEqual([]);
              expect(s.construction!.ledger[uid]).toHaveLength(1);
              expect(s.construction!.ledger[uid][0]).toMatchObject({
                id: reserved.construction!.orders[0].id,
                result: "completed",
                paidMilli: 69000,
                refundMilli: 0,
              });
            },
          },
        ],
        views: views(),
      });
      const complete = await canonical();
      await story.step("reserve-cancellable-base", {
        actor: aliases[0],
        description:
          "Choose a surface base and reserve its quoted cost using the keyboard.",
        action: async () => {
          await rail(owner);
          await panel(owner)
            .getByRole("radio", { name: /^Base / })
            .check();
          await button(owner, "Build base").focus();
          await owner.keyboard.press("Enter");
        },
        acknowledgement: {
          spec: "A new accepted base order enters the surface queue for tick6.",
          check: async () => {
            await expect(commitment(owner)).toContainText(
              "Construction order accepted.",
            );
            await expect(panel(owner)).toContainText(
              "Queued · eligible tick 6",
            );
            await read(
              owner,
              panel(owner).getByText(/Queued · eligible tick 6/),
            );
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "The displayed base reservation is the sole wallet debit and neither completed development count changes.",
            check: async () => {
              const s = await canonical(),
                o = s.construction!.orders[0];
              expect(s.revision).toBe(complete.revision + 1);
              expect(s.construction!.orders).toHaveLength(1);
              expect(o.type).toBe("base");
              expect(wallets(s)).toEqual([
                145000 - o.paidMilli,
                216300,
                216300,
                216300,
              ]);
              expect(s.systems).toEqual(complete.systems);
            },
          },
        ],
        views: views(),
      });
      const pendingBase = await canonical(),
        baseOrder = pendingBase.construction!.orders[0];
      await story.step("cancel-base", {
        actor: aliases[0],
        description:
          "Request cancellation of the queued surface base. The refund waits for authoritative settlement.",
        action: async () => {
          await button(owner, "Cancel base order").focus();
          await owner.keyboard.press("Enter");
        },
        acknowledgement: {
          spec: "Cancellation is acknowledged for tick6 and the cancel action is disabled.",
          check: async () => {
            await expect(commitment(owner)).toContainText("Cancellation");
            await expect(panel(owner)).toContainText(
              "Cancellation queued for tick 6",
            );
            await expect(button(owner, "Cancel base order")).toBeDisabled();
            await read(
              owner,
              panel(owner).getByText("Cancellation queued for tick 6", {
                exact: true,
              }),
            );
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "Cancellation admission adds one revision without an early refund or a second build.",
            check: async () => {
              const s = await canonical();
              expect(s.revision).toBe(pendingBase.revision + 1);
              expect(wallets(s)).toEqual(wallets(pendingBase));
              expect(s.construction!.orders).toEqual(
                pendingBase.construction!.orders,
              );
              expect(s.construction!.cancellations).toHaveLength(1);
              expect(s.construction!.cancellations[0].orderId).toBe(
                baseOrder.id,
              );
            },
          },
        ],
        views: views(),
      });
      await story.harness(
        "settle-cancellation",
        "Deliver tick6 through the real production service and repeat it to prove no second refund or production effect.",
        async () => {
          await settle(6);
        },
      );
      await story.step("cancelled-base", {
        actor: aliases[0],
        description:
          "Read the settled cancellation and returned credits; other players inspect only their own balances and empty queues.",
        action: async () => {
          await read(owner, panel(owner).getByText(/Base · cancelled/));
        },
        acknowledgement: {
          spec: "The base cancellation states its returned credits and no construction remains queued.",
          check: async () => {
            await expect(panel(owner)).toContainText(
              `Base · cancelled · ${baseOrder.paidMilli / 1000} credits returned`,
            );
            await expect(panel(owner)).toContainText("No construction queued.");
            await expect(commitment(owner)).not.toContainText("refund settles");
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "The unstarted base refunds its entire reservation exactly once; only tick6 production changes each wallet and the base count is unchanged.",
            check: async () => {
              const s = await canonical();
              expect(s.construction!.orders).toEqual([]);
              expect(s.construction!.cancellations).toEqual([]);
              expect(s.construction!.ledger[uid][0]).toMatchObject({
                id: baseOrder.id,
                result: "cancelled",
                refundMilli: baseOrder.paidMilli,
              });
              expect(s.systems[home].bases).toBe(initial.systems[home].bases);
              for (let i = 0; i < 4; i++) {
                const u = s.seats[i].uid;
                expect(wallets(s)[i]).toBe(
                  wallets(complete)[i] + s.economy!.ledger[u].creditsMilli,
                );
              }
            },
          },
        ],
        views: views(),
      });
      const final = await canonical();
      await story.step("recover-settled-outcome", {
        actor: aliases[0],
        description:
          "Reload and reopen the construction panel to inspect the persisted refund without replaying an action.",
        action: async () => {
          await owner.reload();
          if (!(await panel(owner).isVisible()))
            await button(owner, "Develop").click();
          await read(owner, panel(owner).getByText(/Base · cancelled/));
        },
        acknowledgement: {
          spec: "The same settled cancellation and returned credits are recovered.",
          check: async () => {
            await expect(panel(owner)).toContainText(
              `Base · cancelled · ${baseOrder.paidMilli / 1000} credits returned`,
            );
          },
        },
        verifications: [
          ...checks(),
          {
            spec: "The complete canonical result survives reload without another revision, build or refund.",
            check: async () => expect(await canonical()).toEqual(final),
          },
        ],
        views: views(),
      });
      await story.step("keyboard-return", {
        actor: aliases[0],
        description:
          "Return to the galaxy with Escape and recover the Develop control's focus.",
        action: async () => {
          await owner.keyboard.press("Escape");
        },
        acknowledgement: {
          spec: "The panel closes and Develop receives keyboard focus.",
          check: async () => {
            await expect(panel(owner)).toHaveCount(0);
            await expect(button(owner, "Develop")).toBeFocused();
          },
        },
        verifications: [
          {
            spec: "Leaving the instrument has no authoritative side effect.",
            check: async () => expect(await canonical()).toEqual(final),
          },
        ],
        views: views(),
      });
    } finally {
      for (const ctx of contexts) await ctx.close();
    }
  });
