import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary commanders negotiate through invitation, retry, revocation and recovery", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(180000);
  const contexts = [],
    pages = [];
  let url = "";
  let holding = false;
  const held: {
    server: import("@playwright/test").WebSocketRoute;
    raw: string | Buffer;
  }[] = [];
  const writes: { p: string; d: Record<string, unknown> }[] = [];
  try {
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      if (i === 1)
        await context.routeWebSocket(/127\.0\.0\.1:19000/, (ws) => {
          const server = ws.connectToServer();
          ws.onMessage((raw) => {
            let frame;
            try {
              frame = JSON.parse(String(raw));
            } catch {}
            if (
              holding &&
              frame?.d?.a === "p" &&
              frame.d.b?.d?.kind === "conversation.send"
            ) {
              writes.push(frame.d.b);
              held.push({ server, raw });
            } else server.send(raw);
          });
          server.onMessage((raw) => ws.send(raw));
        });
      const page = await context.newPage();
      pages.push(page);
      const email = `talks-ui-${i}-${Date.now()}@example.test`;
      await login(page, email);
      await page.getByLabel("Commander name").fill(`Fleet envoy ${i + 1}`);
      await page.getByRole("button", { name: "Save identity" }).click();
      await expect(page.getByRole("status")).toContainText("Identity saved");
      await grantDeveloper(email);
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: "Play", exact: true }).click();
    }
    for (let i = 0; i < 4; i++) {
      const page = pages[i];
      if (i === 0) {
        await page
          .getByRole("button", { name: "Create campaign", exact: true })
          .click();
        await page
          .getByLabel("Campaign name")
          .fill(`Talks horizon ${Date.now()}`);
        await page.getByRole("button", { name: "Create galaxy" }).click();
        await expect(
          page.getByRole("heading", { name: "Choose your faction" }),
        ).toBeVisible();
        url = page.url();
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
      await page.getByRole("button", { name: "Claim your seat" }).click();
      await expect(page.getByText("Your seat is confirmed.")).toBeVisible();
    }
    // Ordinary UI admission, real start service with an explicit test clock.
    const require = createRequire(
      new URL("../../functions/package.json", import.meta.url),
    );
    const admin = require("firebase-admin/app");
    if (!admin.getApps().length)
      admin.initializeApp({ projectId: "demo-clusterii" });
    const db = require("firebase-admin/firestore").getFirestore();
    const id = new URL(url).searchParams.get("campaign");
    expect(id).toBeTruthy();
    const head = await db.doc(`campaignStates/${id}`).get();
    expect(head.exists).toBe(true);
    const start = head.get("startAt");
    expect(Number.isSafeInteger(start)).toBe(true);
    const { startDueCampaign } = require("./lib/functions/src/campaigns.js");
    await startDueCampaign(id, start);
    const page = pages[0];
    await expect(
      page.getByText("Campaign begun", { exact: true }),
    ).toBeVisible();
    const owner = pages[0],
      guest = pages[1],
      outsider = pages[2];
    const panel = (page: typeof owner) =>
      page.getByRole("region", { name: "Private conversations", exact: true });
    const open = async (page: typeof owner) =>
      page.getByRole("button", { name: /^Conversations(?: · New)?$/ }).click();
    await open(owner);
    const own = panel(owner),
      roomTitle = `Nacre talks ${Date.now()}`;
    await own.getByLabel("Conversation title", { exact: true }).fill(roomTitle);
    await own
      .getByRole("button", { name: "Create conversation", exact: true })
      .click();
    await expect(
      own.getByRole("heading", { name: roomTitle, exact: true }),
    ).toBeVisible();
    const post = async (page: typeof owner, text: string) => {
      const room = panel(page);
      await room.getByLabel("Message", { exact: true }).fill(text);
      await room
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      await expect(room.locator("footer").getByRole("status")).toHaveText(
        "Message sent.",
      );
      await expect(room.getByLabel("Message", { exact: true })).toHaveValue("");
      await expect(
        room.getByRole("list", { name: "Authorized messages" }),
      ).toContainText(text);
    };
    await post(owner, "Private note before inviting anyone.");
    await own
      .getByRole("button", { name: "Participants", exact: true })
      .click();
    await own
      .getByRole("combobox", { name: "Commander", exact: true })
      .selectOption({ label: "Fleet envoy 2" });
    await expect(
      own.getByRole("radio", { name: /Future messages only/ }),
    ).toBeChecked();
    await own
      .getByRole("button", { name: "Invite Fleet envoy 2", exact: true })
      .click();
    await expect(own.locator("footer").getByRole("status")).toContainText(
      "Earlier messages are not shared",
    );
    await open(guest);
    const guestPanel = panel(guest);
    await guestPanel
      .getByRole("button", { name: new RegExp(`^${roomTitle}`) })
      .click();
    await expect(guestPanel).not.toContainText(
      "Private note before inviting anyone.",
    );
    await expect(guestPanel).toContainText("messages sent after you accept");
    await guest.setViewportSize({ width: 393, height: 852 });
    const acceptBox = await guestPanel
      .getByRole("button", { name: "Accept invitation", exact: true })
      .boundingBox();
    expect(acceptBox!.y).toBeGreaterThanOrEqual(0);
    expect(acceptBox!.y + acceptBox!.height).toBeLessThanOrEqual(852);
    await geometry(guest, guestPanel);
    await guestPanel
      .getByRole("button", { name: "Conversations", exact: true })
      .click();
    await geometry(guest, guestPanel);
    await guestPanel
      .getByRole("button", { name: new RegExp(`^${roomTitle}`) })
      .click();
    await guest.screenshot({
      path: info.outputPath("conversation-invitation-phone.png"),
    });
    await guestPanel
      .getByRole("button", { name: "Accept invitation", exact: true })
      .click();
    await expect(
      guestPanel.getByLabel("Message", { exact: true }),
    ).toBeVisible();
    await expect(guestPanel).not.toContainText(
      "Private note before inviting anyone.",
    );
    await own
      .getByRole("button", { name: "Participants", exact: true })
      .click();
    await post(owner, "Can we coordinate near Nacre?");
    await expect(
      guestPanel.getByRole("list", { name: "Authorized messages" }),
    ).toContainText("Can we coordinate near Nacre?");
    await guestPanel
      .getByRole("button", { name: "Mark loaded messages read" })
      .click();
    await expect(guestPanel.locator("footer").getByRole("status")).toHaveText(
      "Reading position saved.",
    );
    const { provider } = require("./lib/shared/crypto.js"),
      { context } = require("./lib/functions/src/campaigns.js");
    const canonical = async () => {
      const h = await db.doc(`campaignStates/${id}`).get();
      return provider("mock").open(
        h.get("envelope"),
        h.get("canonicalKey"),
        context(id, h.get("revision"), "canonical", 1),
      );
    };
    const before = await canonical(),
      roomId = Object.keys(before.diplomacy.rooms)[0],
      sequence = before.diplomacy.rooms[roomId].sequence;
    holding = true;
    const draft = "Yes. Let’s discuss our plans before making an agreement.";
    await guestPanel.getByLabel("Message", { exact: true }).fill(draft);
    await guestPanel
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect.poll(() => held.length).toBeGreaterThan(0);
    await expect(
      guestPanel.getByRole("button", { name: "Retry same command" }),
    ).toBeVisible({ timeout: 25000 });
    await expect(guestPanel.getByLabel("Message", { exact: true })).toHaveValue(
      draft,
    );
    await guestPanel
      .getByRole("button", { name: "Retry same command" })
      .click();
    await expect(guestPanel.getByLabel("Message", { exact: true })).toHaveValue(
      draft,
    );
    holding = false;
    for (const entry of held) entry.server.send(entry.raw);
    await expect(guestPanel.locator("footer").getByRole("status")).toHaveText(
      "Message sent.",
      { timeout: 15000 },
    );
    await expect(guestPanel.getByLabel("Message", { exact: true })).toHaveValue(
      "",
    );
    expect(new Set(writes.map((w) => w.p)).size).toBe(1);
    for (const write of writes) expect(write.d).toEqual(writes[0].d);
    const after = await canonical();
    expect(after.diplomacy.rooms[roomId].sequence).toBe(sequence + 1);
    expect(after.diplomacy.rooms[roomId].message.body).toBe(draft);
    await expect(
      own.getByRole("list", { name: "Authorized messages" }),
    ).toContainText(draft);
    await open(outsider);
    await expect(panel(outsider)).not.toContainText(roomTitle);
    await expect(panel(outsider)).not.toContainText(draft);
    async function evidence() {
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 720],
        ["4k", 3840, 2160],
      ] as const) {
        await guest.setViewportSize({ width, height });
        const send = guestPanel.getByRole("button", {
          name: "Send message",
          exact: true,
        });
        const box = await send.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        await geometry(guest, guestPanel);
        await guestPanel
          .getByRole("region", { name: "Conversation details" })
          .evaluate((el) => el.scrollTo(0, el.scrollHeight));
        await guest.screenshot({
          path: info.outputPath(`conversation-${label}.png`),
        });
      }
    }
    await evidence();
    await own
      .getByRole("button", { name: "Participants", exact: true })
      .click();
    await own
      .getByRole("button", { name: "Remove Fleet envoy 2", exact: true })
      .click();
    await own
      .getByRole("button", { name: "Confirm remove", exact: true })
      .click();
    await expect(guestPanel).toContainText(
      "Your current access to this conversation has ended",
    );
    await own
      .getByRole("button", { name: "Participants", exact: true })
      .click();
    await post(owner, "Private during absence.");
    await expect(guestPanel).not.toContainText("Private during absence.");
    await own
      .getByRole("button", { name: "Participants", exact: true })
      .click();
    await own
      .getByRole("combobox", { name: "Commander", exact: true })
      .selectOption({ label: "Fleet envoy 2" });
    await own
      .getByRole("button", { name: "Invite Fleet envoy 2", exact: true })
      .click();
    await expect(
      guestPanel.getByRole("button", {
        name: "Accept invitation",
        exact: true,
      }),
    ).toBeVisible();
    await guestPanel
      .getByRole("button", { name: "Accept invitation", exact: true })
      .click();
    await expect(
      guestPanel.getByLabel("Message", { exact: true }),
    ).toBeVisible();
    await expect(guestPanel).not.toContainText("Private during absence.");
    await guest.reload();
    await open(guest);
    await panel(guest)
      .getByRole("button", { name: new RegExp(`^${roomTitle}`) })
      .click();
    await expect(panel(guest)).not.toContainText("Private during absence.");
    await expect(panel(guest)).not.toContainText(
      "Private note before inviting anyone.",
    );
    await own
      .getByRole("button", { name: "Participants", exact: true })
      .click();
    await post(owner, "Welcome back. This is a new message.");
    await expect(
      panel(guest).getByRole("list", { name: "Authorized messages" }),
    ).toContainText("Welcome back. This is a new message.");
    await guest.keyboard.press("Escape");
    await expect(
      guest.getByRole("button", { name: /^Conversations(?: · New)?$/ }),
    ).toBeFocused();
    await expect(
      guest.getByText("Message sent.", { exact: true }),
    ).not.toBeVisible();
  } catch (error) {
    console.error("Conversation journey failed:", error);
    throw error;
  } finally {
    for (const context of contexts) await context.close();
  }
});
test("conversation lab preserves private scope and draft outcomes under reduced motion", async ({
  page,
}) => {
  await page.goto("dev/animations/");
  await page
    .getByLabel("Scenario", { exact: true })
    .selectOption("conversations");
  const standard = page.getByRole("region", {
      name: "Standard motion comparison",
    }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [time, copy] of [
    ["0", "messages sent after you accept"],
    ["1200", "No messages in the records loaded"],
    ["2200", "Can we discuss the systems near Nacre?"],
    ["3400", "connection was interrupted"],
    ["5000", "Let’s discuss our plans"],
  ]) {
    await page.getByLabel(/Inspect frame/).fill(time);
    for (const region of [standard, reduced]) {
      await expect(region).toContainText(copy);
      await expect(region).not.toContainText("Creator's earlier private note.");
    }
    expect(
      await standard
        .getByRole("region", { name: "Conversation details" })
        .innerText(),
    ).toBe(
      await reduced
        .getByRole("region", { name: "Conversation details" })
        .innerText(),
    );
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel(/Inspect frame/)).toHaveValue("0");
});
