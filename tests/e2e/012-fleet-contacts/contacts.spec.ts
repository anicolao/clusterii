import { expectReadingTarget } from "../../browser/story-helpers/reading-target";
import { openForces, openGalaxyCommand } from "../../browser/galaxy-navigation";
import { createRequire } from "node:module";
import type { BrowserContext, Page } from "@playwright/test";
import type { Campaign, CampaignView } from "../../../shared/campaign";
import {
  fleetContactView,
  type FleetContact,
} from "../../../shared/fleet-contacts";
import { detectionProbability, drawRange } from "../../../shared/observations";
import { distance } from "../../../shared/galaxy";
import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { login, grantDeveloper } from "../../browser/helpers";
import {
  admissionAt,
  scheduledAt,
} from "../../browser/story-helpers/admission-clock.mjs";
import { installContactEntropy } from "../../browser/story-helpers/contact-entropy.mjs";
import {
  contactInputs,
  contactPrefix,
} from "../../browser/story-helpers/contact-inputs.mjs";
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
    new URL("../../../functions/package.json", import.meta.url),
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
        "../../../functions/lib/functions/src/production.js?illustrated-fleet-contacts",
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
        if (!v.military)
          throw new Error("Expected authorized military projection");
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
              const header = await page.locator(".command-rail").boundingBox();
              const panel = await page
                .getByRole("dialog", {
                  name: "Fleet contacts panel",
                  exact: true,
                })
                .boundingBox();
              expect(header).not.toBeNull();
              expect(panel).not.toBeNull();
              expect(panel!.y).toBeGreaterThanOrEqual(
                header!.y + header!.height,
              );
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
    const observed = selectedContact(p).locator(".observed");
    for (const part of [
      {
        suffix: "age",
        target: observed,
        items: [observed],
        description: current
          ? "Read the acquired report's tick and current-observation status."
          : "Read the retained report's tick and explicit warning that its current position is unknown.",
      },
      {
        suffix: "facts",
        target: caveat,
        items: [selectedContact(p).locator("dl"), caveat],
        description:
          "Scroll the bounded contact details to read the complete complement, coordinates and private-route explanation.",
      },
    ])
      await story.step(`${id}-${part.suffix}`, {
        actor: aliases[1],
        description: part.description,
        action: async () => {
          await rail(p);
          await details.focus();
          await part.target.scrollIntoViewIfNeeded();
        },
        acknowledgement: {
          spec: `The report ${part.suffix} is fully visible inside the bounded details panel.`,
          check: async () => {
            await matchContact(p, report, current);
            const panel = await details.boundingBox();
            expect(panel).not.toBeNull();
            for (const item of part.items) {
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
        await openForces(owner, 0);
        await openGalaxyCommand(observer, "Fleet contacts", true);
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
    const ownerMilitary = (await published(0)).military;
    if (!ownerMilitary) throw new Error("Expected owner military projection");
    expect(ownerMilitary.fleets.find((f) => f.id === fleetId)?.number).toBe(
      fleet.number,
    );
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
    const beforeContactResize = await canonical();
    await story.step("select-and-resize-contact", {
      actor: aliases[1],
      description:
        "Select the acquired fleet by keyboard, resize its real contact instrument across compact/wide layouts, and return to the original reading size.",
      action: async () => {
        const control = contacts(observer)
          .getByRole("group", { name: "Observed fleets", exact: true })
          .getByRole("button", {
            name: new RegExp(acquired.owner + " · Fleet " + acquired.number),
          });
        await control.focus();
        await control.press("Enter");
        await expect(control).toHaveAttribute("aria-pressed", "true");
        const original = observer.viewportSize()!;
        try {
          await observer.setViewportSize(
            original.width < 760
              ? { width: 1024, height: 768 }
              : { width: 393, height: 852 },
          );
          const canvas = contacts(observer).locator("canvas");
          await expect(canvas).toBeInViewport({ ratio: 1 });
          const box = await canvas.boundingBox();
          expect(box!.width).toBeGreaterThan(0);
          expect(box!.height).toBeGreaterThan(0);
          await rail(observer);
          await matchContact(observer, acquired, true);
        } finally {
          await observer.setViewportSize(original);
        }
        // Re-enter the selected control through ordinary keyboard traversal.
        await control.press("Shift+Tab");
        await observer.keyboard.press("Tab");
        await expect(control).toBeFocused();
        await expectReadingTarget(control);
        await expect
          .poll(() =>
            control.evaluate((element) => {
              const style = getComputedStyle(element),
                box = element.getBoundingClientRect();
              const details = element.closest(
                '[aria-label="Contact details"]',
              )!;
              const clip = details.getBoundingClientRect();
              const paint =
                style.outlineStyle === "none"
                  ? 0
                  : Math.max(
                      0,
                      parseFloat(style.outlineWidth) +
                        parseFloat(style.outlineOffset),
                    );
              return (
                box.top - paint >= clip.top + details.clientTop &&
                box.bottom + paint <=
                  clip.top + details.clientTop + details.clientHeight
              );
            }),
          )
          .toBe(true);
      },
      acknowledgement: {
        spec: "The same acquired report and its positive-sized canvas survive resizing with no render error or authoritative mutation.",
        check: async () => {
          await matchContact(observer, acquired, true);
          await expect(contacts(observer).locator("canvas")).toBeInViewport({
            ratio: 1,
          });
          expect(errors).toEqual([]);
          expect(await canonical()).toEqual(beforeContactResize);
        },
      },
      verifications: [
        {
          spec: "Existing authorized projection and force conservation remain unchanged.",
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
        check: async () => {
          // The retained observed tick can already match before the refresh
          // response arrives. Wait for the actual loaded head, not old facts.
          await expect(button(observer, "Refresh observations")).toHaveCount(0);
          await expect(
            contacts(observer).getByText(
              "Loading authorized contact records…",
              {
                exact: true,
              },
            ),
          ).toHaveCount(0);
          await expect(contacts(observer).getByRole("alert")).toHaveCount(0);
          await matchContact(observer, retained!, false);
        },
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
        await openForces(owner, 1);
        await fleetPanel(owner)
          .getByRole("button", { name: `Fleet ${fleet.number}`, exact: true })
          .click();
        await observer.reload();
        await openGalaxyCommand(observer, "Fleet contacts", true);
      },
      acknowledgement: {
        spec: "The original last-seen report survives loss of in-memory contact state and the owner recovers the same fleet.",
        check: async () => {
          // The retained observed tick can already match before the refresh
          // response arrives. Wait for the actual loaded head, not old facts.
          await expect(button(observer, "Refresh observations")).toHaveCount(0);
          await expect(
            contacts(observer).getByText(
              "Loading authorized contact records…",
              {
                exact: true,
              },
            ),
          ).toHaveCount(0);
          await expect(contacts(observer).getByRole("alert")).toHaveCount(0);
          await matchContact(observer, retained!, false);
        },
      },
      verifications: [
        {
          spec: "Reload and normal/reduced-motion preferences preserve report facts, every recipient projection and authoritative forces/history without writing commands.",
          check: async () => {
            await observer.emulateMedia({ reducedMotion: "no-preference" });
            await matchContact(observer, retained!, false);
            await rail(observer);
            expect(await canonical()).toEqual(beforeReload);
            await privacy();
            await observer.emulateMedia({ reducedMotion: "reduce" });
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
    await story.step("review-galaxy-overview", {
      actor: aliases[1],
      description:
        "Open the real systems list by keyboard, request the catalogue overview, and close it without changing the retained contact or campaign.",
      action: async () => {
        await openGalaxyCommand(observer, "Systems list", true);
        const overview = observer
          .getByRole("dialog", { name: "Systems list", exact: true })
          .getByRole("button", { name: "Overview", exact: true });
        await overview.focus();
        await overview.press("Enter");
      },
      acknowledgement: {
        spec: "Overview returns keyboard focus to the systems opener, with a visible chart and no render error.",
        check: async () => {
          await expect(button(observer, "Systems list")).toBeFocused();
          await expect(
            observer.getByRole("dialog", { name: "Systems list", exact: true }),
          ).toHaveCount(0);
          await expect(observer.locator(".chart canvas")).toBeInViewport({
            ratio: 1,
          });
          expect(errors).toEqual([]);
          expect(await canonical()).toEqual(beforeReload);
          const label = observer.locator("[data-selected-label]");
          await expectReadingTarget(label, false);
          await expect
            .poll(() =>
              label.evaluate((el) => {
                const box = el.getBoundingClientRect();
                const anchor =
                  el.parentElement!.parentElement!.getBoundingClientRect();
                const radius = Number(el.getAttribute("data-marker-radius"));
                return (
                  box.bottom <= anchor.y - radius - 5.5 ||
                  box.top >= anchor.y + radius + 5.5 ||
                  box.right <= anchor.x - radius - 5.5 ||
                  box.left >= anchor.x + radius + 5.5
                );
              }),
            )
            .toBe(true);
          if (info.project.name === "phone") {
            await expect(button(observer, "More")).toHaveAttribute(
              "aria-expanded",
              "false",
            );
            await expectReadingTarget(
              observer
                .getByRole("complementary", { name: "Selected system" })
                .getByRole("button", { name: "Inspect system", exact: true }),
            );
          }
        },
      },
      verifications: [
        {
          spec: "The catalogue camera action preserves private observations and forces.",
          check: privacy,
        },
      ],
      views: [
        {
          page: observer,
          player: aliases[1],
          surface: "game",
          primary: [button(observer, "Systems list")],
        },
      ],
    });
  } finally {
    for (const ctx of contexts) await ctx.close();
    entropy.deregister();
  }
});
