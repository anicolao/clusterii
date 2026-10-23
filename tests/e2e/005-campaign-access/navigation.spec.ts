import { openGalaxyCommand } from "../../browser/galaxy-navigation";
import {
  expectWaitingSeat,
  activeAdmissionControls,
} from "../helpers/campaign-phase";
import { admissionAt } from "../../browser/story-helpers/admission-clock.mjs";
import { observeDeparture } from "../../browser/story-helpers/campaign-departure";
import { test, expect } from "../helpers/fixtures";
import { readableLabels } from "../../browser/story-helpers/galaxy-labels";
import { TestStepHelper } from "../helpers/test-step-helper";
import { login, grantDeveloper } from "../../browser/helpers";
import type { Page, Locator } from "@playwright/test";
import {
  observeProfileWrites,
  profileIdentity,
  profileFacts,
} from "../../browser/story-helpers/profile-observer";
const contained = async (locator: Locator) => {
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        const box = element.getBoundingClientRect();
        let left = 0,
          top = 0,
          right = innerWidth,
          bottom = innerHeight;
        for (
          let parent = element.parentElement;
          parent;
          parent = parent.parentElement
        ) {
          const style = getComputedStyle(parent),
            bounds = parent.getBoundingClientRect();
          if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
            left = Math.max(left, bounds.left + parent.clientLeft);
            right = Math.min(
              right,
              bounds.left + parent.clientLeft + parent.clientWidth,
            );
          }
          if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
            top = Math.max(top, bounds.top + parent.clientTop);
            bottom = Math.min(
              bottom,
              bounds.top + parent.clientTop + parent.clientHeight,
            );
          }
        }
        return (
          box.width > 0 &&
          box.height > 0 &&
          box.left >= left &&
          box.right <= right &&
          box.top >= top &&
          box.bottom <= bottom
        );
      }),
    )
    .toBe(true);
};
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const view = (
  page: Page,
  player: string,
  primary: ReturnType<typeof button>[] = [],
) => ({ page, player, surface: "game" as const, primary });
const confirmed = (page: Page) =>
  expect(
    page.getByText("Your seat is confirmed.", { exact: true }),
  ).toBeVisible();
async function developer(page: Page, email: string) {
  await login(page, email);
  await page.getByLabel("Commander name").fill("Star envoy");
  await button(page, "Save identity").click();
  await expect(page.getByRole("status")).toContainText("Identity saved");
  await grantDeveloper(email);
  await button(page, "Close").click();
  await page.getByRole("link", { name: "Open campaigns" }).click();
}
async function makeCampaign(page: Page, name: string) {
  await button(page, "Create campaign").click();
  await page.getByLabel("Campaign name").fill(name);
  await button(page, "Create galaxy").click();
  await expect(
    page.getByRole("heading", { name: "Choose your faction" }),
  ).toBeVisible();
}
async function rail(page: Page, name: string) {
  const box = await button(page, name).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
}
const card = (page: Page, name: string) =>
  page
    .getByRole("button")
    .filter({ has: page.getByText(name, { exact: true }) });

