import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";
import type { Page } from "@playwright/test";
const modes = [
  "Standard motion comparison",
  "Reduced motion comparison",
] as const;
const panel = (page: Page, mode: number) =>
  page.getByRole("region", { name: modes[mode], exact: true });
const views = (page: Page, animationTime?: number): StoryView[] =>
  modes.map((name, index) => ({
    page,
    player: `Developer · ${index ? "reduced" : "standard"} lifecycle presentation`,
    surface: "document",
    motionInspection:
      animationTime === undefined
        ? undefined
        : modes.map((name, mode) => ({
            selector: `[aria-label="${name}"]`,
            count: 1,
            time: mode ? 180 : animationTime,
            duration: 180,
          })),
    verifications: [
      {
        spec: "The whole labeled specimen and outcome fit inside the reference viewport.",
        check: async () => {
          const specimen = panel(page, index);
          await specimen.evaluate((e) =>
            e.scrollIntoView({ block: "center", inline: "nearest" }),
          );
          const box = await specimen.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.y).toBeGreaterThanOrEqual(0);
          expect(box!.y + box!.height).toBeLessThanOrEqual(
            page.viewportSize()!.height,
          );
          await expect(
            specimen.getByRole("heading", {
              name: index ? "Reduced motion" : "Standard motion",
              exact: true,
            }),
          ).toBeVisible();
        },
      },
    ],
  }));
const parity = (page: Page, text: string) => ({
  spec: `Both production presentations report “${text}” with identical text.`,
  check: async () => {
    await expect(panel(page, 0).getByRole("status")).toContainText(text);
    await expect(panel(page, 1).getByRole("status")).toHaveText(
      await panel(page, 0).getByRole("status").innerText(),
    );
  },
});
async function presentationClock(page: Page) {
  const instant = new Date("2026-01-01T12:00:00Z");
  await page.clock.install({ time: instant });
  await page.clock.pauseAt(new Date(instant.getTime() + 1000));
}

test("Lifecycle lab distinguishes scheduled, delayed and assigned start presentations", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "scheduled-start-lab",
    title:
      "Inspect scheduled start and delayed assignment without changing outcomes",
    inventory: ["UX-02", "UX-14", "UX-16"],
    description:
      "A developer inspects the actual CampaignStartStatus component with explicit deterministic laboratory frames. Scheduled, delayed and begun copy match across the comparison panes. This fixture is not scheduler delivery, roster assignment, hosted timing or service acceptance; the independent multiplayer story supplies separately scoped service evidence.",
  });
  await story.harness(
    "presentation-clock",
    "Freeze only browser presentation time. The lab's declared scheduled-frame input selects the status; no live campaign or scheduler is invoked.",
    async () => presentationClock(page),
  );
  for (const [i, [id, time, text, description]] of (
    [
      [
        "scheduled",
        0,
        "Starts",
        "Read the scheduled start and server-assignment explanation.",
      ],
      [
        "delayed",
        1100,
        "Awaiting home assignment",
        "Seek past the scheduled boundary and read the preserved-seat delay message.",
      ],
      [
        "assigned",
        3300,
        "Began",
        "Seek to the assigned frame and distinguish begun status from pending assignment.",
      ],
      [
        "reset",
        0,
        "Starts",
        "Reset the lab to the same scheduled presentation without inventing another campaign.",
      ],
    ] as const
  ).entries()) {
    await story.step(id, {
      actor: "Developer",
      description,
      action: async () => {
        if (i === 0) {
          await page.goto("./dev/animations/");
          await page
            .getByLabel("Scenario", { exact: true })
            .selectOption("campaign-start");
        }
        if (id === "reset")
          await page
            .getByRole("button", { name: "Reset", exact: true })
            .click();
        else await page.getByLabel(/Inspect frame/).fill(String(time));
      },
      acknowledgement: parity(page, text),
      verifications: [
        {
          spec: "The scenario and inspected time remain explicit; no interactive campaign orders are offered by these status specimens.",
          check: async () => {
            await expect(
              page.getByLabel("Scenario", { exact: true }),
            ).toHaveValue("campaign-start");
            await expect(page.getByLabel(/Inspect frame/)).toHaveValue(
              String(time),
            );
            for (let mode = 0; mode < 2; mode++) {
              await expect(panel(page, mode).getByRole("button")).toHaveCount(
                0,
              );
              if (id === "delayed")
                await expect(panel(page, mode)).toContainText(
                  "Your seat is saved",
                );
              if (id === "assigned")
                await expect(panel(page, mode)).not.toContainText(
                  "Awaiting home assignment",
                );
            }
          },
        },
      ],
      views: views(page),
    });
  }
});

