import { createRequire } from "node:module";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, authenticate } from "./helpers";
import {
  observeProfileWrites,
  profileIdentity,
  profileFacts,
} from "./story-helpers/profile-observer";
import type { Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
async function confirm(page: Page, email: string) {
  const promise = page.waitForEvent("popup");
  await button(page, "Confirm with Google").click();
  const popup = await promise;
  await popup.waitForLoadState();
  await popup.getByRole("button", { name: "Add new account" }).click();
  await popup.getByLabel("Email", { exact: true }).fill(email);
  await popup.getByLabel("Display name", { exact: true }).fill("Commander");
  await popup.getByRole("button", { name: /Sign in with/ }).click();
}
for (const faulted of [false, true])
  test(`Two devices recover ${faulted ? "an interrupted" : "a cancelled"} sign-out without losing saved identity`, async ({
    browser,
    page: a,
  }, info) => {
    test.setTimeout(120000);
    const story = new TestStepHelper(info, {
      id: faulted
        ? "session-interrupted-recovery"
        : "session-cancelled-confirmation",
      title: faulted
        ? "Recover sign-out after a persisted worker interruption"
        : "Cancel confirmation and then end both device sessions",
      inventory: ["UX-01", "UX-14", "UX-16"],
      description:
        "One commander uses two independent authenticated devices. Saved identity survives account-wide sign-out; an unsaved draft remains while confirmation is cancelled. Both devices show the acknowledged session end before fresh sign-in recovers the saved identity.",
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
    const b = await context.newPage();
    const email = `devices-${faulted}-${info.project.name}-${Date.now()}@example.test`;
    const writes = observeProfileWrites(a);
    const view = (page: Page, player: string) => ({
      page,
      player,
      surface: "game" as const,
    });
    const both = [
      view(a, "Commander · first device"),
      view(b, "Commander · second device"),
    ];
    const unchanged = {
      spec: "Saved identity has one revision, one version and one acknowledged receipt.",
      check: async () => {
        const facts = await profileFacts(a, profileIdentity(writes));
        expect(facts.revision).toBe(1);
        expect(facts.versions).toHaveLength(1);
        expect(facts.receipts).toHaveLength(1);
      },
    };
    try {
      await story.harness(
        "two-device-start",
        "Prepare two independent authenticated devices through ordinary sign-in and identity-save controls; the second device holds an unsaved draft.",
        async () => {
          await login(a, email);
          await a.getByLabel("Commander name").fill("Retained commander");
          await button(a, "Save identity").click();
          await expect(a.getByRole("status")).toContainText("Identity saved");
          await login(b, email);
          await expect(b.getByLabel("Commander name")).toHaveValue(
            "Retained commander",
          );
          await b.getByLabel("Commander name").fill("Unsent device draft");
          await button(a, "Close").click();
        },
      );
      await story.step("account-entry", {
        actor: "Commander · first device",
        description:
          "The signed-in entry provides device management while the other device retains its draft.",
        action: async () => {},
        acknowledgement: {
          spec: "Your devices is available.",
          check: async () => expect(button(a, "Your devices")).toBeVisible(),
        },
        verifications: [unchanged],
        views: both,
      });
      await story.step("open-devices", {
        actor: "Commander · first device",
        description: "Open account-wide sign-out confirmation.",
        action: async () => button(a, "Your devices").click(),
        acknowledgement: {
          spec: "The device panel asks for Google confirmation.",
          check: async () =>
            expect(button(a, "Confirm with Google")).toBeEnabled(),
        },
        verifications: [unchanged],
        views: [view(a, "Commander · first device")],
      });
      await story.step("close-devices", {
        actor: "Commander · first device",
        description: "Close the panel and return focus to its opening control.",
        action: async () => button(a, "Close").click(),
        acknowledgement: {
          spec: "Your devices regains keyboard focus.",
          check: async () => expect(button(a, "Your devices")).toBeFocused(),
        },
        verifications: [unchanged],
        views: [view(a, "Commander · first device")],
      });
      await story.step("cancel-confirmation", {
        actor: "Commander · first device",
        description:
          "Reopen devices and cancel the Google confirmation popup. No session has ended.",
        action: async () => {
          await button(a, "Your devices").click();
          const promise = a.waitForEvent("popup");
          await button(a, "Confirm with Google").click();
          const popup = await promise;
          await popup.waitForLoadState();
          await popup.close();
        },
        acknowledgement: {
          spec: "The uncertain completion alert receives focus.",
          check: async () => {
            await expect(a.getByRole("alert")).toContainText(
              "Sign-out completion could not be confirmed",
              { timeout: 20000 },
            );
            await expect(a.getByRole("alert")).toBeFocused();
          },
        },
        verifications: [
          unchanged,
          {
            spec: "The second device still holds its unsent draft.",
            check: async () =>
              expect(b.getByLabel("Commander name")).toHaveValue(
                "Unsent device draft",
              ),
          },
        ],
        views: both,
      });
      if (faulted) {
        let interrupted = false;
        await story.harness(
          "persisted-worker-interruption",
          "Intercept the actual authenticated callable, invoke its real service transaction, stop after its fence persists and expire only the stopped worker lease. No identity, command or session result is fabricated.",
          async () => {
            const require = createRequire(
              new URL("../../functions/package.json", import.meta.url),
            );
            const admin = require("firebase-admin/app");
            if (!admin.getApps().length)
              admin.initializeApp({ projectId: "demo-clusterii" });
            const db = require("firebase-admin/firestore").getFirestore();
            const {
              revokeCredentials,
            } = require("./lib/functions/src/credential-revocation.js");
            await a.route("**/revokeCredentials", async (route) => {
              if (route.request().method() !== "POST" || interrupted) {
                await route.continue();
                return;
              }
              const token = await require("firebase-admin/auth")
                .getAuth()
                .verifyIdToken(
                  route
                    .request()
                    .headers()
                    .authorization.replace(/^Bearer /, ""),
                );
              const original = db.runTransaction.bind(db);
              db.runTransaction = async (...args: unknown[]) => {
                const result = await original(...args);
                interrupted = true;
                throw new Error("Stopped before database mirror");
              };
              try {
                let error: unknown;
                try {
                  await revokeCredentials.run({
                    auth: { uid: token.uid, token },
                    data: route.request().postDataJSON().data,
                  });
                } catch (e) {
                  error = e;
                }
                expect((error as Error).message).toBe(
                  "Stopped before database mirror",
                );
                expect(
                  (await db.doc(`sessionFences/${token.uid}`).get()).get(
                    "status",
                  ),
                ).toBe("pending");
                // The stopped worker's lease expires; recovery claims a new token.
                await db
                  .doc(
                    `sessionRevocations/${token.uid}/operations/${route.request().postDataJSON().data.operationId}`,
                  )
                  .update({ leaseUntil: 0 });
              } finally {
                db.runTransaction = original;
              }
              await route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({
                  error: {
                    status: "INTERNAL",
                    message: "Interrupted after persisted fence",
                  },
                }),
              });
            });
          },
        );
        await story.step("interrupted-confirmation", {
          actor: "Commander · first device",
          description:
            "Confirm with Google; the worker stops after recording the session fence, leaving completion uncertain.",
          action: async () => confirm(a, email),
          acknowledgement: {
            spec: "Completion remains uncertain after the real persisted fence.",
            check: async () => {
              await expect(a.getByRole("alert")).toContainText(
                "Sign-out completion could not be confirmed",
              );
              expect(interrupted).toBe(true);
            },
          },
          verifications: [unchanged],
          views: both,
        });
        await story.harness(
          "restore-transport",
          "Remove the one-request transport interruption so normal callable recovery can claim the expired lease.",
          async () => a.unroute("**/revokeCredentials"),
        );
        await story.step("reload-recovery", {
          actor: "Commander · first device",
          description:
            "Reload restores the unfinished sign-out panel and its confirmation action.",
          action: async () => {
            await a.reload();
          },
          acknowledgement: {
            spec: "The persisted recovery panel is ready for confirmation.",
            check: async () => {
              await expect(
                a.getByRole("heading", { name: "Your devices.", exact: true }),
              ).toBeVisible();
              await expect(button(a, "Confirm with Google")).toBeEnabled();
            },
          },
          verifications: [unchanged],
          views: both,
        });
      }
      await story.step("end-both-sessions", {
        actor: "Commander · first device",
        description:
          "Confirm account-wide sign-out. Both devices acknowledge the ended session and discard their editors.",
        action: async () => confirm(a, email),
        acknowledgement: {
          spec: "Both devices acknowledge session end and focus Play.",
          check: async () => {
            for (const page of [a, b]) {
              await expect(page.getByRole("status")).toHaveText(
                "Your session ended. Sign in to continue.",
              );
              await expect(button(page, "Play")).toBeFocused();
              await expect(page.getByLabel("Commander name")).toHaveCount(0);
            }
          },
        },
        verifications: [unchanged],
        views: both,
      });
      await story.harness(
        "auth-time-boundary",
        "Firebase auth_time uses whole seconds. Wait until a fresh sign-in is strictly after the acknowledged revocation cutoff; this changes no service clock or state.",
        async () => {
          const boundary = Math.floor(Date.now() / 1000);
          await expect
            .poll(() => Math.floor(Date.now() / 1000), { timeout: 3000 })
            .toBeGreaterThan(boundary);
        },
      );
      await story.step("fresh-sign-in", {
        actor: "Commander · first device",
        description:
          "Sign in again and recover the saved identity, not the other device’s discarded draft.",
        action: async () => authenticate(a, email),
        acknowledgement: {
          spec: "The saved commander identity is restored.",
          check: async () =>
            expect(a.getByLabel("Commander name")).toHaveValue(
              "Retained commander",
            ),
        },
        verifications: [
          unchanged,
          {
            spec: "Recovered identity does not claim a new save from the ended session.",
            check: async () =>
              expect(
                a.getByRole("status").filter({ hasText: "Identity saved" }),
              ).toHaveCount(0),
          },
        ],
        views: both,
      });
      await story.step("reload-identity", {
        actor: "Commander · first device",
        description:
          "Reload and reopen identity without saving another revision.",
        action: async () => {
          await a.reload();
          await button(a, "Your identity").click();
        },
        acknowledgement: {
          spec: "The same saved identity survives reload.",
          check: async () =>
            expect(a.getByLabel("Commander name")).toHaveValue(
              "Retained commander",
            ),
        },
        verifications: [unchanged],
        views: [view(a, "Commander · first device")],
      });
    } finally {
      await context.close();
    }
  });
