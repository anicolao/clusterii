import { createRequire } from "node:module";
import type { Page, BrowserContext } from "@playwright/test";
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
          const page = await ctx.newPage();
          pages.push(page);
          page.on("pageerror", (error) => errors.push(error.message));
          const email = `consent-${info.project.name}-${i}-${Date.now()}@example.test`;
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
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
