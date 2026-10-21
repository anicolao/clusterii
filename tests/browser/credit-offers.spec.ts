import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
for (const mode of ["mock", "real"] as const)
  test(`ordinary commanders offer, recover and settle exact private credits ${mode}`, async ({
    browser,
    request,
  }, info) => {
    test.skip(
      mode === "real" && process.env.CLUSTER_KMS_TEST !== "true",
      "Managed keys are required.",
    );
    test.setTimeout(180000);
    const contexts = [],
      pages = [];
    const campaignName = `Exchange horizon ${mode} ${Date.now()}`;
    let url = "",
      holding = false;
    const writes: { p: string; d: Record<string, unknown> }[] = [];
    const held: {
      server: import("@playwright/test").WebSocketRoute;
      raw: string | Buffer;
      active: () => boolean;
    }[] = [];
    try {
      for (let i = 0; i < 4; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        if (i === 0)
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
                frame.d.b?.d?.kind === "trade.offer"
              ) {
                writes.push(frame.d.b);
                held.push({ server, raw, active: () => active });
              } else server.send(raw);
            });
            server.onMessage((raw) => ws.send(raw));
          });
        const page = await context.newPage();
        pages.push(page);
        const email = `exchange-ui-${i}-${Date.now()}@example.test`;
        await login(page, email);
        await page.getByLabel("Commander name").fill(`Exchange envoy ${i + 1}`);
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
          await page.getByLabel("Campaign name").fill(campaignName);
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
      const {
        settleCampaignTicks,
      } = require("./lib/functions/src/production.js");
      const open = async (p: typeof page) => {
        await p.getByRole("button", { name: "Economy", exact: true }).click();
        await p
          .getByRole("button", { name: "Credit offers", exact: true })
          .click();
      };
      await open(page);
      const panel = page.getByRole("region", {
        name: "Credit offers",
        exact: true,
      });
      await panel.getByLabel("Other commander").selectOption("1");
      await panel.getByLabel("Credits you offer").fill("10.001");
      await panel.getByLabel("Credits you request").fill("2.002");
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 600],
        ["4k", 3840, 2160],
      ] as const) {
        await page.setViewportSize({ width, height });
        const rail = panel.getByRole("button", {
          name: "Share credit offer",
          exact: true,
        });
        const box = await rail.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight,
          ),
        ).toBe(true);
        await geometry(page, panel);
        await panel
          .getByRole("region", { name: "Offer details", exact: true })
          .evaluate((el) => el.scrollTo(0, 0));
        await page.screenshot({
          path: info.outputPath(`credit-compose-${label}.png`),
        });
      }
      const before = (await db.doc(`campaignStates/${id}`).get()).get(
        "revision",
      );
      holding = true;
      await panel
        .getByRole("button", { name: "Share credit offer", exact: true })
        .click();
      await expect.poll(() => writes.length).toBeGreaterThanOrEqual(1);
      await expect(
        panel.getByRole("group", { name: "Exchange acknowledgement" }),
      ).toBeFocused();
      await expect(
        panel.getByRole("button", {
          name: "Awaiting acknowledgement…",
          exact: true,
        }),
      ).toBeDisabled();
      await page.reload();
      await expect(panel).toBeVisible();
      await expect(panel.getByLabel("Credits you offer")).toHaveValue("10.001");
      await expect(panel.getByLabel("Credits you request")).toHaveValue(
        "2.002",
      );
      await expect.poll(() => writes.length).toBeGreaterThanOrEqual(2);
      expect(new Set(writes.map((write) => write.p)).size).toBe(1);
      expect(
        writes.every(
          (write) => JSON.stringify(write.d) === JSON.stringify(writes[0].d),
        ),
      ).toBe(true);
      expect((await db.doc(`campaignStates/${id}`).get()).get("revision")).toBe(
        before,
      );
      holding = false;
      for (const item of held) if (item.active()) item.server.send(item.raw);
      await expect(
        panel.getByRole("group", { name: "Exchange acknowledgement" }),
      ).toContainText("Offer shared");
      expect((await db.doc(`campaignStates/${id}`).get()).get("revision")).toBe(
        before + 1,
      );
      await open(pages[1]);
      const counterpart = pages[1].getByRole("region", {
        name: "Credit offers",
        exact: true,
      });
      await counterpart
        .getByRole("button", {
          name: "From Exchange envoy 1 · open",
          exact: true,
        })
        .click();
      await expect(counterpart).toContainText("10.001 credits");
      await expect(counterpart).toContainText("2.002 credits");
      await counterpart
        .getByRole("button", { name: "Accept exact terms", exact: true })
        .click();
      await expect(
        counterpart.getByRole("status", { name: "Offer schedule" }),
      ).toContainText("scheduled for tick 1");
      await open(pages[2]);
      const privatePanel = pages[2].getByRole("region", {
        name: "Credit offers",
        exact: true,
      });
      await expect(
        privatePanel.getByRole("button", { name: /^(From|To) Exchange envoy/ }),
      ).toHaveCount(0);
      expect(await settleCampaignTicks(id, () => start + 900000)).toBe(1);
      await expect(
        panel.getByRole("status", { name: "Offer outcome" }),
      ).toContainText("Offer settled");
      await expect(
        panel.getByRole("group", { name: "Exchange acknowledgement" }),
      ).toContainText("Offer settled");
      await expect(
        panel.getByRole("group", { name: "Exchange acknowledgement" }),
      ).not.toContainText("scheduled");
      await expect(
        counterpart.getByRole("status", { name: "Offer outcome" }),
      ).toContainText("Both sides transferred once");
      expect(await settleCampaignTicks(id, () => start + 900000)).toBe(0);
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 600],
        ["4k", 3840, 2160],
      ] as const) {
        await page.setViewportSize({ width, height });
        await page.screenshot({
          path: info.outputPath(`credit-settled-${label}.png`),
        });
      }
      await panel
        .getByRole("button", { name: "New offer", exact: true })
        .click();
      await panel
        .getByRole("button", { name: "Share credit offer", exact: true })
        .click();
      await expect(
        panel.getByRole("button", { name: "Withdraw offer", exact: true }),
      ).toBeEnabled();
      await panel
        .getByRole("button", { name: "Withdraw offer", exact: true })
        .click();
      await expect(
        panel.getByRole("status", { name: "Offer schedule" }),
      ).toContainText("Withdrawal is scheduled for tick 2");
      expect(await settleCampaignTicks(id, () => start + 2 * 900000)).toBe(1);
      await expect(
        panel.getByRole("status", { name: "Offer outcome" }),
      ).toContainText("Offer withdrawn");
      // A later ledger reset must not restore a stale acknowledgement in an open instrument.
      expect(await settleCampaignTicks(id, () => start + 3 * 900000)).toBe(1);
      await expect(
        panel.getByRole("group", { name: "Exchange acknowledgement" }),
      ).toContainText("Offer withdrawn");
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Credit offers", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("button", { name: "Return to galaxy", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Offer withdrawn · confirmed tick 2." }),
      ).toBeVisible();
      await page.reload();
      await open(page);
      await page
        .getByRole("button", { name: "Earlier offers", exact: true })
        .click();
      const recorded = page
        .getByRole("dialog", { name: "Campaign history panel", exact: true })
        .locator("details")
        .filter({
          has: page.getByRole("heading", {
            name: "Offer withdrawn · tick 2",
            exact: true,
            includeHidden: true,
          }),
        });
      await expect(recorded).toHaveCount(1);
      await recorded.locator("summary").click();
      await expect(
        recorded.getByRole("article", { name: "Recorded credit exchange" }),
      ).toBeVisible();
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

