import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, authenticate, grantDeveloper } from "./helpers";
import type { Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const choice = (page: Page, mode: "real" | "mock") =>
  page.getByRole("radio", {
    name: mode === "real" ? "Real · managed keys" : "Mock · inspectable",
    exact: true,
  });
async function maintenance(page: Page) {
  await button(page, "Roster").click();
  await page.getByText("Development controls", { exact: true }).click();
  await button(page, "Change encryption and resume").scrollIntoViewIfNeeded();
}
test("Encryption migration preserves two-device access across actual managed and inspectable epochs", async ({
  page,
  browser,
  request,
}, info) => {
  test.skip(
    process.env.CLUSTER_KMS_TEST !== "true",
    "Requires actual Cloud KMS; no provider fallback.",
  );
  test.setTimeout(180000);
  const story = new TestStepHelper(info, {
    id: "encryption-migration",
    title: "Pause, change encryption and recover both devices",
    inventory: ["UX-14", "UX-16"],
    description:
      "One saved developer uses two authenticated devices to migrate a waiting campaign from inspectable encryption to actual Cloud KMS and back. Ordinary UI creates and joins the fixed-catalogue campaign. No state, migration result or provider is injected. This is two-device recovery for one recipient, not complete multi-recipient, hosted authentication or worker-fault certification.",
  });
  const email = `epoch-story-${info.project.name}-${Date.now()}@example.test`;
  const name = `Epoch passage ${info.project.name}`;
  let campaignUrl = "",
    campaignId = "";
  await story.harness(
    "saved-member",
    "Save a developer identity and create and join a waiting mock campaign through the ordinary UI; only developer authorization and catalogue entropy are test-controlled.",
    async () => {
      await login(page, email);
      await page.getByLabel("Commander name").fill("Epoch envoy");
      await button(page, "Save identity").click();
      await expect(page.getByRole("status")).toContainText("Identity saved");
      await grantDeveloper(email);
      await button(page, "Close").click();
      await page.getByRole("link", { name: "Open campaigns" }).click();
      await button(page, "Create campaign").click();
      await page.getByLabel("Campaign name").fill(name);
      await button(page, "Create galaxy").click();
      await expect(
        page.getByRole("heading", { name: "Choose your faction" }),
      ).toBeVisible();
      await button(page, "Claim your seat").click();
      await expect(
        page.getByText("Your seat is confirmed.", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("canvas")).toBeVisible();
      campaignUrl = page.url();
      campaignId = new URL(campaignUrl).searchParams.get("campaign")!;
    },
  );
  const companion = await browser.newContext({
    viewport: page.viewportSize()!,
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  try {
    const other = await companion.newPage();
    const views = [
      { page, player: "Epoch envoy", surface: "game" as const },
      {
        page: other,
        player: "Epoch envoy · second device",
        surface: "game" as const,
      },
    ];
    const metadata = (
      mode: "real" | "mock",
      revision: number,
      epoch: number,
    ) => ({
      spec: `Read-only canonical metadata confirms ${mode} epoch ${epoch}, revision ${revision}, with no extra mutation on recovery.`,
      check: async () => {
        const response = await request.get(
          `http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/campaignStates/${campaignId}`,
          { headers: { Authorization: "Bearer owner" } },
        );
        expect(response.ok()).toBe(true);
        const fields = (await response.json()).fields;
        expect(fields).toMatchObject({
          mode: { stringValue: mode },
          revision: { integerValue: String(revision) },
          encryptionEpoch: { integerValue: String(epoch) },
        });
        expect(fields.envelope.mapValue.fields.algorithm.stringValue).toBe(
          mode === "real" ? "AES-256-GCM" : "MOCK-PREFIX-SHA256",
        );
        if (mode === "real") {
          expect(fields).not.toHaveProperty("canonicalKey");
          expect(
            fields.protectedKey.mapValue.fields.algorithm.stringValue,
          ).toBe("GCP-KMS");
        }
      },
    });
    const healthy = {
      spec: "Both devices retain campaign access without alerts; prior mock exposure remains explicit.",
      check: async () => {
        for (const device of [page, other]) {
          await expect(device.getByRole("alert")).toHaveCount(0);
          await expect(
            device.getByText(/This game has exposed mock data/),
          ).toBeVisible();
        }
      },
    };
    await story.step("connected-devices", {
      actor: "Epoch envoy",
      description:
        "Sign into the same invitation on a second device and review the current encryption on both.",
      action: async () => {
        await other.goto(campaignUrl);
        await other.getByRole("link", { name: "Sign in to continue" }).click();
        await authenticate(other, email);
        await expect(other.locator("canvas")).toBeVisible();
        await maintenance(page);
        await maintenance(other);
      },
      acknowledgement: {
        spec: "Both devices recover the current mock mode and available pause control.",
        check: async () => {
          for (const device of [page, other]) {
            await expect(choice(device, "mock")).toBeChecked();
            await expect(choice(device, "real")).toBeEnabled();
            await expect(button(device, "Pause campaign")).toBeEnabled();
          }
        },
      },
      verifications: [metadata("mock", 2, 1), healthy],
      views,
    });
    for (const [mode, previous, revision, epoch] of [
      ["real", "mock", 4, 2],
      ["mock", "real", 6, 3],
    ] as const) {
      await story.step(`pause-for-${mode}`, {
        actor: "Epoch envoy",
        description: `Pause the campaign before migrating to ${mode} encryption.`,
        action: async () => {
          await button(page, "Pause campaign").click();
        },
        acknowledgement: {
          spec: "The pause command is acknowledged and the connected device offers resume.",
          check: async () => {
            await expect(
              page.getByText(
                "Campaign paused. Admissions and scheduled start are stopped.",
                { exact: true },
              ),
            ).toBeVisible();
            await expect(button(other, "Resume campaign")).toBeEnabled();
            const receipt = page.getByText(
              "Campaign paused. Admissions and scheduled start are stopped.",
              { exact: true },
            );
            await receipt.scrollIntoViewIfNeeded();
            const bounds = await receipt.boundingBox();
            const panel = await page
              .getByRole("dialog", { name: "Campaign roster panel" })
              .boundingBox();
            expect(bounds).not.toBeNull();
            expect(panel).not.toBeNull();
            expect(bounds!.y).toBeGreaterThanOrEqual(panel!.y);
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
              panel!.y + panel!.height,
            );
          },
        },
        verifications: [metadata(previous, revision - 1, epoch - 1), healthy],
        views,
      });
      await story.step(`choose-${mode}`, {
        actor: "Epoch envoy",
        description: `Select ${mode} encryption without committing the change.`,
        action: async () => {
          await choice(page, mode).check();
          await button(
            page,
            "Change encryption and resume",
          ).scrollIntoViewIfNeeded();
        },
        acknowledgement: {
          spec: "The proposed mode enables the explicit migration commitment.",
          check: async () => {
            await expect(choice(page, mode)).toBeChecked();
            await expect(
              button(page, "Change encryption and resume"),
            ).toBeEnabled();
          },
        },
        verifications: [
          metadata(previous, revision - 1, epoch - 1),
          {
            spec: "An uncommitted choice does not alter the second device’s authoritative mode.",
            check: async () => expect(choice(other, previous)).toBeChecked(),
          },
          healthy,
        ],
        views: [
          {
            ...views[0],
            primary: [button(page, "Change encryption and resume")],
          },
          views[1],
        ],
      });
      await story.step(`verified-${mode}`, {
        actor: "Epoch envoy",
        description: `Commit ${mode} migration, observe focused progress, then wait for verified activation and resumed access.`,
        action: async () => {
          await button(page, "Change encryption and resume").click();
          await expect(page.getByText(/^Changing encryption:/)).toBeFocused();
        },
        acknowledgement: {
          spec: "The service reports verified completion, restores chart focus and updates the connected device.",
          check: async () => {
            await expect(
              page.getByText(
                "Encryption changed and verified. Campaign resumed.",
                { exact: true },
              ),
            ).toBeVisible({ timeout: 60000 });
            await expect(page.locator("#galaxy-heading")).toBeFocused();
            await expect(choice(other, mode)).toBeChecked();
            await expect(button(other, "Pause campaign")).toBeEnabled();
          },
        },
        verifications: [
          metadata(mode, revision, epoch),
          {
            spec: "Both devices remain free of alerts after authoritative activation.",
            check: async () => {
              for (const device of [page, other])
                await expect(device.getByRole("alert")).toHaveCount(0);
            },
          },
        ],
        views,
      });
      await story.step(`recover-${mode}`, {
        actor: "Epoch envoy",
        description: `Reload the exact campaign and review recovered ${mode} encryption with its permanent exposure warning.`,
        action: async () => {
          await page.reload();
          await expect(page.locator("canvas")).toBeVisible();
          await maintenance(page);
        },
        acknowledgement: {
          spec: "The recovered campaign retains the activated mode and allows normal pause controls.",
          check: async () => {
            await expect(choice(page, mode)).toBeChecked();
            await expect(button(page, "Pause campaign")).toBeEnabled();
          },
        },
        verifications: [
          metadata(mode, revision, epoch),
          healthy,
          {
            spec: "Reload keeps the exact campaign invitation.",
            check: async () => expect(page.url()).toBe(campaignUrl),
          },
        ],
        views,
      });
    }
  } finally {
    await companion.close();
  }
});
