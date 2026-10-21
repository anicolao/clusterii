import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import type { Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
async function savedIdentity(page: Page, email: string, name: string) {
  await login(page, email);
  await page.getByLabel("Commander name").fill(name);
  await button(page, "Save identity").click();
  await expect(page.getByRole("status")).toContainText("Identity saved");
  await grantDeveloper(email);
}
test("The host pauses admission, recovers the pause and resumes a waiting commander", async ({
  browser,
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "maintenance-admission-recovery",
    title: "Pause, recover and resume campaign admission",
    inventory: ["UX-02", "UX-14", "UX-16"],
    description:
      "A host pauses a real waiting development campaign while an independent commander is reviewing a faction. The pause fences admission and survives reload; acknowledged resume permits the waiting commander to join. Keyboard traversal wraps within the roster and Escape restores its opening control. Starting state uses real UI with explicit development access and fixed catalogue input.",
  });
  const context = await browser.newContext({
    viewport: info.project.use.viewport,
    baseURL: info.project.use.baseURL,
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const guest = await context.newPage();
  let invitation = "";
  const roster = page.getByRole("dialog", { name: "Campaign roster panel" });
  const summary = page.getByText("Development controls", { exact: true });
  const hostView = () => ({
    page,
    player: "Maintenance host",
    surface: "game" as const,
  });
  const guestView = () => ({
    page: guest,
    player: "Waiting envoy",
    surface: "game" as const,
    primary: [button(guest, "Claim your seat")],
  });
  try {
    await story.harness(
      "waiting-commanders",
      "Prepare a host's admitted Heliac seat and an independently authenticated Pelagic applicant through ordinary UI. Emulator development claims and fixed catalogue entropy are explicit controls; no production state, pause interval or tick is injected.",
      async () => {
        await savedIdentity(
          page,
          `maintenance-host-${info.project.name}@example.test`,
          "Maintenance host",
        );
        await button(page, "Close").click();
        await page.getByRole("link", { name: "Open campaigns" }).click();
        await button(page, "Create campaign").click();
        await page
          .getByLabel("Campaign name")
          .fill(`Maintenance dawn ${info.project.name}`);
        await button(page, "Create galaxy").click();
        await button(page, "Claim your seat").click();
        await expect(
          page.getByText("Your seat is confirmed.", { exact: true }),
        ).toBeVisible();
        invitation = page.url();
        await savedIdentity(
          guest,
          `maintenance-waiting-${info.project.name}@example.test`,
          "Waiting envoy",
        );
        await guest.goto(invitation);
        await guest.getByRole("radio", { name: /Pelagic Concord/ }).check();
        await expect(button(guest, "Claim your seat")).toBeEnabled();
      },
    );
    await story.step("open-roster", {
      actor: "Maintenance host",
      description:
        "Open the roster while the other commander can still claim a seat.",
      action: async () => button(page, "Roster").click(),
      acknowledgement: {
        spec: "The roster panel receives focus.",
        check: async () => expect(roster).toBeFocused(),
      },
      verifications: [
        {
          spec: "The waiting commander can still commit admission before a pause.",
          check: async () =>
            expect(button(guest, "Claim your seat")).toBeEnabled(),
        },
      ],
      views: [hostView(), guestView()],
    });
    await story.step("keyboard-controls", {
      actor: "Maintenance host",
      description:
        "Traverse the closed roster controls in both wrap directions, then open development controls with the keyboard.",
      action: async () => {
        await page.keyboard.press("Tab");
        await expect(button(page, "Close roster")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(button(page, "Leave campaign")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(summary).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(button(page, "Close roster")).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(summary).toBeFocused();
        await page.keyboard.press("Enter");
        await page.keyboard.press("Tab");
      },
      acknowledgement: {
        spec: "Pause campaign is focused after opening the disclosure.",
        check: async () => expect(button(page, "Pause campaign")).toBeFocused(),
      },
      verifications: [
        {
          spec: "The same authoritative campaign remains ready for admission.",
          check: async () =>
            expect(button(guest, "Claim your seat")).toBeEnabled(),
        },
      ],
      views: [{ ...hostView(), primary: [button(page, "Pause campaign")] }],
    });
    await story.step("pause-admission", {
      actor: "Maintenance host",
      description:
        "Commit the pause and observe the waiting player's admission control become disabled.",
      action: async () => page.keyboard.press("Enter"),
      acknowledgement: {
        spec: "The server acknowledges the pause and explicitly stops admissions and scheduled start.",
        check: async () =>
          expect(
            page.getByRole("status").filter({ hasText: /^Campaign paused\./ }),
          ).toHaveText(
            "Campaign paused. Admissions and scheduled start are stopped.",
          ),
      },
      verifications: [
        {
          spec: "Resume is available, leaving is disabled, the background command rail is inert and the applicant cannot claim a seat.",
          check: async () => {
            await expect(button(page, "Resume campaign")).toBeEnabled();
            await expect(button(page, "Leave campaign")).toBeDisabled();
            await expect(page.locator(".command-rail")).toHaveAttribute(
              "inert",
              "",
            );
            await expect(button(guest, "Claim your seat")).toBeDisabled();
          },
        },
      ],
      views: [
        { ...hostView(), primary: [button(page, "Resume campaign")] },
        guestView(),
      ],
    });
    await story.step("recover-pause", {
      actor: "Maintenance host",
      description: "Reload and recover the persisted maintenance pause.",
      action: async () => page.reload(),
      acknowledgement: {
        spec: "The recovered galaxy discloses the development maintenance pause.",
        check: async () =>
          expect(
            page.getByText("Paused · Development maintenance", { exact: true }),
          ).toBeVisible(),
      },
      verifications: [
        {
          spec: "The independent applicant remains unable to join after the host reloads.",
          check: async () =>
            expect(button(guest, "Claim your seat")).toBeDisabled(),
        },
      ],
      views: [hostView(), guestView()],
    });
    await story.step("reopen-controls", {
      actor: "Maintenance host",
      description:
        "Reopen the roster and reach Resume with the keyboard, skipping disabled Leave.",
      action: async () => {
        await button(page, "Roster").click();
        await page.keyboard.press("Tab");
        await expect(button(page, "Close roster")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(summary).toBeFocused();
        await page.keyboard.press("Enter");
        await page.keyboard.press("Tab");
      },
      acknowledgement: {
        spec: "Resume campaign is focused and ready.",
        check: async () =>
          expect(button(page, "Resume campaign")).toBeFocused(),
      },
      verifications: [
        {
          spec: "Leaving remains disabled until the server accepts resume.",
          check: async () =>
            expect(button(page, "Leave campaign")).toBeDisabled(),
        },
      ],
      views: [{ ...hostView(), primary: [button(page, "Resume campaign")] }],
    });
    await story.step("resume-admission", {
      actor: "Maintenance host",
      description:
        "Resume the campaign and wait for the applicant's admission control to reopen.",
      action: async () => page.keyboard.press("Enter"),
      acknowledgement: {
        spec: "The authoritative receipt confirms Campaign resumed.",
        check: async () =>
          expect(
            page.getByRole("status").filter({ hasText: /^Campaign resumed\./ }),
          ).toHaveText("Campaign resumed."),
      },
      verifications: [
        {
          spec: "Leaving and claiming a seat become available after acceptance.",
          check: async () => {
            await expect(button(page, "Leave campaign")).toBeEnabled();
            await expect(button(guest, "Claim your seat")).toBeEnabled();
          },
        },
      ],
      views: [hostView(), guestView()],
    });
    await story.step("return-focus", {
      actor: "Maintenance host",
      description:
        "Close the roster with Escape and return focus to its opening control.",
      action: async () => page.keyboard.press("Escape"),
      acknowledgement: {
        spec: "Roster is focused on the galaxy surface.",
        check: async () => expect(button(page, "Roster")).toBeFocused(),
      },
      verifications: [
        {
          spec: "The modal is closed and normal galaxy controls are no longer inert.",
          check: async () => {
            await expect(roster).toHaveCount(0);
            await expect(page.locator(".command-rail")).not.toHaveAttribute(
              "inert",
              "",
            );
          },
        },
      ],
      views: [hostView()],
    });
    await story.step("admit-waiting-envoy", {
      actor: "Waiting envoy and Maintenance host",
      description:
        "Claim the reopened seat and inspect its acknowledged roster entry.",
      action: async () => {
        await button(guest, "Claim your seat").click();
        await button(page, "Roster").click();
      },
      acknowledgement: {
        spec: "The applicant receives seat confirmation and the host sees Waiting envoy.",
        check: async () => {
          await expect(
            guest.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText("Waiting envoy", { exact: true }),
          ).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "Both commanders see the real persisted campaign; it remains waiting for a full roster.",
          check: async () => {
            await expect(guest.locator("canvas")).toBeVisible();
            await expect(
              page
                .getByRole("status")
                .filter({ hasText: /Waiting for players/ }),
            ).toBeVisible();
          },
        },
      ],
      views: [
        hostView(),
        { page: guest, player: "Waiting envoy", surface: "game" as const },
      ],
    });
  } finally {
    await context.close();
  }
});
