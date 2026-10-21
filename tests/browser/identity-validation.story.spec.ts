import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login } from "./helpers";
import {
  observeProfileWrites,
  profileFacts,
  profileIdentity,
} from "./story-helpers/profile-observer";

test("Correct an invalid identity without losing the draft or submitting an invalid command", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "identity-validation",
    title: "Correct an invalid commander identity",
    description:
      "A commander enters a name, receives a focused validation remedy for an overlong draft, corrects it and receives the real encrypted-save acknowledgement before recovering it after reload.",
    inventory: ["UX-14", "UX-16"],
  });
  const writes = observeProfileWrites(page);
  const name = page.getByLabel("Commander name");
  const save = page.getByRole("button", { name: "Save identity", exact: true });
  const views = [
    { page, player: "Commander", surface: "game" as const, primary: [save] },
  ];
  await story.step("sign-in", {
    actor: "Commander",
    description: "Sign in and open the production identity editor.",
    action: async () =>
      login(page, `validation-story-${info.project.name}@example.test`),
    acknowledgement: {
      spec: "The authenticated identity editor is ready.",
      check: async () => expect(name).toBeVisible(),
    },
    verifications: [
      {
        spec: "Save is available and no profile command has been submitted.",
        check: async () => {
          await expect(save).toBeEnabled();
          expect(writes).toHaveLength(0);
        },
      },
    ],
    views,
  });
  await story.step("draft", {
    actor: "Commander",
    description: "Draft a valid name and select the Deepseer portrait.",
    action: async () => {
      await name.fill("A valid commander");
      await page.getByRole("radio", { name: "The deepseer" }).check();
    },
    acknowledgement: {
      spec: "The name and portrait remain selected locally.",
      check: async () => {
        await expect(name).toHaveValue("A valid commander");
        await expect(
          page.getByRole("radio", { name: "The deepseer" }),
        ).toBeChecked();
      },
    },
    verifications: [
      {
        spec: "Editing has not written a profile.",
        check: async () => expect(writes).toHaveLength(0),
      },
    ],
    views,
  });
  await story.step("reject-invalid-name", {
    actor: "Commander",
    description:
      "Attempt to save a 25-character name and read the specific validation remedy.",
    action: async () => {
      await name.fill("A".repeat(25));
      await save.click();
    },
    acknowledgement: {
      spec: "The editor explains the 2–24 character requirement.",
      check: async () => expect(page.getByRole("alert")).toContainText("2–24"),
    },
    verifications: [
      {
        spec: "The invalid draft and portrait are retained, focus returns to the name, and reconnect is not offered.",
        check: async () => {
          await expect(name).toHaveValue("A".repeat(25));
          await expect(name).toBeFocused();
          await expect(
            page.getByRole("radio", { name: "The deepseer" }),
          ).toBeChecked();
          await expect(
            page.getByRole("button", { name: "Reconnect", exact: true }),
          ).toHaveCount(0);
          expect(writes).toHaveLength(0);
        },
      },
    ],
    views,
  });
  await story.step("correct-draft", {
    actor: "Commander",
    description: "Correct the name in the preserved draft.",
    action: async () => name.fill("Corrected commander"),
    acknowledgement: {
      spec: "The corrected draft is ready to save.",
      check: async () => expect(name).toHaveValue("Corrected commander"),
    },
    verifications: [
      {
        spec: "The portrait remains selected and no command was sent before commitment.",
        check: async () => {
          await expect(
            page.getByRole("radio", { name: "The deepseer" }),
          ).toBeChecked();
          expect(writes).toHaveLength(0);
        },
      },
    ],
    views,
  });
  await story.step("save-correction", {
    actor: "Commander",
    description:
      "Save the corrected identity and wait for authoritative acceptance.",
    action: async () => save.click(),
    acknowledgement: {
      spec: "Identity saved confirms the accepted command.",
      check: async () =>
        expect(page.getByRole("status")).toContainText("Identity saved"),
    },
    verifications: [
      {
        spec: "The validation error clears and exactly one canonical revision, version and receipt exist.",
        check: async () => {
          await expect(page.getByRole("alert")).toHaveCount(0);
          const facts = await profileFacts(page, profileIdentity(writes));
          expect(facts.revision).toBe(1);
          expect(facts.versions).toHaveLength(1);
          expect(facts.receipts).toHaveLength(1);
          await expect(name).toHaveValue("Corrected commander");
        },
      },
    ],
    views,
  });
  await story.step("recover-correction", {
    actor: "Commander",
    description:
      "Reload and recover the accepted correction without another write.",
    action: async () => {
      await page.reload();
      await page
        .getByRole("button", { name: "Your identity", exact: true })
        .click();
    },
    acknowledgement: {
      spec: "The saved name and portrait are recovered.",
      check: async () => {
        await expect(name).toHaveValue("Corrected commander");
        await expect(
          page.getByRole("radio", { name: "The deepseer" }),
        ).toBeChecked();
      },
    },
    verifications: [
      {
        spec: "Recovery keeps the original saved revision and no validation error.",
        check: async () => {
          const facts = await profileFacts(page, profileIdentity(writes));
          expect(facts.revision).toBe(1);
          expect(facts.receipts).toHaveLength(1);
          await expect(page.getByRole("alert")).toHaveCount(0);
        },
      },
    ],
    views,
  });
});
