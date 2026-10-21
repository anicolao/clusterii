import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
for (const mode of ["mock", "real"] as const)
  test(`ordinary commanders negotiate through invitation, retry, revocation and recovery ${mode}`, async ({
    browser,
    request,
  }, info) => {
    test.skip(
      mode === "real" && process.env.CLUSTER_KMS_TEST !== "true",
      "Live managed keys are required.",
    );
    test.setTimeout(mode === "real" ? 300000 : 180000);
    const contexts = [],
      pages = [],
      emails: string[] = [];
    let url = "";
    let holding = false;
    const held: {
      server: import("@playwright/test").WebSocketRoute;
      raw: string | Buffer;
      active: () => boolean;
    }[] = [];
    const writes: { p: string; d: Record<string, unknown> }[] = [];
    const attempted: string[] = [];
    try {
      for (let i = 0; i < 4; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        if (i === 1)
          await context.routeWebSocket(/127\.0\.0\.1:19000/, (ws) => {
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
                holding &&
                frame?.d?.a === "p" &&
                frame.d.b?.d?.kind?.startsWith("conversation.")
              )
                attempted.push(frame.d.b.d.kind);
              if (
                holding &&
                frame?.d?.a === "p" &&
                frame.d.b?.d?.kind === "conversation.send"
              ) {
                writes.push(frame.d.b);
                held.push({ server, raw, active: () => active });
              } else server.send(raw);
            });
            server.onMessage((raw) => ws.send(raw));
          });
        const page = await context.newPage();
        pages.push(page);
        const email = `talks-ui-${i}-${Date.now()}@example.test`;
        emails.push(email);
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
          if (mode === "real")
            await page
              .getByRole("radio", { name: "Real encryption · managed keys" })
              .check();
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
        page.getByRole("region", {
          name: "Private conversations",
          exact: true,
        });
      const open = async (page: typeof owner) =>
        page
          .getByRole("button", { name: /^Conversations(?: · New)?$/ })
          .click();
      await open(owner);
      const own = panel(owner),
        roomTitle = `Nacre talks ${Date.now()}`;
      await own
        .getByLabel("Conversation title", { exact: true })
        .fill(roomTitle);
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
        await expect(
          room
            .getByRole("group", { name: "Conversation acknowledgement" })
            .getByRole("status"),
        ).toHaveText("Message sent.");
        await expect(room.getByLabel("Message", { exact: true })).toHaveValue(
          "",
        );
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
      await expect(
        own
          .getByRole("group", { name: "Conversation acknowledgement" })
          .getByRole("status"),
      ).toContainText("Earlier messages are not shared");
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
      await expect(
        guestPanel
          .getByRole("group", { name: "Conversation acknowledgement" })
          .getByRole("status"),
      ).toHaveText("Reading position saved.");
      const { provider } = require("./lib/shared/crypto.js"),
        { context } = require("./lib/functions/src/campaigns.js");
      const canonical = async () => {
        const h = await db.doc(`campaignStates/${id}`).get();
        const key =
          mode === "real"
            ? await require("./lib/functions/src/key-protection.js").unprotect(
                h.get("protectedKey"),
                `canonical:${id}:${h.get("revision")}:1`,
              )
            : h.get("canonicalKey");
        return provider(mode).open(
          h.get("envelope"),
          key,
          context(id, h.get("revision"), "canonical", 1),
        );
      };
      let before = await canonical(),
        roomId = Object.keys(before.diplomacy.rooms)[0],
        sequence = before.diplomacy.rooms[roomId].sequence;
      const composer = guestPanel.getByLabel("Message", { exact: true });
      await composer.fill("Draft retained across reload.");
      await expect(
        guestPanel.getByRole("status", { name: "Browser draft status" }),
      ).toHaveText("Draft saved on this browser.");
      await guest.reload();
      await open(guest);
      await guestPanel
        .getByRole("button", { name: "Conversations", exact: true })
        .click();
      await guestPanel
        .getByRole("button", { name: new RegExp(`^${roomTitle}`) })
        .click();
      await expect(composer).toHaveValue("Draft retained across reload.");
      const second = await contexts[1].newPage();
      await second.goto(url);
      await open(second);
      await panel(second)
        .getByRole("button", { name: new RegExp(`^${roomTitle}`) })
        .click();
      await expect(
        panel(second).getByLabel("Message", { exact: true }),
      ).toHaveValue("Draft retained across reload.");
      await composer.fill("First tab revision.");
      await expect(
        guestPanel.getByRole("status", { name: "Browser draft status" }),
      ).toHaveText("Draft saved on this browser.");
      await panel(second)
        .getByLabel("Message", { exact: true })
        .fill("Second tab preserves its conflicting text.");
      await expect(panel(second).getByRole("alert")).toContainText(
        "another tab",
      );
      await expect(
        panel(second).getByLabel("Message", { exact: true }),
      ).toHaveValue("Second tab preserves its conflicting text.");
      await second.setViewportSize({ width: 393, height: 852 });
      const conflictSend = await panel(second)
        .getByRole("button", { name: "Send message", exact: true })
        .boundingBox();
      expect(conflictSend!.y + conflictSend!.height).toBeLessThanOrEqual(852);
      await geometry(second, panel(second));
      await second.screenshot({
        path: info.outputPath("draft-conflict-phone.png"),
      });
      await panel(second)
        .getByRole("button", { name: "Use saved draft", exact: true })
        .click();
      await expect(
        panel(second).getByLabel("Message", { exact: true }),
      ).toHaveValue("First tab revision.");
      await post(owner, "One more point before our reply.");
      await expect(
        panel(second).getByRole("button", {
          name: "Mark loaded messages read",
          exact: true,
        }),
      ).toBeVisible();
      before = await canonical();
      sequence = before.diplomacy.rooms[roomId].sequence;
      holding = true;
      const draft = "Yes. Let’s discuss our plans before making an agreement.";
      await guestPanel.getByLabel("Message", { exact: true }).fill(draft);
      await guestPanel
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      await expect.poll(() => held.length).toBeGreaterThan(0);
      await panel(second)
        .getByRole("button", { name: "Mark loaded messages read", exact: true })
        .click();
      await expect(panel(second).getByRole("alert")).toContainText(
        "Another tab has an unfinished order",
      );
      await expect(
        panel(second).getByRole("button", {
          name: "Recover pending order",
          exact: true,
        }),
      ).toBeVisible();
      expect(attempted.length).toBeGreaterThan(0);
      expect(new Set(attempted)).toEqual(new Set(["conversation.send"]));
      expect((await canonical()).revision).toBe(before.revision);
      await second.close();

      await guest.reload();
      await expect(
        guestPanel.getByRole("heading", { name: roomTitle, exact: true }),
      ).toBeVisible();
      await expect(composer).toHaveValue(draft);
      await expect
        .poll(() => held.filter((entry) => entry.active()).length)
        .toBeGreaterThan(0);
      await expect(
        guestPanel.getByRole("button", { name: "Retry same command" }),
      ).toBeVisible({ timeout: 25000 });
      await expect(
        guestPanel.getByLabel("Message", { exact: true }),
      ).toHaveValue(draft);
      await guestPanel
        .getByRole("button", { name: "Retry same command" })
        .click();
      await expect(
        guestPanel.getByLabel("Message", { exact: true }),
      ).toHaveValue(draft);
      await geometry(guest, guestPanel);
      await guest.screenshot({
        path: info.outputPath("pending-recovery-phone.png"),
      });
      holding = false;
      for (const entry of held.filter((entry) => entry.active()))
        entry.server.send(entry.raw);
      await expect(
        guestPanel
          .getByRole("group", { name: "Conversation acknowledgement" })
          .getByRole("status"),
      ).toHaveText("Message sent.", { timeout: 15000 });
      await expect(
        guestPanel.getByLabel("Message", { exact: true }),
      ).toHaveValue("");
      expect(new Set(writes.map((w) => w.p)).size).toBe(1);
      for (const write of writes) expect(write.d).toEqual(writes[0].d);
      const after = await canonical();
      expect(after.diplomacy.rooms[roomId].sequence).toBe(sequence + 1);
      expect(after.diplomacy.rooms[roomId].message.body).toBe(draft);
      const storage = await guest.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("clusterii-recovery", 1);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        const values = async (store: string) =>
          new Promise<any[]>((resolve, reject) => {
            const r = db.transaction(store).objectStore(store).getAll();
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          });
        const result = {
          orders: await values("orders"),
          drafts: await values("drafts"),
        };
        db.close();
        return result;
      });
      expect(storage.orders).toEqual([]);
      expect(storage.drafts.length).toBeGreaterThan(0);
      for (const saved of storage.drafts) {
        expect(Object.keys(saved).sort()).toEqual(["envelope", "revision"]);
        expect(saved.envelope.mode).toBe(mode);
        expect(saved.envelope.algorithm).toBe(
          mode === "real" ? "AES-256-GCM" : "MOCK-PREFIX-SHA256",
        );
        expect(JSON.stringify(saved)).not.toContain(draft);
      }
      const invalid = {
        id: writes[0].p.split("/").at(-1)!,
        gameId: id!,
        kind: "conversation.send",
        envelope: structuredClone(writes[0].d.envelope) as any,
      };
      invalid.envelope.tag =
        (invalid.envelope.tag[0] === "a" ? "b" : "a") +
        invalid.envelope.tag.slice(1);
      await guest.evaluate(
        async ({ uid, invalid }) => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const r = indexedDB.open("clusterii-recovery", 1);
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          });
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction("orders", "readwrite");
            tx.objectStore("orders").put(invalid, uid);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          db.close();
        },
        { uid: before.seats[1].uid, invalid },
      );
      await guest.reload();
      await expect(
        guest.getByRole("heading", { name: "Saved order needs review" }),
      ).toBeVisible();
      await expect(guest.getByRole("alert")).toContainText(
        "not been replaced or resent",
      );
      await geometry(
        guest,
        guest.getByRole("region", { name: "Saved order recovery" }),
      );
      await guest.screenshot({
        path: info.outputPath("invalid-recovery-phone.png"),
      });
      expect((await canonical()).revision).toBe(after.revision);
      await guest
        .getByRole("button", {
          name: "Forget this browser’s record",
          exact: true,
        })
        .click();
      await expect(
        guest.getByText(
          "Forgetting this browser’s record does not cancel an order.",
          { exact: false },
        ),
      ).toBeVisible();
      await guest
        .getByRole("button", {
          name: "Confirm forgetting local record",
          exact: true,
        })
        .click();
      await expect(
        guest.getByRole("heading", { name: "Saved order needs review" }),
      ).not.toBeVisible();
      await open(guest);
      await guestPanel
        .getByRole("button", { name: "Conversations", exact: true })
        .click();
      await guestPanel
        .getByRole("button", { name: new RegExp(`^${roomTitle}`) })
        .click();
      await expect(composer).toHaveValue("");
      await expect(
        guestPanel.getByRole("list", { name: "Authorized messages" }),
      ).toContainText(draft);
      expect((await canonical()).revision).toBe(after.revision);

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
      const broken = await contexts[1].newPage();
      let blockedWrites = 0;
      await broken.routeWebSocket(/127\.0\.0\.1:19000/, (ws) => {
        const server = ws.connectToServer();
        ws.onMessage((raw) => {
          const frame = JSON.parse(String(raw));
          if (frame?.d?.a === "p" && frame.d.b?.d?.kind === "campaign.create")
            blockedWrites++;
          server.send(raw);
        });
        server.onMessage((raw) => ws.send(raw));
      });
      await broken.addInitScript(() => {
        const original = indexedDB.open.bind(indexedDB);
        indexedDB.open = (name, version) => {
          if (name === "clusterii-recovery")
            throw new DOMException(
              "Injected unavailable recovery storage",
              "InvalidStateError",
            );
          return original(name, version);
        };
      });
      const directoryUrl = new URL(url);
      directoryUrl.search = "";
      await broken.goto(directoryUrl.href);
      await expect(broken.getByRole("alert")).toContainText(
        "Browser recovery storage is unavailable",
      );
      await broken
        .getByRole("button", { name: "Create campaign", exact: true })
        .click();
      const blockedName = `Storage blocked ${Date.now()}`;
      await broken.getByLabel("Campaign name").fill(blockedName);
      await broken
        .getByRole("button", { name: "Create galaxy", exact: true })
        .click();
      await expect(broken.getByRole("alert")).toContainText(
        "Browser recovery storage is unavailable",
      );
      expect(
        (
          await db
            .collection("developmentCampaigns")
            .where("name", "==", blockedName)
            .get()
        ).empty,
      ).toBe(true);
      expect(blockedWrites).toBe(0);
      await broken.close();
      await open(guest);
      const accountDraft = "Only this commander's saved draft.";
      await guestPanel
        .getByLabel("Message", { exact: true })
        .fill(accountDraft);
      await expect(
        guestPanel.getByRole("status", { name: "Browser draft status" }),
      ).toHaveText("Draft saved on this browser.");
      const entryUrl = new URL("../", url).href;
      async function signOut() {
        await guest.goto(entryUrl);
        await guest
          .getByRole("button", { name: "Your identity", exact: true })
          .click();
        await guest
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await expect(
          guest.getByRole("button", { name: "Play", exact: true }),
        ).toBeVisible();
        await expect(
          guest.getByRole("button", { name: "Your identity", exact: true }),
        ).not.toBeVisible();
      }
      await signOut();
      const strangerEmail = `recovery-stranger-${Date.now()}@example.test`;
      await login(guest, strangerEmail);
      await guest.getByLabel("Commander name").fill("Separate account");
      await guest.getByRole("button", { name: "Save identity" }).click();
      await expect(guest.getByRole("status")).toContainText("Identity saved");
      await grantDeveloper(strangerEmail);
      await guest.goto(url);
      await expect(
        guest.getByRole("heading", { name: before.name, exact: true }),
      ).toBeVisible();
      await expect(guest.locator("body")).not.toContainText(accountDraft);
      await expect(guest.locator("body")).not.toContainText(roomTitle);
      await expect(
        guest.getByRole("button", { name: /^Conversations/ }),
      ).not.toBeVisible();
      await signOut();
      await login(guest, emails[1]);
      await expect(guest.getByLabel("Commander name")).toHaveValue(
        "Fleet envoy 2",
      );
      await guest.goto(url);
      await open(guest);
      await guestPanel
        .getByRole("button", { name: new RegExp(`^${roomTitle}`) })
        .click();
      await expect(
        guestPanel.getByLabel("Message", { exact: true }),
      ).toHaveValue(accountDraft);
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

