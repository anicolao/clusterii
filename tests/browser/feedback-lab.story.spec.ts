import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";

test("Feedback lab inspects reconnect, conflict and playback without changing outcomes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const story = new TestStepHelper(info, {
    id: "feedback-motion-lab",
    title: "Inspect shared feedback and compare reduced motion",
    inventory: ["UX-14", "UX-16"],
    description:
      "A developer inspects deterministic scenarios rendered by the shipped feedback, identity and animation components. These are explicitly component fixtures using production validation and copy, not live commands or service acceptance. The browser clock controls playback only; named paused animation frames are verified before unchanged exact pixel comparison.",
  });
  const standard = page.getByRole("region", {
    name: "Standard motion comparison",
    exact: true,
  });
  const reduced = page.getByRole("region", {
    name: "Reduced motion comparison",
    exact: true,
  });
  const seek = page.getByLabel(/Inspect frame/);
  const scenario = page.getByLabel("Scenario", { exact: true });
  const modes = [standard, reduced];
  const views = (role: "status" | "alert", time: number): StoryView[] =>
    modes.map((panel, index) => ({
      page,
      player: `Developer · ${index ? "reduced" : "standard"} motion`,
      surface: "document",
      motionInspection: [
        {
          selector: '[aria-label="Standard motion comparison"]',
          count: 1,
          time,
          duration: 180,
        },
        {
          selector: '[aria-label="Reduced motion comparison"]',
          count: 1,
          time: 180,
          duration: 180,
        },
      ],
      verifications: [
        {
          spec: "The inspected outcome is fully inside the viewport after deliberate reference-page scrolling.",
          check: async () => {
            const target = panel.getByRole(role);
            await panel.scrollIntoViewIfNeeded();
            await expect(target).toBeVisible();
            const box = await target.boundingBox();
            expect(box).not.toBeNull();
            expect(box!.y).toBeGreaterThanOrEqual(0);
            expect(box!.y + box!.height).toBeLessThanOrEqual(
              page.viewportSize()!.height,
            );
          },
        },
      ],
    }));
  const draft = {
    spec: "Both presentations retain the exact saved draft text.",
    check: async () => {
      for (const panel of modes)
        await expect(panel.getByLabel("Commander name")).toHaveValue(
          "Preserved draft",
        );
    },
  };
  const parity = (role: "status" | "alert", text: string) => ({
    spec: `Both motion presentations report “${text}” with identical text.`,
    check: async () => {
      await expect(standard.getByRole(role)).toContainText(text);
      await expect(reduced.getByRole(role)).toHaveText(
        await standard.getByRole(role).innerText(),
      );
    },
  });
  await story.harness(
    "presentation-clock",
    "Fix the browser presentation clock for deterministic replay and pause inspection; no service state exists in this component lab.",
    async () => {
      const instant = new Date("2026-01-01T12:00:00Z");
      await page.clock.install({ time: instant });
      await page.clock.pauseAt(new Date(instant.getTime() + 1000));
    },
  );
  await story.step("pending", {
    actor: "Developer",
    description:
      "Open the real animation lab and inspect the pending identity frame.",
    action: async () => {
      await page.goto("./dev/animations/");
      await scenario.selectOption("reconnect");
      await seek.fill("200");
    },
    acknowledgement: parity("status", "Sending your identity"),
    verifications: [draft],
    views: [
      {
        page,
        player: "Developer · playback controls",
        surface: "document",
        motionInspection: views("status", 180)[0].motionInspection,
        verifications: [
          {
            spec: "Playback and scenario controls are visible for the review action.",
            check: async () => {
              await page
                .getByRole("region", { name: "Playback controls" })
                .scrollIntoViewIfNeeded();
              await expect(scenario).toHaveValue("reconnect");
            },
          },
        ],
        primary: [
          page.getByRole("button", { name: "Replay", exact: true }),
          page.getByRole("button", { name: "Reset", exact: true }),
        ],
      },
      ...views("status", 180),
    ],
  });
  await story.step("interrupted", {
    actor: "Developer",
    description:
      "Seek into the interrupted connection and compare the real reveal animation with reduced motion.",
    action: async () => seek.fill("1100"),
    acknowledgement: parity("alert", "draft is preserved"),
    verifications: [
      draft,
      {
        spec: "Both presentations offer the reconnect remedy.",
        check: async () => {
          for (const panel of modes)
            await expect(
              panel.getByRole("button", { name: "Reconnect", exact: true }),
            ).toBeEnabled();
        },
      },
    ],
    views: views("alert", 100),
  });
  await story.step("reconnected", {
    actor: "Developer",
    description:
      "Use the production reconnect control to replay recovery, then inspect the accepted frame.",
    action: async () => {
      await standard
        .getByRole("button", { name: "Reconnect", exact: true })
        .click();
      await page.clock.runFor(1200);
      await expect(standard.getByRole("status")).toContainText(
        "Identity saved",
      );
      await seek.fill("3400");
    },
    acknowledgement: parity("status", "Identity saved"),
    verifications: [
      draft,
      {
        spec: "The connection alert clears in both presentations.",
        check: async () => {
          for (const panel of modes)
            await expect(panel.getByRole("alert")).toHaveCount(0);
        },
      },
    ],
    views: views("status", 180),
  });
  await story.step("conflict", {
    actor: "Developer",
    description:
      "Select the production revision-conflict scenario and inspect its distinct remedy.",
    action: async () => {
      await scenario.selectOption("conflict");
      await seek.fill("1400");
    },
    acknowledgement: parity("alert", "Another device"),
    verifications: [
      draft,
      {
        spec: "A revision conflict does not offer the network reconnect remedy.",
        check: async () => {
          for (const panel of modes)
            await expect(
              panel.getByRole("button", { name: "Reconnect", exact: true }),
            ).toHaveCount(0);
        },
      },
    ],
    views: views("alert", 180),
  });
  await story.step("replay-pause-inspect", {
    actor: "Developer",
    description:
      "Replay at quarter speed, pause and prove the frame stays fixed, then inspect the 90 ms reveal.",
    action: async () => {
      await scenario.selectOption("accepted");
      await page.getByLabel("Playback speed").selectOption("0.25");
      await page.getByRole("button", { name: "Replay", exact: true }).click();
      await page.clock.runFor(400);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      const held = await seek.inputValue();
      expect(Number(held)).toBeGreaterThan(0);
      expect(Number(held)).toBeLessThan(180);
      await page.clock.runFor(400);
      expect(await seek.inputValue()).toBe(held);
      await seek.fill("90");
    },
    acknowledgement: parity("status", "Sending your identity"),
    verifications: [
      draft,
      {
        spec: "The inspected frame is exactly 90 ms and quarter speed remains selected.",
        check: async () => {
          await expect(seek).toHaveValue("90");
          await expect(page.getByLabel("Playback speed")).toHaveValue("0.25");
          await expect(
            page.getByRole("button", { name: "Resume", exact: true }),
          ).toBeVisible();
        },
      },
    ],
    views: views("status", 90),
  });
  await story.step("reset", {
    actor: "Developer",
    description:
      "Reset playback to its explicit first frame without changing the pending outcome or draft.",
    action: async () =>
      page.getByRole("button", { name: "Reset", exact: true }).click(),
    acknowledgement: {
      spec: "Reset returns presentation time to zero and stops playback.",
      check: async () => {
        await expect(seek).toHaveValue("0");
        await expect(
          page.getByRole("button", { name: "Resume", exact: true }),
        ).toBeVisible();
      },
    },
    verifications: [draft, parity("status", "Sending your identity")],
    views: views("status", 0),
  });
});