test("Lifecycle lab preserves session-ending disclosure and inspects completed motion", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "session-ending-lab",
    title: "Inspect pending and ended session presentations",
    inventory: ["UX-14", "UX-16"],
    description:
      "A developer inspects the shipped SessionSecurity and Feedback components. Pending controls disclose draft/order consequences; ended feedback reveals through the shared animation and has the same result under reduced motion. The browser clock and scenario frames are explicit component fixtures, not authentication, credential revocation or multi-device service evidence.",
  });
  await story.harness(
    "presentation-clock",
    "Freeze browser playback only. The session-ending specimen never authenticates or revokes a real account; live account recovery remains separately tested.",
    async () => presentationClock(page),
  );
  for (const [i, [id, time, description]] of (
    [
      [
        "pending",
        100,
        "Inspect the disabled ending control and the complete consequences of ending sessions.",
      ],
      [
        "ended-reveal",
        1250,
        "Seek 50ms into the actual ended-feedback reveal and compare immediate reduced motion.",
      ],
      [
        "ended-settled",
        1400,
        "Inspect the completed reveal without changing the signed-out outcome.",
      ],
      [
        "reset",
        0,
        "Reset the lab and recover the same pending disclosure and disabled control.",
      ],
    ] as const
  ).entries()) {
    const ended = time >= 1200;
    await story.step(id, {
      actor: "Developer",
      description,
      action: async () => {
        if (i === 0) {
          await page.goto("./dev/animations/");
          await page
            .getByLabel("Scenario", { exact: true })
            .selectOption("session-ended");
        }
        if (id === "reset")
          await page
            .getByRole("button", { name: "Reset", exact: true })
            .click();
        else await page.getByLabel(/Inspect frame/).fill(String(time));
      },
      acknowledgement: parity(
        page,
        ended
          ? "Your session ended. Sign in to continue."
          : "Keep this window open while your sessions end.",
      ),
      verifications: [
        {
          spec: ended
            ? "Both modes remove the pending account control and retain the selected ended frame."
            : "Both modes disclose saved identity, cancelled unacknowledged orders and cleared unsaved drafts while the ending action is disabled.",
          check: async () => {
            await expect(
              page.getByLabel("Scenario", { exact: true }),
            ).toHaveValue("session-ended");
            await expect(page.getByLabel(/Inspect frame/)).toHaveValue(
              String(time),
            );
            for (let mode = 0; mode < 2; mode++) {
              const specimen = panel(page, mode);
              if (ended) {
                await expect(specimen.getByRole("button")).toHaveCount(0);
                await expect(specimen).not.toContainText(
                  "Keep this window open",
                );
              } else {
                await expect(
                  specimen.getByRole("button", {
                    name: "Ending sessions…",
                    exact: true,
                  }),
                ).toBeDisabled();
                await expect(specimen).toContainText(
                  "Your saved identity and campaigns remain.",
                );
                await expect(specimen).toContainText(
                  "Unacknowledged orders may be cancelled",
                );
                await expect(specimen).toContainText(
                  "unsaved drafts on those devices will be cleared",
                );
              }
            }
          },
        },
      ],
      views: views(page, ended ? Math.min(180, time - 1200) : undefined),
    });
  }
});
