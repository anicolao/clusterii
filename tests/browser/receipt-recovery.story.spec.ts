import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";
import {
  observeProfileWrites,
  profileIdentity,
  profileFacts,
} from "./story-helpers/profile-observer";
import type { Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const view = (page: Page, player: string) => ({
  page,
  player,
  surface: "game" as const,
});
function collide() {
  const original = crypto.randomUUID.bind(crypto),
    id = original();
  crypto.randomUUID = () => id;
  Object.assign(window, {
    restoreCommandIds: () => {
      crypto.randomUUID = original;
    },
  });
}
async function restore(page: Page) {
  await page.evaluate(() => {
    (
      window as unknown as { restoreCommandIds: () => void }
    ).restoreCommandIds();
  });
}
async function savedOrderCount(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("clusterii-recovery", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<number>((resolve, reject) => {
        const r = db.transaction("orders").objectStore("orders").count();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
test("A mismatched receipt preserves the identity draft until a fresh acknowledged save", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "identity-receipt-recovery",
    title: "Recover an identity draft after a mismatched acknowledgement",
    inventory: ["UX-01", "UX-14", "UX-16"],
    description:
      "A commander submits a second identity with a deliberately reused command UUID. The real encrypted ingress rejects the mismatched acknowledgement without losing the draft; a new command saves it and reload recovers the accepted identity.",
  });
  const writes = observeProfileWrites(page),
    views = [view(page, "Receipt commander")];
  const facts = (revision: number) => ({
    spec: `Canonical identity remains at revision ${revision} with ${revision} versions and receipts.`,
    check: async () => {
      const result = await profileFacts(page, profileIdentity(writes));
      expect(result.revision).toBe(revision);
      expect(result.versions).toHaveLength(revision);
      expect(result.receipts).toHaveLength(revision);
    },
  });
  await story.harness(
    "reused-command-id",
    "Deliberately reuse the browser command UUID while preserving real encryption entropy, authenticated ingress, persistence and receipt validation. Sign in through the ordinary Google emulator UI.",
    async () => {
      await page.addInitScript(collide);
      await login(
        page,
        `identity-receipt-${info.project.name}-${Date.now()}@example.test`,
      );
    },
  );
  await story.step("first-draft", {
    actor: "Receipt commander",
    description: "Choose the identity to save first.",
    action: async () =>
      page.getByLabel("Commander name").fill("Accepted identity"),
    acknowledgement: {
      spec: "The identity draft is ready to save.",
      check: async () => expect(button(page, "Save identity")).toBeEnabled(),
    },
    verifications: [
      {
        spec: "The alias is visible before commitment.",
        check: async () =>
          expect(page.getByLabel("Commander name")).toHaveValue(
            "Accepted identity",
          ),
      },
    ],
    views,
  });
  await story.step("accepted-identity", {
    actor: "Receipt commander",
    description:
      "Save the first identity and wait for its authoritative acknowledgement.",
    action: async () => button(page, "Save identity").click(),
    acknowledgement: {
      spec: "The identity save is acknowledged.",
      check: async () =>
        expect(page.getByRole("status")).toContainText("Identity saved"),
    },
    verifications: [facts(1)],
    views,
  });
  await story.step("replacement-draft", {
    actor: "Receipt commander",
    description: "Prepare a different identity while the original stays saved.",
    action: async () =>
      page.getByLabel("Commander name").fill("Preserved new draft"),
    acknowledgement: {
      spec: "The replacement text remains editable.",
      check: async () =>
        expect(page.getByLabel("Commander name")).toHaveValue(
          "Preserved new draft",
        ),
    },
    verifications: [
      facts(1),
      {
        spec: "The unsaved replacement does not inherit the prior save acknowledgement.",
        check: async () =>
          expect(
            page.getByRole("status").filter({ hasText: "Identity saved" }),
          ).toHaveCount(0),
      },
    ],
    views,
  });
  await story.step("mismatched-acknowledgement", {
    actor: "Receipt commander",
    description:
      "Submit the replacement with the reused command ID. The acknowledgement belongs to different content, so the draft is retained for a fresh save.",
    action: async () => button(page, "Save identity").click(),
    acknowledgement: {
      spec: "The mismatched-order alert is focused.",
      check: async () => {
        await expect(page.getByRole("alert")).toContainText(
          "does not match your order",
        );
        await expect(page.getByRole("alert")).toBeFocused();
      },
    },
    verifications: [
      facts(1),
      {
        spec: "The draft survives without a misleading validation error or retry of the colliding command.",
        check: async () => {
          await expect(page.getByLabel("Commander name")).toHaveValue(
            "Preserved new draft",
          );
          await expect(page.getByLabel("Commander name")).not.toHaveAttribute(
            "aria-invalid",
            "true",
          );
          await expect(button(page, "Retry save")).toHaveCount(0);
        },
      },
    ],
    views,
  });
  await story.harness(
    "restore-command-identity",
    "Restore ordinary random command UUIDs; do not change the retained draft, receipt or persisted identity.",
    async () => restore(page),
  );
  await story.step("fresh-save", {
    actor: "Receipt commander",
    description:
      "Save the retained draft as a new command and receive its matching acknowledgement.",
    action: async () => button(page, "Save identity").click(),
    acknowledgement: {
      spec: "The fresh identity command is acknowledged.",
      check: async () =>
        expect(page.getByRole("status")).toContainText("Identity saved"),
    },
    verifications: [facts(2)],
    views,
  });
  await story.step("reload-accepted-draft", {
    actor: "Receipt commander",
    description: "Reload and reopen the identity saved by the fresh command.",
    action: async () => {
      await page.reload();
      await button(page, "Your identity").click();
    },
    acknowledgement: {
      spec: "The accepted replacement survives reload.",
      check: async () =>
        expect(page.getByLabel("Commander name")).toHaveValue(
          "Preserved new draft",
        ),
    },
    verifications: [facts(2)],
    views,
  });
});
test("A mismatched campaign receipt preserves the proposed galaxy for a fresh creation", async ({
  page,
  request,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "campaign-receipt-recovery",
    title: "Recover a galaxy proposal after a mismatched acknowledgement",
    inventory: ["UX-02", "UX-14", "UX-16"],
    description:
      "A developer creates one real waiting galaxy, then deliberately reuses its command UUID for a different proposal. The original remains unchanged, the proposal is retained and a fresh acknowledged command creates a distinct campaign. The fixed-catalogue harness supplies map entropy only; rules remain under review.",
  });
  const views = [view(page, "Receipt envoy")],
    originalName = `Original receipt ${info.project.name}`,
    freshName = `Preserved receipt ${info.project.name}`;
  let originalId = "",
    freshId = "";
  const canonical = (id: () => string, name: string) => ({
    spec: `The acknowledged campaign ${name} retains its recorded name and revision one.`,
    check: async () => {
      const response = await request.get(
        `http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/developmentCampaigns/${id()}`,
        { headers: { Authorization: "Bearer owner" } },
      );
      expect(response.ok()).toBe(true);
      expect((await response.json()).fields).toMatchObject({
        name: { stringValue: name },
        revision: { integerValue: "1" },
      });
    },
  });
  const cleared = {
    spec: "No completed or mismatched order remains in durable recovery storage.",
    check: async () => expect.poll(() => savedOrderCount(page)).toBe(0),
  };
  await story.harness(
    "developer-and-collision",
    "Prepare a saved identity and developer access through ordinary sign-in/save UI and explicit emulator authorization. The test loader fixes catalogue entropy. Reuse one command UUID only after identity setup; actual encryption, service authorization and persistence remain active.",
    async () => {
      const email = `campaign-receipt-${info.project.name}-${Date.now()}@example.test`;
      await login(page, email);
      await page.getByLabel("Commander name").fill("Receipt envoy");
      await button(page, "Save identity").click();
      await expect(page.getByRole("status")).toContainText("Identity saved");
      await grantDeveloper(email);
      await button(page, "Close").click();
      await page.getByRole("link", { name: "Open campaigns" }).click();
      await page.evaluate(collide);
      await button(page, "Create campaign").click();
    },
  );
  await story.step("original-proposal", {
    actor: "Receipt envoy",
    description: "Name the first development galaxy before committing.",
    action: async () => page.getByLabel("Campaign name").fill(originalName),
    acknowledgement: {
      spec: "The first proposal is ready for creation.",
      check: async () => expect(button(page, "Create galaxy")).toBeEnabled(),
    },
    verifications: [
      {
        spec: "The proposed name is retained.",
        check: async () =>
          expect(page.getByLabel("Campaign name")).toHaveValue(originalName),
      },
    ],
    views,
  });
  await story.step("original-created", {
    actor: "Receipt envoy",
    description: "Create the original galaxy and reach its faction selection.",
    action: async () => {
      await button(page, "Create galaxy").click();
      await expect(
        page.getByRole("heading", { name: "Choose your faction" }),
      ).toBeVisible();
      originalId = new URL(page.url()).searchParams.get("campaign")!;
    },
    acknowledgement: {
      spec: "The original galaxy is acknowledged by name.",
      check: async () =>
        expect(
          page.getByRole("heading", { name: originalName, exact: true }),
        ).toBeVisible(),
    },
    verifications: [canonical(() => originalId, originalName), cleared],
    views,
  });
  await story.step("replacement-proposal", {
    actor: "Receipt envoy",
    description: "Return to campaigns and prepare a differently named galaxy.",
    action: async () => {
      await button(page, "All campaigns").click();
      await button(page, "Create campaign").click();
      await page.getByLabel("Campaign name").fill(freshName);
    },
    acknowledgement: {
      spec: "The replacement proposal is ready without changing the original.",
      check: async () =>
        expect(page.getByLabel("Campaign name")).toHaveValue(freshName),
    },
    verifications: [
      canonical(() => originalId, originalName),
      {
        spec: "The uncommitted proposal does not claim an already-created campaign.",
        check: async () =>
          expect(
            page.getByRole("status").filter({ hasText: "Campaign created" }),
          ).toHaveCount(0),
      },
    ],
    views,
  });
  await story.step("mismatched-campaign-order", {
    actor: "Receipt envoy",
    description:
      "The reused command ID cannot acknowledge this different galaxy. Preserve its name for a fresh creation.",
    action: async () => button(page, "Create galaxy").click(),
    acknowledgement: {
      spec: "The mismatched-order alert is visible and focused.",
      check: async () => {
        await expect(page.getByRole("alert")).toContainText(
          "does not match your order",
        );
        await expect(page.getByRole("alert")).toBeFocused();
      },
    },
    verifications: [
      canonical(() => originalId, originalName),
      cleared,
      {
        spec: "The proposal remains intact and can be committed as a fresh command.",
        check: async () => {
          await expect(page.getByLabel("Campaign name")).toHaveValue(freshName);
          await expect(button(page, "Create galaxy")).toBeEnabled();
        },
      },
    ],
    views,
  });
  await story.harness(
    "restore-campaign-command-id",
    "Restore ordinary random command UUIDs without changing the proposal or either receipt.",
    async () => restore(page),
  );
  await story.step("fresh-galaxy-created", {
    actor: "Receipt envoy",
    description:
      "Commit the retained proposal with a fresh command ID and open the distinct acknowledged galaxy.",
    action: async () => {
      await button(page, "Create galaxy").click();
      await expect(
        page.getByRole("heading", { name: "Choose your faction" }),
      ).toBeVisible();
      freshId = new URL(page.url()).searchParams.get("campaign")!;
    },
    acknowledgement: {
      spec: "The new galaxy is acknowledged by its retained name.",
      check: async () =>
        expect(
          page.getByRole("heading", { name: freshName, exact: true }),
        ).toBeVisible(),
    },
    verifications: [
      canonical(() => originalId, originalName),
      canonical(() => freshId, freshName),
      cleared,
      {
        spec: "The new galaxy has a distinct authoritative identity.",
        check: async () => expect(freshId).not.toBe(originalId),
      },
    ],
    views,
  });
  await story.step("reload-new-galaxy", {
    actor: "Receipt envoy",
    description:
      "Reload the exact newly created campaign without selecting another directory match.",
    action: async () => {
      await page.reload();
    },
    acknowledgement: {
      spec: "The exact acknowledged galaxy recovers after reload.",
      check: async () => {
        await expect(
          page.getByRole("heading", { name: freshName, exact: true }),
        ).toBeVisible();
        expect(new URL(page.url()).searchParams.get("campaign")).toBe(freshId);
      },
    },
    verifications: [canonical(() => freshId, freshName), cleared],
    views,
  });
});
