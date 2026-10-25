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

test("Live research guidance follows the campaign capabilities without submitting choices", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "research-capability-guidance",
    title: "Read research effects before committing science",
    inventory: ["UX-06", "UX-14", "UX-16"],
    description:
      "Four saved commanders enter an authoritative development campaign. A commander reads all eight research choices through keyboard controls while another player's private state remains unchanged. Reading and choosing do not submit an order. Capability flags come from the real private projection. Fixed admission/catalogue clocks and developer entitlement are explicitly labelled harness controls; this is not hosted scheduling or full research-effect acceptance.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  const observedWrites = new Map<Page, string[]>();
  const emails = aliases.map(
    (_, i) =>
      `research-guidance-${info.project.name}-${Date.now()}-${i}@example.test`,
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
              .fill(`Scheduled story research guidance ${info.project.name}`);
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
      spec: "No research write or receipt occurs; the complete campaign, both private projections and saved identity remain unchanged.",
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
    const expected = {
      scanning:
        "Improves the chance of acquiring distant observations. Reports retain their recorded age; research does not reveal every system.",
      navigation:
        "Allows route legs up to 10 light years per level. Range does not change fleet speed.",
      terraforming:
        "Raises resource extraction and the capacity for each development type at your systems.",
      investing: "Raises total market income before distribution to systems.",
      formations:
        "Improves fighter effectiveness in orbital combat. Arrival reports record your forces and losses.",
      melee:
        "Improves infantry effectiveness in surface combat. Orbital and surface control remain separate.",
      recruiting: "Raises infantry production at each controlled surface.",
      innovation:
        "Raises total science output before allocation to the selected track.",
    };
    expect(beforeOwner.scanningEnabled).toBe(true);
    expect(beforeOwner.travelEnabled).toBe(true);
    expect(beforeOwner.productionEnabled).toBe(true);
    expect(beforeOwner.economy).not.toBeNull();
    // A campaign can construct before its first order creates a ledger.
    expect(beforeOwner.construction).toBeNull();
    await story.step("open-authoritative-science", {
      actor: aliases[0],
      description:
        "Open each commander's economy through keyboard controls and inspect the saved research target.",
      action: async () => {
        for (const page of [owner, peer]) await keyboard(page, "Economy");
      },
      acknowledgement: {
        spec: "Both private instruments show the authoritative navigation selection before any draft change.",
        check: async () => {
          for (const page of [owner, peer])
            await expect(
              research(page).getByRole("radio", { name: /^navigation/ }),
            ).toBeChecked();
        },
      },
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
    for (const [technology, explanation] of Object.entries(expected)) {
      await story.step(`read-${technology}`, {
        actor: aliases[0],
        description: `Use the keyboard to inspect ${technology}. Read the effect before choosing whether to queue; no research order is sent.`,
        action: async () => {
          const radio = research(owner).getByRole("radio", {
            name: new RegExp(`^${technology}`),
          });
          await radio.focus();
          await owner.keyboard.press("Space");
          // Check the actual selected control before scrolling to its explanation.
          await expect(radio).toBeFocused();
          expect(
            await radio.evaluate((element) => {
              const b = element.getBoundingClientRect();
              const top = document.elementFromPoint(
                b.x + b.width / 2,
                b.y + b.height / 2,
              );
              return element === top || element.contains(top);
            }),
          ).toBe(true);
        },
        acknowledgement: {
          spec: "The local selection acknowledges the chosen track and displays its capability-aware effect; the other commander's selection stays authoritative.",
          check: async () => {
            await expect(
              research(owner).getByRole("radio", {
                name: new RegExp(`^${technology}`),
              }),
            ).toBeChecked();
            await expect(research(owner).locator(".effect")).toHaveText(
              explanation,
            );
            await expect(
              research(peer).getByRole("radio", { name: /^navigation/ }),
            ).toBeChecked();
          },
        },
        verifications: [unchanged],
        views: [
          {
            ...ownerView,
            verifications: [
              {
                spec: "The complete selected explanation and queue control remain readable in the bounded research panel.",
                check: async () => {
                  const effect = research(owner).locator(".effect");
                  await effect.scrollIntoViewIfNeeded();
                  const action = button(owner, `Queue ${technology}`);
                  for (const target of [effect, action]) {
                    await expect(target).toBeVisible();
                    const box = await target.boundingBox();
                    expect(box!.y).toBeGreaterThanOrEqual(0);
                    expect(box!.y + box!.height).toBeLessThanOrEqual(
                      owner.viewportSize()!.height,
                    );
                    const painted = await target.evaluate((element) => {
                      const b = element.getBoundingClientRect();
                      const style = getComputedStyle(element);
                      const ring = element.matches(":focus-visible")
                        ? Math.max(
                            0,
                            parseFloat(style.outlineWidth) +
                              parseFloat(style.outlineOffset),
                          )
                        : 0;
                      let top = 0,
                        left = 0,
                        right = innerWidth,
                        bottom = innerHeight;
                      const ancestors = [];
                      for (
                        let parent = element.parentElement;
                        parent;
                        parent = parent.parentElement
                      ) {
                        const s = getComputedStyle(parent),
                          r = parent.getBoundingClientRect();
                        if (/auto|scroll|hidden|clip/.test(s.overflowY)) {
                          top = Math.max(top, r.top + parent.clientTop);
                          bottom = Math.min(
                            bottom,
                            r.top + parent.clientTop + parent.clientHeight,
                          );
                          ancestors.push({
                            className: parent.className,
                            top: r.top + parent.clientTop,
                            bottom:
                              r.top + parent.clientTop + parent.clientHeight,
                          });
                        }
                        if (/auto|scroll|hidden|clip/.test(s.overflowX)) {
                          left = Math.max(left, r.left + parent.clientLeft);
                          right = Math.min(
                            right,
                            r.left + parent.clientLeft + parent.clientWidth,
                          );
                        }
                      }
                      return {
                        control: {
                          top: b.top - ring,
                          left: b.left - ring,
                          right: b.right + ring,
                          bottom: b.bottom + ring,
                        },
                        clip: { top, left, right, bottom },
                        ancestors,
                      };
                    });
                    await info.attach(`research-${technology}-painted-bounds`, {
                      body: JSON.stringify(painted),
                      contentType: "application/json",
                    });
                    expect(painted.control.top).toBeGreaterThanOrEqual(
                      painted.clip.top,
                    );
                    expect(painted.control.bottom).toBeLessThanOrEqual(
                      painted.clip.bottom,
                    );
                    expect(painted.control.left).toBeGreaterThanOrEqual(
                      painted.clip.left,
                    );
                    expect(painted.control.right).toBeLessThanOrEqual(
                      painted.clip.right,
                    );
                  }
                },
              },
            ],
          },
        ],
      });
    }
    await story.step("close-without-order", {
      actor: aliases[0],
      description:
        "Close the instrument with Escape after reading. Research continues on the recorded target; inspecting a choice is not an acknowledged order.",
      action: async () => {
        await owner.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "Galaxy focus returns to Economy and the research instrument closes without changing the campaign.",
        check: async () => {
          await expect(button(owner, "Economy")).toBeFocused();
          await expect(research(owner)).toHaveCount(0);
        },
      },
      verifications: [unchanged],
      views: [ownerView, peerView],
    });
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
