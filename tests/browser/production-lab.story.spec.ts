import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";

test("Production lab distinguishes due time from confirmed output and preserves ledger outcomes", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "production-ledger-lab",
    title:
      "Read scheduled and confirmed production without advancing balances early",
    inventory: ["UX-06", "UX-14", "UX-16"],
    description:
      "A developer inspects the shipped CampaignEconomy component with the existing production-reducer lab scenario. Seeking is an explicit presentation harness, not authenticated production delivery, catch-up, authorization or conservation evidence. Standard and reduced motion retain identical facts; predecessor service and lab assertions remain intact.",
  });
  const panels = [
    "Standard motion comparison",
    "Reduced motion comparison",
  ].map((name) => page.getByRole("region", { name, exact: true }));
  const seek = page.getByLabel(/Inspect frame/);
  const ledger = (index: number) =>
    panels[index].getByRole("region", {
      name: "Production ledger",
      exact: true,
    });
  const schedule = (index: number) =>
    panels[index].getByRole("status", { name: "Production schedule" });
  const views = (
    part: "summary" | "reading" | "science" = "summary",
  ): StoryView[] =>
    panels.map((panel, index) => ({
      page,
      player: `Developer · ${index ? "reduced" : "standard"} production ${part}`,
      surface: "document",
      verifications: [
        {
          spec:
            part === "summary"
              ? "The labeled specimen, production schedule and available balance are contained in this upper document view."
              : part === "science"
                ? "The science result and progress bar are contained within the bounded ledger, alongside the return control."
                : "The bounded ledger and return control are visible in this lower document view; keyboard reading stays inside the ledger.",
          check: async () => {
            const science = panel.getByRole("region", {
              name: "Science progress",
            });
            if (part === "science")
              await science.evaluate((e) =>
                e.scrollIntoView({ block: "center" }),
              );
            const target =
              part === "summary"
                ? panel.getByRole("heading", {
                    name: index ? "Reduced motion" : "Standard motion",
                    exact: true,
                  })
                : panel.getByRole("button", { name: "Return to galaxy" });
            await target.evaluate((e, upper) => {
              e.scrollIntoView({ block: upper ? "start" : "end" });
              window.scrollBy(0, upper ? -24 : 24);
            }, part === "summary");
            for (const element of part === "summary"
              ? [target, schedule(index), panel.locator(".balance")]
              : [target, ledger(index)]) {
              await expect(element).toBeVisible();
              const box = await element.boundingBox();
              expect(box).not.toBeNull();
              expect(box!.y).toBeGreaterThanOrEqual(0);
              expect(box!.y + box!.height).toBeLessThanOrEqual(
                page.viewportSize()!.height,
              );
            }
            if (part === "science") {
              const outer = await ledger(index).boundingBox(),
                inner = await science.boundingBox();
              expect(inner).not.toBeNull();
              expect(outer).not.toBeNull();
              expect(inner!.y).toBeGreaterThanOrEqual(outer!.y);
              expect(inner!.y + inner!.height).toBeLessThanOrEqual(
                outer!.y + outer!.height,
              );
              await expect(science).toContainText(
                "Level 1 · 1.4 science of 40",
              );
              await expect(science.getByRole("progressbar")).toHaveAttribute(
                "value",
                "1400",
              );
            }
            await expect(ledger(index)).toHaveCSS("overflow-y", "auto");
          },
        },
      ],
    }));
  const balance = (value: string) => ({
    spec: `Both motion panes retain exactly ${value} available credits.`,
    check: async () => {
      for (const panel of panels)
        await expect(panel.locator(".balance strong")).toHaveText(value);
    },
  });
  await story.harness(
    "presentation-clock",
    "Freeze only browser playback. Existing shared reducers supply the declared component scenario; no service clock, live account or persisted campaign is replaced.",
    async () => {
      const instant = new Date("2026-01-01T12:00:00Z");
      await page.clock.install({ time: instant });
      await page.clock.pauseAt(new Date(instant.getTime() + 1000));
    },
  );
  for (const [id, time, message] of [
    ["scheduled", 0, "Next production:"],
    [
      "due",
      1200,
      "Awaiting next tick. Balances update when production is confirmed.",
    ],
    ["confirmed", 2400, "Next production:"],
  ] as const) {
    await story.step(id, {
      actor: "Developer",
      description:
        id === "scheduled"
          ? "Open production before the first deadline and inspect the unchanged starting balance."
          : id === "due"
            ? "Seek beyond the deadline; the schedule acknowledges waiting without prematurely awarding output."
            : "Seek to the reducer-confirmed tick and inspect its new balance and original ledger facts.",
      action: async () => {
        if (id === "scheduled") {
          await page.goto("./dev/animations/");
          await page
            .getByLabel("Scenario", { exact: true })
            .selectOption("production");
        }
        await seek.fill(String(time));
      },
      acknowledgement: {
        spec: `Both production schedules report “${message}” with identical text.`,
        check: async () => {
          await expect(schedule(0)).toContainText(message);
          await expect(schedule(1)).toHaveText(await schedule(0).innerText());
        },
      },
      verifications: [
        balance(id === "confirmed" ? "202.8" : "200"),
        {
          spec:
            id === "confirmed"
              ? "The first confirmed ledger reports 2.8 credits, no escrow, one fighter, one infantry and 1.4 science; research progress is 1400 milli-science."
              : "Neither due time nor motion mode invents a confirmed tick or production ledger.",
          check: async () => {
            for (const panel of panels) {
              await expect(panel).toContainText(
                id === "confirmed"
                  ? "Confirmed tick 1"
                  : "First production pending",
              );
              const output = panel.locator('dl[aria-label="Last production"]');
              if (id !== "confirmed") {
                await expect(output).toHaveCount(0);
                continue;
              }
              for (const [label, value] of [
                ["Credits received", "2.8"],
                ["Credits held in contested systems", "0"],
                ["Fighters trained", "1"],
                ["Infantry recruited", "1"],
                ["Science earned", "1.4"],
              ])
                await expect(
                  output
                    .locator("div")
                    .filter({ has: page.getByText(label, { exact: true }) })
                    .locator("dd"),
                ).toHaveText(value);
              await expect(
                panel.getByRole("progressbar", {
                  name: "Science towards next level",
                }),
              ).toHaveAttribute("value", "1400");
            }
          },
        },
      ],
      views: id === "confirmed" ? [...views(), ...views("science")] : views(),
    });
  }
  await story.step("read-ledger", {
    actor: "Developer",
    description:
      "Focus each actual ledger and press End to read science and split-control explanations while keeping Return to galaxy available.",
    action: async () => {
      for (let index = 0; index < panels.length; index++) {
        const region = ledger(index);
        await region.focus();
        await region.press("End");
        await expect
          .poll(() =>
            region.evaluate((e) =>
              Math.abs(e.scrollHeight - e.clientHeight - e.scrollTop),
            ),
          )
          .toBeLessThanOrEqual(1);
      }
    },
    acknowledgement: {
      spec: "Both ledgers expose the production rules disclosure and preserve the confirmed science outcome.",
      check: async () => {
        for (const panel of panels) {
          await expect(panel).toContainText(
            "Development campaign · Production rules remain under review.",
          );
          await expect(panel).toContainText("Level 1 · 1.4 science");
          await expect(
            panel.getByRole("button", { name: "Return to galaxy" }),
          ).toBeEnabled();
        }
      },
    },
    verifications: [
      balance("202.8"),
      {
        spec: "Reading does not change the inspected tick or transfer focus out of the last ledger.",
        check: async () => {
          await expect(seek).toHaveValue("2400");
          await expect(ledger(1)).toBeFocused();
        },
      },
    ],
    views: views("reading"),
  });
  await story.step("return-reset", {
    actor: "Developer",
    description:
      "Activate the real Return to galaxy callback with Enter. In this documented lab it resets the scenario, preserving production UI semantics without pretending to navigate a live campaign.",
    action: async () => {
      const button = panels[0].getByRole("button", {
        name: "Return to galaxy",
      });
      await button.focus();
      await button.press("Enter");
      for (let index = 0; index < panels.length; index++)
        await ledger(index).evaluate((e) => (e.scrollTop = 0));
    },
    acknowledgement: {
      spec: "The reset callback returns playback to zero and both panes to first-production pending.",
      check: async () => {
        await expect(seek).toHaveValue("0");
        for (const panel of panels)
          await expect(panel).toContainText("First production pending");
      },
    },
    verifications: [
      balance("200"),
      {
        spec: "Reset removes the prior ledger and restores the scheduled state in both motion panes.",
        check: async () => {
          for (let index = 0; index < panels.length; index++) {
            await expect(schedule(index)).toContainText("Next production:");
            await expect(
              panels[index].locator('dl[aria-label="Last production"]'),
            ).toHaveCount(0);
          }
        },
      },
    ],
    views: views(),
  });
});
