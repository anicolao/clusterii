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
const inspector = (page: Page) =>
  page.getByRole("complementary", { name: "Selected system" });
const aliases = ["Menu envoy", "Ledger witness", "Outer envoy", "Fourth envoy"];

test("Live galaxy menu preserves selection and unsent allocation across a confirmed tick", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-menu-preservation",
    title: "Read Rules while the campaign advances without losing intent",
    inventory: ["UX-02", "UX-06", "UX-14", "UX-15", "UX-16"],
    description:
      "Four ordinary authenticated commanders start a real development campaign. The owner retains a selected system and unsent partial market allocation while reading Rules; a peer visibly acknowledges one real leased tick. Fixed catalogue/admission time, developer entitlement and one tick delivery are labelled harness controls, not fabricated state or hosted scheduling evidence. Only public rendered labels and systems-list access are used to inspect lower detail; this does not certify every canvas primitive or GPU performance.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  const runId = Date.now();
  const emails = aliases.map(
    (_, i) =>
      `menu-preservation-${info.project.name}-${runId}-${i}@example.test`,
  );
  let id = "",
    url = "";
  const require = createRequire(
    new URL("../../functions/package.json", import.meta.url),
  );
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBe("127.0.0.1:18080");
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const db = require("firebase-admin/firestore").getFirestore();
  const { provider, unwrap } = require("./lib/shared/crypto.js");
  const { context } = require("./lib/functions/src/campaigns.js");
  const { settleCampaignTicks } = require("./lib/functions/src/production.js");
  // Read-only service corroboration; never used to inject state or simulate UI outcomes.
  const canonical = async (): Promise<Campaign> => {
    const h = await db.doc(`campaignStates/${id}`).get();
    return provider("mock").open(
      h.get("envelope"),
      h.get("canonicalKey"),
      context(id, h.get("revision"), "canonical", 1),
    );
  };
  const published = async (uid: string): Promise<CampaignView> => {
    const h = await db.doc(`campaignViews/${id}/members/${uid}`).get(),
      k = await db.doc(`campaignKeys/${id}/members/${uid}`).get();
    const ctx = context(id, h.get("revision"), `member:${uid}`, 1);
    return provider("mock").open(
      h.get("envelope"),
      await unwrap(h.get("grant"), k.get("kek"), uid, ctx, "mock"),
      ctx,
    );
  };
  const receipts = async (uid: string) =>
    (await db.collection(`campaignReceipts/${uid}/results`).get()).docs
      .map((d: { id: string }) => d.id)
      .sort();
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
              .fill(`Scheduled story menu preservation ${info.project.name}`);
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
    const initial = await canonical();
    const auth = require("firebase-admin/auth").getAuth();
    const actors: { uid: string }[] = await Promise.all(
      emails.map((email) => auth.getUserByEmail(email)),
    );
    expect(new Set(actors.map((actor) => actor.uid)).size).toBe(4);
    for (const [index, actor] of actors.entries()) {
      const seat = initial.seats.find((seat) => seat.uid === actor.uid);
      expect(seat).toBeDefined();
      expect(seat!.profile.alias).toBe(aliases[index]);
    }
    const uid = actors[0].uid,
      peerUid = actors[1].uid;
    const beforeReceipts = await receipts(uid),
      ownerBefore = await published(uid),
      peerBefore = await published(peerUid);
    const dialog = owner.getByRole("dialog", { name: "Game menu" });
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
    const selectedName = (
      await inspector(owner).getByRole("heading").innerText()
    ).trim();
    const labels = () =>
      owner
        .locator(
          "[data-galaxy-viewport] .star-label, [data-galaxy-viewport] .quiet-label",
        )
        .allTextContents();
    let originalLabels: string[] = [];
    const noOrder = {
      spec: "Local reading and unsent edits leave owner receipt IDs and confirmed market allocations unchanged; this is not foreign-read denial or privacy acceptance.",
      check: async () => {
        expect(await receipts(uid)).toEqual(beforeReceipts);
        expect((await canonical()).economy!.marketFocus).toEqual(
          initial.economy!.marketFocus,
        );
        expect(errors).toEqual([]);
      },
    };
    await story.step("select-and-draft", {
      actor: aliases[0],
      description:
        "Use the textual systems list to select the same named home, then enter an incomplete market allocation without applying it.",
      action: async () => {
        await keyboard(owner, "Systems list");
        await owner.getByLabel("Find a system").fill(selectedName);
        await owner
          .getByRole("button", { name: new RegExp(`^Select ${selectedName},`) })
          .focus();
        await owner.keyboard.press("Enter");
        await expect(inspector(owner).getByRole("heading")).toHaveText(
          selectedName,
        );
        originalLabels = await labels();
        expect(originalLabels.length).toBeGreaterThan(0);
        await openFocus(owner);
        await points(owner, "Market").fill("");
        await points(owner, "Training camp").fill("73");
        await keyboard(peer, "Economy");
      },
      acknowledgement: {
        spec: "The partial allocation is still unsent and Apply focus is disabled.",
        check: async () => {
          await expect(points(owner, "Market")).toHaveValue("");
          await expect(points(owner, "Training camp")).toHaveValue("73");
          await expect(button(owner, "Apply focus")).toBeDisabled();
        },
      },
      verifications: [
        noOrder,
        {
          spec: "Editing alone leaves the complete canonical campaign and both authorized projections unchanged.",
          check: async () => {
            expect(await canonical()).toEqual(initial);
            expect(await published(uid)).toEqual(ownerBefore);
            expect(await published(peerUid)).toEqual(peerBefore);
          },
        },
      ],
      views: [ownerView, peerView],
    });
    await story.step("read-menu-rules", {
      actor: aliases[0],
      description:
        "Close only the economy views, enable lower detail in the real menu and open the shared market rules while the draft stays unsent.",
      action: async () => {
        await keyboard(owner, "Back to economy");
        await keyboard(owner, "Return to galaxy");
        await expect(inspector(owner).getByRole("heading")).toHaveText(
          selectedName,
        );
        await keyboard(owner, "Menu");
        const detail = dialog.getByRole("checkbox", {
          name: "Lower galaxy detail",
          exact: true,
        });
        await detail.focus();
        await owner.keyboard.press("Space");
        await expect(detail).toBeChecked();
        await expect(
          dialog
            .getByRole("status")
            .filter({ hasText: "Lower galaxy detail is on." }),
        ).toBeVisible();
        await keyboard(owner, "Rules");
        await dialog.locator("summary").focus();
        await owner.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The single shared Rules dialog acknowledges the local preference and displays proposed-policy disclosure.",
        check: async () => {
          await expect(owner.locator("dialog[open]")).toHaveCount(1);
          await expect(dialog.locator("details")).toHaveAttribute("open", "");
          await expect(dialog).toContainText(
            "Market dividend rules remain under review.",
          );
        },
      },
      verifications: [
        noOrder,
        {
          spec: "Lower detail preserves exposed factual star labels and campaign authority.",
          check: async () => {
            await expect.poll(labels).toEqual(originalLabels);
            expect(await canonical()).toEqual(initial);
          },
        },
      ],
      views: [
        {
          ...ownerView,
          primary: [
            button(owner, "Back to menu"),
            button(owner, "Return to game"),
          ],
        },
      ],
    });
    await story.harness(
      "one-leased-tick-with-menu-open",
      "Explicit demo domain-clock delivery calls the real leased settlement service once at the first due tick, then replays the same delivery. No resources, ledger, ownership, receipts or views are injected. This is not hosted scheduling evidence.",
      async () => {
        await expect(dialog).toBeVisible();
        const due = initial.economy!.nextTickAt;
        for (const page of pages) await page.clock.setFixedTime(due + 1);
        expect(await settleCampaignTicks(id, () => due)).toBe(1);
        expect(await settleCampaignTicks(id, () => due)).toBe(0);
        await expect
          .poll(async () => (await canonical()).economy!.tick)
          .toBe(1);
        await expect
          .poll(async () => (await published(uid)).production?.tick)
          .toBe(1);
      },
    );
    const settled = await canonical();
    await story.step("acknowledge-while-reading", {
      actor: aliases[1],
      description:
        "The independent commander reads the confirmed ledger while the owner's Rules dialog remains open.",
      action: async () => {
        await peer.getByRole("region", { name: "Production ledger" }).focus();
      },
      acknowledgement: {
        spec: "The actual peer UI acknowledges Confirmed tick1; the owner's dialog remains open without replacing its reading focus.",
        check: async () => {
          await expect(
            peer.getByText("Confirmed tick 1", { exact: true }),
          ).toBeVisible();
          await expect(dialog).toBeVisible();
          await expect(dialog.locator("summary")).toBeFocused();
        },
      },
      verifications: [
        noOrder,
        {
          spec: "Settlement advances exactly one revision/tick; owner and peer receive their own authorized ledger, with no allocation command.",
          check: async () => {
            expect(settled.revision).toBe(initial.revision + 1);
            expect(settled.economy!.tick).toBe(1);
            expect((await published(uid)).empire).toEqual(settled.empires[uid]);
            expect((await published(uid)).economy!.ledger).toEqual(
              settled.economy!.ledger[uid],
            );
            expect((await published(peerUid)).economy!.ledger).toEqual(
              settled.economy!.ledger[peerUid],
            );
            expect((await published(peerUid)).empire).toEqual(
              settled.empires[peerUid],
            );
          },
        },
      ],
      views: [ownerView, peerView],
    });
    await story.step("return-to-updated-galaxy", {
      actor: aliases[0],
      description:
        "Return to the same galaxy and reach the selected system through textual controls in lower detail.",
      action: async () => {
        await keyboard(owner, "Return to game");
        await expect(button(owner, "Menu")).toBeFocused();
        await expect(inspector(owner).getByRole("heading")).toHaveText(
          selectedName,
        );
        await expect.poll(labels).toEqual(originalLabels);
        await keyboard(owner, "Systems list");
        await owner.getByLabel("Find a system").fill(selectedName);
        const select = owner.getByRole("button", {
          name: new RegExp(`^Select ${selectedName},`),
        });
        await expect(select).toBeEnabled();
        await select.focus();
        await owner.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The selected system remains named and reachable through the real systems list after the tick.",
        check: async () => {
          await expect(inspector(owner).getByRole("heading")).toHaveText(
            selectedName,
          );
          await expect.poll(labels).toEqual(originalLabels);
        },
      },
      verifications: [
        noOrder,
        {
          spec: "Lower-detail navigation leaves settled campaign state unchanged.",
          check: async () => {
            expect(await canonical()).toEqual(settled);
          },
        },
      ],
      views: [ownerView, peerView],
    });
    await story.step("recover-unsent-allocation", {
      actor: aliases[0],
      description:
        "Read confirmed production, then reopen the original incomplete allocation without sending it.",
      action: async () => {
        await keyboard(owner, "Economy");
        await expect(
          owner.getByText("Confirmed tick 1", { exact: true }),
        ).toBeVisible();
        await keyboard(owner, "Market focus");
      },
      acknowledgement: {
        spec: "The same partial draft is restored while the authoritative allocation remains unchanged and uncommitted.",
        check: async () => {
          await expect(points(owner, "Market")).toHaveValue("");
          await expect(points(owner, "Training camp")).toHaveValue("73");
          await expect(button(owner, "Apply focus")).toBeDisabled();
        },
      },
      verifications: [
        noOrder,
        {
          spec: "Navigation after settlement issues no command and does not mutate either player's canonical state.",
          check: async () => {
            expect(await canonical()).toEqual(settled);
          },
        },
      ],
      views: [ownerView, peerView],
    });
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
