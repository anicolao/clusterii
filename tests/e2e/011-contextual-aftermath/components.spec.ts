import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { expectReadingTarget } from "../../browser/story-helpers/reading-target";
test("Inspect shared contextual aftermath in gallery and animation lab", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "contextual-aftermath-components",
    title: "Inspect the production aftermath instrument",
    inventory: ["UX-09", "UX-16"],
    description:
      "Explicit reducer-derived component scenarios exercise the real ArrivalReports. They do not replace authenticated live combat or private report acceptance.",
  });
  const specimen = page.getByRole("region", {
    name: "Arrival specimen 1200",
    exact: true,
  });
  await story.step("recorded-gallery-outcome", {
    actor: "Component reviewer",
    description:
      "Read the existing split-occupation specimen with its contextual return control and historical distinction.",
    action: async () => {
      await page.goto("./gallery/");
      await specimen.scrollIntoViewIfNeeded();
    },
    acknowledgement: {
      spec: "The actual shared component distinguishes its recorded outcome from current control.",
      check: async () => {
        await expect(
          specimen.getByRole("heading", { name: "Orbit secured", exact: true }),
        ).toBeVisible();
        await expect(specimen).toContainText("Current control may differ.");
      },
    },
    verifications: [
      {
        spec: "Context return and surface inspection remain entirely contained before any automatic capture scrolling.",
        check: async () => {
          for (const name of ["Back to system", "Inspect surface"])
            await expectReadingTarget(
              specimen.getByRole("button", { name, exact: true }),
            );
        },
      },
    ],
    views: [
      {
        page,
        player: "Component reviewer",
        surface: "document",
        primary: [
          specimen.getByRole("button", { name: "Back to system", exact: true }),
          specimen.getByRole("button", {
            name: "Inspect surface",
            exact: true,
          }),
        ],
      },
    ],
  });
  const names = ["Standard motion comparison", "Reduced motion comparison"];
  await story.step("inspect-lab-outcome", {
    actor: "Component reviewer",
    description:
      "Seek the existing arrivals scenario to1200ms. Compare the same report under actual normal and reduced shared feedback code.",
    action: async () => {
      await page.goto("./dev/animations/");
      await page
        .getByRole("combobox", { name: "Scenario", exact: true })
        .selectOption("arrivals");
      await page.getByRole("slider").fill("1290");
    },
    acknowledgement: {
      spec: "Both actual report components expose the same recorded split ownership and contextual return.",
      check: async () => {
        for (const name of names) {
          const p = page.getByRole("region", { name, exact: true });
          await expect(
            p.getByRole("heading", { name: "Orbit secured", exact: true }),
          ).toBeVisible();
          await expect(p).toContainText("Current control may differ.");
        }
      },
    },
    verifications: [
      {
        spec: "Paused inspection changes presentation, never the report's casualty or control facts.",
        check: async () => {
          const left = page.getByRole("region", {
              name: names[0],
              exact: true,
            }),
            right = page.getByRole("region", { name: names[1], exact: true });
          expect(await left.locator("dl.losses").innerText()).toBe(
            await right.locator("dl.losses").innerText(),
          );
          expect(await left.locator("dl.control").innerText()).toBe(
            await right.locator("dl.control").innerText(),
          );
        },
      },
    ],
    views: names.map((name) => ({
      page,
      player: name,
      surface: "document" as const,
      motionInspection: names.map((root, i) => ({
        selector: `[aria-label="${root}"]`,
        count: 2,
        time: i ? 180 : 90,
        duration: 180,
      })),
      primary: [
        page
          .getByRole("region", { name, exact: true })
          .getByRole("button", { name: "Inspect surface", exact: true }),
      ],
      verifications: [
        {
          spec: "The named comparison's outcome and persistent actions are visible together.",
          check: async () => {
            const p = page.getByRole("region", { name, exact: true });
            await p.locator(".arrival-instrument").scrollIntoViewIfNeeded();
            await expectReadingTarget(
              p.getByRole("heading", { name: "Orbit secured", exact: true }),
              false,
            );
            for (const label of ["Back to system", "Inspect surface"])
              await expectReadingTarget(
                p.getByRole("button", { name: label, exact: true }),
              );
          },
        },
      ],
    })),
  });
});
