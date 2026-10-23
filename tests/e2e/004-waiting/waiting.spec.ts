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
          },
        },
      ],
      views: pages
        .slice(0, 2)
        .map((page, i) => ({
          page,
          player: aliases[i],
          surface: "game" as const,
          primary: [button(page, "Inspect system"), button(page, "Roster")],
        })),
    });
  } finally {
    for (const context of contexts) await context.close();
  }
});
