import { createRequire } from "node:module";
import type { BrowserContext, Page } from "@playwright/test";
import type { Campaign, CampaignView } from "../../shared/campaign";
import {
  fleetContactView,
  type FleetContact,
} from "../../shared/fleet-contacts";
import { detectionProbability, drawRange } from "../../shared/observations";
import { distance } from "../../shared/galaxy";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import { admissionAt, scheduledAt } from "./story-helpers/admission-clock.mjs";
import { installContactEntropy } from "./story-helpers/contact-entropy.mjs";
import {
  contactInputs,
  contactPrefix,
} from "./story-helpers/contact-inputs.mjs";
const button = (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true });
const fleetPanel = (p: Page) =>
  p.getByRole("region", { name: "Fleet preparation", exact: true });
const contacts = (p: Page) =>
  p.getByRole("region", { name: "Fleet contacts", exact: true });
const selectedContact = (p: Page) =>
  contacts(p).getByRole("article", { name: "Selected fleet contact" });
const aliases = [
  "Fleet pathfinder",
  "Contact watcher",
  "Independent watcher",
  "Fourth envoy",
];

test("Live fleet contacts preserve acquired and last-seen private facts across reload", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-fleet-contacts",
    title: "Acquire and recover a fleet's last observed facts",
    inventory: ["UX-03", "UX-07", "UX-08", "UX-14", "UX-16"],
    description:
      "Four ordinary authenticated commanders admit through the UI. One forms a real fleet; another acquires and recovers last-seen intelligence while owner forces remain private. Catalogue/domain clocks and scan entropy identities are explicit harness controls, never injected reports. Development scanning and force rules remain under review; hosted scheduling, secure-provider and production entropy certification are separate gates.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let id = "",
    url = "",
    fleetId = "";
  const entropy = installContactEntropy();
  const require = createRequire(
    new URL("../../functions/package.json", import.meta.url),
  );
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const db = require("firebase-admin/firestore").getFirestore();
  const { provider, unwrap } = require("./lib/shared/crypto.js"),
    { context } = require("./lib/functions/src/campaigns.js"),
    { observationDraw } = require("./lib/functions/src/observation-random.js"),
    { settleCampaignTicks } = await import(
      new URL(
        "../../functions/lib/functions/src/production.js?illustrated-fleet-contacts",
        import.meta.url,
      ).href
    );
  const canonical = async (): Promise<Campaign> => {
    const h = await db.doc(`campaignStates/${id}`).get();
    return provider("mock").open(
      h.get("envelope"),
      h.get("canonicalKey"),
      context(id, h.get("revision"), "canonical", 1),
    );
  };
  const published = async (seat: number): Promise<CampaignView> => {
    const s = await canonical(),
      uid = s.seats[seat].uid,
      h = await db.doc(`campaignViews/${id}/members/${uid}`).get(),
      key = await db.doc(`campaignKeys/${id}/members/${uid}`).get(),
      ctx = context(id, h.get("revision"), `member:${uid}`, 1);
    return provider("mock").open(
      h.get("envelope"),
      await unwrap(h.get("grant"), key.get("kek"), uid, ctx, "mock"),
      ctx,
    );
  };
  const privacy = async () => {
    const s = await canonical();
    for (const seat of [0, 1, 2]) {
      const v = await published(seat);
      expect(v.fleetContacts).toEqual(fleetContactView(s, s.seats[seat].uid));
      expect(v).not.toHaveProperty("fleetScans");
      expect(v).not.toHaveProperty("seed");
      for (const report of v.fleetContacts ?? [])
        expect(Object.keys(report).sort()).toEqual(
          [
            "id",
            "number",
            "owner",
            "observedTick",
            "x",
            "y",
            "z",
            "fighters",
            "infantry",
          ].sort(),
        );
      if (seat) {
        expect(v.military.fleets).toEqual([]);
        expect(v.military.orders).toEqual([]);
        expect(v.military.ledger).toEqual([]);
        if (fleetId) expect(JSON.stringify(v)).not.toContain(fleetId);
        for (const order of s.military?.orders ?? [])
          expect(JSON.stringify(v)).not.toContain(order.id);
      }
    }
    expect(errors).toEqual([]);
  };
  async function rail(p: Page) {
    const back = button(
        p,
        p === pages[0] ? "Back to system" : "Back to galaxy",
      ),
      b = await back.boundingBox();
    expect(b).not.toBeNull();
    expect(b!.y).toBeGreaterThanOrEqual(0);
    expect(b!.y + b!.height).toBeLessThanOrEqual(p.viewportSize()!.height);
  }
  const views = () =>
    pages.slice(0, 2).map((page, i) => ({
      page,
      player: aliases[i],
      surface: "game" as const,
      primary: [button(page, i === 0 ? "Back to system" : "Back to galaxy")],
      verifications: [
        {
          spec: "Each return control stays visible before scrolling, contact annotations do not intercept the pointer, and neither player view has an application error.",
          check: async () => {
            await rail(page);
            expect(errors).toEqual([]);
            if (i === 1) {
              const interceptions = await page
                .locator(".contact-label")
                .evaluateAll((nodes) =>
                  nodes
                    .filter((node) => {
                      const b = node.getBoundingClientRect();
                      const hit = document.elementFromPoint(
                        b.x + b.width / 2,
                        b.y + b.height / 2,
                      );
                      return hit && node.parentElement?.contains(hit);
                    })
                    .map((node) => node.textContent),
                );
              expect(interceptions).toEqual([]);
            }
          },
        },
      ],
    }));
  const matchContact = async (
    p: Page,
    report: FleetContact,
    current: boolean,
  ) => {
    await expect(selectedContact(p)).toContainText(
      `${report.owner} · Fleet ${report.number}`,
    );
    await expect(selectedContact(p)).toContainText(
      `Observed tick ${report.observedTick}`,
    );
    await expect(selectedContact(p)).toContainText(
      current
        ? "Current tick observation"
        : "Last seen; current position unknown",
    );
    for (const [name, value] of [
      ["Fighters observed", String(report.fighters)],
      ["Infantry observed", String(report.infantry)],
      [
        "Observed coordinates (ly)",
        `${report.x.toFixed(2)}, ${report.y.toFixed(2)}, ${report.z.toFixed(2)}`,
      ],
    ])
      await expect(
        selectedContact(p)
          .locator("dt")
          .filter({ hasText: name })
          .locator("+ dd"),
      ).toHaveText(value);
    await expect(selectedContact(p)).toContainText(
      "Route and destination are private.",
    );
  };
  const readFacts = async (
    id: string,
    report: FleetContact,
    current: boolean,
  ) => {
    const p = pages[1],
      before = await canonical();
    const details = contacts(p).getByRole("region", {
      name: "Contact details",
      exact: true,
    });
    const caveat = selectedContact(p).getByText(
      "Route and destination are private.",
      { exact: true },
    );
    await story.step(id, {
      actor: aliases[1],
      description: current
        ? "Scroll the bounded contact details to read the complete acquired complement, coordinates and privacy explanation alongside its observed tick."
        : "Read the complete retained coordinates and complement beside the last-seen timestamp and explicit private-route explanation.",
      action: async () => {
        await rail(p);
        await details.focus();
        await caveat.scrollIntoViewIfNeeded();
      },
      acknowledgement: {
        spec: "The full report values, age and privacy explanation are visible together inside the bounded details panel.",
        check: async () => {
          await matchContact(p, report, current);
          const panel = await details.boundingBox();
          expect(panel).not.toBeNull();
          for (const item of [
            selectedContact(p).locator(".observed"),
            selectedContact(p).locator("dl"),
            caveat,
          ]) {
            await expect(item).toBeInViewport({ ratio: 1 });
            const b = await item.boundingBox();
            expect(b).not.toBeNull();
            expect(b!.y).toBeGreaterThanOrEqual(panel!.y);
            expect(b!.y + b!.height).toBeLessThanOrEqual(
              panel!.y + panel!.height,
            );
          }
        },
      },
      verifications: [
        {
          spec: "Reading and keyboard focus do not write a command, reveal private routes or change authoritative forces/history.",
          check: async () => {
            expect(await canonical()).toEqual(before);
            await privacy();
            await expect(details).toBeFocused();
          },
        },
      ],
      views: views(),
    });
  };
  try {
    for (let i = 0; i < 4; i++)
      await story.harness(
        `identity-${i + 1}`,
        "Ordinary emulator authentication and saved identity; explicit developer access and fixed domain Date. Timers remain real.",
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
          const p = await ctx.newPage();
          pages.push(p);
          p.on("pageerror", (e) => errors.push(e.message));
          const email = `contact-story-${info.project.name}-${i}-${Date.now()}@example.test`;
          await login(p, email);
          await p.getByLabel("Commander name").fill(aliases[i]);
          await button(p, "Save identity").click();
          await expect(p.getByRole("status")).toContainText("Identity saved");
          await grantDeveloper(email);
          await button(p, "Close").click();
          await button(p, "Play").click();
          await p.clock.setFixedTime(admissionAt);
        },
      );
    for (let i = 0; i < 4; i++)
      await story.harness(
        `admit-${i + 1}`,
        "Create/join through production controls. The catalogue seed and admission clock are test boundaries, not injected seats or campaign state.",
        async () => {
          const p = pages[i];
          if (!i) {
            await button(p, "Create campaign").click();
            await p
              .getByLabel("Campaign name")
              .fill(`${contactPrefix}${info.project.name}`);
            await button(p, "Create galaxy").click();
            await expect(
              p.getByRole("heading", {
                name: "Choose your faction",
                exact: true,
              }),
            ).toBeVisible();
            url = p.url();
            id = new URL(url).searchParams.get("campaign")!;
          } else await p.goto(url);
          await p
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
          await button(p, "Claim your seat").click();
          await expect(
            p.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
        },
      );
    await story.harness(
      "scheduler-delivery",
      "Set the explicit admission domain clock and deliver the real emulator Scheduler HTTP request; this does not certify hosted scheduling.",
      async () => {
        for (const p of pages) await p.clock.setFixedTime(scheduledAt);
        const response = await request.post(
          "http://127.0.0.1:15001/demo-clusterii/us-central1/startScheduledCampaigns-0",
          {
            headers: {
              "X-CloudScheduler-JobName": "emulator-contact-story",
              "X-CloudScheduler-ScheduleTime": new Date(
                scheduledAt,
              ).toISOString(),
            },
          },
        );
        expect(response.ok()).toBe(true);
        expect((await canonical()).phase).toBe("active");
        for (const p of pages)
          await expect(
            p.getByText(
              "Contact markers show acquired positions from loaded records.",
              { exact: true },
            ),
          ).toBeVisible();
      },
    );
    const owner = pages[0],
      observer = pages[1],
      initial = await canonical(),
      uid = initial.seats[0].uid;
    const total = (s: Campaign) => ({
      fighters:
        Object.values(s.systems)
          .filter((v) => v.orbit === uid)
          .reduce((n, v) => n + v.fighters, 0) +
        Object.values(s.military?.fleets ?? {})
          .filter((f) => f.uid === uid)
          .reduce((n, f) => n + f.fighters, 0),
      infantry:
        Object.values(s.systems)
          .filter((v) => v.surface === uid)
          .reduce((n, v) => n + v.infantry, 0) +
        Object.values(s.military?.fleets ?? {})
          .filter((f) => f.uid === uid)
          .reduce((n, f) => n + f.infantry, 0),
    });
    const advanceTo = async (tick: number) => {
      let before = await canonical();
      while (before.economy!.tick < tick) {
        const nextTick = before.economy!.tick + 1,
          at = scheduledAt + nextTick * 900000;
        for (const p of pages) await p.clock.setFixedTime(at);
        expect(await settleCampaignTicks(id, () => at)).toBe(1);
        const after = await canonical(),
          output = after.economy!.ledger[uid];
        expect(total(after)).toEqual({
          fighters: total(before).fighters + output.fighters,
          infantry: total(before).infantry + output.infantry,
        });
        expect(Object.values(after.military!.fleets)).toHaveLength(1);
        expect(Object.values(after.military!.fleets)[0]).toMatchObject({
          uid,
          fighters: 4,
          infantry: 6,
        });
        expect(await settleCampaignTicks(id, () => at)).toBe(0);
        expect(await canonical()).toEqual(after);
        before = after;
      }
    };
    await story.step("inspect-empty-contact-history", {
      actor: aliases[1],
      description:
        "The owner opens fleet preparation while the observer checks their own contact records before any fleet exists.",
      action: async () => {
        await owner
          .getByRole("complementary", { name: "Selected system" })
          .getByRole("button", { name: "Fleets · 0", exact: true })
          .click();
        await button(observer, "Fleet contacts").focus();
        await button(observer, "Fleet contacts").press("Enter");
      },
      acknowledgement: {
        spec: "Authorized contact history is loaded and contains no fleet contact.",
        check: async () =>
          expect(
            contacts(observer).getByText(
              "No fleet contacts in the records loaded.",
              { exact: true },
            ),
          ).toBeVisible(),
      },
      verifications: [
        {
          spec: "Each commander has only their own military view and no invented contact.",
          check: privacy,
        },
      ],
      views: views(),
    });
    await story.step("commit-real-fleet", {
      actor: aliases[0],
      description:
        "Reserve four fighters and six infantry through the real encrypted formation command; the observer receives no private order.",
      action: async () => {
        await fleetPanel(owner)
          .getByLabel("Fighters", { exact: true })
          .fill("4");
        await fleetPanel(owner)
          .getByLabel("Infantry", { exact: true })
          .fill("6");
        await button(owner, "Form fleet").click();
      },
      acknowledgement: {
        spec: "The authoritative accepted fleet order records exactly four fighters and six infantry.",
        check: async () =>
          expect(
            fleetPanel(owner).getByRole("region", {
              name: "Accepted fleet orders",
            }),
          ).toContainText("4 fighters · 6 infantry"),
      },
      verifications: [
        {
          spec: "Reservation changes no total forces and no observer receives the private order or a fabricated fleet.",
          check: async () => {
            const s = await canonical();
            expect(total(s)).toEqual(total(initial));
            expect(Object.values(s.military!.fleets)).toEqual([]);
            await privacy();
          },
        },
      ],
      views: views(),
    });
    await story.harness(
      "settle-real-formation",
      "Deliver the first real leased tick using the explicit domain clock; verify formation/production conservation and a repeat delivery with no effect. Scan HMAC identity inputs are fixed only in the guarded test service module.",
      async () => {
        await advanceTo(1);
        fleetId = Object.keys((await canonical()).military!.fleets)[0];
      },
    );
    const formed = await canonical(),
      fleet = formed.military!.fleets[fleetId],
      observerUid = formed.seats[1].uid,
      source = formed.galaxy.stars.find((s) => s.id === formed.seats[1].home)!,
      target = formed.galaxy.stars.find((s) => s.id === fleet.starId)!;
    const contactId = `${formed.seats.findIndex((s) => s.uid === fleet.uid)}:${fleet.number}`;
    expect(
      (await published(0)).military.fleets.find((f) => f.id === fleetId)
        ?.number,
    ).toBe(fleet.number);
    const probability = detectionProbability(1, distance(source, target));
    const hit = (tick: number) =>
      observationDraw(
        ...contactInputs(
          formed,
          { ...formed, economy: { ...formed.economy!, tick } },
          id,
          observerUid,
          `fleet:${fleetId}`,
          tick,
        ),
      ) /
        drawRange <
      probability;
    const acquiredTick = Array.from({ length: 94 }, (_, i) => i + 2).find(hit)!;
    expect(acquiredTick).toBeDefined();
    await story.harness(
      "acquire-observation",
      "Advance real ticks to the deterministic fixture's next acquired contact. This explicit scan/clock harness is not a player action or production entropy certification; every tick checks conservation and repeat delivery.",
      async () => advanceTo(acquiredTick),
    );
    const acquired = (await published(1)).fleetContacts!.find(
      (c) => c.id === contactId,
    )!;
    expect(acquired).toBeTruthy();
    await story.step("read-current-contact", {
      actor: aliases[1],
      description:
        "Read acquired fleet facts and the private owner manifest as separate player viewpoints.",
      action: async () => {
        await fleetPanel(owner)
          .getByRole("button", { name: `Fleet ${fleet.number}`, exact: true })
          .click();
        await contacts(observer)
          .getByRole("region", { name: "Contact details", exact: true })
          .focus();
      },
      acknowledgement: {
        spec: "The observer's report is current at the actual acquired tick; the owner has exactly one formed fleet.",
        check: async () => {
          await matchContact(observer, acquired, true);
          await expect(
            fleetPanel(owner).getByRole("heading", {
              name: `Fleet ${fleet.number}`,
              exact: true,
            }),
          ).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "The contact contains only authorized observed fields, with no route, destination, owner command or private fleet identity; owner forces remain conserved.",
          check: privacy,
        },
      ],
      views: views(),
    });
    await readFacts("read-current-coordinates", acquired, true);
    const missedTick = Array.from(
      { length: 94 },
      (_, i) => i + acquiredTick + 1,
    ).find((t) => !hit(t))!;
    expect(missedTick).toBeDefined();
    let retained: FleetContact;
    await story.harness(
      "miss-next-scan",
      "Deliver actual ticks to the next deterministic missed scan, retaining the last acquired authorized report for comparison. A missed roll is produced by the real HMAC/probability check, never an injected outcome.",
      async () => {
        await advanceTo(missedTick - 1);
        retained = (await published(1)).fleetContacts!.find(
          (c) => c.id === contactId,
        )!;
        expect(retained).toBeTruthy();
        await advanceTo(missedTick);
      },
    );
    await story.step("recover-last-seen-record", {
      actor: aliases[1],
      description:
        "Refresh authorized contact history and distinguish last-seen facts from current position, without inferring destruction or a private route.",
      action: async () => {
        await button(observer, "Refresh observations").focus();
        await button(observer, "Refresh observations").press("Enter");
      },
      acknowledgement: {
        spec: "The loaded last-seen record retains its actual observed tick, coordinates and complement while current position is unknown.",
        check: async () => matchContact(observer, retained!, false),
      },
      verifications: [
        {
          spec: "The current private projection has no acquired contact at the missed tick, while the owner still has the same real fleet and forces.",
          check: async () => {
            expect((await published(1)).fleetContacts).toEqual([]);
            expect((await canonical()).military!.fleets[fleetId]).toEqual(
              fleet,
            );
            await privacy();
          },
        },
      ],
      views: views(),
    });
    await readFacts("read-retained-coordinates", retained!, false);
    const beforeReload = await canonical();
    await story.step("reload-private-contact-history", {
      actor: aliases[1],
      description:
        "Reload both accounts and use ordinary controls to recover the owner's fleet and the observer's last-seen history.",
      action: async () => {
        await owner.reload();
        await owner
          .getByRole("complementary", { name: "Selected system" })
          .getByRole("button", { name: "Fleets · 1", exact: true })
          .click();
        await fleetPanel(owner)
          .getByRole("button", { name: `Fleet ${fleet.number}`, exact: true })
          .click();
        await observer.reload();
        await button(observer, "Fleet contacts").focus();
        await button(observer, "Fleet contacts").press("Enter");
      },
      acknowledgement: {
        spec: "The original last-seen report survives loss of in-memory contact state and the owner recovers the same fleet.",
        check: async () => matchContact(observer, retained!, false),
      },
      verifications: [
        {
          spec: "Reload writes no new command, changes no canonical forces/history, and respects every recipient projection.",
          check: async () => {
            expect(await canonical()).toEqual(beforeReload);
            await privacy();
          },
        },
      ],
      views: views(),
    });
    await story.step("return-to-chart-by-keyboard", {
      actor: aliases[1],
      description:
        "Close the contact instrument with Escape and retain keyboard focus on Fleet contacts in the real galaxy.",
      action: async () => {
        await observer.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "Focus returns to Fleet contacts and the instrument closes.",
        check: async () => {
          await expect(button(observer, "Fleet contacts")).toBeFocused();
          await expect(contacts(observer)).toHaveCount(0);
        },
      },
      verifications: [
        {
          spec: "Closing the instrument preserves authoritative history and forces.",
          check: async () => {
            expect(await canonical()).toEqual(beforeReload);
            await privacy();
          },
        },
      ],
      views: [
        {
          page: observer,
          player: aliases[1],
          surface: "game",
          primary: [button(observer, "Fleet contacts")],
        },
      ],
    });
  } finally {
    for (const ctx of contexts) await ctx.close();
    entropy.deregister();
  }
});
