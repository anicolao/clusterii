import type {
  APIRequestContext,
  Browser,
  BrowserContext,
  Page,
  TestInfo,
} from "@playwright/test";
import { expect } from "./fixtures";
import { login, grantDeveloper } from "../../browser/helpers";
import {
  scheduledAt,
  admissionAt,
} from "../../browser/story-helpers/admission-clock.mjs";

/** Real waiting membership, not a stand-in for the active chart. */
export async function expectWaitingSeat(
  page: Page,
  alias: string,
  seats: number,
) {
  const waiting = page.getByRole("region", {
    name: "Waiting campaign",
    exact: true,
  });
  const manifest = waiting.getByRole("region", {
    name: "Campaign manifest",
    exact: true,
  });
  await expect(waiting).toBeVisible();
  await expect(
    manifest.getByRole("heading", {
      name: `${seats} / 4 empires assembled`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(manifest.getByText(alias, { exact: true })).toHaveCount(1);
  await expect(
    waiting.getByRole("status", { name: "Campaign start", exact: true }),
  ).toContainText("Waiting");
  await expect(
    waiting.getByRole("button", { name: "Leave campaign", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Selected system", exact: true }),
  ).toHaveCount(0);
}

/** Harness controls, after a real host has created/joined a Scheduled story campaign.
 * Three independently authenticated UI admissions and actual Scheduler HTTP delivery.
 * No injected seats, home, views, receipts, or client service responses.
 */
export function activeAdmissionControls(
  browser: Browser,
  request: APIRequestContext,
  host: Page,
  info: TestInfo,
  portraitNames?: readonly string[],
) {
  const contexts: BrowserContext[] = [];
  return [
    ...["Pelagic Concord", "Vesper Synod", "Dracon League"].map(
      (faction, i) => ({
        description: `Authenticate independent ${faction} commander, save identity and acknowledge ordinary seat admission.`,
        run: async () => {
          const context = await browser.newContext({
            viewport: info.project.use.viewport,
            baseURL: info.project.use.baseURL,
            deviceScaleFactor: 1,
            locale: "en-US",
            timezoneId: "UTC",
            colorScheme: "dark",
            reducedMotion: "reduce",
          });
          contexts.push(context);
          const peer = await context.newPage();
          const email = `navigation-peer-${info.project.name}-${i}-${crypto.randomUUID()}@example.test`;
          await login(peer, email);
          await peer
            .getByLabel("Commander name")
            .fill(`Navigation peer ${i + 1}`);
          if (portraitNames?.[i])
            await peer
              .getByRole("radio", { name: portraitNames[i], exact: true })
              .check();
          await peer
            .getByRole("button", { name: "Save identity", exact: true })
            .click();
          await expect(peer.getByRole("status")).toContainText(
            "Identity saved",
          );
          await grantDeveloper(email);
          await peer.clock.setFixedTime(admissionAt);
          await peer.goto(host.url());
          await peer.getByRole("radio", { name: new RegExp(faction) }).check();
          if (portraitNames?.[i]) {
            await peer
              .getByRole("button", { name: "Portrait", exact: true })
              .click();
            await peer
              .getByRole("radio", { name: portraitNames[i], exact: true })
              .check();
          }
          await peer
            .getByRole("button", { name: "Claim your seat", exact: true })
            .click();
          await expect(
            peer.getByText("Your seat is confirmed.", { exact: true }),
          ).toBeVisible();
          const manifest = host.getByRole("region", {
            name: "Campaign manifest",
            exact: true,
          });
          await expect(
            manifest.getByText(`Navigation peer ${i + 1}`, { exact: true }),
          ).toHaveCount(1);
          await expect(
            manifest.getByRole("heading", {
              name: `${i + 2} / 4 empires assembled`,
              exact: true,
            }),
          ).toBeVisible();
        },
      }),
    ),
    {
      description:
        "Deliver the real scheduler HTTP request at the fixed demo admission boundary; acknowledge Began and the assigned home chart. Not hosted scheduling evidence.",
      run: async () => {
        const status = host
          .getByRole("region", { name: "Waiting campaign", exact: true })
          .getByRole("status", { name: "Campaign start", exact: true });
        await expect(status.locator("time")).toHaveAttribute(
          "datetime",
          new Date(scheduledAt).toISOString(),
        );
        await host.clock.setFixedTime(scheduledAt);
        const result = await request.post(
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
        expect(result.ok()).toBe(true);
        await host.getByRole("button", { name: "Roster", exact: true }).click();
        const roster = host.getByRole("dialog", {
          name: "Campaign roster panel",
          exact: true,
        });
        await expect(
          roster.getByRole("status", { name: "Campaign start", exact: true }),
        ).toContainText("Began");
        await expect(
          roster.getByRole("heading", {
            name: "4 / 4 empires assembled",
            exact: true,
          }),
        ).toBeVisible();
        await host
          .getByRole("button", { name: "Close roster", exact: true })
          .click();
        await expect(host.locator("canvas")).toBeVisible();
        await expect(
          host.getByRole("complementary", {
            name: "Selected system",
            exact: true,
          }),
        ).toBeVisible();
        for (const context of contexts) await context.close();
      },
    },
  ];
}
