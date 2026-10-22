import type { PendingCampaign } from "../../src/lib/campaign-session";
import { createRequire } from "node:module";
import type { BrowserContext, Page } from "@playwright/test";
import type { Campaign, CampaignView } from "../../shared/campaign";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import { admissionAt, scheduledAt } from "./story-helpers/admission-clock.mjs";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const research = (page: Page) =>
  page.getByRole("region", { name: "Research selection", exact: true });
const aliases = [
  "Market envoy",
  "Independent investor",
  "Outer envoy",
  "Fourth envoy",
];

// Read the real transport without intercepting, dropping or replacing frames.
function researchWrites(page: Page) {
  const frames: string[] = [];
  const record = (raw: string) => {
    if (
      raw.includes('"a":"p"') &&
      raw.includes("/commands/") &&
      raw.includes('"research.select"')
    )
      frames.push(raw);
  };
  page.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => record(String(payload))),
  );
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.port !== "19000" || url.pathname !== "/.lp") return;
    for (const [key, value] of url.searchParams)
      if (/^d\d+$/.test(key))
        record(Buffer.from(value.replaceAll(".", "="), "base64url").toString());
  });
  return frames;
}

test("Live research orders preserve choices and acknowledge switches", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-research-orders",
    title: "Choose, switch and recover acknowledged research",
    inventory: ["UX-06", "UX-14", "UX-16"],
    description:
      "Four saved commanders submit real research orders through keyboard controls. Receipts bind original payloads and effective ticks. Reload recovers accepted authority; a disconnected second device submits a stale revision for rejection. The guarded demo clock changes only designated domain time. No completion, overflow or hosted acceptance is claimed.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  const observedWrites = new Map<Page, string[]>();
  const emails = aliases.map(
    (_, i) =>
      `research-orders-${info.project.name}-${Date.now()}-${i}@example.test`,
  );
  let id = "",
    url = "";
  const require = createRequire(
    new URL("../../functions/package.json", import.meta.url),
  );
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const db = require("firebase-admin/firestore").getFirestore();
  const { provider, unwrap } = require("./lib/shared/crypto.js");
  const { context } = require("./lib/functions/src/campaigns.js");
  const canonical = async (): Promise<Campaign> => {
    const head = await db.doc(`campaignStates/${id}`).get();
    return provider("mock").open(
      head.get("envelope"),
      head.get("canonicalKey"),
      context(id, head.get("revision"), "canonical", 1),
    );
  };
  const published = async (uid: string): Promise<CampaignView> => {
    const head = await db.doc(`campaignViews/${id}/members/${uid}`).get();
    const key = await db.doc(`campaignKeys/${id}/members/${uid}`).get();
    const ctx = context(id, head.get("revision"), `member:${uid}`, 1);
    return provider("mock").open(
      head.get("envelope"),
      await unwrap(head.get("grant"), key.get("kek"), uid, ctx, "mock"),
      ctx,
    );
  };
  const receipts = async (
    uid: string,
  ): Promise<{ id: string; data: unknown }[]> => {
    const snapshot = await db
      .collection(`campaignReceipts/${uid}/results`)
      .get();
    return snapshot.docs
      .map((doc: { id: string; data: () => unknown }) => ({
        id: doc.id,
        data: doc.data(),
      }))
      .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));
  };
  const identity = async (uid: string) => {
    const head = await db.doc(`profiles/${uid}`).get();
    const versions = await db.collection(`profiles/${uid}/versions`).get();
    const saved = await db.collection(`profiles/${uid}/receipts`).get();
    return {
      revision: head.get("revision"),
      versions: versions.docs.map((d: { id: string }) => d.id).sort(),
      receipts: saved.docs.map((d: { id: string }) => d.id).sort(),
    };
  };
  const newDevice = async () => {
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
    observedWrites.set(page, researchWrites(page));
    page.on("pageerror", (e) => errors.push(e.message));
    return page;
  };
  const keyboard = async (page: Page, name: string) => {
    await button(page, name).focus();
    await page.keyboard.press("Enter");
  };
  try {
    for (let i = 0; i < 4; i++)
      await story.harness(
        `identity-${i + 1}`,
        "Ordinary Google emulator sign-in and identity save; developer entitlement is an explicit admission fixture, not a fabricated seat.",
        async () => {
          const page = await newDevice();
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
        "Create/join with ordinary player controls. The existing fixed catalogue and admission-time fixture changes no identity, payload, resource or result.",
        async () => {
          const page = pages[i];
          if (i === 0) {
            await keyboard(page, "Create campaign");
            await page
              .getByLabel("Campaign name")
              .fill(`Scheduled story research orders ${info.project.name}`);
            await keyboard(page, "Create galaxy");
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
          await keyboard(page, "Claim your seat");
          await expect(
            page.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
        },
      );
    await story.harness(
      "scheduler-delivery",
      "Set the designated browser/domain clock to12:15 UTC and deliver the real Scheduler HTTP request. Authentication remains real. This is not hosted scheduling certification.",
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
        await expect.poll(async () => (await canonical()).phase).toBe("active");
        for (const page of pages)
          await expect(button(page, "Economy")).toBeVisible();
      },
    );
    const owner = pages[0],
      peer = pages[1];
    const before = await canonical(),
      uid = before.seats[0].uid,
      peerUid = before.seats[1].uid;
    const peerBefore = await published(peerUid),
      identityBefore = await identity(uid);
    const receiptsBefore = await receipts(uid);
    const ownerView = {
      page: owner,
      player: aliases[0],
      surface: "game" as const,
    };
    const peerView = {
      page: peer,
      player: aliases[1],
      surface: "game" as const,
    };
    const choose = async (page: Page, target: string) => {
      const radio = research(page).getByRole("radio", {
        name: new RegExp("^" + target),
      });
      await radio.focus();
      await page.keyboard.press("Space");
      await expect(radio).toBeFocused();
      await expect(radio).toBeChecked();
    };
    const privacy = {
      spec: "Research admissions leave resources, levels, progress and the peer's private science unchanged; owner order IDs are absent from serialized peer views.",
      check: async () => {
        const state = await canonical(),
          other = await published(peerUid);
        expect(state.empires).toEqual(before.empires);
        expect(state.systems).toEqual(before.systems);
        expect(state.economy!.tick).toBe(0);
        expect(state.economy!.research[uid].levels).toEqual(
          before.economy!.research[uid].levels,
        );
        expect(state.economy!.research[uid].progressMilli).toEqual(
          before.economy!.research[uid].progressMilli,
        );
        expect(other.economy).toEqual(peerBefore.economy);
        expect(other.empire).toEqual(peerBefore.empire);
        for (const order of state.economy!.research[uid].orders ?? [])
          expect(JSON.stringify(other)).not.toContain(order.id);
        expect(await identity(uid)).toEqual(identityBefore);
        expect(observedWrites.get(peer)).toEqual([]);
        expect(errors).toEqual([]);
      },
    };
    const accepted = async (target: string, count: number) => {
      await expect
        .poll(
          async () =>
            (await canonical()).economy!.research[uid].orders?.length ?? 0,
        )
        .toBe(count);
      const state = await canonical(),
        order = state.economy!.research[uid].orders![count - 1];
      expect(order.target).toBe(target);
      expect(order.effectiveTick).toBe(1);
      expect(state.economy!.research[uid].target).toBe("navigation");
      const saved = await db
        .doc("campaignReceipts/" + uid + "/results/" + order.id)
        .get();
      expect(saved.get("status")).toBe("accepted");
      const path = "commands/" + id + "/" + uid + "/" + order.id;
      const ingress = await require("firebase-admin/database")
        .getDatabase()
        .ref(path)
        .get();
      const { commandDigest } = require("./lib/shared/command-receipt.js");
      expect(saved.get("requestDigest")).toBe(
        await commandDigest(path, ingress.val()),
      );
      await expect(
        research(owner).getByRole("region", {
          name: "Accepted research orders",
        }),
      ).toContainText("Tick 1 · " + target);
      return order;
    };
    await story.step("choose-without-sending", {
      actor: aliases[0],
      description:
        "Open both private science instruments and choose investing by keyboard without sending.",
      action: async () => {
        for (const page of [owner, peer]) await keyboard(page, "Economy");
        await choose(owner, "investing");
      },
      acknowledgement: {
        spec: "Investing is a local choice; no command or receipt exists.",
        check: async () => {
          await expect(button(owner, "Queue investing")).toBeEnabled();
          expect(await canonical()).toEqual(before);
          expect(await receipts(uid)).toEqual(receiptsBefore);
          expect(observedWrites.get(owner)).toEqual([]);
        },
      },
      verifications: [privacy],
      views: [ownerView, peerView],
    });
    await story.step("restore-panel-choice", {
      actor: aliases[0],
      description:
        "Close with Escape and reopen; unsent investing survives within the campaign.",
      action: async () => {
        await owner.keyboard.press("Escape");
        await expect(button(owner, "Economy")).toBeFocused();
        await keyboard(owner, "Economy");
      },
      acknowledgement: {
        spec: "The investing radio is restored without a command.",
        check: async () => {
          await expect(
            research(owner).getByRole("radio", { name: /^investing/ }),
          ).toBeChecked();
          expect(await receipts(uid)).toEqual(receiptsBefore);
          expect(observedWrites.get(owner)).toEqual([]);
        },
      },
      verifications: [privacy],
      views: [ownerView],
    });
    await story.step("queue-investing", {
      actor: aliases[0],
      description:
        "Commit investing and wait for its genuine authoritative receipt.",
      action: async () => keyboard(owner, "Queue investing"),
      acknowledgement: {
        spec: "The accepted receipt binds the original payload; investing is scheduled for tick1 while navigation remains active.",
        check: async () => {
          await expect(research(owner).getByRole("status")).toContainText(
            "Research order accepted",
          );
          await accepted("investing", 1);
        },
      },
      verifications: [privacy],
      views: [ownerView, peerView],
    });
    const first = (await canonical()).economy!.research[uid].orders![0];
    await story.step("reload-accepted-order", {
      actor: aliases[0],
      description:
        "Reload and recover the accepted investing order from authority.",
      action: async () => {
        await owner.reload();
        await keyboard(owner, "Economy");
      },
      acknowledgement: {
        spec: "The same UUID and tick recover; reload creates no extra receipt.",
        check: async () => {
          expect(await accepted("investing", 1)).toEqual(first);
          expect((await receipts(uid)).length).toBe(receiptsBefore.length + 1);
          await expect(
            research(owner).getByRole("radio", { name: /^investing/ }),
          ).toBeChecked();
        },
      },
      verifications: [privacy],
      views: [ownerView],
    });
    const stale = await newDevice();
    await story.harness(
      "second-saved-device",
      "Ordinary sign-in on a second device uses the same saved identity without resaving it; no campaign command is injected.",
      async () => {
        await login(stale, emails[0]);
        await keyboard(stale, "Close");
        await stale.goto(url);
        await stale.clock.setFixedTime(scheduledAt);
        await keyboard(stale, "Economy");
        await expect(
          research(stale).getByRole("region", {
            name: "Accepted research orders",
          }),
        ).toContainText("investing");
        expect(await identity(uid)).toEqual(identityBefore);
      },
    );
    const staleRevision = (await canonical()).revision;
    await story.harness(
      "disconnect-second-device",
      "Harness fault: disconnect the second browser after its older revision is visible. No state or receipt is fabricated.",
      async () => {
        await stale.context().setOffline(true);
      },
    );
    await story.harness(
      "normal-motion-owner",
      "Use normal motion on the current device; outcome assertions remain identical and captures wait for finite motion.",
      async () => {
        await owner.emulateMedia({ reducedMotion: "no-preference" });
      },
    );
    await story.step("switch-current-device", {
      actor: aliases[0],
      description:
        "Commit innovation while the disconnected device retains the older revision.",
      action: async () => {
        await choose(owner, "innovation");
        await keyboard(owner, "Queue innovation");
      },
      acknowledgement: {
        spec: "Two distinct accepted orders preserve sequence, first order and progress before settlement.",
        check: async () => {
          await expect(research(owner).getByRole("status")).toContainText(
            "Research order accepted",
          );
          const second = await accepted("innovation", 2);
          expect(second.sequence).toBeGreaterThan(first.sequence);
          expect(second.id).not.toBe(first.id);
          expect((await canonical()).economy!.research[uid].orders![0]).toEqual(
            first,
          );
        },
      },
      verifications: [privacy],
      views: [ownerView, peerView],
    });
    let durable: PendingCampaign | undefined;
    const readDurable = () =>
      stale.evaluate(
        async (uid) =>
          new Promise<PendingCampaign | undefined>((resolve, reject) => {
            const opening = indexedDB.open("clusterii-recovery", 1);
            opening.onerror = () => reject(opening.error);
            opening.onsuccess = () => {
              const database = opening.result;
              const read = database
                .transaction("orders")
                .objectStore("orders")
                .get(uid);
              read.onsuccess = () => {
                resolve(read.result);
                database.close();
              };
              read.onerror = () => {
                reject(read.error);
                database.close();
              };
            };
          }),
        uid,
      );
    await story.step("submit-disconnected-choice", {
      actor: aliases[0] + " · second device",
      description:
        "Submit recruiting from the disconnected device's stale revision. Waiting is not acceptance.",
      action: async () => {
        await choose(stale, "recruiting");
        await keyboard(stale, "Queue recruiting");
      },
      acknowledgement: {
        spec: "The second device waits; authority still has only two accepted orders.",
        check: async () => {
          await expect(
            button(stale, "Awaiting acknowledgement…"),
          ).toBeVisible();
          durable = await readDurable();
          expect(durable?.kind).toBe("research.select");
          expect(durable?.gameId).toBe(id);
          expect(
            (await canonical()).economy!.research[uid].orders,
          ).toHaveLength(2);
        },
      },
      verifications: [privacy],
      views: [
        {
          page: stale,
          player: aliases[0] + " · second device",
          surface: "game",
        },
      ],
    });
    const beforeReconnect = await receipts(uid);
    await story.harness(
      "restore-second-transport",
      "Restore transport for the existing outbox; never rewrite or redeliver ingress from the harness.",
      async () => {
        await stale.context().setOffline(false);
      },
    );
    await story.step("review-stale-rejection", {
      actor: aliases[0] + " · second device",
      description:
        "Read the authoritative conflict and retain recruiting for review.",
      action: async () => {
        await research(stale).getByRole("alert").focus();
      },
      acknowledgement: {
        spec: "One rejected conflict receipt leaves the two accepted orders intact and preserves the local choice.",
        check: async () => {
          await expect(research(stale).getByRole("alert")).toContainText(
            "Your research choice is preserved",
          );
          await expect(
            research(stale).getByRole("radio", { name: /^recruiting/ }),
          ).toBeChecked();
          await expect(button(stale, "Queue recruiting")).toBeEnabled();
          await expect
            .poll(async () => (await receipts(uid)).length)
            .toBe(beforeReconnect.length + 1);
          const prior = new Set(beforeReconnect.map((r) => r.id));
          const added = (await receipts(uid)).filter((r) => !prior.has(r.id));
          expect(added).toHaveLength(1);
          expect(added[0].id).toBe(durable!.id);
          const path = "commands/" + id + "/" + uid + "/" + durable!.id;
          const ingress = await require("firebase-admin/database")
            .getDatabase()
            .ref(path)
            .get();
          expect(ingress.val()).toEqual({
            kind: durable!.kind,
            envelope: durable!.envelope,
          });
          const { commandDigest } = require("./lib/shared/command-receipt.js");
          expect(added[0].data).toMatchObject({
            requestDigest: await commandDigest(path, ingress.val()),
          });
          const profileKey = await db.doc("profileKeys/" + uid).get();
          const originalAction = await provider("mock").open(
            durable!.envelope,
            profileKey.get("kek"),
            context(id, 0, "command:" + durable!.id, 1),
          );
          expect(originalAction).toEqual({
            kind: "research.select",
            expectedRevision: staleRevision,
            target: "recruiting",
          });
          expect(await readDurable()).toBeUndefined();
          expect(added[0].data).toMatchObject({
            status: "rejected",
            reason: "conflict",
          });
          expect(
            (await canonical()).economy!.research[uid].orders,
          ).toHaveLength(2);
        },
      },
      verifications: [privacy],
      views: [
        {
          page: stale,
          player: aliases[0] + " · second device",
          surface: "game",
        },
        peerView,
      ],
    });
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
