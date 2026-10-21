import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { login, grantDeveloper, geometry } from "./helpers";
for (const mode of ["mock", "real"] as const)
  test(`ordinary commanders recover and acknowledge a private return briefing ${mode}`, async ({
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
    const campaignName = `Briefing horizon ${mode} ${Date.now()}`;
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
                frame.d.b?.d?.kind === "campaign.visit"
              ) {
                writes.push(frame.d.b);
                held.push({ server, raw, active: () => active });
              } else server.send(raw);
            });
            server.onMessage((raw) => ws.send(raw));
          });
        const page = await context.newPage();
        pages.push(page);
        const email = `briefing-ui-${i}-${Date.now()}@example.test`;
        await login(page, email);
        await page.getByLabel("Commander name").fill(`Briefing envoy ${i + 1}`);
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
            .fill(campaignName);
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
      let settled = 0;
      while (settled < 12) {
        const count = await settleCampaignTicks(id, () => start + 12 * 900000);
        expect(count).toBeGreaterThan(0);
        settled += count;
      }
      expect(settled).toBe(12);
      await page.getByRole("button", { name: "Economy", exact: true }).click();
      await expect(
        page.getByText("Confirmed tick 12", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Return to galaxy", exact: true })
        .click();
      const open = async () => {
        await page
          .getByRole("button", { name: "History", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Since your last visit", exact: true })
          .click();
      };
      // A deliberate campaign return opens the reviewed briefing without a manual history detour.
      await page.getByRole("button", { name: "Campaigns", exact: true }).click();
      await page.getByRole("button").filter({ has: page.getByText(campaignName, { exact: true }) }).click();
      const panel = page.getByRole("region", {
        name: "Return briefing",
        exact: true,
      });
      await expect(panel).toContainText("through confirmed tick 12");
      await expect(page.getByRole("dialog", { name: "Return briefing panel", exact: true })).toBeFocused();
      await panel.getByRole("button", { name: "Back without saving", exact: true }).click();
      await page.goto("./");
      await page.getByRole("button", { name: `Continue ${campaignName}`, exact: true }).click();
      await expect(panel).toContainText("through confirmed tick 12");

      const save = panel.getByRole("button", {
        name: "Save visit and return to galaxy",
        exact: true,
      });
      await expect(save).toBeDisabled();
      await panel
        .getByRole("button", { name: "Recover earlier activity", exact: true })
        .click();
      await expect(save).toBeEnabled();
      await expect(
        panel
          .getByRole("region", { name: "Economy", exact: true })
          .locator("article"),
      ).toHaveCount(12);
      for (const [label, width, height] of [
        ["phone", 393, 852],
        ["desktop", 1440, 1000],
        ["short", 1280, 600],
        ["4k", 3840, 2160],
      ] as const) {
        await page.setViewportSize({ width, height });
        const box = await save.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        await geometry(page, panel);
        await panel
          .getByRole("region", { name: "Briefing details", exact: true })
          .evaluate((el) => el.scrollTo(0, 0));
        await page.screenshot({
          path: info.outputPath(`briefing-${label}.png`),
        });
      }
      await page.setViewportSize({ width: 1280, height: 600 });
      const reading = panel.getByRole("region", {
        name: "Briefing details",
        exact: true,
      });
      await reading.evaluate((el) => el.scrollTo(0, 160));
      const position = await reading.evaluate((el) => el.scrollTop);
      expect(position).toBeGreaterThan(0);
      expect(await settleCampaignTicks(id, () => start + 13 * 900000)).toBe(1);
      await expect(
        panel.getByRole("button", { name: "New activity", exact: true }),
      ).toBeVisible();
      expect(await reading.evaluate((el) => el.scrollTop)).toBe(position);
      await expect(panel).toContainText("through confirmed tick 12");
      const before = (await db.doc(`campaignStates/${id}`).get()).get(
        "revision",
      );
      holding = true;
      await save.click();
      await expect.poll(() => writes.length).toBeGreaterThanOrEqual(1);
      await expect(
        panel.getByRole("button", {
          name: "Awaiting acknowledgement…",
          exact: true,
        }),
      ).toBeDisabled();
      expect((await db.doc(`campaignStates/${id}`).get()).get("revision")).toBe(
        before,
      );
      await page.reload();
      await expect(
        page.getByText("Campaign begun", { exact: true }),
      ).toBeVisible();
      await open();
      await expect(panel).toContainText("through confirmed tick 12");
      await expect(panel).not.toContainText("through confirmed tick 13");
      await expect.poll(() => writes.length).toBeGreaterThanOrEqual(2);
      expect(new Set(writes.map((write) => write.p)).size).toBe(1);
      expect(
        writes.every(
          (write) => JSON.stringify(write.d) === JSON.stringify(writes[0].d),
        ),
      ).toBe(true);
      holding = false;
      for (const item of held) if (item.active()) item.server.send(item.raw);
      await expect(panel).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "History", exact: true }),
      ).toBeFocused();
      expect((await db.doc(`campaignStates/${id}`).get()).get("revision")).toBe(
        before + 1,
      );
      await page.reload();
      await expect(
        page.getByText("Campaign begun", { exact: true }),
      ).toBeVisible();
      await open();
      await expect(panel).toContainText(
        "From tick 12 through confirmed tick 13",
      );
      await expect(
        panel
          .getByRole("region", { name: "Economy", exact: true })
          .locator("article"),
      ).toHaveCount(1);
      await expect(panel).toContainText("Tick 13 production");
      await panel
        .getByRole("button", { name: "Back without saving", exact: true })
        .click();
      expect((await db.doc(`campaignStates/${id}`).get()).get("revision")).toBe(
        before + 1,
      );
      await open();
      await panel.getByRole("button", {name:"Inspect Tick 13 production",exact:true}).click();
      await expect(page.getByRole("region", {name:"Empire economy",exact:true})).toBeVisible();
      await page.getByRole("button", {name:"Return to galaxy",exact:true}).click();
      await open();
      await save.click();
      await expect(panel).toHaveCount(0);
      await page.goto("./");
      await page.getByRole("button", {name:`Continue ${campaignName}`,exact:true}).click();
      await expect(page.getByText("Campaign begun", {exact:true})).toBeVisible();
      await expect(panel).toHaveCount(0);
      await expect(page.locator("#galaxy-heading")).toBeFocused();
      const other = pages[1];
      await other.getByRole("button", { name: "History", exact: true }).click();
      await other
        .getByRole("button", { name: "Since your last visit", exact: true })
        .click();
      await expect(
        other.getByRole("region", { name: "Return briefing", exact: true }),
      ).toContainText("From tick 0 through confirmed tick 13");
    } finally {
      for (const context of contexts) await context.close();
    }
  });

