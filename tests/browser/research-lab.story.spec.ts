import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";

test("Research lab preserves selection through pending, recovery, scheduling and application", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "research-selection-lab",
    title: "Inspect research selection, acknowledgement and applied history",
    inventory: ["UX-06", "UX-14", "UX-16"],
    description:
      "A developer uses the shipped CampaignResearch component and shared reducer-derived lab scenario. Browser playback is a component fixture, not live order admission, production delivery or authorization evidence. Both motion modes retain the same outcome; the existing service journey remains separate.",
  });
  const names = ["Standard motion comparison", "Reduced motion comparison"];
  const panels = names.map((name) =>
    page.getByRole("region", { name, exact: true }),
  );
  const seek = page.getByLabel(/Inspect frame/);
  const views = (role: "status" | "alert", time = 180): StoryView[] =>
    panels.flatMap((panel, index) =>
      ["selection", "outcome"].map((part): StoryView => ({
        page,
        player: `Developer · ${index ? "reduced" : "standard"} research ${part}`,
        surface: "document",
        motionInspection: names.map((name, mode) => ({
          selector: `[aria-label="${name}"]`,
          count: 1,
          time: mode ? 180 : time,
          duration: 180,
        })),
        verifications: [
          {
            spec:
              part === "selection"
                ? "The labeled specimen and research heading are visible in this explicit upper document view."
                : "The commitment control and complete outcome are contained in this explicit lower document view.",
            check: async () => {
              const feedback = panel
                .getByRole(role)
                .filter({ hasNot: page.locator(".track") });
              const target =
                part === "selection"
                  ? panel.getByRole("heading", {
                      name: index ? "Reduced motion" : "Standard motion",
                      exact: true,
                    })
                  : feedback;
              await target.evaluate((e, upper) => {
                e.scrollIntoView({ block: upper ? "start" : "center" });
                if (upper) window.scrollBy(0, -24);
              }, part === "selection");
              const checked =
                part === "selection"
                  ? [
                      target,
                      panel.getByRole("heading", {
                        name: "Direct your science",
                      }),
                    ]
                  : [
                      target,
                      panel.getByRole("group", {
                        name: "Research acknowledgement",
                      }),
                    ];
              for (const element of checked) {
                await expect(element).toBeVisible();
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
    );
  await story.harness(
    "presentation-clock",
    "Freeze browser playback only. The scenario calls the existing production reducers with its declared lab data; no campaign service or live account is invoked.",
    async () => {
      const instant = new Date("2026-01-01T12:00:00Z");
      await page.clock.install({ time: instant });
      await page.clock.pauseAt(new Date(instant.getTime() + 1000));
    },
  );
  for (const [id, time, role, text] of [
    ["pending", 200, "status", "Awaiting acknowledgement"],
    ["interrupted", 1400, "alert", "preserved"],
    ["scheduled", 2400, "status", "Research order accepted"],
    ["applied", 3400, "status", "Research applied at tick 1"],
  ] as const) {
    await story.step(id, {
      actor: "Developer",
      description: `Inspect the ${id} research frame and compare both motion presentations.`,
      action: async () => {
        if (id === "pending") {
          await page.goto("./dev/animations/");
          await page
            .getByLabel("Scenario", { exact: true })
            .selectOption("research");
        }
        await seek.scrollIntoViewIfNeeded();
        await seek.focus();
        const scrollBefore = await page.evaluate(() => window.scrollY);
        await seek.fill(String(time));
        await expect(seek).toBeFocused();
        await expect
          .poll(() => page.evaluate(() => window.scrollY))
          .toBe(scrollBefore);
      },
      acknowledgement: {
        spec: `Both component feedback panels report “${text}”.`,
        check: async () => {
          const outcomes = panels.map((panel) =>
            panel.getByRole(role).filter({ hasNot: page.locator(".track") }),
          );
          await expect(outcomes[0]).toContainText(text);
          await expect(outcomes[1]).toHaveText(await outcomes[0].innerText());
        },
      },
      verifications: [
        {
          spec: "Pending disables selection; recovery offers retry; accepted and applied orders remain distinct with the exact investing tick.",
          check: async () => {
            for (const panel of panels) {
              await expect(panel.getByRole("radio")).toHaveCount(8);
              await expect(panel).toContainText(
                "Development research rules remain under review.",
              );
              if (id === "pending") {
                await expect(
                  panel.getByRole("button", {
                    name: "Awaiting acknowledgement…",
                    exact: true,
                  }),
                ).toBeDisabled();
                for (const radio of await panel.getByRole("radio").all())
                  await expect(radio).toBeDisabled();
              }
              if (id === "interrupted")
                await expect(
                  panel.getByRole("button", { name: "Retry acknowledgement" }),
                ).toBeEnabled();
              if (id === "scheduled" || id === "applied") {
                const selected = panel.getByRole("radio", {
                  name: /investing/,
                });
                await expect(selected).toBeChecked();
                const bounds = await selected.evaluate((input) => {
                  const row = input.closest("label")!;
                  const reader = row.closest(".research-tracks")!;
                  const r = row.getBoundingClientRect();
                  const c = reader.getBoundingClientRect();
                  return {
                    top: r.top,
                    bottom: r.bottom,
                    clipTop: c.top + reader.clientTop,
                    clipBottom: c.top + reader.clientTop + reader.clientHeight,
                  };
                });
                expect(bounds.top).toBeGreaterThanOrEqual(bounds.clipTop);
                expect(bounds.bottom).toBeLessThanOrEqual(bounds.clipBottom);
              }
              if (id === "scheduled") {
                await expect(
                  panel.getByRole("region", {
                    name: "Accepted research orders",
                  }),
                ).toContainText("Tick 1 · investing");
                await expect(
                  panel.getByRole("status", { name: "Applied research order" }),
                ).toHaveCount(0);
              }
              if (id === "applied") {
                await expect(
                  panel.getByRole("region", {
                    name: "Accepted research orders",
                  }),
                ).toHaveCount(0);
                await expect(
                  panel.getByRole("status", { name: "Applied research order" }),
                ).toHaveText("investing applied at tick 1.");
              }
            }
          },
        },
      ],
      views: views(role),
    });
  }
  await story.step("applied-history", {
    actor: "Developer",
    description:
      "Open the actual applied-selection disclosure by keyboard in both panes.",
    action: async () => {
      for (const panel of panels) {
        const summary = panel.locator("summary");
        await summary.focus();
        await summary.press("Enter");
      }
    },
    acknowledgement: {
      spec: "Both opened histories identify the applied investing order at tick one.",
      check: async () => {
        for (const panel of panels) {
          await expect(panel.locator("details")).toHaveAttribute("open", "");
          await expect(panel.locator("details ol")).toContainText(
            "Tick 1 · investing",
          );
        }
      },
    },
    verifications: [
      {
        spec: "The applied history does not reintroduce an outstanding order.",
        check: async () => {
          for (const panel of panels)
            await expect(
              panel.getByRole("region", { name: "Accepted research orders" }),
            ).toHaveCount(0);
        },
      },
    ],
    views: views("status"),
  });
  await story.step("queue-preserved-choice", {
    actor: "Developer",
    description:
      "Choose investing and activate Queue by keyboard. The lab resets to pending while the actual component retains its choice and moves focus to acknowledgement.",
    action: async () => {
      await panels[0].getByRole("radio", { name: /investing/ }).check();
      const queue = panels[0].getByRole("button", {
        name: "Queue investing",
        exact: true,
      });
      await queue.focus();
      await queue.press("Enter");
    },
    acknowledgement: {
      spec: "The component retains investing, disables repeat submission and focuses the acknowledgement group.",
      check: async () => {
        await expect(
          panels[0].getByRole("radio", { name: /investing/ }),
        ).toBeChecked();
        await expect(
          panels[0].getByRole("button", { name: "Awaiting acknowledgement…" }),
        ).toBeDisabled();
        await expect(
          panels[0].getByRole("group", { name: "Research acknowledgement" }),
        ).toBeFocused();
        await expect(seek).toHaveValue("0");
      },
    },
    verifications: [
      {
        spec: "Reset removes applied history and the retained choice remains a local component selection, not a new acknowledged order.",
        check: async () => {
          for (const panel of panels) {
            await expect(
              panel.getByRole("status", { name: "Applied research order" }),
            ).toHaveCount(0);
            await expect(
              panel.getByRole("region", { name: "Accepted research orders" }),
            ).toHaveCount(0);
          }
        },
      },
    ],
    views: views("status", 0),
  });
});