test("draft recovery lab keeps text and outcomes across motion, seek and confirmation", async ({
  page,
}, info) => {
  await page.goto("dev/animations/");
  const standard = page.getByRole("region", {
    name: "Standard motion comparison",
  });
  const reduced = page.getByRole("region", {
    name: "Reduced motion comparison",
  });
  await page
    .getByLabel("Scenario", { exact: true })
    .selectOption("draft-recovery");
  for (const [time, copy] of [
    ["0", "Recovering this browser’s draft"],
    ["1200", "Draft saved on this browser"],
    ["2200", "another tab"],
    ["3200", "Saving draft on this browser"],
    ["4800", "Draft saved on this browser"],
  ]) {
    await page.getByLabel(/Inspect frame/).fill(time);
    for (const region of [standard, reduced]) {
      await expect(region).toContainText(copy);
      await expect(region.getByLabel("Message", { exact: true })).toHaveValue(
        "My text remains available while the saved draft is reviewed.",
      );
    }
  }
  await page.getByLabel(/Inspect frame/).fill("2200");
  await standard
    .getByRole("button", {
      name: "Replace saved draft with my text",
      exact: true,
    })
    .click();
  await expect(page.getByLabel(/Inspect frame/)).toHaveValue("3200");
  await page
    .getByLabel("Scenario", { exact: true })
    .selectOption("invalid-recovery");
  await standard
    .getByRole("button", { name: "Forget this browser’s record", exact: true })
    .click();
  await expect(
    standard.getByRole("heading", { name: "Forget this saved record?" }),
  ).toBeFocused();
  await standard
    .getByRole("button", { name: "Keep saved record", exact: true })
    .click();
  await expect(
    standard.getByRole("button", {
      name: "Forget this browser’s record",
      exact: true,
    }),
  ).toBeFocused();
  await page.getByLabel(/Inspect frame/).fill("1200");
  for (const region of [standard, reduced])
    await expect(region).toContainText("does not cancel an order");
  await page.screenshot({
    path: info.outputPath("recovery-lab-confirmation.png"),
    fullPage: true,
  });
});
