import { createHash } from "node:crypto";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import {
  observeProfileWrites,
  profileIdentity,
  profileFacts,
} from "./story-helpers/profile-observer";
import { login } from "./helpers";
import type { Page } from "@playwright/test";
const save = (page: Page) =>
  page.getByRole("button", { name: "Save identity", exact: true });
const saved = (page: Page) =>
  expect(page.getByRole("status")).toContainText("Identity saved");
async function submit(page: Page, alias: string) {
  await page.getByLabel("Commander name").fill(alias);
  await save(page).click();
}

test("Resolve two-device identity conflict without losing either draft", async ({
  page,
  browser,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "identity-conflict",
    title: "Resolve two-device identity conflict without losing either draft",
    inventory: ["UX-14", "UX-16"],
    description:
      "The same commander edits an identity on two independent authenticated devices. One save wins; the other draft survives conflict and requires an explicit replacement. Read-only emulator records corroborate revisions without choosing or injecting player actions.",
  });
  const second = await browser.newContext({
      viewport: info.project.use.viewport,
      baseURL: info.project.use.baseURL,
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "UTC",
      colorScheme: "dark",
      reducedMotion: "reduce",
    }),
    b = await second.newPage();
  const email = `story-profile-conflict-${info.project.name}@example.test`,
    writes = observeProfileWrites(page);
  const aView = () => ({
    page,
    player: "Commander — device one",
    surface: "game" as const,
    primary: [save(page)],
  });
  const bView = (primary = save(b)) => ({
    page: b,
    player: "Commander — device two",
    surface: "game" as const,
    primary: [primary],
  });
  await story.step("first-device-sign-in", {
    actor: "Commander — device one",
    description: "Sign in on the first device and reach the identity editor.",
    action: async () => login(page, email),
    acknowledgement: {
      spec: "The commander name field is ready after real provider login.",
      check: async () =>
        expect(page.getByLabel("Commander name")).toBeVisible(),
    },
    verifications: [
      {
        spec: "Eight production portraits and Save are available.",
        check: async () => {
          await expect(page.getByRole("radio")).toHaveCount(8);
          await expect(save(page)).toBeEnabled();
        },
      },
    ],
    views: [aView()],
  });
  await story.step("save-original", {
    actor: "Commander — device one",
    description: "Save Original as the shared identity.",
    action: async () => submit(page, "Original"),
    acknowledgement: {
      spec: "The encrypted save receives an authoritative accepted receipt.",
      check: async () => saved(page),
    },
    verifications: [
      {
        spec: "The acknowledged name remains Original.",
        check: async () =>
          expect(page.getByLabel("Commander name")).toHaveValue("Original"),
      },
    ],
    views: [aView()],
  });
  const uid = profileIdentity(writes);
  expect((await profileFacts(page, uid)).revision).toBe(1);
  await story.step("second-device-sign-in", {
    actor: "Commander — device two",
    description:
      "Sign in independently on a second device and recover Original.",
    action: async () => login(b, email),
    acknowledgement: {
      spec: "The second device recovers the saved identity.",
      check: async () =>
        expect(b.getByLabel("Commander name")).toHaveValue("Original"),
    },
    verifications: [
      {
        spec: "Both authenticated devices show the same saved name.",
        check: async () =>
          expect(page.getByLabel("Commander name")).toHaveValue("Original"),
      },
    ],
    views: [aView(), bView()],
  });
  await story.step("preserve-local-draft", {
    actor: "Commander — device two",
    description: "Edit a local Preserved draft without submitting it.",
    action: async () => b.getByLabel("Commander name").fill("Preserved draft"),
    acknowledgement: {
      spec: "The editor displays the local draft.",
      check: async () =>
        expect(b.getByLabel("Commander name")).toHaveValue("Preserved draft"),
    },
    verifications: [
      {
        spec: "The first device still shows the saved Original identity.",
        check: async () =>
          expect(page.getByLabel("Commander name")).toHaveValue("Original"),
      },
    ],
    views: [aView(), bView()],
  });
  await story.step("other-device-save", {
    actor: "Commander — device one",
    description:
      "Save Other device while the second device keeps its unsent draft.",
    action: async () => submit(page, "Other device"),
    acknowledgement: {
      spec: "The first device receives accepted save acknowledgement.",
      check: async () => saved(page),
    },
    verifications: [
      {
        spec: "The remote save does not overwrite the second device draft and produces revision two once.",
        check: async () => {
          await expect(b.getByLabel("Commander name")).toHaveValue(
            "Preserved draft",
          );
          const facts = await profileFacts(page, uid);
          expect(facts.revision).toBe(2);
          expect(facts.versions).toHaveLength(2);
        },
      },
    ],
    views: [aView(), bView()],
  });
  const replace = b.getByRole("button", {
    name: "Replace saved identity",
    exact: true,
  });
  await story.step("reject-conflicting-save", {
    actor: "Commander — device two",
    description: "Submit the stale draft and receive a conflict remedy.",
    action: async () => save(b).click(),
    acknowledgement: {
      spec: "The conflict identifies another device and offers explicit replacement.",
      check: async () => {
        await expect(b.getByRole("alert")).toContainText("Another device");
        await expect(replace).toBeEnabled();
      },
    },
    verifications: [
      {
        spec: "The draft remains intact, no reconnect remedy is substituted, and the conflicting command has no saved effect.",
        check: async () => {
          await expect(b.getByLabel("Commander name")).toHaveValue(
            "Preserved draft",
          );
          await expect(
            b.getByRole("button", { name: "Reconnect", exact: true }),
          ).toHaveCount(0);
          const facts = await profileFacts(page, uid);
          expect(facts.revision).toBe(2);
          expect(facts.versions).toHaveLength(2);
        },
      },
    ],
    views: [aView(), bView(replace)],
  });
  await story.step("replace-explicitly", {
    actor: "Commander — device two",
    description:
      "Explicitly replace the saved identity with the preserved draft.",
    action: async () => replace.click(),
    acknowledgement: {
      spec: "Replacement is acknowledged and reaches the other device.",
      check: async () => {
        await saved(b);
        await expect(page.getByLabel("Commander name")).toHaveValue(
          "Preserved draft",
        );
      },
    },
    verifications: [
      {
        spec: "Both devices retain the chosen draft, with exactly one additional saved revision.",
        check: async () => {
          await expect(b.getByLabel("Commander name")).toHaveValue(
            "Preserved draft",
          );
          const facts = await profileFacts(page, uid);
          expect(facts.revision).toBe(3);
          expect(facts.versions).toHaveLength(3);
        },
      },
    ],
    views: [aView(), bView()],
  });
  await second.close();
});

