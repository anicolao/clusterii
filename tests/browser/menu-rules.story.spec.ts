import type { Locator } from "@playwright/test";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";

test("Read shared market rules and return without leaving the game", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "in-game-market-rules",
    title: "Read market rules and return to the same menu",
    inventory: ["UX-15", "UX-16"],
    description:
      "Actual shared GameMenu and MarketRules in the production gallery. Local navigation only; this does not establish live campaign draft/tick preservation or authoritative actions.",
  });
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  const dialog = page.getByRole("dialog", { name: "Game menu" });
  const rules = dialog.getByRole("button", { name: "Rules", exact: true });
  const back = dialog.getByRole("button", { name: "Back to menu" });
  const close = dialog.getByRole("button", { name: "Return to game" });
  const reading = dialog.getByRole("region", {
    name: "Rules reading",
    exact: true,
  });
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
  await story.step("read-market-rules", {
    actor: "Reader",
    description:
      "Open the shared menu and Rules with the keyboard, then expand the existing market chapter.",
    action: async () => {
      await page.goto("./gallery/");
      await menu.focus();
      await page.keyboard.press("Enter");
      await rules.focus();
      await page.keyboard.press("Enter");
      await expect(
        dialog.getByRole("heading", { name: "Rules", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(dialog.locator("summary")).toBeFocused();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "The actual market chapter opens inside the single existing modal.",
      check: async () => {
        await expect(page.locator("dialog[open]")).toHaveCount(1);
        await expect(dialog.locator("details")).toHaveAttribute("open", "");
        await expect(
          dialog.getByRole("heading", { name: "Allocate expectations" }),
        ).toBeVisible();
      },
    },
    verifications: [
      {
        spec: "The top heading, chapter entry and rule-review disclosure are wholly within the reading clip while both footer actions remain contained.",
        check: async () => {
          for (const item of [
            reading.getByRole("heading", { name: "Rules", exact: true }),
            reading.locator("summary"),
            reading.locator(".scope"),
            back,
            close,
          ])
            await contained(item);
        },
      },
      {
        spec: "Reading continues the campaign and cannot be confused with leaving or surrendering; proposed rules retain their disclosure.",
        check: async () => {
          await expect(dialog).toContainText(
            "Neither leaves the campaign nor surrenders your seat.",
          );
          await expect(dialog).toContainText(
            "Market dividend rules remain under review.",
          );
          await expect(dialog).toContainText(
            "Apply focus requests an order; wait for acceptance.",
          );
        },
      },
    ],
    views: [
      { page, player: "Reader", surface: "document", primary: [back, close] },
    ],
  });
  let documentScrollBeforeReading = 0;
  await story.step("read-held-returns", {
    actor: "Reader",
    description:
      "Shift+Tab from the chapter entry into the named bounded reading region, then use End to read confirmed and held returns without moving the footer.",
    action: async () => {
      await page.keyboard.press("Shift+Tab");
      await expect(reading).toBeFocused();
      documentScrollBeforeReading = await page.evaluate(() => window.scrollY);
      await page.keyboard.press("End");
    },
    acknowledgement: {
      spec: "Keyboard scrolling reveals the complete lower heading and its relevant paragraph.",
      check: async () => {
        await contained(
          reading.getByRole("heading", {
            name: "Confirmed and held returns",
            exact: true,
          }),
        );
        await contained(
          reading.getByText(
            "New markets join dividend weights from the next tick.",
            { exact: false },
          ),
        );
      },
    },
    verifications: [
      {
        spec: "The reading region retains keyboard focus and both persistent footer actions remain inside their clipping ancestors and viewport before helper scrolling.",
        check: async () => {
          await expect(reading).toBeFocused();
          expect(await page.evaluate(() => window.scrollY)).toBe(
            documentScrollBeforeReading,
          );
          await contained(back);
          await contained(close);
        },
      },
    ],
    views: [
      {
        page,
        player: "Reader · held returns",
        surface: "document",
        primary: [back, close],
      },
    ],
  });
  await story.step("read-rules-top", {
    actor: "Reader",
    description:
      "After capturing the lower text, use Home in the same focused reading region to return to the top without scrolling the document.",
    action: async () => {
      await expect(reading).toBeFocused();
      await page.keyboard.press("Home");
    },
    acknowledgement: {
      spec: "Home restores the top heading and chapter entry inside the bounded region.",
      check: async () => {
        expect(await reading.evaluate((element) => element.scrollTop)).toBe(0);
        await contained(
          reading.getByRole("heading", { name: "Rules", exact: true }),
        );
        await contained(reading.locator("summary"));
        await contained(reading.locator(".scope"));
      },
    },
    verifications: [
      {
        spec: "Document scroll is unchanged, focus stays in Rules reading and the persistent actions remain contained.",
        check: async () => {
          expect(await page.evaluate(() => window.scrollY)).toBe(
            documentScrollBeforeReading,
          );
          await expect(reading).toBeFocused();
          await contained(back);
          await contained(close);
        },
      },
    ],
    views: [
      {
        page,
        player: "Reader · rules top",
        surface: "document",
        primary: [back, close],
      },
    ],
  });
  await story.step("return-within-menu", {
    actor: "Reader",
    description:
      "Use Back to menu, then reopen Rules and use Escape to return to its opening control.",
    action: async () => {
      await page.keyboard.press("Shift+Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(reading).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(reading.locator("summary")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(back).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(rules).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(
        dialog.getByRole("heading", { name: "Rules", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
    },
    acknowledgement: {
      spec: "Rules closes inside the still-open menu and restores Rules focus.",
      check: async () => {
        await expect(rules).toBeFocused();
        await expect(dialog).toBeVisible();
      },
    },
    verifications: [
      {
        spec: "Presentation controls remain available and there is no second modal.",
        check: async () => {
          await expect(
            dialog.getByRole("checkbox", {
              name: "Reduce motion",
              exact: true,
            }),
          ).toBeVisible();
          await expect(page.locator("dialog[open]")).toHaveCount(1);
        },
      },
    ],
    views: [
      { page, player: "Reader", surface: "document", primary: [rules, close] },
    ],
  });
  await story.step("return-to-scene", {
    actor: "Reader",
    description:
      "Escape the menu and return focus to its original opener without route navigation.",
    action: async () => {
      await page.keyboard.press("Escape");
    },
    acknowledgement: {
      spec: "The menu is closed and Menu regains focus.",
      check: async () => {
        await expect(dialog).not.toBeVisible();
        await expect(menu).toBeFocused();
      },
    },
    verifications: [
      {
        spec: "The same gallery route remains mounted.",
        check: async () => {
          await expect(page).toHaveURL(/\/gallery\/$/);
        },
      },
    ],
    views: [{ page, player: "Reader", surface: "document", primary: [menu] }],
  });
});