test("credit lab preserves terms, pending/reconnect states and settled acknowledgement across motion modes", async ({
  page,
}, info) => {
  await page.goto("./dev/animations/");
  await page
    .getByLabel("Scenario", { exact: true })
    .selectOption("credit-offers");
  const standard = page.getByRole("region", {
      name: "Standard motion comparison",
      exact: true,
    }),
    reduced = page.getByRole("region", {
      name: "Reduced motion comparison",
      exact: true,
    });
  const seek = page.getByLabel(/Inspect frame/);
  for (const [time, text] of [
    [500, "Awaiting"],
    [1200, "connection"],
    [2200, "Offer shared"],
    [3200, "scheduled for tick 1"],
    [4800, "Offer settled"],
  ] as const) {
    await seek.fill(String(time));
    const a = standard.getByRole("group", { name: "Exchange acknowledgement" }),
      b = reduced.getByRole("group", { name: "Exchange acknowledgement" });
    await expect(a).toContainText(new RegExp(text, "i"));
    await expect(b).toHaveText((await a.innerText()).trim());
  }
  await expect(
    standard.getByRole("group", { name: "Exchange acknowledgement" }),
  ).not.toContainText("scheduled");
  await page.getByLabel("Playback speed").selectOption("0.25");
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await seek.inputValue();
  await page.waitForTimeout(100);
  expect(await seek.inputValue()).toBe(paused);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(seek).toHaveValue("0");
  for (const [label, width, height] of [
    ["phone", 393, 852],
    ["desktop", 1440, 1000],
    ["short", 1280, 600],
    ["4k", 3840, 2160],
  ] as const) {
    await page.setViewportSize({ width, height });
    await seek.fill("4800");
    await standard.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await standard.screenshot({
      path: info.outputPath(`credit-lab-${label}.png`),
    });
  }
});
