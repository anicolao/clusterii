import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";

test("Sharing lab preserves selected-history consent and disclosure across motion modes", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "selected-history-lab",
    title: "Inspect selected-history consent before and after acceptance",
    inventory: ["UX-10", "UX-14", "UX-16"],
    description:
      "A developer inspects the recipient's invitation and accepted projections in the shipped Conversations component. The existing lab scenario derives these views through shared conversation reducers. Timeline seeking is explicitly a presentation harness, not a delivered accept command, authenticated recipient grant or end-to-end encryption proof. Its command callbacks remain inert; the live privacy/service assertions remain separate and unchanged.",
  });
  const names = ["Standard motion comparison", "Reduced motion comparison"];
  const panels = names.map((name) =>
    page.getByRole("region", { name, exact: true }),
  );
  const seek = page.getByLabel(/Inspect frame/);
  const views = (count = 1, time = 180): StoryView[] =>
    panels.map((panel, index) => ({
      page,
      player: `Developer · recipient in ${index ? "reduced" : "standard"} motion`,
      surface: "document",
      motionInspection: names.map((name, index) => ({
        selector: `[aria-label="${name}"]`,
        count,
        time: index ? 180 : time,
        duration: 180,
      })),
      verifications: [
        {
          spec: "The actual conversation surface and commitment footer remain contained; conversation details use their bounded scroll region.",
          check: async () => {
            const surface = panel.getByRole("region", {
              name: "Private conversations",
            });
            await surface.evaluate((e) =>
              e.scrollIntoView({ block: "center" }),
            );
            const box = await surface.boundingBox();
            expect(box).not.toBeNull();
            expect(box!.y).toBeGreaterThanOrEqual(0);
            expect(box!.y + box!.height).toBeLessThanOrEqual(
              page.viewportSize()!.height,
            );
            await expect(
              panel.getByRole("region", { name: "Conversation details" }),
            ).toHaveCSS("overflow-y", "auto");
            if (count === 2) {
              const message = panel.getByRole("list", {
                name: "Authorized messages",
              });
              const content = await message.boundingBox();
              const region = await panel
                .getByRole("region", { name: "Conversation details" })
                .boundingBox();
              expect(content).not.toBeNull();
              expect(region).not.toBeNull();
              expect(content!.y).toBeGreaterThanOrEqual(region!.y);
              expect(content!.y + content!.height).toBeLessThanOrEqual(
                region!.y + region!.height,
              );
              await expect(message).toContainText(
                "Selected earlier history · shared by Envoy 1",
              );
            }
            const footer = panel.locator(".commitment");
            await expect(footer).toBeVisible();
            const rail = await footer.boundingBox();
            expect(rail).not.toBeNull();
            expect(rail!.y).toBeGreaterThanOrEqual(0);
            expect(rail!.y + rail!.height).toBeLessThanOrEqual(
              page.viewportSize()!.height,
            );
          },
        },
      ],
    }));
  async function readFirstMessage() {
    for (const panel of panels) {
      await expect(
        panel.getByRole("list", { name: "Authorized messages" }),
      ).toBeVisible();
      const reading = panel.getByRole("region", {
        name: "Conversation details",
      });
      await reading.focus();
      await reading.press("Home");
      await expect.poll(() => reading.evaluate((e) => e.scrollTop)).toBe(0);
    }
  }
  const privateBefore = {
    spec: "Before consent, only the selected message identifier is disclosed; the earlier private contents and authorized message list are absent.",
    check: async () => {
      for (const panel of panels) {
        await expect(
          panel.getByRole("list", { name: "Selected earlier history" }),
        ).toContainText("Message 1");
        await expect(panel).toContainText(
          "Message contents become available after you accept this scope.",
        );
        await expect(panel).not.toContainText(
          "Creator's earlier private note.",
        );
        await expect(
          panel.getByRole("list", { name: "Authorized messages" }),
        ).toHaveCount(0);
      }
    },
  };
  await story.harness(
    "presentation-clock",
    "Freeze browser playback only. Shared reducers derive the existing selected-history views; no authenticated account, live command, service clock or stored grants are replaced.",
    async () => {
      const instant = new Date("2026-01-01T12:00:00Z");
      await page.clock.install({ time: instant });
      await page.clock.pauseAt(new Date(instant.getTime() + 1000));
    },
  );
  await story.step("review-scope", {
    actor: "Developer",
    description:
      "Select the recipient's sharing scenario and focus each real Accept invitation control without committing consent through an inert lab callback.",
    action: async () => {
      await page.goto("./dev/animations/");
      await page
        .getByLabel("Scenario", { exact: true })
        .selectOption("conversation-sharing");
      await seek.fill("200");
      for (const panel of panels) {
        const accept = panel.getByRole("button", {
          name: "Accept invitation",
          exact: true,
        });
        await accept.focus();
        await expect(accept).toBeFocused();
      }
    },
    acknowledgement: {
      spec: "Both invitation views disclose one selected earlier message and explain that acceptance grants neither alliance nor military access.",
      check: async () => {
        for (const panel of panels) {
          await expect(panel).toContainText(
            "You will receive 1 selected earlier message",
          );
          await expect(panel).toContainText(
            "Accepting does not form an alliance or grant military access.",
          );
          await expect(
            panel.getByRole("button", {
              name: "Accept invitation",
              exact: true,
            }),
          ).toBeEnabled();
        }
      },
    },
    verifications: [privateBefore],
    views: views(),
  });
  await story.step("pending", {
    actor: "Developer",
    description:
      "Seek to the existing pending-acceptance specimen. This timeline action is not a live acceptance request.",
    action: async () => {
      await seek.fill("700");
    },
    acknowledgement: {
      spec: "Both panes report the same pending campaign acknowledgement.",
      check: async () => {
        await expect(panels[0].getByRole("status")).toContainText(
          "Awaiting acknowledgement",
        );
        await expect(panels[1].getByRole("status")).toHaveText(
          await panels[0].getByRole("status").innerText(),
        );
      },
    },
    verifications: [
      privateBefore,
      {
        spec: "Pending disables both consent and decline without exposing the selected contents.",
        check: async () => {
          for (const panel of panels) {
            await expect(
              panel.getByRole("button", {
                name: "Accept invitation",
                exact: true,
              }),
            ).toBeDisabled();
            await expect(
              panel.getByRole("button", { name: "Decline", exact: true }),
            ).toBeDisabled();
          }
        },
      },
    ],
    views: views(),
  });
  await story.step("acceptance-motion", {
    actor: "Developer",
    description:
      "Inspect the actual acceptance feedback at 50 ms in standard motion and its settled 180 ms reduced-motion counterpart; use Home to read the same authorized message from its beginning.",
    action: async () => {
      await seek.fill("1250");
      await readFirstMessage();
    },
    acknowledgement: {
      spec: "Both motion panes report the exact accepted-membership outcome despite different presentation times.",
      check: async () => {
        for (const panel of panels)
          await expect(panel.getByRole("status")).toHaveText(
            "Invitation accepted. Your authorized history and future messages are available.",
          );
      },
    },
    verifications: [
      {
        spec: "The same single selected message and sharing disclosure exist in each motion mode.",
        check: async () => {
          for (const panel of panels) {
            const messages = panel.getByRole("list", {
              name: "Authorized messages",
            });
            await expect(messages.getByRole("listitem")).toHaveCount(1);
            await expect(messages).toContainText(
              "Creator's earlier private note.",
            );
            await expect(messages).toContainText(
              "Selected earlier history · shared by",
            );
          }
        },
      },
    ],
    views: views(2, 50),
  });
  await story.step("accepted-history", {
    actor: "Developer",
    description:
      "Seek to the reducer-accepted recipient projection and use keyboard Home to read the complete selected message and its sharing provenance.",
    action: async () => {
      await seek.fill("1400");
      await readFirstMessage();
    },
    acknowledgement: {
      spec: "Both panes show the same accepted membership feedback and selected earlier private note.",
      check: async () => {
        await expect(panels[0].getByRole("status")).toHaveText(
          "Invitation accepted. Your authorized history and future messages are available.",
        );
        await expect(panels[1].getByRole("status")).toHaveText(
          await panels[0].getByRole("status").innerText(),
        );
        for (const panel of panels) {
          const messages = panel.getByRole("list", {
            name: "Authorized messages",
          });
          await expect(messages.getByRole("listitem")).toHaveCount(1);
          await expect(messages).toContainText(
            "Creator's earlier private note.",
          );
          await expect(messages).toContainText(
            "Selected earlier history · shared by",
          );
        }
      },
    },
    verifications: [
      {
        spec: "Acceptance removes the invitation controls and exposes no extra messages or unselected history.",
        check: async () => {
          for (const panel of panels) {
            await expect(
              panel.getByRole("button", {
                name: "Accept invitation",
                exact: true,
              }),
            ).toHaveCount(0);
            await expect(
              panel.getByRole("list", { name: "Selected earlier history" }),
            ).toHaveCount(0);
            await expect(panel).not.toContainText(
              "Can we discuss the systems near Nacre?",
            );
          }
        },
      },
    ],
    views: views(2),
  });
  await story.step("reset-scope", {
    actor: "Developer",
    description:
      "Reset the lab by keyboard and recover the unaccepted scope without retaining previously displayed message contents.",
    action: async () => {
      const reset = page.getByRole("button", { name: "Reset", exact: true });
      await reset.focus();
      await reset.press("Enter");
      await seek.fill("200");
    },
    acknowledgement: {
      spec: "Both panes return to enabled invitation controls with no prior acknowledgement text.",
      check: async () => {
        for (const panel of panels) {
          await expect(
            panel.getByRole("button", {
              name: "Accept invitation",
              exact: true,
            }),
          ).toBeEnabled();
          await expect(panel.getByRole("status")).toHaveCount(0);
        }
      },
    },
    verifications: [
      privateBefore,
      {
        spec: "Reset restores the initial scenario rather than preserving accepted membership.",
        check: async () => {
          await expect(seek).toHaveValue("200");
        },
      },
    ],
    views: views(),
  });
});
