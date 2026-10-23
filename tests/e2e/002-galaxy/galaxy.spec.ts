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
test("Inspect and navigate a real galaxy through its command dock", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "galaxy-command-surface",
    title: "Inspect a system without losing the galaxy",
    inventory: ["UX-02", "UX-03", "UX-04", "UX-15", "UX-16"],
    description:
      "Four ordinary authenticated players create, join and start one real campaign. The owner reads authorized resources, expands the independent ownership layers and uses the global dock without issuing an order. Developer entitlement, fixed catalogue/domain clock and real scheduler HTTP delivery are explicit harness controls, not injected seats or hosted scheduling evidence.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [];
  const emails = Array.from(
    { length: 4 },
    (_, i) => `galaxy-${info.project.name}-${Date.now()}-${i}@example.test`,
  );
  const name = `Scheduled story command ${info.project.name}`;
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
    const owner = pages[0];
    const inspector = owner.getByRole("complementary", {
      name: "Selected system",
    });
    const selectedName = await inspector
      .getByRole("heading", { level: 2 })
      .innerText();
    const openDock = async () => {
      if (info.project.name === "phone") await keyboard(owner, "More");
    };
    const facts = {
      spec: "Credits, last confirmed science and actual next scheduled tick remain readable on phone as well as desktop; the chart and inspector stay within the viewport.",
      check: async () => {
        await expect(owner.getByLabel("Empire resources")).toContainText(
          "Credits",
        );
        await expect(owner.getByLabel("Empire resources")).toContainText(
          "Science · last tick",
        );
        await expect(owner.getByLabel("Empire resources")).toContainText(
          "Next tick",
        );
        const resource = await owner
          .getByLabel("Empire resources")
          .boundingBox();
        expect(resource!.y).toBeGreaterThanOrEqual(0);
        expect(resource!.y + resource!.height).toBeLessThan(120);
        const chart = await owner
          .locator("[data-galaxy-viewport]")
          .boundingBox();
        expect(chart!.height).toBeGreaterThan(
          info.project.use.viewport!.height * 0.3,
        );
        expect(
          await owner.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight,
          ),
        ).toBe(true);
      },
    };
    await story.step("read-galaxy", {
      actor: aliases[0],
      description:
        "Read the real started campaign, independent ownership layers and compact instrument rail before opening any order.",
      action: async () => {
        await button(owner, "Inspect system").focus();
      },
      acknowledgement: {
        spec: "The authorized home view follows the acknowledged four-player start.",
        check: async () => {
          await expect(inspector.getByText("You", { exact: true })).toHaveCount(
            2,
          );
          await expect(
            owner.getByText(
              "Contact markers show acquired positions from loaded records.",
              { exact: true },
            ),
          ).toBeVisible();
        },
      },
      verifications: [facts],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Inspect system"), button(owner, "Menu")],
        },
      ],
    });
    await story.step("inspect-independent-layers", {
      actor: aliases[0],
      description:
        "Expand the selected system through its real keyboard control and read separate orbital and surface holdings. Artwork is explicitly illustrative.",
      action: async () => keyboard(owner, "Inspect system"),
      acknowledgement: {
        spec: "The same selected system expands without changing ownership.",
        check: async () => {
          await expect(inspector.getByRole("heading", { level: 2 })).toHaveText(
            selectedName,
          );
          await expect(button(owner, "Collapse system")).toHaveAttribute(
            "aria-expanded",
            "true",
          );
        },
      },
      verifications: [
        {
          spec: "Authorized fields remain separate, and decorative art is not represented as sensor intelligence.",
          check: async () => {
            await expect(
              inspector.getByText("Orbit", { exact: true }),
            ).toBeVisible();
            await expect(
              inspector.getByText("Surface", { exact: true }),
            ).toBeVisible();
            await expect(
              inspector.getByText(
                "World and orbit illustration · not sensor intelligence",
                { exact: true },
              ),
            ).toBeVisible();
            await expect(
              inspector.getByText("Held credits", { exact: true }),
            ).toBeVisible();
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Collapse system"), button(owner, "Develop")],
        },
      ],
    });
    await story.step("read-lower-system-facts", {
      actor: aliases[0],
      description:
        "Focus the bounded system reading region and use End to read the lower authorized developments and held credits while retaining the contextual controls.",
      action: async () => {
        await owner
          .getByRole("region", { name: "System details", exact: true })
          .focus();
        await owner.keyboard.press("End");
      },
      acknowledgement: {
        spec: "The held credits label is fully inside the bounded reading viewport.",
        check: async () => {
          await expect
            .poll(() =>
              inspector
                .getByText("Held credits", { exact: true })
                .evaluate((el) => {
                  const box = el.getBoundingClientRect(),
                    region = el
                      .closest('[role="region"]')!
                      .getBoundingClientRect();
                  return (
                    box.top >= region.top &&
                    box.bottom <= region.bottom &&
                    box.top >= 0 &&
                    box.bottom <= innerHeight
                  );
                }),
            )
            .toBe(true);
        },
      },
      verifications: [
        {
          spec: "Keyboard reading does not move the page or replace the selected system.",
          check: async () => {
            expect(await owner.evaluate(() => window.scrollY)).toBe(0);
            await expect(
              inspector.getByRole("heading", { level: 2 }),
            ).toHaveText(selectedName);
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Collapse system"), button(owner, "Develop")],
        },
      ],
    });
    await story.step("navigate-global-economy", {
      actor: aliases[0],
      description:
        "Collapse the system, open the global command dock and read Economy through the actual authorized projection.",
      action: async () => {
        await keyboard(owner, "Collapse system");
        await openDock();
        await keyboard(owner, "Economy");
      },
      acknowledgement: {
        spec: "The actual Empire economy panel opens with keyboard focus.",
        check: async () =>
          expect(
            owner.getByRole("region", { name: "Empire economy", exact: true }),
          ).toBeVisible(),
      },
      verifications: [
        {
          spec: "The authorized economy provides an enabled return to the galaxy; this check does not certify command absence or peer privacy.",
          check: async () =>
            expect(button(owner, "Return to galaxy")).toBeEnabled(),
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Return to galaxy")],
        },
      ],
    });
    await story.step("return-to-selected-system", {
      actor: aliases[0],
      description:
        "Close Economy with Escape and retain the selected system and accessible command opener.",
      action: async () => owner.keyboard.press("Escape"),
      acknowledgement: {
        spec: "The dock Economy opener regains focus.",
        check: async () => expect(button(owner, "Economy")).toBeFocused(),
      },
      verifications: [
        {
          spec: "The same system remains selected after global navigation.",
          check: async () =>
            expect(inspector.getByRole("heading", { level: 2 })).toHaveText(
              selectedName,
            ),
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Economy")],
        },
      ],
    });
    await story.step("select-a-catalogued-system", {
      actor: aliases[0],
      description:
        "Use the factual systems list to select Saiph with the keyboard, then return to the compact inspector.",
      action: async () => {
        if (info.project.name !== "phone")
          await button(owner, "Systems list").focus();
        await keyboard(owner, "Systems list");
        await owner.getByLabel("Find a system").fill("Saiph");
        await owner.getByRole("button", { name: /^Select Saiph,/ }).focus();
        await owner.keyboard.press("Enter");
        if (info.project.name === "phone") await owner.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "The actual selected system is Saiph and the same campaign remains open.",
        check: async () => {
          await expect(
            inspector.getByRole("heading", { level: 2 }),
          ).toContainText("Saiph");
          expect(new URL(owner.url()).searchParams.get("campaign")).toBe(
            campaignId,
          );
        },
      },
      verifications: [facts],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Inspect system")],
        },
      ],
    });
    const authorizedText = await inspector.innerText();
    const resourceText = await owner.getByLabel("Empire resources").innerText();
    await story.step("retain-facts-with-lower-detail", {
      actor: aliases[0],
      description:
        "Use the actual local setting to remove decorative rendering, with normal motion permitted by the device. Selection and authorized resource text remain unchanged.",
      action: async () => {
        await owner.emulateMedia({ reducedMotion: "no-preference" });
        await keyboard(owner, "Menu");
        await owner
          .getByRole("checkbox", { name: "Lower galaxy detail", exact: true })
          .focus();
        await owner.keyboard.press("Space");
        await expect(
          owner
            .getByRole("status")
            .filter({ hasText: "Lower galaxy detail is on." }),
        ).toBeVisible();
        await owner.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "The menu closes and restores its opener after acknowledging the local setting.",
        check: async () => expect(button(owner, "Menu")).toBeFocused(),
      },
      verifications: [
        {
          spec: "Authorized inspector and resource text match exactly; reduced decoration does not alter selected-system facts. This does not certify every canvas marker or hosted timing.",
          check: async () => {
            expect(await inspector.innerText()).toBe(authorizedText);
            expect(await owner.getByLabel("Empire resources").innerText()).toBe(
              resourceText,
            );
            await expect(
              inspector.getByRole("heading", { level: 2 }),
            ).toContainText("Saiph");
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Menu"), button(owner, "Inspect system")],
        },
      ],
    });
  } finally {
    for (const context of contexts) await context.close();
  }
});
