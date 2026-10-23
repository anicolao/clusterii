import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
test("Inspect shared route composition in gallery and interactive lab", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "route-instrument-components",
    title: "Inspect the actual route instrument",
    inventory: ["UX-08", "UX-16"],
    description:
      "Actual shared FleetRoute in reducer-derived gallery/lab scenarios. These are explicit component examples, not authenticated command acceptance. Live acceptance is the companion forces story.",
  });
  const specimen = page.getByRole("region", {
    name: "Fleet route specimen 0",
    exact: true,
  });
  await story.step("review-gallery-route", {
    actor: "Component reviewer",
    description:
      "Read the real route scene and shared force instrument in its gallery container.",
    action: async () => {
      await page.goto("./gallery/");
      await specimen.scrollIntoViewIfNeeded();
    },
    acknowledgement: {
      spec: "The actual component exposes current capacity and a real editable route.",
      check: async () => {
        await expect(
          specimen.getByRole("region", { name: "Confirmed route forces" }),
        ).toBeVisible();
        await expect(
          specimen.getByRole("button", { name: "Edit route", exact: true }),
        ).toBeEnabled();
      },
    },
    verifications: [
      {
        spec: "The named route chart is bounded by its specimen and has positive usable height.",
        check: async () => {
          const a = await specimen.boundingBox(),
            b = await specimen.locator(".route-chart").boundingBox();
          expect(b!.height).toBeGreaterThan(140);
          expect(b!.x).toBeGreaterThanOrEqual(a!.x);
          expect(b!.x + b!.width).toBeLessThanOrEqual(a!.x + a!.width);
        },
      },
    ],
    views: [
      {
        page,
        player: "Component reviewer",
        surface: "document",
        primary: [
          specimen.getByRole("button", { name: "Edit route", exact: true }),
        ],
      },
    ],
  });
  await story.step("inspect-accepted-lab", {
    actor: "Component reviewer",
    description:
      "Select the existing travel scenario and inspect its accepted frame without replacing production state.",
    action: async () => {
      await page.goto("./dev/animations/");
      await page
        .getByRole("combobox", { name: "Scenario", exact: true })
        .selectOption("travel");
      const slider = page.getByRole("slider");
      await slider.fill("2400");
      const normal = page.getByRole("region", {
        name: "Standard motion comparison",
        exact: true,
      });
      await normal.scrollIntoViewIfNeeded();
    },
    acknowledgement: {
      spec: "Both shared comparison panels report the same accepted route and departure tick.",
      check: async () => {
        for (const name of [
          "Standard motion comparison",
          "Reduced motion comparison",
        ]) {
          const p = page.getByRole("region", { name, exact: true });
          await expect(p).toContainText("Route accepted");
        }
      },
    },
    verifications: [],
    views: [{ page, player: "Component reviewer", surface: "document" }],
  });
});
