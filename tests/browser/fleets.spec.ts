import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary commanders form and disband conserved fleets through acknowledged ticks", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(90000);
  const contexts = [],
    pages = [];
  let url = "";
  try {
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
      const email = `fleet-ui-${i}-${Date.now()}@example.test`;
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
          .fill(`Fleet horizon ${Date.now()}`);
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
    const inspector = page.getByRole("complementary", {
      name: "Selected system",
    });
    await inspector.getByRole("button", { name: /Fleets · 0/ }).click();
    const panel = page.getByRole("region", {
      name: "Fleet preparation",
      exact: true,
    });
    await expect(panel.getByText("Your seat is confirmed.")).toHaveCount(0);
    await panel.getByLabel("Fighters", { exact: true }).fill("2");
    await panel.getByLabel("Infantry", { exact: true }).fill("21");
    await expect(
      panel.getByRole("button", { name: "Form fleet", exact: true }),
    ).toBeDisabled();
    await panel.getByLabel("Infantry", { exact: true }).fill("20");
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      const commit = panel.getByRole("button", {
        name: "Form fleet",
        exact: true,
      });
      await expect(commit).toBeEnabled();
      const contrast = await commit.evaluate((el) => {
        const c = getComputedStyle(el);
        const luminance = (rgb: string) => {
          const v = rgb
            .match(/[0-9.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((n) => n / 255)
            .map((n) =>
              n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
            );
          return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
        };
        const a = luminance(c.color),
          b = luminance(c.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      const box = await commit.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight &&
            document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await geometry(page, panel);
      await panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .evaluate((el) => el.scrollTo(0, 0));
      await page.screenshot({
        path: info.outputPath(`fleet-ready-${label}.png`),
      });
    }
    await panel
      .getByRole("button", { name: "Form fleet", exact: true })
      .click();
    await expect(
      panel.getByRole("status").filter({ hasText: "Fleet order accepted." }),
    ).toBeVisible();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("2 fighters · 20 infantry");
    await page.reload();
    await inspector.getByRole("button", { name: /Fleets · 0/ }).click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("2 fighters · 20 infantry");
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    expect(await settleCampaignTicks(id, () => start + 900000)).toBe(1);
    await expect(
      panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .getByRole("status")
        .filter({ hasText: "Fleet formed" }),
    ).toBeVisible();
    await panel.getByRole("button", { name: /^Fleet [0-9]+$/ }).click();
    await expect(panel.getByRole("heading", { level: 3 })).toContainText(
      "Fleet",
    );
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      const box = await panel
        .getByRole("button", { name: "Disband fleet", exact: true })
        .boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      await geometry(page, panel);
      await panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .evaluate((el) => el.scrollTo(0, 0));
      await page.screenshot({
        path: info.outputPath(`fleet-formed-${label}.png`),
      });
    }
    await panel.getByRole("button", { name: "Back to system" }).click();
    await expect(
      inspector.getByRole("button", { name: /Fleets · 1/ }),
    ).toBeFocused();
    await expect(
      page.getByLabel(/1 of your fleets stationed at/),
    ).toBeVisible();
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const button of await inspector.getByRole("button").all())
        expect(
          await button.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
      await geometry(page, inspector);
      await page.screenshot({
        path: info.outputPath(`fleet-map-${label}.png`),
      });
    }
    await inspector.getByRole("button", { name: /Fleets · 1/ }).click();
    await panel.getByRole("button", { name: /^Fleet [0-9]+$/ }).click();
    await panel.getByRole("button", { name: "Unload", exact: true }).click();
    await panel
      .getByRole("spinbutton", { name: /^Infantry to (load|unload)$/ })
      .fill("21");
    await expect(
      panel.getByRole("button", { name: "Unload infantry", exact: true }),
    ).toBeDisabled();
    await panel
      .getByRole("spinbutton", { name: /^Infantry to (load|unload)$/ })
      .fill("5");
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      const action = panel.getByRole("button", {
        name: "Unload infantry",
        exact: true,
      });
      const box = await action.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      expect(
        await action.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return (
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) ===
            el
          );
        }),
      ).toBe(true);
      await panel
        .getByRole("spinbutton", { name: /^Infantry to (load|unload)$/ })
        .scrollIntoViewIfNeeded();
      await expect(
        panel.getByRole("spinbutton", { name: /^Infantry to (load|unload)$/ }),
      ).toHaveValue("5");
      await geometry(page, panel);
      await panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .evaluate((el) => el.scrollTo(0, 0));
      await page.screenshot({
        path: info.outputPath(`fleet-cargo-${label}.png`),
      });
    }
    await panel
      .getByRole("button", { name: "Unload infantry", exact: true })
      .click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("Unload · 5 infantry");
    await page.reload();
    await inspector.getByRole("button", { name: /Fleets · 1/ }).click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("Unload · 5 infantry");
    expect(await settleCampaignTicks(id, () => start + 2 * 900000)).toBe(1);
    await expect(
      panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .getByRole("status")
        .filter({ hasText: "Infantry unloaded" }),
    ).toBeVisible();
    await panel.getByRole("button", { name: /^Fleet [0-9]+$/ }).click();
    await panel.getByRole("button", { name: "Load", exact: true }).click();
    await panel
      .getByRole("spinbutton", { name: /^Infantry to (load|unload)$/ })
      .fill("6");
    await expect(
      panel.getByRole("button", { name: "Load infantry", exact: true }),
    ).toBeDisabled();
    await panel
      .getByRole("spinbutton", { name: /^Infantry to (load|unload)$/ })
      .fill("3");
    await panel
      .getByRole("button", { name: "Load infantry", exact: true })
      .click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("Load · 3 infantry");
    await expect(panel.locator("footer").getByRole("status")).toHaveText(
      "Cargo order accepted. Transfer scheduled.",
    );
    expect(await settleCampaignTicks(id, () => start + 3 * 900000)).toBe(1);
    await expect(
      panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .getByRole("status")
        .filter({ hasText: "Infantry loaded" }),
    ).toBeVisible();
    await expect(panel.locator("dl")).toContainText("18");
    await expect(panel.locator("footer").getByRole("status")).toHaveText(
      "3 infantry loaded.",
    );
    await expect(panel).not.toContainText("Transfer scheduled.");
    for (const [label, width, height] of [
      ["phone", 393, 852],
      ["desktop", 1440, 1000],
      ["short", 1280, 720],
      ["4k", 3840, 2160],
    ] as const) {
      await page.setViewportSize({ width, height });
      const action = panel.getByRole("button", {
        name: "Load infantry",
        exact: true,
      });
      const box = await action.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      await geometry(page, panel);
      await panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .evaluate((el) => el.scrollTo(0, 0));
      const outcome = panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .getByRole("status")
        .filter({ hasText: "Infantry loaded" });
      expect(
        await outcome.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return top === el || (!!top && el.contains(top));
        }),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`fleet-cargo-loaded-${label}.png`),
      });
    }

    await panel.getByRole("button", { name: "Disband", exact: true }).click();
    await panel
      .getByRole("button", { name: "Disband fleet", exact: true })
      .click();
    await expect(
      panel.getByRole("status").filter({ hasText: "Fleet order accepted." }),
    ).toBeVisible();
    const next = (await db.doc(`campaignStates/${id}`).get()).get("nextTickAt");
    expect(await settleCampaignTicks(id, () => next)).toBe(1);
    await expect(
      panel
        .getByRole("region", { name: "Fleet manifest and orders" })
        .getByRole("status")
        .filter({ hasText: "Fleet disbanded" }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Back to system" }).click();
    await expect(
      inspector.getByRole("button", { name: /Fleets · 0/ }),
    ).toBeFocused();
    await expect(inspector.getByText("25", { exact: true })).toHaveCount(2);
  } finally {
    for (const context of contexts) await context.close();
  }
});

