import { expectWaitingSeat } from "../helpers/campaign-phase";
import { observeDeparture } from "../../browser/story-helpers/campaign-departure";
import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { login, grantDeveloper } from "../../browser/helpers";
import type { Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const real = (page: Page) =>
  page.getByRole("radio", {
    name: "Real encryption · managed keys",
    exact: true,
  });
const mock = (page: Page) =>
  page.getByRole("radio", {
    name: "Mock codec · inspectable data",
    exact: true,
  });
async function prepare(page: Page, email: string) {
  await login(page, email);
  await page.getByLabel("Commander name").fill("Cipher envoy");
  await button(page, "Save identity").click();
  await expect(page.getByRole("status")).toContainText("Identity saved");
  await grantDeveloper(email);
  await button(page, "Close").click();
  await page.getByRole("link", { name: "Open campaigns" }).click();
}
for (const managed of [false, true]) {
  test(`Encryption choice ${managed ? "uses actual managed keys through admission and recovery" : "explains unavailable managed keys without silent substitution"}`, async ({
    page,
    request,
  }, info) => {
    test.skip(
      managed !== (process.env.CLUSTER_KMS_TEST === "true"),
      managed
        ? "Requires explicitly enabled real Cloud KMS credentials; no provider mock."
        : "Requires the explicitly unconfigured emulator.",
    );
    test.setTimeout(120000);
    const story = new TestStepHelper(info, {
      id: managed ? "managed-campaign-admission" : "encryption-unavailable",
      title: managed
        ? "Create and recover a campaign with actual managed keys"
        : "Understand unavailable encryption before creating a development campaign",
      inventory: ["UX-02", "UX-14", "UX-16"],
      description:
        "A saved developer reviews the actual provider availability, chooses the disclosed encryption mode, creates and joins a campaign, reloads its acknowledged seat and leaves. Fixed catalogue entropy is test-only; commands, authorization, encryption, persistence and recipient delivery remain real. Managed runs use actual Cloud KMS and are separate from default CI; emulated login does not certify hosted Google authentication.",
    });
    const departure = observeDeparture(page);
    const name = `${managed ? "Managed" : "Inspectable"} dawn ${info.project.name}`;
    const views = [{ page, player: "Cipher envoy", surface: "game" as const }];
    let campaignUrl = "",
      campaignId = "";
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const state = (revision: number) => ({
      spec: `Read-only authoritative metadata retains the chosen ${managed ? "real" : "mock"} mode and revision ${revision}.`,
      check: async () => {
        const response = await request.get(
          `http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/developmentCampaigns/${campaignId}`,
          { headers: { Authorization: "Bearer owner" } },
        );
        expect(response.ok()).toBe(true);
        expect((await response.json()).fields).toMatchObject({
          name: { stringValue: name },
          mode: { stringValue: managed ? "real" : "mock" },
          revision: { integerValue: String(revision) },
        });
        const canonical = await request.get(
          `http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/campaignStates/${campaignId}`,
          { headers: { Authorization: "Bearer owner" } },
        );
        expect(canonical.ok()).toBe(true);
        const fields = (await canonical.json()).fields;
        expect(fields.envelope.mapValue.fields.algorithm.stringValue).toBe(
          managed ? "AES-256-GCM" : "MOCK-PREFIX-SHA256",
        );
        if (managed) {
          expect(fields).not.toHaveProperty("canonicalKey");
          expect(
            fields.protectedKey.mapValue.fields.algorithm.stringValue,
          ).toBe("GCP-KMS");
        }
        expect(errors).toEqual([]);
      },
    });
    await story.harness(
      "saved-developer",
      "Save an identity through ordinary UI and grant explicit developer access in the emulator. No campaign state or result is injected.",
      async () =>
        prepare(
          page,
          `encryption-story-${managed}-${info.project.name}-${Date.now()}@example.test`,
        ),
    );
    await story.step("review-provider", {
      actor: "Cipher envoy",
      description:
        "Open the proposal and review the available encryption choices before committing.",
      action: async () => {
        await button(page, "Create campaign").click();
        await page.getByLabel("Campaign name").fill(name);
        if (managed) await expect(real(page)).toBeEnabled();
        await page.locator(".encryption-settings").scrollIntoViewIfNeeded();
      },
      acknowledgement: {
        spec: "The proposal shows the actual configured provider availability.",
        check: async () => {
          if (managed) await expect(real(page)).toBeEnabled();
          else await expect(real(page)).toBeDisabled();
        },
      },
      verifications: [
        {
          spec: "Inspectable development data is explicit and selected; unavailable real mode explains that it cannot fall back.",
          check: async () => {
            await expect(mock(page)).toBeChecked();
            const disclosure = await page
                .locator(".encryption-settings")
                .boundingBox(),
              rail = await page.locator(".commit-rail").boundingBox();
            expect(disclosure).not.toBeNull();
            expect(rail).not.toBeNull();
            expect(disclosure!.y).toBeGreaterThanOrEqual(0);
            expect(disclosure!.y + disclosure!.height).toBeLessThanOrEqual(
              rail!.y,
            );
            if (!managed)
              await expect(
                page.getByText(
                  "Managed encryption is not configured for this emulator. Real mode never falls back to the mock codec.",
                  { exact: true },
                ),
              ).toBeVisible();
          },
        },
      ],
      views: [{ ...views[0], primary: [button(page, "Create galaxy")] }],
    });
    if (managed)
      await story.step("choose-managed", {
        actor: "Cipher envoy",
        description:
          "Explicitly select managed encryption before creating the galaxy.",
        action: async () => real(page).check(),
        acknowledgement: {
          spec: "Managed encryption is selected.",
          check: async () => expect(real(page)).toBeChecked(),
        },
        verifications: [
          {
            spec: "The inspectable codec is not selected and the commitment names managed encryption.",
            check: async () => {
              await expect(mock(page)).not.toBeChecked();
              await expect(page.locator(".commit-rail")).toContainText(
                "Managed encryption",
              );
            },
          },
        ],
        views: [{ ...views[0], primary: [button(page, "Create galaxy")] }],
      });
    await story.step("created-campaign", {
      actor: "Cipher envoy",
      description:
        "Commit the disclosed encryption choice and wait for authoritative campaign creation.",
      action: async () => {
        await button(page, "Create galaxy").click();
        await expect(
          page.getByRole("heading", { name: "Choose your faction" }),
        ).toBeVisible();
        campaignUrl = page.url();
        campaignId = new URL(campaignUrl).searchParams.get("campaign")!;
      },
      acknowledgement: {
        spec: "Campaign creation is acknowledged before faction admission.",
        check: async () =>
          expect(
            page.getByText("Campaign created. Choose your faction.", {
              exact: true,
            }),
          ).toBeVisible(),
      },
      verifications: [state(1)],
      views: [{ ...views[0], primary: [button(page, "Claim your seat")] }],
    });
    await story.step("claimed-seat", {
      actor: "Cipher envoy",
      description:
        "Claim a seat through the selected provider and wait for confirmation.",
      action: async () => button(page, "Claim your seat").click(),
      acknowledgement: {
        spec: "The service confirms this seat.",
        check: async () => {
          await expect(
            page.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
          await expectWaitingSeat(page, "Cipher envoy", 1);
          await expect(button(page, "Roster")).toBeVisible();
        },
      },
      verifications: [state(2)],
      views,
    });
    await story.step("recovered-seat", {
      actor: "Cipher envoy",
      description:
        "Reload the exact campaign and open its roster using recovered authenticated member delivery.",
      action: async () => {
        await page.reload();
        await expectWaitingSeat(page, "Cipher envoy", 1);
        await button(page, "Roster").click();
      },
      acknowledgement: {
        spec: "The recovered roster identifies the saved commander and offers seat release.",
        check: async () => {
          await expect(
            page
              .getByRole("dialog", {
                name: "Campaign roster panel",
                exact: true,
              })
              .getByRole("region", { name: "Campaign roster", exact: true })
              .getByText("Cipher envoy", { exact: true }),
          ).toBeVisible();
          await expect(
            page
              .getByRole("dialog", {
                name: "Campaign roster panel",
                exact: true,
              })
              .getByRole("button", { name: "Leave campaign", exact: true }),
          ).toBeVisible();
        },
      },
      verifications: [
        state(2),
        {
          spec: "Reload retains the exact campaign URL.",
          check: async () => expect(page.url()).toBe(campaignUrl),
        },
      ],
      views,
    });
    await story.step("released-seat", {
      actor: "Cipher envoy",
      description:
        "Leave the waiting campaign and wait for the matching authoritative acknowledgement.",
      action: async () =>
        page
          .getByRole("dialog", { name: "Campaign roster panel", exact: true })
          .getByRole("button", { name: "Leave campaign", exact: true })
          .click(),
      acknowledgement: {
        spec: "The service acknowledges seat release.",
        check: async () =>
          expect(
            page.getByText("Your seat has been released.", { exact: true }),
          ).toBeVisible(),
      },
      verifications: [state(3), departure],
      views,
    });
  });
}
