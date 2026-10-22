import { revokeMembership } from "./story-helpers/membership-fault.mjs";
import { holdViewDigest } from "./story-helpers/view-digest-gate";
import { createRequire } from "node:module";
import type { BrowserContext, Page } from "@playwright/test";
import type { Campaign, CampaignView } from "../../shared/campaign";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import { admissionAt, scheduledAt } from "./story-helpers/admission-clock.mjs";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const focus = (page: Page) =>
  page.getByRole("region", { name: "Market focus", exact: true });
const points = (page: Page, name: string) =>
  focus(page).getByLabel(`${name} points`, { exact: true });
const names = ["Market", "Training camp", "Base", "Space station"];
const aliases = [
  "Market envoy",
  "Independent investor",
  "Outer envoy",
  "Fourth envoy",
];

// Read the real transport without intercepting, dropping or replacing frames.
function marketWrites(page: Page) {
  const frames: string[] = [];
  const record = (raw: string) => {
    if (
      raw.includes('"a":"p"') &&
      raw.includes("/commands/") &&
      raw.includes('"market.focus"')
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

test("Live membership revocation rejects a delayed private view and clears market intent", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "market-draft-membership-revocation",
    title: "Reject an old private view after a guarded membership fault",
    inventory: ["UX-06", "UX-14", "UX-16"],
    description:
      "Four commanders enter a real development campaign. The owner keeps a partial market allocation, then recovers the campaign with a real private-view digest held by a demo-only harness. A separately labelled administrative fault removes only authorization metadata; the original encrypted state, history, resources and receipts remain intact. Releasing the unchanged digest cannot reopen protected UI. Compare-and-set restoration and ordinary recovery must not resurrect the draft. This is not active Leave gameplay or hosted certification.",
  });
  let fault: { restore: () => Promise<void> } | undefined;
  let gate: Awaited<ReturnType<typeof holdViewDigest>> | undefined;
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  const observedWrites = new Map<Page, string[]>();
  const emails = aliases.map(
    (_, i) =>
      `membership-fault-${info.project.name}-${Date.now()}-${i}@example.test`,
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
  const receipts = async (uid: string) => {
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
    observedWrites.set(page, marketWrites(page));
    page.on("pageerror", (e) => errors.push(e.message));
    return page;
  };
  const keyboard = async (page: Page, name: string) => {
    await button(page, name).focus();
    await page.keyboard.press("Enter");
  };
  const openFocus = async (page: Page) => {
    await keyboard(page, "Economy");
    await keyboard(page, "Market focus");
    await expect(
      focus(page).getByRole("heading", { name: "Market focus", exact: true }),
    ).toBeFocused();
  };
  const rail = async (page: Page) => {
    const box = await button(page, "Apply focus").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    );
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
              .fill(`Scheduled story membership fault ${info.project.name}`);
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
      "Set the designated browser/domain clock to12:15 UTC and deliver the real Scheduler HTTP request. Authentication and session-revocation clocks remain real. This is not hosted scheduling certification.",
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
    const writes = observedWrites.get(owner)!,
      otherWrites = observedWrites.get(peer)!;
    let authorization = "";
    owner.on("request", (request) => {
      const url = new URL(request.url());
      if (url.port === "15001" && url.pathname.endsWith("/campaignKey"))
        authorization = request.headers().authorization ?? authorization;
    });
    const before = await canonical(),
      uid = before.seats[0].uid,
      peerUid = before.seats[1].uid;
    const beforeHead = (await db.doc(`campaignStates/${id}`).get()).data();
    const beforeMembership = (
      await db.doc(`campaignMemberships/${uid}/games/${id}`).get()
    ).data();
    const history = async () =>
      (await db.collection(`campaignStates/${id}/versions`).get()).docs
        .map((d: { id: string; data: () => unknown }) => ({
          id: d.id,
          data: d.data(),
        }))
        .sort((a: { id: string }, b: { id: string }) =>
          a.id.localeCompare(b.id),
        );
    const beforeHistory = await history();
    expect(beforeHistory.length).toBeGreaterThan(0);
    const beforeOwner = await published(uid),
      beforePeer = await published(peerUid),
      beforeReceipts = await receipts(uid),
      beforeIdentity = await identity(uid);
    expect(beforeIdentity.revision).toBe(1);
    const unchanged = {
      spec: "No market write or receipt occurs; the complete campaign, both private projections and saved identity remain unchanged.",
      check: async () => {
        expect(writes).toEqual([]);
        expect(otherWrites).toEqual([]);
        expect(await canonical()).toEqual(before);
        expect(await history()).toEqual(beforeHistory);
        expect(await published(uid)).toEqual(beforeOwner);
        expect(await published(peerUid)).toEqual(beforePeer);
        expect(await receipts(uid)).toEqual(beforeReceipts);
        expect(await identity(uid)).toEqual(beforeIdentity);
        expect(errors).toEqual([]);
      },
    };
    const ownerView = {
      page: owner,
      player: "Market envoy · campaign device",
      surface: "game" as const,
    };
    const peerView = {
      page: peer,
      player: "Independent investor",
      surface: "game" as const,
    };
    const partial = async () => {
      await expect(points(owner, "Market")).toHaveValue("");
      await expect(points(owner, "Training camp")).toHaveValue("73");
      await expect(button(owner, "Apply focus")).toBeDisabled();
      await rail(owner);
      await rail(peer);
    };
    await story.step("inspect-owned-focus", {
      actor: aliases[0],
      description:
        "Both commanders inspect their own authoritative allocation through keyboard controls.",
      action: async () => {
        await openFocus(owner);
        await openFocus(peer);
      },
      acknowledgement: {
        spec: "Both instruments show the original25-point allocation and disable an unchanged commitment.",
        check: async () => {
          for (const page of [owner, peer]) {
            for (const name of names)
              await expect(points(page, name)).toHaveValue("25");
            await expect(button(page, "Apply focus")).toBeDisabled();
            await rail(page);
          }
        },
      },
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
    await story.step("edit-partial-allocation", {
      actor: aliases[0],
      description:
        "Blank Market and enter73 camp points. The incomplete allocation remains an unsent draft.",
      action: async () => {
        await rail(owner);
        await points(owner, "Market").fill("");
        await points(owner, "Training camp").fill("73");
      },
      acknowledgement: {
        spec: "The exact partial values remain visible and Apply stays disabled.",
        check: partial,
      },
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
    await story.step("navigate-with-intent", {
      actor: aliases[0],
      description:
        "Close and reopen the economy under normal motion, then return to reduced motion with the same unsent intent.",
      action: async () => {
        await owner.emulateMedia({ reducedMotion: "no-preference" });
        await keyboard(owner, "Back to economy");
        await expect(button(owner, "Market focus")).toBeFocused();
        await keyboard(owner, "Return to galaxy");
        await openFocus(owner);
        await partial();
        await owner.emulateMedia({ reducedMotion: "reduce" });
      },
      acknowledgement: {
        spec: "Blank/73 survive navigation in both motion modes without a command.",
        check: partial,
      },
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
    const timeOrigin = await owner.evaluate(() => performance.timeOrigin);
    await story.harness(
      "hold-authorized-view",
      "Install a demo-loopback digest gate for this actual owner's current encrypted view only. Native digest bytes and all callbacks remain unchanged; the real result is delayed, never substituted.",
      async () => {
        const snapshot = await db
          .doc(`campaignViews/${id}/members/${uid}`)
          .get();
        gate = await holdViewDigest(owner, snapshot.get("envelope"), uid);
      },
    );
    await story.step("recover-with-inflight-view", {
      actor: aliases[0],
      description:
        "Return to Campaigns and recover the same campaign using keyboard controls; its authentic private view waits at the labelled harness boundary.",
      action: async () => {
        await keyboard(owner, "Back to economy");
        await keyboard(owner, "Return to galaxy");
        await keyboard(owner, "Campaigns");
        await owner
          .getByRole("button")
          .filter({
            has: owner.getByText(
              `Scheduled story membership fault ${info.project.name}`,
              { exact: true },
            ),
          })
          .focus();
        await owner.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "Recovery is visibly pending while an actual authorized digest is held.",
        check: async () => {
          await gate!.held();
          await expect(
            owner
              .getByRole("status")
              .filter({ hasText: "Recovering your campaign" }),
          ).toBeVisible();
          expect(await owner.evaluate(() => performance.timeOrigin)).toBe(
            timeOrigin,
          );
        },
      },
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
    await story.harness(
      "administrative-membership-fault",
      "Guarded demo-only administrative fault: atomically remove this owner's memberUids entry and membership document. No player Leave, canonical state, private ciphertext, history, command, receipt or resource is fabricated or changed.",
      async () => {
        fault = await revokeMembership(
          db,
          id,
          uid,
          new URL(owner.url()).origin,
        );
      },
    );
    const accessLost = {
      spec: "Real membership loss removes protected UI and player reads are denied, while the other commander stays authorized.",
      check: async () => {
        await expect(owner.getByRole("alert")).toContainText(
          "You no longer have access to this campaign",
        );
        await expect(owner.locator("canvas")).toHaveCount(0);
        await expect(focus(owner)).toHaveCount(0);
        await expect(button(owner, "Economy")).toHaveCount(0);
        expect(authorization.startsWith("Bearer ")).toBe(true);
        const response = await request.get(
          `http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/campaignViews/${id}/members/${uid}`,
          { headers: { Authorization: authorization } },
        );
        expect(response.status()).toBe(403);
        expect(await owner.evaluate(() => performance.timeOrigin)).toBe(
          timeOrigin,
        );
        for (const name of names)
          await expect(points(peer, name)).toHaveValue("25");
      },
    };
    await story.step("observe-revoked-access", {
      actor: aliases[0],
      description:
        "Observe the acknowledged access-loss remedy after the separately labelled administrative fault.",
      action: async () => {},
      acknowledgement: accessLost,
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
    await story.harness(
      "release-original-digest",
      "Release every held native digest result unchanged and wait for its promise continuation and rendered frame. Existing service/route callback fences, not the harness, decide whether the old view may display.",
      async () => {
        await gate!.release();
      },
    );
    await story.step("reject-late-private-view", {
      actor: aliases[0],
      description:
        "Review the same access-loss state after the old authorized view resumes; no old galaxy or draft may return.",
      action: async () => {},
      acknowledgement: accessLost,
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
    await story.harness(
      "restore-exact-authorization",
      "Compare-and-set restoration restores only this fault's exact membership metadata. Any concurrent campaign or membership change fails closed; no campaign progress or private history is reconstructed.",
      async () => {
        await fault!.restore();
        expect((await db.doc(`campaignStates/${id}`).get()).data()).toEqual(
          beforeHead,
        );
        expect(
          (await db.doc(`campaignMemberships/${uid}/games/${id}`).get()).data(),
        ).toEqual(beforeMembership);
        await gate!.dispose();
      },
    );
    await story.step("recover-restored-membership", {
      actor: aliases[0],
      description:
        "Use All campaigns and the original campaign card to recover through the real authorized service, without reload or identity save.",
      action: async () => {
        await keyboard(owner, "All campaigns");
        await expect(button(owner, "Your campaigns (1)")).toBeVisible();
        await owner
          .getByRole("button")
          .filter({
            has: owner.getByText(
              `Scheduled story membership fault ${info.project.name}`,
              { exact: true },
            ),
          })
          .focus();
        await owner.keyboard.press("Enter");
        await expect(button(owner, "Economy")).toBeVisible();
        await openFocus(owner);
      },
      acknowledgement: {
        spec: "Authoritative25-point allocations replace the cleared blank/73 draft and Apply stays disabled.",
        check: async () => {
          for (const name of names)
            await expect(points(owner, name)).toHaveValue("25");
          await expect(button(owner, "Apply focus")).toBeDisabled();
          await expect(owner.getByRole("alert")).toHaveCount(0);
          expect(await owner.evaluate(() => performance.timeOrigin)).toBe(
            timeOrigin,
          );
          await rail(owner);
          await rail(peer);
        },
      },
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
  } finally {
    try {
      await fault?.restore();
    } finally {
      try {
        await gate?.dispose();
      } finally {
        for (const ctx of contexts) await ctx.close();
      }
    }
  }
});
