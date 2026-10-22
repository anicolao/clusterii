import { createRequire } from "node:module";
import type { Page, BrowserContext } from "@playwright/test";
import type { Campaign, CampaignView } from "../../shared/campaign";
import { observationView } from "../../shared/observations";
import { distance } from "../../shared/galaxy";
import { test, expect } from "./story-helpers/fixtures";
import { readableLabels, labelGeometry } from "./story-helpers/galaxy-labels";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import { admissionAt, scheduledAt } from "./story-helpers/admission-clock.mjs";
import { installObservationEntropy } from "./story-helpers/observation-entropy.mjs";
import { observationPrefix } from "./story-helpers/observation-inputs.mjs";
const button = (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true });
const inspector = (p: Page) =>
  p.getByRole("complementary", { name: "Selected system" });
const observation = (p: Page) =>
  inspector(p).getByRole("region", { name: "Stellar observation" });
const age = (p: Page) =>
  observation(p).getByRole("status", { name: "Observation age" });
const details = (p: Page) =>
  inspector(p).getByRole("region", { name: "System details" });
const aliases = [
  "Survey envoy",
  "Independent surveyor",
  "Outer surveyor",
  "Fourth envoy",
];
async function pinned(p: Page) {
  const viewport = p.viewportSize()!;
  const tab = await button(p, "Observation").boundingBox(),
    box = await age(p).boundingBox(),
    bounds = await details(p).boundingBox();
  expect(tab).not.toBeNull();
  expect(box).not.toBeNull();
  expect(bounds).not.toBeNull();
  expect(tab!.y).toBeGreaterThanOrEqual(0);
  expect(tab!.y + tab!.height).toBeLessThanOrEqual(viewport.height);
  expect(box!.y).toBeGreaterThanOrEqual(bounds!.y - 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
  expect(bounds!.height).toBeGreaterThanOrEqual(box!.height * 2);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
}
test("Live stellar observations retain private current and historical facts after reload", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "live-stellar-observations",
    title: "Read unknown, current and historical stellar intelligence",
    inventory: ["UX-03", "UX-07", "UX-14", "UX-16"],
    description:
      "Four independent commanders enter through authenticated controls. Actual leased ticks acquire private observations; a missed scan retains historical facts. Fixed catalogue, domain clocks and scan entropy identities are explicit harness controls, not injected reports. Development scanning rules remain under review. Managed encryption, random-map fairness and hosted scheduling are not certified.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    errors: string[] = [];
  let id = "",
    url = "";
  const campaignName = `${observationPrefix}${info.project.name}`;
  const entropyHook = installObservationEntropy();
  const require = createRequire(
    new URL("../../functions/package.json", import.meta.url),
  );
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const db = require("firebase-admin/firestore").getFirestore();
  const { provider, unwrap } = require("./lib/shared/crypto.js"),
    { context } = require("./lib/functions/src/campaigns.js"),
    { settleCampaignTicks } = await import(
      new URL(
        "../../functions/lib/functions/src/production.js?illustrated-observation",
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
  const views = () =>
    pages.slice(0, 2).map((page, i) => ({
      page,
      player: aliases[i],
      surface: "game" as const,
      primary: [button(page, "Observation")],
      verifications: [
        {
          spec: "Projected system labels remain separated and contained within the chart.",
          check: () => readableLabels(page),
        },
      ],
    }));
  const privacy = async () => {
    const s = await canonical();
    for (const seat of [0, 1, 2]) {
      const v = await published(seat),
        uid = s.seats[seat].uid;
      expect(v.observations).toEqual(observationView(s, uid));
      for (const report of Object.values(v.observations ?? {}))
        expect(Object.keys(report).sort()).toEqual(
          [
            "observedTick",
            "sourceStarId",
            "orbit",
            "surface",
            "fighters",
            "infantry",
            "markets",
            "camps",
            "bases",
            "stations",
          ].sort(),
        );
      expect(v).not.toHaveProperty("intelligence");
      expect(v).not.toHaveProperty("seed");
      expect(JSON.stringify(v)).not.toContain('"draws"');
      for (const other of s.seats.filter((x) => x.uid !== uid))
        expect(v).not.toHaveProperty(other.uid);
    }
    expect(errors).toEqual([]);
  };
  const select = async (
    p: Page,
    name: string,
    stars: CampaignView["stars"],
  ) => {
    await button(p, "Systems list").click();
    await p.getByLabel("Find a system").fill(name);
    const star = stars.find((s) => s.name === name)!;
    const target = button(p, `Select ${name}, ${star.class} class`);
    await target.focus();
    await target.press("Enter");
    await expect(
      inspector(p).getByRole("heading", { level: 2 }),
    ).toHaveAccessibleName(name);
    await button(p, "Observation").click();
    await details(p).evaluate((el) => el.scrollTo(0, 0));
  };
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
          const page = await ctx.newPage();
          pages.push(page);
          page.on("pageerror", (error) => errors.push(error.message));
          const email = `observation-story-${info.project.name}-${i}-${Date.now()}@example.test`;
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
      initial = await published(0),
      home = initial.stars.find((s) => s.id === initial.own.home)!;
    const nearby = initial.stars.find(
      (s) => s.id !== home.id && distance(home, s) <= 10,
    )!;
    expect(nearby).toBeTruthy();
    const matchReport = async (seat: number, starId: string) => {
      const view = await published(seat),
        report = view.observations?.[starId],
        p = pages[seat];
      if (!report) {
        await expect(age(p)).toContainText("Unknown · no observation acquired");
        await expect(observation(p).locator("dl")).toHaveCount(0);
      } else {
        const elapsed = view.production!.tick - report.observedTick;
        await expect(age(p)).toHaveText(
          elapsed === 0
            ? `Current observation · tick ${report.observedTick}`
            : `Last observed ${elapsed} ${elapsed === 1 ? "tick" : "ticks"} ago · tick ${report.observedTick}`,
        );
        for (const [label, value] of [
          ["Orbit owner", report.orbit],
          ["Surface owner", report.surface],
          ["Stationed fighters", report.fighters],
          ["Stationed infantry", report.infantry],
          ["Markets", report.markets],
          ["Training camps", report.camps],
          ["Bases", report.bases],
          ["Space stations", report.stations],
        ] as const)
          await expect(
            observation(p)
              .getByText(label, { exact: true })
              .locator("..")
              .locator("dd"),
          ).toHaveText(String(value));
      }
      await pinned(p);
    };
    await story.step("inspect-before-acquisition", {
      actor: aliases[0],
      description:
        "Select the same nearby catalogue star on two independent accounts before the first scan.",
      action: async () => {
        for (const p of [owner, peer])
          await select(p, nearby.name, initial.stars);
      },
      acknowledgement: {
        spec: "Both accounts explicitly report that no observation has been acquired.",
        check: async () => {
          for (const p of [owner, peer])
            await expect(age(p)).toContainText(
              "Unknown · no observation acquired",
            );
        },
      },
      verifications: [
        {
          spec: "Unknown reports have no serialized observation fields or rendered force/development facts; the primary tab and age remain visible.",
          check: async () => {
            await privacy();
            for (const seat of [0, 1]) {
              expect((await published(seat)).observations).toBeNull();
              await matchReport(seat, nearby.id);
            }
          },
        },
      ],
      views: views(),
    });
    await story.harness(
      "first-scan-tick",
      "Deliver the first real leased tick at the explicit domain boundary. Fixed scan entropy identities feed the real HMAC; acquisition, authorization and publication are unchanged.",
      async () => {
        for (const p of pages) await p.clock.setFixedTime(scheduledAt + 900000);
        expect(await settleCampaignTicks(id, () => scheduledAt + 900000)).toBe(
          1,
        );
        const settled = await canonical();
        expect(await settleCampaignTicks(id, () => scheduledAt + 900000)).toBe(
          0,
        );
        expect(await canonical()).toEqual(settled);
      },
    );
    await story.step("read-current-report", {
      actor: aliases[0],
      description:
        "Read the acknowledged current scan and compare the other commander's independently authorized view of the same star.",
      action: async () => {
        for (const p of [owner, peer]) await button(p, "Observation").focus();
      },
      acknowledgement: {
        spec: "The nearby star has a current tick-one report for the survey envoy.",
        check: async () =>
          expect(age(owner)).toHaveText("Current observation · tick 1"),
      },
      verifications: [
        {
          spec: "Every displayed field equals that player's actual projection; private entropy and other accounts' report tables are absent.",
          check: async () => {
            await privacy();
            for (const seat of [0, 1]) await matchReport(seat, nearby.id);
          },
        },
        {
          spec: "Public range and the envoy's level-one scanning guarantee acquisition within ten light years.",
          check: async () => {
            expect(distance(home, nearby)).toBeLessThanOrEqual(10);
            await expect(observation(owner)).toContainText(
              "100% acquisition probability",
            );
          },
        },
      ],
      views: views(),
    });
    const firstState = await canonical(),
      firstView = await published(0);
    await story.step("read-scanning-capability", {
      actor: aliases[0],
      description:
        "Use the bounded details panel to read scanning probability while the age stays pinned.",
      action: async () => {
        for (const p of [owner, peer]) {
          await pinned(p);
          await details(p).focus();
          await details(p).evaluate((el) => el.scrollTo(0, el.scrollHeight));
        }
      },
      acknowledgement: {
        spec: "Scanning capability is visible and the report age remains inside its scroll panel.",
        check: async () => {
          for (const p of [owner, peer]) {
            await expect(
              observation(p).getByRole("region", {
                name: "Scanning capability",
              }),
            ).toBeInViewport();
            await pinned(p);
          }
        },
      },
      verifications: [
        {
          spec: "Reading and keyboard focus do not write a command or modify canonical state.",
          check: async () => {
            expect(await canonical()).toEqual(firstState);
            for (const p of [owner, peer])
              await expect(details(p)).toBeFocused();
          },
        },
      ],
      views: views(),
    });
    await story.harness(
      "second-scan-tick",
      "Deliver the second real leased tick, then repeat delivery to prove the acquired/current or retained/historical outcomes are not redrawn.",
      async () => {
        for (const p of pages)
          await p.clock.setFixedTime(scheduledAt + 1800000);
        expect(await settleCampaignTicks(id, () => scheduledAt + 1800000)).toBe(
          1,
        );
        const settled = await canonical();
        expect(await settleCampaignTicks(id, () => scheduledAt + 1800000)).toBe(
          0,
        );
        expect(await canonical()).toEqual(settled);
      },
    );
    const secondView = await published(0),
      stale = secondView.stars.find(
        (s) =>
          secondView.observations?.[s.id] &&
          secondView.observations[s.id].observedTick < 2,
      )!;
    expect(stale).toBeTruthy();
    const retained = secondView.observations![stale.id];
    expect(retained).toEqual(firstView.observations![stale.id]);
    await story.step("read-retained-history", {
      actor: aliases[0],
      description:
        "Select a report the envoy is authorized to read that was not refreshed by the second scan; distinguish its historical facts from another account's report.",
      action: async () => {
        for (const p of [owner, peer])
          await select(p, stale.name, initial.stars);
      },
      acknowledgement: {
        spec: "The envoy's retained report is explicitly historical at its original observation tick.",
        check: async () => {
          await expect(age(owner)).toHaveText(
            "Last observed 1 tick ago · tick 1",
          );
          await expect(observation(owner)).toContainText(
            "These are historical facts.",
          );
        },
      },
      verifications: [
        {
          spec: "A missed acquisition retains every prior authorized fact without substituting current canonical data; both players see only their own acquired fields.",
          check: async () => {
            expect((await published(0)).observations![stale.id]).toEqual(
              retained,
            );
            await privacy();
            for (const seat of [0, 1]) await matchReport(seat, stale.id);
          },
        },
      ],
      views: views(),
    });
    const warning = (p: Page) =>
      observation(p).getByText(
        p === owner
          ? "These are historical facts. Ownership and forces may have changed."
          : "Scans happen automatically. A missed scan preserves the last report; it does not mean the system is empty. Owned layers remain current in System.",
        { exact: true },
      );
    await story.step("read-historical-warning", {
      actor: aliases[0],
      description:
        "Read the full historical warning and the other commander's scan caveat without losing the pinned age or leaving the bounded panel.",
      action: async () => {
        for (const p of [owner, peer]) {
          await pinned(p);
          await details(p).focus();
          await warning(p).scrollIntoViewIfNeeded();
        }
      },
      acknowledgement: {
        spec: "Each full warning is readable inside its panel below the pinned observation age.",
        check: async () => {
          for (const p of [owner, peer]) {
            await expect(warning(p)).toBeInViewport({ ratio: 1 });
            await pinned(p);
            const text = await warning(p).boundingBox(),
              bounds = await details(p).boundingBox(),
              pinnedAge = await age(p).boundingBox();
            expect(text!.y).toBeGreaterThanOrEqual(
              pinnedAge!.y + pinnedAge!.height,
            );
            expect(text!.y + text!.height).toBeLessThanOrEqual(
              bounds!.y + bounds!.height,
            );
          }
        },
      },
      verifications: [
        {
          spec: "The original observation timestamp and facts remain unchanged after scrolling.",
          check: async () => {
            for (const seat of [0, 1]) await matchReport(seat, stale.id);
          },
        },
      ],
      views: views(),
    });
    const unseen = secondView.stars.find(
      (s) => !secondView.observations?.[s.id],
    )!;
    expect(unseen).toBeTruthy();
    await story.step("inspect-still-unknown", {
      actor: aliases[0],
      description:
        "Inspect another public catalogue star for which the envoy has still acquired no report.",
      action: async () => {
        for (const p of [owner, peer])
          await select(p, unseen.name, initial.stars);
      },
      acknowledgement: {
        spec: "The envoy sees unknown information, never a fabricated zero-force report.",
        check: async () =>
          expect(age(owner)).toContainText("Unknown · no observation acquired"),
      },
      verifications: [
        {
          spec: "The unacquired star has no observation object or force/development fields in that account's serialized reports; the other account retains its own access.",
          check: async () => {
            const v = await published(0);
            expect(v.observations).not.toHaveProperty(unseen.id);
            await expect(
              observation(owner).getByText("Stationed fighters", {
                exact: true,
              }),
            ).toHaveCount(0);
            await privacy();
            for (const seat of [0, 1]) await matchReport(seat, unseen.id);
          },
        },
      ],
      views: views(),
    });
    await story.step("recover-retained-report", {
      actor: aliases[0],
      description:
        "Reload both authenticated accounts, reopen the actual campaign and restore the selected historical report through keyboard-accessible system navigation.",
      action: async () => {
        for (const p of [owner, peer]) {
          await p.reload();
          await select(p, stale.name, initial.stars);
        }
      },
      acknowledgement: {
        spec: "Reload recovers the envoy's original tick-one report at current tick two.",
        check: async () =>
          expect(age(owner)).toHaveText("Last observed 1 tick ago · tick 1"),
      },
      verifications: [
        {
          spec: "Recovery changes neither acquired history nor privacy and all rendered facts still match each authoritative private view.",
          check: async () => {
            expect((await published(0)).observations![stale.id]).toEqual(
              retained,
            );
            await privacy();
            for (const seat of [0, 1]) await matchReport(seat, stale.id);
          },
        },
      ],
      views: views(),
    });
    const recoveredState = await canonical();
    await story.step("read-labels-after-resize", {
      actor: aliases[0],
      description:
        "Resize the recovered chart and return to the original viewport; compare normal and reduced motion without changing the selected report.",
      action: async () => {
        const size = owner.viewportSize()!;
        const before = await labelGeometry(owner);
        await owner.setViewportSize({
          width: size.width + 57,
          height: size.height + 41,
        });
        await readableLabels(owner);
        await owner.setViewportSize(size);
        await expect.poll(() => labelGeometry(owner)).toEqual(before);
        await owner.emulateMedia({ reducedMotion: "no-preference" });
        await readableLabels(owner);
        await expect.poll(() => labelGeometry(owner)).toEqual(before);
        await owner.emulateMedia({ reducedMotion: "reduce" });
      },
      acknowledgement: {
        spec: "The same historical report remains selected with readable labels after resize and either motion preference.",
        check: async () => {
          await expect(age(owner)).toHaveText(
            "Last observed 1 tick ago · tick 1",
          );
          await readableLabels(owner);
          if (info.project.name === "phone") {
            await expect(
              owner.locator(".quiet-label").filter({ hasText: "Tupã · A" }),
            ).toBeVisible();
            await expect(
              owner
                .locator(".quiet-label")
                .filter({ hasText: "Tania Australis · G · You" }),
            ).toBeVisible();
          }
        },
      },
      verifications: [
        {
          spec: "Presentation changes neither canonical state nor authorized observations.",
          check: async () => {
            expect(await canonical()).toEqual(recoveredState);
            await privacy();
          },
        },
      ],
      views: views(),
    });
    await story.step("locate-home-by-keyboard", {
      actor: aliases[0],
      description:
        "Use the systems list and Center home control with the keyboard to discover the home system independently of secondary map labels.",
      action: async () => {
        await button(owner, "Systems list").focus();
        await button(owner, "Systems list").press("Enter");
        await button(owner, "Center home").focus();
        await button(owner, "Center home").press("Enter");
        await button(owner, "Close list").focus();
        await button(owner, "Close list").press("Enter");
      },
      acknowledgement: {
        spec: "The authoritative home system is selected and its priority label is readable.",
        check: async () => {
          await expect(
            inspector(owner).getByRole("heading", { level: 2 }),
          ).toHaveAccessibleName(home.name);
          await expect(owner.locator(".star-label")).toHaveText(home.name);
          await expect(owner.locator(".star-label")).toBeVisible();
          await readableLabels(owner);
        },
      },
      verifications: [
        {
          spec: "Keyboard chart navigation preserves authoritative forces, history and private recipient projections.",
          check: async () => {
            expect(await canonical()).toEqual(recoveredState);
            await privacy();
          },
        },
      ],
      views: views(),
    });
  } finally {
    for (const context of contexts) await context.close();
    entropyHook.deregister();
  }
});
