import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";

test("Shared faction composition preserves keyboard choices in both motion preferences", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "faction-composition-gallery",
    title: "Inspect the shared faction instrument",
    inventory: ["UX-02", "UX-03", "UX-16"],
    description:
      "The existing reducer-derived gallery roster exercises the real FactionPicker, art, radio controls and affinity matrix. It is a component demonstration, not a live seat or service acknowledgement. Live admission remains a separate genuine player journey.",
  });
  const group = page.getByRole("group", {
    name: "Interactive faction specimen",
    exact: true,
  });
  const choice = group.getByRole("radio", { name: /Vesper Synod/ });
  for (const motion of ["reduce", "no-preference"] as const) {
    await story.step(`choose-${motion}`, {
      actor: "Component reviewer",
      description: `Use the actual shared radios with ${motion} preference; full faction slots stay unavailable and the selected matrix comes from versioned rules.`,
      action: async () => {
        await page.emulateMedia({ reducedMotion: motion });
        await page.goto("./gallery/");
        await group.scrollIntoViewIfNeeded();
        await group.getByRole("radio", { name: /Heliac Assembly/ }).focus();
        await page.keyboard.press("ArrowDown");
      },
      acknowledgement: {
        spec: "The component acknowledges the keyboard selection without issuing a campaign command.",
        check: async () => {
          await expect(choice).toBeChecked();
          await expect(choice).toBeFocused();
        },
      },
      verifications: [
        {
          spec: "The full Pelagic quota is disabled, all four affinities remain present and the pending component retains disabled controls.",
          check: async () => {
            await expect(
              group.getByRole("radio", { name: /Pelagic Concord/ }),
            ).toBeDisabled();
            await expect(
              group
                .getByLabel("Production affinity by stellar class")
                .locator("dd"),
            ).toHaveCount(4);
            const pending = page.getByRole("group", {
              name: "Pending faction specimen",
              exact: true,
            });
            await expect(
              pending.getByRole("radio", { name: /Heliac Assembly/ }),
            ).toBeChecked();
            for (const radio of await pending.getByRole("radio").all())
              await expect(radio).toBeDisabled();
            expect(
              await page.evaluate(
                () => matchMedia("(prefers-reduced-motion: reduce)").matches,
              ),
            ).toBe(motion === "reduce");
          },
        },
      ],
      views: [
        {
          page,
          player: "Component reviewer",
          surface: "document",
          primary: [choice],
          normalMotion: motion === "no-preference",
        },
      ],
    });
    await story.step(`briefing-${motion}`, {
      actor: "Component reviewer",
      description:
        "Read the actual shared admission briefing and open its rules with the keyboard. This reducer-derived gallery is not a live campaign.",
      action: async () => {
        const summary = page
          .getByRole("region", { name: "Admission briefing", exact: true })
          .locator("summary");
        await summary.focus();
        await page.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The shared rules disclosure opens without claiming a seat.",
        check: async () =>
          expect(
            page
              .getByRole("region", { name: "Admission briefing", exact: true })
              .locator("details"),
          ).toHaveAttribute("open", ""),
      },
      verifications: [
        {
          spec: "Real rules and all four faction capacities remain in the shared component.",
          check: async () => {
            const briefing = page.getByRole("region", {
              name: "Admission briefing",
              exact: true,
            });
            await expect(
              briefing.getByText("Victory evaluation is not enabled", {
                exact: false,
              }),
            ).toBeVisible();
            await expect(briefing.getByRole("listitem")).toHaveCount(4);
          },
        },
      ],
      views: [
        {
          page,
          player: "Component reviewer",
          surface: "document",
          primary: [
            page
              .getByRole("region", { name: "Admission briefing", exact: true })
              .locator("summary"),
          ],
          normalMotion: motion === "no-preference",
        },
      ],
    });
  }
});
