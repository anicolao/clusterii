import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";

test("History lab retries loading and inspects recovered records without changing motion outcomes", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "history-recovery-lab",
    title: "Inspect history loading, recovery and bounded record reading",
    inventory: ["UX-12", "UX-14", "UX-16"],
    description:
      "A developer uses the actual CampaignHistory component with the existing reducer-derived lab records. Browser time controls presentation only; these deterministic specimens are not network recovery, recipient authorization, pagination or hosted service evidence. The live history story remains separate.",
  });
  const names = ["Standard motion comparison", "Reduced motion comparison"];
  const panels = names.map((name) =>
    page.getByRole("region", { name, exact: true }),
  );
  const seek = page.getByLabel(/Inspect frame/);
  const views = (time = 180): StoryView[] =>
    panels.map((panel, index) => ({
      page,
      player: `Developer · ${index ? "reduced" : "standard"} history presentation`,
      surface: "document",
      motionInspection: names.map((name, mode) => ({
        selector: `[aria-label="${name}"]`,
        count: 1,
        time: mode ? 180 : time,
        duration: 180,
      })),
      verifications: [
        {
          spec: "The labeled history specimen and footer remain contained while records scroll in their own bounded region.",
          check: async () => {
            await panel.evaluate((e) => e.scrollIntoView({ block: "center" }));
            const box = await panel.boundingBox();
            expect(box).not.toBeNull();
            expect(box!.y).toBeGreaterThanOrEqual(0);
            expect(box!.y + box!.height).toBeLessThanOrEqual(
              page.viewportSize()!.height,
            );
            await expect(
              panel.getByRole("heading", {
                name: index ? "Reduced motion" : "Standard motion",
                exact: true,
              }),
            ).toBeVisible();
            await expect(
              panel.getByRole("button", { name: "Return to galaxy" }),
            ).toBeVisible();
            await expect(
              panel.getByRole("region", { name: "Saved campaign records" }),
            ).toHaveCSS("overflow-y", "auto");
          },
        },
      ],
    }));
  const sameFeedback = (role: "status" | "alert", text: string) => ({
    spec: `Both motion panes report “${text}” identically.`,
    check: async () => {
      await expect(panels[0].getByRole(role)).toHaveText(text);
      await expect(panels[1].getByRole(role)).toHaveText(
        await panels[0].getByRole(role).innerText(),
      );
    },
  });
  const empty = {
    spec: "No records are presented as recovered while loading or interrupted.",
    check: async () => {
      for (const panel of panels)
        await expect(panel.locator("summary")).toHaveCount(0);
    },
  };
  await story.harness(
    "presentation-clock",
    "Freeze browser playback only; no authenticated campaign, remote reads or service clock are replaced.",
    async () => {
      const instant = new Date("2026-01-01T12:00:00Z");
      await page.clock.install({ time: instant });
      await page.clock.pauseAt(new Date(instant.getTime() + 1000));
    },
  );
  await story.step("loading", {
    actor: "Developer",
    description:
      "Open the history scenario and inspect pending loading without invented records.",
    action: async () => {
      await page.goto("./dev/animations/");
      await page
        .getByLabel("Scenario", { exact: true })
        .selectOption("history-recovery");
      await seek.fill("200");
    },
    acknowledgement: sameFeedback("status", "Loading campaign records…"),
    verifications: [
      empty,
      {
        spec: "Latest is disabled while the return control remains available.",
        check: async () => {
          for (const panel of panels) {
            await expect(
              panel.getByRole("button", { name: "Latest records" }),
            ).toBeDisabled();
            await expect(
              panel.getByRole("button", { name: "Return to galaxy" }),
            ).toBeEnabled();
          }
        },
      },
    ],
    views: views(),
  });
  await story.step("interrupted", {
    actor: "Developer",
    description:
      "Seek to interrupted recovery and read the retry remedy in both panes.",
    action: async () => {
      await seek.fill("1400");
    },
    acknowledgement: sameFeedback(
      "alert",
      "History could not be recovered. Retry keeps your place.",
    ),
    verifications: [
      empty,
      {
        spec: "Retry is a named enabled control and records are not replaced with a false empty-history result.",
        check: async () => {
          for (const panel of panels) {
            await expect(
              panel.getByRole("button", { name: "Retry history" }),
            ).toBeEnabled();
            await expect(panel).not.toContainText(
              "No campaign records are available.",
            );
          }
        },
      },
    ],
    views: views(),
  });
  await story.step("retry", {
    actor: "Developer",
    description:
      "Activate the standard pane's real retry callback by keyboard and inspect its loading frame.",
    action: async () => {
      const retry = panels[0].getByRole("button", { name: "Retry history" });
      await retry.focus();
      await retry.press("Enter");
    },
    acknowledgement: sameFeedback("status", "Loading campaign records…"),
    verifications: [
      empty,
      {
        spec: "The callback advances the lab to retry time and removes the stale error while latest remains disabled.",
        check: async () => {
          await expect(seek).toHaveValue("2200");
          for (const panel of panels) {
            await expect(panel.getByRole("alert")).toHaveCount(0);
            await expect(
              panel.getByRole("button", { name: "Latest records" }),
            ).toBeDisabled();
          }
        },
      },
    ],
    views: views(0),
  });
  await story.step("recovered", {
    actor: "Developer",
    description:
      "Seek to the recovered frame and inspect both original record identities and distinct paused/assembling descriptions.",
    action: async () => {
      await seek.fill("3400");
    },
    acknowledgement: {
      spec: "Both panes expose record three and record two, with no loading or error.",
      check: async () => {
        for (const panel of panels) {
          await expect(panel.locator("summary")).toHaveCount(2);
          await expect(panel.getByRole("status")).toHaveCount(0);
          await expect(panel).not.toContainText("Loading campaign records…");
          await expect(panel.getByRole("alert")).toHaveCount(0);
          await expect(
            panel.locator('details[aria-label="Campaign record 3"] summary'),
          ).toContainText("Campaign paused");
          await expect(
            panel.locator('details[aria-label="Campaign record 2"] summary'),
          ).toContainText("Assembling empires");
        }
      },
    },
    verifications: [
      {
        spec: "Recovery enables latest and identifies the beginning of available history without inventing earlier records.",
        check: async () => {
          for (const panel of panels) {
            await expect(
              panel.getByRole("button", { name: "Latest records" }),
            ).toBeEnabled();
            await expect(panel).toContainText(
              "Beginning of your available history.",
            );
            await expect(
              panel.getByRole("button", { name: "Earlier records" }),
            ).toHaveCount(0);
          }
        },
      },
    ],
    views: views(),
  });
  await story.step("read-records", {
    actor: "Developer",
    description:
      "Open both actual record disclosures with Enter and use the bounded record region's keyboard scrolling.",
    action: async () => {
      for (const panel of panels) {
        for (const revision of [3, 2]) {
          const summary = panel.locator(
            `details[aria-label="Campaign record ${revision}"] summary`,
          );
          await summary.focus();
          await summary.press("Enter");
        }
        const region = panel.getByRole("region", {
          name: "Saved campaign records",
        });
        await region.focus();
        await region.press("End");
        await expect
          .poll(async () =>
            region.evaluate((e) =>
              Math.abs(e.scrollHeight - e.clientHeight - e.scrollTop),
            ),
          )
          .toBeLessThanOrEqual(1);
      }
    },
    acknowledgement: {
      spec: "Both records retain their campaign name, one commander and original revision identities.",
      check: async () => {
        for (const panel of panels) {
          for (const revision of [3, 2]) {
            const record = panel.locator(
              `details[aria-label="Campaign record ${revision}"]`,
            );
            await expect(record).toHaveAttribute("open", "");
            await expect(record).toContainText("1 / 4 empires · Lab scenario");
            await expect(record.getByRole("listitem")).toHaveText("Envoy");
          }
        }
      },
    },
    verifications: [
      {
        spec: "The focused record region is bounded and reading never changes the scenario time or adds records.",
        check: async () => {
          await expect(
            panels[1].getByRole("region", { name: "Saved campaign records" }),
          ).toBeFocused();
          await expect(seek).toHaveValue("3400");
          for (const panel of panels)
            await expect(panel.locator("summary")).toHaveCount(2);
        },
      },
    ],
    views: views(),
  });
  await story.step("latest", {
    actor: "Developer",
    description:
      "Request latest through the real component callback and recover the declared lab loading state.",
    action: async () => {
      const latest = panels[0].getByRole("button", { name: "Latest records" });
      await latest.focus();
      await latest.press("Enter");
    },
    acknowledgement: sameFeedback("status", "Loading campaign records…"),
    verifications: [
      empty,
      {
        spec: "Latest resets playback to zero and disables repeat loading while leaving return available.",
        check: async () => {
          await expect(seek).toHaveValue("0");
          for (const panel of panels) {
            await expect(
              panel.getByRole("button", { name: "Latest records" }),
            ).toBeDisabled();
            await expect(
              panel.getByRole("button", { name: "Return to galaxy" }),
            ).toBeEnabled();
          }
        },
      },
    ],
    views: views(0),
  });
});
