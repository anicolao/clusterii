import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";
import type { Locator } from "@playwright/test";

test("Research forecast gallery explains recorded costs effects and rate assumptions", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "research-forecast-gallery",
    title: "Read research costs and qualified completion estimates",
    inventory: ["UX-06", "UX-14", "UX-16"],
    description:
      "A developer inspects the shipped CampaignResearch component with reducer-derived research and science ledger specimens. Keyboard disclosure changes no campaign state. Component observations are not live service acknowledgements, scheduling or authorization acceptance.",
  });
  const view = (target: Locator, name: string): StoryView => ({
    page,
    player: `Developer · ${name}`,
    surface: "document",
    verifications: [
      {
        spec: "The full research forecast is contained after deliberate gallery scrolling, without horizontal document overflow.",
        check: async () => {
          await target.evaluate((e) => e.scrollIntoView({ block: "center" }));
          const box = await target.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.y).toBeGreaterThanOrEqual(0);
          expect(box!.y + box!.height).toBeLessThanOrEqual(
            page.viewportSize()!.height,
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        },
      },
    ],
  });
  await story.step("open-gallery", {
    actor: "Developer",
    description: "Read the developer gallery scope before inspecting research.",
    action: async () => {
      await page.goto("./gallery/");
    },
    acknowledgement: {
      spec: "The gallery explicitly says samples do not submit game commands.",
      check: async () =>
        expect(page.locator(".dev-shell > header")).toContainText(
          "Samples do not submit game commands.",
        ),
    },
    verifications: [
      {
        spec: "All five production research specimens are available by name.",
        check: async () => {
          for (const state of [
            "ready",
            "pending",
            "error",
            "disabled",
            "applied",
          ])
            await expect(
              page.getByRole("region", {
                name: `Research specimen ${state}`,
                exact: true,
              }),
            ).toBeVisible();
        },
      },
    ],
    views: [view(page.locator(".dev-shell > header"), "gallery scope")],
  });
  for (const [state, explanation] of [
    [
      "pending",
      "A research selection is awaiting acknowledgement or application",
    ],
    ["disabled", "Campaign paused. No completion estimate"],
    ["applied", "Estimated completion: 14 funded ticks"],
  ] as const) {
    const panel = page.getByRole("region", {
      name: `Research specimen ${state}`,
      exact: true,
    });
    const details = panel.locator("details.forecast"),
      summary = details.locator("summary");
    await story.step(`read-${state}-forecast`, {
      actor: "Developer",
      description: `Open the ${state} forecast with Enter and read the cost, exact effect and rate qualification.`,
      action: async () => {
        await summary.focus();
        await page.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The native disclosure opens and retains keyboard focus; this is a local presentation outcome.",
        check: async () => {
          await expect(details).toHaveAttribute("open", "");
          await expect(summary).toBeFocused();
        },
      },
      verifications: [
        {
          spec: "Investing costs 20 science, has the recorded 1.01 exponent, distinguishes construction dividends and explains the actual state.",
          check: async () => {
            await expect(details).toContainText("Level 1 costs 20 science");
            await expect(details).toContainText("power 1.01");
            await expect(details).toContainText(
              "Construction dividends are separate",
            );
            await expect(details).toContainText(explanation);
            if (state === "applied") {
              await expect(details).toContainText("18.6 more science");
              await expect(details).toContainText(
                "Assumes 1.4 science per tick",
              );
              await expect(details).toContainText("unchanged output");
              await expect(details).toContainText("Active research: investing");
              await expect(
                panel.getByRole("status", { name: "Applied research order" }),
              ).toContainText("applied at tick 1");
            } else await expect(panel.getByRole("radio")).toHaveCount(8);
          },
        },
      ],
      views: [view(details, `${state} forecast`)],
    });
    await story.step(`read-${state}-qualification`, {
      actor: "Developer",
      description:
        "Use End in the bounded forecast to read the rate qualification and active target without changing research.",
      action: async () => {
        const reading = details.getByRole("region", {
          name: "Research forecast details",
        });
        await reading.focus();
        await page.keyboard.press("End");
        await expect
          .poll(() =>
            reading.evaluate(
              (e) =>
                Math.abs(e.scrollHeight - e.clientHeight - e.scrollTop) < 1,
            ),
          )
          .toBe(true);
      },
      acknowledgement: {
        spec: "Keyboard focus stays in the forecast, which reaches its final active-target explanation.",
        check: async () => {
          await expect(
            details.getByRole("region", { name: "Research forecast details" }),
          ).toBeFocused();
        },
      },
      verifications: [
        {
          spec: "The final active-target paragraph is fully contained, with unchanged selected investing and genuine applied order status.",
          check: async () => {
            const reading = await details
              .getByRole("region", { name: "Research forecast details" })
              .boundingBox();
            const text = await details
              .getByText("Active research:", { exact: false })
              .boundingBox();
            expect(text!.y).toBeGreaterThanOrEqual(reading!.y);
            expect(text!.y + text!.height).toBeLessThanOrEqual(
              reading!.y + reading!.height,
            );
            await expect(
              panel.getByRole("radio", { name: /investing/ }),
            ).toBeChecked();
            if (state === "applied")
              await expect(
                panel.getByRole("status", { name: "Applied research order" }),
              ).toContainText("applied at tick 1");
          },
        },
      ],
      views: [view(details, `${state} qualification`)],
    });
    await story.step(`close-${state}-forecast`, {
      actor: "Developer",
      description:
        "Close the disclosure with Space, keeping focus and the selected research choice.",
      action: async () => {
        await summary.focus();
        await page.keyboard.press("Space");
      },
      acknowledgement: {
        spec: "The disclosure closes without queuing research.",
        check: async () => {
          await expect(details).not.toHaveAttribute("open", "");
          await expect(summary).toBeFocused();
        },
      },
      verifications: [
        {
          spec: "The investing radio remains selected.",
          check: async () =>
            expect(
              panel.getByRole("radio", { name: /investing/ }),
            ).toBeChecked(),
        },
      ],
      views: [view(summary, `${state} collapsed`)],
    });
  }
});