test("Campaign feedback lab compares authoritative receipt presentations across motion modes", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "campaign-feedback-lab",
    title: "Compare campaign receipt presentation in the production lab",
    inventory: ["UX-02", "UX-14", "UX-16"],
    description:
      "A developer reviews deterministic campaign feedback produced by the shipped validation, receipt-copy and animation code. These component scenarios exercise presentation parity, not live campaign commands, authorization or migration workers. Each paused animation is declared explicitly; all images retain exact comparison.",
  });
  const modes = [
    "Standard motion comparison",
    "Reduced motion comparison",
  ] as const;
  for (const [index, [id, scenario, at, role, text]] of (
    [
      ["pending", "campaign-joined", 200, "status", "Awaiting acknowledgement"],
      ["stale-roster", "campaign-conflict", 1400, "alert", "roster changed"],
      [
        "seat-confirmed",
        "campaign-joined",
        1400,
        "status",
        "seat is confirmed",
      ],
      ["paused", "campaign-paused", 1400, "status", "Campaign paused"],
      [
        "resume-interrupted",
        "campaign-resumed",
        1200,
        "alert",
        "connection was interrupted",
      ],
      ["resumed", "campaign-resumed", 3400, "status", "Campaign resumed"],
      [
        "migration-verified",
        "campaign-migrated",
        1400,
        "status",
        "Encryption changed and verified",
      ],
    ] as const
  ).entries()) {
    const panels = modes.map((name) =>
      page.getByRole("region", { name, exact: true }),
    );
    await story.step(id, {
      actor: "Developer",
      description: `Select ${scenario} and inspect the acknowledged ${id} presentation in both motion modes.`,
      action: async () => {
        if (index === 0) await page.goto("./dev/animations/");
        await page
          .getByLabel("Scenario", { exact: true })
          .selectOption(scenario);
        await page.getByLabel(/Inspect frame/).fill(String(at));
      },
      acknowledgement: {
        spec: `The selected component scenario reports “${text}”.`,
        check: async () =>
          expect(panels[0].getByRole(role)).toContainText(text),
      },
      verifications: [
        {
          spec: "Reduced motion retains identical outcome text and the selected scenario remains explicit.",
          check: async () => {
            await expect(panels[1].getByRole(role)).toHaveText(
              await panels[0].getByRole(role).innerText(),
            );
            await expect(
              page.getByLabel("Scenario", { exact: true }),
            ).toHaveValue(scenario);
          },
        },
      ],
      views: panels.map((panel, i) => ({
        page,
        player: `Developer · ${i ? "reduced" : "standard"} campaign motion`,
        surface: "document" as const,
        motionInspection: modes.map((name) => ({
          selector: `[aria-label="${name}"]`,
          count: 1,
          time: 180,
          duration: 180,
        })),
        verifications: [
          {
            spec: "The labeled comparison and its full receipt are visible in the reference page.",
            check: async () => {
              await panel.scrollIntoViewIfNeeded();
              await expect(
                panel.getByRole("heading", {
                  name: i ? "Reduced motion" : "Standard motion",
                  exact: true,
                }),
              ).toBeVisible();
              const box = await panel.getByRole(role).boundingBox();
              expect(box).not.toBeNull();
              expect(box!.y).toBeGreaterThanOrEqual(0);
              expect(box!.y + box!.height).toBeLessThanOrEqual(
                page.viewportSize()!.height,
              );
            },
          },
        ],
      })),
    });
  }
});