test("fleet lab replays reservations and outcomes with reduced-motion equality", async ({
  page,
}, info) => {
  await page.goto("dev/animations/");
  await page.getByLabel("Scenario", { exact: true }).selectOption("fleet");
  const seek = page.getByLabel(/Inspect frame/),
    standard = page.getByRole("region", { name: "Standard motion comparison" }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [time, copy] of [
    ["0", "Awaiting acknowledgement"],
    ["1200", "connection was interrupted"],
    ["2400", "Fleet order accepted"],
    ["3400", "Fleet formed"],
  ]) {
    await seek.fill(time);
    await expect(standard).toContainText(copy);
    await expect(reduced).toContainText(copy);
  }
  await standard.getByRole("button", { name: /^Fleet [0-9]+$/ }).click();
  await reduced.getByRole("button", { name: /^Fleet [0-9]+$/ }).click();
  expect(
    await standard
      .getByRole("region", { name: "Fleet manifest and orders" })
      .innerText(),
  ).toBe(
    await reduced
      .getByRole("region", { name: "Fleet manifest and orders" })
      .innerText(),
  );
  for (const [label, width, height] of [
    ["phone", 393, 852],
    ["desktop", 1440, 1000],
    ["short", 1280, 720],
    ["4k", 3840, 2160],
  ] as const) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await standard.screenshot({
      path: info.outputPath(`fleet-lab-${label}.png`),
    });
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(standard).toContainText("Awaiting acknowledgement");
  await expect(
    standard.getByRole("button", { name: /^Fleet [0-9]+$/ }),
  ).toHaveCount(0);
});

test("cargo lab preserves acknowledged outcomes through seeking and reduced motion", async ({
  page,
}) => {
  await page.goto("dev/animations/");
  await page.getByLabel("Scenario", { exact: true }).selectOption("cargo");
  const seek = page.getByLabel(/Inspect frame/),
    standard = page.getByRole("region", { name: "Standard motion comparison" }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const [time, copy] of [
    ["0", "Awaiting acknowledgement"],
    ["1200", "connection was interrupted"],
    ["2400", "Load · 3 infantry"],
    ["3400", "Infantry loaded"],
  ]) {
    await seek.fill(time);
    await expect(standard).toContainText(copy);
    await expect(reduced).toContainText(copy);
    expect(
      await standard
        .getByRole("region", { name: "Fleet manifest and orders" })
        .innerText(),
    ).toBe(
      await reduced
        .getByRole("region", { name: "Fleet manifest and orders" })
        .innerText(),
    );
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(seek).toHaveValue("0");
});
