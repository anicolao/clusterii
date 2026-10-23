import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";

test("Shared commander and command instruments expose their real keyboard states", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const story = new TestStepHelper(info, {
    id: "galaxy-instrument-gallery",
    title: "Inspect shared commander and command instruments",
    inventory: ["UX-03", "UX-15", "UX-16"],
    description:
      "The developer gallery renders the actual CommanderDeck, CommanderPortrait, CommandControl and GameMenu. Its existing reducer-derived scenario is explicitly a component demonstration, not an authenticated campaign, admission or privacy claim. Keyboard and local preview outcomes are named separately from service acknowledgements.",
  });
  const deck = page.getByRole("region", {
    name: "Commander instrument gallery",
    exact: true,
  });
  const opener = deck.getByRole("button", {
    name: "Commander menu",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "Game menu", exact: true });
  const close = dialog.getByRole("button", {
    name: "Return to game",
    exact: true,
  });
  await story.step("open-shared-portrait-menu", {
    actor: "Gallery reviewer",
    description:
      "Read the actual commander deck, open its portrait menu with Enter, and traverse every modal control including both wrap boundaries.",
    action: async () => {
      await page.goto("./gallery/");
      await deck.scrollIntoViewIfNeeded();
      await opener.focus();
      await page.keyboard.press("Enter");
      await expect(
        dialog.getByRole("heading", { name: "Game menu", exact: true }),
      ).toBeFocused();
      for (const control of [
        dialog.getByRole("checkbox", { name: "Reduce motion", exact: true }),
        dialog.getByRole("checkbox", {
          name: "Lower galaxy detail",
          exact: true,
        }),
        dialog.getByRole("button", { name: "Rules", exact: true }),
        close,
        dialog.getByRole("checkbox", { name: "Reduce motion", exact: true }),
      ]) {
        await page.keyboard.press("Tab");
        await expect(control).toBeFocused();
      }
      await page.keyboard.press("Shift+Tab");
    },
    acknowledgement: {
      spec: "The actual native game menu contains focus at its final control.",
      check: async () => expect(close).toBeFocused(),
    },
    verifications: [
      {
        spec: "This is the browser-local presentation menu, not campaign navigation or a fabricated order.",
        check: async () =>
          expect(dialog).toContainText("saved in this browser"),
      },
    ],
    views: [
      {
        page,
        player: "Gallery reviewer",
        surface: "document",
        primary: [close],
      },
    ],
  });
  await story.step("return-to-commander-deck", {
    actor: "Gallery reviewer",
    description:
      "Escape restores the exact portrait opener. Read the own and peer controls; compact phone uses the own portrait while live Roster remains covered by the campaign story.",
    action: async () => page.keyboard.press("Escape"),
    acknowledgement: {
      spec: "The commander opener regains focus and the modal closes.",
      check: async () => {
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
      },
    },
    verifications: [
      {
        spec: "Responsive peer visibility and semantic cosmetic/faction labelling are retained.",
        check: async () => {
          await expect(opener).toHaveAttribute(
            "title",
            /Envoy 1.*Heliac Assembly.*portrait is cosmetic/,
          );
          await expect(
            deck.getByRole("button", { name: /^Inspect roster:/ }),
          ).toHaveCount(info.project.name === "phone" ? 0 : 3);
        },
      },
    ],
    views: [
      {
        page,
        player: "Gallery reviewer",
        surface: "document",
        primary: [opener],
      },
    ],
  });
  if (info.project.name !== "phone")
    await story.step("request-roster-example", {
      actor: "Gallery reviewer",
      description:
        "Activate a peer portrait through Space and observe the gallery callback acknowledgement, explicitly not a server receipt.",
      action: async () => {
        await deck
          .getByRole("button", {
            name: "Inspect roster: Envoy 2, Pelagic Concord",
            exact: true,
          })
          .focus();
        await page.keyboard.press("Space");
      },
      acknowledgement: {
        spec: "The actual deck delivers its roster callback.",
        check: async () =>
          expect(
            deck.getByRole("status", {
              name: "Portrait control demonstration",
            }),
          ).toHaveText("Roster requested by gallery control"),
      },
      verifications: [
        {
          spec: "The initiating peer control retains keyboard focus in this component demonstration.",
          check: async () =>
            expect(
              deck.getByRole("button", {
                name: "Inspect roster: Envoy 2, Pelagic Concord",
                exact: true,
              }),
            ).toBeFocused(),
        },
      ],
      views: [
        {
          page,
          player: "Gallery reviewer",
          surface: "document",
          primary: [opener],
        },
      ],
    });
  const commands = page.getByRole("region", {
    name: "Command control gallery",
    exact: true,
  });
  await story.step("select-shared-command", {
    actor: "Gallery reviewer",
    description:
      "Read all six shared command instruments and the disabled example, then select History with the keyboard.",
    action: async () => {
      await commands.scrollIntoViewIfNeeded();
      await commands
        .getByRole("button", { name: "history", exact: true })
        .focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "The local preview names History and exposes its current state to assistive technology.",
      check: async () => {
        await expect(
          commands.getByRole("status", {
            name: "Command selection demonstration",
          }),
        ).toHaveText("Selected command preview: history");
        await expect(
          commands.getByRole("button", { name: "history", exact: true }),
        ).toHaveAttribute("aria-current", "true");
      },
    },
    verifications: [
      {
        spec: "All real icon controls remain labelled; only one is current and the explicit disabled example cannot be activated.",
        check: async () => {
          await expect(commands.locator('[aria-current="true"]')).toHaveCount(
            1,
          );
          await expect(
            commands.getByRole("button", {
              name: "Disabled gallery example",
              exact: true,
            }),
          ).toBeDisabled();
          await expect(commands.getByRole("button")).toHaveCount(7);
        },
      },
    ],
    views: [
      {
        page,
        player: "Gallery reviewer",
        surface: "document",
        primary: [
          commands.getByRole("button", { name: "history", exact: true }),
        ],
      },
    ],
  });
  const atlas = page.getByRole("region", {
    name: "Cosmetic portrait atlas",
    exact: true,
  });
  await story.step("read-provenanced-portraits", {
    actor: "Gallery reviewer",
    description:
      "Read all eight cosmetic portrait tiles from the original approved atlas, rendered by the shared production portrait component.",
    action: async () => atlas.scrollIntoViewIfNeeded(),
    acknowledgement: {
      spec: "Eight labelled atlas tiles are rendered from the production portrait asset.",
      check: async () => {
        await expect(atlas.locator("figure")).toHaveCount(8);
        for (const id of ["G1", "G2", "M1", "M2", "A1", "A2", "O1", "O2"])
          await expect(
            atlas.getByText(`${id} · cosmetic portrait`, { exact: true }),
          ).toBeVisible();
      },
    },
    verifications: [
      {
        spec: "The atlas uses the existing provenanced image and every tile has a contained readable caption.",
        check: async () => {
          for (const img of await atlas.locator("img").all())
            await expect(img).toHaveAttribute("src", /\/art\/portraits\.webp$/);
          expect(
            await atlas.locator("figcaption").evaluateAll((elements) =>
              elements.every((e) => {
                const r = e.getBoundingClientRect();
                return (
                  r.top >= 0 &&
                  r.bottom <= innerHeight &&
                  r.left >= 0 &&
                  r.right <= innerWidth
                );
              }),
            ),
          ).toBe(true);
        },
      },
    ],
    views: [{ page, player: "Gallery reviewer", surface: "document" }],
  });
});