test("return briefing lab preserves period and visit outcomes with reduced motion", async ({
  page,
}) => {
  await page.goto("./dev/animations/");
  await page
    .getByLabel("Scenario", { exact: true })
    .selectOption("return-briefing");
  const seek = page.getByLabel(/Inspect frame/);
  const standard = page.getByRole("region", {
      name: "Standard motion comparison",
      exact: true,
    }),
    reduced = page.getByRole("region", {
      name: "Reduced motion comparison",
      exact: true,
    });
  await expect(
    standard.getByRole("button", {
      name: "Save visit and return to galaxy",
      exact: true,
    }),
  ).toBeDisabled();
  await standard
    .getByRole("button", { name: "Recover earlier activity", exact: true })
    .click();
  await expect(
    standard.getByRole("region", { name: "Economy", exact: true }),
  ).toHaveText(
    await reduced
      .getByRole("region", { name: "Economy", exact: true })
      .innerText(),
    { useInnerText: true },
  );
  await standard
    .getByRole("button", {
      name: "Save visit and return to galaxy",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(standard.getByRole("status")).toHaveText(
    "Visit saved. No messages were marked read.",
  );
  await expect(reduced.getByRole("status")).toHaveText(
    "Visit saved. No messages were marked read.",
  );
  for (const [time, label] of [[1700, "Waiting for current order…"], [1900, "Preparing visit…"], [2300, "Awaiting acknowledgement…"]] as const) {
    await seek.fill(String(time));
    await expect(standard.getByRole("button", { name: label, exact: true })).toBeDisabled();
    await expect(reduced.getByRole("button", { name: label, exact: true })).toBeDisabled();
  }
  await seek.fill("3800");
  await expect(standard.getByRole("alert")).toContainText("Your visit has not changed");
  await seek.fill("4200");
  await expect(standard).toContainText("Recovering the period of your saved visit");
  await seek.fill("4800");
  for (const name of ["Control", "Arrivals and losses", "Economy", "Messages", "Upcoming orders"]) {
    await expect(standard.getByRole("region", { name, exact: true })).toHaveText(await reduced.getByRole("region", { name, exact: true }).innerText(), { useInnerText: true });
  }
  await expect(standard.getByRole("region", { name: "Upcoming orders", exact: true })).toContainText("1 accepted order");
  for (const [label, width, height] of [["phone",393,852],["desktop",1440,1000],["short",1280,600],["4k",3840,2160]] as const) {
    await page.setViewportSize({width,height});
    await standard.scrollIntoViewIfNeeded();
    const widths = await standard.locator(".briefing-report .copy").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width / Number.parseFloat(getComputedStyle(element.querySelector("strong")!).fontSize)));
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every(width => width >= 8)).toBe(true);
    await standard.screenshot({path: `test-results/briefing-mixed-${label}.png`});
  }
  await seek.fill("5300");
  const legacyMessages=standard.getByRole("region",{name:"Messages",exact:true});
  await expect(legacyMessages).toContainText("incoming activity is not inferred");
  await expect(legacyMessages).not.toContainText("Received from");
  await expect(reduced.getByRole("region",{name:"Messages",exact:true})).toHaveText(await legacyMessages.innerText(),{useInnerText:true});
  for(const [label,width,height] of [["phone",393,852],["desktop",1440,1000],["short",1280,600],["4k",3840,2160]] as const) {
    await page.setViewportSize({width,height});await legacyMessages.scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await legacyMessages.screenshot({path:`test-results/briefing-legacy-identity-${label}.png`});
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(seek).toHaveValue("0");
});

test("co-faction conversation gallery labels the actual commander and exposes only their membership controls",async({page},info)=>{
 await page.goto("./gallery/");
 const specimen=page.getByRole("region",{name:"Eight-seat commander identity",exact:true});
 const own=specimen.locator("li").filter({hasText:"My own reply remains mine."});
 const other=specimen.locator("li").filter({hasText:"Another commander with the same faction."});
 await expect(own.locator("strong")).toHaveText("You");await expect(other.locator("strong")).toHaveText("Envoy 0");
 await specimen.getByRole("button",{name:"Participants",exact:true}).click();
 await expect(specimen.getByRole("button",{name:"Close conversation",exact:true})).toBeVisible();
 await expect(specimen.getByRole("button",{name:"Leave conversation",exact:true})).toHaveCount(0);
 for(const [label,width,height] of [["phone",393,852],["desktop",1440,1000],["short",1280,600],["4k",3840,2160]] as const) {
  await page.setViewportSize({width,height});await specimen.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await specimen.screenshot({path:info.outputPath(`identity-membership-${label}.png`)});
 }
});
