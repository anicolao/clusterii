import { createRequire } from "node:module";
import type { Page, BrowserContext, Locator } from "@playwright/test";
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import {
  admissionAt,
  scheduledAt,
  admissionPrefix,
} from "./story-helpers/admission-clock.mjs";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Private conversations", exact: true });
const open = (page: Page) =>
  page.getByRole("button", { name: /^Conversations(?: · New)?$/ }).click();
const chooseRoom = async (page: Page) => {
  const directory = panel(page).getByRole("complementary", {
    name: "Conversations list",
    exact: true,
  });
  if (!(await directory.isVisible()))
    await panel(page)
      .getByRole("button", { name: "Conversations", exact: true })
      .click();
  await panel(page)
    .getByRole("button", { name: new RegExp(`^${roomTitle}`) })
    .click();
};
async function readConversation(page: Page, target: Locator) {
  await expect(panel(page).locator("footer")).toBeInViewport({ ratio: 1 });
  await target.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(target).toBeInViewport({ ratio: 1 });
  const box = await target.boundingBox(),
    region = await panel(page)
      .getByRole("region", { name: "Conversation details" })
      .boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(region!.y);
  expect(box!.y + box!.height).toBeLessThanOrEqual(region!.y + region!.height);
}
const aliases = [
  "Nacre envoy",
  "Dawn listener",
  "Outer witness",
  "Fourth envoy",
];
const roomTitle = "Nacre accord";
const selected = "Our rendezvous is at the blue star.";
const secret = "The reserve route remains private.";

