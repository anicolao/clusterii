import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import {
  admissionAt,
  scheduledAt,
  admissionPrefix,
} from "./story-helpers/admission-clock.mjs";
import { createRequire } from "node:module";
import type { Page, BrowserContext } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const view = (page: Page, player: string) => ({
  page,
  player,
  surface: "game" as const,
});
const activeView = (page: Page, player: string) => ({
  ...view(page, player),
  verifications: [
    {
      spec: "The active chart acknowledges that authorized contact records finished loading.",
      check: async () => {
        await expect(
          page.getByText(
            "Contact markers show acquired positions from loaded records.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(
          page.getByText("Recovering contact records…", { exact: true }),
        ).toHaveCount(0);
      },
    },
  ],
});
const factions = [
  "Heliac Assembly",
  "Pelagic Concord",
  "Vesper Synod",
  "Dracon League",
];
test("Five commanders start two campaigns and recover their named active campaign", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(180000);
  const story = new TestStepHelper(info, {
    id: "campaign-scheduled-start",
    title:
      "Admit independent commanders, assign homes and resume a chosen campaign",
    inventory: ["UX-01", "UX-02", "UX-03", "UX-14", "UX-16"],
    description:
      "Five independent saved commanders join two real campaigns through ordinary controls. Explicit test-only domain/browser clocks expose scheduled and overdue states before the real scheduler endpoint assigns distinct homes. Single and multiple memberships then recover the named last campaign through Continue. No roster, home, balance or receipt is injected; accelerated evidence does not certify hosted cadence.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [],
    urls: string[] = [];
  const names = [
    `${admissionPrefix}dawn ${info.project.name}`,
    `${admissionPrefix}dusk ${info.project.name}`,
  ];
  const aliases = Array.from({ length: 5 }, (_, i) => `Dawn envoy ${i + 1}`);
  const errors: string[] = [];
  const noErrors = {
    spec: "No commander has an uncaught application error.",
    check: async () => expect(errors).toEqual([]),
  };
  const roster = (page: Page) =>
    page.getByRole("region", { name: "Campaign roster", exact: true });
  const require = createRequire(
    new URL("../../functions/package.json", import.meta.url),
  );
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const db = require("firebase-admin/firestore").getFirestore();
  try {
    await story.harness(
      "independent-identities-and-clock",
      "Create five independent authenticated contexts and saved identities through ordinary UI; grant emulator development access. The loader fixes only the designated campaign catalogue/domain time; browser Date follows 12:01 UTC without stopping timers or fabricating responses.",
      async () => {
        for (let i = 0; i < 5; i++) {
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
          page.on("pageerror", (error) => errors.push(error.message));
          const email = `start-story-${info.project.name}-${i}-${Date.now()}@example.test`;
          await login(page, email);
          await page.getByLabel("Commander name").fill(aliases[i]);
          await button(page, "Save identity").click();
          await expect(page.getByRole("status")).toContainText(
            "Identity saved",
          );
          await grantDeveloper(email);
          await button(page, "Close").click();
          await expect(button(page, "Play")).toBeEnabled();
          await expect(
            page.getByRole("button", { name: /^Continue/ }),
          ).toHaveCount(0);
          await button(page, "Play").click();
          await page.clock.setFixedTime(admissionAt);
        }
      },
    );
    for (let campaign = 0; campaign < 2; campaign++) {
      const members = campaign === 0 ? [0, 1, 2, 3] : [0, 1, 2, 4];
      await story.step(`propose-${campaign + 1}`, {
        actor: aliases[0],
        description: `Propose ${names[campaign]} with four empires.`,
        action: async () => {
          if (campaign) await button(pages[0], "Campaigns").click();
          await button(pages[0], "Create campaign").click();
          await pages[0].getByLabel("Campaign name").fill(names[campaign]);
        },
        acknowledgement: {
          spec: "The four-empire proposal is ready to commit.",
          check: async () =>
            expect(button(pages[0], "Create galaxy")).toBeEnabled(),
        },
        verifications: [noErrors],
        views: [
          {
            ...view(pages[0], aliases[0]),
            primary: [button(pages[0], "Create galaxy")],
          },
        ],
      });
      await story.step(`create-${campaign + 1}`, {
        actor: aliases[0],
        description:
          "Create the real waiting galaxy before choosing a faction.",
        action: async () => {
          await button(pages[0], "Create galaxy").click();
        },
        acknowledgement: {
          spec: "Creation is acknowledged with faction selection.",
          check: async () => {
            await expect(
              pages[0].getByText("Campaign created. Choose your faction.", {
                exact: true,
              }),
            ).toBeVisible();
            await expect(
              pages[0].getByRole("heading", {
                name: "Choose your faction",
                exact: true,
              }),
            ).toBeVisible();
            await expect(pages[0]).toHaveURL(/campaign=[a-f0-9-]{36}/);
            urls.push(pages[0].url());
          },
        },
        verifications: [noErrors],
        views: [view(pages[0], aliases[0])],
      });
      for (let seat = 0; seat < 4; seat++) {
        const index = members[seat],
          page = pages[index];
        await story.step(`choose-${campaign + 1}-${seat + 1}`, {
          actor: aliases[index],
          description: `Review the available ${factions[seat]} seat in ${names[campaign]}.`,
          action: async () => {
            if (seat) await page.goto(urls[campaign]);
            await page
              .getByRole("radio", { name: new RegExp(factions[seat]) })
              .check();
          },
          acknowledgement: {
            spec: "The named faction is selected and commitment is available.",
            check: async () => {
              await expect(
                page.getByRole("radio", { name: new RegExp(factions[seat]) }),
              ).toBeChecked();
              await expect(button(page, "Claim your seat")).toBeEnabled();
            },
          },
          verifications: [noErrors],
          views: [
            {
              ...view(page, aliases[index]),
              primary: [button(page, "Claim your seat")],
            },
          ],
        });
        await story.step(`join-${campaign + 1}-${seat + 1}`, {
          actor: aliases[index],
          description:
            "Claim the reviewed seat and inspect the authoritative roster acknowledgement.",
          action: async () => {
            await button(page, "Claim your seat").click();
            await expect(
              page.getByText("Your seat is confirmed.", { exact: true }),
            ).toBeVisible();
            await button(page, "Roster").click();
            if (seat) await button(pages[0], "Roster").click();
          },
          acknowledgement: {
            spec: "The joining commander and host observe the acknowledged roster count.",
            check: async () => {
              for (const visible of seat ? [page, pages[0]] : [page])
                await expect(
                  roster(visible).getByRole("heading", {
                    name: `${seat + 1} / 4 empires assembled`,
                  }),
                ).toBeVisible();
            },
          },
          verifications: [noErrors],
          views: seat
            ? [view(page, aliases[index]), view(pages[0], aliases[0])]
            : [view(page, aliases[index])],
        });
        // Closing is a normal player navigation before the next admission, not a fabricated state.
        await button(page, "Close roster").click();
        if (seat) await button(pages[0], "Close roster").click();
      }
    }
    await story.step("scheduled-rosters", {
      actor: "All five commanders",
      description:
        "Review the full rosters and the same recorded quarter-hour start from each independent account.",
      action: async () => {
        for (const page of pages) await button(page, "Roster").click();
      },
      acknowledgement: {
        spec: "All five views show four seats and the recorded start schedule.",
        check: async () => {
          for (const page of pages) {
            await expect(roster(page)).toContainText("4 / 4 empires assembled");
            await expect(roster(page).getByRole("status")).toContainText(
              "The server assigns home systems at the scheduled start.",
            );
          }
        },
      },
      verifications: [
        noErrors,
        {
          spec: "Both authoritative heads are scheduled at the derived quarter-hour, without assigned homes.",
          check: async () => {
            for (const url of urls) {
              const head = await db
                .doc(
                  `campaignStates/${new URL(url).searchParams.get("campaign")}`,
                )
                .get();
              expect(head.get("phase")).toBe("scheduled");
              expect(head.get("startAt")).toBe(scheduledAt);
              expect(head.get("startAt") % 900000).toBe(0);
            }
          },
        },
      ],
      views: pages.map((page, i) => view(page, aliases[i])),
    });
    await story.harness(
      "overdue-browser-clock",
      "Advance only browser Date to the recorded start while withholding scheduler delivery. Real service state remains scheduled; no home or clock result is written to persistence.",
      async () => {
        for (const page of pages) await page.clock.setFixedTime(scheduledAt);
      },
    );
    await story.step("awaiting-assignment", {
      actor: "All five commanders",
      description:
        "Keep the saved seats visible while the scheduled boundary has passed and home assignment is still outstanding.",
      action: async () => {},
      acknowledgement: {
        spec: "Every account sees awaiting-home guidance instead of an invented started state.",
        check: async () => {
          for (const page of pages)
            await expect(roster(page).getByRole("status")).toContainText(
              "Awaiting home assignment. Your seat is saved; this view updates automatically.",
            );
        },
      },
      verifications: [noErrors],
      views: pages.map((page, i) => view(page, aliases[i])),
    });
    await story.harness(
      "deliver-scheduler",
      "Deliver the actual startScheduledCampaigns emulator HTTP endpoint. Its real transaction/reducer assigns homes and publishes authorized views; only designated domain time inputs are fixed. This does not certify hosted Scheduler delivery or real elapsed cadence.",
      async () => {
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
      },
    );
    await story.step("started-rosters", {
      actor: "All five commanders",
      description:
        "Read the authoritative begun schedule in each visible roster after scheduler delivery.",
      action: async () => {},
      acknowledgement: {
        spec: "Every independent roster visibly acknowledges that its campaign began.",
        check: async () => {
          for (const page of pages) {
            await expect(roster(page).getByRole("status")).toBeVisible();
            await expect(roster(page).getByRole("status")).toContainText(
              "Began",
            );
          }
        },
      },
      verifications: [noErrors],
      views: pages.map((page, i) => activeView(page, aliases[i])),
    });
    const homes: string[] = [];
    await story.step("homes-assigned", {
      actor: "Four independent commanders",
      description:
        "Open the first campaign and inspect each commander's own authoritative home system.",
      action: async () => {
        for (let i = 0; i < 4; i++) await pages[i].goto(urls[0]);
      },
      acknowledgement: {
        spec: "Four distinct homes show ownership of both layers and the recorded starting forces.",
        check: async () => {
          for (let i = 0; i < 4; i++) {
            const page = pages[i];
            // The phone rail deliberately omits campaign facts; every size
            // has already captured the visible authoritative roster status.
            if (info.project.name !== "phone")
              await expect(
                page.getByText("Campaign begun", { exact: true }),
              ).toBeVisible();
            const inspector = page.getByRole("complementary", {
              name: "Selected system",
            });
            await expect(
              inspector.getByText("You", { exact: true }),
            ).toHaveCount(2);
            await expect(
              inspector.getByText("20", { exact: true }),
            ).toHaveCount(2);
            const details = inspector.getByRole("region", {
              name: "System details",
              exact: true,
            });
            const bounds = await details.boundingBox();
            expect(bounds).not.toBeNull();
            for (const fact of await inspector
              .getByText(/^(You|20)$/, { exact: true })
              .all()) {
              const box = await fact.boundingBox();
              expect(box).not.toBeNull();
              expect(box!.y).toBeGreaterThanOrEqual(bounds!.y);
              expect(box!.y + box!.height).toBeLessThanOrEqual(
                bounds!.y + bounds!.height,
              );
            }
            homes.push(await inspector.getByRole("heading").innerText());
          }
          expect(new Set(homes).size).toBe(4);
        },
      },
      verifications: [noErrors],
      views: pages.slice(0, 4).map((page, i) => activeView(page, aliases[i])),
    });
    await story.step("single-membership-entry", {
      actor: aliases[3],
      description: "Return to entry with one accessible active campaign.",
      action: async () => pages[3].goto("./").then(() => {}),
      acknowledgement: {
        spec: "Continue names the one active campaign alongside Play and Learn.",
        check: async () => {
          await expect(button(pages[3], `Continue ${names[0]}`)).toBeVisible();
          await expect(button(pages[3], "Play")).toBeEnabled();
          await expect(button(pages[3], "Learn the game")).toBeVisible();
          await expect(
            pages[3].getByRole("link", { name: "Change campaign" }),
          ).toHaveCount(0);
        },
      },
      verifications: [noErrors],
      views: [view(pages[3], aliases[3])],
    });
    await story.step("choose-last-campaign", {
      actor: aliases[0],
      description:
        "Visit the second active campaign so it becomes the last accessible selection.",
      action: async () => pages[0].goto(urls[1]).then(() => {}),
      acknowledgement: {
        spec: "The second authoritative galaxy has begun.",
        check: async () => {
          if (info.project.name !== "phone")
            await expect(
              pages[0].getByText("Campaign begun", { exact: true }),
            ).toBeVisible();
          await expect(
            pages[0]
              .getByRole("complementary", { name: "Selected system" })
              .getByText("You", { exact: true }),
          ).toHaveCount(2);
        },
      },
      verifications: [noErrors],
      views: [activeView(pages[0], aliases[0])],
    });
    await story.step("multiple-membership-entry", {
      actor: aliases[0],
      description:
        "Return to entry and review the named last campaign and Change campaign option.",
      action: async () => pages[0].goto("./").then(() => {}),
      acknowledgement: {
        spec: "Continue names the second campaign while Play, Learn and Change campaign remain distinct.",
        check: async () => {
          await expect(button(pages[0], `Continue ${names[1]}`)).toBeVisible();
          await expect(button(pages[0], "Play")).toBeEnabled();
          await expect(button(pages[0], "Learn the game")).toBeVisible();
          await expect(
            pages[0].getByRole("link", { name: "Change campaign" }),
          ).toBeVisible();
        },
      },
      verifications: [noErrors],
      views: [view(pages[0], aliases[0])],
    });
    await story.step("reload-last-selection", {
      actor: aliases[0],
      description:
        "Reload entry without losing the account-scoped last campaign selection.",
      action: async () => pages[0].reload().then(() => {}),
      acknowledgement: {
        spec: "The named second-campaign Continue survives reload.",
        check: async () => {
          await expect(button(pages[0], `Continue ${names[1]}`)).toBeVisible();
          await expect(button(pages[0], "Play")).toBeEnabled();
        },
      },
      verifications: [noErrors],
      views: [view(pages[0], aliases[0])],
    });
    await story.step("continue-exact-campaign", {
      actor: aliases[0],
      description: "Commit Continue and return to that exact active campaign.",
      action: async () => button(pages[0], `Continue ${names[1]}`).click(),
      acknowledgement: {
        spec: "Continue opens the exact recorded campaign ID and live galaxy.",
        check: async () => {
          await expect(pages[0]).toHaveURL(urls[1]);
          await expect(pages[0].locator("canvas")).toBeVisible();
        },
      },
      verifications: [noErrors],
      views: [activeView(pages[0], aliases[0])],
    });
  } finally {
    for (const context of contexts) await context.close();
  }
});
