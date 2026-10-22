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

test("Live market allocation isolates saved accounts on the same browser", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "market-draft-account-isolation",
    title: "Switch saved commanders without carrying unsent market intent",
    inventory: ["UX-06", "UX-14", "UX-16"],
    description:
      "Four saved commanders enter a real development campaign. Ordinary sign-out/sign-in reuses one browser across two accounts without resaving either identity. Partial unsent market intent must clear, while canonical state, both private projections and receipt sets remain unchanged. Fixed admission/catalogue clocks and developer entitlement are explicit harness controls. This does not claim durable accepted-order recovery or hosted authentication acceptance.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  const observedWrites = new Map<Page, string[]>();
  const emails = aliases.map(
    (_, i) =>
      `market-account-${info.project.name}-${Date.now()}-${i}@example.test`,
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
              .fill(`Scheduled story market account ${info.project.name}`);
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
    const writes = observedWrites.get(owner)!,
      otherWrites = observedWrites.get(peer)!;
    const before = await canonical(),
      uid = before.seats[0].uid,
      peerUid = before.seats[1].uid;
    const beforeOwner = await published(uid),
      beforePeer = await published(peerUid),
      beforeReceipts = await receipts(uid),
      beforeIdentity = await identity(uid),
      beforePeerIdentity = await identity(peerUid),
      beforePeerReceipts = await receipts(peerUid);
    expect(beforeIdentity.revision).toBe(1);
    expect(beforePeerIdentity.revision).toBe(1);
    const unchanged = {
      spec: "No market write or receipt occurs; the complete campaign, both private projections and saved identity remain unchanged.",
      check: async () => {
        expect(writes).toEqual([]);
        expect(otherWrites).toEqual([]);
        expect(await canonical()).toEqual(before);
        expect(await published(uid)).toEqual(beforeOwner);
        expect(await published(peerUid)).toEqual(beforePeer);
        expect(await receipts(uid)).toEqual(beforeReceipts);
        expect(await identity(uid)).toEqual(beforeIdentity);
        expect(await identity(peerUid)).toEqual(beforePeerIdentity);
        expect(await receipts(peerUid)).toEqual(beforePeerReceipts);
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
    const entryUrl = new URL("../", url).href;
    const signOut = async () => {
      await owner.goto(entryUrl);
      await keyboard(owner, "Your identity");
      await keyboard(owner, "Sign out");
    };
    const signedOut = {
      spec: "Ordinary sign-out closes protected controls and exposes Play without an identity control.",
      check: async () => {
        await expect(button(owner, "Play")).toBeVisible();
        await expect(button(owner, "Your identity")).toHaveCount(0);
        await expect(focus(owner)).toHaveCount(0);
      },
    };
    const authoritative = {
      spec: "The authenticated commander sees only the authoritative allocation, with no recovered partial draft or retry command.",
      check: async () => {
        for (const page of [owner, peer]) {
          for (const name of names)
            await expect(points(page, name)).toHaveValue("25");
          await expect(button(page, "Apply focus")).toBeDisabled();
          await expect(button(page, "Retry same command")).toHaveCount(0);
          await rail(page);
        }
      },
    };
    const savedAccount = async (index: number) => {
      await login(owner, emails[index]);
      await expect(owner.getByLabel("Commander name")).toHaveValue(
        aliases[index],
      );
      // Deliberately do not save: this is an existing authoritative identity.
      await keyboard(owner, "Close");
      await owner.goto(url);
      await expect(button(owner, "Economy")).toBeVisible();
      expect(new URL(owner.url()).searchParams.get("campaign")).toBe(id);
      await expect(button(owner, "Save identity")).toHaveCount(0);
      await openFocus(owner);
    };
    await story.step("sign-out-original-commander", {
      actor: aliases[0],
      description:
        "Leave the campaign route and use keyboard Sign out. In-memory unsent allocation is cleared; no market order is sent.",
      action: signOut,
      acknowledgement: signedOut,
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
    const reusedPeerView = {
      page: owner,
      player: "Independent investor · reused browser",
      surface: "game" as const,
    };
    await story.step("reuse-browser-as-saved-peer", {
      actor: aliases[1],
      description:
        "Sign in as the other saved commander on the same browser and open Market focus without saving identity again.",
      action: async () => savedAccount(1),
      acknowledgement: authoritative,
      verifications: [unchanged],
      views: [reusedPeerView, peerView],
    });
    await story.step("edit-second-account-intent", {
      actor: aliases[1],
      description:
        "Enter a distinguishable incomplete allocation for the second account; the independent device keeps the authoritative allocation.",
      action: async () => {
        await points(owner, "Base").fill("");
        await points(owner, "Space station").fill("61");
      },
      acknowledgement: {
        spec: "Blank/61 belongs only to this unsent browser draft; Apply is disabled and the other device remains at25.",
        check: async () => {
          await expect(points(owner, "Base")).toHaveValue("");
          await expect(points(owner, "Space station")).toHaveValue("61");
          await expect(points(owner, "Market")).toHaveValue("25");
          await expect(points(owner, "Training camp")).toHaveValue("25");
          await expect(button(owner, "Apply focus")).toBeDisabled();
          for (const name of names)
            await expect(points(peer, name)).toHaveValue("25");
          await rail(owner);
        },
      },
      verifications: [unchanged],
      views: [reusedPeerView, peerView],
    });
    await story.step("sign-out-second-commander", {
      actor: aliases[1],
      description:
        "End the second account's ordinary browser session without submitting its partial allocation.",
      action: signOut,
      acknowledgement: signedOut,
      verifications: [unchanged],
      views: [reusedPeerView, peerView],
    });
    await story.step("return-to-original-saved-identity", {
      actor: aliases[0],
      description:
        "Return to the first saved commander without an identity resave. Neither account's unsent values return; accepted orders remain a separate authoritative recovery contract.",
      action: async () => savedAccount(0),
      acknowledgement: authoritative,
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
