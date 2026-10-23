import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, authenticate, grantDeveloper } from "./helpers";
import {
  observeProfileWrites,
  profileIdentity,
  profileFacts,
} from "./story-helpers/profile-observer";
import type { Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const confirmed = (page: Page) =>
  expect(
    page.getByText("Your seat is confirmed.", { exact: true }),
  ).toBeVisible();
const view = (
  page: Page,
  player: string,
  primary: ReturnType<typeof button>[] = [],
) => ({ page, player, surface: "game" as const, primary });
async function prepareHost(page: Page, email: string, name: string) {
  await login(page, email);
  await page.getByLabel("Commander name").fill("Invitation host");
  await button(page, "Save identity").click();
  await expect(page.getByRole("status")).toContainText("Identity saved");
  await grantDeveloper(email);
  await button(page, "Close").click();
  await page.getByRole("link", { name: "Open campaigns" }).click();
  await button(page, "Create campaign").click();
  await page.getByLabel("Campaign name").fill(name);
  await button(page, "Create galaxy").click();
  await button(page, "Claim your seat").click();
  await confirmed(page);
  return page.url();
}

test("An invited new commander saves an identity and joins the preserved campaign", async ({
  browser,
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "invitation-first-admission",
    title: "Follow an invitation into a waiting campaign",
    inventory: ["UX-01", "UX-02", "UX-14", "UX-16"],
    description:
      "An independent new commander follows an invitation through authentication and saved identity, reviews a faction and claims a real seat. The host observes the acknowledged roster change. The starting host campaign is prepared through ordinary UI with fixed catalogue entropy and explicit development access.",
  });
  let invitation = "";
  await story.harness(
    "existing-host",
    "Prepare the host's saved identity and one-seat waiting campaign through real sign-in/create/join UI. Grant emulator development access; the test-only loader fixes catalogue entropy, not keys, commands or persistence.",
    async () => {
      invitation = await prepareHost(
        page,
        `invitation-host-${info.project.name}@example.test`,
        `Invited dawn ${info.project.name}`,
      );
      await button(page, "Roster").click();
    },
  );
  const context = await browser.newContext({
    viewport: info.project.use.viewport,
    baseURL: info.project.use.baseURL,
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const guest = await context.newPage(),
    email = `invitation-new-${info.project.name}@example.test`,
    writes = observeProfileWrites(guest);
  try {
    await story.step("open-invitation", {
      actor: "Invited envoy",
      description: "Open the invitation while signed out.",
      action: async () => guest.goto(invitation),
      acknowledgement: {
        spec: "Sign-in is required before campaign access.",
        check: async () =>
          expect(
            guest.getByRole("link", { name: "Sign in to continue" }),
          ).toBeVisible(),
      },
      verifications: [
        {
          spec: "The private galaxy is not exposed before authentication.",
          check: async () => expect(guest.locator("canvas")).toHaveCount(0),
        },
      ],
      views: [view(guest, "Invited envoy")],
    });
    await story.step("preserve-destination", {
      actor: "Invited envoy",
      description: "Continue to entry with the invitation preserved.",
      action: async () =>
        guest.getByRole("link", { name: "Sign in to continue" }).click(),
      acknowledgement: {
        spec: "Play is available for sign-in.",
        check: async () => expect(button(guest, "Play")).toBeVisible(),
      },
      verifications: [
        {
          spec: "Entry preserves the exact invited campaign ID.",
          check: async () =>
            expect(new URL(guest.url()).searchParams.get("campaign")).toBe(
              new URL(invitation).searchParams.get("campaign"),
            ),
        },
      ],
      views: [view(guest, "Invited envoy", [button(guest, "Play")])],
    });
    await story.step("sign-in", {
      actor: "Invited envoy",
      description: "Authenticate and reach first-time identity editing.",
      action: async () => authenticate(guest, email),
      acknowledgement: {
        spec: "The commander name field is ready.",
        check: async () =>
          expect(guest.getByLabel("Commander name")).toBeVisible(),
      },
      verifications: [
        {
          spec: "No identity command is submitted by sign-in alone.",
          check: async () => expect(writes).toHaveLength(0),
        },
      ],
      views: [view(guest, "Invited envoy", [button(guest, "Save identity")])],
    });
    await story.harness(
      "development-access",
      "Grant this authenticated emulator account development access so it can enter the explicitly development-only campaign; this is not public admission approval.",
      async () => grantDeveloper(email),
    );
    await story.step("draft-identity", {
      actor: "Invited envoy",
      description: "Choose the identity used for this campaign.",
      action: async () => {
        await guest.getByLabel("Commander name").fill("Invited envoy");
        await guest.getByRole("radio", { name: "The deepseer" }).check();
      },
      acknowledgement: {
        spec: "The local identity choice is retained.",
        check: async () =>
          expect(
            guest.getByRole("radio", { name: "The deepseer" }),
          ).toBeChecked(),
      },
      verifications: [
        {
          spec: "The draft remains unsent until Save.",
          check: async () => expect(writes).toHaveLength(0),
        },
      ],
      views: [view(guest, "Invited envoy", [button(guest, "Save identity")])],
    });
    await story.step("save-and-resume", {
      actor: "Invited envoy",
      description:
        "Save the identity and resume the exact invitation automatically.",
      action: async () => button(guest, "Save identity").click(),
      acknowledgement: {
        spec: "The invited campaign opens faction selection after identity acceptance.",
        check: async () => {
          await expect(guest).toHaveURL(invitation);
          await expect(
            guest.getByRole("heading", { name: "Choose your faction" }),
          ).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "Exactly one saved identity revision exists and the editor has closed.",
          check: async () => {
            expect(
              (await profileFacts(guest, profileIdentity(writes))).revision,
            ).toBe(1);
            await expect(guest.getByLabel("Commander name")).toHaveCount(0);
          },
        },
      ],
      views: [view(guest, "Invited envoy", [button(guest, "Claim your seat")])],
    });
    await story.step("choose-faction", {
      actor: "Invited envoy",
      description: "Review the Pelagic faction before claiming the seat.",
      action: async () =>
        guest.getByRole("radio", { name: /Pelagic Concord/ }).check(),
      acknowledgement: {
        spec: "Pelagic is selected and the commitment stays available.",
        check: async () =>
          expect(
            guest.getByRole("radio", { name: /Pelagic Concord/ }),
          ).toBeChecked(),
      },
      verifications: [
        {
          spec: "Claim your seat remains enabled.",
          check: async () =>
            expect(button(guest, "Claim your seat")).toBeEnabled(),
        },
      ],
      views: [view(guest, "Invited envoy", [button(guest, "Claim your seat")])],
    });
    await story.step("claim-seat", {
      actor: "Invited envoy",
      description:
        "Commit the selected seat and wait for the host's authoritative roster update.",
      action: async () => button(guest, "Claim your seat").click(),
      acknowledgement: {
        spec: "The server confirms the new seat and the host sees the invited commander.",
        check: async () => {
          await confirmed(guest);
          await expect(
            page
              .getByRole("dialog", {
                name: "Campaign roster panel",
                exact: true,
              })
              .getByRole("region", { name: "Campaign roster", exact: true })
              .getByText("Invited envoy", { exact: true }),
          ).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "The guest sees the actual galaxy without creating another identity revision.",
          check: async () => {
            await expect(guest.locator("canvas")).toBeVisible();
            expect(
              (await profileFacts(guest, profileIdentity(writes))).revision,
            ).toBe(1);
          },
        },
      ],
      views: [
        view(guest, "Invited envoy"),
        view(page, "Invitation host", [button(page, "Close roster")]),
      ],
    });
    await story.step("recover-seat", {
      actor: "Invited envoy",
      description:
        "Reload and recover the admitted campaign without re-saving identity.",
      action: async () => guest.reload(),
      acknowledgement: {
        spec: "The invited galaxy is restored.",
        check: async () => expect(guest.locator("canvas")).toBeVisible(),
      },
      verifications: [
        {
          spec: "The campaign URL and original identity revision are unchanged.",
          check: async () => {
            await expect(guest).toHaveURL(invitation);
            const facts = await profileFacts(guest, profileIdentity(writes));
            expect(facts.revision).toBe(1);
            expect(facts.versions).toHaveLength(1);
          },
        },
      ],
      views: [view(guest, "Invited envoy")],
    });
  } finally {
    await context.close();
  }
});

test("A returning commander resumes an invitation without rewriting identity and recovers inaccessible links", async ({
  browser,
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "invitation-returning-recovery",
    title: "Return through an invitation without rewriting identity",
    inventory: ["UX-01", "UX-02", "UX-14", "UX-16"],
    description:
      "A signed-out commander with a saved identity and an admitted seat returns through the original invitation. Authentication resumes the campaign directly, with no identity resave. Missing and development-access-denied invitations provide explicit recovery routes without changing the saved identity.",
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
  const guest = await context.newPage(),
    email = `invitation-returning-${info.project.name}@example.test`,
    writes = observeProfileWrites(guest);
  let invitation = "",
    uid = "",
    revision = 0;
  try {
    await story.harness(
      "existing-campaign-and-identity",
      "Prepare two independently authenticated commanders and two admitted seats through real UI, with fixed catalogue input and explicit emulator development access. Save the returning identity once, then sign out through the identity editor. This establishes an existing campaign; it does not claim illustrated admission or hosted Google acceptance.",
      async () => {
        invitation = await prepareHost(
          page,
          `invitation-return-host-${info.project.name}@example.test`,
          `Returning dawn ${info.project.name}`,
        );
        await button(page, "Roster").click();
        await login(guest, email);
        await guest.getByLabel("Commander name").fill("Returning envoy");
        await button(guest, "Save identity").click();
        await expect(guest.getByRole("status")).toContainText("Identity saved");
        uid = profileIdentity(writes);
        revision = (await profileFacts(guest, uid)).revision;
        await grantDeveloper(email);
        await guest.goto(invitation);
        await guest.getByRole("radio", { name: /Pelagic Concord/ }).check();
        await button(guest, "Claim your seat").click();
        await confirmed(guest);
        await expect(
          page
            .getByRole("dialog", { name: "Campaign roster panel", exact: true })
            .getByRole("region", { name: "Campaign roster", exact: true })
            .getByText("Returning envoy", { exact: true }),
        ).toBeVisible();
        await guest.goto("./");
        await button(guest, "Your identity").click();
        await button(guest, "Sign out").click();
        await expect(button(guest, "Play")).toBeVisible();
      },
    );
    const unchanged = async () => {
      const facts = await profileFacts(guest, uid);
      expect(facts.revision).toBe(revision);
      expect(facts.versions).toHaveLength(1);
      expect(facts.receipts).toHaveLength(1);
    };
    await story.step("return-to-invitation", {
      actor: "Returning envoy",
      description: "Open the original invitation while signed out.",
      action: async () => guest.goto(invitation),
      acknowledgement: {
        spec: "The campaign asks for sign-in before exposing private information.",
        check: async () =>
          expect(
            guest.getByRole("link", { name: "Sign in to continue" }),
          ).toBeVisible(),
      },
      verifications: [
        {
          spec: "The private galaxy is absent while signed out.",
          check: async () => expect(guest.locator("canvas")).toHaveCount(0),
        },
      ],
      views: [view(guest, "Returning envoy")],
    });
    await story.step("preserve-return-link", {
      actor: "Returning envoy",
      description:
        "Continue to entry while retaining the exact campaign destination.",
      action: async () =>
        guest.getByRole("link", { name: "Sign in to continue" }).click(),
      acknowledgement: {
        spec: "Play is ready for authentication.",
        check: async () => expect(button(guest, "Play")).toBeVisible(),
      },
      verifications: [
        {
          spec: "The campaign ID is preserved across the entry redirect.",
          check: async () =>
            expect(new URL(guest.url()).searchParams.get("campaign")).toBe(
              new URL(invitation).searchParams.get("campaign"),
            ),
        },
      ],
      views: [view(guest, "Returning envoy", [button(guest, "Play")])],
    });
    await story.step("authenticate-and-resume", {
      actor: "Returning envoy",
      description:
        "Authenticate with the saved account and resume the campaign directly.",
      action: async () => authenticate(guest, email),
      acknowledgement: {
        spec: "The invited galaxy opens without an identity-editor round trip.",
        check: async () => {
          await expect(guest).toHaveURL(invitation);
          await expect(guest.locator("canvas")).toBeVisible();
        },
      },
      verifications: [
        {
          spec: "No identity resave or duplicate seat is required.",
          check: async () => {
            await expect(guest.getByLabel("Commander name")).toHaveCount(0);
            await unchanged();
            await expect(
              page
                .getByRole("dialog", {
                  name: "Campaign roster panel",
                  exact: true,
                })
                .getByRole("region", { name: "Campaign roster", exact: true })
                .getByText("Returning envoy", { exact: true }),
            ).toHaveCount(1);
          },
        },
      ],
      views: [
        view(guest, "Returning envoy"),
        view(page, "Invitation host", [button(page, "Close roster")]),
      ],
    });
    await story.step("reload-return", {
      actor: "Returning envoy",
      description: "Reload the resumed campaign with the same saved identity.",
      action: async () => guest.reload(),
      acknowledgement: {
        spec: "The authorized galaxy is recovered again.",
        check: async () => expect(guest.locator("canvas")).toBeVisible(),
      },
      verifications: [
        {
          spec: "Recovery leaves the original identity revision and receipt intact.",
          check: unchanged,
        },
      ],
      views: [view(guest, "Returning envoy")],
    });
    await story.step("missing-invitation", {
      actor: "Returning envoy",
      description:
        "Follow an invitation whose campaign is no longer available.",
      action: async () => {
        const missing = new URL(invitation);
        missing.searchParams.set("campaign", crypto.randomUUID());
        await guest.goto(missing.href);
      },
      acknowledgement: {
        spec: "The unavailable-campaign error explains the missing destination.",
        check: async () =>
          expect(guest.getByRole("alert")).toContainText("no longer available"),
      },
      verifications: [
        {
          spec: "All campaigns offers a usable remedy and identity is unchanged.",
          check: async () => {
            await expect(button(guest, "All campaigns")).toBeEnabled();
            await unchanged();
          },
        },
      ],
      views: [view(guest, "Returning envoy", [button(guest, "All campaigns")])],
    });
    await story.step("recover-directory", {
      actor: "Returning envoy",
      description:
        "Return to the campaign directory after the missing invitation.",
      action: async () => button(guest, "All campaigns").click(),
      acknowledgement: {
        spec: "The campaign directory loads and clears the missing-link error.",
        check: async () => {
          await expect(
            guest.getByRole("region", { name: "Campaign directory" }),
          ).toBeVisible();
          await expect(guest.getByRole("alert")).toHaveCount(0);
        },
      },
      verifications: [
        {
          spec: "The existing saved identity remains unchanged.",
          check: unchanged,
        },
      ],
      views: [view(guest, "Returning envoy")],
    });
    await story.harness(
      "remove-development-access",
      "Remove this test account's emulator development claim to exercise a real authorization denial. The campaign, membership, history and identity records are not edited.",
      async () => {
        const response = await guest.request.post(
          "http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/projects/demo-clusterii/accounts:update",
          {
            headers: { Authorization: "Bearer owner" },
            data: { localId: uid, customAttributes: "{}" },
          },
        );
        expect(response.ok()).toBe(true);
      },
    );
    await story.step("denied-invitation", {
      actor: "Returning envoy",
      description:
        "Follow the original invitation after development access is removed.",
      action: async () => guest.goto(invitation),
      acknowledgement: {
        spec: "The development-access boundary denies campaign entry.",
        check: async () =>
          expect(
            guest.getByRole("heading", { name: "Development access" }),
          ).toBeVisible(),
      },
      verifications: [
        {
          spec: "The denied view exposes no galaxy and leaves saved identity intact.",
          check: async () => {
            await expect(guest.locator("canvas")).toHaveCount(0);
            await unchanged();
          },
        },
      ],
      views: [view(guest, "Returning envoy")],
    });
    await story.step("recover-entry", {
      actor: "Returning envoy",
      description: "Return to entry and clear the inaccessible invitation.",
      action: async () =>
        guest.getByRole("link", { name: "Return to entry" }).click(),
      acknowledgement: {
        spec: "The entry surface is available again.",
        check: async () =>
          expect(
            guest.getByRole("heading", { name: "CLUSTER", exact: true }),
          ).toBeVisible(),
      },
      verifications: [
        {
          spec: "The denied campaign query is cleared without rewriting identity.",
          check: async () => {
            expect(new URL(guest.url()).searchParams.get("campaign")).toBe(
              null,
            );
            await unchanged();
          },
        },
      ],
      views: [view(guest, "Returning envoy", [button(guest, "Play")])],
    });
  } finally {
    await context.close();
  }
});
