import type { BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { login, grantDeveloper } from "../../browser/helpers";
import {
  admissionAt,
  scheduledAt,
} from "../../browser/story-helpers/admission-clock.mjs";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
test("Return to a genuinely active campaign from the cinematic entry", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "cinematic-returning-entry",
    title: "Resume an earned place in the galaxy",
    inventory: ["UX-01", "UX-02", "UX-15", "UX-16"],
    description:
      "Four ordinary authenticated players create, join and start one real campaign. The owner returns to the named campaign through Continue after reload. Developer entitlement, fixed catalogue/domain clock and real scheduler HTTP delivery are explicit harness controls, not injected seats or hosted scheduling evidence.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [];
  const emails = Array.from(
    { length: 4 },
    (_, i) => `returning-${info.project.name}-${Date.now()}-${i}@example.test`,
  );
  const name = `Scheduled story return ${info.project.name}`;
  const aliases = [
    "Returning envoy",
    "Tidal envoy",
    "Night envoy",
    "Solar envoy",
  ];
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
    for (let i = 0; i < 4; i++)
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
      },
    );
    const owner = pages[0],
      continued = button(owner, `Continue ${name}`),
      play = button(owner, "Play"),
      learn = button(owner, "Learn the game");
    const verifyEntry = {
      spec: "The named real campaign leads the entry in visual and keyboard order, with distinct Play and Learn; saved identity is retained.",
      check: async () => {
        await expect(
          owner.getByText(`Welcome back, ${aliases[0]}`, { exact: true }),
        ).toBeVisible();
        await expect(owner.locator(".entry-actions > button .label")).toHaveText([
          `Continue${name}`,
          "Play",
          "Learn the game",
        ]);
        await continued.focus();
        await owner.keyboard.press("Tab");
        await expect(play).toBeFocused();
        await owner.keyboard.press("Shift+Tab");
        await expect(continued).toBeFocused();
        const a = await continued.boundingBox(),
          b = await play.boundingBox();
        expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y);
      },
    };
    await story.step("return-to-entry", {
      actor: aliases[0],
      description:
        "Leave the campaign view through Campaigns and the Cluster entry link; the campaign continues.",
      action: async () => {
        await keyboard(owner, "Campaigns");
        await owner.getByRole("link", { name: "CLUSTER", exact: true }).click();
      },
      acknowledgement: {
        spec: "Continue names the actual active campaign.",
        check: async () => expect(continued).toBeEnabled(),
      },
      verifications: [verifyEntry],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [continued, play, learn],
        },
      ],
    });
    await story.step("reload-returning-entry", {
      actor: aliases[0],
      description:
        "Reload the entry and retain the named campaign without resaving identity.",
      action: async () => {
        await owner.reload();
      },
      acknowledgement: {
        spec: "The accessible campaign is recovered from real saved membership.",
        check: async () => expect(continued).toBeEnabled(),
      },
      verifications: [verifyEntry],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [continued, play, learn],
        },
      ],
    });
    await story.step("continue-campaign", {
      actor: aliases[0],
      description:
        "Activate Continue with the keyboard and return to the exact running campaign.",
      action: async () => {
        await continued.focus();
        await owner.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The same active campaign is displayed.",
        check: async () => acknowledgeStart(owner),
      },
      verifications: [
        {
          spec: "The campaign identity and visible heading match the actual created campaign; contact recovery finishes.",
          check: async () => {
            expect(new URL(owner.url()).searchParams.get("campaign")).toBe(
              campaignId,
            );
            await expect(
              owner.getByRole("heading", { name, exact: true }),
            ).toBeVisible();
            await expect(
              owner.getByText(
                "Contact markers show acquired positions from loaded records.",
                { exact: true },
              ),
            ).toBeVisible();
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Menu")],
        },
      ],
    });
  } finally {
    for (const context of contexts) await context.close();
  }
});