test("Selected history reaches only a consenting commander and survives reload", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(300000);
  const story = new TestStepHelper(info, {
    id: "selected-history-consent",
    title: "Consent to one earlier diplomatic message",
    inventory: ["UX-10", "UX-14", "UX-16"],
    description:
      "Independent commanders use authenticated development-provider commands. The creator shares one of two earlier messages; the recipient reviews and accepts its scope, then reloads. An uninvolved commander never receives the room or either message. Admission uses the labelled emulator clock and actual scheduler endpoint, not injected state. Managed-key and fault journeys remain separate coverage.",
  });
  const contexts: BrowserContext[] = [],
    pages: Page[] = [];
  let holdingSend = false;
  const heldSends: {
    server: import("@playwright/test").WebSocketRoute;
    raw: string | Buffer;
    active: () => boolean;
  }[] = [];
  const sendWrites: { p: string; d: Record<string, unknown> }[] = [];
  const emails: string[] = [];
  const errors: string[] = [];
  const noErrors = {
    spec: "No viewpoint has an uncaught application error.",
    check: async () => expect(errors).toEqual([]),
  };
  const view = (i: number) => ({
    page: pages[i],
    player: aliases[i],
    surface: "game" as const,
  });
  const require = createRequire(
    new URL("../../functions/package.json", import.meta.url),
  );
  const admin = require("firebase-admin/app");
  if (!admin.getApps().length)
    admin.initializeApp({ projectId: "demo-clusterii" });
  const db = require("firebase-admin/firestore").getFirestore();
  const { provider, unwrap } = require("./lib/shared/crypto.js");
  const { context } = require("./lib/functions/src/campaigns.js");
  let url = "",
    id = "";
  const canonical = async () => {
    const h = await db.doc(`campaignStates/${id}`).get();
    return provider("mock").open(
      h.get("envelope"),
      h.get("canonicalKey"),
      context(id, h.get("revision"), "canonical", 1),
    );
  };
  const published = async (seat: number) => {
    const state = await canonical(),
      uid = state.seats[seat].uid;
    const h = await db.doc(`campaignViews/${id}/members/${uid}`).get();
    const key = await db.doc(`campaignKeys/${id}/members/${uid}`).get();
    const ctx = context(id, h.get("revision"), `member:${uid}`, 1);
    return provider("mock").open(
      h.get("envelope"),
      await unwrap(h.get("grant"), key.get("kek"), uid, ctx, "mock"),
      ctx,
    );
  };
  const outsiderPrivate = {
    spec: "The outsider's UI and serialized authorized view contain neither private room nor either message.",
    check: async () => {
      for (const text of [roomTitle, selected, secret]) {
        await expect(panel(pages[2])).not.toContainText(text);
        expect(JSON.stringify(await published(2))).not.toContain(text);
      }
    },
  };
  try {
    for (let i = 0; i < 4; i++)
      await story.harness(
        `identity-${i + 1}`,
        "Ordinary emulator sign-in and identity save, with explicit developer entitlement and fixed browser Date; timers continue normally.",
        async () => {
          const ctx = await browser.newContext({
            viewport: info.project.use.viewport,
            baseURL: info.project.use.baseURL,
            deviceScaleFactor: 1,
            locale: "en-US",
            timezoneId: "UTC",
            colorScheme: "dark",
            reducedMotion: "reduce",
          });
          contexts.push(ctx);
          if (i === 0)
            await ctx.routeWebSocket(/127\.0\.0\.1:19000/, (ws) => {
              const server = ws.connectToServer();
              let active = true;
              ws.onClose(() => {
                active = false;
                server.close();
              });
              ws.onMessage((raw) => {
                let frame;
                try {
                  frame = JSON.parse(String(raw));
                } catch {}
                if (
                  holdingSend &&
                  frame?.d?.a === "p" &&
                  frame.d.b?.d?.kind === "conversation.send"
                ) {
                  sendWrites.push(frame.d.b);
                  heldSends.push({ server, raw, active: () => active });
                } else server.send(raw);
              });
              server.onMessage((raw) => ws.send(raw));
            });
          const page = await ctx.newPage();
          pages.push(page);
          page.on("pageerror", (error) => errors.push(error.message));
          const email = `consent-${info.project.name}-${i}-${Date.now()}@example.test`;
          emails.push(email);
          await login(page, email);
          await page.getByLabel("Commander name").fill(aliases[i]);
          await button(page, "Save identity").click();
          await expect(page.getByRole("status")).toContainText(
            "Identity saved",
          );
          await grantDeveloper(email);
          await button(page, "Close").click();
          await button(page, "Play").click();
          await page.clock.setFixedTime(admissionAt);
        },
      );
    for (let i = 0; i < 4; i++)
      await story.harness(
        `admit-${i + 1}`,
        "Create/join through ordinary campaign controls. Fixed catalogue and admission clock are test controls; no seat, message or command outcome is injected.",
        async () => {
          const page = pages[i];
          if (!i) {
            await button(page, "Create campaign").click();
            await page
              .getByLabel("Campaign name")
              .fill(`${admissionPrefix}consent ${info.project.name}`);
            await button(page, "Create galaxy").click();
            await expect(
              page.getByRole("heading", {
                name: "Choose your faction",
                exact: true,
              }),
            ).toBeVisible();
            url = page.url();
            id = new URL(url).searchParams.get("campaign")!;
          } else await page.goto(url);
          await page
            .getByRole("radio", {
              name: new RegExp(
                [
                  "Heliac Assembly",
                  "Pelagic Concord",
                  "Vesper Synod",
                  "Dracon League",
                ][i],
              ),
            })
            .check();
          await button(page, "Claim your seat").click();
          await expect(
            page.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
        },
      );
    await story.harness(
      "scheduler-delivery",
      "Advance the designated browser/domain clock to 12:15 UTC and deliver the actual emulator Scheduler HTTP request. This does not certify hosted scheduling.",
      async () => {
        for (const page of pages) await page.clock.setFixedTime(scheduledAt);
        const response = await request.post(
          "http://127.0.0.1:15001/demo-clusterii/us-central1/startScheduledCampaigns-0",
          {
            headers: {
              "X-CloudScheduler-JobName": "emulator-admission-story",
              "X-CloudScheduler-ScheduleTime": new Date(
                scheduledAt,
              ).toISOString(),
            },
          },
        );
        expect(response.ok()).toBe(true);
        for (const page of pages) {
          expect((await canonical()).phase).toBe("active");
          await expect(
            page.getByText(
              "Contact markers show acquired positions from loaded records.",
              { exact: true },
            ),
          ).toBeVisible();
        }
      },
    );
    const owner = pages[0],
      guest = pages[1];
    await story.step("private-room", {
      actor: aliases[0],
      description:
        "Create a private room while the recipient and outsider inspect their own empty directories.",
      action: async () => {
        for (const page of pages.slice(0, 3)) await open(page);
        await panel(owner)
          .getByLabel("Conversation title", { exact: true })
          .fill(roomTitle);
        await panel(owner)
          .getByRole("button", { name: "Create conversation", exact: true })
          .click();
      },
      acknowledgement: {
        spec: "The authoritative room appears only for its creator.",
        check: async () =>
          expect(
            panel(owner).getByRole("heading", { name: roomTitle, exact: true }),
          ).toBeVisible(),
      },
      verifications: [
        noErrors,
        outsiderPrivate,
        {
          spec: "The future recipient cannot see the room before invitation.",
          check: async () => expect(panel(guest)).not.toContainText(roomTitle),
        },
      ],
      views: [view(0), view(1), view(2)],
    });
    for (const [index, text] of [secret, selected].entries())
      await story.step(`earlier-message-${index + 1}`, {
        actor: aliases[0],
        description: `Send ${index ? "the rendezvous message that will be selected" : "a reserve-route message that stays private"}.`,
        action: async () => {
          await panel(owner).getByLabel("Message", { exact: true }).fill(text);
          await panel(owner)
            .getByRole("button", { name: "Send message", exact: true })
            .click();
        },
        acknowledgement: {
          spec: "The command is acknowledged as Message sent and appears in the creator's authorized messages.",
          check: async () => {
            await expect(
              panel(owner)
                .getByRole("group", { name: "Conversation acknowledgement" })
                .getByRole("status"),
            ).toHaveText("Message sent.");
            await expect(
              panel(owner).getByRole("list", { name: "Authorized messages" }),
            ).toContainText(text);
          },
        },
        verifications: [
          noErrors,
          outsiderPrivate,
          {
            spec: "The acknowledged composer clears its submitted text.",
            check: async () =>
              expect(
                panel(owner).getByLabel("Message", { exact: true }),
              ).toHaveValue(""),
          },
        ],
        views: [view(0)],
      });
    await story.step("choose-history", {
      actor: aliases[0],
      description:
        "Select Dawn listener and exactly one earlier message; keep the reserve route unselected.",
      action: async () => {
        await panel(owner)
          .getByRole("button", { name: "Participants", exact: true })
          .click();
        await panel(owner)
          .getByRole("combobox", { name: "Commander", exact: true })
          .selectOption({ label: aliases[1] });
        await panel(owner)
          .getByRole("radio", {
            name: "Selected earlier messages and future messages",
          })
          .check();
        await panel(owner)
          .locator("label.history-choice")
          .filter({ hasText: selected })
          .getByRole("checkbox")
          .check();
      },
      acknowledgement: {
        spec: "The invitation control identifies one selected earlier message.",
        check: async () =>
          expect(
            panel(owner).getByRole("button", {
              name: /Invite Dawn listener.*1 earlier message/,
            }),
          ).toBeEnabled(),
      },
      verifications: [
        noErrors,
        {
          spec: "The reserve message remains unchecked and stale send feedback is absent.",
          check: async () => {
            await expect(
              panel(owner)
                .locator("label.history-choice")
                .filter({ hasText: secret })
                .getByRole("checkbox"),
            ).not.toBeChecked();
            await expect(
              panel(owner).getByRole("group", {
                name: "Conversation acknowledgement",
              }),
            ).not.toContainText("Message sent.");
          },
        },
      ],
      views: [view(0)],
    });
    await story.step("invite", {
      actor: aliases[0],
      description:
        "Send the selected-history invitation; the recipient sees scope and provenance but no message body before consent.",
      action: async () => {
        await panel(owner)
          .getByRole("button", { name: /Invite Dawn listener/ })
          .click();
        await chooseRoom(guest);
      },
      acknowledgement: {
        spec: "The independently authenticated recipient receives the one-message invitation.",
        check: async () =>
          expect(panel(guest)).toContainText(
            "You will receive 1 selected earlier message",
          ),
      },
      verifications: [
        noErrors,
        outsiderPrivate,
        {
          spec: "Neither message body is present in the recipient's UI or serialized authorized projection before consent.",
          check: async () => {
            for (const text of [secret, selected]) {
              await expect(panel(guest)).not.toContainText(text);
              expect(JSON.stringify(await published(1))).not.toContain(text);
            }
          },
        },
      ],
      views: [
        view(0),
        { ...view(1), primary: [button(guest, "Accept invitation")] },
        view(2),
      ],
    });
    const readSharedMessage = {
      spec: "Keyboard Home and bounded reading reveal the complete shared message, author and provenance while the commitment rail stays visible.",
      check: async () => {
        const reading = panel(guest).getByRole("region", {
          name: "Conversation details",
          exact: true,
        });
        await reading.focus();
        await guest.keyboard.press("Home");
        const entry = panel(guest)
          .getByRole("list", { name: "Authorized messages" })
          .getByRole("listitem")
          .filter({ hasText: selected });
        const rail = await button(guest, "Back to galaxy").boundingBox();
        expect(rail).not.toBeNull();
        expect(rail!.y).toBeGreaterThanOrEqual(0);
        expect(rail!.y + rail!.height).toBeLessThanOrEqual(
          guest.viewportSize()!.height,
        );
        await entry.scrollIntoViewIfNeeded();
        await expect
          .poll(async () => {
            const outer = await reading.boundingBox(),
              inner = await entry.boundingBox();
            return (
              !!outer &&
              !!inner &&
              inner.y >= outer.y &&
              inner.y + inner.height <= outer.y + outer.height
            );
          })
          .toBe(true);
      },
    };
    const before = await canonical();
    await story.step("consent", {
      actor: aliases[1],
      description:
        "Accept the invitation using the keyboard. Only the selected earlier message becomes readable, with its sharing provenance.",
      action: async () => {
        await button(guest, "Accept invitation").focus();
        await guest.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The accepted membership publishes the selected message to the recipient.",
        check: async () =>
          expect(
            panel(guest).getByRole("list", { name: "Authorized messages" }),
          ).toContainText(selected),
      },
      verifications: [
        noErrors,
        outsiderPrivate,
        readSharedMessage,
        {
          spec: "Acceptance makes exactly one authoritative revision, excludes the reserve message, and names the sharing commander.",
          check: async () => {
            expect((await canonical()).revision).toBe(before.revision + 1);
            await expect(panel(guest)).not.toContainText(secret);
            const delivered = JSON.stringify(await published(1));
            expect(delivered).toContain(selected);
            expect(delivered).not.toContain(secret);
            await expect(panel(guest)).toContainText(
              `Selected earlier history · shared by ${aliases[0]}`,
            );
          },
        },
      ],
      views: [view(0), view(1), view(2)],
    });
    await story.step("recover-consent", {
      actor: aliases[1],
      description:
        "Reload and reopen the accepted room without resending acceptance or expanding its history grant.",
      action: async () => {
        await guest.reload();
        await open(guest);
        await chooseRoom(guest);
      },
      acknowledgement: {
        spec: "The recovered authorized messages still contain the selected rendezvous note.",
        check: async () =>
          expect(
            panel(guest).getByRole("list", { name: "Authorized messages" }),
          ).toContainText(selected),
      },
      verifications: [
        noErrors,
        outsiderPrivate,
        readSharedMessage,
        {
          spec: "Recovery causes no extra revision and never exposes the unselected message.",
          check: async () => {
            expect((await canonical()).revision).toBe(before.revision + 1);
            await expect(panel(guest)).not.toContainText(secret);
          },
        },
      ],
      views: [view(1), view(2)],
    });
    await story.step("return-to-chart", {
      actor: aliases[1],
      description:
        "Escape closes the conversation and restores keyboard focus to its opening control.",
      action: async () => {
        await guest.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "The chart returns focus to Conversations.",
        check: async () =>
          expect(
            guest.getByRole("button", { name: /^Conversations(?: · New)?$/ }),
          ).toBeFocused(),
      },
      verifications: [
        noErrors,
        {
          spec: "Private conversation details are no longer visible.",
          check: async () => expect(panel(guest)).not.toBeVisible(),
        },
      ],
      views: [view(1)],
    });

    const revokedRevision = (await canonical()).revision;
    await story.step("review-removal", {
      actor: aliases[0],
      description:
        "The creator reviews removal of the consenting listener before committing it.",
      action: async () => {
        const participants = panel(owner).getByRole("button", {
          name: "Participants",
          exact: true,
        });
        if ((await participants.getAttribute("aria-expanded")) !== "true")
          await participants.click();
        await expect(participants).toHaveAttribute("aria-expanded", "true");
        await button(owner, `Remove ${aliases[1]}`).click();
      },
      acknowledgement: {
        spec: "The removal confirmation is available without changing membership.",
        check: async () => {
          await expect(button(owner, "Confirm remove")).toBeVisible();
          await readConversation(
            owner,
            panel(owner).getByRole("region", {
              name: "Review conversation access",
            }),
          );
          expect((await canonical()).revision).toBe(revokedRevision);
        },
      },
      verifications: [noErrors, outsiderPrivate],
      views: [view(0)],
    });
    await story.step("remove-current-access", {
      actor: aliases[0],
      description:
        "Confirm removal with the keyboard. The listener retains already shared history while current conversation access ends.",
      action: async () => {
        await open(guest);
        await chooseRoom(guest);
        await button(owner, "Confirm remove").focus();
        await owner.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The listener sees authoritative access-ended feedback and cannot compose a new message.",
        check: async () => {
          await expect(panel(guest)).toContainText(
            "Your current access to this conversation has ended",
          );
          await expect(
            panel(guest).getByLabel("Message", { exact: true }),
          ).toHaveCount(0);
        },
      },
      verifications: [
        noErrors,
        outsiderPrivate,
        {
          spec: "Exactly one revision removes the listener without expanding previous history.",
          check: async () => {
            const state = await canonical();
            expect(state.revision).toBe(revokedRevision + 1);
            const room = Object.values(state.diplomacy.rooms)[0] as {
              members: string[];
            };
            expect(room.members).not.toContain(state.seats[1].uid);
            await expect(panel(guest)).toContainText(
              "Previously received records remain in your campaign",
            );
            await expect(panel(guest)).not.toContainText(secret);
          },
        },
      ],
      views: [view(0), view(1), view(2)],
    });
    const absentMessage =
      "The new meeting point is private during your absence.";
    const revokedPrivate = {
      spec: "Removed and outsider recipients receive no post-removal message in UI or serialized views.",
      check: async () => {
        for (const seat of [1, 2]) {
          await expect(panel(pages[seat])).not.toContainText(absentMessage);
          expect(JSON.stringify(await published(seat))).not.toContain(
            absentMessage,
          );
        }
      },
    };
    await story.step("message-after-removal", {
      actor: aliases[0],
      description:
        "The creator sends a new private message after removal; neither the former member nor outsider receives it.",
      action: async () => {
        await button(owner, "Participants").click();
        await panel(owner)
          .getByLabel("Message", { exact: true })
          .fill(absentMessage);
        await button(owner, "Send message").click();
      },
      acknowledgement: {
        spec: "Message sent acknowledges the command and the creator can read its text.",
        check: async () => {
          await expect(
            panel(owner)
              .getByRole("group", { name: "Conversation acknowledgement" })
              .getByRole("status"),
          ).toHaveText("Message sent.");
          await expect(
            panel(owner).getByRole("list", { name: "Authorized messages" }),
          ).toContainText(absentMessage);
          await readConversation(
            owner,
            panel(owner)
              .getByRole("listitem")
              .filter({ hasText: absentMessage }),
          );
        },
      },
      verifications: [
        noErrors,
        outsiderPrivate,
        revokedPrivate,
        {
          spec: "The post-removal message commits exactly once.",
          check: async () =>
            expect((await canonical()).revision).toBe(revokedRevision + 2),
        },
      ],
      views: [view(0), view(1), view(2)],
    });

    const retainedHistory = guest.getByRole("region", {
      name: "Campaign history",
      exact: true,
    });
    const receivedRecord = retainedHistory.getByLabel(
      `Campaign record ${before.revision + 1}`,
      { exact: true },
    );
    await story.step("recover-retained-history", {
      actor: aliases[1],
      description:
        "Reload, then open Campaign history to recover the selected message received before removal. The live room is no longer accessible.",
      action: async () => {
        await guest.reload();
        await button(guest, "History").focus();
        await guest.keyboard.press("Enter");
        await expect(receivedRecord).toBeVisible();
        await receivedRecord.locator("summary").focus();
        await guest.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The accepted-consent record exposes the previously received rendezvous message.",
        check: async () =>
          expect(
            receivedRecord.getByRole("article", {
              name: "Previously received message",
            }),
          ).toContainText(selected),
      },
      verifications: [
        noErrors,
        outsiderPrivate,
        {
          spec: "Reload and both motion preferences preserve the exact revision and exclude ungranted messages from historical reading.",
          check: async () => {
            expect((await canonical()).revision).toBe(revokedRevision + 2);
            await expect(retainedHistory).not.toContainText(secret);
            await expect(retainedHistory).not.toContainText(absentMessage);
            expect(JSON.stringify(await published(1))).not.toContain(
              absentMessage,
            );
            const back = button(guest, "Return to galaxy");
            await expect(back).toBeInViewport({ ratio: 1 });
            const article = receivedRecord.getByRole("article", {
              name: "Previously received message",
            });
            await article.evaluate((el) =>
              el.scrollIntoView({ block: "center" }),
            );
            await expect(article).toBeInViewport({ ratio: 1 });
            const inner = await article.boundingBox(),
              outer = await retainedHistory
                .getByRole("region", { name: "Saved campaign records" })
                .boundingBox();
            expect(inner!.y).toBeGreaterThanOrEqual(outer!.y);
            expect(inner!.y + inner!.height).toBeLessThanOrEqual(
              outer!.y + outer!.height,
            );
            await guest.emulateMedia({ reducedMotion: "no-preference" });
            await expect(article).toContainText(selected);
            expect((await canonical()).revision).toBe(revokedRevision + 2);
            await guest.emulateMedia({ reducedMotion: "reduce" });
          },
        },
      ],
      views: [view(1), view(2)],
    });
    await story.step("leave-retained-history", {
      actor: aliases[1],
      description:
        "Escape closes retained history and restores focus to History on the galaxy.",
      action: async () => {
        await guest.keyboard.press("Escape");
      },
      acknowledgement: {
        spec: "Focus returns to History.",
        check: async () => expect(button(guest, "History")).toBeFocused(),
      },
      verifications: [
        noErrors,
        {
          spec: "No private history panel remains visible.",
          check: async () => expect(retainedHistory).not.toBeVisible(),
        },
      ],
      views: [view(1)],
    });

    const startingDraft = "A private reply retained across reload.";
    const savedDraft = "First tab proposes a private rendezvous.";
    const conflictingDraft = "Second tab preserves a different rendezvous.";
    const draftBase = await canonical();
    const roomId = Object.keys(draftBase.diplomacy.rooms)[0];
    const composer = (p: Page) =>
      panel(p).getByLabel("Message", { exact: true });
    const draftStatus = (p: Page) =>
      panel(p).getByRole("status", { name: "Browser draft status" });
    const draftsPrivate = {
      spec: "Unsent drafts never change canonical state or appear in other recipients' projections.",
      check: async () => {
        expect(await canonical()).toEqual(draftBase);
        for (const seat of [1, 2])
          for (const text of [startingDraft, savedDraft, conflictingDraft])
            expect(JSON.stringify(await published(seat))).not.toContain(text);
      },
    };
    await story.step("save-private-browser-draft", {
      actor: aliases[0],
      description:
        "Write a private reply and wait for this browser's durable draft acknowledgement without sending it.",
      action: async () => {
        await composer(owner).fill(startingDraft);
      },
      acknowledgement: {
        spec: "Browser storage acknowledges the saved draft without presenting it as a sent message.",
        check: async () => {
          await expect(draftStatus(owner)).toHaveText(
            "Draft saved on this browser.",
          );
          await expect(
            panel(owner).getByRole("group", {
              name: "Conversation acknowledgement",
            }),
          ).not.toContainText("Message sent.");
          await expect(composer(owner)).toHaveValue(startingDraft);
        },
      },
      verifications: [noErrors, draftsPrivate],
      views: [view(0)],
    });
    let second: Page;
    await story.step("recover-draft-in-two-tabs", {
      actor: aliases[0],
      description:
        "Reload the creator's session and open a second authenticated tab. Both recover the same unsent reply from this browser.",
      action: async () => {
        await owner.reload();
        await open(owner);
        await chooseRoom(owner);
        second = await contexts[0].newPage();
        second.on("pageerror", (e) => errors.push(e.message));
        await second.clock.setFixedTime(scheduledAt);
        await second.goto(url);
        await open(second);
        await chooseRoom(second);
      },
      acknowledgement: {
        spec: "Both composers recover the exact saved text.",
        check: async () => {
          await expect(composer(owner)).toHaveValue(startingDraft);
          await expect(composer(second!)).toHaveValue(startingDraft);
        },
      },
      verifications: [noErrors, draftsPrivate],
      views: [
        view(0),
        {
          page: () => second!,
          player: `${aliases[0]} · second tab`,
          surface: "game",
        },
      ],
    });
    await story.step("preserve-conflicting-draft", {
      actor: aliases[0],
      description:
        "Save a new reply in the first tab, then edit the second tab. The conflict preserves the second tab's text and blocks sending until resolved.",
      action: async () => {
        await composer(owner).fill(savedDraft);
        await expect(draftStatus(owner)).toHaveText(
          "Draft saved on this browser.",
        );
        await composer(second!).fill(conflictingDraft);
      },
      acknowledgement: {
        spec: "The second tab explains the competing saved draft without discarding its local text.",
        check: async () => {
          await expect(panel(second!).getByRole("alert")).toContainText(
            "another tab",
          );
          await expect(composer(second!)).toHaveValue(conflictingDraft);
          await expect(button(second!, "Send message")).toBeDisabled();
        },
      },
      verifications: [
        noErrors,
        draftsPrivate,
        {
          spec: "Conflict remedies and composer remain in the visible fixed footer.",
          check: async () => {
            await expect(panel(second!).locator("footer")).toBeInViewport({
              ratio: 1,
            });
            await expect(button(second!, "Use saved draft")).toBeInViewport({
              ratio: 1,
            });
            await expect(
              button(second!, "Replace saved draft with my text"),
            ).toBeInViewport({ ratio: 1 });
          },
        },
      ],
      views: [
        view(0),
        {
          page: () => second!,
          player: `${aliases[0]} · second tab`,
          surface: "game",
        },
      ],
    });
    await story.step("choose-saved-draft", {
      actor: aliases[0],
      description:
        "Use the keyboard to choose the first tab's saved reply explicitly. No message is sent by resolving the conflict.",
      action: async () => {
        await button(second!, "Use saved draft").focus();
        await second!.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The chosen saved reply replaces local text and clears the conflict.",
        check: async () => {
          await expect(composer(second!)).toHaveValue(savedDraft);
          await expect(panel(second!).getByRole("alert")).toHaveCount(0);
          await expect(button(second!, "Send message")).toBeEnabled();
        },
      },
      verifications: [noErrors, draftsPrivate],
      views: [
        {
          page: () => second!,
          player: `${aliases[0]} · second tab`,
          surface: "game",
        },
      ],
    });
    await story.step("send-recovered-draft-once", {
      actor: aliases[0],
      description:
        "Send the explicitly chosen reply. Only the creator's current membership receives it; former members and outsiders receive nothing.",
      action: async () => {
        await button(second!, "Send message").focus();
        await second!.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "Message sent acknowledges the recovered reply and clears its composer.",
        check: async () => {
          await expect(
            panel(second!)
              .getByRole("group", { name: "Conversation acknowledgement" })
              .getByRole("status"),
          ).toHaveText("Message sent.");
          await expect(composer(second!)).toHaveValue("");
        },
      },
      verifications: [
        noErrors,
        {
          spec: "Exactly one message sequence and campaign revision are committed, without the discarded text or unauthorized recipients.",
          check: async () => {
            const state = await canonical();
            expect(state.revision).toBe(draftBase.revision + 1);
            expect(state.diplomacy.rooms[roomId].sequence).toBe(
              draftBase.diplomacy.rooms[roomId].sequence + 1,
            );
            expect(state.diplomacy.rooms[roomId].message.body).toBe(savedDraft);
            for (const seat of [1, 2])
              expect(JSON.stringify(await published(seat))).not.toContain(
                savedDraft,
              );
            await readConversation(
              second!,
              panel(second!)
                .getByRole("listitem")
                .filter({ hasText: savedDraft }),
            );
          },
        },
      ],
      views: [
        {
          page: () => second!,
          player: `${aliases[0]} · second tab`,
          surface: "game",
        },
        view(2),
      ],
    });
    await story.step("recover-cleared-draft", {
      actor: aliases[0],
      description:
        "Reload the sending tab. The sent reply remains in authorized history, and its saved draft stays cleared without a duplicate send.",
      action: async () => {
        await second!.reload();
        await open(second!);
        await chooseRoom(second!);
      },
      acknowledgement: {
        spec: "Reload restores the sent message with an empty composer.",
        check: async () => {
          await expect(composer(second!)).toHaveValue("");
          await expect(
            panel(second!).getByRole("list", { name: "Authorized messages" }),
          ).toContainText(savedDraft);
        },
      },
      verifications: [
        noErrors,
        {
          spec: "Recovery and motion preferences preserve one committed effect and privacy.",
          check: async () => {
            expect((await canonical()).revision).toBe(draftBase.revision + 1);
            await second!.emulateMedia({ reducedMotion: "no-preference" });
            await expect(composer(second!)).toHaveValue("");
            await second!.emulateMedia({ reducedMotion: "reduce" });
            for (const seat of [1, 2])
              expect(JSON.stringify(await published(seat))).not.toContain(
                savedDraft,
              );
            await readConversation(
              second!,
              panel(second!)
                .getByRole("listitem")
                .filter({ hasText: savedDraft }),
            );
          },
        },
      ],
      views: [
        {
          page: () => second!,
          player: `${aliases[0]} · second tab`,
          surface: "game",
        },
      ],
    });
    const replacementBase = await canonical();
    const baseText = "An unsent proposal for both tabs.";
    const remoteText = "The first tab keeps the northern rendezvous.";
    const chosenText = "The second tab chooses the southern rendezvous.";
    const replacementPrivate = {
      spec: "Draft decisions leave the complete canonical campaign unchanged and disclose no text to removed members or outsiders.",
      check: async () => {
        expect(await canonical()).toEqual(replacementBase);
        for (const seat of [1, 2])
          for (const text of [baseText, remoteText, chosenText])
            expect(JSON.stringify(await published(seat))).not.toContain(text);
      },
    };
    const secondView = {
      page: () => second!,
      player: `${aliases[0]} · second tab`,
      surface: "game" as const,
    };
    await story.step("prepare-replacement-choice", {
      actor: aliases[0],
      description:
        "Reload the first tab and save a new unsent proposal. Reload the second tab to recover the same browser draft before editing independently.",
      action: async () => {
        await owner.reload();
        await open(owner);
        await chooseRoom(owner);
        await composer(owner).fill(baseText);
        await expect(draftStatus(owner)).toHaveText(
          "Draft saved on this browser.",
        );
        await second!.reload();
        await open(second!);
        await chooseRoom(second!);
      },
      acknowledgement: {
        spec: "Both tabs recover the same unsent proposal.",
        check: async () => {
          await expect(composer(owner)).toHaveValue(baseText);
          await expect(composer(second!)).toHaveValue(baseText);
        },
      },
      verifications: [noErrors, replacementPrivate],
      views: [view(0), secondView],
    });
    await story.step("review-competing-replacement", {
      actor: aliases[0],
      description:
        "Save a northern rendezvous in the first tab, then propose a southern rendezvous in the second. Keep both texts available while choosing which draft to retain.",
      action: async () => {
        await composer(owner).fill(remoteText);
        await expect(draftStatus(owner)).toHaveText(
          "Draft saved on this browser.",
        );
        await composer(second!).fill(chosenText);
      },
      acknowledgement: {
        spec: "A revision conflict preserves the second tab's proposal and blocks sending.",
        check: async () => {
          await expect(panel(second!).getByRole("alert")).toContainText(
            "another tab",
          );
          await expect(composer(second!)).toHaveValue(chosenText);
          await expect(composer(owner)).toHaveValue(remoteText);
          await expect(button(second!, "Send message")).toBeDisabled();
        },
      },
      verifications: [
        noErrors,
        replacementPrivate,
        {
          spec: "Both explicit choices remain visible before any scrolling.",
          check: async () => {
            await expect(panel(second!).locator("footer")).toBeInViewport({
              ratio: 1,
            });
            await expect(button(second!, "Use saved draft")).toBeInViewport({
              ratio: 1,
            });
            await expect(
              button(second!, "Replace saved draft with my text"),
            ).toBeInViewport({ ratio: 1 });
          },
        },
      ],
      views: [view(0), secondView],
    });
    await story.step("replace-with-local-proposal", {
      actor: aliases[0],
      description:
        "Choose Replace saved draft with my text using the keyboard. This explicit choice saves the southern proposal without sending it.",
      action: async () => {
        await button(second!, "Replace saved draft with my text").focus();
        await second!.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "Browser storage acknowledges the chosen local text and clears the conflict.",
        check: async () => {
          await expect(draftStatus(second!)).toHaveText(
            "Draft saved on this browser.",
          );
          await expect(composer(second!)).toHaveValue(chosenText);
          await expect(panel(second!).getByRole("alert")).toHaveCount(0);
          await expect(button(second!, "Send message")).toBeEnabled();
        },
      },
      verifications: [noErrors, replacementPrivate],
      views: [secondView],
    });
    await story.step("recover-chosen-local-proposal", {
      actor: aliases[0],
      description:
        "Reload both tabs. Each recovers the explicitly chosen southern proposal, still unsent. Other commanders receive neither discarded nor chosen text.",
      action: async () => {
        for (const page of [owner, second!]) {
          await page.reload();
          await open(page);
          await chooseRoom(page);
        }
      },
      acknowledgement: {
        spec: "Both authenticated tabs recover the replacement from durable browser storage.",
        check: async () => {
          for (const page of [owner, second!]) {
            await expect(composer(page)).toHaveValue(chosenText);
            await expect(panel(page).getByRole("alert")).toHaveCount(0);
          }
        },
      },
      verifications: [
        noErrors,
        replacementPrivate,
        {
          spec: "Normal and reduced motion preserve the chosen text and unsent state.",
          check: async () => {
            await second!.emulateMedia({ reducedMotion: "no-preference" });
            await expect(composer(second!)).toHaveValue(chosenText);
            await second!.emulateMedia({ reducedMotion: "reduce" });
            expect(await canonical()).toEqual(replacementBase);
          },
        },
      ],
      views: [view(0), secondView, view(2)],
    });
    const sendBase = await canonical();
    const pendingPrivate = {
      spec: "An undelivered command changes no canonical state and exposes no draft to removed members or outsiders.",
      check: async () => {
        expect(await canonical()).toEqual(sendBase);
        for (const seat of [1, 2])
          expect(JSON.stringify(await published(seat))).not.toContain(
            chosenText,
          );
        expect(new Set(sendWrites.map((w) => w.p)).size).toBe(1);
        for (const w of sendWrites) expect(w.d).toEqual(sendWrites[0].d);
      },
    };
    await story.harness(
      "interrupt-send-transport",
      "Withhold only actual conversation.send RTDB frames before ingress. Other traffic passes through; no payload, identity, receipt or state is replaced.",
      async () => {
        holdingSend = true;
      },
    );
    await story.step("submit-replacement-awaiting-acknowledgement", {
      actor: aliases[0],
      description:
        "Send the saved southern proposal by keyboard. The interrupted connection leaves it awaiting acknowledgement, not presented as a sent message.",
      action: async () => {
        await button(second!, "Send message").focus();
        await second!.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The interface explicitly waits for acknowledgement and retains the submitted text; this is not service acceptance.",
        check: async () => {
          await expect.poll(() => heldSends.length).toBeGreaterThan(0);
          await expect(
            button(second!, "Awaiting acknowledgement…"),
          ).toBeDisabled();
          await expect(composer(second!)).toHaveValue(chosenText);
        },
      },
      verifications: [noErrors, pendingPrivate],
      views: [secondView, view(2)],
    });
    await story.step("protect-pending-send-from-second-tab", {
      actor: aliases[0],
      description:
        "Try sending from the other tab. The shared durable order prevents a second logical send and offers recovery of the unfinished order.",
      action: async () => {
        await button(owner, "Send message").click();
      },
      acknowledgement: {
        spec: "The other tab explains the unfinished order and preserves its text.",
        check: async () => {
          await expect(panel(owner).getByRole("alert")).toContainText(
            "Another tab has an unfinished order",
          );
          await expect(button(owner, "Recover pending order")).toBeVisible();
          await expect(composer(owner)).toHaveValue(chosenText);
        },
      },
      verifications: [noErrors, pendingPrivate],
      views: [view(0)],
    });
    await story.step("reload-interrupted-send", {
      actor: aliases[0],
      description:
        "Reload the sending tab. The durable command restores the matching conversation and original submitted text, then offers retry when acknowledgement remains unavailable.",
      action: async () => {
        await second!.reload();
      },
      acknowledgement: {
        spec: "Recovery opens the correct room and offers Retry same command with the original proposal intact.",
        check: async () => {
          await expect(
            panel(second!).getByRole("heading", {
              name: roomTitle,
              exact: true,
            }),
          ).toBeVisible();
          await expect(composer(second!)).toHaveValue(chosenText);
          await expect(button(second!, "Retry same command")).toBeVisible({
            timeout: 25000,
          });
        },
      },
      verifications: [
        noErrors,
        pendingPrivate,
        {
          spec: "The retry control remains fully visible before scrolling.",
          check: async () =>
            expect(button(second!, "Retry same command")).toBeInViewport({
              ratio: 1,
            }),
        },
      ],
      views: [secondView],
    });
    await story.step("retry-original-message-command", {
      actor: aliases[0],
      description:
        "Retry the original order with Enter. Retained transport frames keep the same command path and encrypted payload; the proposal remains pending.",
      action: async () => {
        await button(second!, "Retry same command").focus();
        await second!.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The interface returns to awaiting acknowledgement without clearing the proposal.",
        check: async () => {
          await expect(
            button(second!, "Awaiting acknowledgement…"),
          ).toBeDisabled();
          await expect(composer(second!)).toHaveValue(chosenText);
          await expect
            .poll(() => heldSends.filter((w) => w.active()).length)
            .toBeGreaterThan(0);
        },
      },
      verifications: [noErrors, pendingPrivate],
      views: [secondView],
    });
    await story.harness(
      "restore-send-delivery",
      "Release retained frames on still-active connections to actual RTDB ingress. Retransmissions retain their original command path and encrypted payload; no service result is injected.",
      async () => {
        holdingSend = false;
        for (const entry of heldSends.filter((w) => w.active()))
          entry.server.send(entry.raw);
      },
    );
    const acknowledgedSend = {
      spec: "One authoritative receipt, campaign revision and message sequence acknowledge the original command; private projections exclude its contents.",
      check: async () => {
        const state = await canonical();
        expect(state.revision).toBe(sendBase.revision + 1);
        expect(state.diplomacy.rooms[roomId].sequence).toBe(
          sendBase.diplomacy.rooms[roomId].sequence + 1,
        );
        expect(state.diplomacy.rooms[roomId].message.body).toBe(chosenText);
        expect(new Set(sendWrites.map((w) => w.p)).size).toBe(1);
        for (const w of sendWrites) expect(w.d).toEqual(sendWrites[0].d);
        const uid = state.seats[0].uid,
          commandId = sendWrites[0].p.split("/").at(-1);
        const receipt = await db
          .doc(`campaignReceipts/${uid}/results/${commandId}`)
          .get();
        expect(receipt.get("status")).toBe("accepted");
        expect(receipt.get("revision")).toBe(state.revision);
        const { commandDigest } = require("./lib/shared/command-receipt.js");
        expect(receipt.get("requestDigest")).toBe(
          await commandDigest(
            sendWrites[0].p.replace(/^\//, ""),
            sendWrites[0].d,
          ),
        );
        for (const seat of [1, 2])
          expect(JSON.stringify(await published(seat))).not.toContain(
            chosenText,
          );
      },
    };
    await story.step("observe-retried-message-acceptance", {
      actor: aliases[0],
      description:
        "Read the accepted message after delivery returns. The original send clears its composer exactly once; other commanders receive no private contents.",
      action: async () =>
        readConversation(
          second!,
          panel(second!).getByRole("listitem").filter({ hasText: chosenText }),
        ),
      acknowledgement: {
        spec: "The real service acknowledges Message sent and the submitted composer clears.",
        check: async () => {
          await expect(
            panel(second!)
              .getByRole("group", { name: "Conversation acknowledgement" })
              .getByRole("status"),
          ).toHaveText("Message sent.");
          await expect(composer(second!)).toHaveValue("");
        },
      },
      verifications: [
        noErrors,
        acknowledgedSend,
        {
          spec: "The acknowledged message is fully readable within bounded conversation details.",
          check: async () =>
            readConversation(
              second!,
              panel(second!)
                .getByRole("listitem")
                .filter({ hasText: chosenText }),
            ),
        },
      ],
      views: [secondView, view(2)],
    });
    await story.step("recover-acknowledged-send", {
      actor: aliases[0],
      description:
        "Reload after acceptance. The empty composer and one authorized message survive; the durable submitted order has been cleared.",
      action: async () => {
        await second!.reload();
        await open(second!);
        await chooseRoom(second!);
      },
      acknowledgement: {
        spec: "The sent proposal is retained in history without restoring a pending order or unsent text.",
        check: async () => {
          await expect(composer(second!)).toHaveValue("");
          await expect(
            panel(second!).getByRole("list", { name: "Authorized messages" }),
          ).toContainText(chosenText);
          await expect(button(second!, "Retry same command")).toHaveCount(0);
        },
      },
      verifications: [
        noErrors,
        acknowledgedSend,
        {
          spec: "IndexedDB contains no unfinished order and motion preferences preserve the single accepted outcome.",
          check: async () => {
            const orders = await second!.evaluate(
              async () =>
                new Promise<unknown[]>((resolve, reject) => {
                  const open = indexedDB.open("clusterii-recovery", 1);
                  open.onerror = () => reject(open.error);
                  open.onsuccess = () => {
                    const db = open.result;
                    const r = db
                      .transaction("orders")
                      .objectStore("orders")
                      .getAll();
                    r.onerror = () => reject(r.error);
                    r.onsuccess = () => {
                      db.close();
                      resolve(r.result);
                    };
                  };
                }),
            );
            expect(orders).toEqual([]);
            await second!.emulateMedia({ reducedMotion: "no-preference" });
            await expect(composer(second!)).toHaveValue("");
            await second!.emulateMedia({ reducedMotion: "reduce" });
            await readConversation(
              second!,
              panel(second!)
                .getByRole("listitem")
                .filter({ hasText: chosenText }),
            );
          },
        },
      ],
      views: [secondView],
    });
    const accountDraft = "A private unsent note for my next session.";
    const accountBase = await canonical();
    const accountUid = accountBase.seats[0].uid;
    const profileBefore = (await db.doc(`profiles/${accountUid}`).get()).data();
    const accountInvariant = {
      spec: "Account switching changes no campaign or saved identity and never publishes the unsent draft.",
      check: async () => {
        expect(await canonical()).toEqual(accountBase);
        expect((await db.doc(`profiles/${accountUid}`).get()).data()).toEqual(
          profileBefore,
        );
        for (const seat of [1, 2])
          expect(JSON.stringify(await published(seat))).not.toContain(
            accountDraft,
          );
      },
    };
    const entryUrl = new URL("../", url).href;
    const signOutCurrent = async () => {
      await second!.goto(entryUrl);
      await button(second!, "Your identity").click();
      await button(second!, "Sign out").focus();
      await second!.keyboard.press("Enter");
    };
    await story.step("save-account-private-draft", {
      actor: aliases[0],
      description:
        "Save a new unsent note before leaving this browser session. Saving a draft is not sending a message.",
      action: async () => {
        await composer(second!).fill(accountDraft);
      },
      acknowledgement: {
        spec: "Browser storage acknowledges the exact private draft.",
        check: async () => {
          await expect(draftStatus(second!)).toHaveText(
            "Draft saved on this browser.",
          );
          await expect(composer(second!)).toHaveValue(accountDraft);
        },
      },
      verifications: [noErrors, accountInvariant],
      views: [secondView],
    });
    await story.step("sign-out-with-unsent-note", {
      actor: aliases[0],
      description:
        "Use keyboard Sign out on the identity panel. This ends the browser session without publishing or discarding the saved note.",
      action: signOutCurrent,
      acknowledgement: {
        spec: "Entry confirms the signed-out session with Play and no account identity control.",
        check: async () => {
          await expect(button(second!, "Play")).toBeVisible();
          await expect(button(second!, "Your identity")).toHaveCount(0);
          await expect(panel(second!)).toHaveCount(0);
        },
      },
      verifications: [noErrors, accountInvariant],
      views: [secondView],
    });
    await story.step("other-account-on-same-browser", {
      actor: aliases[2],
      description:
        "Sign into the same browser as the existing uninvolved commander and open this campaign's conversations. This account must not recover the first commander's room or draft.",
      action: async () => {
        await login(second!, emails[2]);
        await expect(second!.getByLabel("Commander name")).toHaveValue(
          aliases[2],
        );
        await second!.goto(url);
        await open(second!);
      },
      acknowledgement: {
        spec: "The authenticated outsider sees an empty conversation directory and no recovered private composer.",
        check: async () => {
          await expect(
            panel(second!).getByRole("heading", {
              name: "Begin a conversation",
              exact: true,
            }),
          ).toBeVisible();
          await expect(panel(second!)).not.toContainText(roomTitle);
          await expect(panel(second!)).not.toContainText(accountDraft);
          await expect(composer(second!)).toHaveCount(0);
          await expect(button(second!, "Retry same command")).toHaveCount(0);
        },
      },
      verifications: [noErrors, accountInvariant],
      views: [
        {
          page: () => second!,
          player: `${aliases[2]} · same browser`,
          surface: "game",
        },
        view(2),
      ],
    });
    await story.step("end-other-account-session", {
      actor: aliases[2],
      description:
        "Sign out the second account before returning the browser to its original commander.",
      action: signOutCurrent,
      acknowledgement: {
        spec: "The second account has signed out and its private campaign surface is closed.",
        check: async () => {
          await expect(button(second!, "Play")).toBeVisible();
          await expect(button(second!, "Your identity")).toHaveCount(0);
          await expect(panel(second!)).toHaveCount(0);
        },
      },
      verifications: [noErrors, accountInvariant],
      views: [
        {
          page: () => second!,
          player: `${aliases[2]} · signed out`,
          surface: "game",
        },
      ],
    });
    await story.step("restore-original-account-draft", {
      actor: aliases[0],
      description:
        "Sign back into the original account without saving the identity again. Open its private room and recover the exact unsent note retained on this browser.",
      action: async () => {
        await login(second!, emails[0]);
        await expect(second!.getByLabel("Commander name")).toHaveValue(
          aliases[0],
        );
        await second!.goto(url);
        await open(second!);
        await chooseRoom(second!);
      },
      acknowledgement: {
        spec: "Only the original account recovers its private room and unsent note.",
        check: async () => {
          await expect(composer(second!)).toHaveValue(accountDraft);
          await expect(draftStatus(second!)).toHaveText(
            "Draft saved on this browser.",
          );
        },
      },
      verifications: [
        noErrors,
        accountInvariant,
        {
          spec: "The restored composer and commitment remain visible; normal/reduced motion preserve the unsent text.",
          check: async () => {
            await expect(panel(second!).locator("footer")).toBeInViewport({
              ratio: 1,
            });
            await second!.emulateMedia({ reducedMotion: "no-preference" });
            await expect(composer(second!)).toHaveValue(accountDraft);
            await second!.emulateMedia({ reducedMotion: "reduce" });
          },
        },
      ],
      views: [secondView, view(2)],
    });
    const readmissionBase = await canonical();
    const returningUid = readmissionBase.seats[1].uid;
    const hiddenDuringAbsence = [
      secret,
      absentMessage,
      savedDraft,
      chosenText,
      accountDraft,
    ];
    const absencePrivate = {
      spec: "Renewed access never reveals unshared or absence-period messages in the returning player's UI or serialized projection.",
      check: async () => {
        for (const text of hiddenDuringAbsence) {
          await expect(panel(guest)).not.toContainText(text);
          expect(JSON.stringify(await published(1))).not.toContain(text);
          expect(JSON.stringify(await published(2))).not.toContain(text);
        }
      },
    };
    await story.step("choose-future-only-readmission", {
      actor: aliases[0],
      description:
        "Invite the removed commander again, explicitly choosing only messages sent after acceptance. The unsent browser note is not shared by this choice.",
      action: async () => {
        await button(second!, "Participants").click();
        await panel(second!)
          .getByRole("combobox", { name: "Commander", exact: true })
          .selectOption({ label: aliases[1] });
        await panel(second!)
          .getByRole("radio", {
            name: "Future messages only — sent after acceptance",
            exact: true,
          })
          .check();
      },
      acknowledgement: {
        spec: "The invitation offers future-only scope with no selected earlier messages.",
        check: async () => {
          await expect(button(second!, `Invite ${aliases[1]}`)).toBeEnabled();
          await expect(
            panel(second!).getByRole("radio", {
              name: "Future messages only — sent after acceptance",
              exact: true,
            }),
          ).toBeChecked();
        },
      },
      verifications: [
        noErrors,
        {
          spec: "Selecting scope sends no command or campaign mutation.",
          check: async () => expect(await canonical()).toEqual(readmissionBase),
        },
      ],
      views: [secondView],
    });
    await story.step("offer-renewed-conversation-access", {
      actor: aliases[0],
      description:
        "Send the future-only invitation. The removed commander opens the renewed offer without receiving messages sent during their absence.",
      action: async () => {
        await button(second!, `Invite ${aliases[1]}`).click();
        await open(guest);
        await chooseRoom(guest);
      },
      acknowledgement: {
        spec: "The returning commander receives an invitation explaining future-only access.",
        check: async () => {
          await expect(button(guest, "Accept invitation")).toBeVisible();
          await expect(panel(guest)).toContainText(
            "messages sent after you accept",
          );
        },
      },
      verifications: [
        noErrors,
        absencePrivate,
        {
          spec: "One revision adds only an invitation, not membership or a message.",
          check: async () => {
            const s = await canonical();
            expect(s.revision).toBe(readmissionBase.revision + 1);
            expect(s.diplomacy.rooms[roomId].invitations).toContain(
              returningUid,
            );
            expect(s.diplomacy.rooms[roomId].members).not.toContain(
              returningUid,
            );
            expect(s.diplomacy.rooms[roomId].sequence).toBe(
              readmissionBase.diplomacy.rooms[roomId].sequence,
            );
          },
        },
      ],
      views: [
        secondView,
        { ...view(1), primary: [button(guest, "Accept invitation")] },
        view(2),
      ],
    });
    await story.step("accept-renewed-future-access", {
      actor: aliases[1],
      description:
        "Accept the renewed invitation by keyboard. Membership resumes for future messages without granting the missing interval.",
      action: async () => {
        await button(guest, "Accept invitation").focus();
        await guest.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "The returned member receives an enabled composer.",
        check: async () => expect(composer(guest)).toBeEnabled(),
      },
      verifications: [
        noErrors,
        absencePrivate,
        {
          spec: "Exactly one acceptance revision restores membership without creating a message.",
          check: async () => {
            const s = await canonical();
            expect(s.revision).toBe(readmissionBase.revision + 2);
            expect(s.diplomacy.rooms[roomId].members).toContain(returningUid);
            expect(s.diplomacy.rooms[roomId].invitations).not.toContain(
              returningUid,
            );
            expect(s.diplomacy.rooms[roomId].sequence).toBe(
              readmissionBase.diplomacy.rooms[roomId].sequence,
            );
          },
        },
      ],
      views: [view(1), secondView],
    });
    const welcome = "Welcome back. Our next meeting is open to you.";
    await story.step("send-after-renewed-consent", {
      actor: aliases[0],
      description:
        "Return to the saved unsent note, deliberately replace it with a welcome message, and send after the returning commander has accepted.",
      action: async () => {
        await button(second!, "Participants").click();
        await expect(composer(second!)).toHaveValue(accountDraft);
        await composer(second!).fill(welcome);
        await expect(draftStatus(second!)).toHaveText(
          "Draft saved on this browser.",
        );
        await expect(button(second!, "Send message")).toBeEnabled();
        await button(second!, "Send message").focus();
        await second!.keyboard.press("Enter");
      },
      acknowledgement: {
        spec: "Message sent is acknowledged and the returned member receives the welcome.",
        check: async () => {
          await expect(
            panel(second!)
              .getByRole("group", { name: "Conversation acknowledgement" })
              .getByRole("status"),
          ).toHaveText("Message sent.");
          await expect(
            panel(guest).getByRole("list", { name: "Authorized messages" }),
          ).toContainText(welcome);
        },
      },
      verifications: [
        noErrors,
        absencePrivate,
        {
          spec: "One new message reaches exactly the current members, with no outsider disclosure.",
          check: async () => {
            const s = await canonical();
            expect(s.revision).toBe(readmissionBase.revision + 3);
            expect(s.diplomacy.rooms[roomId].sequence).toBe(
              readmissionBase.diplomacy.rooms[roomId].sequence + 1,
            );
            expect(s.diplomacy.rooms[roomId].message.body).toBe(welcome);
            expect(
              [...s.diplomacy.rooms[roomId].message.recipients].sort(),
            ).toEqual([accountUid, returningUid].sort());
            expect(JSON.stringify(await published(2))).not.toContain(welcome);
            await expect(panel(pages[2])).not.toContainText(welcome);
            for (const p of [second!, guest])
              await readConversation(
                p,
                panel(p).getByRole("listitem").filter({ hasText: welcome }),
              );
          },
        },
      ],
      views: [secondView, view(1), view(2)],
    });
    await story.step("recover-renewed-message-boundary", {
      actor: aliases[1],
      description:
        "Reload the returning commander's campaign and read the welcome. Renewed access preserves its boundary across recovery and motion preferences.",
      action: async () => {
        await guest.reload();
        await open(guest);
        await chooseRoom(guest);
      },
      acknowledgement: {
        spec: "The returned member recovers the welcome in authorized history.",
        check: async () =>
          expect(
            panel(guest).getByRole("list", { name: "Authorized messages" }),
          ).toContainText(welcome),
      },
      verifications: [
        noErrors,
        absencePrivate,
        {
          spec: "Reload changes no message or membership revision and keeps the welcome readable without exposing the absence interval.",
          check: async () => {
            expect((await canonical()).revision).toBe(
              readmissionBase.revision + 3,
            );
            await guest.emulateMedia({ reducedMotion: "no-preference" });
            await expect(composer(guest)).toBeEnabled();
            await guest.emulateMedia({ reducedMotion: "reduce" });
            await readConversation(
              guest,
              panel(guest).getByRole("listitem").filter({ hasText: welcome }),
            );
          },
        },
      ],
      views: [view(1), view(2)],
    });
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
