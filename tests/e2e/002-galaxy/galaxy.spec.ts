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
      "Four ordinary authenticated players create, join and start one real campaign. The owner reads authorized resources, expands the independent ownership layers and uses the global dock without issuing an unrelated order. Developer entitlement, fixed catalogue/admission clock, the existing construction-prefix command clock and real scheduler HTTP delivery are explicit harness controls, not injected seats or hosted scheduling evidence. The layer journey reserves a real orbital development and recovers that accepted order without resubmitting it.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [];
  const emails = Array.from(
    { length: 4 },
    (_, i) => `galaxy-${info.project.name}-${Date.now()}-${i}@example.test`,
  );
  const name = `Scheduled story construction layers ${info.project.name}`;
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
          await expect(
            inspector.getByRole("region", {
              name: "System layers",
              exact: true,
            }),
          ).toBeVisible();
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
          primary: [
            button(owner, "Back to galaxy"),
            button(owner, "View forces"),
          ],
        },
      ],
    });
    const constructionPanel = owner.getByRole("region", {
      name: "System construction",
      exact: true,
    });
    const closeConstruction = constructionPanel.getByRole("button", {
      name: "Back to galaxy",
      exact: true,
    });
    let reservedBalance = "";
    const readAcceptedQueue = async () => {
      await constructionPanel
        .getByRole("region", { name: "Construction details", exact: true })
        .focus();
      await owner.keyboard.press("End");
      await expect
        .poll(() =>
          constructionPanel
            .getByText("Queued · eligible tick 1", { exact: false })
            .evaluate((el) => {
              const box = el.getBoundingClientRect();
              const region = el
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
    };
    await story.step("inspect-orbital-authority", {
      actor: aliases[0],
      description:
        "Open the distinct Orbit instrument to inspect entitled fighters, training camps and science stations.",
      action: async () => keyboard(owner, "Inspect Orbit · owner You"),
      acknowledgement: {
        spec: "The orbit instrument expands and exposes an applicable real construction entry.",
        check: async () => {
          await expect(
            button(owner, "Inspect Orbit · owner You"),
          ).toHaveAttribute("aria-expanded", "true");
          await expect(button(owner, "Build in orbit")).toBeEnabled();
        },
      },
      verifications: [
        {
          spec: "Orbital facts are labelled separately from the independent Surface owner.",
          check: async () => {
            const geometry = await button(
              owner,
              "Inspect Orbit · owner You",
            ).evaluate((selector) => {
              const button = selector.getBoundingClientRect();
              const row = selector.parentElement!.querySelector("dl > div")!;
              const label = row.querySelector("dt")!;
              const style = getComputedStyle(selector);
              const outlineWidth = parseFloat(style.outlineWidth);
              const outlineOffset = parseFloat(style.outlineOffset);
              return {
                focused: selector.matches(":focus-visible"),
                buttonBottom: button.bottom,
                outlineWidth,
                outlineOffset,
                outlineBottom: button.bottom + outlineWidth + outlineOffset,
                rowTop: row.getBoundingClientRect().top,
                labelTop: label.getBoundingClientRect().top,
              };
            });
            await info.attach("Orbit focus and first fact geometry", {
              body: JSON.stringify(geometry, null, 2),
              contentType: "application/json",
            });
            expect(geometry.focused).toBe(true);
            expect(
              geometry.outlineBottom,
              JSON.stringify(geometry),
            ).toBeLessThanOrEqual(geometry.rowTop);
            await expect(
              owner
                .getByRole("region", { name: "Orbital control", exact: true })
                .getByText("Fighters", { exact: true }),
            ).toBeVisible();
            await expect(
              button(owner, "Inspect Surface · owner You"),
            ).toHaveAttribute("aria-expanded", "false");
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [
            button(owner, "Build in orbit"),
            button(owner, "View forces"),
            button(owner, "Back to galaxy"),
          ],
        },
      ],
    });
    await story.step("reserve-orbital-development", {
      actor: aliases[0],
      description:
        "Enter construction from Orbit and submit the actual training-camp order, reserving credits only after authoritative acceptance.",
      action: async () => {
        await keyboard(owner, "Build in orbit");
        await expect(
          constructionPanel.getByRole("radio", { name: /^Training camp/ }),
        ).toBeChecked();
        reservedBalance = await constructionPanel
          .getByText("Balance after", { exact: false })
          .innerText();
        await keyboard(owner, "Build training camp");
      },
      acknowledgement: {
        spec: "The real construction receipt accepts the order and credits are reserved.",
        check: async () => {
          await expect(inspector).toHaveAttribute("inert", "");
          await expect(constructionPanel.getByRole("status")).toContainText(
            "Construction order accepted. Credits reserved",
          );
          await expect(
            constructionPanel.getByRole("button", {
              name: "Cancel training camp order",
              exact: true,
            }),
          ).toHaveCount(1);
        },
      },
      verifications: [
        {
          spec: "The authorized balance matches the reviewed quote and exactly one orbital order is listed.",
          check: async () => {
            await expect(
              constructionPanel
                .locator("header")
                .getByText("Available credits", { exact: false }),
            ).toHaveText(
              reservedBalance.replace("Balance after", "Available credits"),
            );
            await expect(
              constructionPanel.getByText("Queued · eligible tick 1", {
                exact: false,
              }),
            ).toBeVisible();
            await readAcceptedQueue();
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [closeConstruction],
        },
      ],
    });
    await story.step("recover-accepted-orbit-order", {
      actor: aliases[0],
      description:
        "Reload, return through Inspect and Orbit, and recover the accepted queue from the real authorized view without sending another build.",
      action: async () => {
        await owner.reload();
        await keyboard(owner, "Inspect system");
        await keyboard(owner, "Inspect Orbit · owner You");
        await keyboard(owner, "Build in orbit");
      },
      acknowledgement: {
        spec: "One accepted orbital order and the reserved balance recover after reload.",
        check: async () => {
          await expect(
            constructionPanel.getByRole("button", {
              name: "Cancel training camp order",
              exact: true,
            }),
          ).toHaveCount(1);
          await expect(
            constructionPanel
              .locator("header")
              .getByText("Available credits", { exact: false }),
          ).toHaveText(
            reservedBalance.replace("Balance after", "Available credits"),
          );
        },
      },
      verifications: [
        {
          spec: "Construction still selects the orbital training camp and its recovered queue is readable.",
          check: async () => {
            await expect(
              constructionPanel.getByRole("radio", { name: /^Training camp/ }),
            ).toBeChecked();
            await readAcceptedQueue();
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [closeConstruction],
        },
      ],
    });
    await story.step("read-lower-system-facts", {
      actor: aliases[0],
      description:
        "Close recovered construction to its Orbit opener, select Surface, then use End in the bounded reading region to read held credits while retaining contextual controls.",
      action: async () => {
        await closeConstruction.focus();
        await owner.keyboard.press("Enter");
        await expect(button(owner, "Build in orbit")).toBeFocused();
        await keyboard(owner, "Inspect Surface · owner You");
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
                      .closest('[aria-label="System details"]')!
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
          primary: [
            button(owner, "Back to galaxy"),
            button(owner, "View forces"),
          ],
        },
      ],
    });
    await story.step("review-surface-development", {
      actor: aliases[0],
      description:
        "Use the separate Surface instrument to open its actual base construction quote without submitting a second order.",
      action: async () => keyboard(owner, "Build on surface"),
      acknowledgement: {
        spec: "The actual construction instrument selects a surface Base.",
        check: async () =>
          expect(
            constructionPanel.getByRole("radio", { name: /^Base Surface/ }),
          ).toBeChecked(),
      },
      verifications: [
        {
          spec: "The prior accepted orbital order remains singular and the reserved balance is unchanged.",
          check: async () => {
            await expect(
              constructionPanel.getByRole("button", {
                name: "Cancel training camp order",
                exact: true,
              }),
            ).toHaveCount(1);
            await expect(
              constructionPanel
                .locator("header")
                .getByText("Available credits", { exact: false }),
            ).toHaveText(
              reservedBalance.replace("Balance after", "Available credits"),
            );
          },
        },
      ],
      views: [
        {
          page: owner,
          player: aliases[0],
          surface: "game",
          primary: [button(owner, "Build base"), closeConstruction],
        },
      ],
    });
    await story.step("navigate-global-economy", {
      actor: aliases[0],
      description:
        "Collapse the system, open the global command dock and read Economy through the actual authorized projection.",
      action: async () => {
        await closeConstruction.focus();
        await owner.keyboard.press("Enter");
        await expect(button(owner, "Build on surface")).toBeFocused();
        await keyboard(owner, "Back to galaxy");
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
        "Use the actual local setting with normal motion permitted by the device, verify its outcome, then restore the declared reduced-motion capture environment. Selection and authorized resource text remain unchanged.",
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
        expect(
          await owner.evaluate(
            () => matchMedia("(prefers-reduced-motion: reduce)").matches,
          ),
        ).toBe(false);
        expect(await inspector.innerText()).toBe(authorizedText);
        await owner.emulateMedia({ reducedMotion: "reduce" });
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
