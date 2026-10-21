import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";

test("Save and recover a commander identity", async ({ page }, info) => {
  const story = new TestStepHelper(info, {
    id: "commander-identity",
    title: "Save and recover a commander identity",
    description:
      "Étoile signs in through the real Google emulator UI, chooses an alias and portrait, waits for an encrypted profile command receipt, reloads to recover the saved identity, and signs out. No campaign state is injected.",
    inventory: ["UX-01", "UX-14", "UX-16"],
  });
  const play = page.getByRole("button", { name: "Play", exact: true });
  await story.step("arrive", {
    description: "Étoile arrives signed out, with no private preview.",
    actor: "Étoile",
    action: async () => page.goto("./"),
    acknowledgement: {
      spec: "Play is available on the entry surface.",
      check: async () => expect(play).toBeEnabled(),
    },
    verifications: [
      {
        spec: "No commander identity is displayed before authentication.",
        check: async () =>
          expect(
            page.getByRole("button", { name: "Your identity", exact: true }),
          ).toHaveCount(0),
      },
    ],
    views: [{ page, player: "Étoile", surface: "game", primary: [play] }],
  });
  await story.step("sign-in", {
    description: "Étoile signs in with Google and reaches the identity editor.",
    actor: "Étoile",
    action: async () => {
      const opening = page.waitForEvent("popup");
      await play.click();
      const popup = await opening;
      await popup.waitForLoadState("load");
      await popup
        .getByRole("button", { name: "Add new account", exact: true })
        .click();
      await popup
        .getByLabel("Email", { exact: true })
        .fill(`story-identity-${info.project.name}@example.test`);
      await popup.getByLabel("Display name", { exact: true }).fill("Commander");
      await popup.getByRole("button", { name: /Sign in with/ }).click();
    },
    acknowledgement: {
      spec: "Authentication completes and the commander name field is available.",
      check: async () =>
        expect(page.getByLabel("Commander name")).toBeVisible(),
    },
    verifications: [
      {
        spec: "The actual portrait picker exposes eight choices and Save is available.",
        check: async () => {
          await expect(page.getByRole("radio")).toHaveCount(8);
          await expect(
            page.getByRole("button", { name: "Save identity", exact: true }),
          ).toBeEnabled();
        },
      },
    ],
    views: [
      {
        page,
        player: "Étoile",
        surface: "game",
        primary: [
          page.getByRole("button", { name: "Save identity", exact: true }),
        ],
      },
    ],
  });
  await story.step("save-identity", {
    description: "Étoile selects the Deepseer and saves the chosen identity.",
    actor: "Étoile",
    action: async () => {
      await page.getByLabel("Commander name").fill("Étoile 🌌");
      await page
        .getByRole("radio", { name: "The deepseer", exact: true })
        .check();
      await page
        .getByRole("button", { name: "Save identity", exact: true })
        .click();
    },
    acknowledgement: {
      spec: "The authoritative encrypted profile command is acknowledged as saved.",
      check: async () =>
        expect(page.getByRole("status")).toContainText("Identity saved"),
    },
    verifications: [
      {
        spec: "The exact alias and Deepseer remain selected after acknowledgement.",
        check: async () => {
          await expect(page.getByLabel("Commander name")).toHaveValue(
            "Étoile 🌌",
          );
          await expect(
            page.getByRole("radio", { name: "The deepseer", exact: true }),
          ).toBeChecked();
          await expect(page.locator(".portrait-art img")).toHaveCount(8);
        },
      },
    ],
    views: [
      {
        page,
        player: "Étoile",
        surface: "game",
        primary: [
          page.getByRole("button", { name: "Save identity", exact: true }),
        ],
      },
    ],
  });
  await story.step("reload", {
    description: "Étoile reloads and recovers the same saved commander.",
    actor: "Étoile",
    action: async () => {
      await page.reload();
      await page
        .getByRole("button", { name: "Your identity", exact: true })
        .click();
    },
    acknowledgement: {
      spec: "The saved alias and portrait return from persisted encrypted profile history.",
      check: async () => {
        await expect(page.getByLabel("Commander name")).toHaveValue(
          "Étoile 🌌",
        );
        await expect(
          page.getByRole("radio", { name: "The deepseer", exact: true }),
        ).toBeChecked();
      },
    },
    verifications: [
      {
        spec: "The recovered identity editor offers sign out and editing without a duplicate save.",
        check: async () => {
          await expect(
            page.getByRole("button", { name: "Sign out", exact: true }),
          ).toBeEnabled();
          await expect(
            page.getByRole("button", { name: "Save identity", exact: true }),
          ).toBeEnabled();
        },
      },
    ],
    views: [
      {
        page,
        player: "Étoile",
        surface: "game",
        primary: [page.getByRole("button", { name: "Sign out", exact: true })],
      },
    ],
  });
  await story.step("sign-out", {
    description:
      "Étoile signs out and the entry surface removes private identity details.",
    actor: "Étoile",
    action: async () =>
      page.getByRole("button", { name: "Sign out", exact: true }).click(),
    acknowledgement: {
      spec: "Play returns after sign-out.",
      check: async () => expect(play).toBeVisible(),
    },
    verifications: [
      {
        spec: "The alias and identity control are absent from the signed-out DOM.",
        check: async () => {
          await expect(page.getByText("Étoile 🌌")).toHaveCount(0);
          await expect(
            page.getByRole("button", { name: "Your identity", exact: true }),
          ).toHaveCount(0);
        },
      },
    ],
    views: [{ page, player: "Étoile", surface: "game", primary: [play] }],
  });
});