test("A commander reviews a faction, commits a seat, recovers the exact waiting campaign and leaves", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "campaign-admission-navigation",
    title: "Review, join, recover and leave a waiting campaign",
    inventory: ["UX-01", "UX-02", "UX-03", "UX-14", "UX-16"],
    description:
      "A developer creates a real waiting campaign, reviews portrait/faction/briefing with a persistent commitment rail, joins and recovers that exact campaign through Play. Waiting membership never offers Continue. Seat release is acknowledged and survives reload. The catalogue seed is fixed by the emulator-only harness; no campaign state or tick is fabricated.",
  });
  const departure = observeDeparture(page);
  const name = `Admission dawn ${info.project.name}`,
    views = [view(page, "Star envoy")],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let campaignUrl = "";
  await story.harness(
    "saved-developer",
    "Prepare a saved commander identity through ordinary UI and grant explicit emulator developer access. The test loader fixes catalogue entropy only.",
    async () =>
      developer(
        page,
        `admission-story-${info.project.name}-${Date.now()}@example.test`,
      ),
  );
  await story.step("propose-campaign", {
    actor: "Star envoy",
    description:
      "Open campaign creation and name the four-empire development galaxy.",
    action: async () => {
      await button(page, "Create campaign").click();
      await page.getByLabel("Campaign name").fill(name);
    },
    acknowledgement: {
      spec: "The named proposal is ready to commit.",
      check: async () =>
        expect(page.getByLabel("Campaign name")).toHaveValue(name),
    },
    verifications: [
      {
        spec: "Create galaxy stays in the viewport before automatic scrolling.",
        check: async () => rail(page, "Create galaxy"),
      },
    ],
    views: [view(page, "Star envoy", [button(page, "Create galaxy")])],
  });
  await story.step("created-faction", {
    actor: "Star envoy",
    description:
      "Create the galaxy and review its faction choice before claiming a seat.",
    action: async () => button(page, "Create galaxy").click(),
    acknowledgement: {
      spec: "Campaign creation is acknowledged and faction selection opens.",
      check: async () => {
        await expect(
          page.getByRole("heading", { name: "Choose your faction" }),
        ).toBeVisible();
        await expect(
          page.getByText("Campaign created. Choose your faction.", {
            exact: true,
          }),
        ).toBeVisible();
      },
    },
    verifications: [
      {
        spec: "The initial view contains all four choices, affinity matrix and Claim without automatic scrolling; longer reading remains bounded.",
        check: async () => {
          await rail(page, "Claim your seat");
          const panel = page.locator(".campaign-body");
          expect(
            await panel.evaluate((el) => getComputedStyle(el).overflowY),
          ).toBe("auto");
          for (const radio of await page
            .getByRole("region", { name: "Choose your faction", exact: true })
            .getByRole("radio")
            .all())
            await contained(radio);
          await contained(
            page.getByLabel("Production affinity by stellar class"),
          );
          expect(await page.evaluate(() => window.scrollY)).toBe(0);
        },
      },
    ],
    views: [view(page, "Star envoy", [button(page, "Claim your seat")])],
  });
  await story.step("choose-portrait", {
    actor: "Star envoy",
    description:
      "Review portraits and choose The emissary without leaving the visible seat commitment.",
    action: async () => {
      await button(page, "Portrait").focus();
      await page.keyboard.press("Enter");
      await page
        .getByRole("radio", { name: "The emissary", exact: true })
        .check();
    },
    acknowledgement: {
      spec: "The named portrait is selected.",
      check: async () =>
        expect(
          page.getByRole("radio", { name: "The emissary", exact: true }),
        ).toBeChecked(),
    },
    verifications: [
      {
        spec: "Claim stays visible before scrolling.",
        check: async () => rail(page, "Claim your seat"),
      },
    ],
    views: [view(page, "Star envoy", [button(page, "Claim your seat")])],
  });
  await story.step("review-faction", {
    actor: "Star envoy",
    description:
      "Return to the faction briefing while keeping the chosen portrait and commitment.",
    action: async () => {
      await button(page, "Faction").focus();
      await page.keyboard.press("Enter");
      await page.getByRole("radio", { name: /Heliac Assembly/ }).focus();
      await page.keyboard.press("ArrowDown");
      await page
        .getByRole("region", { name: "Campaign details", exact: true })
        .focus();
      await page.keyboard.press("End");
    },
    acknowledgement: {
      spec: "Faction details are visible again.",
      check: async () =>
        expect(
          page.getByRole("heading", { name: "Choose your faction" }),
        ).toBeVisible(),
    },
    verifications: [
      {
        spec: "Keyboard-selected Vesper and the complete four-class affinity matrix remain readable; no document scroll or seat claim occurs.",
        check: async () => {
          await rail(page, "Claim your seat");
          await expect(
            page.getByRole("radio", { name: /Vesper Synod/ }),
          ).toBeChecked();
          await contained(page.getByRole("radio", { name: /Vesper Synod/ }));
          await contained(
            page.getByLabel("Production affinity by stellar class"),
          );
          await expect(
            page
              .getByLabel("Production affinity by stellar class")
              .locator("dd"),
          ).toHaveCount(4);
          expect(await page.evaluate(() => window.scrollY)).toBe(0);
          await expect(
            page.getByText("Your seat is confirmed.", { exact: true }),
          ).toHaveCount(0);
        },
      },
    ],
    views: [view(page, "Star envoy", [button(page, "Claim your seat")])],
  });
  await story.step("review-rules", {
    actor: "Star envoy",
    description:
      "Read the campaign briefing and distinguish the shared-victory design from enabled development behavior.",
    action: async () => {
      await button(page, "Briefing & roster").focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "The briefing explicitly says victory evaluation is not enabled.",
      check: async () =>
        expect(
          page.getByText("Victory evaluation is not enabled", { exact: false }),
        ).toBeVisible(),
    },
    verifications: [
      {
        spec: "Claim remains visible while reviewing the briefing.",
        check: async () => rail(page, "Claim your seat"),
      },
    ],
    views: [view(page, "Star envoy", [button(page, "Claim your seat")])],
  });
  await story.step("read-full-briefing", {
    actor: "Star envoy",
    description:
      "Open the actual rules with the keyboard, then read the last faction capacity inside the bounded campaign details. The selected faction and uncommitted seat remain unchanged.",
    action: async () => {
      await page
        .getByText("Review this campaign’s rules", { exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await page
        .getByRole("region", { name: "Campaign details", exact: true })
        .focus();
      await page.keyboard.press("End");
    },
    acknowledgement: {
      spec: "The real rules disclosure remains open; no seat has been claimed.",
      check: async () => {
        await expect(
          page
            .getByRole("region", { name: "Admission briefing" })
            .locator("details"),
        ).toHaveAttribute("open", "");
        await expect(
          page.getByText("Your seat is confirmed.", { exact: true }),
        ).toHaveCount(0);
      },
    },
    verifications: [
      {
        spec: "The final faction and capacity are fully readable, with the commitment and document position preserved.",
        check: async () => {
          const row = page
            .getByRole("region", { name: "Campaign roster", exact: true })
            .getByRole("listitem")
            .filter({ hasText: "Dracon League" });
          await contained(row);
          await expect(row).toContainText("1 seats open");
          await rail(page, "Claim your seat");
          expect(await page.evaluate(() => window.scrollY)).toBe(0);
        },
      },
    ],
    views: [view(page, "Star envoy", [button(page, "Claim your seat")])],
  });
  await story.step("seat-confirmed", {
    actor: "Star envoy",
    description: "Commit the seat and enter the authoritative waiting galaxy.",
    action: async () => {
      await button(page, "Claim your seat").click();
      await confirmed(page);
      campaignUrl = page.url();
    },
    acknowledgement: {
      spec: "The seat is confirmed and the one-member manifest preserves the waiting phase.",
      check: async () => {
        await confirmed(page);
        await expectWaitingSeat(page, "Star envoy", 1);
      },
    },
    verifications: [
      {
        spec: "The campaign URL records its authoritative UUID.",
        check: async () =>
          expect(campaignUrl).toMatch(/campaign=[a-f0-9-]{36}/),
      },
    ],
    views,
  });
  await story.step("waiting-entry", {
    actor: "Star envoy",
    description:
      "Return to entry. A waiting membership remains accessible through Play and does not offer Continue.",
    action: async () => {
      await page.goto("./");
    },
    acknowledgement: {
      spec: "Play is available without an active-campaign Continue.",
      check: async () => {
        await expect(button(page, "Play")).toBeVisible();
        await expect(
          page.getByRole("button", { name: /^Continue/ }),
        ).toHaveCount(0);
      },
    },
    verifications: [
      {
        spec: "The campaign directory link is retained.",
        check: async () =>
          expect(
            page.getByRole("link", { name: "Open campaigns" }),
          ).toHaveAttribute("href", "/clusterii/pr4/campaigns/"),
      },
    ],
    views,
  });
  await story.step("identity-focus-return", {
    actor: "Star envoy",
    description:
      "Open and close identity, returning keyboard focus to its entry control.",
    action: async () => {
      await button(page, "Your identity").click();
      await button(page, "Close").click();
    },
    acknowledgement: {
      spec: "Your identity regains focus.",
      check: async () => expect(button(page, "Your identity")).toBeFocused(),
    },
    verifications: [
      {
        spec: "The acknowledged navigation causes no uncaught application errors.",
        check: async () => expect(errors).toEqual([]),
      },
    ],
    views,
  });
  await story.step("campaign-directory", {
    actor: "Star envoy",
    description: "Use Play to review the joined waiting campaign by name.",
    action: async () => button(page, "Play").click(),
    acknowledgement: {
      spec: "The joined campaign appears in the directory.",
      check: async () => {
        await expect(
          page.getByRole("region", { name: "Campaign directory" }),
        ).toBeVisible();
        await expect(card(page, name)).toBeVisible();
      },
    },
    verifications: [
      {
        spec: "The directory reports exactly one joined membership.",
        check: async () =>
          expect(button(page, "Your campaigns (1)")).toHaveAttribute(
            "aria-pressed",
            "true",
          ),
      },
    ],
    views,
  });
  await story.step("recover-exact-campaign", {
    actor: "Star envoy",
    description:
      "Select the named membership and recover its exact authoritative galaxy.",
    action: async () => card(page, name).click(),
    acknowledgement: {
      spec: "The same campaign URL, named saved seat and waiting manifest recover.",
      check: async () => {
        await expect(page).toHaveURL(campaignUrl);
        await expectWaitingSeat(page, "Star envoy", 1);
      },
    },
    verifications: [
      {
        spec: "The acknowledged navigation causes no uncaught application errors.",
        check: async () => expect(errors).toEqual([]),
      },
    ],
    views,
  });
  await story.step("reload-membership", {
    actor: "Star envoy",
    description:
      "Reload the waiting galaxy, recover its exact directory card through Campaigns and reopen its roster.",
    action: async () => {
      await page.reload();
      await expectWaitingSeat(page, "Star envoy", 1);
      await button(page, "Campaigns").click();
      await expect(card(page, name)).toBeVisible();
      await card(page, name).click();
      await expect(page).toHaveURL(campaignUrl);
      await button(page, "Roster").click();
    },
    acknowledgement: {
      spec: "The recovered roster permits leaving the waiting campaign.",
      check: async () =>
        expect(
          page
            .getByRole("dialog", { name: "Campaign roster panel", exact: true })
            .getByRole("button", { name: "Leave campaign", exact: true }),
        ).toBeEnabled(),
    },
    verifications: [
      {
        spec: "Reload retains the exact campaign ID.",
        check: async () => expect(page).toHaveURL(campaignUrl),
      },
    ],
    views,
  });
  await story.step("roster-focus-return", {
    actor: "Star envoy",
    description:
      "Close the roster with Escape and retain its keyboard opening control.",
    action: async () => page.keyboard.press("Escape"),
    acknowledgement: {
      spec: "Roster regains keyboard focus.",
      check: async () => expect(button(page, "Roster")).toBeFocused(),
    },
    verifications: [
      {
        spec: "The acknowledged navigation causes no uncaught application errors.",
        check: async () => expect(errors).toEqual([]),
      },
    ],
    views,
  });
  await story.step("release-seat", {
    actor: "Star envoy",
    description: "Reopen the roster with Enter and release the waiting seat.",
    action: async () => {
      await page.keyboard.press("Enter");
      await page
        .getByRole("dialog", { name: "Campaign roster panel", exact: true })
        .getByRole("button", { name: "Leave campaign", exact: true })
        .click();
    },
    acknowledgement: {
      spec: "Seat release is acknowledged and the member galaxy view closes.",
      check: async () => {
        await expect(
          page.getByText("Your seat has been released.", { exact: true }),
        ).toBeVisible();
        await expect(page.locator("canvas")).toHaveCount(0);
        await expect(
          page.getByRole("region", { name: "Waiting campaign", exact: true }),
        ).toHaveCount(0);
      },
    },
    verifications: [
      departure,
      {
        spec: "The ordinary journey has no uncaught page errors.",
        check: async () => expect(errors).toEqual([]),
      },
    ],
    views,
  });
  await story.step("released-membership-reload", {
    actor: "Star envoy",
    description:
      "Reload entry and open Play again to confirm the released membership is absent.",
    action: async () => {
      await page.goto("./");
      await button(page, "Play").click();
    },
    acknowledgement: {
      spec: "Your campaigns reports zero joined seats.",
      check: async () => {
        await expect(button(page, "Your campaigns (0)")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(card(page, name)).toHaveCount(0);
      },
    },
    verifications: [
      {
        spec: "No uncaught page errors occurred.",
        check: async () => expect(errors).toEqual([]),
      },
    ],
    views,
  });
});

test("An active commander filters stars, orbits by keyboard and inspects a clipped map label", async ({
  page,
  browser,
  request,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "campaign-chart-navigation",
    title:
      "Navigate the authoritative star catalogue with keyboard and pointer",
    inventory: ["UX-03", "UX-04", "UX-15", "UX-16"],
    description:
      "A genuinely started member filters the authoritative catalogue, uses keyboard camera controls, selects a named star and tests map-label clipping at the inspector boundary. Four ordinary admissions and labelled scheduler delivery establish the home; no state is injected. Fixed catalogue entropy makes the scene repeatable without invented star data or gameplay actions.",
  });
  const views = [
      {
        ...view(page, "Star envoy"),
        verifications: [
          {
            spec: "System names remain separated and contained as the actual camera and class filter change.",
            check: () => readableLabels(page),
          },
        ],
      },
    ],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let before: { x: number; y: number; width: number; height: number } | null =
    null;
  await story.harness(
    "active-members",
    "Save the host, create/join through UI, admit three independent commanders and deliver the existing fixed-clock scheduler harness. No state injection or hosted scheduling claim.",
    [
      {
        description:
          "Save Star envoy, create the named scheduled campaign and acknowledge the host seat.",
        run: async () => {
          await developer(
            page,
            `chart-story-${info.project.name}-${Date.now()}@example.test`,
          );
          await page.clock.setFixedTime(admissionAt);
          await makeCampaign(
            page,
            `Scheduled story chart dawn ${info.project.name}`,
          );
          await button(page, "Claim your seat").click();
          await confirmed(page);
          await expectWaitingSeat(page, "Star envoy", 1);
        },
      },
      ...activeAdmissionControls(browser, request, page, info),
    ],
  );
  await story.step("assigned-chart", {
    actor: "Star envoy",
    description:
      "Inspect the real galaxy after acknowledged scheduled home assignment.",
    action: async () => {},
    acknowledgement: {
      spec: "The real canvas and selected system are visible.",
      check: async () => {
        await expect(page.locator("canvas")).toBeVisible();
        await expect(
          page.getByRole("complementary", { name: "Selected system" }),
        ).toBeVisible();
      },
    },
    verifications: [
      {
        spec: "The map fills the viewport under a slim campaign rail.",
        check: async () => {
          expect(
            (await page.locator(".galaxy-surface").boundingBox())!.height,
          ).toBe(page.viewportSize()!.height);
          const rail = (await page.locator(".command-rail").boundingBox())!;
          const chart = (await page.locator(".chart").boundingBox())!;
          expect(rail.y).toBeGreaterThanOrEqual(0);
          expect(chart.y).toBeGreaterThanOrEqual(rail.y + rail.height);
          expect(chart.height).toBeGreaterThan(page.viewportSize()!.height / 4);
        },
      },
    ],
    views,
  });
  await story.step("filter-o-stars", {
    actor: "Star envoy",
    description:
      "Open Systems list and filter the authoritative catalogue to O-class stars.",
    action: async () => {
      before = await page.locator(".star-label").boundingBox();
      await openGalaxyCommand(page, "Systems list", true);
      await page
        .getByRole("combobox", { name: "Stellar class", exact: true })
        .selectOption("O");
    },
    acknowledgement: {
      spec: "Exactly 32 catalogued O-class systems match.",
      check: async () => {
        const choices = page.getByRole("button", { name: /Select .* class/ });
        await expect(choices).toHaveCount(32);
        for (const choice of await choices.all())
          expect(await choice.getAttribute("aria-label")).toMatch(/, O class$/);
      },
    },
    verifications: [
      {
        spec: "Home-centering is enabled only after the acknowledged home assignment.",
        check: async () => expect(button(page, "Center home")).toBeEnabled(),
      },
      {
        spec: "The opaque list and bounded scroll region stay below the campaign rail.",
        check: async () => {
          expect(
            await page
              .getByRole("dialog", { name: "Systems list", exact: true })
              .evaluate((el) => getComputedStyle(el).backgroundColor),
          ).toBe("rgb(7, 19, 28)");
          expect(
            (await page
              .getByRole("combobox", { name: "Stellar class", exact: true })
              .boundingBox())!.y,
          ).toBeGreaterThanOrEqual(60);
          expect(
            await page
              .locator(".list-body")
              .evaluate((el) => getComputedStyle(el).overflowY),
          ).toBe("auto");
        },
      },
    ],
    views,
  });
  await story.step("expand-camera-controls", {
    actor: "Star envoy",
    description:
      "Restore all stellar classes and expand Camera controls using the keyboard.",
    action: async () => {
      await page
        .getByRole("combobox", { name: "Stellar class", exact: true })
        .selectOption("all");
      await page.getByText("Camera controls", { exact: true }).focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "Orbit left is available in the expanded controls.",
      check: async () => expect(button(page, "Orbit left")).toBeVisible(),
    },
    verifications: [
      {
        spec: "Close list remains inside the viewport.",
        check: async () => rail(page, "Close list"),
      },
    ],
    views,
  });
  await story.step("keyboard-orbit", {
    actor: "Star envoy",
    description:
      "Activate Orbit left with Enter and observe the actual camera moving the selected star label.",
    action: async () => {
      await button(page, "Orbit left").focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "The list closes, focus returns and the map label moves.",
      check: async () => {
        await expect(button(page, "Systems list")).toBeFocused();
        await expect
          .poll(async () => {
            const after = await page.locator(".star-label").boundingBox();
            return after && before
              ? Math.hypot(after.x - before.x, after.y - before.y)
              : 0;
          })
          .toBeGreaterThan(1);
      },
    },
    verifications: [
      {
        spec: "The acknowledged navigation causes no uncaught application errors; dismiss the phone command tray through Escape for map reading.",
        check: async () => {
          expect(errors).toEqual([]);
          const more = button(page, "More");
          if (
            (await more.isVisible()) &&
            (await more.getAttribute("aria-expanded")) === "true"
          ) {
            await more.focus();
            await page.keyboard.press("Escape");
            await expect(more).toBeFocused();
            await expect(more).toHaveAttribute("aria-expanded", "false");
          }
        },
      },
    ],
    views,
  });
  await story.step("overview", {
    actor: "Star envoy",
    description: "Reopen the list with Enter and restore the galaxy overview.",
    action: async () => {
      await openGalaxyCommand(page, "Systems list", true);
      await button(page, "Overview").click();
    },
    acknowledgement: {
      spec: "The overview returns focus to Systems list.",
      check: async () => expect(button(page, "Systems list")).toBeFocused(),
    },
    verifications: [
      {
        spec: "The acknowledged navigation causes no uncaught application errors; dismiss the phone command tray through Escape for map reading.",
        check: async () => {
          expect(errors).toEqual([]);
          const more = button(page, "More");
          if (
            (await more.isVisible()) &&
            (await more.getAttribute("aria-expanded")) === "true"
          ) {
            await more.focus();
            await page.keyboard.press("Escape");
            await expect(more).toBeFocused();
            await expect(more).toHaveAttribute("aria-expanded", "false");
          }
        },
      },
    ],
    views,
  });
  await story.step("select-rana", {
    actor: "Star envoy",
    description:
      "Select the named visible catalogue entry Rana and inspect its system details.",
    action: async () => {
      await openGalaxyCommand(page, "Systems list", true);
      await page
        .getByRole("button", { name: "Select Rana, A class", exact: true })
        .click();
      await expect(button(page, "Systems list")).toBeFocused();
      const more = button(page, "More");
      if (
        (await more.isVisible()) &&
        (await more.getAttribute("aria-expanded")) === "true"
      ) {
        await more.focus();
        await page.keyboard.press("Escape");
        await expect(more).toBeFocused();
      }
    },
    acknowledgement: {
      spec: "The inspector identifies the selected authoritative star.",
      check: async () =>
        expect(
          page.getByRole("complementary", { name: "Selected system" }),
        ).toContainText("Rana"),
    },
    verifications: [
      {
        spec: "The inspector is opaque and map HTML labels are clipped to the chart viewport.",
        check: async () => {
          expect(
            await page
              .getByRole("complementary", { name: "Selected system" })
              .evaluate((el) => getComputedStyle(el).backgroundColor),
          ).toBe("rgb(7, 19, 28)");
          expect(
            await page
              .locator(".chart")
              .evaluate((el) => getComputedStyle(el).overflow),
          ).toBe("hidden");
        },
      },
    ],
    views,
  });
  if (info.project.name === "phone")
    await story.step("label-inspector-boundary", {
      actor: "Star envoy",
      description:
        "Pan the real map toward the inspector boundary; map labels must not cover or intercept the system panel.",
      action: async () => {
        const marker = await page.locator(".star-label").boundingBox(),
          panel = await page
            .getByRole("complementary", { name: "Selected system" })
            .boundingBox();
        expect(marker).not.toBeNull();
        expect(panel).not.toBeNull();
        const x = marker!.x + marker!.width / 2,
          y = marker!.y + marker!.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down({ button: "right" });
        await page.mouse.move(x, panel!.y + 30, { steps: 8 });
        await page.mouse.up({ button: "right" });
      },
      acknowledgement: {
        spec: "The inspector remains above the panned map label.",
        check: async () =>
          expect(
            await page
              .getByRole("complementary", { name: "Selected system" })
              .evaluate((el) => {
                const b = el.getBoundingClientRect();
                return el.contains(
                  document.elementFromPoint(b.x + b.width / 2, b.y + 30),
                );
              }),
          ).toBe(true),
      },
      verifications: [
        {
          spec: "The acknowledged navigation causes no uncaught application errors.",
          check: async () => expect(errors).toEqual([]),
        },
      ],
      views,
    });
  await story.step("reload-chart", {
    actor: "Star envoy",
    description:
      "Reload the same campaign after navigation without fabricating a home or changing membership.",
    action: async () => {
      await page.reload();
    },
    acknowledgement: {
      spec: "The authoritative galaxy canvas recovers.",
      check: async () => expect(page.locator("canvas")).toBeVisible(),
    },
    verifications: [
      {
        spec: "Navigation and reload caused no uncaught page errors.",
        check: async () => expect(errors).toEqual([]),
      },
    ],
    views,
  });
});

