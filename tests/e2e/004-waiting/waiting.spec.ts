import type { BrowserContext, Page } from "@playwright/test";
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
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import { provider, unwrap } from "../../../shared/crypto";
import type { CampaignView } from "../../../shared/campaign";
import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { login, grantDeveloper } from "../../browser/helpers";
import {
  admissionAt,
  scheduledAt,
} from "../../browser/story-helpers/admission-clock.mjs";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
test("Recover a waiting seat and enter the assigned home", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "waiting-to-home",
    title: "Gather commanders and recover the same seat",
    inventory: ["UX-02", "UX-16"],
    description:
      "Four ordinary authenticated players gather, recover a waiting membership and enter assigned homes after the real scheduler delivery. The demo catalogue/admission clock is a labelled harness; no state is injected.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [];
  const emails = Array.from(
    { length: 4 },
    (_, i) => `science-${info.project.name}-${Date.now()}-${i}@example.test`,
  );
  const name = `Scheduled story waiting manifest ${info.project.name}`;
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
  const readers: {
    app: ReturnType<typeof initializeApp>;
    uid: string;
    db: ReturnType<typeof getFirestore>;
    functions: ReturnType<typeof getFunctions>;
  }[] = [];
  const readOwn = async (index: number) => {
    const r = readers[index];
    const stored = (
      await getDoc(doc(r.db, "campaignViews", campaignId, "members", r.uid))
    ).data()!;
    const access = (
      await httpsCallable<{ gameId: string }, { kek: string }>(
        r.functions,
        "campaignKey",
      )({ gameId: campaignId })
    ).data;
    const ctx = {
      gameId: campaignId,
      objectId: `member:${r.uid}`,
      revision: stored.revision,
      epoch: stored.envelope.epoch,
      keyVersion: stored.envelope.keyVersion,
    };
    const key = await unwrap(stored.grant, access.kek, r.uid, ctx, "mock");
    return provider("mock").open<CampaignView>(stored.envelope, key, ctx);
  };
  const receipts = async () =>
    (
      await getDocs(
        collection(
          readers[0].db,
          "campaignReceipts",
          readers[0].uid,
          "results",
        ),
      )
    ).docs
      .map((d) => d.id)
      .sort();
  let homeBefore = "",
    receiptsBefore: string[] = [],
    revisionBefore = 0;
  const manifest = () =>
    pages[0].getByRole("region", { name: "Campaign manifest", exact: true });
  const waitingView = () => ({
    page: pages[0],
    player: aliases[0],
    surface: "game" as const,
    primary: [
      button(pages[0], "Roster"),
      button(pages[0], "Leave campaign"),
      button(pages[0], "Campaigns"),
    ],
  });
  const contained = async (locator: import("@playwright/test").Locator) => {
    await expect
      .poll(() =>
        locator.evaluate((el) => {
          const b = el.getBoundingClientRect();
          let t = 0,
            l = 0,
            r = innerWidth,
            d = innerHeight;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const c = getComputedStyle(p),
              x = p.getBoundingClientRect();
            if (/auto|scroll|hidden|clip/.test(c.overflowY)) {
              t = Math.max(t, x.top + p.clientTop);
              d = Math.min(d, x.top + p.clientTop + p.clientHeight);
            }
            if (/auto|scroll|hidden|clip/.test(c.overflowX)) {
              l = Math.max(l, x.left + p.clientLeft);
              r = Math.min(r, x.left + p.clientLeft + p.clientWidth);
            }
          }
          return (
            b.width > 0 &&
            b.height > 0 &&
            b.top >= t &&
            b.bottom <= d &&
            b.left >= l &&
            b.right <= r
          );
        }),
      )
      .toBe(true);
  };
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
    await story.harness(
      "authorized-readers",
      "Read-only corroboration: resolve actual emulator accounts by unique login email, mint their authenticated client sessions and use Firestore rules/campaignKey grants. No state writes or identity inference.",
      async () => {
        const require = createRequire(
          new URL("../../../functions/package.json", import.meta.url),
        );
        const admin = require("firebase-admin/app");
        if (!admin.getApps().length)
          admin.initializeApp({ projectId: "demo-clusterii" });
        const auth = require("firebase-admin/auth").getAuth();
        for (const email of emails.slice(0, 2)) {
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
          const db = getFirestore(app);
          connectFirestoreEmulator(db, "127.0.0.1", 18080);
          const functions = getFunctions(app);
          connectFunctionsEmulator(functions, "127.0.0.1", 15001);
          readers.push({ app, uid: user.uid, db, functions });
        }
        expect(readers[0].uid).not.toBe(readers[1].uid);
      },
    );
    for (let i = 0; i < 4; i++) {
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
      if (i === 0 || i === 3)
        await story.step(
          i === 0 ? "recover-waiting-seat" : "read-scheduled-roster",
          {
            actor: aliases[0],
            description:
              i === 0
                ? "Reload the acknowledged membership without joining again; read named seats and remaining places."
                : "The full actual roster schedules departure; no player starts the campaign manually.",
            action: async () => {
              if (i === 0) await pages[0].reload();
              await pages[0]
                .getByRole("region", { name: "Campaign manifest", exact: true })
                .focus();
            },
            acknowledgement: {
              spec: "Authorized manifest restores the saved roster and actual start condition.",
              check: async () => {
                await expect(
                  pages[0].getByRole("heading", {
                    name:
                      i === 0
                        ? "1 / 4 empires assembled"
                        : "4 / 4 empires assembled",
                    exact: true,
                  }),
                ).toBeVisible();
                await expect(
                  pages[0].getByRole("region", {
                    name: "Campaign manifest",
                    exact: true,
                  }),
                ).toContainText(aliases[0]);
              },
            },
            verifications: [
              {
                spec: "Pre-start screen exposes no arbitrary world, home ownership or extra claim control.",
                check: async () => {
                  await expect(button(pages[0], "Inspect system")).toHaveCount(
                    0,
                  );
                  await expect(button(pages[0], "Claim your seat")).toHaveCount(
                    0,
                  );
                  await expect(pages[0].locator("canvas")).toHaveCount(0);
                },
              },
            ],
            views: [
              {
                page: pages[0],
                player: aliases[0],
                surface: "game",
                primary: [
                  button(pages[0], "Roster"),
                  button(pages[0], "Leave campaign"),
                  button(pages[0], "Campaigns"),
                ],
              },
            ],
          },
        );
    }
    await story.step("read-departure-policy", {
      actor: aliases[0],
      description:
        "Keyboard-scroll the bounded manifest to the objective and Leave policy while actions remain contained.",
      action: async () => {
        await manifest().focus();
        await pages[0].keyboard.press("End");
      },
      acknowledgement: {
        spec: "Complete departure policy is readable without moving the document.",
        check: async () => {
          await contained(
            manifest().getByText("Leave campaign releases", { exact: false }),
          );
          await contained(button(pages[0], "Leave campaign"));
          expect(await pages[0].evaluate(() => scrollY)).toBe(0);
        },
      },
      verifications: [
        {
          spec: "Keyboard focus remains in the reading region.",
          check: async () => expect(manifest()).toBeFocused(),
        },
      ],
      views: [waitingView()],
    });
    await story.step("read-rules-and-return", {
      actor: aliases[0],
      description:
        "Open shared Rules through Menu, then Escape back through the menu and restore the original opener.",
      action: async () => {
        await keyboard(pages[0], "Menu");
        await keyboard(pages[0], "Rules");
      },
      acknowledgement: {
        spec: "Rules disclose proposed policy and preserve the campaign.",
        check: async () => {
          await expect(
            pages[0].getByRole("dialog", { name: "Game menu" }),
          ).toContainText("Market dividend rules remain under review.");
        },
      },
      verifications: [],
      views: [
        {
          page: pages[0],
          player: aliases[0],
          surface: "game",
          primary: [
            button(pages[0], "Back to menu"),
            button(pages[0], "Return to game"),
          ],
        },
      ],
    });
    await story.harness(
      "rules-focus-return",
      "Ordinary Escape restores Rules, then Menu, without a server command.",
      async () => {
        const before = await receipts();
        await pages[0].keyboard.press("Escape");
        await expect(button(pages[0], "Rules")).toBeFocused();
        await pages[0].keyboard.press("Escape");
        await expect(button(pages[0], "Menu")).toBeFocused();
        expect(await receipts()).toEqual(before);
      },
    );
    await story.step("release-saved-seat", {
      actor: aliases[0],
      description:
        "Leave before departure; the server releases this seat and cancels the full-roster schedule for the remaining player.",
      action: async () => {
        await keyboard(pages[0], "Leave campaign");
      },
      acknowledgement: {
        spec: "The Leave receipt is accepted and peer capacity updates.",
        check: async () => {
          await expect(
            pages[0]
              .getByRole("status")
              .filter({ hasText: "Your seat has been released." }),
          ).toBeVisible();
          await expect(
            pages[1].getByRole("heading", {
              name: "3 / 4 empires assembled",
              exact: true,
            }),
          ).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "The remaining authorized projection has one free place and no scheduled start; departed private read is denied.",
          check: async () => {
            const v = await readOwn(1);
            expect(v.roster).toHaveLength(3);
            expect(v.phase).toBe("waiting");
            expect(v.startAt).toBeNull();
            await expect(
              getDoc(
                doc(
                  readers[0].db,
                  "campaignViews",
                  campaignId,
                  "members",
                  readers[0].uid,
                ),
              ),
            ).rejects.toThrow();
          },
        },
      ],
      views: [
        {
          page: pages[1],
          player: aliases[1],
          surface: "game",
          primary: [
            button(pages[1], "Roster"),
            button(pages[1], "Leave campaign"),
          ],
        },
      ],
    });
    await story.step("rejoin-departure", {
      actor: aliases[0],
      description:
        "Choose the released faction and submit a new ordinary admission; the actual full roster schedules departure again.",
      action: async () => {
        await pages[0].getByRole("radio", { name: /Heliac Assembly/ }).check();
        await keyboard(pages[0], "Claim your seat");
      },
      acknowledgement: {
        spec: "Server confirms rejoin and four occupied places.",
        check: async () => {
          await expect(
            pages[0].getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
          await expect(
            pages[0].getByRole("heading", {
              name: "4 / 4 empires assembled",
              exact: true,
            }),
          ).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "One seat per authenticated commander and no home before start.",
          check: async () => {
            const v = await readOwn(0);
            expect(v.roster).toHaveLength(4);
            expect(v.own.home).toBeNull();
            expect(v.phase).toBe("scheduled");
            expect(v.startAt).toBe(scheduledAt);
          },
        },
      ],
      views: [waitingView()],
    });
    await story.harness(
      "normal-motion-start",
      "Explicit normal-motion interaction check: enable no-preference before real scheduled transition; reduced capture metadata is restored only afterward.",
      async () => {
        for (const page of pages)
          await page.emulateMedia({ reducedMotion: "no-preference" });
        expect(
          await pages[0].evaluate(
            () => matchMedia("(prefers-reduced-motion: reduce)").matches,
          ),
        ).toBe(false);
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
        const before = await readOwn(0),
          peer = await readOwn(1);
        expect(before.own.home).toBeTruthy();
        expect(peer.own.home).not.toBe(before.own.home);
        homeBefore = before.own.home!;
        revisionBefore = before.revision;
        receiptsBefore = await receipts();
        await expect(
          getDoc(
            doc(
              readers[1].db,
              "campaignViews",
              campaignId,
              "members",
              readers[0].uid,
            ),
          ),
        ).rejects.toThrow();
        await keyboard(pages[0], "Inspect system");
        await expect(button(pages[0], "Back to galaxy")).toBeVisible();
        await keyboard(pages[0], "Back to galaxy");
        await expect(button(pages[0], "Inspect system")).toBeFocused();
        for (const page of pages)
          await page.emulateMedia({ reducedMotion: "reduce" });
      },
    );
    await story.step("recover-assigned-home", {
      actor: aliases[0],
      description:
        "The same campaign reveals a real home. Reload preserves that assignment and independent peer ownership.",
      action: async () => {
        await pages[0].reload();
        await acknowledgeStart(pages[0]);
      },
      acknowledgement: {
        spec: "Authorized active view has a home and no waiting manifest.",
        check: async () => {
          await expect(
            pages[0].getByRole("region", {
              name: "Waiting campaign",
              exact: true,
            }),
          ).toHaveCount(0);
          await expect(
            pages[0].getByText("Your knowledge of this system", {
              exact: true,
            }),
          ).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "No new seat claim is offered after recovery.",
          check: async () => {
            for (const page of pages)
              await expect(button(page, "Claim your seat")).toHaveCount(0);
            const after = await readOwn(0);
            expect(after.own.home).toBe(homeBefore);
            expect(after.revision).toBe(revisionBefore);
            expect(after.roster).toHaveLength(4);
            expect(await receipts()).toEqual(receiptsBefore);
          },
        },
      ],
      views: pages.slice(0, 2).map((page, i) => ({
        page,
        player: aliases[i],
        surface: "game" as const,
        primary: [button(page, "Inspect system"), button(page, "Roster")],
      })),
    });
  } finally {
    for (const context of contexts) await context.close();
    for (const reader of readers) await deleteApp(reader.app);
  }
});
