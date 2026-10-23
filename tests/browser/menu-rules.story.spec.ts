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
  await story.step("return-within-menu", {
    actor: "Reader",
    description:
      "Use Back to menu, then reopen Rules and use Escape to return to its opening control.",
    action: async () => {
      await back.focus();
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