test("Retry a pending identity command without duplicate effects or draft loss", async ({
  page,
  context,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "identity-pending-retry",
    title:
      "Retry a pending identity command without duplicate effects or draft loss",
    inventory: ["UX-14", "UX-16"],
    description:
      "A commander saves an identity, loses the network, preserves a pending draft through an explicit retry and reconnect, and recovers it after reload. Actual transport frames and read-only canonical receipts distinguish retransmission from duplicate logical commands.",
  });
  const writes = observeProfileWrites(page),
    view = (primary = save(page)) => ({
      page,
      player: "Commander",
      surface: "game" as const,
      primary: [primary],
    });
  await story.step("sign-in", {
    actor: "Commander",
    description: "Sign in and reach the real identity editor.",
    action: async () =>
      login(page, `story-profile-retry-${info.project.name}@example.test`),
    acknowledgement: {
      spec: "Identity editing is ready after authentication.",
      check: async () =>
        expect(page.getByLabel("Commander name")).toBeVisible(),
    },
    verifications: [
      {
        spec: "Save is available.",
        check: async () => expect(save(page)).toBeEnabled(),
      },
    ],
    views: [view()],
  });
  await story.step("save-before-loss", {
    actor: "Commander",
    description: "Save Before network loss before disconnecting.",
    action: async () => submit(page, "Before network loss"),
    acknowledgement: {
      spec: "The initial save is acknowledged.",
      check: async () => saved(page),
    },
    verifications: [
      {
        spec: "The accepted name is visible.",
        check: async () =>
          expect(page.getByLabel("Commander name")).toHaveValue(
            "Before network loss",
          ),
      },
    ],
    views: [view()],
  });
  const uid = profileIdentity(writes),
    before = await profileFacts(page, uid);
  writes.length = 0;
  await story.harness(
    "disconnect",
    "Disconnect this browser context to exercise the actual pending-command recovery protocol.",
    async () => context.setOffline(true),
  );
  const retry = page.getByRole("button", { name: "Retry save", exact: true });
  await story.step("pending-draft", {
    actor: "Commander",
    description:
      "Submit Pending draft offline and receive a retry remedy without losing it.",
    action: async () => submit(page, "Pending draft"),
    acknowledgement: {
      spec: "The acknowledgement deadline exposes Retry save.",
      check: async () => expect(retry).toBeVisible({ timeout: 25000 }),
    },
    verifications: [
      {
        spec: "The pending draft remains visible and locked to its original command payload.",
        check: async () => {
          await expect(page.getByLabel("Commander name")).toHaveValue(
            "Pending draft",
          );
          await expect(page.getByLabel("Commander name")).toBeDisabled();
        },
      },
    ],
    views: [view(retry)],
  });
  const waiting = page.getByRole("button", {
    name: "Awaiting acknowledgement…",
    exact: true,
  });
  await story.step("retry-same-order", {
    actor: "Commander",
    description: "Retry the same pending save while preserving its draft.",
    action: async () => retry.click(),
    acknowledgement: {
      spec: "The same order is awaiting acknowledgement again.",
      check: async () => expect(waiting).toBeDisabled(),
    },
    verifications: [
      {
        spec: "Retry does not clear or change the draft.",
        check: async () =>
          expect(page.getByLabel("Commander name")).toHaveValue(
            "Pending draft",
          ),
      },
    ],
    views: [view(waiting)],
  });
  await story.harness(
    "restore-network",
    "Restore the network so the queued command and any transport retransmission can receive the authoritative receipt.",
    async () => context.setOffline(false),
  );
  await story.step("accept-once", {
    actor: "Commander",
    description: "Receive the accepted save after reconnecting.",
    action: async () => saved(page),
    acknowledgement: {
      spec: "The authoritative receipt confirms the saved draft.",
      check: async () => saved(page),
    },
    verifications: [
      {
        spec: "Every transport transmission uses one unchanged logical command, with exactly one acknowledged revision and saved effect.",
        check: async () => {
          expect(writes.length).toBeGreaterThan(0);
          const logical = writes.map(
            (frame) =>
              JSON.parse(frame).d.b as {
                p: string;
                d: Record<string, unknown>;
              },
          );
          expect(new Set(logical.map((write) => write.p)).size).toBe(1);
          for (const write of logical) expect(write.d).toEqual(logical[0].d);
          const commandId = logical[0].p.split("/")[3];
          expect(logical[0].p).toBe(`/profileCommands/${uid}/${commandId}`);
          expect(logical[0].d.objectId).toBe(`command:${commandId}`);
          const after = await profileFacts(page, uid);
          expect(after.revision).toBe(before.revision + 1);
          expect(after.versions).toHaveLength(before.versions.length + 1);
          expect(
            after.versions.map((doc) => doc.name.split("/").at(-1)).sort(),
          ).toEqual(["1", "2"]);
          expect(after.receipts).toHaveLength(before.receipts.length + 1);
          const accepted = await after.read(`/receipts/${commandId}`);
          expect(accepted.fields.status.stringValue).toBe("accepted");
          expect(Number(accepted.fields.revision.integerValue)).toBe(
            after.revision,
          );
          await info.attach("Idempotent reconnect evidence", {
            body: Buffer.from(
              JSON.stringify(
                {
                  transportFrames: writes.length,
                  logicalCommands: 1,
                  commandId,
                  payloadSha256: createHash("sha256")
                    .update(JSON.stringify(logical[0].d))
                    .digest("hex"),
                  beforeRevision: before.revision,
                  afterRevision: after.revision,
                  versionCount: after.versions.length,
                  receiptCount: after.receipts.length,
                },
                null,
                2,
              ),
            ),
            contentType: "application/json",
          });
          await expect(page.getByLabel("Commander name")).toBeEnabled();
          await expect(page.getByLabel("Commander name")).toHaveValue(
            "Pending draft",
          );
        },
      },
    ],
    views: [view()],
  });
  await story.step("reload-saved-draft", {
    actor: "Commander",
    description:
      "Reload and recover the saved draft without submitting another command.",
    action: async () => {
      await page.reload();
      await page
        .getByRole("button", { name: "Your identity", exact: true })
        .click();
    },
    acknowledgement: {
      spec: "The saved Pending draft returns after reload.",
      check: async () =>
        expect(page.getByLabel("Commander name")).toHaveValue("Pending draft"),
    },
    verifications: [
      {
        spec: "Reload preserves the acknowledged revision and version count.",
        check: async () => {
          const facts = await profileFacts(page, uid);
          expect(facts.revision).toBe(before.revision + 1);
          expect(facts.versions).toHaveLength(before.versions.length + 1);
        },
      },
    ],
    views: [view()],
  });
});

