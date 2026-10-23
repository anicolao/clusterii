import { openGalaxyCommand } from "./galaxy-navigation";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";

test("Recover saved campaign records without losing your place", async ({
  page,
  context,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "campaign-history",
    title: "Recover saved campaign records without losing your place",
    inventory: ["UX-12", "UX-14", "UX-16"],
    description:
      "History envoy returns to a waiting development campaign, reads beyond the first page, receives another device’s changes without forced scrolling, explicitly recovers latest records, and restores the same selected system. Setup uses real UI and services with a test-only fixed catalogue input; keys, commands and persistence remain real.",
  });
  const email = `story-history-${info.project.name}@example.test`;
  await story.harness(
    "prepare-history",
    "Prepare a fixed-catalogue waiting campaign through ordinary sign-in/create/join UI, then twelve acknowledged host pause/resume actions. These establish existing history, not a claim of illustrated admission or hosted scheduling.",
    [
      {
        description:
          "Authenticate History envoy and acknowledge the saved identity.",
        run: async () => {
          await login(page, email);
          await page.getByLabel("Commander name").fill("History envoy");
          await page
            .getByRole("button", { name: "Save identity", exact: true })
            .click();
          await expect(page.getByRole("status")).toContainText(
            "Identity saved",
          );
        },
      },
      {
        description:
          "Create the fixed-catalogue campaign, acknowledge the claimed seat and open host controls.",
        run: async () => {
          await grantDeveloper(email);
          await page
            .getByRole("button", { name: "Close", exact: true })
            .click();
          await page.getByRole("link", { name: "Open campaigns" }).click();
          await page
            .getByRole("button", { name: "Create campaign", exact: true })
            .click();
          await page
            .getByLabel("Campaign name")
            .fill(`History ${info.project.name}`);
          await page
            .getByRole("button", { name: "Create galaxy", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Claim your seat", exact: true })
            .click();
          await expect(
            page.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Roster", exact: true })
            .click();
          await page.getByText("Development controls", { exact: true }).click();
        },
      },
      ...Array.from({ length: 12 }, (_, i) => {
        const pause = i % 2 === 0;
        return {
          description: `Acknowledge history setup command ${i + 1}: ${pause ? "pause" : "resume"} the waiting campaign.`,
          run: async () => {
            await page
              .getByRole("button", {
                name: pause ? "Pause campaign" : "Resume campaign",
                exact: true,
              })
              .click();
            await expect(
              page.getByRole("status").filter({
                hasText: pause ? /^Campaign paused\./ : /^Campaign resumed\./,
              }),
            ).toHaveText(
              pause
                ? "Campaign paused. Admissions and scheduled start are stopped."
                : "Campaign resumed.",
            );
          },
        };
      }),
      {
        description: "Close host controls and return to the selected system.",
        run: async () => {
          await page
            .getByRole("button", { name: "Close roster", exact: true })
            .click();
        },
      },
    ],
  );
  const url = page.url(),
    selected = await page
      .getByRole("complementary", { name: "Selected system" })
      .getByRole("heading")
      .textContent();
  const tray = page.getByRole("dialog", { name: "Campaign history panel" }),
    records = tray.getByRole("region", { name: "Saved campaign records" }),
    back = tray.getByRole("button", { name: "Return to galaxy", exact: true }),
    briefing = tray.getByRole("button", {
      name: "Since your last visit",
      exact: true,
    });
  const view = () => ({
    page,
    player: "History envoy — reading device",
    surface: "game" as const,
    primary: [back],
  });
  await story.step("open-records", {
    actor: "History envoy",
    description: "Open ten saved records with the return control visible.",
    action: async () => openGalaxyCommand(page, "History"),
    acknowledgement: {
      spec: "Ten authorized records finish loading.",
      check: async () => expect(tray.locator("summary")).toHaveCount(10),
    },
    verifications: [
      {
        spec: "The history dialog offers briefing and an always-visible return control.",
        check: async () => {
          await expect(briefing).toBeEnabled();
          await expect(back).toBeEnabled();
        },
      },
    ],
    views: [view()],
  });
  await story.step("keyboard-cycle", {
    actor: "History envoy",
    description:
      "Traverse the briefing, return control and bounded records with the keyboard.",
    action: async () => {
      await records.focus();
      await page.keyboard.press("Shift+Tab");
      await expect(briefing).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(back).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(briefing).toBeFocused();
      await page.keyboard.press("Tab");
    },
    acknowledgement: {
      spec: "Focus returns to the bounded records after both modal wrap directions.",
      check: async () => expect(records).toBeFocused(),
    },
    verifications: [
      {
        spec: "The return rail is still visible before any scrolling.",
        check: async () => expect(back).toBeInViewport(),
      },
    ],
    views: [view()],
  });
  await story.step("inspect-record", {
    actor: "History envoy",
    description: "Expand record 14 to read the saved roster.",
    action: async () =>
      tray
        .getByRole("group", { name: "Campaign record 14", exact: true })
        .locator("summary")
        .click(),
    acknowledgement: {
      spec: "The selected record reveals the saved commander.",
      check: async () =>
        expect(
          tray
            .getByRole("group", { name: "Campaign record 14", exact: true })
            .getByText("History envoy", { exact: true }),
        ).toBeVisible(),
    },
    verifications: [
      {
        spec: "Expanding a record preserves all ten loaded revisions.",
        check: async () => expect(tray.locator("summary")).toHaveCount(10),
      },
    ],
    views: [view()],
  });
  await story.step("earlier-records", {
    actor: "History envoy",
    description: "Load earlier records beyond the ten-record page boundary.",
    action: async () =>
      tray
        .getByRole("button", { name: "Earlier records", exact: true })
        .click(),
    acknowledgement: {
      spec: "Thirteen member-accessible records are available.",
      check: async () => expect(tray.locator("summary")).toHaveCount(13),
    },
    verifications: [
      {
        spec: "The beginning of authorized history is reached.",
        check: async () =>
          expect(
            tray.getByText("Beginning of your available history.", {
              exact: true,
            }),
          ).toBeVisible(),
      },
    ],
    views: [view()],
  });
  const position = await records.evaluate((el) => el.scrollTop);
  const second = await context.newPage();
  await story.harness(
    "open-second-device",
    "Open the same commander’s second authenticated device through its campaign URL; no account or game state is injected.",
    async () => {
      await second.goto(url);
      await second.getByRole("button", { name: "Roster", exact: true }).click();
      await second.getByText("Development controls", { exact: true }).click();
    },
  );
  await story.step("other-device-change", {
    actor: "History envoy — second device",
    description:
      "Pause the campaign on another device while preserving the reading device’s place.",
    action: async () =>
      second
        .getByRole("button", { name: "Pause campaign", exact: true })
        .click(),
    acknowledgement: {
      spec: "The host command is acknowledged as paused.",
      check: async () =>
        expect(
          second.getByRole("status").filter({ hasText: /^Campaign paused\./ }),
        ).toBeVisible(),
    },
    verifications: [
      {
        spec: "The reading device signals new records without replacing its thirteen records or scrolling.",
        check: async () => {
          await expect(
            tray.getByRole("button", {
              name: "New records available",
              exact: true,
            }),
          ).toBeAttached();
          expect(await records.evaluate((el) => el.scrollTop)).toBe(position);
          await expect(tray.locator("summary")).toHaveCount(13);
        },
      },
    ],
    views: [
      {
        page: second,
        player: "History envoy — second device",
        surface: "game",
        primary: [
          second.getByRole("button", { name: "Close roster", exact: true }),
        ],
      },
      view(),
    ],
  });
  await story.step("recover-latest", {
    actor: "History envoy — reading device",
    description: "Choose latest records and recover acknowledged revision 15.",
    action: async () =>
      tray.getByRole("button", { name: "Latest records", exact: true }).click(),
    acknowledgement: {
      spec: "Record 15 is present from persisted campaign history.",
      check: async () =>
        expect(
          tray
            .getByRole("group", { name: "Campaign record 15", exact: true })
            .locator("summary"),
        ).toContainText("Record 15"),
    },
    verifications: [
      {
        spec: "The current history page contains ten records.",
        check: async () => expect(tray.locator("summary")).toHaveCount(10),
      },
    ],
    views: [view()],
  });
  if (info.project.name === "phone") {
    await story.harness(
      "disconnect",
      "Disconnect both devices to exercise recovery; this is an explicit browser-network fault.",
      async () => context.setOffline(true),
    );
    await story.step("offline-history", {
      actor: "History envoy",
      description:
        "Request latest records offline and retain readable saved history.",
      action: async () =>
        tray
          .getByRole("button", { name: "Latest records", exact: true })
          .click(),
      acknowledgement: {
        spec: "Recovery reports its network failure.",
        check: async () =>
          expect(tray.getByRole("alert")).toContainText(
            "History could not be recovered",
          ),
      },
      verifications: [
        {
          spec: "All ten previously loaded records remain readable.",
          check: async () => expect(tray.locator("summary")).toHaveCount(10),
        },
      ],
      views: [view()],
    });
    await story.harness(
      "reconnect",
      "Restore the browser network before the explicit player retry.",
      async () => context.setOffline(false),
    );
    await story.step("retry-history", {
      actor: "History envoy",
      description:
        "Retry history after reconnecting and clear the recovery error.",
      action: async () =>
        tray
          .getByRole("button", { name: "Retry history", exact: true })
          .click(),
      acknowledgement: {
        spec: "The recovery error clears and latest records becomes available.",
        check: async () => {
          await expect(tray.getByRole("alert")).toHaveCount(0);
          await expect(
            tray.getByRole("button", { name: "Latest records", exact: true }),
          ).toBeEnabled();
        },
      },
      verifications: [
        {
          spec: "Revision 15 remains the acknowledged latest record.",
          check: async () =>
            expect(
              tray.getByRole("group", {
                name: "Campaign record 15",
                exact: true,
              }),
            ).toBeAttached(),
        },
      ],
      views: [view()],
    });
  }
  await story.step("return-to-galaxy", {
    actor: "History envoy",
    description:
      "Close history with Escape and return to the same selected system.",
    action: async () => page.keyboard.press("Escape"),
    acknowledgement: {
      spec: "The opening History control receives focus.",
      check: async () =>
        expect(
          page.getByRole("button", { name: "History", exact: true }),
        ).toBeFocused(),
    },
    verifications: [
      {
        spec: "System selection survives reading history.",
        check: async () =>
          expect(
            await page
              .getByRole("complementary", { name: "Selected system" })
              .getByRole("heading")
              .textContent(),
          ).toBe(selected),
      },
    ],
    views: [
      {
        page,
        player: "History envoy",
        surface: "game",
        primary: [page.getByRole("button", { name: "History", exact: true })],
      },
    ],
  });
  await story.step("reload-history", {
    actor: "History envoy",
    description: "Reload and recover the same saved latest record.",
    action: async () => {
      await page.reload();
      await openGalaxyCommand(page, "History");
    },
    acknowledgement: {
      spec: "Persisted record 15 is recovered after reload.",
      check: async () =>
        expect(
          tray
            .getByRole("group", { name: "Campaign record 15", exact: true })
            .locator("summary"),
        ).toContainText("Record 15"),
    },
    verifications: [
      {
        spec: "Return to galaxy remains usable.",
        check: async () => expect(back).toBeEnabled(),
      },
    ],
    views: [view()],
  });
  await story.step("finish-reading", {
    actor: "History envoy",
    description: "Use Return to galaxy to finish reading after reload.",
    action: async () => back.click(),
    acknowledgement: {
      spec: "The history dialog closes and returns focus to its opening control.",
      check: async () => {
        await expect(tray).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "History", exact: true }),
        ).toBeFocused();
      },
    },
    verifications: [
      {
        spec: "The selected system still matches the previous visit.",
        check: async () =>
          expect(
            await page
              .getByRole("complementary", { name: "Selected system" })
              .getByRole("heading")
              .textContent(),
          ).toBe(selected),
      },
    ],
    views: [
      {
        page,
        player: "History envoy",
        surface: "game",
        primary: [page.getByRole("button", { name: "History", exact: true })],
      },
    ],
  });
  await second.close();
});