test("A returning commander waits for authoritative identity readiness before Play", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "entry-profile-readiness",
    title: "Wait for the saved identity before opening campaign selection",
    inventory: ["UX-01", "UX-14", "UX-16"],
    description:
      "A returning developer reloads entry while the actual authenticated profile-key request is held by the harness. Play remains disabled until the saved profile is known, then opens the campaign directory without an identity resave. The delay changes no service response or profile state.",
  });
  const writes = observeProfileWrites(page),
    views = [view(page, "Star envoy")];
  let release = () => {},
    blocked = false;
  const heldRequests = new Set<Promise<void>>();
  const unchanged = {
    spec: "The saved profile retains one revision, one version and one receipt.",
    check: async () => {
      const facts = await profileFacts(page, profileIdentity(writes));
      expect(facts.revision).toBe(1);
      expect(facts.versions).toHaveLength(1);
      expect(facts.receipts).toHaveLength(1);
    },
  };
  await story.harness(
    "saved-identity",
    "Prepare a real saved identity and developer access through ordinary authentication and save controls.",
    async () =>
      developer(
        page,
        `profile-ready-${info.project.name}-${Date.now()}@example.test`,
      ),
  );
  try {
    await story.harness(
      "hold-profile-readiness",
      "Hold the actual POST profile-key request before its real service response. Authentication, profile state and encrypted command receipts are unchanged.",
      async () => {
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route("**/profileKey", (route) => {
          const handled = (async () => {
            if (route.request().method() === "POST") {
              blocked = true;
              await gate;
            }
            await route.continue();
          })();
          heldRequests.add(handled);
          return handled.finally(() => heldRequests.delete(handled));
        });
      },
    );
    await story.step("entry-waits-for-profile", {
      actor: "Star envoy",
      description:
        "Reload entry while the saved identity is still being recovered. Play cannot route to an editor based on missing profile data.",
      action: async () => {
        await page.goto("./");
        await expect.poll(() => blocked).toBe(true);
      },
      acknowledgement: {
        spec: "Authentication is known and Play remains disabled until profile readiness.",
        check: async () => {
          await expect(button(page, "Your devices")).toBeVisible();
          await expect(button(page, "Play")).toBeDisabled();
        },
      },
      verifications: [
        unchanged,
        {
          spec: "The identity editor has not opened or asked for another save.",
          check: async () =>
            expect(page.getByLabel("Commander name")).toHaveCount(0),
        },
      ],
      views,
    });
    await story.harness(
      "release-profile-readiness",
      "Release the original profile-key request and remove the delay. The application receives the real saved profile through its normal subscription.",
      async () => {
        release();
        await Promise.all(heldRequests);
        await page.unroute("**/profileKey");
      },
    );
    await story.step("ready-campaign-selection", {
      actor: "Star envoy",
      description:
        "Once the saved identity is ready, use Play to enter campaign selection directly.",
      action: async () => {
        await button(page, "Play").click();
      },
      acknowledgement: {
        spec: "Play opens the joined-campaign directory instead of identity editing.",
        check: async () => {
          await expect(
            page.getByRole("region", { name: "Campaign directory" }),
          ).toBeVisible();
          await expect(button(page, "Your campaigns (0)")).toHaveAttribute(
            "aria-pressed",
            "true",
          );
        },
      },
      verifications: [
        unchanged,
        {
          spec: "No identity editor is shown.",
          check: async () =>
            expect(page.getByLabel("Commander name")).toHaveCount(0),
        },
      ],
      views,
    });
    await story.step("saved-identity-unchanged", {
      actor: "Star envoy",
      description:
        "Return to entry and explicitly open identity to confirm the saved name has not required resubmission.",
      action: async () => {
        await page.goto("./");
        await button(page, "Your identity").click();
      },
      acknowledgement: {
        spec: "The original saved commander name is available.",
        check: async () =>
          expect(page.getByLabel("Commander name")).toHaveValue("Star envoy"),
      },
      verifications: [unchanged],
      views,
    });
  } finally {
    release();
    await Promise.allSettled(heldRequests);
    if (!page.isClosed()) await page.unroute("**/profileKey");
  }
});
