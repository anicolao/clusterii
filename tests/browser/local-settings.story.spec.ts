import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";

test("Shared presentation settings retain local choices and accessible modal ownership", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const story = new TestStepHelper(info, {
    id: "local-presentation-settings",
    title: "Choose local presentation and return with keyboard focus",
    inventory: ["UX-15", "UX-16"],
    description:
      "A developer operates the actual shared game menu/settings in the gallery, reloads local choices, and inspects the existing shared feedback lab. These are acknowledged browser-local outcomes, not campaign receipts, galaxy rail/scene equivalence or performance evidence. No identity or emulator setup is used.",
  });
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  const dialog = page.getByRole("dialog", { name: "Game menu", exact: true });
  const motion = dialog.getByRole("checkbox", {
    name: "Reduce motion",
    exact: true,
  });
  const detail = dialog.getByRole("checkbox", {
    name: "Lower galaxy detail",
    exact: true,
  });
  const close = dialog.getByRole("button", {
    name: "Return to game",
    exact: true,
  });
  const open = async () => {
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Game menu", exact: true }),
    ).toBeFocused();
  };
  const reduced = (value: boolean) =>
    expect(page.locator("html")).toHaveAttribute(
      "data-reduce-motion",
      String(value),
    );
  const views = (): StoryView[] => [
    {
      page,
      player: "Developer · local settings",
      surface: "document",
      primary: [motion, detail, close],
    },
  ];
  const contained = {
    spec: "Both complete labelled controls and the close action are contained and readable before any auto-scroll.",
    check: async () => {
      for (const element of [
        motion.locator(".."),
        detail.locator(".."),
        close,
      ]) {
        const box = await element.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(
          page.viewportSize()!.width,
        );
        expect(box!.y + box!.height).toBeLessThanOrEqual(
          page.viewportSize()!.height,
        );
      }
    },
  };
  await story.step("open-and-contain", {
    actor: "Developer",
    description:
      "Open the shared menu with Enter and cycle every modal control with Tab and Shift+Tab.",
    action: async () => {
      await page.goto("./gallery/");
      await open();
      await page.keyboard.press("Tab");
      await expect(motion).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(detail).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(motion).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(close).toBeFocused();
    },
    acknowledgement: {
      spec: "The native modal owns focus and explains browser-local scope.",
      check: async () => {
        await expect(dialog).toContainText("saved in this browser");
        await expect(close).toBeFocused();
      },
    },
    verifications: [
      contained,
      {
        spec: "OS reduction applies even with the local checkbox off.",
        check: async () => {
          await expect(motion).not.toBeChecked();
          await expect(detail).not.toBeChecked();
          await reduced(true);
        },
      },
    ],
    views: views(),
  });
  await story.step("choose-local-reduction", {
    actor: "Developer",
    description:
      "With the device allowing motion, enable both local reductions through Space; then return to the capture environment.",
    action: async () => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await reduced(false);
      await page.keyboard.press("Tab");
      await expect(motion).toBeFocused();
      await page.keyboard.press("Space");
      await reduced(true);
      await page.keyboard.press("Tab");
      await expect(detail).toBeFocused();
      await page.keyboard.press("Space");
      await page.emulateMedia({ reducedMotion: "reduce" });
    },
    acknowledgement: {
      spec: "Both local choices are checked and persisted by the production settings code.",
      check: async () => {
        await expect(motion).toBeChecked();
        await expect(detail).toBeChecked();
        expect(
          await page.evaluate(() => [
            localStorage.getItem("cluster-reduce-motion"),
            localStorage.getItem("cluster-lower-galaxy-detail"),
          ]),
        ).toEqual(["true", "true"]);
      },
    },
    verifications: [
      contained,
      {
        spec: "Lower detail has a named local acknowledgement.",
        check: async () =>
          expect(
            dialog
              .getByRole("status")
              .filter({ hasText: "Lower galaxy detail" }),
          ).toHaveText("Lower galaxy detail is on."),
      },
    ],
    views: views(),
  });
  await story.step("reload-and-respect-device", {
    actor: "Developer",
    description:
      "Close with Escape, verify opener focus, reload and reopen the saved settings. Turn off the local motion override while the device still requests reduction.",
    action: async () => {
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(menu).toBeFocused();
      await page.reload();
      await open();
      await expect(motion).toBeChecked();
      await expect(detail).toBeChecked();
      await page.keyboard.press("Tab");
      await expect(motion).toBeFocused();
      await page.keyboard.press("Space");
    },
    acknowledgement: {
      spec: "The saved detail choice survives reload and OS reduction cannot be disabled locally.",
      check: async () => {
        await expect(motion).not.toBeChecked();
        await expect(detail).toBeChecked();
        await reduced(true);
        await expect(dialog).toContainText(
          "It stays reduced with either setting.",
        );
      },
    },
    verifications: [contained],
    views: views(),
  });
  await story.step("close-explicitly", {
    actor: "Developer",
    description:
      "Restore full decoration and explicitly return from the menu with Enter; keyboard focus returns to Menu.",
    action: async () => {
      await page.keyboard.press("Tab");
      await expect(detail).toBeFocused();
      await page.keyboard.press("Space");
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "The menu closes and restores its original opening control.",
      check: async () => {
        await expect(dialog).not.toBeVisible();
        await expect(menu).toBeFocused();
      },
    },
    verifications: [
      {
        spec: "Both explicit local overrides are now off; device reduction remains effective.",
        check: async () => {
          expect(
            await page.evaluate(() => [
              localStorage.getItem("cluster-reduce-motion"),
              localStorage.getItem("cluster-lower-galaxy-detail"),
            ]),
          ).toEqual(["false", "false"]);
          await reduced(true);
        },
      },
    ],
    views: [
      {
        page,
        player: "Developer · restored opener",
        surface: "document",
        primary: [menu],
      },
    ],
  });
  const names = ["Standard motion comparison", "Reduced motion comparison"];
  const panels = names.map((name) =>
    page.getByRole("region", { name, exact: true }),
  );
  await story.step("compare-shared-feedback", {
    actor: "Developer",
    description:
      "Open the existing feedback lab and seek the same accepted identity result in both paused motion presentations.",
    action: async () => {
      await page.goto("./dev/animations/");
      await page
        .getByLabel("Scenario", { exact: true })
        .selectOption("accepted");
      await page.getByLabel(/Inspect frame/).fill("1290");
    },
    acknowledgement: {
      spec: "Both actual Feedback components show the same accepted outcome.",
      check: async () => {
        await expect(panels[0].getByRole("status")).toContainText(
          "Identity saved",
        );
        await expect(panels[1].getByRole("status")).toHaveText(
          await panels[0].getByRole("status").innerText(),
        );
      },
    },
    verifications: [
      {
        spec: "Both accepted comparisons distinguish no recovery action from their successful Identity saved outcome.",
        check: async () => {
          for (const panel of panels) {
            await expect(
              panel.getByText("Feedback recovery · No action indicated", {
                exact: true,
              }),
            ).toBeVisible();
            await expect(panel).not.toContainText("Same outcome · none");
            await expect(panel.getByRole("status")).toContainText(
              "Identity saved",
            );
          }
        },
      },
      {
        spec: "The production menu is present in the shared lab; playback is paused and no live campaign is involved.",
        check: async () => {
          await expect(menu).toBeVisible();
          await expect(
            page.getByRole("button", { name: "Resume", exact: true }),
          ).toBeVisible();
        },
      },
    ],
    views: panels.map((panel, index): StoryView => ({
      page,
      player: `Developer · ${index ? "reduced" : "standard"} feedback`,
      surface: "document",
      motionInspection: names.map((name, mode) => ({
        selector: `[aria-label="${name}"]`,
        count: 1,
        time: mode ? 180 : 90,
        duration: 180,
      })),
      verifications: [
        {
          spec: "The named comparison and accepted outcome are wholly visible in their explicit reading view.",
          check: async () => {
            await panel.evaluate((element) =>
              element.scrollIntoView({ block: "center" }),
            );
            for (const element of [
              panel.getByRole("heading", {
                name: index ? "Reduced motion" : "Standard motion",
                exact: true,
              }),
              panel.getByRole("status"),
            ]) {
              const box = await element.boundingBox();
              expect(box).not.toBeNull();
              expect(box!.y).toBeGreaterThanOrEqual(0);
              expect(box!.y + box!.height).toBeLessThanOrEqual(
                page.viewportSize()!.height,
              );
            }
          },
        },
      ],
    })),
  });
});
