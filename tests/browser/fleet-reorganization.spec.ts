import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
test("ordinary commanders split and merge fleets without duplicating inventories", async ({
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
      const email = `reorganization-ui-${i}-${Date.now()}@example.test`;
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
          .fill(`Reorganization horizon ${Date.now()}`);
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
    await panel.getByLabel("Fighters", { exact: true }).fill("4");
    await panel.getByLabel("Infantry", { exact: true }).fill("18");
    await panel
      .getByRole("button", { name: "Form fleet", exact: true })
      .click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("4 fighters · 18 infantry");
    const {
      settleCampaignTicks,
    } = require("./lib/functions/src/production.js");
    expect(await settleCampaignTicks(id, () => start + 900000)).toBe(1);
    const sourceButton = panel.getByRole("button", { name: /^Fleet [0-9]+$/ });
    const sourceName = await sourceButton.innerText();
    await sourceButton.click();
    await panel.getByRole("button", { name: "Split", exact: true }).click();
    await panel
      .getByRole("spinbutton", { name: "Fighters to split" })
      .fill("3");
    await panel
      .getByRole("spinbutton", { name: "Infantry to split" })
      .fill("0");
    await expect(
      panel.getByRole("button", { name: "Split fleet", exact: true }),
    ).toBeDisabled();
    await panel
      .getByRole("spinbutton", { name: "Fighters to split" })
      .fill("1");
    await panel
      .getByRole("spinbutton", { name: "Infantry to split" })
      .fill("8");
    async function evidence(phase: string, actionName: string) {
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 720],
        ["4k", 3840, 2160],
      ] as const) {
        await page.setViewportSize({ width, height });
        const action = panel.getByRole("button", {
          name: actionName,
          exact: true,
        });
        const box = await action.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        expect(
          await action.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const top = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
            return top === el || (!!top && el.contains(top));
          }),
        ).toBe(true);
        for (const control of await panel
          .locator('input[type="number"],select')
          .all()) {
          await control.scrollIntoViewIfNeeded();
          const b = await control.boundingBox();
          expect(b!.width).toBeGreaterThanOrEqual(44);
          expect(b!.height).toBeGreaterThanOrEqual(44);
          expect(b!.x + b!.width).toBeLessThanOrEqual(width);
        }
        await geometry(page, panel);
        await panel
          .getByRole("region", { name: "Fleet manifest and orders" })
          .evaluate((el) => el.scrollTo(0, 0));
        await page.screenshot({
          path: info.outputPath(`${phase}-${label}.png`),
        });
      }
    }
    await evidence("fleet-split", "Split fleet");
    await panel
      .getByRole("button", { name: "Split fleet", exact: true })
      .click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("Split · 1 fighters · 8 infantry");
    await page.reload();
    await inspector.getByRole("button", { name: /Fleets · 1/ }).click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("Split · 1 fighters · 8 infantry");
    expect(await settleCampaignTicks(id, () => start + 2 * 900000)).toBe(1);
    await expect(
      panel.getByRole("button", { name: /^Fleet [0-9]+$/ }),
    ).toHaveCount(2);
    const names = await panel
      .getByRole("button", { name: /^Fleet [0-9]+$/ })
      .allTextContents();
    const childName = names.find((name) => name !== sourceName)!;
    expect(childName).toBeTruthy();
    await panel.getByRole("button", { name: childName, exact: true }).click();
    await panel.getByRole("button", { name: "Merge", exact: true }).click();
    await expect(
      panel.getByRole("button", { name: "Merge fleets", exact: true }),
    ).toBeDisabled();
    await panel
      .getByRole("combobox", { name: "Receiving fleet" })
      .selectOption({ label: `${sourceName} · 3 fighters · 10 infantry` });
    await evidence("fleet-merge", "Merge fleets");
    await panel
      .getByRole("button", { name: "Merge fleets", exact: true })
      .click();
    await expect(
      panel.getByRole("region", { name: "Accepted fleet orders" }),
    ).toContainText("Merge · 1 fighters · 8 infantry");
    await expect(panel.locator("footer").getByRole("status")).toHaveText(
      "Reorganization accepted. Execution scheduled.",
    );
    await panel.getByRole("button", { name: sourceName, exact: true }).click();
    await panel.getByRole("button", { name: "Disband", exact: true }).click();
    await expect(
      panel.getByRole("button", { name: "Disband fleet", exact: true }),
    ).toBeDisabled();
    await panel.getByRole("button", { name: childName, exact: true }).click();
    await panel.getByRole("button", { name: "Merge", exact: true }).click();
    expect(await settleCampaignTicks(id, () => start + 3 * 900000)).toBe(1);
    await expect(
      panel.getByRole("button", { name: /^Fleet [0-9]+$/ }),
    ).toHaveCount(1);
    await expect(
      panel.getByRole("heading", { name: sourceName, exact: true }),
    ).toBeFocused();
    await expect(panel.locator("footer").getByRole("status")).toHaveText(
      "Fleets merged. The receiving fleet retains all forces.",
    );
    await expect(panel).not.toContainText("Execution scheduled.");
    await expect(panel.locator("dl")).toContainText("18");
    await evidence("fleet-merged", "Merge fleets");
    await panel.getByRole("button", { name: "Back to system" }).click();
    await expect(
      inspector.getByRole("button", { name: /Fleets · 1/ }),
    ).toBeFocused();
    await expect(inspector.getByText("20", { exact: true })).toBeVisible();
    await expect(inspector.getByText("6", { exact: true })).toBeVisible();
  } finally {
    for (const context of contexts) await context.close();
  }
});

test("reorganization lab preserves split and merge outcomes with reduced motion", async ({
  page,
}) => {
  await page.goto("dev/animations/");
  const seek = page.getByLabel(/Inspect frame/),
    standard = page.getByRole("region", { name: "Standard motion comparison" }),
    reduced = page.getByRole("region", { name: "Reduced motion comparison" });
  for (const kind of ["split", "merge"]) {
    await page.getByLabel("Scenario", { exact: true }).selectOption(kind);
    for (const [time, copy] of [
      ["0", "Awaiting acknowledgement"],
      ["1200", "connection was interrupted"],
      ["2400", "Reorganization accepted"],
      ["3400", kind === "split" ? "Fleet split" : "Fleets merged"],
    ]) {
      await seek.fill(time);
      await expect(standard).toContainText(copy);
      await expect(reduced).toContainText(copy);
      if (time === "3400") {
        const manifest = standard.getByRole("region", {
          name: "Fleet manifest and orders",
        });
        await expect(
          manifest
            .getByRole("status")
            .filter({
              hasText: kind === "split" ? "Fleet split" : "Fleets merged",
            }),
        ).toBeVisible();
        await expect(
          manifest.getByRole("button", { name: /^Fleet [0-9]+$/ }),
        ).toHaveCount(kind === "split" ? 2 : 1);
      }
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
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(seek).toHaveValue("0");
});
