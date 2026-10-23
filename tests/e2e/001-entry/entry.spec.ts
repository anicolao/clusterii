import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";

test("Learn the campaign and return to entry", async ({ page }, info) => {
  const story = new TestStepHelper(info, {
    id: "learn-and-return",
    title: "Learn the campaign and return to entry",
    description:
      "A new visitor reads each field-guide chapter, keeps keyboard focus through navigation, and returns without signing in or changing a campaign.",
    inventory: ["UX-01", "UX-15", "UX-16"],
  });
  const play = page.getByRole("button", { name: "Play", exact: true }),
    learn = page.getByRole("button", { name: "Learn the game", exact: true });
  await story.step("enter", {
    description: "The visitor arrives at Cluster and can choose Play or Learn.",
    actor: "Visitor",
    action: async () => page.goto("./"),
    acknowledgement: {
      spec: "The production entry surface is ready for input.",
      check: async () => expect(play).toBeEnabled(),
    },
    verifications: [
      {
        spec: "Learn is available and no private campaign or commander is shown.",
        check: async () => {
          await expect(learn).toBeEnabled();
          await expect(
            page.getByRole("button", { name: /^Continue / }),
          ).toHaveCount(0);
          await expect(
            page.getByRole("button", { name: "Your identity", exact: true }),
          ).toHaveCount(0);
        },
      },
    ],
    views: [
      { page, player: "Visitor", surface: "game", primary: [play, learn] },
    ],
  });
  await story.step("open-guide", {
    description:
      "The visitor opens Learn with the keyboard and reads the purpose of alliances.",
    actor: "Visitor",
    action: async () => {
      await learn.focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "The first chapter heading receives focus.",
      check: async () =>
        expect(
          page.getByRole("heading", {
            name: "No empire wins alone",
            exact: true,
          }),
        ).toBeFocused(),
    },
    verifications: [
      {
        spec: "The next chapter and return controls are available.",
        check: async () => {
          await expect(
            page.getByRole("button", { name: "Next chapter", exact: true }),
          ).toBeEnabled();
          await expect(
            page.getByRole("button", { name: "Return to entry", exact: true }),
          ).toBeEnabled();
        },
      },
    ],
    views: [
      {
        page,
        player: "Visitor",
        surface: "game",
        primary: [
          page.getByRole("button", { name: "Next chapter", exact: true }),
          page.getByRole("button", { name: "Return to entry", exact: true }),
        ],
      },
    ],
  });
  const chapters = [
    "Two fronts. One system.",
    "Build the means to prevail",
    "Information is influence",
  ];
  for (const [index, heading] of chapters.entries())
    await story.step(`chapter-${index + 2}`, {
      description: `The visitor reads “${heading}”.`,
      actor: "Visitor",
      action: async () =>
        page.getByRole("button", { name: "Next chapter", exact: true }).click(),
      acknowledgement: {
        spec: `The chapter “${heading}” is visible and focused.`,
        check: async () =>
          expect(
            page.getByRole("heading", { name: heading, exact: true }),
          ).toBeFocused(),
      },
      verifications: [
        {
          spec: "The guide remains a readable bounded surface with a return control.",
          check: async () =>
            expect(
              page.getByRole("button", {
                name: "Return to entry",
                exact: true,
              }),
            ).toBeEnabled(),
        },
      ],
      views: [
        {
          page,
          player: "Visitor",
          surface: "game",
          primary: [
            page.getByRole("button", { name: "Return to entry", exact: true }),
          ],
        },
      ],
    });
  await story.step("return", {
    description: "The visitor closes Learn and returns to its opening control.",
    actor: "Visitor",
    action: async () =>
      page
        .getByRole("button", { name: "Return to entry", exact: true })
        .click(),
    acknowledgement: {
      spec: "Focus returns to Learn.",
      check: async () => expect(learn).toBeFocused(),
    },
    verifications: [
      {
        spec: "Play is still available; learning did not sign in or create a campaign.",
        check: async () => {
          await expect(play).toBeEnabled();
          await expect(
            page.getByRole("button", { name: "Your identity", exact: true }),
          ).toHaveCount(0);
        },
      },
    ],
    views: [
      { page, player: "Visitor", surface: "game", primary: [play, learn] },
    ],
  });
});