test("Restore entry focus after keyboard learning and identity editing", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "identity-keyboard-return",
    title: "Restore entry focus after keyboard learning and identity editing",
    inventory: ["UX-01", "UX-15", "UX-16"],
    description:
      "A visitor opens and closes Learn with the keyboard, signs in, closes identity editing, and checks that the entry controls remain focused and reduced-motion transitions are removed.",
  });
  const play = page.getByRole("button", { name: "Play", exact: true }),
    learn = page.getByRole("button", { name: "Learn the game", exact: true });
  await story.step("arrive", {
    actor: "Visitor",
    description: "Open entry with Play and Learn available.",
    action: async () => page.goto("./"),
    acknowledgement: {
      spec: "Play is ready.",
      check: async () => expect(play).toBeEnabled(),
    },
    verifications: [
      {
        spec: "Learn is available.",
        check: async () => expect(learn).toBeEnabled(),
      },
    ],
    views: [
      { page, player: "Visitor", surface: "game", primary: [play, learn] },
    ],
  });
  await story.step("keyboard-learn", {
    actor: "Visitor",
    description: "Open Learn with Enter and focus the first chapter.",
    action: async () => {
      await learn.focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "The chapter heading receives focus.",
      check: async () =>
        expect(
          page.getByRole("heading", {
            name: "No empire wins alone",
            exact: true,
          }),
        ).toBeFocused(),
    },
    verifications: [
      {
        spec: "The return control remains reachable.",
        check: async () =>
          expect(
            page.getByRole("button", { name: "Return to entry", exact: true }),
          ).toBeEnabled(),
      },
    ],
    views: [
      {
        page,
        player: "Visitor",
        surface: "game",
        primary: [
          page.getByRole("button", { name: "Return to entry", exact: true }),
        ],
      },
    ],
  });
  await story.step("return-from-learn", {
    actor: "Visitor",
    description: "Use the keyboard to return to the opening Learn control.",
    action: async () => {
      await page.keyboard.press("Tab");
      await page
        .getByRole("button", { name: "Return to entry", exact: true })
        .focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "Focus returns to Learn.",
      check: async () => expect(learn).toBeFocused(),
    },
    verifications: [
      {
        spec: "Play remains enabled.",
        check: async () => expect(play).toBeEnabled(),
      },
    ],
    views: [
      { page, player: "Visitor", surface: "game", primary: [play, learn] },
    ],
  });
  await story.step("sign-in", {
    actor: "Commander",
    description: "Sign in through Play and open identity editing.",
    action: async () =>
      login(page, `story-profile-focus-${info.project.name}@example.test`),
    acknowledgement: {
      spec: "The identity editor is ready.",
      check: async () =>
        expect(page.getByLabel("Commander name")).toBeVisible(),
    },
    verifications: [
      {
        spec: "Close and Save remain available.",
        check: async () => {
          await expect(
            page.getByRole("button", { name: "Close", exact: true }),
          ).toBeEnabled();
          await expect(save(page)).toBeEnabled();
        },
      },
    ],
    views: [
      { page, player: "Commander", surface: "game", primary: [save(page)] },
    ],
  });
  await story.step("close-identity", {
    actor: "Commander",
    description:
      "Close identity editing and restore focus to Play with reduced motion.",
    action: async () =>
      page.getByRole("button", { name: "Close", exact: true }).click(),
    acknowledgement: {
      spec: "Focus returns to the Play control that opened identity.",
      check: async () => expect(play).toBeFocused(),
    },
    verifications: [
      {
        spec: "Reduced motion is active and the entry control has no transition duration.",
        check: async () => {
          expect(
            await page.evaluate(
              () => matchMedia("(prefers-reduced-motion: reduce)").matches,
            ),
          ).toBe(true);
          expect(
            await learn.evaluate(
              (el) => getComputedStyle(el).transitionDuration,
            ),
          ).toBe("0s");
        },
      },
    ],
    views: [
      { page, player: "Commander", surface: "game", primary: [play, learn] },
    ],
  });
});
